# LotKeys V0.9.5.13 test report

Date: 2026-09-27 (America/Edmonton)

## Result

- Web and shared-code regression tests: **86 passed, 0 failed**
- JavaScript syntax validation: **passed**
- Release metadata and cache consistency: **passed**
- Git whitespace validation: **passed**
- Android source: **unchanged from V0.9.5.12**

## Regression coverage added

- A phone-data change has a dedicated live-refresh path for the currently open Device conversation.
- Unread-acknowledgement events do not trigger a redundant history refresh.
- A refresh already in progress queues one follow-up update instead of dropping a newer change.
- The handler verifies that the same conversation is still visible before applying asynchronous history results.
- Older-history pagination remains intact after a live update.
- Unsent composer state stays outside the refreshed history container.

## Compatible Android artifact

- Package: `ca.lotkeys.connector.test`
- Version code: `95012`
- Version name: `0.9.5.12-test`
- APK SHA-256: `2f797e692a49730f78386391dbea4cf3b3a64f85e15a4278d649fe3ec503ae6d`
- Reinstall required for V0.9.5.13: **no**

## Physical-device evidence and retest

The submitted recording confirms the original failure: Android receives the reply, the Hub list updates after navigating back, and reopening the conversation reveals the message. After deployment, repeat that exact flow on both the phone and paired PC and confirm the reply now appears while the chat remains open. Also verify draft, queued-attachment, scroll-position, and outgoing-message deduplication behavior.
