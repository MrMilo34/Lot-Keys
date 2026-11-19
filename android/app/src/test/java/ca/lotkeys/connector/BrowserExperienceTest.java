package ca.lotkeys.connector;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Looper;
import java.time.Duration;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.Shadows;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class) @Config(sdk = {35, 36})
public class BrowserExperienceTest {
    private Context context;
    @Before public void before() {
        context = RuntimeEnvironment.getApplication();
        context.getSharedPreferences("lotkeys-connector", 0).edit().clear().commit();
    }
    private void browser(String name) {
        ResolveInfo info = new ResolveInfo(); info.activityInfo = new ActivityInfo();
        info.activityInfo.packageName = name; info.activityInfo.name = name + ".Browser";
        Shadows.shadowOf(context.getPackageManager()).addResolveInfoForIntent(
            new Intent(Intent.ACTION_VIEW, Uri.parse(BrowserExperience.WEB_URL)).setPackage(name), info);
        Shadows.shadowOf(context.getPackageManager()).addResolveInfoForIntent(
            new Intent(Intent.ACTION_VIEW, Uri.parse(BrowserExperience.WEB_URL)), info);
    }
    @Test public void bearerStaysInTheFragmentAndTheOriginCannotComeFromAnotherApp() {
        Uri uri = BrowserExperience.appUri("retained-token");
        assertEquals("mrmilo34.github.io", uri.getHost());
        assertEquals("/Lot-Keys-TEST/", uri.getPath());
        assertEquals("095046", uri.getQueryParameter("build"));
        assertNull(uri.getQueryParameter("lotkeys-phone"));
        assertEquals("lotkeys-phone=retained-token", uri.getFragment());
        assertNull(BrowserExperience.appUri("").getFragment());
    }
    @Test public void existingInstallationAndBrowserIdentitySurviveOpeningTheMainApp() {
        browser("com.android.chrome");
        context.getSharedPreferences("lotkeys-connector", 0).edit()
            .putString("installId", "same-installation").putString("browserToken", "same-browser-token")
            .putString("experienceBrowserPackage", "com.android.chrome").putString("unrelated", "keep").commit();
        Activity activity = Robolectric.buildActivity(Activity.class).create().get();
        BrowserExperience.launch(activity, InstallIdentity.token(context));
        // TWA service binding is asynchronous; allow the bounded same-browser fallback.
        Shadows.shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(3));
        Intent opened = Shadows.shadowOf(activity).getNextStartedActivity();
        assertEquals("com.android.chrome", opened.getPackage());
        assertEquals("lotkeys-phone=same-browser-token", opened.getData().getFragment());
        assertTrue(opened.hasExtra("android.support.customtabs.extra.MENU_ITEMS"));
        assertEquals("same-installation", InstallIdentity.id(context));
        assertEquals("keep", context.getSharedPreferences("lotkeys-connector", 0).getString("unrelated", ""));
    }
    @Test public void changedDefaultDoesNotMoveLocalWorkIntoAnotherBrowser() {
        context.getSharedPreferences("lotkeys-connector", 0).edit().putString("experienceBrowserPackage", "previous.browser").commit();
        browser("new.default.browser");
        assertThrows(android.content.ActivityNotFoundException.class, () -> BrowserExperience.provider(context));
        assertEquals("previous.browser", context.getSharedPreferences("lotkeys-connector", 0).getString("experienceBrowserPackage", ""));
    }
    @Test public void openingLotKeysDoesNotRequireOrRequestPhonePermissions() {
        browser("com.android.chrome");
        MainActivity activity = Robolectric.buildActivity(MainActivity.class).create().get();
        // TWA service binding is asynchronous; allow the bounded same-browser fallback.
        Shadows.shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(3));
        Intent opened = Shadows.shadowOf(activity).getNextStartedActivity();
        assertNotNull(opened); assertNull(opened.getData().getFragment());
        assertNull(Shadows.shadowOf(activity).getLastRequestedPermission());
        assertFalse(context.getSharedPreferences("lotkeys-connector", 0).getBoolean("enabled", false));
    }
    @Test public void existingPhoneAccessRelinksWithoutReaskingOrRotatingCredentials() {
        browser("com.android.chrome");
        Shadows.shadowOf(RuntimeEnvironment.getApplication()).grantPermissions(
            Manifest.permission.READ_SMS, Manifest.permission.SEND_SMS, Manifest.permission.POST_NOTIFICATIONS);
        context.getSharedPreferences("lotkeys-connector", 0).edit().putBoolean("enabled", true).putString("browserToken", "existing-link").commit();
        MainActivity activity = Robolectric.buildActivity(MainActivity.class).create().get();
        // TWA service binding is asynchronous; allow the bounded same-browser fallback.
        Shadows.shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(3));
        Intent opened = Shadows.shadowOf(activity).getNextStartedActivity();
        assertEquals("lotkeys-phone=existing-link", opened.getData().getFragment());
        assertNull(Shadows.shadowOf(activity).getLastRequestedPermission());
        assertEquals("existing-link", InstallIdentity.token(context));
    }
    @Test public void destroyingTheLauncherCancelsItsDelayedBrowserFallback() {
        browser("com.android.chrome");
        Activity activity = Robolectric.buildActivity(Activity.class).create().get();
        BrowserExperience.launch(activity, "");
        BrowserExperience.close(activity);
        Shadows.shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(4));
        assertNull(Shadows.shadowOf(activity).getNextStartedActivity());
    }
    @Test public void explicitSettingsOpensNativeConsentWithoutLaunchingOrGrantingAnything() {
        MainActivity activity = Robolectric.buildActivity(MainActivity.class, BrowserExperience.setupIntent(context)).create().get();
        assertNull(Shadows.shadowOf(activity).getNextStartedActivity());
        assertNull(Shadows.shadowOf(activity).getLastRequestedPermission());
        assertFalse(context.getSharedPreferences("lotkeys-connector", 0).getBoolean("enabled", false));
    }
}
