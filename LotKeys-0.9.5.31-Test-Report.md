# LotKeys V0.9.5.31 verification

## Source and scope

Based on TEST commit fa8dc90cbae1f57397673015fd482217c8143cff (V0.9.5.30). Changes are confined to the web phone/history coordination, release metadata, documentation and behavioral regression tests. Android and Store Processor source are retained exactly.

## Executed checks

- Both edited JavaScript files compiled successfully in the available V8 environment.
- All 14 new behavioral cases passed against the actual extracted cache, bubble and phone-history functions in a V8 harness. That smoke harness supplies Node test/assert/VM equivalents and a query-string shim; GitHub Actions runs the authoritative cases using Node 22's own modules.
- Publication requires the complete Node test suite and existing JavaScript syntax workflow to pass on the proposed commit. The commit's GitHub Actions checks and associated pull request provide the authoritative full-suite result.
- The new cases verify that notification opening adds no second phone request, unrelated updates retain cached history, all 12 simulated new arrivals remain in the returned page, late old responses do not overwrite current cache, private cache clearing rejects late population, and older cursors are independent.

## Device limits

No physical phone, live Enigma receive transaction or paired-PC timing capture was available. The user's approximately 40-second measurement is the reported symptom, not a reproduced benchmark. No messages were sent to test a live carrier and no second transcript store was introduced.

The source review confirms that LotKeys observes Android's SMS/MMS provider and its phone relay serves frames sequentially. Enigma 0.1.55's current install notes describe immediate successful MMS callbacks and bounded recovery for stalled downloads; they do not establish the exact SMS provider-write/notification ordering. The current source ZIP is present but not readable as source without a working local execution environment.
