# LotKeys V0.9.4.80 + Posting Buddy V0.1.22 team-test checklist

## Build / cache
- Open `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09480`.
- Confirm version metadata reports **V0.9.4.80 / 09480**.
- Confirm service worker cache is `lotkeys-app-v09480-parallel-media-replacement-posting`.
- Confirm V0.9.4.79 unfinished editor drafts still Resume / Discard and active editors are not force-reloaded by an app update.

## Vehicle Profile media speed
- Edit an existing Vehicle Profile and add at least 2 photos plus one 45–60 second video.
- After Documents complete, confirm photo progress and video progress can overlap rather than video waiting for the entire photo stage.
- Confirm photos still use the existing bounded worker queue and preserve master order.
- Confirm active video progress shows transferred MB / total MB.
- Navigate elsewhere in LotKeys while upload continues; confirm progress remains visible and no duplicate media is created.
- Background/foreground Chrome once during a large upload and confirm resumable recovery continues from the saved Drive checkpoint.

## Posting Buddy V0.1.22
- Confirm `extension/latest.json` reports **V0.1.22** and points to `LotKeys-Facebook-Assistant-Beta-v0.1.22.zip`.
- Confirm a new Facebook Listing defaults Video + Photos + Description + Details ON when an eligible video is available.
- Confirm an existing Listing defaults all update sections OFF.
- On an existing Facebook Edit Listing page, select Photos and change LotKeys photo order. Confirm Posting Buddy prepares the replacement set first, removes existing Facebook photos, then uploads the current LotKeys set in the saved order without appending duplicates.
- If Facebook photo-removal controls are unavailable, confirm Posting Buddy leaves the current Facebook photos untouched and marks Photos for manual review.
- Select Description and/or Details for an update. Confirm Model, Mileage, Price and Description are cleared then replaced, while dropdown details are changed to the new selected values.
- Confirm V0.1.21 large-video chunk transfer still works for a file that previously exceeded Chrome's 64 MiB messaging limit.
- Confirm Open Listing remains only a shortcut; Update Selected Items works from any Facebook Edit Listing page the user intentionally opened.

## Processor
- Garage should still report **Store Processor V0.9.4.76** current. No Apps Script reinstall is expected for V0.9.4.80.
