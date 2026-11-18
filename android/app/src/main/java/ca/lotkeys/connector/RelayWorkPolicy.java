package ca.lotkeys.connector;

/** Monotonic presence leases. No network or Android dependency. */
final class RelayWorkPolicy {
    static final long ACTIVE_MS = 2000L;
    static final long IDLE_MS = 60 * 60 * 1000L;
    static final long BROWSER_LEASE_MS = 15 * 1000L;
    static final long PC_GRACE_MS = 90 * 1000L;
    static final long STARTUP_MS = 30 * 1000L;
    private boolean setupVisible;
    private long browserUntil, pcUntil, startupUntil;
    private long lastPoll = -1;

    synchronized void start(long now, boolean trustedPc) { startupUntil = trustedPc ? now + STARTUP_MS : 0; }
    synchronized void setupVisible(boolean visible) { setupVisible = visible; if (!visible) startupUntil = 0; }
    synchronized void browserVisible(long now, boolean visible) { browserUntil = visible ? now + BROWSER_LEASE_MS : 0; if (!visible) startupUntil = 0; }
    synchronized void pcSeen(long now) { pcUntil = now + PC_GRACE_MS; }
    synchronized void clearPc() { pcUntil = 0; startupUntil = 0; }
    synchronized boolean active(long now) { return setupVisible || now < browserUntil || now < pcUntil || now < startupUntil; }
    synchronized void polled(long now) { lastPoll = now; }
    synchronized long delay(long now, boolean trustedPc) {
        if (!active(now) && !trustedPc) return -1;
        long interval = active(now) ? ACTIVE_MS : IDLE_MS;
        return lastPoll < 0 ? 0 : Math.max(0, interval - Math.max(0, now - lastPoll));
    }
    synchronized boolean hourlyRecoveryDue(long now, boolean trustedPc) {
        // Android periodic jobs are inexact. Avoid duplicating a recent timer
        // check without rejecting an hourly job merely because it ran early.
        return trustedPc && !active(now) && (lastPoll < 0 || now - lastPoll >= 45 * 60 * 1000L);
    }
}
