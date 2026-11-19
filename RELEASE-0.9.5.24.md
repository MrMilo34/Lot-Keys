# LotKeys TEST V0.9.5.24 — persistent Hub reminder shortcut

## Changes

- Keeps the Hub reminder shortcut visible at all times so it opens the complete reminder list, including checked-off reminders.
- Greys out the bell and its button whenever there are no active reminders. The shortcut remains tappable, retains its position in the four-button stack, and regains its usual color when a reminder needs attention. The separate main-header alert retains its own visibility rule.
- Keeps the smaller bell glyph: 26px on desktop and 24px on narrow screens. The urgency mark stays separate.

## Compatibility and test limits

This is a web-only TEST update on V0.9.5.23. The V0.9.5.12 Android connector and pairing remain unchanged. Confirm appearance on a phone and PC during team testing.

## Identifiers

- Web version: `0.9.5.24`
- Build: `095024`
- Release: `hub-reminder-shortcut`
- Service worker cache: `lotkeys-app-v095024-hub-reminder-shortcut` (refreshed within the same version)
- Android connector: `0.9.5.12` (unchanged)
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095024`
