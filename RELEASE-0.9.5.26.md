# LotKeys TEST V0.9.5.26 — Store sync and disconnect recovery

## Changes

- Garage disconnect now stops active Store refreshes and uploads through a brief page reload when needed. The saved disconnect resumes before background work starts, avoiding the recurring “wait for sync” block.
- Unfinished Vehicle Profiles, Listings, pending Listing deletions, contribution requests and local analytics remain in this browser, tied to the same Google account and Store root. They do not move to a newly created Store. Reconnecting to the former Store restores them for retry.
- Returning to the app and opening Garage respect the five-minute Inventory refresh interval, reducing repeat refreshes. The header calls read-only Inventory and Listing work **Refreshing…**. Active uploads still show their progress and actual sync errors still require attention.
- Personal account settings, Hub, appointments and phone pairing remain connected. The Android connector is unchanged.

## Compatibility and identifiers

- Web version: `0.9.5.26`, build `095026`, release `store-sync-disconnect-recovery`.
- Service worker cache: `lotkeys-app-v095026-store-sync-disconnect-recovery`.
- Android connector: `0.9.5.12` (unchanged).
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095026`.

Unfinished Store work remains on the device and browser where it was created until it uploads. Avoid clearing browser site data before reconnecting to recover it.
