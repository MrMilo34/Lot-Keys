# LotKeys V0.9.5.32 — personal listings and SMS receipts

Personal vehicle listings now use the existing **LotKeys Personal Profile / Lot-Keys Account** folder, with a child named for the dealership. That child contains Listings and Listing Assets. Permanent Store IDs keep same-name dealerships separate and retain the same folder when a Store is renamed.

On the next connected listing sync, LotKeys copies the current approved user's previous listing records and nested listing photos from the Store workspace. Copy markers make interrupted transfers resumable. Existing IDs, status, Facebook links, prices, descriptions, dates, photo ordering and local pending edits are retained; Drive file references follow the copied photos. Original Store files are retained for recovery. Official Inventory, More contributions, account/profile data and private Hub files keep their existing roles. Store administrators receive only the current listing-card reference fields, with no private draft descriptions or personal photo/file IDs.

Folder and cached-index parent checks prevent an old Store index from receiving personal writes. Account and Store transitions stop migration before subsequent writes. Removed personal folders stop sync instead of silently restoring an old Store snapshot. Choosing a different Account Storage location moves the existing personal Store folder with its file IDs intact; conflicting existing Store folders stop for reconciliation.

The phone connection panel distinguishes an active computer from a saved pairing and shows SMS permission separately. PC and Bubble Chat now display the phone's SMS error beside the outgoing message. A connected computer confirms the connection, while SMS sending still depends on the phone's SMS permission, default SMS SIM and carrier result. A lost confirmation is labelled **Not confirmed**, rather than Failed. **Check status** reuses the original carrier request ID; the installed Android connector's receipt journal returns its existing result without submitting another SMS. Only explicit pre-submission failures offer Retry with a new request. Partial/submission failures direct the user to check the phone. Receipt bodies remain temporary browser memory, with existing disconnect/account/page-close clearing and guards against late responses.

## Installation and retained work

- TEST web build **095032**, based on V0.9.5.31.
- Android connector remains **V0.9.5.12**; Store Processor remains **V0.9.4.76**. This update requires no new APK or Apps Script installation.
- Reopen the TEST site on the PC and phone, and confirm V0.9.5.32. The first listing migration can take time when photos need copying; it resumes if interrupted.
- All V0.9.5.31 chat-history reuse and earlier Go Auto/Legacy recognition, Legacy Price, CARFAX, descriptions and galleries are retained.

## Verification and limits

See [the verification record](LotKeys-0.9.5.32-Test-Report.md). The connected physical phone, its carrier send result and the user's Drive data were not available for end-to-end testing. This release corrects verified receipt/UI handling and storage routing; it does not claim the underlying reported carrier failure or a measured chat-latency target has been reproduced. Enigma source and the installed Android connector are unchanged.

Android's [SmsManager documentation](https://developer.android.com/reference/android/telephony/SmsManager) permits SMS sends by an app with SEND_SMS permission even when it is not the default messaging app. Switching to Enigma alone therefore does not establish the failure's cause. The visible phone error is the next useful diagnostic if a send still fails.
