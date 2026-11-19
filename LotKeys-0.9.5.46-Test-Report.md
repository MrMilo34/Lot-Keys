# TEST .46 signed candidate evidence

Android source commit: 3c6089d8ad4d3d7c3eef9926c96b6a7f378681c9.
Branch: codex/trusted-launch-background-v095046.
Successful CI: https://github.com/MrMilo34/Lot-Keys-TEST/actions/runs/42855311393
58 Robolectric tests pass; assembly/debug and non-debuggable release APK/AAB/lint pass.
Release lint: 0 errors, 33 warnings. 406 Node tests and 24 JS syntax checks pass locally.
Earlier runs exposed asynchronous browser-test assumptions and a missing session-
creation fallback guard; both were corrected before this successful candidate.
No physical-device fullscreen, background/lock/retry or upgrade result is claimed.

Recovered CI release artifact ZIP digest:
a2a56e6b6b979d3b95fab87f888b81b7e2b73b3da7799c5bf6f0c561d7861877
The release APK was signed privately with the existing TEST key, then verified.
APK SHA-256: 5050259a4ebc48314ba5c1ebbddc895f73e271dc2ccdbc3b76e0f3c9973a0093
Filename: LotKeys-Connector-TEST-V0.9.5.46.apk; 9293340 bytes.
Package ca.lotkeys.connector.test; version 0.9.5.46-test / 95046; SDK 30 minimum / 36 target.
Certificate SHA-256: 77bbfafca861ef0638cedbbeae0847d99d4c3416f6b50a888b01cab07b1f2635
The certificate, launcher and permission set match .45. Signature v3 verifies.
Signed APK payload bytes match the unsigned CI release APK. All four native
libraries retain 16 KB ZIP-offset and ELF LOAD alignment. No new credentials.

The signed installer is saved in Blair's Library and included in downloads with
its checksum for coordinated TEST publication. Do not use an unsigned CI APK.
PR #17 merged at 7e8544bdd0024fc964b18ace7c6037719bcced5e. TEST Pages run
42871744941 succeeded; eight live files including the signed APK/checksum matched
committed bytes. TEST serves .46; production remains .81. Release-head web check
42871334586 and Android check 42871334239 both succeeded. A final install-page
copy correction removes the obsolete .45 toolbar/menu instructions; no Android
code or binary changed. Physical-phone results remain pending.

## Origin verification completed

https://mrmilo34.github.io/.well-known/assetlinks.json returned HTTP 200 without
redirect, application/json; charset=utf-8, with exact prepared bytes on 2026-11-10.
File SHA-256: 8a0b797d189e3e1af43d1aebe42faf72ba51dfec5fb5c4ef1286b690db254063.
Google Digital Asset Links check returned linked=true for the exact HTTPS origin,
ca.lotkeys.connector.test and the original certificate above. Public helper repo
MrMilo34/mrmilo34.github.io commit 1432430a221d9e0353839e71e45a19b72b994950
serves only minimal verification-site files; no CNAME or production change.
This establishes server-side verification, not a physical-phone visual result.
The old .45 APK uses Custom Tabs and does not become a TWA just from this file.

## Phone testing and rollback

Install OVER the existing app; do not uninstall or clear app/browser data.
Use the same browser/profile/account/Store, close the old app view and reopen .46.
Confirm native version 0.9.5.46-test and that workspace opens without the URL bar.
Google/browser verification caches may delay recognition; do not clear data.

Keep LotKeys open through preparation and durable committed receipt. Open native
Background upload controls from the Profile link, native home or notification;
tap Continue uploads in background while native UI is visible. Switch apps and
check Android upload notification, then lock/unlock and briefly interrupt network.
Return and verify originals, PDF/sharing, Inventory, retry/resync and no duplicates.
Record readiness time and bytes; no 30-second or continuous-upload claim is made.
This screen adds no Google scope, Android permission or automatic consent.

Before promotion retain .45 main 0b5310597e907544065b15658106e75b21ea18a0 in
recovery/test-v095045-before-v095046. The .44 recovery branch already points to
667a1c06f65fb7db7afed491a386881dc851e2c9; .43 fallback remains
4d27b49c7018b6386bdbafa9dfc6e20629d87c00. Keep prior signed installers.
For web rollback, revert the .46 merge on TEST main through a reviewed commit,
then verify Pages and .45 version/cache/files. Do not force-reset shared main.
Do not uninstall or force a lower Android version over .46; if native rollback is
needed, produce a same-key build with a higher version code using retained source.
Leave root verification in place; it is harmless to Custom Tab .45. No production
rollback, credential or permission changes are required by this TEST-only release.

Earlier commit/PR/root-publication approval denials were historical. Blair later
explicitly approved updating the existing TEST release and necessary related work.
Independent phone testing is still required before a public-release readiness claim.
