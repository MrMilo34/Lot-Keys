package ca.lotkeys.connector;
import android.app.job.JobScheduler;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import java.io.File;
import java.util.UUID;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk={35,36})
public class UploadActivityTest {
    Context context; TransferStore store; JobScheduler jobs;
    @Before public void before() {
        context=RuntimeEnvironment.getApplication();jobs=context.getSystemService(JobScheduler.class);jobs.cancelAll();
        context.getSharedPreferences("lotkeys-transfer-auth",0).edit().clear().commit();
        context.getSharedPreferences(DriveRelay.PREFS,0).edit().clear().putString(DriveRelay.GOOGLE_ACCOUNT,"user@example.test").commit();
        org.robolectric.shadows.ShadowStatFs.registerStats(new File(context.getFilesDir(),"transfers").getAbsolutePath(),1024*1024,512*1024,512*1024);
        store=new TransferStore(context);
    }
    JSONObject plan() throws Exception {
        return new JSONObject().put("key",UUID.randomUUID().toString())
          .put("context",new JSONObject().put("account","user@example.test").put("store","store-folder-123").put("record",UUID.randomUUID().toString()).put("revision","1"))
          .put("assets",new JSONArray().put(new JSONObject().put("key","photo").put("name","photo.jpg").put("parent","photos-folder-123").put("size",4)))
          .put("finalizers",new JSONArray());
    }
    void authorize() { context.getSharedPreferences("lotkeys-transfer-auth",0).edit().putString("account","user@example.test").commit(); }
    @Test public void anExternalLinkOnlyOpensControlsAndCannotStartOrAuthorizeUploads() {
        UploadActivity a=Robolectric.buildActivity(UploadActivity.class,new Intent(Intent.ACTION_VIEW,Uri.parse("lotkeys-test://uploads?account=foreign&start=true"))).setup().get();
        assertNull(jobs.getPendingJob(39539));assertFalse(TransferAuth.ready(context));a.finish();
    }
    @Test public void preparationCannotBePromotedBeforeAllOriginalBytesCommit() throws Exception {
        authorize();store.prepare(plan());assertFalse(UploadActivity.resume(context));assertNull(jobs.getPendingJob(39539));
    }
    @Test public void aVisibleUserActionPromotesTheExistingQueueAndKeepsOriginals() throws Exception {
        authorize();String id=store.prepare(plan()).getString("id");store.append(id,0,0,Base64.encodeToString(new byte[]{1,2,3,4},Base64.NO_WRAP));store.commit(id);
        assertTrue(TransferJobService.schedule(context,false));assertEquals("scheduled",TransferJobService.executionMode(context));
        assertTrue(UploadActivity.resume(context));assertEquals("user_initiated",TransferJobService.executionMode(context));
        assertEquals(4,store.source(id,0).length());assertEquals("queued",store.get(id).getString("state"));
    }
    @Test public void changedGoogleAccountCannotStartTheOriginalAccountsQueue() throws Exception {
        context.getSharedPreferences("lotkeys-transfer-auth",0).edit().putString("account","another@example.test").commit();
        assertFalse(UploadActivity.resume(context));assertNull(jobs.getPendingJob(39539));
    }
    @Test public void assetStatementsAreValidJsonForTheExistingBrowserOrigin() throws Exception {
        JSONArray rows=new JSONArray(context.getString(ca.lotkeys.connector.R.string.asset_statements));
        assertEquals("https://mrmilo34.github.io",rows.getJSONObject(0).getJSONObject("target").getString("site"));
    }
}
