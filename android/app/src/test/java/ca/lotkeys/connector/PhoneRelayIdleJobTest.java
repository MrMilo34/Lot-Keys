package ca.lotkeys.connector;

import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.Context;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class) @Config(sdk = 35)
public class PhoneRelayIdleJobTest {
    @Test public void idleRecoveryIsAnInexactPersistedHourlyNetworkJobAndCanBeRemoved() {
        Context context = RuntimeEnvironment.getApplication();
        JobScheduler jobs = context.getSystemService(JobScheduler.class);
        PhoneRelayIdleJob.sync(context, true);
        JobInfo job = jobs.getPendingJob(39550);
        assertNotNull(job); assertTrue(job.isPersisted()); assertTrue(job.isPeriodic());
        assertEquals(RelayWorkPolicy.IDLE_MS, job.getIntervalMillis());
        assertEquals(15 * 60 * 1000L, job.getFlexMillis());
        PhoneRelayIdleJob.sync(context, false); assertNull(jobs.getPendingJob(39550));
    }
}
