# LotKeys V0.9.5.16 test report

## Scope

- Automatic inline display for MMS photos arriving in an open Device conversation
- On-demand behavior retained for older unsaved MMS photos
- Saved-photo restoration from the contact's private Media folder
- Automatic scroll-boundary loading of existing 20-message chunks
- Scroll-position and newest-six-first regressions
- Android source unchanged from V0.9.5.12

## Automated checks

- JavaScript syntax validation for every first-party script
- Node test suite: **92 passed, 0 failed**
- Release-contract coverage for live-photo detection, retained-copy retrieval, explicit save state, scroll-boundary triggering, loading-spinner state, and removal of the required older-history tap
- Existing core-model coverage for message sorting, six-message splitting, 20-message reveal chunks, unseen-message detection, deduplication, and photo classification
- Release checksum verification
- Git whitespace validation

## Manual acceptance checks

1. Open a Device conversation and receive a browser-decodable MMS photo. Confirm it appears inline automatically and is not yet present under **💾 Media**.
2. Reopen an older conversation containing an unsaved photo. Confirm **View photo** remains until explicitly pressed.
3. Save a photo with **💾**, close and reopen the conversation, and confirm the retained Media copy restores inline on that message.
4. Scroll backward to the history boundary. Confirm **Loading older messages…** and its spinner appear without a tap, then confirm the next 20 messages prepend without moving the current reading position.
5. Continue through buffered history and into the next Android page; confirm no gaps or duplicate messages.
6. Confirm live text replies, drafts, queued attachments, Photos/Documents grouping, reconnection, and the Device-chat **💾 Media** shortcut still behave as in V0.9.5.15.

## Compatibility

- Web version: `0.9.5.16`
- Build: `095016`
- Android connector: `0.9.5.12-test` (unchanged)
- APK reinstall required: **No**
