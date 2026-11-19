# LotKeys V0.9.5.14 test report

Date: 2026-09-27 (America/Edmonton)

## Result

- Web and shared-code regression tests: **89 passed, 0 failed**
- JavaScript syntax validation: **passed**
- Release metadata and cache consistency: **passed**
- Git whitespace validation: **passed**
- Android source: **unchanged from V0.9.5.12**

## Regression coverage added

- A 40-message newest-first Android page is normalized without mutating the response.
- The initial visible window contains exactly the newest six messages in chronological order.
- The first older-history action reveals the nearest 20 buffered messages while retaining the oldest 14 for the next action.
- Progressive history helpers preserve stable message sorting and de-duplicate IDs.
- A burst of seven or more live replies cannot hide the earliest new reply inside the refreshed first-page buffer.
- The Hub contract includes volatile cache/prefetch behavior, a five-minute expiry, an eight-page bound, buffered pagination, and no message-body write to browser storage.
- V0.9.5.13 open-chat live refresh continues to merge only current messages while retaining loaded older history.

## Compatible Android artifact

- Package: `ca.lotkeys.connector.test`
- Version code: `95012`
- Version name: `0.9.5.12-test`
- APK SHA-256: `2f797e692a49730f78386391dbea4cf3b3a64f85e15a4278d649fe3ec503ae6d`
- Reinstall required for V0.9.5.14: **no**

## Physical-device retest

Measure cold and warm paths separately. The warm newest conversation and a recently reopened conversation should display six messages immediately or within the three-second target. A completely cold paired-PC request still uses the unchanged encrypted Drive relay and may exceed that target; record its elapsed time rather than treating the browser-side six-message window as a native transport improvement.

Also verify successive 20-message reveals, the transition to the next Android page, incoming live replies, outgoing-message reconciliation, preserved scroll position, unsent drafts, queued attachments, disconnect cache clearing, and automatic reconnection.
