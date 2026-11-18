package ca.lotkeys.connector;

import android.content.Context;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class) @Config(sdk = 35)
public class WakeSecurityTest {
    @Test public void signedWakeRequiresCurrentTrustAndRejectsReplays() throws Exception {
        Context c = RuntimeEnvironment.getApplication(); long now = System.currentTimeMillis(); String browser = "browser-1234567890123456", id = "grant-1234567890123456", device = InstallIdentity.id(c);
        c.getSharedPreferences("lotkeys-connector", 0).edit().putBoolean("enabled", true).commit();
        c.getSharedPreferences(DriveRelay.PREFS, 0).edit().putString(DriveRelay.GOOGLE_ACCOUNT, "User@example.test").putString(DriveRelay.GOOGLE_ACCOUNT_TYPE, "com.google").putLong(DriveRelay.GOOGLE_AUTHORIZED_AT, now)
            .putString("trustedComputers", new JSONArray().put(new JSONObject().put("browserId", browser).put("mode", "7d").put("expiresAt", now + 3600000)).toString()).commit();
        byte[] secret = new byte[32]; java.util.Arrays.fill(secret, (byte)17);
        JSONObject grant = new JSONObject().put("id", id).put("account", "User@example.test").put("secret", Base64.encodeToString(secret, Base64.NO_WRAP | Base64.URL_SAFE | Base64.NO_PADDING)).put("expiresAt", now + 3600000).put("registered", true);
        c.getSharedPreferences("lotkeys-phone-wake", 0).edit().putString("grants", new JSONObject().put(browser, grant).toString()).commit();
        Map<String,String> data = new HashMap<>(); data.put("id", id); data.put("browserId", browser); data.put("deviceId", device); data.put("issuedAt", String.valueOf(now)); data.put("nonce", "nonce-1234567890123456"); data.put("sessionId", "session-1234567890123456");
        Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(secret, "HmacSHA256"));
        data.put("signature", Base64.encodeToString(mac.doFinal(String.join("\n", "lotkeys-wake-v1", id, device, browser, data.get("nonce"), data.get("issuedAt"), data.get("sessionId")).getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP | Base64.URL_SAFE | Base64.NO_PADDING));
        Map<String,String> forged = new HashMap<>(data); forged.put("signature", "bad"); assertFalse(WakeDoorbell.accept(c, forged));
        assertTrue(WakeDoorbell.accept(c, data)); assertFalse(WakeDoorbell.accept(c, data));
        c.getSharedPreferences(DriveRelay.PREFS, 0).edit().putString("trustedComputers", "[]").commit();
        assertFalse(DriveRelay.wakeTrusted(c, browser)); assertFalse(WakeDoorbell.accept(c, data));
    }
}
