# LotKeys V0.9.5.15 — Device MMS previews and organized media

## What changed

- Image attachments in Device SMS/MMS bubbles now offer **View photo**.
- The image is fetched from the connected Android phone only after the user requests it and is displayed directly in the conversation.
- A second tap opens the temporary photo at full modal size.
- Previewing does not add the image to the contact's private Drive folder. The existing **💾** attachment control remains the deliberate retention action.
- Temporary preview URLs are revoked when the conversation closes, the phone disconnects, the account changes, or the page closes.
- Device chats now include **💾 Media** beside Notes, Questions, Call, Booking, and Organize.
- The contact media window now separates saved files into **Photos** and **Documents**, with a count and empty state for each section.
- Photo classification uses both MIME type and filename, so HEIC/HEIF images still appear under Photos when Android or Drive reports a generic MIME type.

## Performance and compatibility

Photo bytes are not fetched while the chat opens. The user must press **View photo**, preserving V0.9.5.14's newest-six-first opening path, warm first-page cache, older-message chunks, and live refresh behavior.

This is a web-only update. Keep the signed V0.9.5.12 Android connector installed. No APK reinstall, permission change, account re-selection, or re-pairing is required.

## Honest limitation

Inline display depends on the current browser being able to decode the MMS image format. When it cannot—commonly with some HEIC/HEIF files—LotKeys reports that the preview is unavailable and leaves the explicit **💾** save path available. It does not silently convert or retain the image.

## Release identifiers

- Web version: `0.9.5.15`
- Web build: `095015`
- Release: `device-mms-preview-media-sections`
- Service worker cache: `lotkeys-app-v095015-device-mms-preview-media-sections`
- Compatible Android version: `0.9.5.12-test`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095015`

