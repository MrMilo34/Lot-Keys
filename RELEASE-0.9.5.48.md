# LotKeys TEST 0.9.5.48 — Inventory media recovery

Full galleries continue into open Vehicle Profiles and Listing photo pickers after
slow metadata/download responses. Three independent photo workers keep later images moving when one is slow; loading counts,
failed-folder preservation and Retry keep incomplete galleries visible. Selected
photo IDs are reconciled without replacing typed Listing fields.

Owner submissions checkpoint each accepted file. The final request uses a reserved
Drive ID and bounded API calls, so a lost response can be checked and resumed without
creating a second request. New edits retain a separate request identity. Queued local
work stays protected until the processor's receipt confirms publication.

Processor 0.9.4.78 records terminal status before cleanup, preventing a Google trash
permission denial from replaying an already applied save. Pending requests run in
creation order, and completed receipts cannot exhaust the processing limit. The
existing LW-034 project received only these completion/queue changes, keeping its
binding, manifest, trigger, credentials and sharing roles.

## Phone and PC checks

1. Reopen/refresh LotKeys TEST and confirm 0.9.5.48. Keep Android .46 installed;
   do not uninstall, clear data, reimport photos or edit the same Vehicle on two
   devices at once while its existing submission is being recovered.
2. As a regular user, open an established Inventory Vehicle. Verify the full gallery
   appears, including photos arriving after a slow connection. Retry a failed load.
3. Create a Listing from that Vehicle. Select multiple Inventory photos, type title/
   description, and verify late photo loading preserves the selected photos and text.
   Save and reopen the Listing to verify those selections remain.
4. On the device holding an interrupted own Vehicle upload, resume its saved work.
   Confirm accepted photos are reused, final submission completes, and Awaiting
   Inventory publication changes only after the processor confirms it.
5. Refresh another user's Inventory and verify the new/updated Vehicle facts and
   shared photos. Compare with the creator's phone and PC before calling it solved.

Google Drive's Android app is not required: this path uses authenticated Drive APIs.
Slow multi-megabyte originals still take time. These web fixes do not establish that
an ordinary-user upload runs continuously while Android suspends its browser; the
existing native background handoff and device tests remain distinct.

## Rollback

Retain the .47 Git commit 025ecc2f7ef0860b7d0a0bcc5cd9a289c0cb7b80 and create a
TEST-only revert through normal checks if needed. Do not clear IndexedDB, local
checkpoints or retained originals. Keep processor .78 terminal receipts: reverting
the cleanup fix would reintroduce replay for any unremoved pending requests.
Use the existing project's history for code recovery only after reviewing pending
requests; never rebind the processor, broaden regular users to Editor, or deploy
it as a public web app. Production and the signed .46 APK remain unchanged.
