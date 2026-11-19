# LotKeys .45 TEST release evidence

Source Android build: 50065a76c0945089a980002587e88e47d2e8561a.
Android CI: https://github.com/MrMilo34/Lot-Keys-TEST/actions/runs/42719946524
Web CI: https://github.com/MrMilo34/Lot-Keys-TEST/actions/runs/42719946417

404 Node tests pass; 46 Robolectric native tests pass with zero failures/ignored.
Debug/release assembly, release bundle and lint succeeded; release lint reports
zero errors and 28 warnings. These are automated checks, not physical-device tests.
CI lacked TEST signing secrets, so certificate verification/upload were skipped.
The existing release artifact was recovered and signed with the original saved
TEST key, without rebuilding or creating credentials. All APK payload entries
match the unsigned release artifact. Private signing material is not in Git.

APK: downloads/LotKeys-Connector-TEST-V0.9.5.45.apk
SHA-256: 103b837364756d8599a8b2dbb4cfe0ea29c41e5e1f20ae71f97d3d88fe307dac
Package: ca.lotkeys.connector.test; version 0.9.5.45-test / 95045.
Certificate SHA-256: 77bbfafca861ef0638cedbbeae0847d99d4c3416f6b50a888b01cab07b1f2635
Certificate SHA-1: 6cae202927d7884907c25147fe7fa0e11d87b741
apksigner v3 verification succeeds; certificate/package match published .44.
Launcher and permission set unchanged; min SDK 30, target SDK 36; non-debuggable.
All four native libraries pass 16 KB ZIP-offset and ELF LOAD alignment inspection.

Install OVER the existing app; never uninstall or clear app/browser data.
Before first launch use the same default browser/profile holding existing data.
The app opens the existing TEST URL in a Custom Tab and pins its browser provider;
it does not embed a versioned website. Confirm BOTH native and web versions .45.
Phone & upload settings remain accessible from the Custom Tab menu/native screen.

Blair confirms .44 retry/resynchronization resumed after switching apps in his
last test; its 50% readiness message may have appeared too early. Preserve this
observed baseline. .43 remains the earlier confirmed upload fallback.
Test .45 in-place upgrade, account/Store/trusted-PC continuity, original order,
retained queue/retry, readiness timing, app switching, locking/network interruption
and PC relay. Use non-sensitive test data and user-authorized SMS test recipients.
Thirty seconds is not measured or guaranteed. Packaging alone does not guarantee
background work; switch only after the current job confirms readiness.

## Recovery

Preserve .44 main 667a1c06f65fb7db7afed491a386881dc851e2c9 and its signed APK.
Preserve .43 source 4d27b49c7018b6386bdbafa9dfc6e20629d87c00 (.43 web used .40 Android).
For a web regression, stop starting test jobs; retain originals/receipts and prepare
an ordinary reviewed commit restoring .44 web behavior with a distinct rollback
cache ID. Keep all APK downloads and avoid force-pushing shared history.
An installed .45 APK cannot safely be treated as downgradable to .44. Keep data;
if native recovery is needed, build a same-key/package forward fix with a higher
versionCode. Backups are disabled: do not uninstall or force a downgrade.

Production lot-keys.ca is outside this TEST release. No Drive layout, backend,
Firebase activation, billing, permission or credential changes are included.
Actual OAuth/test-user/client/verification/billing and Play account approvals are
still unverified. This is a controlled TEST release, not public-release approval.
