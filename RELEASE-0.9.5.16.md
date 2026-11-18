# LotKeys V0.9.5.16 — Live MMS previews and scroll-loaded history

## What changed

- A browser-decodable MMS photo that arrives while its Device conversation is open now loads and appears inline automatically.
- Older unsaved MMS images keep the existing **View photo** control. Opening a conversation still renders its newest messages without downloading the full image history.
- The explicit **💾** action now keeps the saved attachment's message source reference in the open conversation. When that message is revisited, LotKeys restores the retained copy from the contact's private Media folder and shows it inline.
- Reaching the top of loaded Device history now starts the next existing 20-message chunk automatically. The former button surface displays **Loading older messages…** with a spinner while the chunk is prepared.
- Prepending older messages and expanding photos preserve the reader's position instead of jumping the conversation unexpectedly.

## Retention boundary

Automatic display does not mean automatic retention. A newly arrived image remains a temporary in-memory preview until the user presses **💾**. Old unsaved images remain on demand. Preview object URLs are revoked when the chat closes, the phone disconnects, the LotKeys account changes, or the page closes.

Only a deliberate **💾** action saves a copy to the contact's private Media folder. That retained copy is what allows a saved photo to remain viewable from its conversation message later.

## Performance and compatibility

The newest six messages still render first and older history still arrives in 20-message chunks. Scroll-boundary loading reuses the already-buffered chunk before requesting another Android history page.

This is a web-only update. Keep the signed V0.9.5.12 Android connector installed. No APK reinstall, permission change, account re-selection, or re-pairing is required.

## Release identifiers

- Web version: `0.9.5.16`
- Web build: `095016`
- Release: `live-mms-preview-scroll-history`
- Service worker cache: `lotkeys-app-v095016-live-mms-preview-scroll-history`
- Compatible Android version: `0.9.5.12-test`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095016`
