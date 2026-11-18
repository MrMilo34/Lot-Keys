# LotKeys V0.9.5.33 — Inventory workspace recovery

Vehicle sync could stop at 2% because shared Store setup required personal listing migration. A stale source-folder reference therefore blocked Inventory before its vehicle folders, sheet or media upload were prepared. Store setup and Inventory now use the Store workspace independently; listing operations explicitly initialize personal listing storage.

Missing approved-user workspace folders are rediscovered or rebuilt by the existing authorized Store setup. Old structure caches are rechecked on the first V0.9.5.33 setup, concurrent setup requests share one repair, and the resulting folder IDs are written through the normal Store configuration path. A 403, trashed folder, wrong folder type or folder outside the expected parent stops repair rather than silently replacing it. Existing membership and administration rules still apply.

When the legacy listing workspace changes, device-saved listings are marked pending before a Drive refresh can treat them as remotely deleted. Their wording, price, status, Facebook URL, photo order and local photo blobs are retained. A missing listing JSON can be recreated in the user's personal per-dealership listing folder; a permission failure remains an error. A missing original listing photo with no surviving device copy is reported and needs restoration or reattachment. Recreating a folder does not recover permanently deleted file contents.

The personal Account Storage folder, its Store-specific listing location, completed listing migrations, official Inventory, existing website recognition and prior messaging fixes remain. Android connector V0.9.5.12 and Store Processor V0.9.4.76 are unchanged.

## Resume the affected vehicle

1. Reopen the TEST page on the device holding the vehicle's photos and video, and confirm **V0.9.5.33**.
2. Open the affected Vehicle Profile and press **Sync Vehicle**.
3. If a listing reports an unavailable original photo, restore that file from Drive Trash or add the original photo again. Keep the device's local data until recovery is complete.

See [the verification record](LotKeys-0.9.5.33-Test-Report.md). No processor or Android reinstall is required for this web correction. A physical-device upload remains a user verification step because its media are stored on that device.
