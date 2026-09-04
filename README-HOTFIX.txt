LotKeys v0.9.4.15.1 — Listing Sync Hotfix
==========================================

Purpose
-------
Fixes the cross-device Listings problem where a newer Listing can exist on one phone/browser but another LotKeys device continues showing an older list.

Root cause fixed
----------------
The v0.9.4.15 quick Listing refresh trusted Listings Index.json as if it were authoritative. A Listing JSON can successfully reach Store / Users / <User> / Listings while the index update is delayed/stale, causing another device to stop refreshing before it discovers the new Listing.

What this hotfix changes
------------------------
1. The actual Google Drive Listings folder is verified during Listing refresh; Listings Index.json is treated as a speed/cache layer only.
2. After a Listing saves to Drive, LotKeys performs a folder reconciliation so the index self-repairs.
3. On startup, local Listings left as local / pending / syncing / error (or with no Drive file ID) are retried once Google Drive is ready.
4. Existing v0.9.4.15 Management Updates, videos, winner crown, Listing UI and other app code are NOT replaced. This patch works through the service worker so it layers onto the currently deployed v0.9.4.15 index.html.
5. The visible app version becomes V0.9.4.15.1 once the hotfix service worker is controlling the page.

Deploy to GitHub Pages
----------------------
1. Unzip this package.
2. In the root of MrMilo34/Lot-Keys, replace ONLY sw.js with the sw.js from this package.
3. Commit the change.
4. Open LotKeys. Let the page finish loading for a moment, then reload it once (or close and reopen the tab/app).
5. Confirm the header/version card shows V0.9.4.15.1.
6. Check Listings on the phone and desktop. The newer Draft/Active records should reconcile from the Drive Listings folder.

Why this is patch-only
----------------------
The live GitHub build is already v0.9.4.15. Replacing index.html from an older downloadable build would risk rolling back the Management Updates/video fixes. This hotfix deliberately changes only sw.js and patches the live v0.9.4.15 page at load time.

Rollback
--------
Restore the previous v0.9.4.15 sw.js from GitHub history and reload the app.
