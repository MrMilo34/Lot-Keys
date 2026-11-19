package ca.lotkeys.connector;

import android.app.job.JobScheduler;
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
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class) @Config(sdk=35)
public class DirectoryFinalizerTest {
    private TransferStore store;
    private JSONObject plan, batch, operation, cover;
    private final byte[] pdf="%PDF-1.7\nA complete test directory\n%%EOF".getBytes(StandardCharsets.UTF_8);
    @Before public void setup() throws Exception {
        Context context=RuntimeEnvironment.getApplication();org.robolectric.shadows.ShadowStatFs.registerStats(new File(context.getFilesDir(),"transfers").getAbsolutePath(),1048576,524288,524288);store=new TransferStore(context);
        operation=new JSONObject().put("type","vehicle-directory").put("templateId","template-file-123").put("profileId","profile-folder-123").put("sharedId","shared-folder-123").put("pdfId","pdf-reserved-123").put("fingerprint","directory-revision-1").put("makePublic",false)
            .put("values",new JSONObject().put("{{VEHICLE_TITLE}}","2021 Jeep 🚙")).put("links",new JSONArray().put(new JSONArray().put("VIEW PHOTOS").put("https://drive.google.com/drive/folders/photos-folder-123")))
            .put("badges",new JSONArray().put(new JSONObject().put("token","{{BADGE_ONE_OWNER}}").put("uri","https://mrmilo34.github.io/Lot-Keys-TEST/assets/carfax-one-owner.png").put("enabled",true).put("width",90).put("height",42)));
        cover=new JSONObject().put("type","vehicle-cover").put("sheetId","sheet-file-123").put("sheetUpdated","2026-11-07T12:00:00Z").put("indexId","index-file-123").put("recordUpdated",17).put("assetKey","").put("coverId","photo-file-123");
        plan=new JSONObject().put("version",2).put("key",UUID.randomUUID().toString()).put("context",new JSONObject().put("account","blair@example.test").put("store","store-folder-123").put("record","vehicle-123").put("revision","17"))
            .put("assets",new JSONArray().put(new JSONObject().put("key","document:d").put("name","original.pdf").put("type","application/pdf").put("parent","docs-folder-123").put("driveId","original-drive-123").put("size",3).put("properties",new JSONObject())))
            .put("finalizers",new JSONArray().put(operation).put(cover));
        JSONObject prepared=store.prepare(plan);store.append(prepared.getString("id"),0,0,Base64.encodeToString(new byte[]{1,2,3},Base64.NO_WRAP));store.commit(prepared.getString("id"));batch=store.get(prepared.getString("id"));
    }
    private JSONObject document() throws Exception {return new JSONObject().put("body",new JSONObject().put("content",new JSONArray().put(new JSONObject().put("paragraph",new JSONObject().put("elements",new JSONArray().put(new JSONObject().put("startIndex",1).put("textRun",new JSONObject().put("content","🚙 VIEW PHOTOS {{BADGE_ONE_OWNER}}\n"))))))));}
    private final class Fake extends DriveUploadClient {
        boolean exists,uploaded,newerEdit,newerPdf,loseReply,invalidPdf,newerIndex;int copies,exports,uploads,trash,updates,indexWrites;String etag="before";
        Fake(){super(null,"blair@example.test",null,()->{});}
        @Override Reply request(String method,String url,String type,byte[] bytes,File source,long offset,long length,String range,String match) throws Exception {
            Reply r=new Reply();r.status=200;r.text="{}";
            if(url.contains("sheets.googleapis.com"))r.text=new JSONObject().put("values",new JSONArray().put(new JSONArray().put("Profile ID").put("vehicle-123")).put(new JSONArray().put("Updated").put(newerEdit?"newer":cover.getString("sheetUpdated"))).put(new JSONArray().put("Cover Photo File ID").put("photo-file-123"))).toString();
            else if(url.contains("profile-folder-123?fields=parents"))r.text="{\"parents\":[\"inventory-folder-123\"]}";
            else if(url.contains("inventory-folder-123?fields=parents"))r.text="{\"parents\":[\"store-folder-123\"]}";
            else if(url.contains("fields=parents")&&!url.contains("temp-file"))r.text="{\"parents\":[\"profile-folder-123\"]}";
            else if(method.equals("GET")&&url.contains("/drive/v2/files/pdf-reserved"))r.text=new JSONObject().put("id","pdf-reserved-123").put("etag",etag).toString();
            else if(url.contains("/upload/drive/v2/files/pdf-reserved")){assertEquals("PUT",method);assertEquals("application/pdf",type);assertEquals("before",match);assertNotNull(source);uploads++;uploaded=true;if(loseReply){loseReply=false;throw new java.io.IOException("reply lost after PDF stored");}}
            else if(url.contains("/upload/drive/v2/files/index-file-123")){JSONObject written=new JSONObject(new String(bytes,StandardCharsets.UTF_8));JSONObject drive=written.getJSONArray("vehicles").getJSONObject(0).getJSONObject("drive");assertFalse(drive.getBoolean("nativeFinalizationPending"));assertEquals("directory-revision-1",drive.getString("lastDirectoryFingerprint"));assertEquals("keep",written.getJSONArray("vehicles").getJSONObject(1).getString("description"));assertEquals("index-before",match);indexWrites++;}
            else if(url.contains("/drive/v2/files/index-file-123"))r.text="{\"id\":\"index-file-123\",\"etag\":\"index-before\"}";
            else if(url.contains("/drive/v3/files/index-file-123"))r.text=new JSONObject().put("vehicles",new JSONArray().put(new JSONObject().put("id","vehicle-123").put("updatedAt",newerIndex?18:17).put("drive",new JSONObject().put("directoryPdfId","pdf-reserved-123").put("nativeFinalizationPending",true))).put(new JSONObject().put("id","other").put("description","keep"))).toString();
            else if(url.contains("pdf-reserved-123")){if(!exists){r.status=404;r.text="{}";}else r.text=new JSONObject().put("id","pdf-reserved-123").put("mimeType","application/pdf").put("name","Vehicle Info Directory.pdf").put("parents",new JSONArray().put("shared-folder-123")).put("appProperties",new JSONObject().put("lotkeysVehicleId","vehicle-123")).put("size",uploaded?pdf.length:0).put("md5Checksum",uploaded?DirectoryFinalizer.md5(pdf):"").toString();}
            else if(method.equals("POST")&&url.contains("/drive/v3/files?")){assertEquals("pdf-reserved-123",new JSONObject(new String(bytes,StandardCharsets.UTF_8)).getString("id"));exists=true;r.text="{\"id\":\"pdf-reserved-123\"}";}
            else if(url.contains("/copy?")){copies++;r.text="{\"id\":\"temp-file-123\"}";}
            else if(url.contains("/export?")){exports++;r.body=invalidPdf?new byte[]{1,2,3}:pdf;if(newerPdf)etag="newer";}
            else if(url.contains("docs.googleapis.com")){if(method.equals("GET"))r.text=document().toString();else{updates++;assertTrue(new JSONObject(new String(bytes,StandardCharsets.UTF_8)).has("requests"));}}
            else if(url.contains("temp-file-123")){if(method.equals("PATCH")){assertTrue(new JSONObject(new String(bytes,StandardCharsets.UTF_8)).getBoolean("trashed"));trash++;}else r.text=new JSONObject().put("parents",new JSONArray().put("profile-folder-123")).put("appProperties",new JSONObject().put("lotkeysTransferId",batch.getString("id"))).toString();}
            else if(url.contains("&q="))r.text="{\"files\":[]}";
            else throw new AssertionError("Unexpected request "+method+" "+url);
            return r;
        }
    }
    @Test public void androidCompletesPdfWithoutTheBrowserAndRetainsOriginalsUntilTheWholeJobCompletes() throws Exception {
        Fake client=new Fake();new DirectoryFinalizer(client,()->{}).finish(store,batch,operation,cover);
        assertEquals(1,client.copies);assertEquals(1,client.exports);assertEquals(1,client.uploads);assertEquals(1,client.trash);assertEquals(3,client.updates);
        JSONObject done=store.get(batch.getString("id")).getJSONObject("finalizerResults").getJSONObject("directory");assertEquals("pdf-reserved-123",done.getString("id"));assertEquals("directory-revision-1",done.getString("fingerprint"));assertTrue(store.source(batch.getString("id"),0).isFile());
        store.state(batch.getString("id"),"complete","");store.releaseOriginals(batch.getString("id"));assertFalse(store.source(batch.getString("id"),0).exists());assertFalse(store.operationFile(batch.getString("id"),"directory.pdf").exists());
    }
    @Test public void lostFinalPdfReplyUsesItsRetainedCheckpointAndDoesNotCreateAnotherDirectory() throws Exception {
        Fake client=new Fake();client.loseReply=true;DirectoryFinalizer worker=new DirectoryFinalizer(client,()->{});assertThrows(java.io.IOException.class,()->worker.finish(store,batch,operation,cover));
        assertTrue(store.operationFile(batch.getString("id"),"directory.pdf").isFile());worker.finish(new TransferStore(RuntimeEnvironment.getApplication()),batch,operation,cover);assertEquals(1,client.copies);assertEquals(1,client.exports);assertEquals(1,client.uploads);
    }
    @Test public void aNewerVehicleEditBlocksRenderingBeforeAnyCopyOrUpload() throws Exception {
        Fake client=new Fake();client.newerEdit=true;assertThrows(TransferFinalizer.Reconcile.class,()->new DirectoryFinalizer(client,()->{}).finish(store,batch,operation,cover));assertEquals(0,client.copies);assertEquals(0,client.uploads);assertTrue(store.source(batch.getString("id"),0).isFile());
    }
    @Test public void aNewerPdfRevisionCannotBeOverwrittenByALateJob() throws Exception {
        Fake client=new Fake();client.newerPdf=true;assertThrows(TransferFinalizer.Reconcile.class,()->new DirectoryFinalizer(client,()->{}).finish(store,batch,operation,cover));assertEquals(0,client.uploads);assertTrue(store.operationFile(batch.getString("id"),"directory.pdf").isFile());
    }
    @Test public void corruptExportDoesNotReplaceThePdfOrReleaseOriginals() throws Exception {
        Fake client=new Fake();client.invalidPdf=true;assertThrows(IllegalArgumentException.class,()->new DirectoryFinalizer(client,()->{}).finish(store,batch,operation,cover));assertEquals(0,client.uploads);assertTrue(store.source(batch.getString("id"),0).isFile());
    }
    @Test public void badgeAndLinkOffsetsUseUtf16AndImageEditsRunBackwards() throws Exception {
        JSONArray links=DirectoryFinalizer.linkRequests(document(),operation.getJSONArray("links"));assertEquals(4,links.getJSONObject(0).getJSONObject("updateTextStyle").getJSONObject("range").getInt("startIndex"));
        JSONArray badges=DirectoryFinalizer.badgeRequests(document(),operation.getJSONArray("badges"));assertEquals(2,badges.length());assertEquals("deleteContentRange",badges.getJSONObject(0).keys().next());assertEquals(90,badges.getJSONObject(1).getJSONObject("insertInlineImage").getJSONObject("objectSize").getJSONObject("width").getInt("magnitude"));
    }
    @Test public void untrustedImagesAndWrongRevisionsAreRejectedBeforeSourceStaging() throws Exception {
        final JSONObject bad=new JSONObject(plan.toString());bad.getJSONArray("finalizers").getJSONObject(0).getJSONArray("badges").getJSONObject(0).put("uri","https://untrusted.example/image.png");assertThrows(IllegalArgumentException.class,()->store.prepare(bad));
        final JSONObject wrong=new JSONObject(plan.toString());wrong.getJSONArray("finalizers").getJSONObject(1).put("recordUpdated",18);assertThrows(IllegalArgumentException.class,()->store.prepare(wrong));
    }
    @Test public void explicitResumeUpgradesAnAlreadyQueuedOrdinaryJobToUserInitiated() {
        Context context=RuntimeEnvironment.getApplication();JobScheduler jobs=context.getSystemService(JobScheduler.class);jobs.cancelAll();assertTrue(TransferJobService.schedule(context,false));assertFalse(jobs.getPendingJob(39539).isUserInitiated());assertTrue(TransferJobService.schedule(context,true));assertTrue(jobs.getPendingJob(39539).isUserInitiated());
    }
    @Test public void theNativeFinalizerPublishesReadyOnlyAfterPdfCompletionAndPreservesOtherIndexRows() throws Exception {
        Fake client=new Fake();new TransferFinalizer(client,()->{}).finish(store,batch);assertEquals(1,client.uploads);assertEquals(1,client.indexWrites);
    }
    @Test public void aNewerIndexEditKeepsOriginalsAndCannotBeMarkedReady() throws Exception {
        Fake client=new Fake();client.newerIndex=true;assertThrows(TransferFinalizer.Reconcile.class,()->new TransferFinalizer(client,()->{}).finish(store,batch));assertEquals(0,client.indexWrites);assertTrue(store.source(batch.getString("id"),0).exists());
    }
    @Test public void multipleBadgeEditsAreOrderedFromTheEndOfTheDocument() throws Exception {
        JSONObject doc=document();doc.getJSONObject("body").getJSONArray("content").getJSONObject(0).getJSONObject("paragraph").getJSONArray("elements").getJSONObject(0).getJSONObject("textRun").put("content","{{BADGE_ONE_OWNER}} x {{BADGE_ONE_OWNER}}");JSONArray requests=DirectoryFinalizer.badgeRequests(doc,operation.getJSONArray("badges"));assertEquals(4,requests.length());assertTrue(requests.getJSONObject(0).getJSONObject("deleteContentRange").getJSONObject("range").getInt("startIndex")>requests.getJSONObject(2).getJSONObject("deleteContentRange").getJSONObject("range").getInt("startIndex"));
    }
}
