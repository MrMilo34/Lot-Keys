# LotKeys TEST V0.9.5.41 — preserve background saves during Profile refresh

Based on .40 main `3b7ce5ce814e0b812f70f66b1e064340b68ba17e`.
Website build `095041`; Android connector remains **V0.9.5.40**.

Opening a Vehicle Profile during an Android save could load the incomplete Drive
sheet, replace the local edit revision and gallery, and mark the record Synced.
Android's revision guard then correctly paused that unexpectedly changed record.
This reproduced the 50% stall, contradictory Synced/error text and missing cover
reported for SC1774. It establishes an application defect; it does not establish
the cause of the separate frozen ChatGPT conversation.

Profile hydration now leaves unfinished/error records and native upload receipts
alone. Remote metadata is committed conditionally in one IndexedDB transaction,
so an edit made during a fetch wins. Late photo downloads merge only missing
image bytes into matching current assets. Inventory refresh preserves native
jobs, and native receipt/completion writes reject a newer edit or deleted record.
The Profile cannot show Synced while retaining an error or native save receipt.
Completed native saves retain their cover file ID and request its thumbnail.

For the exact .40 overwrite, open the affected Profile and tap **Sync Vehicle**
once after loading .41. Explicit retry can restore the original native revision
and reuse Android's retained original files and media order without restaging.
Recovery requires the same account, Store, record, original field snapshot,
matching self-written sheet timestamp and the reported pause error. A genuine
newer edit does not qualify. Missing evidence or unavailable Android/Drive access
still requires review; this is not a guarantee that every previously damaged
record can be repaired automatically. If a changed record has an empty media
list while the native plan retained media, retry preserves the job for review
instead of cancelling it and treating missing media as intentional deletions.
Do not clear browser or connector data.

The signed .40 APK, original certificate/package, pairing, active/hourly Hub
policy, six-message/ten-conversation cache, Marketplace, Processor and extension
files are retained. No connector installation is required for this website fix.

Validation: **340 Node tests pass**, including the real hydration/handoff
functions, .40 recovery, newer-edit races and the temporary database fallback.
Syntax checks pass for 16 JavaScript files and eight executable inline scripts;
`git diff --check` passes. Browser/physical-phone end-to-end upload testing remains
outstanding. See [verification details](LotKeys-0.9.5.41-Test-Report.md).
