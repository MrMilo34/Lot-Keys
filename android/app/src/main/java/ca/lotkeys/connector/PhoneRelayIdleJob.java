package ca.lotkeys.connector;

import android.Manifest;
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
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.PowerManager;

/** Best-effort hourly recovery. No exact alarm and no two-second idle wakeups. */
public final class PhoneRelayIdleJob extends JobService {
    private static final int JOB = 39550, NOTICE = 39551;
    private final java.util.concurrent.atomic.AtomicBoolean stopped = new java.util.concurrent.atomic.AtomicBoolean();
    static void sync(Context context, boolean needed) {
        JobScheduler jobs = context.getSystemService(JobScheduler.class);
        if (jobs == null) return;
        if (!needed) { jobs.cancel(JOB); return; }
        if (jobs.getPendingJob(JOB) != null) return;
        jobs.schedule(new JobInfo.Builder(JOB, new ComponentName(context, PhoneRelayIdleJob.class))
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPersisted(true)
            .setPeriodic(RelayWorkPolicy.IDLE_MS, 15 * 60 * 1000L).build());
    }
    @Override public boolean onStartJob(JobParameters params) {
        stopped.set(false);
        if (!getSharedPreferences("lotkeys-connector", MODE_PRIVATE).getBoolean("enabled", false)
            || !new PhoneStore(this).canReadMessages() || !DriveRelay.hasTrustedComputer(this)) { sync(this, false); return false; }
        java.util.concurrent.CompletableFuture<Boolean> running = PhoneConnectorService.hourlyRecovery();
        if (running != null) {
            running.whenComplete((attempted, error) -> new android.os.Handler(getMainLooper()).post(() -> { if (!stopped.get()) jobFinished(params, false); }));
            return true;
        }
        // Battery exemption is an Android foreground-service start exemption.
        // If unavailable, request a user open instead of attempting a forbidden launch.
        PowerManager power = getSystemService(PowerManager.class);
        if (Build.VERSION.SDK_INT < 31 || power != null && power.isIgnoringBatteryOptimizations(getPackageName())) {
            try { startForegroundService(new Intent(this, PhoneConnectorService.class).setAction("HOURLY_RECOVERY")); return false; }
            catch (Exception restricted) { /* Leave an actionable status notification. */ }
        }
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
        NotificationManager notices = getSystemService(NotificationManager.class);
        notices.createNotificationChannel(new NotificationChannel("lotkeys-idle-recovery", "Connection recovery", NotificationManager.IMPORTANCE_LOW));
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        notices.notify(NOTICE, new Notification.Builder(this, "lotkeys-idle-recovery").setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle("LotKeys · Phone connection paused").setContentText("Open LotKeys Connector to resume connection checks.")
            .setContentIntent(open).setAutoCancel(true).setOnlyAlertOnce(true).build());
        return false;
    }
    @Override public boolean onStopJob(JobParameters params) { stopped.set(true); return false; }
}
