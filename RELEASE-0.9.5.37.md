# LotKeys TEST V0.9.5.37

Cached Store logos are now scoped to the current Store folder and Google account. The cache keeps its source file ID, Administration folder, image bytes and source version together, so overwriting metadata cannot make an old dealership image appear current. Legacy unscoped images are hidden until verified against the active Store. Temporary lookup failures retain an already verified current-Store cache.

Logo reads, replacements and removal validate that the image belongs to the current Store's Administration folder. Accessible foreign logos cannot be displayed, overwritten or trashed by those actions. A response arriving after the Store or account changes cannot commit its image. An explicit LotKeys-default setting clears stale branding instead of skipping refresh. Store Access and private configuration reads reject an explicit mismatched Store folder ID.

The distributed Processor V0.9.4.77 no longer contains the old Infiniti folder ID. It reads the saved lotkeysStoreFolderId Script property, preserves it when installing upgrades, and stops on missing or conflicting configuration. Existing correctly configured V0.9.4.76 installations remain compatible; the website's minimum version remains unchanged. This release does not remotely edit installed Apps Script projects. Updated setup instructions explain the persistent binding.

Startup no longer creates the South Edmonton sample posting location, and first-run guidance uses the dealership's supplied Store Code. Existing personal locations, saved Store choices and the public directory entry for existing Infiniti users are retained. The directory is used only for an explicitly entered matching Store Code and is not a startup default.

## Phone wake-up status

Push-to-wake is not active in this release. FCM delivery is no-cost, but the secure sender endpoint, native registration and real locked-phone wake testing are not configured or completed. The current working phone relay remains unchanged. The user's zero-spend constraint applies: do not activate billing or silently replace push with slower polling.

## Use

Refresh LotKeys TEST and confirm V0.9.5.37. The current Store's verified logo or the LotKeys default should appear. No Android connector or Posting Buddy reinstall is required. A working Store Processor does not need reinstallation for this browser fix. If upgrading the Processor intentionally, keep the existing Apps Script project and verify its saved Store binding before running the installer.

This release retains the V0.9.5.36 website recognition, Legacy sale-price, upload recovery and personal-settings fixes. Go Auto recognition remains supported. No live user Drive records, memberships, installed processor or billing settings were edited during this release task.
