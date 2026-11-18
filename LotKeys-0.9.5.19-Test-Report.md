# LotKeys TEST V0.9.5.19 — verification

- JavaScript syntax checks passed for the web modules and service worker.
- `node --test tests/*.test.js`: **94 passed, 0 failed**. The new Bubble Chat check covers last-reply selection across Device and LotKeys and prevents an older phone activity timestamp from replacing a newer reply.
- `git diff --check` passed.
- The web release and service worker use build `095019`; the Android connector stays at V0.9.5.12.

Physical phone and paired PC verification remains to be done by the tester. Specifically check an incoming SMS preview, sending a reply from the floating Device bubble, a subsequent incoming reply refreshing that bubble, the last-replied choice after switching sources, and spacing of the four Hub buttons on a narrow phone and desktop browser. These flows depend on a live Android SMS/MMS provider and paired relay unavailable to the automated suite.
