# LotKeys TEST V0.9.5.44 — earlier Android handoff

Website build 095044; Android connector 0.9.5.44-test / 95044;
Posting Buddy remains V0.1.25. Baseline main: .43
`4d27b49c7018b6386bdbafa9dfc6e20629d87c00`.

Blair confirmed that .43 continued uploading while switching apps. This update
keeps that working path and moves the remaining Info Sheet work into Android so
it no longer delays the handoff or needs an active browser afterwards.

1. Establish the Vehicle folders, core administrative Sheet and Inventory row.
   Independent folder requests overlap. Reserve stable media and PDF IDs first.
2. Copy every missing original and the complete finishing plan into Android's
   durable queue, using bounded 1 MiB packets. Keep LotKeys open during this step.
3. Show **Ready to switch apps** only after Android confirms every source byte
   and commits the plan. Android then uploads files, creates the linked/badged
   Info Sheet PDF, applies sharing and completes the Inventory preview.

The signed [V0.9.5.44 connector](downloads/LotKeys-Connector-TEST-V0.9.5.44.apk)
must be installed over the current TEST app for this sequence. The original
package/signing identity, app data, account and trusted PCs are retained.
Older connectors keep the established browser sequence. Separate Drive approval
is still required. New/additive saves and safe metadata updates use this path;
media removals, reordered/renamed or unlisted files, duplicate PDFs and unavailable
template/capabilities use established reconciliation instead.

The native work preserves original media/order and the existing Info Sheet
text, links and three CARFAX badges. PDF bytes and MD5 are checkpointed; retries
reuse the stable PDF destination and confirmed files. Real account/Store/edit,
Sheet revision, parent-folder, PDF ETag and Inventory revision conflicts stop
instead of overwriting newer work. Native media deletion is not introduced.
Pending Inventory rows survive scans and concurrent .44 index writes. Older open
website clients can still force a reconciliation; native guards remain strict.

The visible Android Resume action also upgrades a pending ordinary job to a
user-initiated transfer when Android permits it. Existing active jobs remain.
Hub polling/cache, phone pairing, SMS consent and extension .25 are retained.

**Verified:** 393 Node tests; 27 Android tests; Android assembly/lint; web, inline
and packaged extension syntax. APK package/version and original certificate are
verified. Native build: `abdbec545a5f7ec793a5bb0e589c48266f34b1b0`, Actions
[42424376391](https://github.com/MrMilo34/Lot-Keys-TEST/actions/runs/42424376391).
Only web/tests/docs/downloads changed after that native build.

Thirty-second readiness is a target, not a measured guarantee. Original video
size, device storage and connection speed still affect staging. Android may defer
network work; errors remain visible. No physical-phone .44 or live Drive upload
is claimed. First check: install the update, verify .44, time a fresh Vehicle save,
switch apps at the readiness message, and confirm its files/PDF/cover on return.
See [verification](LotKeys-0.9.5.44-Test-Report.md).
