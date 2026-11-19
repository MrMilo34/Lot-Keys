package ca.lotkeys.connector;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

/** Records carrier submission results without retaining message text or recipient numbers. */
public final class SmsResultReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        String requestId = intent.getStringExtra("requestId");
        int part = intent.getIntExtra("part", -1);
        if (requestId == null || part < 0) return;
        synchronized (SmsResultReceiver.class) {
            SharedPreferences ledger = context.getSharedPreferences("lotkeys-sends", Context.MODE_PRIVATE);
            try {
                String raw = ledger.getString(requestId, "");
                if (raw.isEmpty()) return;
                JSONObject row = new JSONObject(raw);
                JSONArray results = row.getJSONArray("results");
                if (part >= results.length() || results.optInt(part) != 0) return;
                results.put(part, getResultCode() == Activity.RESULT_OK ? 1 : -1);
                boolean complete = true;
                boolean failed = false;
                for (int i = 0; i < results.length(); i++) {
                    complete &= results.optInt(i) != 0;
                    failed |= results.optInt(i) < 0;
                }
                row.put("phase", complete ? failed ? "failed" : "sent" : "sending");
                if (failed) row.put("error", "SMS failed or was only partly sent. Check the phone before retrying.");
                row.put("updatedAt", System.currentTimeMillis());
                ledger.edit().putString(requestId, row.toString()).commit();
            } catch (Exception ignored) {
                // A missing receipt stays unconfirmed; never reconstruct or resend automatically.
            }
        }
        PhoneConnectorService.nudge();
    }
}
