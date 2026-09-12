# LotKeys V0.9.4.72 platform info and cross-device Inventory checklist

- Upload every item inside the release ZIP directly to `Lot-Keys-TEST`, including both `lotkeys-info` files and the complete `extension/releases` folder. Keep `CNAME` absent.
- Open `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09472`; confirm the version strip and `version.json` report V0.9.4.72 / build `09472` / cache `lotkeys-app-v09472-platform-info-inventory-reconcile`.
- On the phone account, confirm the 2019 Ford Transit Connect is in Inventory and Listings. On the PC account/device, open Listings first and confirm the cached Listing appears immediately even if its cover starts blank.
- Without performing a full refresh, confirm the PC detects the Listing’s missing linked Vehicle Profile, adds the Transit to Inventory, and fills the Listing cover photo. Navigate to Inventory again and confirm it remains present.
- Create another Vehicle Profile on one device, wait for Drive processing, then open Inventory on the other device. Confirm the cached page paints first and the new Vehicle appears after the lightweight folder audit.
- Delete only a disposable test Vehicle through the normal Admin flow and confirm its stale cached card is removed on another device after reopening Inventory.
- Confirm an unchanged Inventory check remains fast and does not rescan every Vehicle Profile sheet.
- Create an Admin Vehicle with one document, at least six photos, and one video. Confirm the order remains **information → documents → photos → videos → finalizing**, photo percentages never move backward, and up to three photos transfer concurrently on a normal connection.
- Repeat a smaller photo upload with Android Data Saver or a simulated slow connection and confirm the safe sequential path completes.
- Interrupt the photo/video creation once by backgrounding Chrome. Return without pressing Sync and confirm saved resumable sessions continue without duplicate Drive files.
- From a light-themed account, open Akash’s dark public Profile. Confirm the modal, text, award area, listing area and buttons use Akash’s dark background/accent with readable contrast.
- Change the viewed user to a light theme with a different accent, reopen their public Profile, and confirm that viewed-user appearance replaces the viewer’s appearance.
- On a phone, confirm the version strip shows a compact LotKeys-logo button. On desktop, confirm it shows the logo plus **LotKeys Info**.
- Confirm a new LotKeys Info publication shows one red unread dot, opens one current message, supports heading/text/image/video/link/file blocks, and clears its dot after viewing.
- As the registered developer, open **Garage → Dev Tool Kit → LotKeys Info**. Add/reorder/delete blocks, preview, save a local draft, and download `lotkeys-info.json`. Confirm a normal Admin/user does not receive this editor.
- Publish the downloaded JSON only through the protected `MrMilo34/Lot-Keys` repository. Confirm a second Store/device receives the new message on visibility or within two minutes while its cached message opens immediately.
- Temporarily open an older cached custom-domain tab after the production repository has a newer `version.json`. Confirm it adds a current build cache-buster once and does not enter a reload loop.
- Remember that `Lot-Keys-TEST` and production `Lot-Keys` are separate deployments: updating TEST alone must not be described as updating `lot-keys.ca`.
- In Garage on desktop, press **Download Post Buddy ZIP** with a missing/404 local `extension/latest.json`. Confirm the bundled V0.1.14 ZIP still downloads and extracts successfully.
- Recheck normal Listings, Facebook Listing photo progress, gold Website Price feedback, saved Facebook locations, Chat, contribution cleanup, and first-profile duplicate cleanup from V0.9.4.71.
- Confirm Apps Script still reports Processor V0.9.4.64 with its existing time trigger. Do not reinstall solely for V0.9.4.72.

## Previous release checklist

# LotKeys V0.9.4.71 Listings rendering repair checklist

- Upload every item inside the release ZIP directly to the `Lot-Keys-TEST` repository root, then open `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09471` and confirm the version bar says V0.9.4.71.
- Confirm `version.json` reports version `0.9.4.71`, build `09471`, and cache `lotkeys-app-v09471-listings-progress-null-fix`.
- Confirm ordinary Listings without an active upload show their normal location/status/age and thumbnail—not **Cached Listing details need attention**.
- Open **Listings** with several cached Listings and confirm the controls/cards appear immediately. Missing cover photos may fill in afterward, but they must not delay navigation.
- Temporarily test a Listing whose cover cannot be read from Drive and confirm the remaining Listings still open and remain usable.
- Do not upload `CNAME` to `Lot-Keys-TEST`; preserve the production repository’s existing `CNAME` only when promoting the same build.
- In Google Cloud → Auth Platform → Audience, add the exact Google email of every tester. Verify a newly added real user can authorize without Error 403 after also being approved in LotKeys.
- As Admin Level 2, open Garage → Approved Users and confirm **Open Google OAuth Test Users ↗** opens project `lotkeys`’s protected Audience page in a new tab.
- As a newly approved ordinary user, create the first Vehicle Profile and switch tabs while the Processor finishes. Confirm only one healthy Inventory card remains, its upload marker clears from 95% to normal, and no duplicate **Needs Recovery** card appears.
- If that account already has a false recovery twin from V0.9.4.68, press **Refresh Inventory** once in V0.9.4.71 and confirm the twin disappears without deleting the official Vehicle Profile.
- On desktop, press **Download Post Buddy ZIP** in Garage and confirm the ZIP bundled with this LotKeys build downloads without a raw-GitHub error.
- Create or edit a Facebook Listing with Listing-only photos. Confirm its card shows phase, current filename, item number and percent, while the header shows **Sync 0–100%** beside the stoplight.
- Interrupt a Listing-only photo transfer once, return online, and confirm the resumable job completes without creating a duplicate Drive file.
- Press **Use Website Price** and confirm the button flashes gold with **Price Applied ✓** before returning to its normal label.
- Add, edit and delete a personal posting location. Confirm the heading says **My Saved Facebook Listing Locations**, `Account.json` changes, and a deleted location does not return after refresh or another device loads the account.
- Install `extension/releases/LotKeys-Facebook-Assistant-Beta-v0.1.14.zip`, reload LotKeys and Facebook once, and confirm the Helper version reads V0.1.14.
- Change the LotKeys user’s accent and light/dark appearance. Open or sync the Helper and confirm its panels, cards and main action colors follow that appearance.
- Run Fill Facebook Listing and confirm Location is last. If the saved option matches, confirm Facebook selects it and LotKeys scrolls to the final Next/Submit button without clicking it; otherwise confirm Location remains highlighted for the user.
- Confirm the URL/view area is masked until **Save / Use this Website** succeeds on a live `/marketplace/item/…` page, then unlocks and keeps the same Listing ready for a view count.
- Recheck Vehicle Profile photo uploads for regression only. V0.9.4.71 intentionally does not contain the next photo-speed optimization.
- Confirm Apps Script still reports Processor V0.9.4.64 and its existing time trigger. Do not reinstall solely for V0.9.4.71.

## Previous release checklist

# LotKeys V0.9.4.68 automatic fast synchronization and clean-request checklist

- Upload every item inside the release ZIP directly to the `Lot-Keys-TEST` repository root, then open `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09468` and confirm the version bar says V0.9.4.68.
- Confirm the `Lot-Keys-TEST` repository does **not** contain `CNAME`, so `https://mrmilo34.github.io/Lot-Keys-TEST/` remains an independent test address. Preserve the production repository’s existing `CNAME` only when promoting the release to `lot-keys.ca`.
- Confirm `https://mrmilo34.github.io/Lot-Keys-TEST/version.json` reports version `0.9.4.68`, build `09468`, and cache `lotkeys-app-v09468-automatic-fast-sync-clean-requests`.
- Open `https://mrmilo34.github.io/Lot-Keys-TEST/install.html` once and confirm it returns to the current LotKeys build.
- On the affected test account, open Garage, enter the supplied User / Sales Name and Store Code, and press **Save** or **Connect to Store**.
- Approve Google's updated Drive permission when prompted. Confirm the account reaches **Connected to Store ✓** instead of “Insufficient permissions for the specified parent.”
- As Admin Level 2, add each exact Google email under **Garage → Approved Users**, press **Repair Store Structure**, and confirm its `Users/<name>` folder contains `Listings`, `Listing Assets`, and `More`.
- Before updating Apps Script, open Garage as Admin Level 2 and confirm **Store Processor** identifies the old version (or says **Not detected**) and displays the update-required card.
- This is a browser-only hotfix. If `getLotKeysProcessorStatus` already reports V0.9.4.64 and `triggerInstalled: true`, do **not** reinstall Apps Script.
- In LotKeys press **Refresh Status** or reopen Garage. Confirm **Store Processor · V0.9.4.64 · current** appears and the update card is gone.
- In Google Drive, confirm ordinary and Trusted users are Viewer/Reader on Store and Inventory, Writer only on their own user workspace, and not Editor on official Vehicle Profile folders.
- Connect as an ordinary user and confirm Garage reaches **Connected to Store ✓** without asking management to share official Inventory as Editor.
- Before contributing media, open a Vehicle Profile and press **Open Your More Media Folder**. Confirm it only shows “You currently don’t have anything uploaded for this vehicle” and does not create a per-vehicle More folder.
- Submit an information-only correction. Confirm `Requests/Pending` is created for the request but no `Client Media`, `Photos`, `Videos`, or `Documents` folder is created.
- Submit one photo. Confirm LotKeys creates `Client Media/Photos` and keeps both `Videos` and `Documents` absent.
- During that photo submission, confirm the top stoplight label advances as **Sync NN%** and the Inventory card shows the current More phase or **More Photos 1 of 1 · filename · NN%** beneath **Syncing…**.
- Submit one video and then one document. Confirm `Videos` and `Documents` appear only after their respective submissions.
- Press **Open Your More Media Folder** again and confirm the populated Client Media folder opens. Confirm its cached link opens immediately on the next attempt and Drive verification continues in the background.
- Submit an ordinary user’s information correction and media. Confirm both appear for Administration review and official Inventory stays unchanged until approval.
- Approve selected fields/media and leave at least one unchecked. Confirm only checked items apply, points are awarded once, the request disappears without a manual refresh, approved media is copied into official Inventory, and every submitted media file remains in the user’s More folder.
- While applying that request, confirm the approval button, top stoplight area, and Inventory card visibly advance through request processing, official Vehicle Profile update, contribution points, and cleanup.
- As an Administrator, add two new photos directly to a Vehicle Profile. Confirm the card identifies each photo and item number while the top label advances from preparation through 100%.
- Repeat with one very small photo and confirm **100%** remains visible briefly before the header returns to its normal last-sync time.
- Interrupt an upload once, reopen LotKeys, and confirm the saved operation says **paused** rather than falsely continuing to animate. Resume it and confirm no percentage remains stuck after success or a handled error.
- Start two approvals close together, close the Vehicle Profile before they finish, and enter Chat. Wait at least one minute. Confirm the Vehicle Profile does not reopen over Chat or jump back to its loading/top position.
- While leaving the Vehicle Profile open, approve one request. Confirm only that open review refreshes, its Drive-loading splash does not repeat, and the page stays near the same scroll position.
- Confirm new More request workspaces contain only `Requests/Pending`; completed request JSON is removed instead of moved into Approved or Rejected folders.
- Submit a Trusted user information/price/Pending Deal correction. Confirm it applies after the processor runs, but Trusted photos/videos/documents still wait for Administration.
- Create a genuinely new vehicle as a regular user. Confirm it becomes creator-owned after processing; then confirm the creator can update its information/media without receiving Drive Editor access to Inventory.
- Attempt another profile with the same VIN (or, if no VIN, the same Stock Number). Confirm LotKeys blocks the duplicate claim and directs the user to the existing profile.
- Confirm only Administrators see direct Delete; other users submit a removal request.
- Cancel or deny a test connection and confirm Garage remains **Not connected** rather than retaining the attempted Store folder.
- Sign in as an ordinary new user and confirm **New Store Setup** is not shown.
- View a vehicle marked Pending Deal and confirm its Inventory ribbon reads **Deal / Pending**, stays inside the card, and retains the user's Accent Color.
- Create a complete Vehicle Profile containing at least one document, two photos and one larger video. Confirm progress runs in the order **Vehicle information → Documents → Photos → Videos → Finalizing**.
- After Documents and Photos finish and while the Video percentage is moving, switch from Chrome to a text-message app for at least ten seconds. Confirm LotKeys records the upload as paused without turning every Vehicle Profile unusable.
- Return to Chrome. Do not open the Vehicle Profile or press Sync. Confirm the same video resumes automatically from its acknowledged checkpoint, completed Documents/Photos are not uploaded again, and the Vehicle finishes at 100%.
- Open the interrupted Jeep and at least three unrelated Vehicle Profiles. Confirm all open immediately from the local cache, even while the Jeep is paused or retrying.
- Confirm an older V0.9.4.64 card with a network/media **Sync needs attention** state retries automatically after V0.9.4.68 starts. Permission or authorization errors must remain stopped for user action.
- Repeat the background test with a regular user submitting media through More. Confirm the partial request keeps the same request identity and produces no duplicate files after resuming.
- Open V0.9.4.68 once as each test user and confirm neither user says Setup pending. Keep both browsers open, send both directions, and confirm the sender paints immediately and the recipient receives the Chat message plus popup bubble within roughly 2–6 seconds without leaving the conversation.
- After the first message, confirm each sender has only one recipient-specific **LotKeys Live Messages** folder in their own Messaging Outbox. The recipient must have Reader access only to that encrypted lane; no Inventory permission changes are allowed.
- Run `processLotKeysRequests` twice. Confirm the second run does not deliver duplicate copies and does not log “insufficient permissions” while trying to trash another user’s Outbox message.
- On both accounts, open the exact Vehicle Profile that previously showed a card spinner and then stopped. Confirm its modal appears immediately. Repeat with several Inventory vehicles; photos/details may reconcile quietly afterward, but the card must not fail silently or leave “Opening vehicle profile…” indefinitely.
- Temporarily force a profile display exception in a development copy and confirm LotKeys displays **Could not open this profile** with **Try Again**, rather than returning silently to Inventory.
- Confirm both user profile photos and the previous monthly placement/crown appear in Chat and Store user views. This must also recover a user who already had `Profile Thumbnail.jpg` from an earlier build.
- Refresh unchanged Inventory twice and confirm the second check completes quickly from the local cache while Drive remains the source of truth.
- Run Repair Store Structure and confirm the stage label and percentage visibly advance to 100%.
- Reload once and confirm Awards, Chat, and staged synchronization progress still load from the V0.9.4.68 service-worker cache.
- If a dealership PC shows `ERR_CONNECTION_RESET` before any LotKeys page appears, retry that same URL on the PC through a phone hotspot. A hotspot success isolates the remaining issue to the dealership network, proxy, DNS filter, or security software rather than LotKeys browser code.

## Previous V0.9.4.56 checks

# LotKeys V0.9.4.56 stable filename checklist

- Upload the complete release and confirm the root contains `lotkeys-awards.js`, `lotkeys-messaging.js`, `CHECKSUMS.txt` and this permanent `TEAM-TEST-CHECKLIST.md` filename.
- Remove earlier root-level `lotkeys-awards-v*.js`, `lotkeys-messaging-v*.js`, `CHECKSUMS-V*.txt`, `TEAM-TEST-CHECKLIST-V*.md` and any stray `LotKeys-*-CNAME` file. Keep `CNAME`.
- Open `https://lot-keys.ca/?build=09456` and confirm the version bar says V0.9.4.56.
- Reload once and confirm Awards and Chat still load, proving the new service worker cached the permanent module names.
- Confirm `extension/latest.json` still downloads the versioned Post Buddy ZIP it names.
- Recheck the V0.9.4.55 Pending ribbon and the V0.9.4.54 Dev Tool Kit and phone/PC Post Buddy behavior.

## Previous V0.9.4.55 checks

- Open `https://lot-keys.ca/?build=09455` and confirm the version bar says V0.9.4.55.
- View a Pending Deal vehicle on a phone and confirm the Accent Color slash sits 4 px farther right.
- Confirm the slash joins the Pending box without the white triangular notch shown in V0.9.4.54.
- Confirm the Pending label remains inside the Inventory card and uses the current user Accent Color.
- Confirm non-pending vehicles do not show the ribbon or reserve extra space.
- Recheck the V0.9.4.54 Dev Tool Kit recipient, preview and Post Buddy phone/PC behavior.
