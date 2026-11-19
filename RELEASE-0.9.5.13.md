# LotKeys V0.9.5.13 — open Device chat live refresh

## Physical-test failure corrected

An incoming SMS/MMS reply reached Android and updated the Hub conversation preview and unread badge, but an already-open Device conversation stayed unchanged. The new message appeared only after backing out and reopening that chat. The same stale-view path affected the phone browser and paired PC.

## Changes

- Refresh the currently open Device history whenever Android or the encrypted PC relay reports changed phone data.
- Display incoming replies without closing or reopening the conversation.
- Keep an unsent draft and queued attachments intact while the history refreshes.
- Follow the new message when the reader is near the bottom; preserve the current reading position when scrolled up.
- Keep previously loaded older messages and their paging cursor during live refreshes.
- Reconcile a locally rendered outgoing SMS with the phone-confirmed message so one send produces one bubble.
- Ignore the local unread-acknowledgement event for live-history refresh purposes, preventing a redundant refresh loop.

## Compatibility

This is a web-only hotfix. Keep the signed V0.9.5.12 Android connector installed; no APK reinstall, permission change, account re-selection, or new pairing is required.

## Verification

1. Open the same fictional Device SMS/MMS conversation on the phone and paired PC.
2. Leave both conversations open and send a reply to the test phone from another device.
3. Confirm the incoming bubble appears automatically in both open views without using Back or reopening the conversation.
4. Repeat with an unsent draft and queued attachment, then while scrolled up in older history.
5. Confirm composer content and reading position remain intact; when already at the bottom, the view follows the latest reply.
6. Send one SMS from LotKeys and confirm its optimistic bubble does not duplicate when the phone-confirmed copy arrives.

## Release identifiers

- Web version: `0.9.5.13`
- Web build: `095013`
- Compatible Android version: `0.9.5.12-test`
- Compatible Android version code: `95012`
- Service worker cache: `lotkeys-app-v095013-device-chat-live-refresh`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095013`
