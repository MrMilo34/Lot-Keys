# LotKeys V0.9.4.100 — Important Hub alerts and pairing scope repair

Released: 2026-09-25 21:21 MDT

## Included

- Adds a ⭐ Important toggle beside every Device category and subcategory colour control.
- Persists `important: true` through rename, recolour, reorder and parent changes, keeps the first three selections in saved order, and blocks a fourth selection with clear guidance.
- Keeps the existing blue all-unread Hub badge and adds up to three smaller category-coloured unread dots beneath it.
- Counts current live Device unread messages only, including subcategory unread under an Important parent and conversations assigned to several categories.
- Shows a black alert dot on unread Important category chips in light theme and a white alert dot in dark theme.
- Renames the filter action to **🗂️ Organize**, with black/white light-theme contrast and white/black dark-theme contrast.
- Keeps Hub unread indicators current while another main tab or conversation is open without repainting the full Hub view.
- Adds `https://www.googleapis.com/auth/drive.appdata` to browser authorization beside Store Drive access and validates both permissions before caching the session token.
- Replaces raw requested-space, insufficient-scope and relay network errors with useful phone-pairing recovery instructions while retaining diagnostic status/cause information.
- Retains every V0.9.4.99 category-ordering, Listing photo-movement, reminder, message, Store and Android relay behavior.

## Verification target

- Star one, two and three categories; confirm a fourth is blocked, then reload and verify all three selections persist.
- Receive and read Device messages in the selected categories. Confirm the main total badge remains accurate, category dots appear/disappear, parent/subcategory behavior is correct, and saved contacts without a live conversation remain at zero.
- Confirm **🗂️ Organize** and category alert dots use the requested light/dark contrast.
- On the phone, run **Prepare PC pairing**, complete the refreshed Google consent, and confirm the requested-spaces failure no longer appears.
- From the PC, send a pairing request using the same Google account and confirm the phone receives it.

## Release identity

- Version: `0.9.4.100`
- Build: `094100`
- Android version code: `94100`
- Android version name: `0.9.4.100-test`
- Channel: `test`
- Service worker cache: `lotkeys-app-v094100-important-alerts-pairing-scope`
- Base: LotKeys V0.9.4.99 category and Listing reorder hotfix

Production `lot-keys.ca` is not changed by this TEST release.
