# LotKeys TEST V0.9.5.38 verification

- All 290 automated checks pass: the retained 284 plus six focused behavior
  cases for ten-chat warming, foreground priority/new arrivals, independent
  failure backoff, blocked/hidden/locked/offline suppression, stale-session
  rejection/renewal and native equal-timestamp cursor trimming.
- Production history/cache functions are executed in the existing VM harness.
  A ten-chat scenario verifies six recent messages per chat, immediate reuse by
  all ten opens, no eleventh conversation evicting a recent one, no image bytes
  retained, and correct older-message boundaries. Full foreground fetches keep
  the complete phone page. Existing history, bubble, receipt, disconnect,
  import, media, upload, personal preferences and Store checks pass.
- 21 syntax checks pass: root scripts, eight executable inline scripts and the
  unchanged Apps Script processor. `git diff --check` passes.
- The package keeps the .37 baseline paths. Native Android, Posting Buddy and
  Store Processor application bytes are unchanged. Metadata consistently uses
  web version 0.9.5.38, build 095038 and the new service-worker cache name.
- The two supplied Firebase JSON files were checked for Android client package
  names only; neither registers LotKeys. They are not included in this release.
  No FCM receiver/sender deployment, Firebase activation or billing action is
  claimed. The current .12 connector/recovery loop remains in place.
- No physical-phone installation, locked-phone wake, real carrier SMS, live
  account/Drive write or measured end-to-end latency was tested. Initial cache
  population still uses the existing phone/Drive relay and can take time.
