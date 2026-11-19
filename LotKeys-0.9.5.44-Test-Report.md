# LotKeys TEST .44 early-handoff verification

November 7, 2026. Baseline: released .43. Native source built from
`abdbec545a5f7ec793a5bb0e589c48266f34b1b0` in Android Actions run
[42424376391](https://github.com/MrMilo34/Lot-Keys-TEST/actions/runs/42424376391).

## Behavior checks

**393/393 Node tests pass**, zero failures/skips. The 24 new checks cover:
stable media/PDF destinations; original photo naming/order; complete version-2
plans; 1 MiB staging with every byte verified; exact retained-plan restart;
parallel folder creation and core data without browser PDF rendering; older
connector fallback; genuine Store changes; existing PDF reuse/profile rename;
protected pending/completed index rows; matching native completion proof;
missing/wrong PDF proof; newer local edits and different receipts; actual healthy
sync bypassing browser rendering; distinct old/new native job keys; and newer
remote conflicts stopping before browser overwrite. Existing .43 observation,
.41 hydration/recovery, extension media/title, Hub/message/cache, SMS, Store and
account tests remain in the suite.

**27/27 Android tests pass**, zero failures/ignored. Eleven new Robolectric
checks exercise native PDF creation and retention, lost-reply restart reuse,
newer Vehicle/PDF/index edits, corrupt PDF rejection, UTF-16 link and badge
indices, reverse-ordered multiple badges, untrusted inputs, ordinary-to-UIDT
Resume upgrade, and Inventory completion preserving unrelated rows.

The first Android validation failed six cases at one invalid collection URL
(`/files/?...`). Both collection requests were corrected to `/files?...`.
The succeeding complete build assembles, runs all tests and passes lint. The
response reader bounds PDF exports at 10 MiB and avoids decoding PDF as JSON.
Seventeen standalone web/wake scripts, eight inline scripts and three packaged
Posting Buddy scripts pass JavaScript syntax checks. Diff checks pass.

## Signed artifact

`downloads/LotKeys-Connector-TEST-V0.9.5.44.apk` is signed privately with the
original TEST key; no replacement identity or signing material is committed.
The CI unsigned candidate is not the release download. APK Signature Scheme v3
verification passes, matching the app's minimum Android API 30. Binary manifest:
`ca.lotkeys.connector.test`, versionCode `95044`, versionName `0.9.5.44-test`.
Original certificate SHA-1: `6CAE202927D7884907C25147FE7FA0E11D87B741`.
APK SHA-256: `67400487aeddc24e178cfbf4fd3cd6413311dd108745a9c1a0091a60ed100822`.

## Scope and remaining device check

Blair's .43 app-switch upload success is the previous real-device milestone.
No .44 physical-phone, network timing, locked-screen or real Drive rendering
result is claimed. Install over the existing TEST app and retain all data/trust.
Measure folder/core preparation and staging separately, then switch apps only
once Ready to switch apps appears. Confirm original counts/order, PDF links and
badges, Inventory cover and final sync status. Large original videos can exceed
the desired 30-second window. Android scheduling remains subject to the OS.
Conservative foreground reconciliation remains for destructive/ambiguous media
changes. No native media deletion, account-guard bypass or Hub policy change.
