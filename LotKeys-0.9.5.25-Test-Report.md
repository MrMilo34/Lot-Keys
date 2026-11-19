# LotKeys TEST V0.9.5.25 — verification

- `node --test tests/*.test.js`: 7 test files passed. The new Store tests exercise fresh-root creation, owner assignment, preservation of personal data on disconnect, pending-upload protection and the existing-Store ownership guard.
- JavaScript syntax checks passed for the app's inline script, Hub, Messaging, Phone and service worker files.
- `git diff --check` passed.
- Release metadata, manifest and service worker use build `095025`. The Android connector remains V0.9.5.12.

The Store creation and disconnect flow has been verified against mocked Google Drive operations. A signed-in phone and PC check of real Google Drive folder creation, switching and cache refresh is still needed during TEST use.
