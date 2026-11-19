package ca.lotkeys.connector;

import android.content.Context;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import java.io.File;
import java.util.UUID;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class) @Config(sdk = {35, 36})
public class TransferRecoveryTest {
    private TransferStore store;
    @Before public void before() {
        Context context = RuntimeEnvironment.getApplication();
        org.robolectric.shadows.ShadowStatFs.registerStats(new File(context.getFilesDir(), "transfers").getAbsolutePath(), 1024 * 1024, 512 * 1024, 512 * 1024);
        store = new TransferStore(context);
    }
    private JSONObject plan(int size) throws Exception {
        return new JSONObject().put("key", UUID.randomUUID().toString())
            .put("context", new JSONObject().put("account", "User@example.test").put("store", "store-folder-123").put("record", "vehicle-123").put("revision", "1"))
            .put("assets", new JSONArray().put(new JSONObject().put("key", "photo-1").put("name", "original.jpg").put("type", "image/jpeg").put("parent", "photo-folder-123").put("size", size)
                .put("properties", new JSONObject().put("lotkeysAssetId", "photo-1"))))
            .put("finalizers", new JSONArray());
    }
    private JSONObject staged(int size) throws Exception {
        JSONObject prepared = store.prepare(plan(size)); String id = prepared.getString("id");
        byte[] bytes = new byte[size]; java.util.Arrays.fill(bytes, (byte)33);
        store.append(id, 0, 0, Base64.encodeToString(bytes, Base64.NO_WRAP)); store.commit(id); return store.get(id);
    }
    @Test public void originalHandoffIsIdempotentAndCannotCommitMissingBytes() throws Exception {
        JSONObject prepared = store.prepare(plan(4)); String id = prepared.getString("id");
        store.append(id, 0, 0, "AQI="); store.append(id, 0, 0, "AQI=");
        assertEquals(2, store.source(id, 0).length());
        assertThrows(IllegalArgumentException.class, () -> store.append(id, 0, 0, "AwQ="));
        assertThrows(IllegalArgumentException.class, () -> store.commit(id));
        store.append(id, 0, 2, "AwQ="); store.commit(id);
        // New store instance is equivalent to a new process reading its checkpoint.
        TransferStore recovered = new TransferStore(RuntimeEnvironment.getApplication());
        assertEquals("queued", recovered.get(id).getString("state"));
        assertEquals("08d6c05a21512a79a1dfeb9d2a8f262f", recovered.get(id).getJSONArray("assets").getJSONObject(0).getString("md5"));
    }
    @Test public void cancelledOrIncompleteWorkCannotDiscardOriginals() throws Exception {
        JSONObject batch = staged(8); String id = batch.getString("id");
        assertThrows(IllegalArgumentException.class, () -> store.releaseOriginals(id));
        store.cancel(id); store.state(id, "complete", "");
        assertEquals("cancelled", store.get(id).getString("state"));
        assertThrows(IllegalArgumentException.class, () -> store.acknowledge(id));
        assertEquals(8, store.source(id, 0).length());
    }
    @Test public void lostFinalReplyReusesTheAllocatedDriveIdInsteadOfCreatingAnotherFile() throws Exception {
        JSONObject batch = staged(8); JSONObject asset = batch.getJSONArray("assets").getJSONObject(0);
        final int[] creates = {0}; final boolean[] uploaded = {false};
        DriveUploadClient client = new DriveUploadClient(null, "User@example.test", null, () -> {}) {
            @Override Reply request(String method, String url, String type, byte[] bytes, File file, long offset, long length, String range, String match) throws Exception {
                Reply reply = new Reply(); reply.status = 200;
                if (url.contains("generateIds")) reply.text = "{\"ids\":[\"stable-drive-id-123\"]}";
                else if (url.contains("&q=")) reply.text = "{\"files\":[]}";
                else if (method.equals("POST")) { creates[0]++; reply.location = "https://www.googleapis.com/upload/drive/v3/files?upload_id=one"; }
                else if (file != null) { uploaded[0] = true; throw new java.io.IOException("final response lost"); }
                else if (uploaded[0]) reply.text = new JSONObject().put("id", "stable-drive-id-123").put("size", 8).put("md5Checksum", asset.getString("md5")).toString();
                else reply.status = 404;
                return reply;
            }
        };
        assertThrows(java.io.IOException.class, () -> client.upload(store, batch, 0));
        assertEquals("stable-drive-id-123", client.upload(store, batch, 0).getString("id"));
        assertEquals(1, creates[0]); assertEquals(8, store.itemState(batch.getString("id"), 0).getLong("confirmed"));
    }
    @Test public void missingRangeNeverConfirmsBytes() {
        assertEquals(0, DriveUploadClient.confirmed(null, 8000000));
        assertEquals(262144, DriveUploadClient.confirmed("bytes=0-262143", 8000000));
        assertThrows(IllegalArgumentException.class, () -> DriveUploadClient.confirmed("bytes=0-9000000", 8000000));
    }
    @Test public void lowDiskIsRejectedBeforeAcceptingAnyOriginal() throws Exception {
        Context context = RuntimeEnvironment.getApplication();
        org.robolectric.shadows.ShadowStatFs.registerStats(new File(context.getFilesDir(), "transfers").getAbsolutePath(), 1024, 1, 1);
        assertThrows(IllegalArgumentException.class, () -> store.prepare(plan(4)));
    }
    @Test public void wrongRemoteBytesCannotBeAdoptedEvenWithTheSameAssetIdentifier() throws Exception {
        JSONObject batch = staged(8);
        DriveUploadClient client = new DriveUploadClient(null, "User@example.test", null, () -> {}) {
            @Override Reply request(String method, String url, String type, byte[] bytes, File file, long offset, long length, String range, String match) {
                Reply reply = new Reply(); reply.status = 200;
                reply.text = "{\"files\":[{\"id\":\"existing-file-123\",\"size\":8,\"md5Checksum\":\"wrong\"}]}"; return reply;
            }
        };
        assertThrows(IllegalArgumentException.class, () -> client.upload(store, batch, 0));
        assertFalse(store.itemState(batch.getString("id"), 0).has("result"));
    }
    @Test public void indexConflictRereadsFreshRowsAndNeverWritesTheSheetOrUsesAnUnguardedUpdate() throws Exception {
        JSONObject batch = staged(8), op = new JSONObject().put("type", "vehicle-cover").put("sheetId", "sheet-file-123").put("sheetUpdated", "2026-10-30T12:00:00Z")
            .put("indexId", "index-file-123").put("recordUpdated", 1).put("coverId", "photo-drive-123");
        batch.put("finalizers", new JSONArray().put(op)); final int[] writes = {0};
        DriveUploadClient client = new DriveUploadClient(null, "User@example.test", null, () -> {}) {
            @Override Reply request(String method, String url, String type, byte[] bytes, File file, long offset, long length, String range, String match) throws Exception {
                Reply reply = new Reply(); reply.status = 200;
                if (url.contains("sheets.googleapis.com")) { assertEquals("GET", method); reply.text = "{\"values\":[[\"Profile ID\",\"vehicle-123\"],[\"Updated\",\"2026-10-30T12:00:00Z\"],[\"Cover Photo File ID\",\"\"]]}"; }
                else if (url.contains("fields=id,etag")) reply.text = "{\"etag\":\"generation-" + writes[0] + "\"}";
                else if (url.contains("alt=media")) reply.text = "{\"vehicles\":[{\"id\":\"vehicle-123\",\"updatedAt\":1,\"drive\":{}},{\"id\":\"other\",\"description\":\"fresh-" + writes[0] + "\"}]}";
                else {
                    assertEquals("PUT", method); assertTrue(url.contains("/upload/drive/v2/")); assertEquals("generation-" + writes[0], match);
                    JSONObject content = new JSONObject(new String(bytes, java.nio.charset.StandardCharsets.UTF_8));
                    assertEquals("fresh-" + writes[0], content.getJSONArray("vehicles").getJSONObject(1).getString("description"));
                    assertEquals("photo-drive-123", content.getJSONArray("vehicles").getJSONObject(0).getJSONObject("drive").getString("coverPhotoFileId"));
                    if (writes[0]++ == 0) reply.status = 412;
                }
                return reply;
            }
        };
        new TransferFinalizer(client, () -> {}).finish(store, batch); assertEquals(2, writes[0]);
    }
}
