package ca.lotkeys.connector;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.ComponentName;
import android.os.Handler;
import android.os.Looper;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsIntent;

/** Uses the existing HTTPS origin and browser storage; never creates a WebView data silo. */
final class BrowserExperience {
    static final String WEB_URL = "https://mrmilo34.github.io/Lot-Keys-TEST/?build=095046";
    static final String SHOW_SETUP = "showPhoneSetup";
    private static final String PROVIDER = "experienceBrowserPackage";

    static Uri appUri(String token) {
        // The installation bearer is a fragment, never an HTTP query or caller-supplied URL.
        return Uri.parse(WEB_URL).buildUpon()
            .fragment(token == null || token.isEmpty() ? null : "lotkeys-phone=" + token).build();
    }

    static Intent setupIntent(Context context) {
        return new Intent(context, MainActivity.class).putExtra(SHOW_SETUP, true)
            .setAction("ca.lotkeys.connector.OPEN_SETTINGS")
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    }

    static String provider(Context context) {
        SharedPreferences prefs = context.getSharedPreferences("lotkeys-connector", Context.MODE_PRIVATE);
        String saved = prefs.getString(PROVIDER, "");
        if (!saved.isEmpty()) {
            Intent view = new Intent(Intent.ACTION_VIEW, Uri.parse(WEB_URL)).setPackage(saved);
            if (context.getPackageManager().resolveActivity(view, 0) == null)
                throw new ActivityNotFoundException("Restore your previously used browser to keep using its saved LotKeys data. No data was cleared.");
            return saved;
        }
        // Prefer the default browser. This is the same browser used by the .44 external launch.
        ResolveInfo resolved = context.getPackageManager().resolveActivity(
            new Intent(Intent.ACTION_VIEW, Uri.parse(WEB_URL)), android.content.pm.PackageManager.MATCH_DEFAULT_ONLY);
        String selected = resolved != null && resolved.activityInfo != null ? resolved.activityInfo.packageName : null;
        if (selected == null || selected.equals("android")) selected = CustomTabsClient.getPackageName(context, null);
        if (selected == null) throw new ActivityNotFoundException("Choose your existing LotKeys browser as Android's default browser, then reopen LotKeys. Your saved data stays in that browser.");
        return selected;
    }

    private static final java.util.Map<Activity, Connection> connections = new java.util.WeakHashMap<>();

    static void close(Activity activity) {
        Connection old = connections.remove(activity);
        if (old != null) old.close();
    }

    static void launch(Activity activity, String token) {
        String selected = provider(activity);
        if (!activity.getSharedPreferences("lotkeys-connector", Context.MODE_PRIVATE).edit().putString(PROVIDER, selected).commit())
            throw new ActivityNotFoundException("LotKeys could not retain its browser choice. Try opening again; your saved data is retained.");
        close(activity);
        Connection connection = new Connection(activity, selected, token);
        connections.put(activity, connection);
        connection.bind();
    }

    private static final class Connection extends CustomTabsServiceConnection {
        final Activity activity;
        final String selected, token;
        final Handler handler = new Handler(Looper.getMainLooper());
        boolean bound, launched, closed;
        final Runnable fallback;
        Connection(Activity activity, String selected, String token) {
            this.activity = activity; this.selected = selected; this.token = token;
            fallback = () -> {
                if (closed || launched || activity.isFinishing()) return;
                launched = true;
                try { launchFallback(activity, selected, token); }
                catch (ActivityNotFoundException unavailable) {
                    android.widget.Toast.makeText(activity, "Restore your saved LotKeys browser, then reopen the app. Your data is retained.", android.widget.Toast.LENGTH_LONG).show();
                }
            };
        }
        void bind() {
            try { bound = CustomTabsClient.bindCustomTabsService(activity, selected, this); }
            catch (SecurityException unavailable) { bound = false; }
            if (bound) handler.postDelayed(fallback, 3000); else fallback.run();
        }
        @Override public void onCustomTabsServiceConnected(ComponentName name, CustomTabsClient client) {
            if (closed || launched || activity.isFinishing()) return;
            try {
                CustomTabsSession session = client.newSession(null);
                if (session == null) { fallback.run(); return; }
                handler.removeCallbacks(fallback);
                // Chrome hides browser chrome only after verifying the real HTTPS origin.
                // No WebView, browser/profile switch, or verification bypass is used.
                new TrustedWebActivityIntentBuilder(appUri(token)).build(session).launchTrustedWebActivity(activity);
                launched = true;
            } catch (RuntimeException unavailable) { fallback.run(); }
        }
        @Override public void onServiceDisconnected(ComponentName name) { if (!launched) fallback.run(); }
        void close() {
            closed = true; handler.removeCallbacks(fallback);
            if (bound) { activity.unbindService(this); bound = false; }
        }
    }

    private static void launchFallback(Activity activity, String selected, String token) {
        PendingIntent settings = PendingIntent.getActivity(activity, 9545, setupIntent(activity),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        CustomTabsIntent tab = new CustomTabsIntent.Builder()
            .setShowTitle(true)
            .addMenuItem("Phone & upload settings", settings)
            .build();
        // Retain the selected provider before handing control to the browser. A changed default must not silently hide local records.
        tab.intent.setPackage(selected);
        if (!activity.getSharedPreferences("lotkeys-connector", Context.MODE_PRIVATE).edit().putString(PROVIDER, selected).commit())
            throw new ActivityNotFoundException("LotKeys could not retain its browser choice. Try opening again; your saved data is retained.");
        tab.launchUrl(activity, appUri(token));
    }

    private BrowserExperience() {}
}
