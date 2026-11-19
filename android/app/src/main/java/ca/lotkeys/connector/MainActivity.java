package ca.lotkeys.connector;

import android.Manifest;
import android.accounts.Account;
import android.accounts.AccountManager;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import com.google.android.gms.auth.GoogleAuthException;
import com.google.android.gms.auth.UserRecoverableAuthException;
import com.google.android.gms.common.AccountPicker;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;

/** Single-install LotKeys entry point with contextual phone/upload settings. */
public final class MainActivity extends Activity {
    private static final int REQUEST_MESSAGES = 41;
    private static final int REQUEST_CONTACTS = 42;
    private static final int REQUEST_NOTIFICATIONS = 43;
    private static final int REQUEST_GOOGLE_ACCOUNT = 44;
    private static final int REQUEST_GOOGLE_AUTHORIZATION = 45;
    private static final int REQUEST_UPLOAD_AUTHORIZATION = 46;
    private static final int REQUEST_WAKE_SETUP = 47;
    private static final String POST_NOTIFICATIONS = "android.permission.POST_NOTIFICATIONS";
    private boolean setupMode;
    private LinearLayout body;
    private Account pendingGoogleAccount;
    private TextView pcRelayStatus;
    private String displayedPairRequest = "";
    private final android.os.Handler connectionUi = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable refreshConnectionUi = new Runnable() {
        @Override public void run() {
            if (!displayedPairRequest.equals(pairRequestId())) render();
            updatePcRelayStatus();
            connectionUi.postDelayed(this, 1000);
        }
    };

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        setupMode = state != null ? state.getBoolean("setupMode") : wantsSetup(getIntent());
        if (setupMode) render();
        else { renderHome(); if (state == null) openExperience(); }
    }

    private boolean wantsSetup(Intent intent) {
        JSONObject pending = DriveRelay.pendingRequest(this);
        return (intent != null && intent.getBooleanExtra(BrowserExperience.SHOW_SETUP, false)) ||
            (pending != null && pending.optLong("expiresAt") > System.currentTimeMillis());
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent); setIntent(intent);
        setupMode = wantsSetup(intent);
        connectionUi.removeCallbacks(refreshConnectionUi);
        PhoneConnectorService.setSetupVisible(setupMode);
        if (setupMode) connectionUi.post(refreshConnectionUi);
        if (setupMode) render(); else { renderHome(); openExperience(); }
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        state.putBoolean("setupMode", setupMode);
        super.onSaveInstanceState(state);
    }

    @Override public void onResume() {
        super.onResume();
        PhoneConnectorService.setSetupVisible(setupMode);
        if (setupMode) render(); else renderHome();
        connectionUi.removeCallbacks(refreshConnectionUi);
        if (setupMode) connectionUi.post(refreshConnectionUi);
    }

    @Override public void onDestroy() {
        BrowserExperience.close(this);
        super.onDestroy();
    }

    private void renderHome() {
        ScrollView scroll = new ScrollView(this);
        body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(dp(24), dp(28), dp(24), dp(36));
        body.setBackgroundColor(Color.rgb(14, 16, 20));
        scroll.addView(body); setContentView(scroll);
        text("LotKeys", 30, Color.WHITE, true);
        text("V0.9.5.46 TEST", 18, Color.rgb(100, 181, 246), true);
        text("Your Inventory, Listings and Hub open here. Phone messaging, PC connection and background saves use this same installation.", 16, Color.LTGRAY, false);
        button("Open LotKeys", this::openExperience, true);
        button("Background upload controls", () -> startActivity(new Intent(this, UploadActivity.class)), false);
        button("Phone & upload settings", () -> {
            setupMode = true; PhoneConnectorService.setSetupVisible(true); render();
            connectionUi.removeCallbacks(refreshConnectionUi); connectionUi.post(refreshConnectionUi);
        }, false);
        text("Use the same browser and Google account as before to keep local work. Android access is optional and requested only in settings. No second LotKeys home-screen installation is needed.", 14, Color.rgb(145, 151, 161), false);
    }

    private void openExperience() {
        String token = "";
        if (prefs().getBoolean("enabled", false) && requiredMessagesGranted() && notificationsGranted()) {
            try {
                startForegroundService(new Intent(this, PhoneConnectorService.class));
                token = InstallIdentity.token(this);
            } catch (Exception error) {
                android.widget.Toast.makeText(this, "Phone connection needs attention in Phone & upload settings. Your LotKeys workspace is still available.", android.widget.Toast.LENGTH_LONG).show();
            }
        }
        try { BrowserExperience.launch(this, token); }
        catch (ActivityNotFoundException error) { alert(error.getMessage()); }
    }
    @Override public void onPause() {
        connectionUi.removeCallbacks(refreshConnectionUi);
        PhoneConnectorService.setSetupVisible(false);
        super.onPause();
    }

    private void render() {
        pcRelayStatus = null;
        displayedPairRequest = pairRequestId();
        ScrollView scroll = new ScrollView(this);
        body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(dp(24), dp(28), dp(24), dp(36));
        body.setBackgroundColor(Color.rgb(14, 16, 20));
        scroll.addView(body);
        setContentView(scroll);

        text("LotKeys", 30, Color.WHITE, true);
        text("Phone Connection · V0.9.5.46 TEST", 18, Color.rgb(100, 181, 246), true);
        button("Open LotKeys", this::openExperience, false);

        PhoneStore store = new PhoneStore(this);
        boolean messages = requiredMessagesGranted();
        boolean contacts = store.canReadContacts();
        boolean notifications = notificationsGranted();

        if (!messages) {
            step("1 of 5 · Connect Phone Messaging");
            text("LotKeys will mirror the SMS/MMS history already on this phone and send only the replies you request. " +
                store.sourceApp() + " remains your default messaging app. LotKeys will not become the default messenger.", 16, Color.LTGRAY, false);
            button("Continue to Messages access", this::explainMessages, true);
            footer();
            return;
        }

        if (!contacts && !prefs().getBoolean("contactsSkipped", false)) {
            step("2 of 5 · Contact Names (Optional)");
            text("Allow Contacts so a number already saved on this phone keeps its familiar name in LotKeys. " +
                "Declining does not block messaging; LotKeys will show the phone number instead.", 16, Color.LTGRAY, false);
            button("Allow Contact Names", () -> requestPermissions(new String[]{Manifest.permission.READ_CONTACTS}, REQUEST_CONTACTS), true);
            button("Not Now · Use Numbers", () -> { prefs().edit().putBoolean("contactsSkipped", true).apply(); render(); }, false);
            footer();
            return;
        }

        if (!notifications) {
            step("3 of 5 · Stay Connected");
            text("Android requires a quiet connection-status notification while the protected phone layer is available. " +
                "This is not a second customer-message alert and it does not replace your normal messaging notifications.", 16, Color.LTGRAY, false);
            button("Allow Connection Status", () -> requestPermissions(
                new String[]{POST_NOTIFICATIONS}, REQUEST_NOTIFICATIONS), true);
            footer();
            return;
        }

        String relayAccount = DriveRelay.account(this);
        if (!DriveRelay.wasAuthorized(this)) {
            step("4 of 5 · PC Pairing Account");
            text("Choose the same Google account already used by LotKeys. Android uses only its private app-data space to discover pairing requests and carry end-to-end encrypted frames while the phone browser is closed. Your password is not shared with LotKeys.", 16, Color.LTGRAY, false);
            button(relayAccount.isEmpty() ? "Choose LotKeys Google Account" : "Finish Google Pairing Access", this::chooseGoogleAccount, true);
            if (!relayAccount.isEmpty()) text("Selected: " + relayAccount, 14, Color.rgb(145, 151, 161), false);
            footer();
            return;
        }

        JSONObject pending = DriveRelay.pendingRequest(this);
        if (pending != null && pending.optLong("expiresAt") > System.currentTimeMillis()) {
            renderPairRequest(pending);
            footer();
            return;
        }

        step("5 of 5 · Pair a Computer");
        text("Android access is ready. Open LotKeys below to link this phone to the same LotKeys account. " +
            "A new computer still needs the matching four-digit approval on this phone. After you trust it, the quiet Android connection automatically rediscovers and reconnects that PC even when the phone browser is closed. Media opens in your default messaging app so you can review the recipient and press Send.", 16, Color.LTGRAY, false);
        statusLine("Messages", true, "SMS/MMS read, SMS reply, reviewed media handoff");
        statusLine("Contact names", contacts, contacts ? "allowed" : "using phone numbers");
        statusLine("Coverage", false, "SMS/MMS only · RCS watcher comes later");
        statusLine("Messaging app", true, store.sourceApp());
        pcRelayStatus = text("", 15, Color.LTGRAY, false);
        updatePcRelayStatus();
        PowerManager power = getSystemService(PowerManager.class);
        boolean unrestricted = power != null && power.isIgnoringBatteryOptimizations(getPackageName());
        statusLine("Locked-phone messaging", unrestricted,
            unrestricted ? "unrestricted background access" : "Android may pause the PC relay during deep idle");
        button("Open LotKeys & Link This Phone", this::openLotKeys, true);
        statusLine("Background Drive saves", TransferAuth.ready(this), TransferAuth.ready(this) ? "authorized · " + TransferAuth.account(this) : "optional · approve separately to save while the browser is closed");
        button(TransferAuth.ready(this) ? "Resume Drive Saves" : "Enable Background Drive Saves", this::authorizeUploads, false);
        statusLine("Connection checks", true, "fast while in use · hourly idle recovery for trusted computers");
        text("A PC reconnecting while this phone is idle may wait for the next hourly check. Open LotKeys on this phone to check promptly.", 14, Color.rgb(145, 151, 161), false);
        if (WakeDoorbell.configured(this)) statusLine("Optional instant wake", true, "configured · hourly recovery remains available");
        if (prefs().getBoolean("experimentalWakeSetup", false) && !WakeDoorbell.configured(this)) button("Import Optional Wake Setup", () -> {
            Intent document = new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE);
            startActivityForResult(document, REQUEST_WAKE_SETUP);
        }, false);
        button("Android App Permissions", this::openAppSettings, false);
        button("Locked-Phone Battery Settings", () -> new AlertDialog.Builder(this)
            .setTitle("Keep PC messages available while locked")
            .setMessage("Android will ask whether LotKeys TEST may keep the private PC relay running while the phone is locked. Confirm the system prompt. The connection notification remains visible while it is active.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Continue", (dialog, which) -> requestBatteryExemption()).show(), false);
        button("Reset Browser Link", () -> new AlertDialog.Builder(this)
            .setTitle("Reset the phone-to-browser link?")
            .setMessage("LotKeys tabs on this phone will stop seeing Android messages until you open LotKeys from this setup again. Phone messages and customer records are not deleted.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Reset", (dialog, which) -> {
                InstallIdentity.rotateToken(this);
                alert("Link reset. Tap Open LotKeys & Link This Phone when ready.");
            }).show(), false);
        button("Change PC Pairing Account", () -> new AlertDialog.Builder(this)
            .setTitle("Change the PC pairing account?")
            .setMessage("This disconnects and forgets trusted computers. Phone messages and LotKeys customer records are not deleted.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Change", (dialog, which) -> {
                stopService(new Intent(this, PhoneConnectorService.class));
                DriveRelay.clearAccount(this);
                chooseGoogleAccount();
            }).show(), false);
        button("Stop Phone Connection", () -> {
            prefs().edit().putBoolean("enabled", false).apply();
            stopService(new Intent(this, PhoneConnectorService.class));
            alert("Phone connection stopped. Open LotKeys & Link This Phone to start it again.");
        }, false);
        footer();
    }

    private void explainMessages() {
        new AlertDialog.Builder(this)
            .setTitle("Allow your phone's SMS/MMS?")
            .setMessage("LotKeys can read existing SMS/MMS conversations and send a plain SMS reply only when you press Send. " +
                "It cannot delete phone conversations in this checkpoint. Carrier charges may apply. RCS is not included yet.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Continue", (dialog, which) -> requestPermissions(messagePermissions(), REQUEST_MESSAGES))
            .show();
    }

    private String[] messagePermissions() {
        List<String> permissions = new ArrayList<>();
        permissions.add(Manifest.permission.READ_SMS);
        permissions.add(Manifest.permission.SEND_SMS);
        return permissions.toArray(new String[0]);
    }

    private boolean requiredMessagesGranted() {
        return checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED &&
            checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean notificationsGranted() {
        return Build.VERSION.SDK_INT < 33 || checkSelfPermission(POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private void openLotKeys() {
        if (!requiredMessagesGranted() || !notificationsGranted()) {
            alert("Finish the required Android access first.");
            return;
        }
        prefs().edit().putBoolean("enabled", true).commit();
        try { startForegroundService(new Intent(this, PhoneConnectorService.class)); }
        catch (Exception error) { alert("Android could not start the phone connection. Check App Permissions and try again."); return; }
        try { BrowserExperience.launch(this, InstallIdentity.token(this)); }
        catch (ActivityNotFoundException error) { alert(error.getMessage()); }
    }

    private void chooseGoogleAccount() {
        try {
            Intent picker = AccountPicker.newChooseAccountIntent(
                null, null, new String[]{"com.google"}, true,
                "Choose the Google account used by LotKeys", null, null, null);
            startActivityForResult(picker, REQUEST_GOOGLE_ACCOUNT);
        } catch (Exception error) {
            alert("Android could not open the Google account chooser. Update Google Play services and try again.");
        }
    }

    private void authorizeUploads() {
        String name = DriveRelay.account(this);
        if (name.isEmpty()) { alert("Choose the PC pairing account first."); return; }
        text("Preparing background Drive saves…", 14, Color.rgb(100, 181, 246), true);
        java.util.concurrent.ExecutorService authorization = Executors.newSingleThreadExecutor();
        authorization.execute(() -> {
            try {
                TransferAuth.authorize(this, new Account(name, "com.google"));
                new TransferStore(this).retryFailed(name);
                runOnUiThread(() -> { boolean scheduled = TransferJobService.schedule(this, true); render(); alert(scheduled ? "Background saves are ready. Open LotKeys to save a Vehicle Profile." : "Android could not schedule saves yet. Try Resume Drive Saves again."); });
            } catch (UserRecoverableAuthException consent) {
                runOnUiThread(() -> startActivityForResult(consent.getIntent(), REQUEST_UPLOAD_AUTHORIZATION));
            } catch (Exception error) { runOnUiThread(() -> alert(error.getMessage() == null ? "Google Drive access could not be approved." : error.getMessage())); }
            finally { authorization.shutdown(); }
        });
    }

    private void authorizeGoogleAccount(Account account) {
        if (account == null) return;
        pendingGoogleAccount = account;
        text("Authorizing private PC pairing…", 14, Color.rgb(100, 181, 246), true);
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                String token = DriveRelay.authorizeAccount(this, account);
                prefs().edit().putBoolean("enabled", true).commit();
                Intent authorized = new Intent(this, PhoneConnectorService.class)
                    .setAction(PhoneConnectorService.ACTION_ACCOUNT_AUTHORIZED)
                    .putExtra(PhoneConnectorService.EXTRA_ACCOUNT_NAME, account.name)
                    .putExtra(PhoneConnectorService.EXTRA_ACCOUNT_TYPE, account.type)
                    .putExtra(PhoneConnectorService.EXTRA_ACCESS_TOKEN, token);
                startForegroundService(authorized);
                runOnUiThread(() -> { pendingGoogleAccount = null; render(); });
            } catch (UserRecoverableAuthException recoverable) {
                runOnUiThread(() -> startActivityForResult(recoverable.getIntent(), REQUEST_GOOGLE_AUTHORIZATION));
            } catch (GoogleAuthException | java.io.IOException error) {
                runOnUiThread(() -> alert(error.getMessage() == null ? "Google did not authorize PC pairing." : error.getMessage()));
            }
        });
    }

    private void renderPairRequest(JSONObject request) {
        step("Computer wants to connect");
        text(request.optString("pcName", "Computer"), 19, Color.WHITE, true);
        TextView code = text(request.optString("code"), 38, Color.rgb(100, 181, 246), true);
        code.setGravity(Gravity.CENTER);
        text("Approve only when these same four digits are visible on the computer in front of you.", 15, Color.LTGRAY, false);
        button("Approve · Ask Every Time", () -> pairAction("APPROVE_PAIR", request, "ask"), false);
        button("Approve · Trust 36 Hours", () -> pairAction("APPROVE_PAIR", request, "36h"), true);
        button("Approve · Trust 7 Days", () -> pairAction("APPROVE_PAIR", request, "7d"), false);
        button("Approve · Until I Disconnect", () -> pairAction("APPROVE_PAIR", request, "until-disconnect"), false);
        button("Decline", () -> pairAction("DECLINE_PAIR", request, ""), false);
    }

    private void pairAction(String action, JSONObject request, String trustMode) {
        Intent intent = new Intent(this, PhoneConnectorService.class).setAction(action)
            .putExtra("sessionId", request.optString("sessionId"));
        if (!trustMode.isEmpty()) intent.putExtra("trustMode", trustMode);
        startForegroundService(intent);
        alert("DECLINE_PAIR".equals(action) ? "Computer connection declined." : "Approval sent. The computer will connect in a moment.");
        body.postDelayed(this::render, 1200);
    }

    private void openAppSettings() {
        try { startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()))); }
        catch (ActivityNotFoundException error) { alert("Open Android Settings > Apps > LotKeys TEST."); }
    }

    private void requestBatteryExemption() {
        PowerManager power = getSystemService(PowerManager.class);
        if (power != null && power.isIgnoringBatteryOptimizations(getPackageName())) {
            alert("Locked-phone background access is already unrestricted.");
            return;
        }
        try {
            startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                Uri.parse("package:" + getPackageName())));
        } catch (ActivityNotFoundException error) {
            try { startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)); }
            catch (ActivityNotFoundException ignored) { openAppSettings(); }
        }
    }

    private void restrictedSettingsHelp() {
        new AlertDialog.Builder(this)
            .setTitle("Allow the connector's restricted access")
            .setMessage("Android blocked the Messages permission for this manually installed test app. On the App info screen, tap ⋮ in the top-right, choose Allow restricted settings, return here, and press Continue to Messages access again.")
            .setNegativeButton("Not Now", null)
            .setPositiveButton("Open App Info", (dialog, which) -> openAppSettings())
            .show();
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == REQUEST_MESSAGES && !requiredMessagesGranted()) {
            restrictedSettingsHelp();
        }
        if (requestCode == REQUEST_CONTACTS && new PhoneStore(this).canReadContacts()) {
            prefs().edit().putBoolean("contactsSkipped", false).apply();
        }
        render();
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_GOOGLE_ACCOUNT && resultCode == RESULT_OK && data != null) {
            String name = data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
            String type = data.getStringExtra(AccountManager.KEY_ACCOUNT_TYPE);
            if (name != null && !name.trim().isEmpty()) authorizeGoogleAccount(new Account(name, type == null ? "com.google" : type));
            return;
        }
        if (requestCode == REQUEST_GOOGLE_AUTHORIZATION) {
            if (resultCode == RESULT_OK && pendingGoogleAccount != null) authorizeGoogleAccount(pendingGoogleAccount);
            else { pendingGoogleAccount = null; alert("Google pairing access was not approved."); }
        }
        if (requestCode == REQUEST_UPLOAD_AUTHORIZATION) {
            if (resultCode == RESULT_OK) authorizeUploads();
            else alert("Background Drive saves were not approved. Browser uploads remain available.");
        }
        if (requestCode == REQUEST_WAKE_SETUP && resultCode == RESULT_OK && data != null && data.getData() != null) {
            try (java.io.InputStream in = getContentResolver().openInputStream(data.getData()); java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
                if (in == null) throw new java.io.IOException("The wake setup file could not be opened.");
                byte[] buffer = new byte[4096]; int count;
                while ((count = in.read(buffer)) != -1) { if (out.size() + count > 65536) throw new java.io.IOException("Wake setup must be smaller than 64 KB."); out.write(buffer, 0, count); }
                WakeDoorbell.configure(this, new JSONObject(new String(out.toByteArray(), java.nio.charset.StandardCharsets.UTF_8)));
                render(); alert("Wake setup imported. Connect the trusted computer once to exchange its private doorbell grant.");
            } catch (Exception error) { alert(error.getMessage() == null ? "Wake setup could not be imported." : error.getMessage()); }
        }
    }

    private SharedPreferences prefs() {
        return getSharedPreferences("lotkeys-connector", MODE_PRIVATE);
    }

    private void step(String value) {
        TextView view = text(value, 14, Color.rgb(255, 183, 77), true);
        view.setPadding(0, dp(26), 0, dp(4));
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setLineSpacing(0, 1.15f);
        if (bold) view.setTypeface(view.getTypeface(), android.graphics.Typeface.BOLD);
        view.setPadding(0, dp(7), 0, dp(7));
        body.addView(view);
        return view;
    }

    private void statusLine(String label, boolean good, String detail) {
        text((good ? "● " : "● ") + label + " · " + detail, 15,
            good ? Color.rgb(63, 210, 122) : Color.rgb(255, 183, 77), false);
    }

    private String pairRequestId() {
        JSONObject pending = DriveRelay.pendingRequest(this);
        return pending != null && pending.optLong("expiresAt") > System.currentTimeMillis() ? pending.optString("sessionId") : "";
    }

    private void updatePcRelayStatus() {
        if (pcRelayStatus == null) return;
        JSONObject relay = PhoneConnectorService.relaySnapshot();
        boolean connected = relay != null && relay.optBoolean("authorized") && relay.optBoolean("connected");
        String error = relay == null ? "" : relay.optString("lastError");
        String detail = connected ? "connected · " + relay.optString("peerName", "Computer")
            : !error.isEmpty() ? "needs attention · " + error : "ready · waiting for a PC";
        pcRelayStatus.setText("● PC relay · " + detail);
        pcRelayStatus.setTextColor(connected ? Color.rgb(22, 137, 232) : error.isEmpty() ? Color.rgb(63, 210, 122) : Color.rgb(255, 183, 77));
    }

    private void button(String label, Runnable action, boolean primary) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextSize(16);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, dp(10), 0, 0);
        button.setLayoutParams(params);
        button.setGravity(Gravity.CENTER);
        if (primary) button.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(37, 99, 235)));
        button.setTextColor(Color.WHITE);
        button.setOnClickListener(view -> action.run());
        body.addView(button);
    }

    private void footer() {
        TextView view = text("The phone remains the source of truth. This test layer does not create contacts, archive message history, delete conversations, or become your default messenger.",
            13, Color.rgb(145, 151, 161), false);
        view.setPadding(0, dp(28), 0, 0);
    }

    private void alert(String message) {
        new AlertDialog.Builder(this).setTitle("LotKeys Phone Connection").setMessage(message).setPositiveButton("OK", null).show();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
