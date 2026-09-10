# LotKeys V0.9.4.58 Store Code connection checklist

- Upload the complete release, then open `https://lot-keys.ca/?build=09458` and confirm the version bar says V0.9.4.58.
- On the affected test account, open Garage, enter the supplied User / Sales Name and Store Code, and press **Save** or **Connect to Store**.
- Approve Google's updated Drive permission when prompted. Confirm the account reaches **Connected to Store ✓** instead of “Insufficient permissions for the specified parent.”
- Confirm the Store contains or creates the registered user's folder under `Users`, with `Listings` and `Listing Assets` inside it.
- If the app reports that the account cannot add files, confirm management shared the root Store folder with that exact Google account as **Editor**; OAuth Test User status alone does not grant Drive folder editing.
- Cancel or deny a test connection and confirm Garage remains **Not connected** rather than retaining the attempted Store folder.
- Sign in as an ordinary new user and confirm **New Store Setup** is not shown.
- View a vehicle marked Pending Deal and confirm its Inventory ribbon reads **Deal / Pending**, stays inside the card, and retains the user's Accent Color.
- Reload once and confirm Awards, Chat, and the new connection behavior still load from the V0.9.4.58 service-worker cache.

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
