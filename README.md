# LotKeys V0.9.4.79

V0.9.4.79 is a focused reliability update built directly on V0.9.4.78. Its job is to protect a salesperson who is halfway through manually creating or editing a Vehicle Profile or Marketplace Listing.

## What changed

- **No surprise update reloads:** a newer LotKeys build or Service Worker is staged without replacing/reloading the active page. The current session stays intact until the user naturally refreshes or reopens LotKeys.
- **Vehicle Profile drafts:** manual fields, switches and key photo-order state are saved locally while the form is being edited.
- **Marketplace Listing drafts:** Listing fields plus Listing photo selection/order are saved locally while the form is being edited.
- **Automatic recovery after a real reload:** if a Vehicle/Listing editor was active when the page was unloaded, LotKeys reopens that editor and restores its draft on the next boot.
- **Resume later:** closing an unfinished editor keeps the draft for up to 7 days. Opening that same Create/Edit flow offers Resume or Discard.
- **Successful saves clean up:** saved Vehicle Profiles, contribution requests and Listings delete the temporary local draft.
- **File-picker limitation:** browser-selected files that were never saved may need to be selected again after a full reload; the recovered form warns the user.
- **Posting Buddy V0.1.20 bundled:** the current speed-first selective Posting Buddy is included so this LotKeys release does not point users back to an older extension.
- **Store Processor unchanged:** V0.9.4.76 remains current.

## Team test

Upload the ZIP into `Lot-Keys-TEST`, keep `CNAME` absent, and open `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09479`. Test a partially completed Vehicle Profile and a partially completed Marketplace Listing, then trigger a browser refresh/reload and confirm the active editor returns with its manually entered values. Also leave each form using the X button and confirm reopening offers Resume / Discard.
