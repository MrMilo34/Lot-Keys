# LotKeys TEST V0.9.5.20 — verification

- JavaScript syntax checks passed for Messaging, Hub, Phone and the service worker.
- `node --test tests/*.test.js`: **94 passed, 0 failed**.
- `git diff --check` passed.
- The web release and service worker use build `095020`; the Android connector remains V0.9.5.12.

The expanded Device chat's grey frame, stacked contact number, colored message bubbles and compact alert require a visual check on a paired phone. The automated suite does not have a live Android SMS provider or browser renderer.
