# LotKeys TEST V0.9.5.36 verification

- 266 automated tests passed: the prior 237 checks plus 29 new regression checks.
- Verified missing-stock RAV4 recognition, one-identifier matching, exact identifiers, shortened model names, partial reader content, conflicting identity, real sold/removed messages and related-vehicle isolation.
- Verified Legacy sale-price parsing and backchecks reject sticker, ambiguous and related-vehicle prices. Existing Legacy and Go Auto imports remain covered.
- Executed the actual background alert check, proving the false warning clears and the Legacy sale price is verified. Tested preservation of edits made during slow reads.
- Executed the actual resumable uploader under ordinary hiding, freeze/resume and offline states with simulated XHR storage. Tested actual lifecycle listeners, stale request recovery and completion of both media lanes before retry.
- Executed Inventory refresh with a slow cover download and an already fetched index; it returns metadata first, avoids unchanged media rewrites and protects edits from late thumbnails. Tested foreground work priority.
- Syntax passed for 12 root JavaScript files and 8 executable inline scripts.
- All 178 baseline files matched the published V0.9.5.35 Git tree before editing. Native connector, messaging transport, Processor and extension archives are byte-for-byte retained.

The supplied video and saved RAV4 feedback identified the stock-only miss. No private account/contact values were added to the repository. Automated upload and Drive tests use simulated transport; actual Android scheduling/background survival and end-user timing remain device checks.
