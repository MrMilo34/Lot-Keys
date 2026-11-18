# TEST manual/import pilot release decision

Blair/Buddy authorized a clearly labelled TEST-only pilot after final checks.
The reviewed comparison/storage behavior is unchanged; only pilot wording,
release metadata/cache ID, release contract and documentation changed for promotion.
The PR must pass CI at the final head and Pages/live-byte verification must confirm
actual deployment. Production and user authorization/reports are outside release
verification. No signed-in browser app is opened or renewed by the agent.

The pilot is suitable because failed Drive saves retain local results/previous
links, the isolated actual Docs batches passed, and scope/revision/remount guards
are tested. It does not establish actual LotKeys OAuth renewal or phone behavior.
Those limitations and absent automatic sources are explicit in the app. Existing
promotion holds below describe the earlier draft stage; this specific TEST pilot
has now been authorized. The unrelated .48 implementation pause remains in force.

# LotKeys Compare candidate — 0.9.5.49 / 095049

Based on current TEST main f7ec1b8fd095f2455dddcc300516c510fccc819c (.48).
The original isolated candidate was 647d4659ccf6308727d2b3f6307fab509f7f6a73.
This continuation preserves that work on codex/compare-supported-v095049 and
adds the supported requirements. The earlier review ZIP does not contain these
latest changes. Use the current GitHub review branch/PR, not that old ZIP.

## Implemented scope

- Expandable Compare above Home search; + Add Source fields, explicit manual/open
  AutoTrader and CarGurus presets and authorized import controls.
- Home search uses Inventory/Listings input padding, font size and radius while
  retaining the Home accent gradient. Other search fields are unchanged.
- Vehicle-editor-style workspace: sources above results and comparison-only target
  fields. Cached target information is read without changing Inventory or Listings.
- Compact, wrapping, price-sorted result lines:
  `⭐ Price - Year make model trim - linked Stock # · kilometres`.
  Target marker is on the selected target; unknown prices sort last. Copy results
  includes plain-text lines, source URLs, dates and review notes. Copy document URL
  is separate and does not grant access.
- Optional explicit generation/body fields and cautious matching. Known make,
  model, generation or body conflicts move to Excluded mismatches; different
  trims remain included with equipment/price differences labelled; their
  original facts and provenance remain available. Missing facts are possible
  matches, never confirmed matches. No year-to-generation inference is made.
  Full-Inventory mode checks each source row against all cached targets.
- Both cheaper and higher supplied prices remain included; differences from a
  selected target are shown. No arbitrary price cutoff hides plausible candidates.
- Valid-VIN deduplication retains source observations and conflicts. Without a VIN,
  matching canonical listing URL plus known matching stock and compatible vehicle
  facts can combine repeats. Tracking parameters are ignored; meaningful URL
  parameters remain. Conflicting VINs, ambiguous URLs and unidentified vehicles
  remain separate. Saved Inventory facts remain authoritative in the report.
- Manual CSV/TSV/JSON and file imports preserve unknown facts, currency warnings,
  odometer units, price conflicts and stale/unknown observed dates. A comparison
  has a 2,000-vehicle total budget across sources and cached Inventory.
- Dedicated temporary Google Doc in the existing personal Account Storage,
  scoped to account/Store. Next successful save reuses the chosen tagged Doc with
  a revision guard. Existing folders, sharing, Account.json, vehicle files and
  Listing assets are not edited. No permissions or public-link grants are made.
- Immutable origin context, token identity checks, epoch invalidation, pending
  local results, previous saved link retention, uncertain-write verification and
  cross-tab save serialization are preserved from the original candidate.
- Drive cannot atomically guarantee unique first creation across devices. Raced
  duplicate Docs are retained, warned about and reconciled to the newest completed
  report. Exactly one physical file across simultaneous first saves is not proven.

## Source capability limit

There is no automatic website search in this candidate. Manual/import controls,
empty-source messages, report text and copy text say so explicitly. No prohibited
scraping was implemented. Supported-source research and outstanding entitlement/
security/cost decisions are in COMPARE-SOURCE-READINESS.md. A marketplace preset
or search redirect is not a working in-app listing retrieval integration.

## Validation

- 503/503 Node web tests pass, including 42 comparison tests.
- 29/29 actual Compare UI Happy DOM checks pass, including copy text/URL, matching
  exclusion, target draft persistence, pending-save recovery and scope-change races.
- Run `node --test tests/*.test.js` for the normal suite.
- Optional DOM checks: install happy-dom 21.0.4 outside the repository and set
  LOTKEYS_COMPARE_DOM to its lib/index.js before running tests/compare-ui-dom.mjs.
- tests/compare-browser.py is a real Chromium full-app harness using synthetic
  fixtures, mocked Drive saves and blocked external requests. CI runs it at desktop,
  390px and 320px widths and uploads synthetic screenshots/measurements. It checks
  Home dimensions/gradient, wrapping lines, price order, copy, known exclusions,
  pending state, unchanged Inventory and scope invalidation. Its result must be
  read from the actual CI run; adding the harness is not a claimed browser pass.
- This executor still cannot launch Chromium: required process singleton socket()
  fails with Operation not permitted, including elevated execution. No file-URL or
  access-policy bypass was retried. DOM results are not rendered screenshots.
- Connected Drive profile/folder reads succeeded. The connector does not establish
  the LotKeys app's own OAuth identity, Docs API enablement or write transport.
  Later isolated native Docs QA verified creation, same-file guarded replacement,
  reload, UTF-16 stock links and stale-revision rejection via connected tools; no
  existing reports were changed. This does not verify app OAuth/renewal/transport. Full authenticated app save,
  revision replacement, renewal, two-account/Store and concurrent-device tests remain.
- Physical Android .46 phone testing remains outstanding. Responsive Chromium is
  not a physical-phone background-upload or native-handoff test.

## Delivery / promotion constraints

The intended delivery is a normal TEST GitHub PR with checks, followed by safe
TEST-only promotion and live-byte verification when the outstanding gates are
resolved. Draft PR preparation is not deployment. Keep TEST .48, production and
user data intact until then. Do not call this completed automatic online search.

Android, downloads, processor, extension and upload modules retain their content.
The original signed .46 APK SHA256 is still:
5050259a4ebc48314ba5c1ebbddc895f73e271dc2ccdbc3b76e0f3c9973a0093
The existing .46 wrapper loads the hosted TEST origin. Rebuilding that unchanged
wrapper cannot deliver this local web feature. Preserve package/signing, browser
storage, pairing, originals and the .44-.48 fixes; no uninstall or cache clearing.

The other Compare task is paused; this task owns continuation. Unrelated .48
upload/phone changes remain on hold pending Blair's test findings and direction.
Rob's deleted/reposted vehicle records are outside this work. Production and
Facebook support work are separate. Do not restart the full older Lot-Keys Current
conversation.

## TEST verification and rollback

Before merge: normal Node/syntax checks, DOM and rendered desktop/mobile checks;
resolve supported-source scope, complete authenticated Google save/reload and
account/Store tests, review exact diff and retain current main SHA. Promote only
the reviewed TEST web changes. Confirm Pages succeeds and version/index/service
worker/Compare files match the merged commit before asking for phone testing.

If TEST needs rollback, prepare a revert PR restoring these web changes to the
saved .48 baseline f7ec1b8; use the normal checks and Pages verification. Retain
personal Drive comparison documents and all user/browser data. Do not downgrade
or replace the original APK, force-reset main, delete records or touch production.

## Independent review: Home remount data preservation

The reviewer reproduced an old pending save overwriting a newer Home view's
source edits. Its original isolated test failed before this fix and passes after.
A view now retires on detach or superseding mount, clears its timer/listeners,
flushes its current draft and serializes local writes before the next mount reads
settings. Late imports, loads and retired callbacks cannot persist old snapshots.
Successful Drive receipts are reconciled into the active matching pending report,
changing report state while keeping current source and target edits. A newer
pending comparison cannot be cleared by an older receipt. Verified matching
receipts are also recovered on load. The shared modal is closed only while it
still contains this view's own Compare form.

DOM regressions cover the exact review case, unsaved newer edits plus successful
receipt adoption, late imports, delayed local persistence, last-key debounce,
startup receipt recovery, a newer pending comparison and an unrelated shared
editor. The full-app Chromium harness also navigates Inventory -> Home during a
held save, edits the new source field, releases the old response and checks real
IndexedDB state plus the active UI. Inspect the latest CI result for that check.
These are synthetic tests; actual app Google authentication and physical phones
remain outstanding. TEST promotion is still held.
