# LotKeys TEST V0.9.5.36

The supplied RAV4 recording showed an unavailable warning despite VIN, year, make and model matches. Missing stock or VIN fields are now inconclusive evidence. One exact matching identifier plus supporting vehicle details can verify the primary vehicle, provided there are no contradictory parsed fields. Explicit sold/removed messages and conflicting primary identities remain checked. Stock identifiers use whole-value matching, and recommended vehicles cannot identify the primary vehicle.

Legacy Price remains the sale price. Price backchecks require explicit current sale labels and refuse sticker prices, ambiguous values and recommended-vehicle values. Existing Legacy and Go Auto import checks are retained. Successful exact-URL fact reads are shared briefly, reparsed for each expected identity, and bypassed for forced checks. Failed reads are not cached.

Slow source checks update only website findings/alerts on the latest stored records. Changed or queued Vehicle Profiles are protected, and newer Listing names, descriptions, prices and media are preserved. Old missing-field warnings are cleared on version migration before fresh verification.

Ordinary app switching no longer deliberately aborts active media uploads. Offline, freeze and navigation interruptions keep acknowledged resumable checkpoints. On return, stalled unfinished XHRs are recovered while active or already completed requests are retained. Photo and video lanes both settle before a retry can start. Android/Chrome may still freeze or discard background pages; uninterrupted background execution is not guaranteed by a web release.

Pending media resumes ahead of personal preference backups and directory scans. Refresh paths reuse index bodies already fetched. Unchanged Inventory rows avoid media rewrites, and cover downloads happen separately with bounded concurrency and protection against late writes over edited Profiles. Manual Listings refresh forces a fresh source check without blocking the metadata refresh on it.

## Use

Refresh LotKeys TEST and confirm V0.9.5.36. Reopen the affected Listing to allow its next source check. To test saving, add/save a Profile, briefly switch apps and return: the upload should continue where Chrome permits, or resume its saved checkpoint.

This is a TEST web release. Personal settings backups, Posting Buddy V0.1.24, Android connector V0.9.5.12 and Store Processor V0.9.4.76 remain. No existing user Drive records were edited by this release task.
