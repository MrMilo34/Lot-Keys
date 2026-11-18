# LotKeys V0.9.5.14 — progressive Device history

## Goal

Reduce the wait users feel when opening a Device SMS/MMS conversation on a paired PC without changing the V0.9.5.13 reconnection and live-update path or requiring a newly signed Android connector.

## Changes

- Render the newest six messages when a Device conversation first opens.
- Keep the rest of the Android connector's first 40-message page in volatile memory and reveal the next 20 closest older messages per **Load older messages** action.
- Request another Android page only after the already-fetched buffer is exhausted, preserving the native history cursor so no messages are skipped.
- Quietly warm the newest Device conversation after the Hub list is ready and begin warming another row when it receives pointer or keyboard focus.
- Reuse up to eight recent first pages for five minutes, with in-flight request deduplication.
- Show the existing thread preview immediately while a completely cold PC request crosses the encrypted Drive relay.
- Invalidate volatile history when Android reports a changed thread list and clear it on disconnect.
- Preserve V0.9.5.13 live refresh, draft/attachment safety, scroll position, send reconciliation, and trusted reconnection.

## Privacy and limits

The warm history cache exists only in the current JavaScript tab. It expires after five minutes, is bounded to eight first pages, clears on disconnect or tab close, and is never written to `localStorage`, IndexedDB, Hub records, or Google Drive.

The installed V0.9.5.12 Android connector still returns a 40-message history page. Therefore a completely cold PC request remains dependent on the encrypted Google Drive relay round trip. V0.9.5.14 improves warm/recent opening and perceived cold-load response; it does not claim a guaranteed three-second cold transport.

## Compatibility

This is a web-only update. Keep the signed V0.9.5.12 Android connector installed. No APK reinstall, permission change, Google-account re-selection, or new pairing is required.

## Verification

1. Open Hub on a connected PC and allow the newest Device row to remain visible long enough to warm.
2. Open that conversation and confirm only the newest six messages render first.
3. Tap **Load older messages** and confirm the next 20 closest older messages appear immediately in chronological order without a network wait, gap, or duplicate.
4. Continue loading until the buffered first page is exhausted, then confirm the next Android page joins the history without skipping messages.
5. Return to Hub and reopen the same chat within five minutes; confirm it paints from memory immediately and then refreshes when needed.
6. Open a completely cold conversation and confirm its latest thread preview appears while phone history is pending.
7. Receive and send test SMS messages while the conversation stays open and confirm V0.9.5.13 live refresh, scroll preservation, draft safety, and outgoing-message reconciliation still work.
8. Disconnect and reconnect the phone and confirm old cached history is not reused.

## Release identifiers

- Web version: `0.9.5.14`
- Web build: `095014`
- Compatible Android version: `0.9.5.12-test`
- Compatible Android version code: `95012`
- Service worker cache: `lotkeys-app-v095014-device-chat-progressive-history`
- TEST URL after publication: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095014`
