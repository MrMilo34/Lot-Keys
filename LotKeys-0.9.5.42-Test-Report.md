# LotKeys .42 / Posting Buddy .25 verification

Baseline: `246b49696911bc447f7b7b7d27032cd402d2692d` (.41 / extension .24).
Report date: November 4, 2026.

## Reproduction and behavior

The first 12 new media tests run against the distributed .24 content script:
five passed and seven failed. Failures covered the empty 0/20 update, detached
picker after removals, image decoding before deletion, partial removals, removal
with no effect, FileList reset after acceptance, and video falsely satisfying
Photos. The same real functions pass with .25.

The final 15 media cases also cover missing source images, protected photos,
unknown photo count, rejected attachment, new-post order, the twenty-photo limit,
mixed video deduplication and the real Photos-only fill path leaving unchecked
Details and Description untouched. Fixtures model the observed Facebook upload
DOM, including a new input after each grid rebuild. They do not assert that every
current Facebook layout exposes the same controls.

The complete suite passes **355/355 Node tests**, zero failures or skips. Existing
saved-title, download fallback, Store/account, native upload recovery, Hub,
phone pairing and conversation cache checks pass. Syntax checks cover 16 web
JavaScript files, eight executable inline scripts, and all three JavaScript files
inside the exact .25 ZIP. CI now checks the packaged scripts too.

## Package and scope

The new archive contains the same nine paths as .24. Permissions, host access,
sidepanel.js, sidepanel.css, icon and placeholder bytes are retained. Functional
changes are in facebook.js; other changed package files identify/document .25.
Version metadata, release pointer and Garage download agree on .25. Website
version/build/manifest/cache agree on .42 / 095042 / posting-buddy-media.
Previous extension archives and all baseline repository paths are preserved.
CHECKSUMS.txt is regenerated from actual release bytes, excluding itself.

Android sources/APKs, native transfer protocol, Drive recovery functions and
Hub/phone/message modules remain unchanged. No connector rebuild or reinstall.

## Remaining live check

No Facebook account was accessed and no ad was saved, deleted or published in
verification. A live Chrome/Facebook check remains necessary: install .25 into
the existing unpacked folder, Reload the extension, reload Facebook and Sync.
Try the empty uploader and an existing listing with Photos selected, then Photos
plus Video where Facebook provides a compatible picker. Check order/previews
and unchecked fields before manually saving. Unknown/protected controls should
give a clear review message while preserving existing media.
