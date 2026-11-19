# LotKeys V0.9.5.11 test report

## Result

- JavaScript syntax checks: passed
- Automated Node test suite: 83 passed, 0 failed
- Release-contract checks: passed
- Android source and workflow metadata: updated for V0.9.5.11

## Commands

```text
node --check lotkeys-phone.js
node --check lotkeys-phone-core.js
node --check lotkeys-hub.js
node --test tests/*.test.js
```

## Automatic reconnect coverage

The tests verify that a remembered and previously approved PC can create a fresh automatic pairing offer from a background/hidden browser tab. The offer is marked as a reconnect and is restricted to the remembered Android installation. They also verify the release metadata and Android relay contract used to select and approve the newest trusted reconnect offer.

## Android build note

This workspace does not include the Android SDK and Gradle toolchain, so the APK was not compiled locally. Upload the complete release to the TEST repository and let the included **Build LotKeys Android Layer** GitHub Actions workflow compile and lint the Android connector. Install the resulting `LotKeys-Android-V0.9.5.11` artifact before testing background reconnect.
