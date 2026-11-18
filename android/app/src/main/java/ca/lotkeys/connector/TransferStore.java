package ca.lotkeys.connector;

import android.content.Context;
import android.os.StatFs;
import android.util.AtomicFile;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

/** App-private source copies and atomic checkpoints; no Google access tokens are stored. */
final class TransferStore {
    private static final Object LOCK = new Object();
    static final int MAX_CHUNK = 1024 * 1024;
    private static final long MAX_BATCH = 4L * 1024 * 1024 * 1024;
    private final File root;

    TransferStore(Context context) {
        root = new File(context.getFilesDir(), "transfers");
        if (!root.isDirectory() && !root.mkdirs()) throw new IllegalStateException("Upload storage is unavailable.");
    }

    JSONObject prepare(JSONObject input) throws Exception {
        synchronized (LOCK) {
            JSONObject scope = input.getJSONObject("context");
            require(input.optInt("version", 1) == 1 || input.optInt("version") == 2, "Update the connector before preparing this save.");
            if (input.optInt("version") == 2) DirectoryFinalizer.validate(input);
            else { JSONArray operations = input.optJSONArray("finalizers"); for (int i = 0; operations != null && i < operations.length(); i++) require(!"vehicle-directory".equals(operations.getJSONObject(i).optString("type")), "This finishing plan requires protocol version 2."); }
            require(input.toString().length() <= 1024 * 1024, "Upload plan is too large.");
            require(!scope.optString("account").trim().isEmpty(), "An upload account is required.");
            fileId(scope.optString("store"));
            require(!scope.optString("record").isEmpty() && scope.optString("record").length() <= 200, "An upload record is required.");
            require(!scope.optString("revision").isEmpty() && scope.optString("revision").length() <= 200, "An upload edit is required.");
            String id = digest(input.getString("key"));
            String planHash = digest(input.toString());
            File manifest = manifest(id);
            if (manifest.exists()) {
                JSONObject previous = read(manifest);
                require(planHash.equals(previous.optString("planHash")), "This edit already has a different upload plan.");
                if ("cancelled".equals(previous.optString("state"))) throw new IllegalArgumentException("This upload was cancelled. Save a new edit to upload again.");
                previous.put("held", false);
                if ("paused_context".equals(previous.optString("state"))) previous.put("state", "queued");
                save(previous);
                return snapshot(previous);
            }
            JSONArray assets = input.getJSONArray("assets");
            require(assets.length() <= 500, "Choose fewer than 501 files per save.");
            long total = 0;
            java.util.HashSet<String> keys = new java.util.HashSet<>();
            for (int i = 0; i < assets.length(); i++) {
                JSONObject asset = assets.getJSONObject(i);
                String key = asset.optString("key");
                require(!key.isEmpty() && key.length() <= 200 && keys.add(key), "Upload file identifiers must be unique.");
                fileId(asset.optString("parent"));
                if (!asset.optString("driveId").isEmpty()) fileId(asset.getString("driveId"));
                require(!asset.optString("name").isEmpty() && asset.optString("name").length() <= 240, "Invalid upload name.");
                long size = asset.getLong("size");
                require(size >= 0 && size <= MAX_BATCH && total <= MAX_BATCH - size, "This upload exceeds the available batch limit.");
                total += size;
                if (asset.optJSONObject("properties") == null) asset.put("properties", new JSONObject());
                asset.put("staged", 0).put("confirmed", 0);
            }
            require(new StatFs(root.getAbsolutePath()).getAvailableBytes() > total + 32L * 1024 * 1024, "There is not enough phone storage to retain the original files for background upload.");
            for (JSONObject previous : all()) {
                JSONObject old = previous.getJSONObject("context");
                if (scope.optString("account").equalsIgnoreCase(old.optString("account")) && scope.optString("store").equals(old.optString("store")) && scope.optString("record").equals(old.optString("record")) && !"complete".equals(previous.optString("state")) && !"cancelled".equals(previous.optString("state"))) {
                    previous.put("held", true); save(previous);
                }
            }
            File directory = directory(id);
            require(directory.mkdirs() || directory.isDirectory(), "Upload storage could not be created.");
            JSONObject batch = new JSONObject(input.toString()).put("id", id).put("planHash", planHash)
                .put("state", "staging").put("held", false).put("createdAt", System.currentTimeMillis()).put("updatedAt", System.currentTimeMillis());
            write(manifest, batch);
            return snapshot(batch);
        }
    }

    JSONObject append(String id, int item, long offset, String encoded) throws Exception {
        require(encoded.length() <= (MAX_CHUNK * 4 / 3) + 8, "Upload staging chunk is too large.");
        byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
        require(bytes.length <= MAX_CHUNK, "Upload staging chunk is too large.");
        synchronized (LOCK) {
            JSONObject batch = get(id);
            require("staging".equals(batch.optString("state")), "This upload no longer accepts source bytes.");
            JSONObject asset = asset(batch, item);
            File source = source(id, item);
            long length = source.exists() ? source.length() : 0;
            require(offset >= 0 && offset <= asset.getLong("size") && bytes.length <= asset.getLong("size") - offset, "Upload bytes do not fit the original file.");
            try (RandomAccessFile output = new RandomAccessFile(source, "rw")) {
                if (offset < length) {
                    require(offset + bytes.length <= length, "Resume the source handoff from its confirmed offset.");
                    byte[] existing = new byte[bytes.length];
                    output.seek(offset); output.readFully(existing);
                    require(MessageDigest.isEqual(existing, bytes), "An upload chunk changed during retry.");
                } else {
                    require(offset == length, "Resume the source handoff from its confirmed offset.");
                    output.seek(offset); output.write(bytes); output.getFD().sync();
                }
            }
            return new JSONObject().put("staged", source.length());
        }
    }

    JSONObject commit(String id) throws Exception {
        synchronized (LOCK) {
            JSONObject batch = get(id);
            if (!"staging".equals(batch.optString("state"))) return snapshot(batch);
            JSONArray assets = batch.getJSONArray("assets");
            for (int i = 0; i < assets.length(); i++) {
                JSONObject asset = assets.getJSONObject(i);
                File file = source(id, i);
                require((file.exists() ? file.length() : 0) == asset.getLong("size"), "Keep LotKeys open until every original file has been handed to Android.");
                if (!file.exists()) require(file.createNewFile(), "The empty source file could not be retained.");
                MessageDigest hash = MessageDigest.getInstance("MD5");
                try (java.io.FileInputStream in = new java.io.FileInputStream(file)) {
                    byte[] buffer = new byte[65536]; int count; while ((count = in.read(buffer)) != -1) hash.update(buffer, 0, count);
                }
                StringBuilder checksum = new StringBuilder(); for (byte b : hash.digest()) checksum.append(String.format(java.util.Locale.ROOT, "%02x", b & 255));
                asset.put("md5", checksum.toString());
            }
            batch.put("state", "queued"); save(batch);
            return snapshot(batch);
        }
    }

    JSONObject get(String id) throws Exception { synchronized (LOCK) { return read(manifest(id)); } }
    void save(JSONObject batch) throws Exception { synchronized (LOCK) { batch.put("updatedAt", System.currentTimeMillis()); write(manifest(batch.getString("id")), batch); } }
    JSONObject state(String id, String value, String error) throws Exception {
        synchronized (LOCK) {
            JSONObject batch = get(id);
            if (!terminal(batch.optString("state"))) batch.put("state", value).put("error", error == null ? "" : error);
            save(batch); return snapshot(batch);
        }
    }
    void itemState(String id, int item, JSONObject state) throws Exception { synchronized (LOCK) { asset(get(id), item); write(new File(directory(id), item + ".json"), state); } }
    JSONObject itemState(String id, int item) throws Exception { synchronized (LOCK) { asset(get(id), item); File file = new File(directory(id), item + ".json"); return file.exists() ? read(file) : new JSONObject().put("confirmed", 0); } }
    JSONObject cancel(String id) throws Exception { synchronized (LOCK) { JSONObject batch = get(id).put("state", "cancelled"); save(batch); return snapshot(batch); } }
    JSONObject acknowledge(String id) throws Exception { synchronized (LOCK) {
        JSONObject batch = get(id);
        require("needs_reconcile".equals(batch.optString("state")) || "complete".equals(batch.optString("state")), "This save is not ready for foreground reconciliation.");
        for (int i = 0; i < batch.getJSONArray("assets").length(); i++) fileId(itemState(id, i).getJSONObject("result").getString("id"));
        batch.put("state", "complete").put("error", ""); save(batch); releaseOriginals(id); return snapshot(batch);
    } }
    void releaseOriginals(String id) throws Exception { synchronized (LOCK) {
        JSONObject batch = get(id); require("complete".equals(batch.optString("state")), "Keep originals until the entire save is confirmed.");
        for (int i = 0; i < batch.getJSONArray("assets").length(); i++) source(id, i).delete();
        operationFile(id, "directory.pdf").delete();
    } }
    File operationFile(String id, String name) { require(name.equals("directory.pdf") || name.equals("directory.json"), "Invalid save checkpoint."); return new File(directory(id), name); }
    JSONObject directoryState(String id) throws Exception { synchronized (LOCK) { get(id); File file = operationFile(id, "directory.json"); return file.exists() ? read(file) : new JSONObject(); } }
    void directoryState(String id, JSONObject state) throws Exception { synchronized (LOCK) { get(id); write(operationFile(id, "directory.json"), state); } }
    void directoryPdf(String id, byte[] bytes) throws Exception { synchronized (LOCK) {
        get(id); AtomicFile file = new AtomicFile(operationFile(id, "directory.pdf")); FileOutputStream out = null;
        try { out = file.startWrite(); out.write(bytes); file.finishWrite(out); } catch (Exception error) { if (out != null) file.failWrite(out); throw error; }
    } }
    void directoryResult(String id, JSONObject result) throws Exception { synchronized (LOCK) {
        JSONObject batch = get(id), results = batch.optJSONObject("finalizerResults"); if (results == null) results = new JSONObject();
        batch.put("finalizerResults", results.put("directory", result)); save(batch);
    } }
    void stage(String id, String stage) throws Exception { synchronized (LOCK) { JSONObject batch = get(id); batch.put("stage", stage); save(batch); } }
    void hold(String account, String store) throws Exception {
        synchronized (LOCK) {
            for (JSONObject batch : all()) {
                JSONObject scope = batch.getJSONObject("context");
                if (account.equalsIgnoreCase(scope.optString("account")) && store.equals(scope.optString("store")) && !"complete".equals(batch.optString("state")) && !"cancelled".equals(batch.optString("state"))) {
                    batch.put("held", true); save(batch);
                }
            }
        }
    }
    void retryFailed(String account) throws Exception { synchronized (LOCK) {
        for (JSONObject batch : all()) if ("failed".equals(batch.optString("state")) && !batch.optBoolean("held") && account.equalsIgnoreCase(batch.getJSONObject("context").optString("account"))) {
            batch.put("state", "queued").put("error", ""); save(batch);
        }
    } }
    List<JSONObject> pending() throws Exception {
        List<JSONObject> rows = new ArrayList<>();
        synchronized (LOCK) {
            for (JSONObject batch : all()) if (!terminal(batch.optString("state")) && !"staging".equals(batch.optString("state")) && !batch.optBoolean("held")) rows.add(batch);
        }
        rows.sort((a,b) -> Long.compare(a.optLong("createdAt"), b.optLong("createdAt")));
        return rows;
    }
    private List<JSONObject> all() throws Exception {
        List<JSONObject> rows = new ArrayList<>();
        File[] directories = root.listFiles();
        if (directories != null) for (File dir : directories) if (dir.isDirectory() && new File(dir, "batch.json").exists()) rows.add(read(new File(dir, "batch.json")));
        return rows;
    }
    JSONObject snapshot(JSONObject batch) throws Exception {
        synchronized (LOCK) {
            JSONObject copy = new JSONObject(batch.toString());
            JSONArray assets = copy.getJSONArray("assets");
            for (int i = 0; i < assets.length(); i++) {
                JSONObject asset = assets.getJSONObject(i), state = itemState(batch.getString("id"), i);
                asset.put("staged", source(batch.getString("id"), i).length()).put("confirmed", state.optLong("confirmed"));
                if (state.has("result")) asset.put("result", state.getJSONObject("result"));
            }
            return copy;
        }
    }
    File source(String id, int item) { require(item >= 0 && item < 500, "Invalid upload file index."); return new File(directory(id), item + ".source"); }
    private File directory(String id) { require(id.matches("[a-f0-9]{64}"), "Invalid upload identifier."); return new File(root, id); }
    private File manifest(String id) { return new File(directory(id), "batch.json"); }
    private static JSONObject asset(JSONObject batch, int item) throws Exception { require(item >= 0 && item < batch.getJSONArray("assets").length(), "Invalid upload file index."); return batch.getJSONArray("assets").getJSONObject(item); }
    static boolean terminal(String value) { return "complete".equals(value) || "cancelled".equals(value) || "failed".equals(value) || "needs_reconcile".equals(value); }
    static void fileId(String value) { require(value.matches("[A-Za-z0-9_-]{8,200}"), "Invalid Google Drive identifier."); }
    static void require(boolean value, String message) { if (!value) throw new IllegalArgumentException(message); }
    static String digest(String value) throws Exception { byte[] bytes = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)); StringBuilder out = new StringBuilder(); for (byte b : bytes) out.append(String.format(java.util.Locale.ROOT, "%02x", b & 255)); return out.toString(); }
    private static JSONObject read(File path) throws Exception {
        try (java.io.FileInputStream in = new AtomicFile(path).openRead(); java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192]; int count;
            while ((count = in.read(buffer)) != -1) { require(out.size() + count <= 8 * 1024 * 1024, "Upload checkpoint is too large."); out.write(buffer, 0, count); }
            return new JSONObject(new String(out.toByteArray(), StandardCharsets.UTF_8));
        }
    }
    private static void write(File path, JSONObject value) throws Exception {
        AtomicFile file = new AtomicFile(path); FileOutputStream out = null;
        try { out = file.startWrite(); out.write(value.toString().getBytes(StandardCharsets.UTF_8)); file.finishWrite(out); }
        catch (Exception error) { if (out != null) file.failWrite(out); throw error; }
    }
}
