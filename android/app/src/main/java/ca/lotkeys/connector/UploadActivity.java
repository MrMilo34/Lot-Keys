package ca.lotkeys.connector;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import org.json.JSONObject;

/** User-visible entry for already retained uploads; external URLs cannot grant consent or start jobs. */
public final class UploadActivity extends Activity {
    private TextView status;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout body = new LinearLayout(this); body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(32, 48, 32, 32); body.setBackgroundColor(Color.rgb(14,16,20)); setContentView(body);
        status = new TextView(this); status.setTextColor(Color.WHITE); status.setTextSize(18); body.addView(status);
        Button start = new Button(this); start.setText("Continue uploads in background"); body.addView(start);
        start.setOnClickListener(view -> {
            try {
                if (!resume(this)) { status.setText("No authorized, retained uploads are ready. Keep LotKeys open while originals are prepared, or check Phone & upload settings."); return; }
                boolean urgent = "user_initiated".equals(TransferJobService.executionMode(this));
                status.setText(urgent ? "Android accepted the background transfer. You can switch apps. Follow progress in the Drive save notification." : "Your files are retained and scheduled. Android may pause or defer this save; it will retry from its checkpoint. You can switch apps after originals are retained.");
            } catch (Exception error) { status.setText("Uploads remain saved on this phone. Android could not start them yet; return to LotKeys and check the save."); }
        });
        Button back = new Button(this); back.setText("Return to LotKeys"); body.addView(back); back.setOnClickListener(view -> finish());
        Button settings = new Button(this); settings.setText("Phone & upload settings"); body.addView(settings);
        settings.setOnClickListener(view -> startActivity(BrowserExperience.setupIntent(this)));
        status.setText("Background Drive saves\nAfter LotKeys has retained your originals, tap Continue to ask Android to run the transfer while you use other apps. Preparing originals still requires LotKeys to remain open.");
    }
    static boolean resume(Context context) throws Exception {
        if (!TransferAuth.ready(context)) return false;
        String account = TransferAuth.account(context);
        boolean retained = false;
        for (JSONObject batch : new TransferStore(context).pending()) {
            if (account.equalsIgnoreCase(batch.getJSONObject("context").optString("account"))) { retained = true; break; }
        }
        return retained && TransferJobService.schedule(context, true);
    }
}
