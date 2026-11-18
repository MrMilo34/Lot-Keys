package ca.lotkeys.connector;

import android.accounts.Account;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;

import com.google.android.gms.auth.GoogleAuthException;
import com.google.android.gms.auth.GoogleAuthUtil;
import com.google.android.gms.auth.UserRecoverableAuthException;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.math.BigInteger;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.AlgorithmParameters;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.SecureRandom;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPublicKeySpec;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Phone-owned, browser-independent encrypted relay for one active LotKeys PC.
 * Signaling frames live briefly in the selected Google account's Drive app-data
 * space; clear SMS/MMS content never leaves the phone except inside AES-GCM.
 */
final class DriveRelay {
    static final String PREFS = "lotkeys-drive-relay";
    static final String GOOGLE_ACCOUNT = "googleAccount";
    static final String GOOGLE_ACCOUNT_TYPE = "googleAccountType";
    static final String GOOGLE_AUTHORIZED_AT = "googleAuthorizedAt";
    private static final String GOOGLE_NEEDS_AUTH = "googleNeedsAuthorization";
    static final String GOOGLE_SCOPE = "oauth2:https://www.googleapis.com/auth/drive.appdata";

    private static final String FILES = "https://www.googleapis.com/drive/v3/files";
    private static final String UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
    private static final String SESSION = "activeSession";
    private static final String TRUSTS = "trustedComputers";
    private static final String PENDING = "pendingPairRequest";
    private static final long FRAME_LIFETIME = 2 * 60 * 1000L;
    private static final long ACTIVE_WINDOW = 45 * 1000L;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PhoneConnectorService service;
    private final PhoneStore store;
    private final SharedPreferences prefs;
    private final ScheduledExecutorService worker = Executors.newSingleThreadScheduledExecutor();
    private final Map<String, JSONObject> pendingOffers = new ConcurrentHashMap<>();
    private final Set<String> processedFrames = new HashSet<>();
    private volatile String accessToken = "";
    private volatile String lastError = "";
    private volatile boolean stopped = true;
    private final RelayWorkPolicy workPolicy = new RelayWorkPolicy();
    private java.util.concurrent.ScheduledFuture<?> nextPoll;
    private volatile boolean invalidationPending;
    private long lastCleanup;

    DriveRelay(PhoneConnectorService service) {
        this.service = service;
        this.store = new PhoneStore(service);
        this.prefs = service.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    void start(boolean setupVisible) {
        stopped = false;
        workPolicy.setupVisible(setupVisible);
        workPolicy.start(elapsed(), hasTrustedComputer(service));
        scheduleNext();
    }

    synchronized void stop() {
        stopped = true;
        if (nextPoll != null) nextPoll.cancel(false);
        worker.shutdownNow();
    }

    void phoneDataChanged() {
        invalidationPending = true;
        // An SMS arriving while nobody uses Hub must not restart cloud polling.
        if (workPolicy.active(elapsed())) wake();
    }

    void setupVisible(boolean visible) {
        boolean wasActive = workPolicy.active(elapsed());
        workPolicy.setupVisible(visible);
        if (visible && !wasActive) wake(); else if (!visible) scheduleNext();
    }

    void browserVisible(boolean visible) {
        boolean wasActive = workPolicy.active(elapsed());
        workPolicy.browserVisible(elapsed(), visible);
        if (visible && !wasActive) wake(); else if (!visible) scheduleNext();
    }

    void incomingWake() { workPolicy.pcSeen(elapsed()); wake(); }
    void wake() { schedule(0, true); }

    java.util.concurrent.CompletableFuture<Boolean> hourlyRecovery() {
        java.util.concurrent.CompletableFuture<Boolean> result = new java.util.concurrent.CompletableFuture<>();
        if (stopped) { result.complete(false); return result; }
        try { worker.execute(() -> {
            try {
                boolean due = !stopped && workPolicy.hourlyRecoveryDue(elapsed(), hasTrustedComputer(service));
                if (due) pollNow();
                result.complete(due);
            } catch (Exception error) { result.completeExceptionally(error); }
            finally { scheduleNext(); }
        }); } catch (java.util.concurrent.RejectedExecutionException stoppedWorker) { result.complete(false); }
        return result;
    }

    private static long elapsed() { return android.os.SystemClock.elapsedRealtime(); }
    private void pollNow() {
        if (stopped) return;
        workPolicy.polled(elapsed());
        if (!wasAuthorized(service) || (!workPolicy.active(elapsed()) && !hasTrustedComputer(service))) { service.relayChanged(); return; }
        tickSafely();
    }
    private void scheduleNext() { schedule(workPolicy.delay(elapsed(), hasTrustedComputer(service)), false); }
    private synchronized void schedule(long delay, boolean force) {
        if (stopped) return;
        if (nextPoll != null) nextPoll.cancel(false);
        nextPoll = null;
        if (delay < 0) { service.relayChanged(); return; }
        try { nextPoll = worker.schedule(() -> {
            synchronized (DriveRelay.this) { nextPoll = null; }
            if (stopped) return;
            try {
                long due = workPolicy.delay(elapsed(), hasTrustedComputer(service));
                if (force || due == 0) pollNow();
                else service.relayChanged(); // Drop an expired active wake lock without a cloud read.
            } finally { scheduleNext(); }
        }, delay, TimeUnit.MILLISECONDS); }
        catch (java.util.concurrent.RejectedExecutionException stoppedWorker) { nextPoll = null; }
    }

    static boolean hasTrustedComputer(Context context) {
        if (!wasAuthorized(context)) return false;
        try {
            JSONArray rows = new JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(TRUSTS, "[]"));
            for (int i = 0; i < rows.length(); i++) {
                JSONObject row = rows.getJSONObject(i);
                if ("until-disconnect".equals(row.optString("mode")) || (!"ask".equals(row.optString("mode")) && row.optLong("expiresAt") > System.currentTimeMillis())) return true;
            }
        } catch (Exception ignored) {}
        return false;
    }

    static boolean wakeTrusted(Context context, String browser) {
        if (browser == null || browser.isEmpty() || !wasAuthorized(context)) return false;
        try {
            JSONArray rows = new JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(TRUSTS, "[]"));
            for (int i = 0; i < rows.length(); i++) {
                JSONObject row = rows.getJSONObject(i);
                if (browser.equals(row.optString("browserId")) && ("until-disconnect".equals(row.optString("mode")) || (!"ask".equals(row.optString("mode")) && row.optLong("expiresAt") > System.currentTimeMillis()))) return true;
            }
        } catch (Exception ignored) {}
        return false;
    }

    static String account(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(GOOGLE_ACCOUNT, "");
    }

    static boolean wasAuthorized(Context context) {
        SharedPreferences value = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return !value.getString(GOOGLE_ACCOUNT, "").isEmpty() &&
            !value.getString(GOOGLE_ACCOUNT_TYPE, "").isEmpty() &&
            value.getLong(GOOGLE_AUTHORIZED_AT, 0) > 0 &&
            !value.getBoolean(GOOGLE_NEEDS_AUTH, false);
    }

    static String accountType(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(GOOGLE_ACCOUNT_TYPE, "");
    }

    static JSONObject pendingRequest(Context context) {
        String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(PENDING, "");
        try { return raw.isEmpty() ? null : new JSONObject(raw); }
        catch (Exception ignored) { return null; }
    }

    static String authorizeAccount(Context context, Account account)
        throws IOException, UserRecoverableAuthException, GoogleAuthException {
        if (account == null || account.name == null || account.name.trim().isEmpty()) {
            throw new IllegalArgumentException("Choose the Google account used by LotKeys.");
        }
        String token = GoogleAuthUtil.getToken(context, account, GOOGLE_SCOPE);
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            // Android Account identities are exact. Lower-casing a mixed-case
            // Google account makes GoogleAuthUtil report AccountNotPresent
            // after the service has to acquire a fresh background token.
            .putString(GOOGLE_ACCOUNT, account.name.trim())
            .putString(GOOGLE_ACCOUNT_TYPE,
                account.type == null || account.type.trim().isEmpty() ? "com.google" : account.type.trim())
            .putLong(GOOGLE_AUTHORIZED_AT, System.currentTimeMillis())
            .putBoolean(GOOGLE_NEEDS_AUTH, false)
            .commit();
        return token;
    }

    static void clearAccount(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .remove(GOOGLE_ACCOUNT).remove(GOOGLE_ACCOUNT_TYPE).remove(GOOGLE_AUTHORIZED_AT).remove(SESSION)
            .remove(GOOGLE_NEEDS_AUTH).remove(TRUSTS).remove(PENDING).commit();
        WakeDoorbell.revokeUntrusted(context);
    }

    void accountAuthorized(String email, String accountType, String token) {
        if (email != null && !email.trim().isEmpty()) {
            prefs.edit().putString(GOOGLE_ACCOUNT, email.trim())
                .putString(GOOGLE_ACCOUNT_TYPE,
                    accountType == null || accountType.trim().isEmpty() ? "com.google" : accountType.trim())
                .putLong(GOOGLE_AUTHORIZED_AT, System.currentTimeMillis())
                .putBoolean(GOOGLE_NEEDS_AUTH, false).apply();
        }
        accessToken = token == null ? "" : token;
        lastError = "";
        service.relayChanged();
    }

    void approve(String sessionId, String trustMode) {
        worker.execute(() -> {
            try { approveNow(sessionId, trustMode, false); }
            catch (Exception error) { fail(error); }
        });
    }

    void reject(String sessionId) {
        worker.execute(() -> {
            try {
                JSONObject offer = pendingOffer(sessionId);
                if (offer == null) return;
                JSONObject answer = new JSONObject()
                    .put("version", 1).put("type", "answer")
                    .put("sessionId", offer.optString("sessionId"))
                    .put("code", offer.optString("code"))
                    .put("rejected", true).put("createdAt", now());
                createFile("LotKeys Phone Pair Declined " + sessionId + ".json", answer,
                    properties("lotkeysPairAnswer", sessionId, offer.optLong("expiresAt")));
                deleteFile(offer.optString("_fileId"));
                pendingOffers.remove(sessionId);
                updatePendingPreference();
                service.relayChanged();
            } catch (Exception error) { fail(error); }
        });
    }

    void disconnect(boolean forgetActive) {
        worker.execute(() -> {
            try { disconnectNow(true, forgetActive, "", ""); }
            catch (Exception error) { fail(error); }
        });
    }

    void disconnectAll() {
        worker.execute(() -> {
            try {
                saveTrusts(new JSONArray());
                disconnectNow(true, true, "", "");
            } catch (Exception error) { fail(error); }
        });
    }

    void forget(String browserId) {
        if (browserId == null || browserId.isEmpty()) return;
        try {
            JSONObject revoked;
            synchronized (this) {
                JSONArray rows = trusts();
                JSONArray next = new JSONArray();
                for (int i = 0; i < rows.length(); i++) {
                    JSONObject row = rows.optJSONObject(i);
                    if (row != null && !browserId.equals(row.optString("browserId"))) next.put(row);
                }
                saveTrusts(next);
                JSONObject session = session();
                revoked = session != null && browserId.equals(session.optString("browserId")) ? session : null;
                if (revoked != null) { prefs.edit().remove(SESSION).commit(); workPolicy.clearPc(); }
            }
            // Revoke locally before returning from the phone API, even if the
            // Drive worker is waiting for a network timeout on a locked phone.
            service.relayChanged();
            if (revoked != null) worker.execute(() -> {
                try {
                    sendFrame(revoked, "pc", new JSONObject()
                        .put("kind", "event").put("event", "disconnect")
                        .put("reason", "forgotten").put("movedTo", ""));
                } catch (Exception ignored) {
                    // The locally revoked key cannot receive new phone requests.
                }
            });
        } catch (Exception error) { fail(error); }
    }

    synchronized JSONObject status() throws Exception {
        JSONObject session = session();
        boolean connected = connected(session);
        return new JSONObject()
            .put("configured", !account(service).isEmpty())
            .put("authorized", wasAuthorized(service))
            .put("account", account(service))
            .put("connected", connected)
            .put("pollMode", workPolicy.active(elapsed()) ? "active" : hasTrustedComputer(service) ? "hourly" : "quiet")
            .put("nextCheckInMs", workPolicy.delay(elapsed(), hasTrustedComputer(service)))
            .put("peerName", session == null ? "" : session.optString("peerName"))
            .put("browserId", session == null ? "" : session.optString("browserId"))
            .put("trustMode", session == null ? "" : session.optString("trustMode"))
            .put("trustExpiresAt", session == null ? 0 : session.optLong("trustExpiresAt"))
            .put("lastSeenAt", session == null ? 0 : session.optLong("lastSeenAt"))
            .put("pendingPairings", publicPending())
            .put("trusts", trusts())
            .put("lastError", lastError);
    }

    synchronized JSONArray pendingPairings() throws Exception {
        return publicPending();
    }

    private void tickSafely() {
        if (stopped || account(service).isEmpty()) return;
        try {
            // Serve an established conversation first. A temporary pairing-offer
            // listing failure must not starve a locked phone's message requests.
            pollFrames();
            pollOffers();
            if (now() - lastCleanup > 5 * 60 * 1000L) {
                cleanupStale();
                lastCleanup = now();
            }
            lastError = "";
            service.relayChanged();
        } catch (UserRecoverableAuthException error) {
            lastError = "Open LotKeys Connector TEST to approve Google Drive pairing access.";
            prefs.edit().putBoolean(GOOGLE_NEEDS_AUTH, true).apply();
            service.relayNeedsAuthorization();
        } catch (Exception error) {
            fail(error);
        }
    }

    private void fail(Exception error) {
        lastError = error.getMessage() == null ? "PC pairing relay needs attention." : error.getMessage();
        service.relayChanged();
    }

    private void pollOffers() throws Exception {
        JSONArray files = listFiles(map("lotkeysRole", "lotkeysPairOffer"));
        Set<String> present = new HashSet<>();
        for (int i = 0; i < files.length(); i++) {
            JSONObject file = files.getJSONObject(i);
            JSONObject props = file.optJSONObject("appProperties");
            String id = file.optString("id");
            String sessionId = props == null ? "" : props.optString("sessionId");
            long expiresAt = props == null ? 0 : number(props.optString("expiresAt"));
            if (expiresAt > 0 && expiresAt < now()) {
                deleteFile(id);
                pendingOffers.remove(sessionId);
                continue;
            }
            if (sessionId.isEmpty()) continue;
            present.add(sessionId);
            JSONObject offer = pendingOffers.get(sessionId);
            if (offer == null) {
                offer = new JSONObject(readFile(id));
                if (!validOffer(offer)) {
                    deleteFile(id);
                    continue;
                }
                offer.put("_fileId", id);
                pendingOffers.put(sessionId, offer);
            }
            String targetDeviceId = offer.optString("targetDeviceId");
            if (!targetDeviceId.isEmpty() && !InstallIdentity.id(service).equals(targetDeviceId)) {
                pendingOffers.remove(sessionId, offer);
                continue;
            }
        }
        for (Map.Entry<String, JSONObject> row : pendingOffers.entrySet()) {
            if (!present.contains(row.getKey()) || row.getValue().optLong("expiresAt") < now()) {
                pendingOffers.remove(row.getKey(), row.getValue());
            }
        }
        // A trusted browser may leave an old offer behind when a tab is suspended
        // or the network changes. Pick only the newest trusted offer so stale
        // requests cannot repeatedly replace the recovered session.
        JSONObject newest = null;
        JSONObject newestTrust = null;
        for (JSONObject offer : pendingOffers.values()) {
            JSONObject trusted = trustedComputer(offer.optString("browserId"));
            if (trusted == null) continue;
            long offerTime = offer.optLong("createdAt", offer.optLong("expiresAt"));
            long newestTime = newest == null ? Long.MIN_VALUE : newest.optLong("createdAt", newest.optLong("expiresAt"));
            if (newest == null || offerTime >= newestTime) {
                newest = offer;
                newestTrust = trusted;
            }
        }
        if (newest != null && newestTrust != null) {
            String selectedSession = newest.optString("sessionId");
            for (Map.Entry<String, JSONObject> row : new HashMap<>(pendingOffers).entrySet()) {
                JSONObject offer = row.getValue();
                if (selectedSession.equals(row.getKey()) || trustedComputer(offer.optString("browserId")) == null) continue;
                try { deleteFile(offer.optString("_fileId")); } catch (Exception ignored) {}
                pendingOffers.remove(row.getKey(), offer);
            }
            approveNow(selectedSession, newestTrust.optString("mode"), true);
        }
        updatePendingPreference();
    }

    private void approveNow(String sessionId, String trustMode, boolean automatic) throws Exception {
        JSONObject offer = pendingOffer(sessionId);
        if (offer == null || !validOffer(offer)) throw new IllegalArgumentException("That pairing request expired. Start again from the computer.");
        if (!validTrustMode(trustMode)) trustMode = "36h";
        JSONObject previous = session();
        boolean sameBrowserRecovery = previous != null &&
            offer.optString("browserId").equals(previous.optString("browserId"));
        if (previous != null) disconnectNow(!sameBrowserRecovery, false,
            sameBrowserRecovery ? "stale" : "moved", offer.optString("pcName"));

        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair pair = generator.generateKeyPair();
        byte[] key = deriveKey(pair, offer.getJSONObject("publicKey"));
        JSONObject trust = recordTrust(offer, trustMode);
        JSONObject answer = new JSONObject()
            .put("version", 1).put("type", "answer")
            .put("sessionId", offer.getString("sessionId"))
            .put("code", offer.getString("code"))
            .put("publicKey", publicJwk((ECPublicKey) pair.getPublic()))
            .put("deviceId", InstallIdentity.id(service))
            .put("deviceName", android.os.Build.MANUFACTURER + " " + android.os.Build.MODEL)
            .put("sourceApp", store.sourceApp())
            .put("trustMode", trustMode)
            .put("trustExpiresAt", trust == null ? 0 : trust.optLong("expiresAt"))
            .put("createdAt", now()).put("expiresAt", offer.getLong("expiresAt"));
        createFile("LotKeys Phone Pair Answer " + sessionId + ".json", answer,
            properties("lotkeysPairAnswer", sessionId, offer.getLong("expiresAt")));
        JSONObject active = new JSONObject()
            .put("version", 1).put("sessionId", sessionId)
            .put("key", Base64.encodeToString(key, Base64.NO_WRAP))
            .put("browserId", offer.getString("browserId"))
            .put("peerName", offer.optString("pcName", "Computer"))
            .put("trustMode", trustMode)
            .put("trustExpiresAt", trust == null ? 0 : trust.optLong("expiresAt"))
            .put("connectedAt", now()).put("lastSeenAt", now())
            .put("automatic", automatic);
        saveSession(active);
        workPolicy.pcSeen(elapsed());
        pendingOffers.remove(sessionId);
        deleteFile(offer.optString("_fileId"));
        updatePendingPreference();
        service.relayChanged();
    }

    private JSONObject pendingOffer(String sessionId) {
        JSONObject offer = pendingOffers.get(sessionId);
        if (offer != null) return offer;
        JSONObject saved = pendingRequest(service);
        return saved != null && sessionId.equals(saved.optString("sessionId")) ? saved : null;
    }

    private void pollFrames() throws Exception {
        JSONObject session = session();
        if (session == null) return;
        String sessionId = session.optString("sessionId");
        JSONArray files = listFiles(map(
            "lotkeysRole", "lotkeysPhoneFrame",
            "sessionId", sessionId,
            "target", "phone"));
        for (int i = 0; i < files.length(); i++) {
            JSONObject current = session();
            if (current == null || !sessionId.equals(current.optString("sessionId"))) return;
            JSONObject file = files.getJSONObject(i);
            JSONObject props = file.optJSONObject("appProperties");
            String fileId = file.optString("id");
            String frameId = props == null ? "" : props.optString("frameId");
            long expiresAt = props == null ? 0 : number(props.optString("expiresAt"));
            if (frameId.isEmpty() || processedFrames.contains(frameId) || (expiresAt > 0 && expiresAt < now())) {
                deleteFile(fileId);
                continue;
            }
            try {
                JSONObject payload = openFrame(session, frameId, "phone", new JSONObject(readFile(fileId)));
                synchronized (this) {
                    JSONObject activeSession = session();
                    if (activeSession == null || !sessionId.equals(activeSession.optString("sessionId"))) return;
                    workPolicy.pcSeen(elapsed());
                    session.put("lastSeenAt", now());
                    saveSession(session);
                }
                processedFrames.add(frameId);
                if (processedFrames.size() > 1000) processedFrames.remove(processedFrames.iterator().next());
                handlePayload(session, payload);
            } finally {
                deleteFile(fileId);
            }
        }
        if (invalidationPending && connected(session)) {
            invalidationPending = false;
            sendFrame(session, "pc", new JSONObject()
                .put("kind", "event").put("event", "invalidate")
                .put("revision", PhoneConnectorService.revision()));
        }
    }

    private void handlePayload(JSONObject session, JSONObject payload) throws Exception {
        if ("event".equals(payload.optString("kind")) && "disconnect".equals(payload.optString("event"))) {
            disconnectNow(false, false, payload.optString("reason"), payload.optString("movedTo"));
            return;
        }
        if (!"request".equals(payload.optString("kind"))) return;
        String requestId = payload.optString("id");
        if (!requestId.matches("[A-Za-z0-9_-]{8,100}")) return;
        JSONObject input = payload.optJSONObject("payload");
        if (input == null) input = new JSONObject();
        JSONObject response = new JSONObject().put("kind", "response").put("requestId", requestId);
        try {
            String operation = payload.optString("op");
            Object data;
            if ("status".equals(operation)) data = store.status(PhoneConnectorService.revision(), LocalApiServer.PORT);
            else if ("threads".equals(operation)) data = store.conversations(Math.max(0, input.optInt("offset")));
            else if ("history".equals(operation)) data = store.history(input.optString("threadId"), input.optJSONObject("before"));
            else if ("send".equals(operation)) data = waitForSend(store.send(input));
            else if ("media".equals(operation)) data = store.mediaHandoff(input);
            else if ("attachment".equals(operation)) data = store.attachment(input.optString("partId"));
            else if ("foreground".equals(operation)) {
                long expiry = renewTrust(session);
                JSONObject foreground = new JSONObject().put("ok", true).put("trustExpiresAt", expiry);
                JSONObject wakeGrant = WakeDoorbell.grant(service, session.optString("browserId"), expiry);
                if (wakeGrant != null) foreground.put("wakeGrant", wakeGrant);
                data = foreground;
            }
            else throw new IllegalArgumentException("Unsupported phone request.");
            response.put("ok", true).put("data", data);
        } catch (Exception error) {
            response.put("ok", false).put("error", error.getMessage() == null ? "Phone request failed." : error.getMessage());
        }
        sendFrame(session, "pc", response);
    }

    private JSONObject waitForSend(JSONObject receipt) throws Exception {
        String requestId = receipt.optString("requestId");
        for (int attempt = 0; attempt < 50 && "sending".equals(receipt.optString("phase")); attempt++) {
            Thread.sleep(500);
            receipt = store.sendStatus(requestId);
        }
        if ("sending".equals(receipt.optString("phase"))) {
            receipt.put("phase", "unconfirmed")
                .put("error", "The phone has not confirmed this SMS yet. Check the phone before retrying.");
        }
        return receipt;
    }

    private void disconnectNow(boolean notify, boolean forgetActive, String reason, String movedTo) throws Exception {
        JSONObject session = session();
        if (session == null) return;
        if (notify) {
            try {
                sendFrame(session, "pc", new JSONObject()
                    .put("kind", "event").put("event", "disconnect")
                    .put("reason", reason == null ? "" : reason)
                    .put("movedTo", movedTo == null ? "" : movedTo));
            } catch (Exception ignored) {
                // Local revocation must still complete if the old PC is offline.
            }
        }
        if (forgetActive || "until-disconnect".equals(session.optString("trustMode"))) {
            removeTrust(session.optString("browserId"));
        }
        prefs.edit().remove(SESSION).apply();
        workPolicy.clearPc();
        service.relayChanged();
    }

    private void sendFrame(JSONObject session, String target, JSONObject payload) throws Exception {
        String frameId = randomId(18);
        long expiresAt = now() + FRAME_LIFETIME;
        JSONObject envelope = seal(session, frameId, target, payload
            .put("sentAt", now()).put("sender", "phone"));
        Map<String, String> props = properties("lotkeysPhoneFrame", session.getString("sessionId"), expiresAt);
        props.put("frameId", frameId);
        props.put("target", target);
        createFile("LotKeys Phone Frame " + frameId + ".json", envelope, props);
    }

    private JSONObject seal(JSONObject session, String frameId, String target, JSONObject payload) throws Exception {
        byte[] iv = new byte[12];
        RANDOM.nextBytes(iv);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(Base64.decode(session.getString("key"), Base64.DEFAULT), "AES"), new GCMParameterSpec(128, iv));
        cipher.updateAAD((session.getString("sessionId") + "|" + frameId + "|" + target).getBytes(StandardCharsets.UTF_8));
        byte[] ciphertext = cipher.doFinal(payload.toString().getBytes(StandardCharsets.UTF_8));
        return new JSONObject().put("version", 1).put("iv", base64url(iv)).put("ciphertext", base64url(ciphertext));
    }

    private JSONObject openFrame(JSONObject session, String frameId, String target, JSONObject envelope) throws Exception {
        if (envelope.optInt("version") != 1) throw new IllegalArgumentException("Unsupported encrypted phone frame.");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(Base64.decode(session.getString("key"), Base64.DEFAULT), "AES"),
            new GCMParameterSpec(128, fromBase64url(envelope.getString("iv"))));
        cipher.updateAAD((session.getString("sessionId") + "|" + frameId + "|" + target).getBytes(StandardCharsets.UTF_8));
        return new JSONObject(new String(cipher.doFinal(fromBase64url(envelope.getString("ciphertext"))), StandardCharsets.UTF_8));
    }

    private static byte[] deriveKey(KeyPair pair, JSONObject remoteJwk) throws Exception {
        AlgorithmParameters parameters = AlgorithmParameters.getInstance("EC");
        parameters.init(new ECGenParameterSpec("secp256r1"));
        ECParameterSpec spec = parameters.getParameterSpec(ECParameterSpec.class);
        ECPoint point = new ECPoint(
            new BigInteger(1, fromBase64url(remoteJwk.getString("x"))),
            new BigInteger(1, fromBase64url(remoteJwk.getString("y"))));
        ECPublicKeySpec remoteSpec = new ECPublicKeySpec(point, spec);
        KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
        agreement.init(pair.getPrivate());
        agreement.doPhase(KeyFactory.getInstance("EC").generatePublic(remoteSpec), true);
        byte[] shared = agreement.generateSecret();
        byte[] key = new byte[32];
        if (shared.length >= 32) System.arraycopy(shared, shared.length - 32, key, 0, 32);
        else System.arraycopy(shared, 0, key, 32 - shared.length, shared.length);
        return key;
    }

    private static JSONObject publicJwk(ECPublicKey key) throws Exception {
        return new JSONObject().put("kty", "EC").put("crv", "P-256")
            .put("x", base64url(fixed(key.getW().getAffineX(), 32)))
            .put("y", base64url(fixed(key.getW().getAffineY(), 32)))
            .put("ext", true).put("key_ops", new JSONArray());
    }

    private static byte[] fixed(BigInteger value, int size) {
        byte[] raw = value.toByteArray();
        byte[] result = new byte[size];
        int source = Math.max(0, raw.length - size);
        int length = Math.min(size, raw.length);
        System.arraycopy(raw, source, result, size - length, length);
        return result;
    }

    private JSONObject recordTrust(JSONObject offer, String mode) throws Exception {
        JSONArray rows = trusts();
        JSONArray next = new JSONArray();
        for (int i = 0; i < rows.length(); i++) {
            JSONObject row = rows.optJSONObject(i);
            if (row != null && !offer.optString("browserId").equals(row.optString("browserId"))) next.put(row);
        }
        if ("ask".equals(mode)) {
            saveTrusts(next);
            return null;
        }
        JSONObject row = new JSONObject()
            .put("browserId", offer.getString("browserId"))
            .put("name", offer.optString("pcName", "Computer"))
            .put("mode", mode).put("expiresAt", trustExpiry(mode))
            .put("lastConnectedAt", now());
        next.put(row);
        saveTrusts(next);
        return row;
    }

    private long renewTrust(JSONObject session) throws Exception {
        JSONArray rows = trusts();
        long expiry = session.optLong("trustExpiresAt");
        for (int i = 0; i < rows.length(); i++) {
            JSONObject row = rows.optJSONObject(i);
            if (row == null || !session.optString("browserId").equals(row.optString("browserId"))) continue;
            row.put("lastConnectedAt", now());
            if ("36h".equals(row.optString("mode")) || "7d".equals(row.optString("mode"))) {
                expiry = trustExpiry(row.optString("mode"));
                row.put("expiresAt", expiry);
                session.put("trustExpiresAt", expiry);
                saveSession(session);
            }
            saveTrusts(rows);
            break;
        }
        return expiry;
    }

    private JSONObject trustedComputer(String browserId) throws Exception {
        JSONArray rows = trusts();
        for (int i = 0; i < rows.length(); i++) {
            JSONObject row = rows.optJSONObject(i);
            if (row == null || !browserId.equals(row.optString("browserId")) || "ask".equals(row.optString("mode"))) continue;
            if ("until-disconnect".equals(row.optString("mode")) || row.optLong("expiresAt") > now()) return row;
        }
        return null;
    }

    private void removeTrust(String browserId) throws Exception {
        JSONArray rows = trusts();
        JSONArray next = new JSONArray();
        for (int i = 0; i < rows.length(); i++) {
            JSONObject row = rows.optJSONObject(i);
            if (row != null && !browserId.equals(row.optString("browserId"))) next.put(row);
        }
        saveTrusts(next);
    }

    private JSONArray trusts() throws Exception {
        String raw = prefs.getString(TRUSTS, "[]");
        try { return new JSONArray(raw); }
        catch (Exception ignored) { return new JSONArray(); }
    }

    private void saveTrusts(JSONArray rows) {
        prefs.edit().putString(TRUSTS, rows.toString()).apply();
        WakeDoorbell.revokeUntrusted(service);
    }

    private JSONObject session() {
        String raw = prefs.getString(SESSION, "");
        try { return raw.isEmpty() ? null : new JSONObject(raw); }
        catch (Exception ignored) { return null; }
    }

    private void saveSession(JSONObject value) {
        prefs.edit().putString(SESSION, value.toString()).apply();
    }

    private boolean connected(JSONObject session) {
        return session != null && now() - session.optLong("lastSeenAt") < ACTIVE_WINDOW;
    }

    private JSONArray publicPending() throws Exception {
        JSONArray result = new JSONArray();
        for (JSONObject offer : pendingOffers.values()) {
            if (!validOffer(offer)) continue;
            result.put(new JSONObject()
                .put("sessionId", offer.optString("sessionId"))
                .put("code", offer.optString("code"))
                .put("pcName", offer.optString("pcName", "Computer"))
                .put("requestedTrustMode", offer.optString("requestedTrustMode", "36h"))
                .put("expiresAt", offer.optLong("expiresAt")));
        }
        return result;
    }

    private void updatePendingPreference() {
        JSONObject first = null;
        for (JSONObject offer : pendingOffers.values()) {
            if (validOffer(offer)) { first = offer; break; }
        }
        if (first == null) prefs.edit().remove(PENDING).apply();
        else prefs.edit().putString(PENDING, first.toString()).apply();
        service.pairingRequestChanged(first);
    }

    private boolean validOffer(JSONObject offer) {
        if (offer == null || offer.optInt("version") != 1 || !"offer".equals(offer.optString("type"))) return false;
        JSONObject key = offer.optJSONObject("publicKey");
        String targetDeviceId = offer.optString("targetDeviceId");
        return offer.optString("sessionId").matches("[A-Za-z0-9_-]{16,80}") &&
            offer.optString("code").matches("[0-9]{4}") &&
            offer.optString("browserId").matches("[A-Za-z0-9_-]{16,100}") &&
            (targetDeviceId.isEmpty() || targetDeviceId.matches("[A-Za-z0-9_-]{16,100}")) &&
            key != null && "EC".equals(key.optString("kty")) && "P-256".equals(key.optString("crv")) &&
            offer.optLong("expiresAt") > now() && offer.optLong("expiresAt") <= now() + 15 * 60 * 1000L;
    }

    private static boolean validTrustMode(String mode) {
        return "ask".equals(mode) || "36h".equals(mode) || "7d".equals(mode) || "until-disconnect".equals(mode);
    }

    private static long trustExpiry(String mode) {
        if ("36h".equals(mode)) return now() + 36 * 60 * 60 * 1000L;
        if ("7d".equals(mode)) return now() + 7 * 24 * 60 * 60 * 1000L;
        if ("until-disconnect".equals(mode)) return Long.MAX_VALUE;
        return 0;
    }

    private void cleanupStale() throws Exception {
        for (String role : new String[]{"lotkeysPairOffer", "lotkeysPairAnswer", "lotkeysPhoneFrame", "lotkeysPairProbe"}) {
            JSONArray files = listFiles(map("lotkeysRole", role));
            for (int i = 0; i < files.length(); i++) {
                JSONObject file = files.getJSONObject(i);
                JSONObject props = file.optJSONObject("appProperties");
                if (props != null && number(props.optString("expiresAt")) > 0 && number(props.optString("expiresAt")) < now()) {
                    deleteFile(file.optString("id"));
                }
            }
        }
    }

    private JSONArray listFiles(Map<String, String> properties) throws Exception {
        StringBuilder query = new StringBuilder("trashed = false");
        for (Map.Entry<String, String> row : properties.entrySet()) {
            query.append(" and appProperties has { key='").append(escape(row.getKey()))
                .append("' and value='").append(escape(row.getValue())).append("' }");
        }
        String url = FILES + "?spaces=appDataFolder&pageSize=100&orderBy=createdTime%20asc&fields=" +
            encode("files(id,name,createdTime,modifiedTime,size,appProperties)") + "&q=" + encode(query.toString());
        JSONObject response = new JSONObject(request("GET", url, null, null, true));
        JSONArray files = response.optJSONArray("files");
        return files == null ? new JSONArray() : files;
    }

    private String readFile(String id) throws Exception {
        return request("GET", FILES + "/" + encodePath(id) + "?alt=media", null, null, true);
    }

    private JSONObject createFile(String name, JSONObject data, Map<String, String> appProperties) throws Exception {
        String boundary = "lotkeys_" + randomId(9);
        JSONObject metadata = new JSONObject().put("name", name)
            .put("parents", new JSONArray().put("appDataFolder"))
            .put("mimeType", "application/json")
            .put("appProperties", new JSONObject(appProperties));
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        output.write(("--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + metadata +
            "\r\n--" + boundary + "\r\nContent-Type: application/json\r\n\r\n" + data +
            "\r\n--" + boundary + "--").getBytes(StandardCharsets.UTF_8));
        String result = request("POST", UPLOAD + "?uploadType=multipart&fields=id,name,createdTime,appProperties",
            "multipart/related; boundary=" + boundary, output.toByteArray(), true);
        return new JSONObject(result);
    }

    private void deleteFile(String id) throws Exception {
        if (id == null || id.isEmpty()) return;
        try { request("DELETE", FILES + "/" + encodePath(id), null, null, true); }
        catch (HttpFailure error) { if (error.status != 404) throw error; }
    }

    private String request(String method, String url, String contentType, byte[] body, boolean retry) throws Exception {
        String token = token();
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(12000);
        connection.setReadTimeout(45000);
        connection.setRequestProperty("Authorization", "Bearer " + token);
        connection.setRequestProperty("Accept", "application/json");
        connection.setUseCaches(false);
        if (body != null) {
            connection.setDoOutput(true);
            connection.setFixedLengthStreamingMode(body.length);
            connection.setRequestProperty("Content-Type", contentType == null ? "application/json" : contentType);
            try (OutputStream output = connection.getOutputStream()) { output.write(body); }
        }
        int status = connection.getResponseCode();
        InputStream input = status >= 200 && status < 300 ? connection.getInputStream() : connection.getErrorStream();
        String response = input == null ? "" : read(input, 20 * 1024 * 1024);
        connection.disconnect();
        if (status == 401 && retry) {
            try { GoogleAuthUtil.clearToken(service, token); } catch (Exception ignored) {}
            accessToken = "";
            return request(method, url, contentType, body, false);
        }
        if (status < 200 || status >= 300) {
            String message = "Private Google Drive relay returned " + status + ".";
            try { message = new JSONObject(response).getJSONObject("error").optString("message", message); }
            catch (Exception ignored) {}
            throw new HttpFailure(status, message);
        }
        return response;
    }

    private String token() throws IOException, UserRecoverableAuthException, GoogleAuthException {
        if (!accessToken.isEmpty()) return accessToken;
        String email = account(service);
        String type = accountType(service);
        if (email.isEmpty() || type.isEmpty()) {
            throw new IllegalStateException("Choose the Google account used by LotKeys in the Android setup.");
        }
        accessToken = GoogleAuthUtil.getToken(service, new Account(email, type), GOOGLE_SCOPE);
        prefs.edit().putLong(GOOGLE_AUTHORIZED_AT, now()).putBoolean(GOOGLE_NEEDS_AUTH, false).apply();
        return accessToken;
    }

    private static String read(InputStream input, int limit) throws IOException {
        try (InputStream stream = input; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = stream.read(buffer)) > 0) {
                if (output.size() + count > limit) throw new IOException("PC relay response was too large.");
                output.write(buffer, 0, count);
            }
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }

    private static Map<String, String> properties(String role, String sessionId, long expiresAt) {
        Map<String, String> result = new HashMap<>();
        result.put("lotkeysRole", role);
        result.put("sessionId", sessionId);
        result.put("expiresAt", String.valueOf(expiresAt));
        return result;
    }

    private static Map<String, String> map(String... values) {
        Map<String, String> result = new HashMap<>();
        for (int i = 0; i + 1 < values.length; i += 2) result.put(values[i], values[i + 1]);
        return result;
    }

    private static String escape(String value) {
        return String.valueOf(value).replace("\\", "\\\\").replace("'", "\\'");
    }

    private static String encode(String value) throws Exception {
        return URLEncoder.encode(value, "UTF-8").replace("+", "%20");
    }

    private static String encodePath(String value) throws Exception {
        return encode(value).replace("%2F", "/");
    }

    private static long number(String value) {
        try { return Long.parseLong(value); } catch (Exception ignored) { return 0; }
    }

    private static long now() { return System.currentTimeMillis(); }

    private static String randomId(int bytes) {
        byte[] value = new byte[bytes];
        RANDOM.nextBytes(value);
        return base64url(value);
    }

    private static String base64url(byte[] value) {
        return Base64.encodeToString(value, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
    }

    private static byte[] fromBase64url(String value) {
        return Base64.decode(value, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
    }

    private static final class HttpFailure extends IOException {
        final int status;
        HttpFailure(int status, String message) { super(message); this.status = status; }
    }
}
