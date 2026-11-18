package ca.lotkeys.connector;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public final class PhoneWakeService extends FirebaseMessagingService {
    @Override public void onNewToken(String token) { WakeDoorbell.tokenChanged(this, token); }
    @Override public void onMessageReceived(RemoteMessage message) {
        if (!WakeDoorbell.accept(this, message.getData())) return;
        if (PhoneConnectorService.wakeRunning()) return;
        // FCM can downgrade priority. Do not attempt a forbidden background launch.
        if (message.getPriority() == RemoteMessage.PRIORITY_HIGH) {
            try { startForegroundService(new Intent(this, PhoneConnectorService.class).setAction("TRUSTED_PC_WAKE")); return; }
            catch (Exception restricted) { /* Ask the owner to open the connection. */ }
        }
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(new NotificationChannel("lotkeys-wake", "Computer connection", NotificationManager.IMPORTANCE_LOW));
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        manager.notify(39541, new Notification.Builder(this, "lotkeys-wake").setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle("LotKeys · Computer wants to connect").setContentText("Open LotKeys Connector to restore the phone connection.")
            .setContentIntent(open).setAutoCancel(true).build());
    }
}
