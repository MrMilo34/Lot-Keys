# LotKeys TEST V0.9.5.23 — verification

- JavaScript syntax checks passed for Messaging, Hub, Phone and service worker.
- `node --test tests/*.test.js`: **94 passed, 0 failed**.
- `git diff --check` passed.
- Source and geometry checks confirmed the Hub preview gate, removal of an existing preview on Hub entry, flexible right-side width, and scrollbar clearance at phone and desktop viewport widths.
- The web release and service worker use build `095023`; Android remains V0.9.5.12.

Paired phone and PC visual checks remain to confirm the preview placement and active Hub behavior. The Android system messaging heads-up is outside the web app and may still appear according to phone notification settings.
