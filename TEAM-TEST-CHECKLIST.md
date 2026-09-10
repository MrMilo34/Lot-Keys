# LotKeys V0.9.4.60 secure Store + More checklist

- Upload every item inside the release ZIP directly to the GitHub repository root, then open `https://lot-keys.ca/?build=09460` and confirm the version bar says V0.9.4.60.
- Confirm the repository root contains the exact file `CNAME` beside `index.html`; it must contain only `lot-keys.ca`.
- Confirm `https://lot-keys.ca/version.json` reports version `0.9.4.60`, build `09460`, and cache `lotkeys-app-v09460-least-privilege-more`.
- Open `https://lot-keys.ca/install.html` once and confirm it returns to the current LotKeys build.
- On the affected test account, open Garage, enter the supplied User / Sales Name and Store Code, and press **Save** or **Connect to Store**.
- Approve Google's updated Drive permission when prompted. Confirm the account reaches **Connected to Store ✓** instead of “Insufficient permissions for the specified parent.”
- As Admin Level 2, add each exact Google email under **Garage → Approved Users**, press **Repair Store Structure**, and confirm its `Users/<name>` folder contains `Listings`, `Listing Assets`, and `More`.
- Install the bundled Store Processor using `PROCESSOR-SETUP.md`; confirm `getLotKeysProcessorStatus` says `triggerInstalled: true`.
- In Google Drive, confirm ordinary and Trusted users are Viewer/Reader on Store and Inventory, Writer only on their own user workspace, and not Editor on official Vehicle Profile folders.
- Connect as an ordinary user and confirm Garage reaches **Connected to Store ✓** without asking management to share official Inventory as Editor.
- Open any Vehicle Profile and confirm **View Your More Media Folder** opens that user’s per-vehicle Client Media folder.
- Submit an ordinary user’s information correction and media. Confirm both appear for Administration review and official Inventory stays unchanged until approval.
- Approve the contribution. Confirm approved media is copied into official Inventory while the user’s More copy remains available.
- Submit a Trusted user information/price/Pending Deal correction. Confirm it applies after the processor runs, but Trusted photos/videos/documents still wait for Administration.
- Create a genuinely new vehicle as a regular user. Confirm it becomes creator-owned after processing; then confirm the creator can update its information/media without receiving Drive Editor access to Inventory.
- Attempt another profile with the same VIN (or, if no VIN, the same Stock Number). Confirm LotKeys blocks the duplicate claim and directs the user to the existing profile.
- Confirm only Administrators see direct Delete; other users submit a removal request.
- Cancel or deny a test connection and confirm Garage remains **Not connected** rather than retaining the attempted Store folder.
- Sign in as an ordinary new user and confirm **New Store Setup** is not shown.
- View a vehicle marked Pending Deal and confirm its Inventory ribbon reads **Deal / Pending**, stays inside the card, and retains the user's Accent Color.
- Reload once and confirm Awards, Chat, and the new connection behavior still load from the V0.9.4.60 service-worker cache.
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
