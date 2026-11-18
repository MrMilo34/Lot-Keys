# LotKeys TEST V0.9.5.41 verification

Baseline: `3b7ce5ce814e0b812f70f66b1e064340b68ba17e` (.40).
Release: web 0.9.5.41 / build 095041 / background-save-recovery.
Android: original signed 0.9.5.40, unchanged.

## Reproduction and regression coverage

Six targeted hydration cases failed against the original .40 source before the
fix: opening syncing/pending/error records, a native receipt with a stale Synced
flag, an edit arriving during sheet loading, and an edit arriving during delayed
thumbnail loading. They pass with .41. Healthy completed Profiles still hydrate.
These are source-level reproductions, not a recording of Blair's physical phone.

The full Node suite passes **340/340** tests, zero failures/skips. The 19 added
cases cover nine hydration/status/error-handler behaviors, five native handoff
and recovery behaviors, two Inventory races and three database fallback cases.
The existing release, Store, account, Listings, website importer, phone relay,
message cache, consent, pairing and native transfer contract checks also pass.

Recovery coverage reproduces the .40 sheet timestamp overwrite with a retained
native plan. Explicit retry restores eleven photo records, one video and one
document in their original order, using confirmed Android file IDs. The original
plan is reused unchanged; no source chunks are restaged and no cancel is issued.
A changed price fails that recovery proof. A mismatched job with an emptied
gallery is retained for review without cancellation or normal media cleanup. New edits made while Android prepares
or cancels a receipt survive, and the error handler cannot overwrite them.

## Release checks

- JavaScript syntax: 16 standalone files plus eight executable index.html scripts.
- `git diff --check`: clean.
- Website version, asset query strings, manifest and service worker agree on
  build 095041; the cache is lotkeys-app-v095041-background-save-recovery-guard.
- Android sources/workflow, downloadable APKs, phone/Hub/message modules,
  native transfer protocol, wake sender and extension source are unchanged.
- CHECKSUMS.txt covers every release file except itself. The complete ZIP is
  checked against these files before delivery.
  The .40 checksum list was stale; regenerated hashes also describe the retained
  .39/.40 files accurately without changing those files.

## Limits and next phone check

No real Google account/Drive records were changed during verification. There is
no physical Android, locked-phone, network-loss or full browser upload result.
Local Chromium could not start because the execution environment denied its
process socket. The new database primitive's temporary-memory behavior is tested;
its real IndexedDB transaction path has not been exercised in a browser here.
Android was not rebuilt because no native files changed.

Load .41 with the existing .40 connector, open SC1774 and tap Sync Vehicle once.
Confirm progress completes, the cover returns and no contradictory Synced/error
remains. Then import a fresh Vehicle, wait until Android has all originals,
switch apps and check the completed Profile. Opening a pending Profile and
refreshing Inventory should preserve its media and revision throughout.

The ChatGPT/REA conversation freeze remains separate and unproven. Bounded
source reads and CURRENT-STATE.md preserve continuity without claiming a
platform-level fix.
