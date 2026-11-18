# TEST .46 — trusted launch and background upload controls

The Android launcher now requests a Trusted Web Activity using the existing
browser/profile and TEST origin. The required origin verification is live and
Google confirms the original signed TEST package is linked. A compatible browser
can therefore render without the Chrome URL toolbar. Same-browser Custom Tab is
retained as a fallback; actual toolbar removal still needs confirmation on a phone.

After LotKeys commits every original to Android, open Background upload controls
and tap Continue uploads in background. This visible native action requests
user-initiated scheduling for the authorized retained queue. Preparation still
needs LotKeys open; Android can stop or defer work and existing retry/checkpoints
remain. The percentage alone is not proof that it is safe to switch apps.

Install the signed .46 APK OVER the existing TEST app. Do not uninstall or clear
app/browser data. Package, signing identity and permission set match .45; account,
Store, trusted PCs, .44 retry improvements and .43 fallback are preserved.

406 web tests, 24 JavaScript syntax checks and 58 native tests pass. Native release
assembly/AAB/lint and APK signature/version/certificate checks pass. Phone upgrade,
fullscreen and upload/app-switch/lock/retry checks remain pending. See the test
report for exact build evidence. Production is not changed by this TEST release.
