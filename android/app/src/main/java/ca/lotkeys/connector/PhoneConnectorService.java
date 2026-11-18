package ca.lotkeys.connector;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.database.ContentObserver;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.provider.Telephony;

import java.util.concurrent.atomic.AtomicLong;

/** Keeps the loopback API and encrypted PC relay available while LotKeys is in use. */
public final class PhoneConnectorService extends Service {
    static final String ACTION_ACCOUNT_AUTHORIZED = "ca.lotkeys.connector.ACCOUNT_AUTHORIZED";
    static final String EXTRA_ACCOUNT_NAME = "accountName";
    static final String EXTRA_ACCOUNT_TYPE = "accountType";
    static final String EXTRA_ACCESS_TOKEN = "accessToken";
    private static final String CHANNEL = "lotkeys-phone-connector";
    private static final int NOTIFICATION_ID = 9484;
    private static final AtomicLong REVISION = new AtomicLong(1);
    private static volatile PhoneConnectorService instance;
    private static volatile boolean setupVisible;
    private android.os.PowerManager.WakeLock activeConnectionLock;
    private Boolean idleJobNeeded;
    private volatile boolean destroyed;
    private LocalApiServer server;
    private DriveRelay relay;
    private ContentObserver observer;
    private String status = "SMS/MMS coverage ready · RCS watcher not enabled";

    static long revision() { return REVISION.get(); }
    static void nudge() {
        REVISION.incrementAndGet();
        PhoneConnectorService current = instance;
        if (current != null && current.relay != null) current.relay.phoneDataChanged();
    }
    static boolean wakeRunning() {
        PhoneConnectorService current = instance;
        if (current == null || current.relay == null) return false;
        current.status = "Trusted computer connecting · encrypted relay";
        current.getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, current.notification());
        current.relay.incomingWake(); return true;
    }

    static void setSetupVisible(boolean visible) {
        setupVisible = visible;
        PhoneConnectorService current = instance;
        if (current != null && current.relay != null) current.relay.setupVisible(visible);
    }
    void browserVisible(boolean visible) { if (relay != null) relay.browserVisible(visible); }
    static java.util.concurrent.CompletableFuture<Boolean> hourlyRecovery() {
        PhoneConnectorService current = instance;
        return current == null || current.relay == null ? null : current.relay.hourlyRecovery();
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public void onCreate() {
        super.onCreate();
        instance = this;
        android.os.PowerManager power = getSystemService(android.os.PowerManager.class);
        if (power != null) {
            activeConnectionLock = power.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "LotKeys:ActivePcRelay");
            activeConnectionLock.setReferenceCounted(false);
        }
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(new NotificationChannel(
            CHANNEL, "LotKeys phone connection", NotificationManager.IMPORTANCE_LOW));
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_REMOTE_MESSAGING);
        } else {
            startForeground(NOTIFICATION_ID, notification());
        }
        observer = new ContentObserver(new Handler(getMainLooper())) {
            @Override public void onChange(boolean selfChange) { nudge(); }
            @Override public void onChange(boolean selfChange, Uri uri) { onChange(selfChange); }
        };
        if (new PhoneStore(this).canReadMessages()) {
            getContentResolver().registerContentObserver(Telephony.Sms.CONTENT_URI, true, observer);
            getContentResolver().registerContentObserver(Telephony.Mms.CONTENT_URI, true, observer);
            getContentResolver().registerContentObserver(Telephony.Threads.CONTENT_URI, true, observer);
        }
        try {
            server = new LocalApiServer(this);
            server.start();
            relay = new DriveRelay(this);
            relay.start(setupVisible);
        } catch (Exception error) {
            reportLocalError("Phone connection could not start. Reopen the LotKeys Android setup.");
        }
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) {
            getSharedPreferences("lotkeys-connector", MODE_PRIVATE).edit().putBoolean("enabled", false).apply();
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!getSharedPreferences("lotkeys-connector", MODE_PRIVATE).getBoolean("enabled", false) ||
            !new PhoneStore(this).canReadMessages()) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (intent != null && relay != null) {
            String sessionId = intent.getStringExtra("sessionId");
            if (ACTION_ACCOUNT_AUTHORIZED.equals(intent.getAction())) {
                relay.accountAuthorized(
                    intent.getStringExtra(EXTRA_ACCOUNT_NAME),
                    intent.getStringExtra(EXTRA_ACCOUNT_TYPE),
                    intent.getStringExtra(EXTRA_ACCESS_TOKEN));
            } else if ("HOURLY_RECOVERY".equals(intent.getAction())) {
                relay.hourlyRecovery();
            } else if ("TRUSTED_PC_WAKE".equals(intent.getAction())) {
                wakeRunning();
            } else if ("APPROVE_PAIR".equals(intent.getAction())) {
                relay.approve(sessionId == null ? "" : sessionId, intent.getStringExtra("trustMode"));
            } else if ("DECLINE_PAIR".equals(intent.getAction())) {
                relay.reject(sessionId == null ? "" : sessionId);
            } else if ("DISCONNECT_PC".equals(intent.getAction())) {
                relay.disconnect(false);
            } else if ("DISCONNECT_ALL".equals(intent.getAction())) {
                relay.disconnectAll();
            }
        }
        return START_STICKY;
    }

    void reportLocalError(String message) {
        status = message;
        getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, notification());
    }

    void relayChanged() {
        if (destroyed) return;
        try {
            org.json.JSONObject value = relay == null ? null : relay.status();
            boolean active = value != null && "active".equals(value.optString("pollMode"));
            if (activeConnectionLock != null) {
                if (active) activeConnectionLock.acquire(120000L);
                else if (activeConnectionLock.isHeld()) activeConnectionLock.release();
            }
            boolean needed = DriveRelay.hasTrustedComputer(this) && getSharedPreferences("lotkeys-connector", MODE_PRIVATE).getBoolean("enabled", false);
            if (idleJobNeeded == null || idleJobNeeded != needed) { idleJobNeeded = needed; PhoneRelayIdleJob.sync(this, needed); }
            if (value != null && !value.optString("lastError").isEmpty()) {
                status = "PC relay needs attention · " + value.optString("lastError");
            } else if (value != null && value.optBoolean("connected")) {
                status = "PC connected · " + value.optString("peerName", "Computer");
            } else if (value != null && value.optJSONArray("pendingPairings") != null && value.optJSONArray("pendingPairings").length() > 0) {
                org.json.JSONObject request = value.optJSONArray("pendingPairings").optJSONObject(0);
                status = "Pairing request " + (request == null ? "" : request.optString("code"));
            } else if (value != null && value.optBoolean("authorized")) {
                org.json.JSONArray trusts = value.optJSONArray("trusts");
                status = trusts != null && trusts.length() > 0
                    ? (active ? "Waiting for computer · active connection checks" : "Connection idle · hourly recovery checks")
                    : "Ready for PC pairing · SMS/MMS coverage";
            } else {
                status = "SMS/MMS ready · finish PC pairing setup";
            }
        } catch (Exception ignored) {
            status = "SMS/MMS coverage ready · PC relay checking";
        }
        getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, notification());
    }

    static org.json.JSONObject relaySnapshot() {
        PhoneConnectorService current = instance;
        if (current == null || current.relay == null) return null;
        try { return current.relay.status(); }
        catch (Exception ignored) { return null; }
    }

    void relayNeedsAuthorization() {
        status = "Open to approve Google account for PC pairing";
        getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, notification());
    }

    void pairingRequestChanged(org.json.JSONObject request) {
        if (request != null) status = "Computer wants to connect · code " + request.optString("code");
        getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, notification());
    }

    org.json.JSONObject relayStatus() throws Exception {
        return relay == null ? new org.json.JSONObject().put("configured", false).put("authorized", false) : relay.status();
    }

    org.json.JSONArray pendingPairings() throws Exception {
        return relay == null ? new org.json.JSONArray() : relay.pendingPairings();
    }

    void approvePair(String sessionId, String trustMode) {
        if (relay != null) relay.approve(sessionId, trustMode);
    }

    void rejectPair(String sessionId) {
        if (relay != null) relay.reject(sessionId);
    }

    void disconnectRelay(boolean forget) {
        if (relay != null) relay.disconnect(forget);
    }

    void disconnectAllRelays() {
        if (relay != null) relay.disconnectAll();
    }

    void forgetComputer(String browserId) {
        if (relay != null) relay.forget(browserId);
    }

    private Notification notification() {
        PendingIntent open = PendingIntent.getActivity(
            this, 1, new Intent(this, MainActivity.class),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop = PendingIntent.getService(
            this, 2, new Intent(this, PhoneConnectorService.class).setAction("STOP"),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle("LotKeys phone connection")
            .setContentText(status)
            .setStyle(new Notification.BigTextStyle().bigText(status))
            .setContentIntent(open)
            .setOnlyAlertOnce(true)
            .setOngoing(true)
            .setVisibility(Notification.VISIBILITY_SECRET)
            .addAction(new Notification.Action.Builder(null, "Disconnect", stop).build())
            .build();
    }

    @Override public void onDestroy() {
        destroyed = true;
        if (relay != null) relay.stop();
        if (activeConnectionLock != null && activeConnectionLock.isHeld()) activeConnectionLock.release();
        if (!getSharedPreferences("lotkeys-connector", MODE_PRIVATE).getBoolean("enabled", false)) PhoneRelayIdleJob.sync(this, false);
        if (server != null) server.stop();
        if (observer != null) {
            try { getContentResolver().unregisterContentObserver(observer); }
            catch (Exception ignored) {}
        }
        if (instance == this) instance = null;
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }
}
