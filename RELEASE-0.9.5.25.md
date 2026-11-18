# LotKeys TEST V0.9.5.25 — Store switching and creation

## Changes

- The blue **Connected to Store ✓** button in Garage opens a Store connection menu. Disconnecting saves the current Store for a later reconnect, leaves its Drive files and membership in place, and keeps the Google sign-in, personal profile, Hub, phone connection, appointments and personal settings.
- Disconnect waits for Vehicle, Listing, deletion and contribution-request sync to finish. It then clears only the active Store's browser cache and settings. Inventory and Listings direct the user to Garage while disconnected.
- A signed-in LotKeys account can join an approved existing Store by code or create a fresh Store in its own Google Drive. The creator is Admin Level 2 only in that new Store. The new Store receives a generated code, separate folder and access files, empty Inventory and Listings, a new user roster and fresh contributor points. Built-in Store settings supply the defaults.
- A partially completed new Store setup can be retried with **Finish Store Setup**. Setup reports success only after its access record is written.

## Compatibility

The V0.9.5.12 Android connector and pairing stay as they are. This is a web-only TEST update. Close and reopen the installed web app after deployment to load the new service worker cache.

## Identifiers

- Web version: `0.9.5.25`
- Build: `095025`
- Release: `store-switch-and-creation`
- Service worker cache: `lotkeys-app-v095025-store-switch-and-creation`
- Android connector: `0.9.5.12` (unchanged)
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095025`
