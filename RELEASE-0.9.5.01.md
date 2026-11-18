# LotKeys V0.9.5.01 — Numbered category unread badges

Released: 2026-09-25 22:10 MDT

## Included

- Separates Device category-chip unread totals from the three-category Important alert selection.
- Shows a high-contrast numbered badge on every Device category chip with live unread messages, even when the category is not starred Important.
- Keeps each numbered badge visible while its category filter is selected or unselected.
- Displays `1` through `99`, then `99+`; the chip's accessible label and tooltip retain the exact unread total.
- Continues counting unread subcategory conversations toward their parent category and supports conversations assigned to several categories.
- Keeps saved contacts without a live phone conversation at zero unread.
- Leaves the Hub bottom tab behavior unchanged: only the up-to-three starred Important categories produce category-coloured dots, and only while they have unread activity.
- Retains every V0.9.4.100 pairing-scope, Organize contrast, reminder, message, Store, and Android relay behavior.

## Verification target

- Receive an unread message in an unstarred category and confirm its category chip shows a numbered black badge in light theme and a numbered white badge in dark theme.
- Select and deselect that category filter and confirm the badge remains visible.
- Star the category and confirm its coloured Hub-tab dot appears; unstar it and confirm only the coloured Hub-tab dot disappears while the numbered category badge remains.
- Confirm a parent category total includes unread conversations assigned to its subcategories.
- Read the conversation and confirm the numbered chip badge and any matching Important Hub-tab dot disappear at zero unread.

## Release identity

- Version: `0.9.5.01`
- Build: `095001`
- Android version code: `95001`
- Android version name: `0.9.5.01-test`
- Channel: `test`
- Service worker cache: `lotkeys-app-v095001-category-unread-count-badges`
- Base: LotKeys V0.9.4.100 Important Hub alerts and pairing scope repair

Production `lot-keys.ca` is not changed by this TEST release.
