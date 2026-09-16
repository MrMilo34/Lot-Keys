# LotKeys V0.9.4.79 + Posting Buddy V0.1.20 team-test checklist

## Release identity
- Open `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09479`.
- Confirm version metadata reports **V0.9.4.79 / 09479**.
- Confirm service worker cache is `lotkeys-app-v09479-safe-editor-drafts`.
- Confirm Store Processor remains **V0.9.4.76** and does not need reinstalling.

## Vehicle Profile draft protection
- Start **Add Vehicle** and manually enter Year / Make / Model / price / odometer / VIN / stock / description and CARFAX selections.
- Wait about one second, then refresh the browser while the Vehicle editor is still open.
- Confirm LotKeys boots and automatically reopens the unfinished Vehicle editor.
- Confirm the entered fields are restored.
- Confirm a recovery toast reminds the tester to reselect any unsaved files if needed.
- Close an unfinished Vehicle editor using X, then open Add Vehicle again. Confirm LotKeys offers **Resume** or **Discard**.
- Save the Vehicle successfully, reopen Add Vehicle, and confirm the saved draft no longer appears.
- Repeat with an existing Vehicle edit and verify the saved Inventory record is not changed until Save Vehicle is pressed.

## Marketplace Listing draft protection
- Start a new Listing manually and enter title, price, odometer, Facebook details, location, description, status and URL.
- Select/reorder Vehicle Profile photos.
- Refresh while the Listing editor is still open.
- Confirm the editor automatically reopens and restores the manual fields plus the saved Listing photo selection/order state.
- Close an unfinished Listing with X, then reopen the same Create/Edit flow and confirm Resume / Discard is offered.
- Save the Listing and confirm the temporary local draft is removed.

## Update/reload regression
- While a Vehicle or Listing editor is open, deploy a newer Service Worker/build to the TEST branch or force `registration.update()` from DevTools.
- Confirm LotKeys **does not reload or jump to Home** when `controllerchange` fires.
- Confirm the current form remains editable.
- Confirm the newer build takes effect after the tester manually refreshes/reopens LotKeys.

## Existing behavior regression
- Confirm the relocated **Mark Vehicle as Pending** control still saves correctly.
- Confirm More Media still stays grey until the signed-in user has an existing More Media folder/content for the Vehicle.
- Confirm Inventory and Listings still refresh quietly on their due interval and do not interrupt an open modal.
- Confirm normal Vehicle/Profile media uploads and background sync still work after Save.

## Posting Buddy package
- Confirm `extension/latest.json` reports **V0.1.20**.
- Confirm the bundled ZIP has `manifest.json` at its root and reports V0.1.20.
- Confirm **Open Listing** only opens the saved Facebook URL and does not automatically enter Edit mode.
- Confirm the user can navigate to another Facebook Marketplace listing, open Facebook's Edit Listing screen, and then use **Update Selected Items**.
