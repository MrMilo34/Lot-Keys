# LotKeys TEST V0.9.5.26 — verification

- `node --test tests/*.test.js`: all 7 test files passed. Store tests cover a busy refresh reload, isolation and recovery of unfinished Store work, personal data preservation, new Store ownership, and the five-minute refresh gate.
- JavaScript syntax checks passed for all eight inline scripts, service worker, Hub, Messaging and Phone sources.
- `git diff --check` passed.
- The manifest, service worker, runtime and metadata use build `095026`; the Android connector remains V0.9.5.12.

The Store data flow was exercised with mocked Google Drive and browser storage operations. A signed-in phone and PC check against live Google Drive remains part of TEST use.
