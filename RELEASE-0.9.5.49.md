# LotKeys TEST 0.9.5.49 — manual/import-only Compare pilot

## Scope

Expand Compare above Home search. Add sources and enter or import authorized
CSV/TSV/JSON data, choose an Inventory target and compare price-sorted result
lines. Selected target is starred; Stock # links to its supplied listing and
mileage/source dates stay explicit. Copy results or try the guarded temporary
Google Drive report. Source fields are above results. Other search fields,
Inventory, Listings, original files and user preferences are preserved.

Different trims remain included and labelled; known make/model/generation/body
conflicts are retained separately. Unknown facts are unverified, never invented.
No automatic AutoTrader, CarGurus or other website search is connected.

## Validation and limits

Reviewed behavior passed 503 Node checks, 29 UI DOM checks and 31 syntax checks.
The exact independent remount regression passes. Full-app Chromium checks passed
at 1280/390/320px, including real route navigation, newer source edits retained in
IndexedDB, receipt adoption, pending reload, scope invalidation and trim variants.
Final pilot metadata/label changes receive the same CI before merge. CI uses
synthetic data and mocked Drive calls; it is not physical-phone testing.

A separate private synthetic Doc proved actual Google Docs guarded insert,
same-file replacement/reload, Stock # hyperlink ranges and rejection of stale
revisions through the already connected account. No existing report was touched.
LotKeys browser Drive authorization/renewal, app-specific storage discovery and
save transport, cross-account live tests and physical-phone behavior remain
unverified. Failures keep local results and the previous URL. Copy results during
testing. Cross-device simultaneous first saves may retain duplicate Docs with
an explicit warning; do not delete them blindly.

## Deployment and rollback

TEST only: https://mrmilo34.github.io/Lot-Keys-TEST/
PR #22. Web build 095049; cache lotkeys-app-v095049-comparison-manual-pilot.
Existing original-key .46 APK remains unchanged; no installer rebuild is needed
for this hosted web update. Production, permissions and credentials are unchanged.
Do not reset user authorization or interact with existing reports for deployment QA.

Wait for Pages success and confirm the live version, index, service worker,
manifest and three Compare assets match the reviewed merged bytes. Verify the
.46 APK checksum remains 5050259a4ebc48314ba5c1ebbddc895f73e271dc2ccdbc3b76e0f3c9973a0093.
Keep .48 at f7ec1b8fd095f2455dddcc300516c510fccc819c and the named rollback branch.
Rollback through a normal revert PR/CI/Pages deployment, restoring .48 web files.
Retain browser/Drive data, native jobs, reports, .46 package/signing and production.
The unrelated .48 upload/phone implementation work stays paused.
