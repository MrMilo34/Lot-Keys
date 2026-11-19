# LotKeys TEST V0.9.5.23 — Hub-aware right-side message previews

## Changes

- Suppresses the colored incoming message preview while Hub is visible, including Device and LotKeys conversations. New replies continue to appear in the chat and existing unread tracking remains.
- Removes an already visible preview when Hub opens.
- Elsewhere, the preview starts at the Hub navigation button and fills only the right-side screen area, with a gap before the PC scrollbar. Its tail still points to Hub, and tapping it opens Bubble Chat.
- Leaves the existing PC notification sound behavior in place. The grey Android system heads-up is a phone notification separate from the web preview.

## Compatibility and test limits

This is a web-only TEST update on V0.9.5.22. The V0.9.5.12 Android connector and pairing remain unchanged. Confirm placement on a paired phone and PC during team testing.

## Identifiers

- Web version: `0.9.5.23`
- Build: `095023`
- Release: `hub-aware-right-side-previews`
- Service worker cache: `lotkeys-app-v095023-hub-aware-right-side-previews`
- Android connector: `0.9.5.12` (unchanged)
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095023`
