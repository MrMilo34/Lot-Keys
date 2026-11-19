# LotKeys V0.9.5.12 test report

Date: 2026-09-27 (America/Edmonton)

## Result

- Web and shared-code regression tests: **84 passed, 0 failed**
- Android `assembleDebug`: **passed**
- Android `lintDebug`: **passed**
- APK signature verification: **passed**
- APK package inspection: **passed**

## Verified Android artifact

- Package: `ca.lotkeys.connector.test`
- Version code: `95012`
- Version name: `0.9.5.12-test`
- Signing certificate SHA-1: `6C:AE:20:29:27:D7:88:49:07:C2:51:47:FE:7F:A0:E1:1D:87:B7:41`
- APK SHA-256: `2f797e692a49730f78386391dbea4cf3b3a64f85e15a4278d649fe3ec503ae6d`

## Regression coverage added

- The account picker's exact account name is retained without lower-case normalization.
- The Android account type is stored and required before setup can claim authorization.
- The fresh Google token is handed directly to the running foreground relay.
- The connector can show the live relay error instead of a false saved Ready state.
- Restricted-settings guidance and direct battery-exemption routing remain present.

## Physical-device test still required

Install the signed APK over V0.9.5.11, select the same pairing account once, and confirm the PC's four-digit offer appears on the connector. After initial approval, close the phone browser and verify a trusted stale PC session reconnects through the foreground relay.
