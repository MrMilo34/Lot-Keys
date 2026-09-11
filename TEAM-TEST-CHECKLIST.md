# LotKeys V0.9.4.65 Vehicle Profile repair + instant Chat checklist

- Upload every item inside the release ZIP directly to the GitHub repository root, then open `https://lot-keys.ca/?build=09465` and confirm the version bar says V0.9.4.65.
- Confirm the repository root contains the exact file `CNAME` beside `index.html`; it must contain only `lot-keys.ca`.
- Confirm `https://lot-keys.ca/version.json` reports version `0.9.4.65`, build `09465`, and cache `lotkeys-app-v09465-vehicle-profile-scope-repair`.
- Open `https://lot-keys.ca/install.html` once and confirm it returns to the current LotKeys build.
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
- Submit one video and then one document. Confirm `Videos` and `Documents` appear only after their respective submissions.
- Press **Open Your More Media Folder** again and confirm the populated Client Media folder opens. Confirm its cached link opens immediately on the next attempt and Drive verification continues in the background.
- Submit an ordinary user’s information correction and media. Confirm both appear for Administration review and official Inventory stays unchanged until approval.
- Approve selected fields/media and leave at least one unchecked. Confirm only checked items apply, points are awarded once, the request disappears without a manual refresh, approved media is copied into official Inventory, and every submitted media file remains in the user’s More folder.
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
- Open V0.9.4.65 once as each test user and confirm neither user says Setup pending. Keep both browsers open, send both directions, and confirm the sender paints immediately and the recipient receives the Chat message plus popup bubble within roughly 2–6 seconds without leaving the conversation.
- After the first message, confirm each sender has only one recipient-specific **LotKeys Live Messages** folder in their own Messaging Outbox. The recipient must have Reader access only to that encrypted lane; no Inventory permission changes are allowed.
- Run `processLotKeysRequests` twice. Confirm the second run does not deliver duplicate copies and does not log “insufficient permissions” while trying to trash another user’s Outbox message.
- On both accounts, open the exact Vehicle Profile that previously showed a card spinner and then stopped. Confirm its modal appears immediately. Repeat with several Inventory vehicles; photos/details may reconcile quietly afterward, but the card must not fail silently or leave “Opening vehicle profile…” indefinitely.
- Temporarily force a profile display exception in a development copy and confirm LotKeys displays **Could not open this profile** with **Try Again**, rather than returning silently to Inventory.
- Confirm both user profile photos and the previous monthly placement/crown appear in Chat and Store user views. This must also recover a user who already had `Profile Thumbnail.jpg` from an earlier build.
- Refresh unchanged Inventory twice and confirm the second check completes quickly from the local cache while Drive remains the source of truth.
- Run Repair Store Structure and confirm the stage label and percentage visibly advance to 100%.
- Reload once and confirm Awards, Chat, and the new connection behavior still load from the V0.9.4.65 service-worker cache.
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
