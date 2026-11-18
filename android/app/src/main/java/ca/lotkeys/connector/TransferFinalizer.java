package ca.lotkeys.connector;

import org.json.JSONArray;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;

/** Finalizes only the explicitly queued profile; unrelated rows and newer edits are retained. */
final class TransferFinalizer {
    private final DriveUploadClient client;
    private final DriveUploadClient.Check check;
    TransferFinalizer(DriveUploadClient client, DriveUploadClient.Check check) { this.client = client; this.check = check; }
    static final class Reconcile extends Exception { Reconcile(String text) { super(text); } }
    private DriveUploadClient.Reply json(String method, String url, JSONObject body, String etag) throws Exception {
        check.run();
        DriveUploadClient.Reply reply = client.request(method, url, "application/json; charset=utf-8", body == null ? null : body.toString().getBytes(StandardCharsets.UTF_8), null, 0, 0, null, etag);
        DriveUploadClient.success(reply); return reply;
    }
    private String cover(TransferStore store, JSONObject batch, JSONObject operation) throws Exception {
        String key = operation.optString("assetKey");
        if (key.isEmpty()) return operation.optString("coverId");
        JSONArray assets = batch.getJSONArray("assets");
        for (int i = 0; i < assets.length(); i++) if (key.equals(assets.getJSONObject(i).optString("key"))) return store.itemState(batch.getString("id"), i).getJSONObject("result").getString("id");
        throw new IllegalArgumentException("The cover photo is missing from this save.");
    }
    void finish(TransferStore store, JSONObject batch) throws Exception {
        JSONArray operations = batch.optJSONArray("finalizers");
        if (operations == null) return;
        for (int i = 0; i < operations.length(); i++) {
            check.run(); JSONObject op = operations.getJSONObject(i); String type = op.getString("type");
            if ("vehicle-directory".equals(type)) { store.stage(batch.getString("id"), "directory"); new DirectoryFinalizer(client, check).finish(store, batch, op, operations.getJSONObject(i + 1)); }
            else if ("vehicle-cover".equals(type)) { store.stage(batch.getString("id"), "inventory"); finishCover(store, batch, op); }
            else if ("rename".equals(type)) {
                String id = op.getString("id"); TransferStore.fileId(id);
                json("PATCH", "https://www.googleapis.com/drive/v3/files/" + id + "?supportsAllDrives=true", new JSONObject().put("name", op.getString("name")), null);
            } else throw new IllegalArgumentException("Unsupported upload finalization.");
        }
        // Deletions remain a browser reconciliation step. A delayed job must never delete
        // an asset added by a newer save on another device.
    }
    private void finishCover(TransferStore store, JSONObject batch, JSONObject op) throws Exception {
        String record = batch.getJSONObject("context").getString("record");
        String cover = cover(store, batch, op); if (!cover.isEmpty()) TransferStore.fileId(cover);
        String sheet = op.getString("sheetId"); TransferStore.fileId(sheet);
        String url = "https://sheets.googleapis.com/v4/spreadsheets/" + sheet + "/values/";
        JSONArray rows = json("GET", url + "A1:B100", null, null).json().getJSONArray("values");
        int coverRow = 0; String currentRecord = "", updated = "";
        for (int j = 0; j < rows.length(); j++) {
            JSONArray row = rows.getJSONArray(j); String name = row.optString(0), value = row.optString(1);
            if ("Profile ID".equals(name)) currentRecord = value;
            if ("Updated".equals(name)) updated = value;
            if ("Cover Photo File ID".equals(name)) coverRow = j + 1;
        }
        if (!record.equals(currentRecord) || !op.getString("sheetUpdated").equals(updated) || coverRow == 0)
            throw new Reconcile("Files are saved. The profile was edited elsewhere; reopen LotKeys to reconcile its cover photo.");
        // Sheets values has no compare-and-swap revision API. Do not let a delayed
        // worker overwrite a newer sheet between the check and a write. The core
        // profile was saved before handoff; its cover cell is refreshed by the next
        // foreground sync. Only the Drive index below uses a conditional update.
        String index = op.optString("indexId"); if (index.isEmpty()) throw new Reconcile("Files are saved. Reopen LotKeys to refresh the Inventory preview.");
        TransferStore.fileId(index);
        for (int attempt = 0; attempt < 3; attempt++) {
            String endpoint = "https://www.googleapis.com/drive/v3/files/" + index;
            // Drive v3 removed the File.etag resource field. Use the documented v2
            // file ETag and v2 conditional update for this one shared JSON write;
            // do not assume a v3 media response's ETag is a supported write lock.
            String conditional = "https://www.googleapis.com/drive/v2/files/" + index;
            String etag = json("GET", conditional + "?fields=id,etag&supportsAllDrives=true", null, null).json().optString("etag");
            if (etag.isEmpty()) throw new Reconcile("Files are saved. Reopen LotKeys to refresh the Inventory preview safely.");
            DriveUploadClient.Reply reply = json("GET", endpoint + "?alt=media&supportsAllDrives=true", null, null);
            String after = json("GET", conditional + "?fields=id,etag&supportsAllDrives=true", null, null).json().optString("etag");
            if (!etag.equals(after)) continue;
            JSONObject data = reply.json(); JSONArray entries = data.getJSONArray("vehicles"); boolean found = false;
            for (int j = 0; j < entries.length(); j++) {
                JSONObject row = entries.getJSONObject(j);
                if (!record.equals(row.optString("id"))) continue;
                if (row.optLong("updatedAt") != op.getLong("recordUpdated")) throw new Reconcile("Files are saved. A newer Inventory edit needs reconciliation in LotKeys.");
                JSONObject drive = row.optJSONObject("drive"); if (drive == null) { drive = new JSONObject(); row.put("drive", drive); }
                drive.put("coverPhotoFileId", cover); found = true;
                JSONObject directory = store.get(batch.getString("id")).optJSONObject("finalizerResults"); directory = directory == null ? null : directory.optJSONObject("directory");
                if (directory != null) {
                    if (!directory.optString("id").equals(drive.optString("directoryPdfId"))) throw new Reconcile("The Info Sheet destination changed. Reopen the Vehicle to review it.");
                    drive.put("nativeFinalizationPending", false).put("lastDirectoryFingerprint", directory.getString("fingerprint")).put("publicShareReady", directory.optBoolean("publicShareReady"));
                    row.put("shareWarning", directory.optString("warning"));
                }
            }
            if (!found) throw new Reconcile("Files are saved. This profile is no longer in the Inventory index.");
            check.run(); DriveUploadClient.Reply write = client.request("PUT", "https://www.googleapis.com/upload/drive/v2/files/" + index + "?uploadType=media&supportsAllDrives=true", "application/json", data.toString().getBytes(StandardCharsets.UTF_8), null, 0, 0, null, etag);
            if (write.status == 412) continue;
            DriveUploadClient.success(write); return;
        }
        throw new Reconcile("Files are saved. The Inventory changed while finalizing; reopen LotKeys to reconcile.");
    }
}
