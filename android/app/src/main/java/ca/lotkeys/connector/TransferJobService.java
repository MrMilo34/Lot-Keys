package ca.lotkeys.connector;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.concurrent.CancellationException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** OS-managed file work, separate from the remote-messaging foreground service. */
public final class TransferJobService extends JobService {
    private static final int JOB = 39539, NOTICE = 39540;
    private static final String CHANNEL = "lotkeys-uploads";
    private ExecutorService worker;
    private AtomicBoolean stopped;
    private static final java.util.concurrent.atomic.AtomicReference<AtomicBoolean> active = new java.util.concurrent.atomic.AtomicReference<>();

    static boolean schedule(Context context, boolean fromVisibleNativeActivity) {
        JobScheduler jobs = context.getSystemService(JobScheduler.class);
        if (jobs == null) return false;
        // A visible Chrome/PWA window does NOT count as this app's visible activity.
        JobInfo pending = jobs.getPendingJob(JOB); AtomicBoolean current = active.get();
        if (pending != null && (current != null && !current.get() || !fromVisibleNativeActivity || Build.VERSION.SDK_INT < 34 || pending.isUserInitiated())) return true;
        if (Build.VERSION.SDK_INT >= 34 && fromVisibleNativeActivity) {
            try {
                JobInfo urgent = new JobInfo.Builder(JOB, new ComponentName(context, TransferJobService.class))
                    .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPersisted(true).setUserInitiated(true).build();
                if (jobs.schedule(urgent) == JobScheduler.RESULT_SUCCESS) return true;
            } catch (IllegalArgumentException | IllegalStateException | SecurityException unavailable) { /* Ordinary persisted work remains eligible. */ }
        }
        if (pending != null) return true;
        return jobs.schedule(new JobInfo.Builder(JOB, new ComponentName(context, TransferJobService.class))
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPersisted(true)
            .setBackoffCriteria(30000, JobInfo.BACKOFF_POLICY_EXPONENTIAL).build()) == JobScheduler.RESULT_SUCCESS;
    }

    static String executionMode(Context context) {
        JobScheduler jobs = context.getSystemService(JobScheduler.class);
        JobInfo pending = jobs == null ? null : jobs.getPendingJob(JOB);
        return Build.VERSION.SDK_INT >= 34 && pending != null && pending.isUserInitiated()
            ? "user_initiated" : "scheduled";
    }

    @Override public boolean onStartJob(JobParameters params) {
        AtomicBoolean cancelled = new AtomicBoolean(false); stopped = cancelled;
        active.set(cancelled);
        notifyProgress(params, "Saving original files to Google Drive");
        worker = Executors.newSingleThreadExecutor();
        worker.execute(() -> {
            boolean retry = false;
            try {
                TransferStore store = new TransferStore(this);
                for (JSONObject batch : store.pending()) {
                    if (cancelled.get()) break;
                    String id = batch.getString("id"), account = batch.getJSONObject("context").getString("account");
                    try {
                        if (!TransferAuth.ready(this) || !account.equalsIgnoreCase(TransferAuth.account(this))) {
                            store.state(id, "paused_auth", "Open Android setup to approve the original upload account."); continue;
                        }
                        DriveUploadClient.Check check = () -> {
                            if (cancelled.get()) throw new CancellationException();
                            JSONObject live = store.get(id);
                            if (live.optBoolean("held") || "cancelled".equals(live.optString("state"))) throw new CancellationException();
                            if (!account.equalsIgnoreCase(DriveRelay.account(this))) throw new TransferAuth.AuthRequired("The phone account changed. Restore the original account to resume this save.");
                        };
                        check.run(); store.state(id, "uploading", "");
                        uploadAssets(params, store, batch, account, check);
                        check.run(); store.state(id, "finalizing", "");
                        if (batch.optInt("version") == 2) notifyProgress(params, "Files saved · finishing the Vehicle Info Sheet and Inventory");
                        new TransferFinalizer(new DriveUploadClient(this, account, params.getNetwork(), check), check).finish(store, batch);
                        check.run(); store.state(id, "complete", ""); store.releaseOriginals(id);
                    } catch (CancellationException cancelledWork) {
                        if (!cancelled.get()) store.state(id, "paused_context", "This save is paused because its account, Store or edit changed.");
                        else retry = true;
                    } catch (TransferAuth.AuthRequired missingConsent) {
                        store.state(id, "paused_auth", missingConsent.getMessage());
                    } catch (TransferFinalizer.Reconcile newerEdit) {
                        store.state(id, "needs_reconcile", newerEdit.getMessage());
                    } catch (DriveUploadClient.RemoteError remote) {
                        boolean transientFailure = remote.status == 408 || remote.status == 429 || remote.status >= 500;
                        store.state(id, transientFailure ? "retrying" : "failed", transientFailure ? "Drive is temporarily unavailable. Android will retry from the last confirmed checkpoint." : remote.getMessage());
                        retry |= transientFailure;
                    } catch (IllegalArgumentException invalid) {
                        store.state(id, "failed", invalid.getMessage());
                    } catch (Exception network) {
                        store.state(id, "retrying", "Waiting for Google Drive. Original files and confirmed progress are retained."); retry = true;
                    }
                }
            } catch (Exception storage) { retry = true; }
            finally {
                active.compareAndSet(cancelled, null);
                try { for (JSONObject pending : new TransferStore(this).pending()) if ("queued".equals(pending.optString("state"))) retry = true; } catch (Exception ignored) { retry = true; }
                if (!cancelled.get()) { getSystemService(NotificationManager.class).cancel(NOTICE); jobFinished(params, retry); }
            }
        });
        return true;
    }

    private void uploadAssets(JobParameters params, TransferStore store, JSONObject batch, String account, DriveUploadClient.Check check) throws Exception {
        JSONArray assets = batch.getJSONArray("assets"); java.util.List<Integer> photos = new java.util.ArrayList<>(), videos = new java.util.ArrayList<>();
        DriveUploadClient documents = new DriveUploadClient(this, account, params.getNetwork(), check);
        for (int i = 0; i < assets.length(); i++) {
            String kind = assets.getJSONObject(i).optJSONObject("properties").optString("lotkeysAssetKind");
            if ("photo".equals(kind)) photos.add(i); else if ("video".equals(kind)) videos.add(i); else { check.run(); documents.upload(store, batch, i); }
        }
        // Preserve three photo workers plus one video lane. Each streams 64 KiB
        // buffers; neither videos nor the complete batch are loaded into RAM.
        ExecutorService lanes = Executors.newFixedThreadPool(4);
        java.util.concurrent.atomic.AtomicReference<Exception> failure = new java.util.concurrent.atomic.AtomicReference<>();
        java.util.concurrent.atomic.AtomicInteger cursor = new java.util.concurrent.atomic.AtomicInteger();
        java.util.List<java.util.concurrent.Future<?>> futures = new java.util.ArrayList<>();
        DriveUploadClient.Check laneCheck = () -> { check.run(); if (failure.get() != null) throw new CancellationException(); };
        try {
            for (int workerIndex = 0; workerIndex < Math.min(3, photos.size()); workerIndex++) futures.add(lanes.submit(() -> {
                DriveUploadClient client = new DriveUploadClient(this, account, params.getNetwork(), laneCheck);
                try { int next; while ((next = cursor.getAndIncrement()) < photos.size()) { laneCheck.run(); client.upload(store, batch, photos.get(next)); notifyProgress(params, "Saving photos and original video to Drive"); } }
                catch (Exception error) { failure.compareAndSet(null, error); }
            }));
            if (!videos.isEmpty()) futures.add(lanes.submit(() -> {
                DriveUploadClient client = new DriveUploadClient(this, account, params.getNetwork(), laneCheck);
                try { for (int item : videos) { laneCheck.run(); client.upload(store, batch, item); } }
                catch (Exception error) { failure.compareAndSet(null, error); }
            }));
            for (java.util.concurrent.Future<?> future : futures) future.get();
            if (failure.get() != null) throw failure.get();
        } finally { lanes.shutdownNow(); }
    }

    private void notifyProgress(JobParameters params, String text) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(new NotificationChannel(CHANNEL, "Drive saves", NotificationManager.IMPORTANCE_LOW));
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, UploadActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new Notification.Builder(this, CHANNEL).setSmallIcon(android.R.drawable.stat_sys_upload)
            .setContentTitle("LotKeys · Saving to Drive").setContentText(text).setContentIntent(open).setOnlyAlertOnce(true).setOngoing(true).build();
        if (Build.VERSION.SDK_INT >= 34 && params.isUserInitiatedJob()) setNotification(params, NOTICE, notification, JOB_END_NOTIFICATION_POLICY_REMOVE);
        else manager.notify(NOTICE, notification);
    }
    @Override public boolean onStopJob(JobParameters params) {
        if (stopped != null) stopped.set(true);
        if (worker != null) worker.shutdownNow();
        getSystemService(NotificationManager.class).cancel(NOTICE);
        return Build.VERSION.SDK_INT < 31 || params.getStopReason() != JobParameters.STOP_REASON_USER;
    }
    @Override public void onDestroy() { if (worker != null) worker.shutdown(); super.onDestroy(); }
}
