package ca.lotkeys.connector;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/** Phone-owned wake capabilities; only encrypted relay replies may export PC grants. */
final class WakeDoorbell {
    private static final String PREFS = "lotkeys-phone-wake";
    private static final ExecutorService IO = Executors.newSingleThreadExecutor();
    private static final java.util.Set<String> REGISTERING = new java.util.HashSet<>();
    private static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }
    static boolean configured(Context c) { return !prefs(c).getString("config", "").isEmpty(); }
    static void initialize(Context c) {
        if (!configured(c)) return;
        try {
            JSONObject config = new JSONObject(prefs(c).getString("config", ""));
            if (FirebaseApp.getApps(c).isEmpty()) FirebaseApp.initializeApp(c, options(c, config));
            FirebaseMessaging.getInstance().setAutoInitEnabled(true);
            FirebaseMessaging.getInstance().getToken().addOnSuccessListener(token -> tokenChanged(c, token));
        } catch (Exception ignored) { /* Pairing remains available through the existing relay. */ }
    }
    static void configure(Context c, JSONObject config) throws Exception {
        options(c, config); validateEndpoint(config.getString("endpoint"));
        TransferStore.require(config.getString("enrollmentKey").matches("[A-Za-z0-9_-]{43,128}"), "Use the private wake sender enrollment key, not an OpenAI or service-account key.");
        TransferStore.require(!configured(c), "Wake setup is already imported. Keep its Firebase project unchanged for this installation.");
        prefs(c).edit().putString("config", config.toString()).commit(); initialize(c);
    }
    private static FirebaseOptions options(Context c, JSONObject config) throws Exception {
        JSONObject services = config.getJSONObject("googleServices"), project = services.getJSONObject("project_info"), client = null;
        JSONArray clients = services.getJSONArray("client");
        for (int i = 0; i < clients.length(); i++) {
            JSONObject row = clients.getJSONObject(i);
            if (c.getPackageName().equals(row.getJSONObject("client_info").getJSONObject("android_client_info").optString("package_name"))) client = row;
        }
        TransferStore.require(client != null, "This Firebase file does not register " + c.getPackageName() + ". Enigma configuration cannot activate LotKeys wake.");
        return new FirebaseOptions.Builder().setApplicationId(client.getJSONObject("client_info").getString("mobilesdk_app_id"))
            .setApiKey(client.getJSONArray("api_key").getJSONObject(0).getString("current_key"))
            .setProjectId(project.getString("project_id")).setGcmSenderId(project.getString("project_number")).build();
    }
    static synchronized void tokenChanged(Context c, String token) {
        if (token.equals(prefs(c).getString("token", ""))) return;
        prefs(c).edit().putString("token", token).commit();
        try {
            JSONObject grants = new JSONObject(prefs(c).getString("grants", "{}"));
            java.util.Iterator<String> keys = grants.keys();
            while (keys.hasNext()) { String browser = keys.next(); JSONObject grant = grants.getJSONObject(browser); grant.put("registered", false); }
            prefs(c).edit().putString("grants", grants.toString()).commit();
            keys = grants.keys();
            while (keys.hasNext()) { String browser = keys.next(); if (DriveRelay.wakeTrusted(c, browser)) register(c, browser, grants.getJSONObject(browser)); }
        } catch (Exception ignored) {}
    }
    static synchronized JSONObject grant(Context c, String browser, long trustExpiresAt) throws Exception {
        if (!configured(c) || !DriveRelay.wakeTrusted(c, browser) || prefs(c).getString("token", "").isEmpty()) return null;
        JSONObject config = new JSONObject(prefs(c).getString("config", "")), grants = new JSONObject(prefs(c).getString("grants", "{}"));
        long now = System.currentTimeMillis(), expires = Math.min(now + 7 * 86400000L, trustExpiresAt > 0 ? trustExpiresAt : Long.MAX_VALUE);
        JSONObject value = grants.optJSONObject(browser);
        if (value == null || value.optLong("expiresAt") < now + 60 * 60 * 1000L || !DriveRelay.account(c).equalsIgnoreCase(value.optString("account"))) {
            value = new JSONObject().put("id", random(18)).put("secret", random(32)).put("browserId", browser).put("deviceId", InstallIdentity.id(c))
                .put("account", DriveRelay.account(c)).put("expiresAt", expires).put("endpoint", config.getString("endpoint")).put("registered", false);
            grants.put(browser, value); prefs(c).edit().putString("grants", grants.toString()).commit();
        }
        if (!value.optBoolean("registered")) { register(c, browser, value); return null; }
        JSONObject exported = new JSONObject(value.toString()); exported.remove("registered"); return exported;
    }
    private static synchronized void register(Context c, String browser, JSONObject value) {
        String id = value.optString("id"); if (!REGISTERING.add(id)) return;
        IO.execute(() -> {
            try {
                JSONObject config = new JSONObject(prefs(c).getString("config", ""));
                JSONObject registration = new JSONObject(value.toString()).put("token", prefs(c).getString("token", ""));
                if (!post(config, new JSONObject().put("action", "register").put("enrollmentKey", config.getString("enrollmentKey")).put("grant", registration))) return;
                synchronized (WakeDoorbell.class) {
                    JSONObject grants = new JSONObject(prefs(c).getString("grants", "{}")), current = grants.optJSONObject(browser);
                    if (current != null && id.equals(current.optString("id")) && DriveRelay.wakeTrusted(c, browser) && registration.optString("token").equals(prefs(c).getString("token", ""))) {
                        current.put("registered", true); prefs(c).edit().putString("grants", grants.toString()).commit();
                    }
                }
            } catch (Exception ignored) {}
            finally { synchronized (WakeDoorbell.class) { REGISTERING.remove(id); } }
        });
    }
    static synchronized void revokeUntrusted(Context c) {
        try {
            JSONObject grants = new JSONObject(prefs(c).getString("grants", "{}"));
            java.util.List<String> removed = new java.util.ArrayList<>(); java.util.Iterator<String> keys = grants.keys();
            while (keys.hasNext()) { String browser = keys.next(); if (!DriveRelay.wakeTrusted(c, browser)) removed.add(browser); }
            for (String browser : removed) {
                String id = grants.getJSONObject(browser).getString("id"); grants.remove(browser);
                IO.execute(() -> { try { JSONObject config = new JSONObject(prefs(c).getString("config", "")); post(config, new JSONObject().put("action", "revoke").put("id", id).put("enrollmentKey", config.getString("enrollmentKey"))); } catch (Exception ignored) {} });
            }
            prefs(c).edit().putString("grants", grants.toString()).commit();
        } catch (Exception ignored) {}
    }
    static synchronized boolean accept(Context c, Map<String,String> data) {
        try {
            long now = System.currentTimeMillis(), issued = Long.parseLong(data.get("issuedAt"));
            if (Math.abs(now - issued) > 60000 || !InstallIdentity.id(c).equals(data.get("deviceId")) || !DriveRelay.wakeTrusted(c, data.get("browserId"))) return false;
            if (!c.getSharedPreferences("lotkeys-connector", Context.MODE_PRIVATE).getBoolean("enabled", false)) return false;
            JSONObject grants = new JSONObject(prefs(c).getString("grants", "{}")), grant = grants.optJSONObject(data.get("browserId"));
            if (grant == null || !grant.optBoolean("registered") || grant.optLong("expiresAt") <= now || !grant.optString("id").equals(data.get("id")) || !DriveRelay.account(c).equalsIgnoreCase(grant.optString("account"))) return false;
            for (String field : new String[]{"id","deviceId","browserId","nonce","sessionId"}) if (!data.getOrDefault(field, "").matches("[A-Za-z0-9_-]{16,100}")) return false;
            String canonical = String.join("\n", "lotkeys-wake-v1", data.get("id"), data.get("deviceId"), data.get("browserId"), data.get("nonce"), data.get("issuedAt"), data.get("sessionId"));
            Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(Base64.decode(grant.getString("secret"), Base64.URL_SAFE | Base64.NO_WRAP), "HmacSHA256"));
            byte[] signature = Base64.decode(data.get("signature"), Base64.URL_SAFE | Base64.NO_WRAP);
            if (!MessageDigest.isEqual(mac.doFinal(canonical.getBytes(StandardCharsets.UTF_8)), signature)) return false;
            String replayKey = "seen:" + grant.getString("id"); long seen = prefs(c).getLong(replayKey, 0);
            if (issued <= seen) return false;
            prefs(c).edit().putLong(replayKey, issued).commit(); return true;
        } catch (Exception invalid) { return false; }
    }
    private static String random(int count) { byte[] bytes = new byte[count]; new SecureRandom().nextBytes(bytes); return Base64.encodeToString(bytes, Base64.NO_WRAP | Base64.URL_SAFE | Base64.NO_PADDING); }
    private static void validateEndpoint(String value) throws Exception {
        URL url = new URL(value);
        TransferStore.require("https".equals(url.getProtocol()) && "script.google.com".equals(url.getHost()) && url.getPath().matches("/macros/s/[A-Za-z0-9_-]+/exec") && url.getQuery() == null && url.getRef() == null && url.getUserInfo() == null && url.getPort() == -1, "Use the separate Apps Script wake deployment's HTTPS /exec address.");
    }
    private static boolean post(JSONObject config, JSONObject body) throws Exception {
        String endpoint = config.getString("endpoint"); validateEndpoint(endpoint);
        HttpURLConnection connection = (HttpURLConnection)new URL(endpoint).openConnection();
        connection.setInstanceFollowRedirects(false); connection.setConnectTimeout(15000); connection.setReadTimeout(15000);
        connection.setRequestMethod("POST"); connection.setDoOutput(true); connection.setRequestProperty("Content-Type", "application/json");
        byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8); connection.setFixedLengthStreamingMode(bytes.length);
        try {
            try (java.io.OutputStream out = connection.getOutputStream()) { out.write(bytes); }
            int status = connection.getResponseCode();
            if (status == 302 || status == 303) {
                URL target = new URL(connection.getHeaderField("Location"));
                TransferStore.require("https".equals(target.getProtocol()) && "script.googleusercontent.com".equals(target.getHost()), "Unexpected wake sender response.");
                connection.disconnect(); connection = (HttpURLConnection)target.openConnection(); connection.setInstanceFollowRedirects(false); connection.setConnectTimeout(15000); connection.setReadTimeout(15000); status = connection.getResponseCode();
            }
            if (status != 200) return false;
            try (InputStream in = connection.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[1024]; int count;
                while ((count = in.read(buffer)) != -1) { if (out.size() + count > 8192) return false; out.write(buffer, 0, count); }
                return new JSONObject(new String(out.toByteArray(), StandardCharsets.UTF_8)).optBoolean("ok");
            }
        } finally { connection.disconnect(); }
    }
    private WakeDoorbell() {}
}
