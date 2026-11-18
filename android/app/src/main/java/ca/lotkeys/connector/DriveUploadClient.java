package ca.lotkeys.connector;

import android.content.Context;
import android.net.Network;
import com.google.android.gms.auth.GoogleAuthUtil;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.concurrent.CancellationException;

/** Bounded streaming Drive transport. Only server-confirmed offsets become checkpoints. */
class DriveUploadClient {
    interface Check { void run() throws Exception; }
    private static final String FILES = "https://www.googleapis.com/drive/v3/files";
    private static final String UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
    private static final int CHUNK = 8 * 1024 * 1024;
    private final Context context;
    private final String account;
    private final Network network;
    private final Check check;
    private String token;

    DriveUploadClient(Context context, String account, Network network, Check check) {
        this.context = context; this.account = account; this.network = network; this.check = check;
    }
    static final class Reply {
        int status; String range = "", location = "", etag = "", text = "";
        byte[] body = new byte[0];
        JSONObject json() throws Exception { return text.isEmpty() ? new JSONObject() : new JSONObject(text); }
    }
    static final class RemoteError extends Exception {
        final int status;
        RemoteError(int status) { super("Google Drive request returned " + status + "."); this.status = status; }
    }
    Reply request(String method, String url, String type, byte[] bytes, File source, long offset, long length, String range, String match) throws Exception {
        for (int attempt = 0; attempt < 2; attempt++) {
            check.run();
            if (token == null) token = TransferAuth.token(context, account);
            URL target = new URL(url);
            TransferStore.require("https".equals(target.getProtocol()) && ("www.googleapis.com".equals(target.getHost()) || "sheets.googleapis.com".equals(target.getHost()) || "docs.googleapis.com".equals(target.getHost())), "Unexpected Google upload endpoint.");
            HttpURLConnection connection = (HttpURLConnection) (network == null ? target.openConnection() : network.openConnection(target));
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(20000); connection.setReadTimeout(30000); connection.setRequestMethod(method);
            connection.setRequestProperty("Authorization", "Bearer " + token);
            connection.setRequestProperty("Accept", url.contains("/export?") ? "application/pdf" : "application/json");
            if (range != null) connection.setRequestProperty("Content-Range", range);
            if (match != null && !match.isEmpty()) connection.setRequestProperty("If-Match", match);
            try {
                if (bytes != null || source != null || "PUT".equals(method)) {
                    connection.setDoOutput(true);
                    connection.setRequestProperty("Content-Type", type == null ? "application/octet-stream" : type);
                    connection.setFixedLengthStreamingMode(source == null ? bytes == null ? 0 : bytes.length : length);
                    try (OutputStream out = connection.getOutputStream()) {
                        if (source != null) {
                            try (RandomAccessFile in = new RandomAccessFile(source, "r")) {
                                in.seek(offset); long remaining = length; byte[] buffer = new byte[65536];
                                while (remaining > 0) { check.run(); int read = in.read(buffer, 0, (int)Math.min(buffer.length, remaining)); if (read < 0) throw new java.io.IOException("The staged original is incomplete."); out.write(buffer, 0, read); remaining -= read; }
                            }
                        } else if (bytes != null) out.write(bytes);
                    }
                }
                Reply reply = new Reply(); reply.status = connection.getResponseCode();
                reply.range = connection.getHeaderField("Range"); reply.location = connection.getHeaderField("Location"); reply.etag = connection.getHeaderField("ETag");
                InputStream stream = reply.status >= 400 ? connection.getErrorStream() : connection.getInputStream();
                if (stream != null) try (InputStream in = stream; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[8192]; int read;
                    int limit = (url.contains("/export?") ? 10 : 8) * 1024 * 1024;
                    while ((read = in.read(buffer)) >= 0) { if (out.size() + read > limit) throw new java.io.IOException("Google returned an oversized response."); out.write(buffer, 0, read); }
                    reply.body = out.toByteArray(); if (!url.contains("/export?")) reply.text = new String(reply.body, StandardCharsets.UTF_8);
                }
                check.run();
                if (reply.status != 401) return reply;
                GoogleAuthUtil.clearToken(context, token); token = null;
            } finally { connection.disconnect(); }
        }
        throw new TransferAuth.AuthRequired("Google Drive upload access needs to be approved again in Android setup.");
    }
    private Reply json(String method, String url, JSONObject body) throws Exception {
        return request(method, url, "application/json; charset=utf-8", body == null ? null : body.toString().getBytes(StandardCharsets.UTF_8), null, 0, 0, null, null);
    }
    static void success(Reply reply) throws RemoteError { if (reply.status < 200 || reply.status >= 300) throw new RemoteError(reply.status); }
    private JSONObject existing(JSONObject asset) throws Exception {
        JSONObject props = asset.optJSONObject("properties");
        if (props == null || (!props.has("lotkeysAssetId") && !props.has("lotkeysListingAssetId"))) return null;
        StringBuilder query = new StringBuilder("'").append(escape(asset.getString("parent"))).append("' in parents and trashed = false");
        Iterator<String> keys = props.keys();
        while (keys.hasNext()) { String key = keys.next(); query.append(" and appProperties has { key='").append(escape(key)).append("' and value='").append(escape(props.getString(key))).append("' }"); }
        Reply reply = json("GET", FILES + "?supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=100&fields=files(id,name,mimeType,size,md5Checksum,webViewLink,appProperties)&q=" + encode(query.toString()), null);
        success(reply); JSONArray rows = reply.json().optJSONArray("files");
        if (rows == null || rows.length() == 0) return null;
        TransferStore.require(rows.length() == 1, "More than one Drive file matches this asset; review it before continuing.");
        JSONObject row = rows.getJSONObject(0);
        TransferStore.require(row.optLong("size", -1) == asset.getLong("size"), "The existing Drive asset has a different size; review it before replacing it.");
        TransferStore.require(asset.getString("md5").equalsIgnoreCase(row.optString("md5Checksum")), "The existing Drive asset has different bytes; review it before replacing it.");
        return row;
    }
    JSONObject upload(TransferStore store, JSONObject batch, int item) throws Exception {
        String id = batch.getString("id"); JSONObject asset = batch.getJSONArray("assets").getJSONObject(item);
        File source = store.source(id, item); long total = asset.getLong("size");
        JSONObject checkpoint = store.itemState(id, item);
        if (checkpoint.optJSONObject("result") != null) return checkpoint.getJSONObject("result");
        TransferStore.require(source.isFile() && source.length() == total, "The original file is no longer available for upload.");
        JSONObject remote = existing(asset);
        if (remote != null) { if (!asset.optString("driveId").isEmpty()) TransferStore.require(asset.getString("driveId").equals(remote.optString("id")), "A matching asset was created elsewhere. Reopen the Profile to reconcile it."); store.itemState(id, item, checkpoint.put("confirmed", total).put("result", remote)); return remote; }
        String driveId = checkpoint.optString("driveId");
        if (driveId.isEmpty() && !asset.optString("driveId").isEmpty()) { driveId = asset.getString("driveId"); checkpoint.put("driveId", driveId); store.itemState(id, item, checkpoint); }
        if (driveId.isEmpty()) {
            Reply generated = json("GET", FILES + "/generateIds?count=1&space=drive&type=files", null); success(generated);
            driveId = generated.json().getJSONArray("ids").getString(0); TransferStore.fileId(driveId);
            // A stable server-issued ID survives a lost final response or expired
            // resumable URL. Retrying this create cannot produce a second file.
            checkpoint.put("driveId", driveId); store.itemState(id, item, checkpoint);
        } else {
            Reply known = json("GET", FILES + "/" + driveId + "?supportsAllDrives=true&fields=id,name,mimeType,size,md5Checksum,webViewLink", null);
            if (known.status == 200) { JSONObject done = known.json(); validateResult(done, asset); store.itemState(id, item, checkpoint.put("confirmed", total).put("result", done)); return done; }
            if (known.status != 404) throw new RemoteError(known.status);
        }
        String session = checkpoint.optString("session"); long offset = 0;
        if (!session.isEmpty()) {
            validateSession(session);
            Reply status = request("PUT", session, asset.optString("type"), new byte[0], null, 0, 0, "bytes */" + total, null);
            if (status.status == 200 || status.status == 201) {
                JSONObject done = status.json(); validateResult(done, asset);
                store.itemState(id, item, checkpoint.put("confirmed", total).put("result", done)); return done;
            }
            if (status.status == 308) offset = confirmed(status.range, total);
            else if (status.status == 404 || status.status == 410) session = "";
            else throw new RemoteError(status.status);
        }
        if (session.isEmpty()) {
            JSONObject metadata = new JSONObject().put("id", driveId).put("name", asset.getString("name")).put("mimeType", asset.optString("type", "application/octet-stream")).put("parents", new JSONArray().put(asset.getString("parent")))
                .put("appProperties", asset.optJSONObject("properties") == null ? new JSONObject() : asset.getJSONObject("properties"));
            Reply started = json("POST", UPLOAD + "?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,size,md5Checksum,webViewLink,appProperties", metadata);
            success(started); session = started.location; validateSession(session);
        }
        checkpoint.put("session", session).put("confirmed", offset); store.itemState(id, item, checkpoint);
        do {
            check.run(); long end = Math.min(total, offset + CHUNK);
            Reply reply = request("PUT", session, asset.optString("type", "application/octet-stream"), null, source, offset, end - offset,
                total == 0 ? "bytes */0" : "bytes " + offset + "-" + (end - 1) + "/" + total, null);
            if (reply.status == 200 || reply.status == 201) {
                JSONObject result = reply.json(); validateResult(result, asset);
                store.itemState(id, item, checkpoint.put("confirmed", total).put("result", result)); return result;
            }
            if (reply.status == 404 || reply.status == 410) {
                checkpoint.remove("session"); checkpoint.put("confirmed", 0); store.itemState(id, item, checkpoint);
                throw new java.io.IOException("The Drive upload session expired; retry using the same file identifier.");
            }
            if (reply.status != 308) throw new RemoteError(reply.status);
            long next = confirmed(reply.range, total);
            if (next <= offset) throw new java.io.IOException("Drive has not confirmed additional upload bytes; the checkpoint was retained.");
            offset = next; checkpoint.put("confirmed", offset); store.itemState(id, item, checkpoint);
        } while (offset < total);
        throw new java.io.IOException("Drive has not returned the final uploaded file record.");
    }
    private static void validateResult(JSONObject result, JSONObject asset) throws Exception {
        TransferStore.fileId(result.optString("id"));
        TransferStore.require(result.optLong("size", -1) == asset.getLong("size") && asset.getString("md5").equalsIgnoreCase(result.optString("md5Checksum")), "Drive has not confirmed the original file size and checksum.");
    }
    static long confirmed(String range, long total) {
        if (range == null || range.isEmpty()) return 0;
        java.util.regex.Matcher match = java.util.regex.Pattern.compile("bytes\\s*=\\s*0-([0-9]+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(range.trim());
        TransferStore.require(match.matches(), "Drive returned an invalid confirmed byte range.");
        long end = Long.parseLong(match.group(1));
        TransferStore.require(end >= 0 && end < total, "Drive confirmed an impossible byte range."); return end + 1;
    }
    private static void validateSession(String value) throws Exception {
        URL url = new URL(value);
        TransferStore.require("https".equals(url.getProtocol()) && "www.googleapis.com".equals(url.getHost()) && url.getPath().startsWith("/upload/drive/v3/files"), "Google returned an unexpected resumable upload address.");
    }
    static String encode(String value) throws Exception { return URLEncoder.encode(value, "UTF-8"); }
    private static String escape(String value) { return value.replace("\\", "\\\\").replace("'", "\\'"); }
}
