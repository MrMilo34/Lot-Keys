# LotKeys V0.9.5.03 — Hub blocking and Interested Vehicle shortcuts

## Included

- Moves **Unsorted** into the Device organization row directly after **All Device**.
- Replaces **Saved contacts** with **📵 Blocked**.
- Adds **📵 Block Number / Unblock Number** to the new/edit Contact form and saved Contact details.
- Lists both saved Contacts and unsaved numbers in Blocked and preserves a blocked number when its Contact record is deleted.
- Excludes blocked Device numbers from normal Hub lists, unread totals, numbered category badges and starred Important-category alert dots.
- Keeps **Interested Vehicle**, **💾 Media** and **💬 Chat** on one Contact shortcut row.
- Adds a compact **+ Interested Vehicle** card to Device-chat headers that do not yet have a vehicle.
- Searches Vehicle Profiles by year, make, model, stock or VIN and also accepts a custom typed Interested Vehicle using the existing Contact fields.
- Retains V0.9.5.02 unread acknowledgement behavior.

## Blocking boundary

Blocked is a private LotKeys Hub state stored with phone-number organization. It hides the number from normal Hub views and Hub alerts without deleting phone history. The existing Android messaging application continues to control phone-level blocking and notifications.

## Release identifiers

- Version: `0.9.5.03`
- Build: `095003`
- Service worker: `lotkeys-app-v095003-hub-blocking-vehicle-shortcuts`
- Android version name: `0.9.5.03-test`

## Verification

- JavaScript syntax checks for the web, Hub, messaging and phone layers.
- Full Node test suite, including blocked filtering, unread suppression, phone-sorting persistence and the release contract.
- Android `assembleDebug` and `lintDebug` through GitHub Actions.
