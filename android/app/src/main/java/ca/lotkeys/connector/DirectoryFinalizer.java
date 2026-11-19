package ca.lotkeys.connector;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/** Browser-independent Info Sheet rendering. Only this job's temporary document is trashed. */
final class DirectoryFinalizer {
    private static final String FILES = "https://www.googleapis.com/drive/v3/files/";
    private final DriveUploadClient client;
    private final DriveUploadClient.Check check;
    DirectoryFinalizer(DriveUploadClient client, DriveUploadClient.Check check) { this.client = client; this.check = check; }

    static void validate(JSONObject plan) throws Exception {
        JSONArray operations = plan.getJSONArray("finalizers");
        TransferStore.require(operations.length() == 2 && "vehicle-directory".equals(operations.getJSONObject(0).optString("type")) && "vehicle-cover".equals(operations.getJSONObject(1).optString("type")), "Invalid background finishing plan.");
        JSONObject op = operations.getJSONObject(0), cover = operations.getJSONObject(1);
        for (String key : new String[]{"templateId", "profileId", "sharedId", "pdfId"}) TransferStore.fileId(op.optString(key));
        TransferStore.fileId(cover.optString("sheetId")); TransferStore.fileId(cover.optString("indexId"));
        TransferStore.require(!cover.optString("sheetUpdated").isEmpty() && !op.optString("fingerprint").isEmpty(), "Missing finishing revision.");
        TransferStore.require(String.valueOf(cover.getLong("recordUpdated")).equals(plan.getJSONObject("context").getString("revision")), "Finishing revision does not match this save.");
        JSONObject values = op.getJSONObject("values"); TransferStore.require(values.length() <= 20, "Too many Info Sheet fields.");
        Iterator<String> keys = values.keys(); while (keys.hasNext()) { String key = keys.next(); TransferStore.require(key.matches("\\{\\{[A-Z_]+\\}\\}") && values.getString(key).length() <= 12000, "Invalid Info Sheet field."); }
        JSONArray links = op.getJSONArray("links"); TransferStore.require(links.length() <= 10, "Too many Info Sheet links.");
        for (int i = 0; i < links.length(); i++) { JSONArray pair = links.getJSONArray(i); String url = pair.optString(1); TransferStore.require(pair.length() == 2 && pair.getString(0).length() <= 100 && (url.isEmpty() || url.matches("https?://[^\\s]+")), "Invalid Info Sheet link."); }
        JSONArray badges = op.getJSONArray("badges"); TransferStore.require(badges.length() <= 3, "Too many Info Sheet badges.");
        for (int i = 0; i < badges.length(); i++) {
            JSONObject badge = badges.getJSONObject(i); String uri = badge.getString("uri");
            TransferStore.require(uri.matches("https://mrmilo34\\.github\\.io/Lot-Keys(?:-TEST)?/assets/carfax-(?:one-owner|low-kilometres|no-reported-accidents)\\.png") || uri.matches("https://(?:www\\.)?lot-keys\\.ca/assets/carfax-(?:one-owner|low-kilometres|no-reported-accidents)\\.png"), "Unexpected badge source.");
            TransferStore.require(badge.getString("token").matches("\\{\\{BADGE_[A-Z_]+\\}\\}") && badge.getInt("width") == 90 && badge.getInt("height") >= 40 && badge.getInt("height") <= 56, "Invalid badge placement.");
        }
    }
    private DriveUploadClient.Reply call(String method, String url, JSONObject body) throws Exception {
        check.run(); return client.request(method, url, "application/json; charset=utf-8", body == null ? null : body.toString().getBytes(StandardCharsets.UTF_8), null, 0, 0, null, null);
    }
    private JSONObject json(String method, String url, JSONObject body) throws Exception { DriveUploadClient.Reply reply = call(method, url, body); DriveUploadClient.success(reply); return reply.json(); }
    private static boolean parent(JSONObject file, String id) { JSONArray parents = file.optJSONArray("parents"); for (int i = 0; parents != null && i < parents.length(); i++) if (id.equals(parents.optString(i))) return true; return false; }
    static void guard(DriveUploadClient client, DriveUploadClient.Check check, JSONObject batch, JSONObject cover) throws Exception {
        check.run(); String sheet = cover.getString("sheetId"); TransferStore.fileId(sheet);
        DriveUploadClient.Reply reply = client.request("GET", "https://sheets.googleapis.com/v4/spreadsheets/" + sheet + "/values/A1:B100", null, null, null, 0, 0, null, null);
        DriveUploadClient.success(reply); JSONArray rows = reply.json().getJSONArray("values"); String record = "", updated = "";
        for (int i = 0; i < rows.length(); i++) { JSONArray row = rows.getJSONArray(i); if ("Profile ID".equals(row.optString(0))) record = row.optString(1); if ("Updated".equals(row.optString(0))) updated = row.optString(1); }
        if (!batch.getJSONObject("context").getString("record").equals(record) || !cover.getString("sheetUpdated").equals(updated)) throw new TransferFinalizer.Reconcile("Files are retained. A newer Vehicle edit needs review before its Info Sheet is changed.");
    }
    private interface TextVisitor { void visit(String text, int start) throws Exception; }
    private static void walk(JSONArray elements, TextVisitor visitor) throws Exception {
        for (int i = 0; elements != null && i < elements.length(); i++) {
            JSONObject element = elements.getJSONObject(i), paragraph = element.optJSONObject("paragraph"), table = element.optJSONObject("table"), toc = element.optJSONObject("tableOfContents");
            if (paragraph != null) { JSONArray runs = paragraph.optJSONArray("elements"); for (int j = 0; runs != null && j < runs.length(); j++) { JSONObject run = runs.getJSONObject(j), text = run.optJSONObject("textRun"); if (text != null) visitor.visit(text.optString("content"), run.getInt("startIndex")); } }
            if (table != null) { JSONArray rows = table.optJSONArray("tableRows"); for (int j = 0; rows != null && j < rows.length(); j++) { JSONArray cells = rows.getJSONObject(j).optJSONArray("tableCells"); for (int k = 0; cells != null && k < cells.length(); k++) walk(cells.getJSONObject(k).optJSONArray("content"), visitor); } }
            if (toc != null) walk(toc.optJSONArray("content"), visitor);
        }
    }
    static JSONArray linkRequests(JSONObject doc, JSONArray links) throws Exception {
        JSONArray requests = new JSONArray(); JSONObject body = doc.optJSONObject("body");
        walk(body == null ? null : body.optJSONArray("content"), (text, start) -> {
            for (int i = 0; i < links.length(); i++) { JSONArray pair = links.getJSONArray(i); String label = pair.getString(0), url = pair.optString(1); if (label.isEmpty() || url.isEmpty()) continue;
                int at = 0; while ((at = text.indexOf(label, at)) >= 0) { JSONObject range = new JSONObject().put("startIndex", start + at).put("endIndex", start + at + label.length());
                    JSONObject style = new JSONObject().put("link", new JSONObject().put("url", url)).put("foregroundColor", new JSONObject().put("color", new JSONObject().put("rgbColor", new JSONObject().put("blue", .65).put("green", .25).put("red", .05)))).put("underline", true);
                    requests.put(new JSONObject().put("updateTextStyle", new JSONObject().put("range", range).put("textStyle", style).put("fields", "link,foregroundColor,underline"))); at += label.length(); }
            }
        }); return requests;
    }
    static JSONArray badgeRequests(JSONObject doc, JSONArray badges) throws Exception {
        List<JSONObject> hits = new ArrayList<>(); JSONObject body = doc.optJSONObject("body");
        walk(body == null ? null : body.optJSONArray("content"), (text, start) -> { for (int i = 0; i < badges.length(); i++) { JSONObject badge = badges.getJSONObject(i); if (!badge.optBoolean("enabled")) continue; String token = badge.getString("token"); int at = 0; while ((at = text.indexOf(token, at)) >= 0) { hits.add(new JSONObject().put("start", start + at).put("end", start + at + token.length()).put("badge", badge)); at += token.length(); } } });
        hits.sort((a, b) -> Integer.compare(b.optInt("start"), a.optInt("start"))); JSONArray requests = new JSONArray();
        for (JSONObject hit : hits) { JSONObject badge = hit.getJSONObject("badge"); int start = hit.getInt("start"); requests.put(new JSONObject().put("deleteContentRange", new JSONObject().put("range", new JSONObject().put("startIndex", start).put("endIndex", hit.getInt("end")))));
            requests.put(new JSONObject().put("insertInlineImage", new JSONObject().put("location", new JSONObject().put("index", start)).put("uri", badge.getString("uri")).put("objectSize", new JSONObject().put("width", new JSONObject().put("magnitude", badge.getInt("width")).put("unit", "PT")).put("height", new JSONObject().put("magnitude", badge.getInt("height")).put("unit", "PT"))))); }
        return requests;
    }
    private void updateDoc(String id, JSONArray requests) throws Exception { if (requests.length() > 0) json("POST", "https://docs.googleapis.com/v1/documents/" + id + ":batchUpdate", new JSONObject().put("requests", requests)); }
    static String md5(byte[] bytes) throws Exception { StringBuilder result = new StringBuilder(); for (byte b : MessageDigest.getInstance("MD5").digest(bytes)) result.append(String.format(java.util.Locale.ROOT, "%02x", b & 255)); return result.toString(); }
    private JSONObject pdf(String id) throws Exception { return json("GET", FILES + id + "?supportsAllDrives=true&fields=id,name,mimeType,parents,trashed,size,md5Checksum,appProperties", null); }
    private void validatePdf(JSONObject file, JSONObject op, String record) throws Exception {
        TransferStore.require(!file.optBoolean("trashed") && "application/pdf".equals(file.optString("mimeType")) && parent(file, op.getString("sharedId")), "The Info Sheet moved outside its Vehicle folder.");
        JSONObject properties = file.optJSONObject("appProperties"); String owner = properties == null ? "" : properties.optString("lotkeysVehicleId"); TransferStore.require(owner.isEmpty() || owner.equals(record), "The Info Sheet belongs to another Vehicle.");
    }
    private String temporary(TransferStore store, JSONObject batch, JSONObject op, JSONObject state) throws Exception {
        String id = state.optString("tempId"); if (!id.isEmpty()) { TransferStore.fileId(id); DriveUploadClient.Reply known = call("GET", FILES + id + "?fields=id,trashed,parents,appProperties", null); if (known.status == 200 && !known.json().optBoolean("trashed")) { JSONObject file = known.json(), properties = file.optJSONObject("appProperties"); TransferStore.require(parent(file, op.getString("profileId")) && properties != null && batch.getString("id").equals(properties.optString("lotkeysTransferId")), "The temporary Info Sheet changed ownership."); return id; } if (known.status != 404 && known.status != 200) DriveUploadClient.success(known); }
        String query = "'" + op.getString("profileId") + "' in parents and trashed = false and appProperties has { key='lotkeysTransferId' and value='" + batch.getString("id") + "' }";
        JSONArray existing = json("GET", "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&includeItemsFromAllDrives=true&q=" + DriveUploadClient.encode(query) + "&fields=files(id)&pageSize=100", null).optJSONArray("files");
        if (existing != null && existing.length() > 0) id = existing.getJSONObject(0).getString("id");
        else { JSONObject props = new JSONObject().put("lotkeysRole", "vehicleDirectoryTemp").put("lotkeysVehicleId", batch.getJSONObject("context").getString("record")).put("lotkeysTransferId", batch.getString("id"));
            id = json("POST", FILES + op.getString("templateId") + "/copy?supportsAllDrives=true&fields=id", new JSONObject().put("name", "LotKeys Temp - " + batch.getJSONObject("context").getString("record")).put("parents", new JSONArray().put(op.getString("profileId"))).put("appProperties", props)).getString("id"); }
        TransferStore.fileId(id); state.put("tempId", id); store.directoryState(batch.getString("id"), state); return id;
    }
    void finish(TransferStore store, JSONObject batch, JSONObject op, JSONObject cover) throws Exception {
        guard(client, check, batch, cover); String job = batch.getString("id"), record = batch.getJSONObject("context").getString("record"), pdfId = op.getString("pdfId");
        JSONObject sheet = json("GET", FILES + cover.getString("sheetId") + "?fields=parents", null), shared = json("GET", FILES + op.getString("sharedId") + "?fields=parents", null);
        TransferStore.require(parent(sheet, op.getString("profileId")) && parent(shared, op.getString("profileId")), "The finishing folders do not belong to this Vehicle.");
        JSONObject profile = json("GET", FILES + op.getString("profileId") + "?fields=parents", null); String inventory = profile.getJSONArray("parents").getString(0); TransferStore.fileId(inventory);
        TransferStore.require(parent(json("GET", FILES + inventory + "?fields=parents", null), batch.getJSONObject("context").getString("store")), "The Vehicle folder belongs to another Store.");
        JSONObject state = store.directoryState(job), remote; DriveUploadClient.Reply known = call("GET", FILES + pdfId + "?supportsAllDrives=true&fields=id,name,mimeType,parents,trashed,size,md5Checksum,appProperties", null);
        if (known.status == 404) {
            guard(client, check, batch, cover); JSONObject metadata = new JSONObject().put("id", pdfId).put("name", "Vehicle Info Directory.pdf").put("mimeType", "application/pdf").put("parents", new JSONArray().put(op.getString("sharedId"))).put("appProperties", new JSONObject().put("lotkeysRole", "vehicleInfoDirectoryPdf").put("lotkeysVehicleId", record));
            DriveUploadClient.Reply created = call("POST", "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id", metadata); if (created.status != 409) DriveUploadClient.success(created); remote = pdf(pdfId);
        } else { DriveUploadClient.success(known); remote = known.json(); }
        validatePdf(remote, op, record);
        if (!state.has("etag")) { String etag = json("GET", "https://www.googleapis.com/drive/v2/files/" + pdfId + "?fields=id,etag&supportsAllDrives=true", null).optString("etag"); if (etag.isEmpty()) throw new TransferFinalizer.Reconcile("The Info Sheet cannot be updated safely without its Drive revision."); state.put("etag", etag); store.directoryState(job, state); }
        File local = store.operationFile(job, "directory.pdf");
        boolean rendered = local.isFile() && local.length() == state.optLong("size", -1) && md5(Files.readAllBytes(local.toPath())).equals(state.optString("md5"));
        if (!rendered) {
            store.stage(job, "directory"); String temp = temporary(store, batch, op, state); JSONArray replace = new JSONArray(); JSONObject values = op.getJSONObject("values"); Iterator<String> keys = values.keys();
            while (keys.hasNext()) { String token = keys.next(); replace.put(new JSONObject().put("replaceAllText", new JSONObject().put("containsText", new JSONObject().put("text", token).put("matchCase", true)).put("replaceText", values.getString(token)))); }
            JSONArray badges = op.getJSONArray("badges"); for (int i = 0; i < badges.length(); i++) if (!badges.getJSONObject(i).optBoolean("enabled")) replace.put(new JSONObject().put("replaceAllText", new JSONObject().put("containsText", new JSONObject().put("text", badges.getJSONObject(i).getString("token")).put("matchCase", true)).put("replaceText", "")));
            guard(client, check, batch, cover); updateDoc(temp, replace);
            JSONObject doc = json("GET", "https://docs.googleapis.com/v1/documents/" + temp, null); updateDoc(temp, linkRequests(doc, op.getJSONArray("links"))); updateDoc(temp, badgeRequests(doc, badges));
            DriveUploadClient.Reply export = call("GET", FILES + temp + "/export?mimeType=application%2Fpdf", null); DriveUploadClient.success(export);
            TransferStore.require(export.body.length > 5 && new String(export.body, 0, 5, StandardCharsets.US_ASCII).equals("%PDF-"), "Google did not return a complete PDF.");
            store.directoryPdf(job, export.body); state.put("size", export.body.length).put("md5", md5(export.body)); store.directoryState(job, state);
        }
        guard(client, check, batch, cover); remote = pdf(pdfId); validatePdf(remote, op, record);
        if (remote.optLong("size", -1) != state.getLong("size") || !state.getString("md5").equalsIgnoreCase(remote.optString("md5Checksum"))) {
            String etag = json("GET", "https://www.googleapis.com/drive/v2/files/" + pdfId + "?fields=id,etag&supportsAllDrives=true", null).optString("etag");
            if (!state.getString("etag").equals(etag)) throw new TransferFinalizer.Reconcile("The Info Sheet was changed elsewhere. Its newer PDF has been preserved.");
            check.run(); DriveUploadClient.Reply uploaded = client.request("PUT", "https://www.googleapis.com/upload/drive/v2/files/" + pdfId + "?uploadType=media&supportsAllDrives=true", "application/pdf", null, local, 0, local.length(), null, etag);
            if (uploaded.status == 412) throw new TransferFinalizer.Reconcile("A newer Info Sheet won the conditional update. Reopen the Profile to review it."); DriveUploadClient.success(uploaded); remote = pdf(pdfId);
            TransferStore.require(remote.optLong("size", -1) == state.getLong("size") && state.getString("md5").equalsIgnoreCase(remote.optString("md5Checksum")), "Drive has not confirmed the finished Info Sheet.");
        }
        String warning = ""; boolean publicReady = false;
        if (op.optBoolean("makePublic")) try { guard(client, check, batch, cover); JSONArray permissions = json("GET", FILES + op.getString("sharedId") + "/permissions?supportsAllDrives=true&fields=permissions(id,type,role)", null).optJSONArray("permissions");
            for (int i = 0; permissions != null && i < permissions.length(); i++) if ("anyone".equals(permissions.getJSONObject(i).optString("type")) && "reader".equals(permissions.getJSONObject(i).optString("role"))) publicReady = true;
            if (!publicReady) { json("POST", FILES + op.getString("sharedId") + "/permissions?supportsAllDrives=true", new JSONObject().put("type", "anyone").put("role", "reader")); publicReady = true; }
        } catch (TransferFinalizer.Reconcile changed) { throw changed; } catch (java.util.concurrent.CancellationException cancelled) { throw cancelled; } catch (Exception error) { warning = "Public link sharing needs review: " + error.getMessage(); }
        store.directoryResult(job, new JSONObject().put("id", pdfId).put("fingerprint", op.getString("fingerprint")).put("size", state.getLong("size")).put("md5", state.getString("md5")).put("publicShareReady", publicReady).put("warning", warning));
        String temp = state.optString("tempId"); if (!temp.isEmpty()) try { JSONObject file = json("GET", FILES + temp + "?fields=parents,appProperties", null), props = file.optJSONObject("appProperties"); if (parent(file, op.getString("profileId")) && props != null && job.equals(props.optString("lotkeysTransferId"))) json("PATCH", FILES + temp, new JSONObject().put("trashed", true)); } catch (Exception ignored) { /* A job-owned temp can be retried/removed later; original media is never trashed here. */ }
    }
}
