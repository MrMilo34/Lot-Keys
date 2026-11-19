# LotKeys TEST V0.9.5.19 — unified Bubble Chat and Hub controls

## Changes

- Holding Hub opens the most recently **replied-to** conversation across LotKeys Chat and connected Device SMS/MMS. Replying from Bubble Chat selects that conversation for the next hold. Outgoing texts confirmed by the connected phone also select their Device conversation.
- Connected Device conversations can be read and answered by SMS inside Bubble Chat. New phone messages update the open bubble so the conversation can continue while another screen remains open. Device history is fetched from the phone and held only in volatile browser memory.
- Incoming LotKeys and Device messages show a compact pop-up above Hub with the contact name and message text. Device previews use their Organization category color; tapping a preview opens that conversation in Bubble Chat. Muted LotKeys chats retain their notification setting.
- Centers the main-page reminder bell and enlarges the Hub bell while keeping urgency marks separate from the glyph.
- Places the Hub Alert, Calendar, Phone, and Add stack near the lower-right edge on PC and phone, with a gap from the scrollbar and bottom navigation. Order and spacing within the stack are unchanged.

## Compatibility and test limits

This is a web-only TEST update. Keep the installed V0.9.5.12 Android connector. Device Bubble Chat requires a connected phone; it does not add RCS or direct MMS sending. The browser preview works while LotKeys is open, not as a system-wide Android overlay or closed-app push notification. An MMS with no text is shown as a media-message placeholder inside the compact bubble; the full Device conversation retains its media controls.

## Identifiers

- Web version: `0.9.5.19`
- Build: `095019`
- Release: `unified-bubble-chat-hub-controls`
- Service worker cache: `lotkeys-app-v095019-unified-bubble-chat-hub-controls`
- Android connector: `0.9.5.12` (unchanged)
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095019`
