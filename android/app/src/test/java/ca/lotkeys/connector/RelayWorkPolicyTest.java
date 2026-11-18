package ca.lotkeys.connector;

import org.junit.Test;
import static org.junit.Assert.*;

public class RelayWorkPolicyTest {
    @Test public void visiblePhoneKeepsFastChecksEvenWithoutARegisteredPc() {
        RelayWorkPolicy policy = new RelayWorkPolicy(); policy.setupVisible(true); policy.polled(1000);
        assertEquals(2000, policy.delay(1000, false));
        policy.setupVisible(false); assertEquals(-1, policy.delay(2000, false));
    }
    @Test public void aHiddenPhoneBrowserCannotKeepFastPollingAlive() {
        RelayWorkPolicy policy = new RelayWorkPolicy(); policy.browserVisible(1000, true); policy.polled(1000);
        assertEquals(2000, policy.delay(1000, true));
        policy.browserVisible(2000, false);
        assertFalse(policy.active(2000)); assertEquals(RelayWorkPolicy.IDLE_MS - 1000, policy.delay(2000, true));
    }
    @Test public void abruptBrowserClosureExpiresItsPresenceWithoutAClosingMessage() {
        RelayWorkPolicy policy = new RelayWorkPolicy(); policy.browserVisible(1000, true); policy.polled(1000);
        assertTrue(policy.active(15999)); assertFalse(policy.active(16000));
        assertEquals(RelayWorkPolicy.IDLE_MS - 15000, policy.delay(16000, true));
    }
    @Test public void pcHeartbeatKeepsFastChecksAndLossFallsBackAfterTheRecoveryGrace() {
        RelayWorkPolicy policy = new RelayWorkPolicy(); policy.pcSeen(1000); policy.polled(1000);
        assertEquals(2000, policy.delay(1000, true));
        policy.pcSeen(80000); assertTrue(policy.active(169999)); assertFalse(policy.active(170000));
        assertEquals(RelayWorkPolicy.IDLE_MS - 169000, policy.delay(170000, true));
    }
    @Test public void aQuietPhoneWithNoTrustedPcNeverSchedulesCloudChecks() {
        RelayWorkPolicy policy = new RelayWorkPolicy(); policy.start(1000, false);
        assertEquals(-1, policy.delay(1000, false)); assertFalse(policy.hourlyRecoveryDue(10000000, false));
    }
    @Test public void startupGetsABoundedRecoveryWindowAndAnHourlyJobDoesNotDuplicateARecentScan() {
        RelayWorkPolicy policy = new RelayWorkPolicy(); policy.start(1000, true); policy.polled(1000);
        assertTrue(policy.active(30999)); assertFalse(policy.active(31000));
        assertFalse(policy.hourlyRecoveryDue(60 * 1000, true));
        assertTrue(policy.hourlyRecoveryDue(46 * 60 * 1000, true));
        policy.polled(46 * 60 * 1000); assertFalse(policy.hourlyRecoveryDue(47 * 60 * 1000, true));
    }
    @Test public void explicitDisconnectClearsThePcGraceWithoutStoppingVisiblePhoneUse() {
        RelayWorkPolicy policy = new RelayWorkPolicy(); policy.pcSeen(1000); policy.setupVisible(true); policy.clearPc();
        assertTrue(policy.active(2000)); policy.setupVisible(false); assertFalse(policy.active(2000));
    }
}
