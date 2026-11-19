# LotKeys TEST V0.9.5.37 verification

- 284 automated tests pass: 266 retained tests and 18 new Store branding/configuration/Processor binding checks.
- Actual production branding functions execute in a simulated Drive/settings environment. Covered unscoped legacy image rejection, accessible foreign logos, equal-timestamp/file-change behavior, unchanged-cache reuse, explicit default clearing, temporary network failure, late downloads after Store/account changes, foreign-file save/removal protection and copied configuration rejection.
- Processor binding functions execute against Script-property doubles: missing configuration stops, a saved Store survives generic updates, explicit conflicts stop, and first-time explicit configuration works. Installer records the verified root rather than a distributed default.
- Root JavaScript, executable inline scripts and Apps Script syntax pass. Full existing importer, website identity, sync lifecycle, personal preference, messaging, phone relay, workspace recovery and store-switch checks remain passing.
- All 183 baseline files matched the published V0.9.5.36 Git tree before editing. All baseline file paths retained. Android V0.9.5.12, Posting Buddy V0.1.24 and binary assets retain their bytes.
- No physical-phone wake, live authenticated Drive/logo mutation, installed Apps Script migration or real SMS was tested. Push-to-wake remains explicitly pending; no Firebase or billing activation is claimed.
