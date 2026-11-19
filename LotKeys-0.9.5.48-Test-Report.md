# LotKeys TEST 0.9.5.48 checks

## Confirmed evidence

The pilot Store's established Jeep gallery contains 30 saved photos. Both regular
accounts have Reader access to that gallery and its Vehicle Profile. One creator's
new Vehicle has an official record but an empty official photo folder, while newer
originals are in their own More workspace. Record existence was not upload completion.
Live processor logs showed repeated cleanup permission denials for two pending
requests. The completion patch was saved and read back exactly in the existing,
correctly bound project. Both requests subsequently acquired approved receipts.
No credentials, trigger, manifest, roles or sharing settings were changed.

## Automated validation

461 Node tests pass, including 28 new behavior checks. All 31 JavaScript syntax
checks (web modules, inline scripts, Processor and packaged extension) and
`git diff --check` pass. Focused behavior checks
cover late gallery batches, slow downloads, failed folders, local edits/Store changes,
Listing selections, per-photo checkpoints, uncertain final writes, retained request
IDs, new edits, terminal receipt replay and queue fairness/order.

## Deployment and device limits

PR #20 passed GitHub CI 42906185477 and main CI 42906376040; initial Pages
42906375749 succeeded. All six checked live release files matched committed bytes.
The slow-original follow-up adds independent photo workers and explicit cache-write
errors, with 461 passing tests. Its CI/Pages outcome is recorded in the release
handoff after promotion. Production remains 0.9.4.81 and is untouched.
No new APK; the signed .46 file and native code are retained. Real regular-user
phone/PC and cross-user publication tests have not been performed by Codex. Existing
newer originals were not manually copied or invented into a request. URL photo import
and Android background behavior still require a real-user retest on that connection.
