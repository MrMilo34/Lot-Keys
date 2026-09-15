# LotKeys V0.9.4.78 + Posting Buddy V0.1.18 team-test checklist

## Deploy / version
- Upload the complete ZIP to `Lot-Keys-TEST`; keep `CNAME` absent.
- Open `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09478`.
- Confirm header/version metadata report **V0.9.4.78 / 09478** and service worker cache `lotkeys-app-v09478-more-media-selective-posting`.
- Confirm Garage still reports **Store Processor V0.9.4.76 current**. Do not reinstall Apps Script solely for this release.
- Install/reload Posting Buddy **V0.1.18** and reload both LotKeys and Facebook tabs once.

## Preserve V0.9.4.77 behavior
- Edit a Vehicle Profile and confirm **Mark Vehicle as Pending** remains in the approved location above Photos.
- Toggle only Pending and confirm the lightweight state update still completes without a full Profile media rescan.
- Confirm normal Inventory/Listings navigation remains cache-first and does not rewrite untouched Listings.

## Vehicle Profile More Media
- Open a Vehicle Profile where the signed-in user has never submitted More Media. Confirm **Open Your More Media Folder** is visible, grey and disabled, with no extra surrounding bubble/card.
- Confirm merely opening the Vehicle Profile does **not** create a new Vehicle More Media folder.
- Open a Vehicle Profile where the same signed-in user has previously submitted photo/video/document content. Confirm the button becomes blue/enabled after the existing-folder check and opens that user's More Media folder.
- Confirm the button never exposes another user's More Media folder.

## Posting Buddy speed layout
- Confirm LotKeys/Facebook connection state plus extension version/update controls use the compact top strip.
- Select a new Listing. Confirm the four controls run horizontally: **Video · Photos · Description · Details**.
- Confirm new Listing defaults are Video OFF, Photos ON, Description ON, Details ON.
- Confirm selecting a Listing with a saved Facebook URL changes the mode to **Update** and defaults all four sections OFF.
- Confirm the action button remains disabled until at least one section is chosen.

## New Facebook post
- Post a Listing with Video OFF. Confirm video bytes are not downloaded and normal photo/field transfer speed is not delayed by video.
- Confirm Posting Buddy still never clicks Facebook's final Next/Publish button.
- Finish publishing manually, open the live Marketplace item and press **Save / Use this Website**.
- Confirm the URL writes back to LotKeys.
- Confirm **Back to Listings** returns directly to the Listings picker and clears the finished timer/session instead of showing the previous green-check completion screen again.

## Video discovery / parallel preparation
- Use a Vehicle Profile with an approved video at 60 seconds or less. Confirm it appears in the early Video selector with its duration before downloading.
- Use a Vehicle where the signed-in user has an eligible video only in that user's existing More Media / pending submission. Confirm it also appears and is labelled as the user's pending More Media when applicable.
- Confirm videos over 60 seconds or without ready Drive duration metadata cannot be selected.
- Select Video plus normal post fields. Confirm video preparation begins while Facebook fields/photos are being filled and the selected video is added last.
- Force a video failure and confirm already-filled fields/photos remain in place.

## Selective update mode
- Use a Listing with a valid saved Facebook Marketplace item URL. Select only **Video** and start Update. Confirm Posting Buddy opens the existing Facebook Listing/Edit flow, leaves photos/description/details untouched, and adds only the chosen video.
- Repeat selecting only **Description** or only **Details** and confirm unchecked sections are not cleared or overwritten.
- For **Photos** update, confirm Posting Buddy prepares every replacement LotKeys photo before touching existing Facebook photos.
- If Facebook exposes safe photo-removal controls, confirm the saved LotKeys Listing photo set/order replaces the Facebook photo set rather than appending duplicates.
- If Facebook does not expose safe replacement controls, confirm Posting Buddy leaves the existing Facebook photos unchanged and asks for manual review.
- Confirm Posting Buddy never presses Facebook's final Save/Update button; the user finishes the update manually.

## Package integrity
- Confirm the Buddy ZIP has `manifest.json` at its root and reports V0.1.18.
- Confirm the LotKeys ZIP contains only `extension/latest.json`, `extension/README.md`, and the current V0.1.18 release ZIP under `extension/` (no old Buddy ZIPs or unpacked source).
- Verify `CHECKSUMS.txt` after the final ZIP is produced.
