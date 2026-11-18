# LotKeys V0.9.4.99 — Category and Listing reorder hotfix

## Included

- Replaces the category editor's desktop-only native drag path with pointer-driven mouse and touch movement.
- Adds a bottom-left physical ☰ overlay grip, moving row preview and before/after drop cues to every category card.
- Rewrites category `order` values after both drag and arrow moves so the visible arrangement persists through repaint and Drive save.
- Makes the Listing photo grid inherit Inventory's tile and centered-handle layout.
- Removes the Listing-only transform delay and skips scroll-restoration work after a completed photo drag.
- Preserves the agreed Listing contract: one grid, tap-to-toggle without relocation, grey unselected tiles, selected-only Cover/sequential numbering, and a 20-selected-photo limit.
- Retains V0.9.4.98 change-aware phone monitoring, stable Hub cards and linked Vehicle Profile thumbnails.

## Verification target

- Open Hub → Device → Organize on Android and drag a category from its bottom-left ☰ grip. Confirm the moving card follows the finger, the row changes position, and the same order remains after **Save organization** and reopen.
- Use the ↑/↓ fallback controls and confirm those moves also persist.
- Edit a Marketplace Listing, drag selected and unselected photos, and confirm movement feels the same as Inventory.
- Tap a photo off and on. Confirm its tile never changes page position, selected numbering recalculates around grey unselected tiles, the first selected photo is `1 · Cover`, and the selected count never exceeds 20.

## Release identity

- Version: `0.9.4.99`
- Build: `09499`
- Channel: `test`
- Service worker cache: `lotkeys-app-v09499-category-listing-reorder-hotfix`
- Base: LotKeys V0.9.4.98 Hub refresh change-detection hotfix

Production `lot-keys.ca` is not changed by this TEST release.
