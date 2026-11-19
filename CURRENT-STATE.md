# Regular .50 promotion candidate

Based on exact TEST .50 39e89f0, with regular .81 rollback 82543c1 pinned on
rollback/regular-v09481-82543c1-before-v095050. Canonical lot-keys.ca, its CNAME,
PWA identity/install page, database name/version, access/directory files and
existing OAuth client/settings are preserved. The single extra requested scope
drive.appdata was explicitly approved. No .51 source or new APK is included.

The first stylesheet is extracted byte-for-byte to lotkeys-app.css to keep source
uploads within tool limits; blocking stylesheet order and the service-worker
asset list are preserved. Native .46 source/CI template is reference only: no
Android workflow or installer is published by this web promotion.

See RELEASE-REGULAR-0.9.5.50.md for limits, checks and exact rollback.

# LotKeys .50 — partial reliability TEST preview

TEST-only publication is now authorized for the reviewed partial preview.
Base TEST .49 is a3cbd0aac8d956ec9d8110a1c5dd7f08f7fb7cbe; preserve it on
rollback/test-v095049-before-reliability-preview before promotion. Production .81,
original signed Android .46 and .48 rollback f7ec1b8 remain protected. New .50 scope
allows bounded work on sign-in, background preparation, paired-PC sending and
Account controls; unrelated holds and actual records remain protected.

- Cached valid tokens skip external-library waiting. Definite relay401 retries
  once through existing recovery;403/uncertain sends retain existing safeguards.
- Vehicle preparation acquires a shared visible-screen wake lease, released on
  exits/hidden state/verified native handoff. Regular-user More uploads still need
  the browser; no universal background or locked-phone execution claim is made.
- Minimal Account rows below Lock Screen use checked phone/receipt state, honest
  amber/green indicators and existing native controls. No idle polling or scopes.
- Exact reported PC authorization error and physical phone proof remain missing.
  Native More handoff and active Compare source/backend work remain unresolved.
- PR23 preparation stays separate. See RELEASE-0.9.5.50-CANDIDATE.md for exact
  implementation limits, source constraints, tests and source-review ZIP contract.
- Publication changes only release metadata/documentation; the reviewed .50
  reliability code remains unchanged. Confirm Pages success and served bytes
  before reporting deployment. Regular-user native handoff is still unfinished.

# LotKeys TEST .49 — manual/import-only Compare pilot

Release source: PR #22, based on .48 f7ec1b8fd095f2455dddcc300516c510fccc819c.
Web 0.9.5.49 / 095049; original signed Android .46 remains installed/unchanged.
Promotion is TEST only and must be confirmed by Pages success and live-byte checks.

- Home Compare and compact Home search retaining its gradient; other searches
  unchanged. Vehicle-style workspace, sources above compact price-sorted results,
  target star, stock hyperlinks, mileage, Copy results and explicit unknown facts.
- Manual entry / authorized CSV, TSV or JSON only. No automatic website search.
  Different trims remain labelled comparables; known make/model/generation/body
  conflicts are retained under exclusions. Preserve provenance and reliable dedup.
- Retired views cannot overwrite remounted source/target edits. Serialized local
  writes drain before the next view reads; late imports are ignored and successful
  matching receipts reconcile report state without clobbering drafts/newer runs.
- Scoped, revision-guarded temporary Drive report remains TEST functionality.
  Failures retain local results and the previous saved link. Independent isolated
  Docs API QA verified same-file replacement/reload, links and stale-revision
  rejection through the connected account. LotKeys' own browser authorization,
  renewal, app Drive transport and physical-phone behavior remain unverified.
  Those limits are visible in the Compare panel, editor, version info and metadata.
- Independent reviewer confirmed the remount fix; 503 Node, 29 DOM, 31 syntax
  checks and full-app responsive Chromium checks passed at the reviewed revision.
  Pilot-label/release metadata changes use the same checks before merge.
- Preserve .44-.48 features, native queues, original .46 signing/browser data,
  processor, extension and production. Unrelated .48 upload work remains paused.
- .48 rollback target is f7ec1b8 and rollback/test-v095048-before-compare-pilot.
  See RELEASE-0.9.5.49.md and COMPARE-CANDIDATE-HANDOFF.md. Do not clear user
  data, reset authorization, delete reports or replace the APK when rolling back.

# LotKeys TEST .48 — Inventory media recovery

Based on TEST main 025ecc2f7ef0860b7d0a0bcc5cd9a289c0cb7b80. Web-only;
keep the original-key Android .46 and its existing native queue. Preserve .44
retry/resynchronization, .43 fallback, saved originals, roles and production.

- Full gallery metadata and photo batches update open Profiles and Listing forms
  even after the old 15-second / 2.4-second UI waits. Download three originals at
  a time, show loading/error status and Retry, retain cached media on folder errors.
  Canonical cover IDs preserve selected Listing photos and edited form fields.
- Per-file More upload checkpoints survive interrupted lanes. Final owner requests
  reserve and persist a Drive file ID before creating/writing; bounded API requests
  retry the same ID, preserve terminal receipts and verify the workspace parent.
  Account, Store and local edit guards stop stale writes. Newer edits get new
  request IDs while accepted media references can be reused.
- Inventory refresh reads pending submission receipts before replacing local work.
  Queued saves stay Awaiting Inventory publication; rejected saves retain originals
  with an actionable error. Confirmed receipts allow official Inventory adoption.
- Processor .78 saves approved/rejected receipts before attempting cleanup. A shared
  folder writer can edit a user-owned request but Google may deny trashing it.
  Cleanup failure can no longer replay completed snapshots. Terminal receipts do
  not consume the pending-request limit; pending saves run in creation order.
- The existing LW-034 processor received the bounded .76 -> .78 completion/queue
  patch. Its original Store binding, manifest, trigger and permissions were retained.
  Two previously pending requests now have durable approved receipts. Do not infer
  that the newer incomplete photo upload has reached official Inventory from that.
- All 461 Node tests and 31 JavaScript syntax checks pass; diff check passes.
  Initial TEST promotion via PR #20 / Pages 42906375749 succeeded; six live
  release files matched the committed bytes. The slow-original follow-up uses
  independent photo workers, a five-minute original download deadline and
  visible device-cache errors. It follows the same TEST checks. Real
  regular-user phone/PC retry, gallery and cross-user publication tests remain needed.
  Do not clear app/browser data, uninstall or manually copy unsubmitted More files.
  Google Drive's phone app is not needed for LotKeys' direct API upload path.
- See RELEASE-0.9.5.48.md, LotKeys-0.9.5.48-Test-Report.md and CONTINUE-0.9.5.48.txt.

# LotKeys TEST .47 — Store access requests

Based on .46 main 6f5d24622789d466237483f0a4bcf55f0eac7bdc. Web-only;
keep original-key Android .46, its verified toolbar-free launch and native queue.
Blair confirmed the .46 toolbar correction; real background-upload testing remains
pending. Preserve data, .44 retry/resynchronization, .43 fallback and production.

- Administrators copy a private Store invitation. A new user connects with that
  invitation or a known directory Store Code, then opens Google's Request access
  screen. Google requires the user to send it there; LotKeys never fabricates a
  local 'request sent' state. No public Store folder or extra backend is created.
- Admin Reports / Requests lists Google's pending requests for the Store root.
  An approver can Approve or Deny; approval grants Reader access and provisions
  the exact Google recipient's existing LotKeys user workspace automatically.
  Google Drive still enforces sharing rights. Delegated/view-only proposals and
  disabled accounts require existing manual review, not automatic restoration.
- Rechecks root/account/admin identity and fresh Google identity before writes.
  Verifies actual Google permission before membership provisioning; persisted
  receipts recover interrupted/uncertain approvals without blind duplicate grants.
  Other reports remain usable if the access-request API is temporarily unavailable.
- 433 web tests pass (27 new); 30 total JavaScript syntax checks and diff check
  pass. Native code/APK, scopes and permissions are unchanged; no Android rebuild.
  Real Google two-account request/approve/deny and phone UI tests remain pending.
- TEST promotion goes through its PR/checks. Verify Pages bytes/version before
  claiming it live. Production remains unchanged. Google OAuth test-user allowlist
  is separate and still required while its project is Testing.
- Future Account background/connector controls remain a separate saved requirement
  on codex/account-background-release-readiness; this release does not move them.
- See RELEASE-0.9.5.47.md, LotKeys-0.9.5.47-Test-Report.md and CONTINUE-0.9.5.47.txt.

# LotKeys TEST .46 — trusted launch and background upload controls

Based on deployed .45 main 0b5310597e907544065b15658106e75b21ea18a0.
Preserve Blair's observed .44 retry/resynchronization, .43 fallback and saved data.

- Real browser-session Trusted Web Activity keeps the existing HTTPS origin,
  pinned browser, package/certificate and browser storage. Same-browser Custom
  Tab remains a safe fallback when trusted launch is unavailable.
- Required origin-root assetlinks.json is now live with HTTP 200, JSON content
  type and no redirect. Google Digital Asset Links check returned linked=true
  for ca.lotkeys.connector.test and the original TEST certificate on 2026-11-10.
  Public helper repo: MrMilo34/mrmilo34.github.io, commit 1432430a221d9e0353839e71e45a19b72b994950.
  No CNAME or production-site modification. Phone toolbar verification is pending.
- Explicit native Background upload controls are reachable from committed Profile
  receipts, upload notifications and native home. A visible native user tap can
  request user-initiated scheduling for an authorized, committed retained queue.
  No new permissions, credentials or consent grants. Android can stop/defer jobs.
- Keep LotKeys open while preparing originals. After durable commit, tap Continue
  uploads in background in native controls, then switch apps. Retained checkpoints,
  retries, original-file order and account/Store guards remain in effect.
- 406 Node tests and 24 JavaScript syntax checks pass; 58 native tests, assembly,
  bundle and lint pass in CI 42855311393 at 3c6089d8. Lint: 0 errors, 33 warnings.
  Original-key signed .46 APK verifies against .45 package/key/permissions and is
  published in downloads with SHA-256. Do not substitute an unsigned CI artifact.
- PR #17 merged at 7e8544bdd0024fc964b18ace7c6037719bcced5e; TEST Pages
  deployment 42871744941 succeeded. Eight live release files, including the APK,
  matched committed bytes. Production remains 0.9.4.81. Install OVER the existing
  TEST app without uninstalling or clearing app/browser data.
- Physical-phone upgrade, toolbar removal and background/lock/retry tests remain
  outstanding. See LotKeys-0.9.5.46-Test-Report.md and CONTINUE-0.9.5.46.txt.

# LotKeys TEST .45 — single-install readiness candidate

Starting point: main 667a1c06f65fb7db7afed491a386881dc851e2c9 (.44).
Keep .43 (4d27b49c7018b6386bdbafa9dfc6e20629d87c00) as the user-confirmed
app-switch background-upload baseline. No user data or production changes.

- Same Android package, launcher component, signing identity, native queue and
  phone/PC permissions. Main launch opens the existing TEST origin in a browser
  Custom Tab; its menu opens native Phone & upload settings. Browser provider is
  retained after first launch; entering the workspace never requires SMS access.
- No WebView database, Store migration, Firebase activation or subscription.
  Browser toolbar remains; fullscreen TWA needs verified domain asset links.
- Handoff readiness validates job/context, every original/destination, retained
  bytes and finishing plan, then persists the committed receipt locally.
  Profile timing records foundation, Android preparation and commit separately.
- API 36 target; non-debuggable release APK/AAB build path. Browser-launch and
  retained-upload tests cover API 35/36 using Robolectric 4.16.1 and Java 21 CI.
- 404 Node tests and 46 native Robolectric tests pass in CI at 50065a76.
  Debug/release assembly, bundle and lint pass (release: 0 errors, 28 warnings).
  Recovered release APK signed with original TEST key; package/version/certificate
  and unchanged permissions verified against .44. See LotKeys-0.9.5.45-Test-Report.md.
  Physical-phone .45 checks and measured readiness timing remain pending.
  Do not call this installed, Play-approved or measured at 30 seconds.
- Blair confirms .44 automatic retry/resynchronization resumed after app switching
  in his last test; preserve that improvement. Its 50% readiness advice may have
  appeared prematurely. Keep .43 as the earlier confirmed fallback.
- Verified lot-keys.ca serves .81 from production main
  82543c12cee842c869bced97b92c29e61b2d36a1: version, index, service worker,
  manifest and privacy bytes match. Production assetlinks.json is absent.
- Full Drive scope is restricted; app-data relay scope is non-sensitive. Actual
  Cloud test-user/client/verification/billing state and Play account need review.
  Public SMS cross-device exception is eligible for application, not approved.
- Existing .44 and the historical notes below remain the behavioral reference.

# LotKeys TEST .44 — earlier Android handoff

Release: PR #15; web build 095044; Android 0.9.5.44-test / 95044; extension .25.
Baseline .43: 4d27b49c7018b6386bdbafa9dfc6e20629d87c00.
Blair confirmed .43 uploads continued after switching apps. Preserve that milestone.

- Browser establishes folders, core Sheet/Index and stable media/PDF IDs first.
  Android retains every original plus the complete PDF/Inventory finishing plan.
  Ready to switch apps appears only after commit confirms all sources retained.
- Native renders/checkpoints the linked/badged Info Sheet and finishes sharing
  and Inventory without a live browser. Parallel folders and 1 MiB staging.
- Old connectors use the established path. Destructive/ambiguous media changes
  and duplicate PDFs retain foreground reconciliation. No native media deletion.
- Strict account/Store/edit/Sheet/parent/PDF ETag/index guards preserve newer
  work and originals. Version-2 conflicts cannot fall through to browser overwrite.
  Pending rows and completed native metadata survive .44 scans/concurrent writes.
- Visible Resume can upgrade an ordinary queued job to UIDT. Hub/idle/cache,
  pairing, consent, extension .25 and .43 response recovery are retained.
- 393 Node tests, 27 native tests, assembly/lint and syntax pass. Native build
  abdbec545a5f7ec793a5bb0e589c48266f34b1b0 / Actions 42424376391.
- Signed .44 APK/checksum in downloads; original TEST certificate/package verified.
  Install OVER the existing connector, retain data/trust. Private key never in Git.
- Thirty-second readiness is a target, not measured. Physical-phone .44/Drive
  verification remains pending. Older open clients can require reconciliation.
- See RELEASE-0.9.5.44.md and LotKeys-0.9.5.44-Test-Report.md. Verify main and
  Pages deployment before claiming release live. Read bounded source sections.

## Released .43 checkpoint

# LotKeys TEST V0.9.5.43 — retained Android save status

Baseline main: 9e13feb7e78b27ae3ce2d20bb4260fd98f3b2165 (.42).
Branch: codex/native-save-status-v095043. Web 095043; Android .40; extension .25.

- DT3526A stalled at 50% on .42; Profile reported a different account/Store/edit.
  Blair pressed Sync Vehicle and the save continued/completed. No native snapshot
  identifies the exact triggering response, so do not claim on-device root cause.
- Reproduced: nativeCall swallowed failed JSON parsing and returned {}, which
  the transfer context guard misreported as another account/edit. .43 rejects
  malformed replies as recoverable response errors, not a context change.
- Status validates identity structure, preserves the original receipt and retries
  transient observation failures. Explicit 4xx rejection, real context mismatch
  and invalid completed IDs remain stopped; no bypass or foreign adoption.
- Hidden upload observation waits for visibility, then rechecks the retained job.
  Queued/active/error messages are distinct; failures replace switch-app advice.
- 369 Node tests pass (14 new), plus 16 web/eight inline/three extension syntax
  checks. No real-device locked-phone or live Drive verification is claimed.
- Android/APKs, native upload scheduler/protocol, .41 recovery, extension .25,
  Hub, pairing, recent-message cache and original signing identity retained.
  No APK reinstall, app/browser data clearing or photo reimport is required.
- Native follow-up: TransferJobService.schedule's existing-pending-job early
  return prevents a visible Resume action from upgrading ordinary work to UIDT.
  This requires a new same-key APK and native tests; it is NOT fixed in .43.
- See RELEASE-0.9.5.43.md and LotKeys-0.9.5.43-Test-Report.md. Preserve genuine
  context guards; use bounded reads and current Git main before further work.

## Released .42 checkpoint

# LotKeys TEST V0.9.5.42 — Posting Buddy media updates

Baseline main: 246b49696911bc447f7b7b7d27032cd402d2692d (.41).
Branch: codex/posting-buddy-media-v0125. Web build 095042; extension V0.1.25.

- Reproduced .24 extension's empty-uploader replacement failure: saved Facebook
  URL enabled replacement mode, which required a removal even for Photos 0/20.
  Old picker references also became detached when Facebook rebuilt the grid.
- .25 prepares/decodes all replacements first, scopes controls to the uploader,
  handles an explicitly empty uploader, verifies bounded removals and reacquires
  its current input. A mixed picker's selected video is retained.
- Progress uses actual image counts after FileList reset; video alone cannot
  satisfy Photos. Blocked unchanged old photos stay flagged for review.
- 355 Node tests, 16 web/eight inline/three packaged JS syntax checks pass.
  Seven of the first 12 media reproductions failed on .24; 15 final cases pass.
- Install into the SAME unpacked extension folder, Reload at chrome://extensions,
  reload Facebook and Sync. Verify V0.1.25; website update alone is insufficient.
- No live Facebook edits were performed. Check empty/existing uploaders and
  photo+video selection, order, previews and unchecked fields before saving.
- Retain .40 Android/APKs, .41 Drive recovery, Hub/phone/cache, permissions,
  saved Listing titles and final user Save/Update/Publish control.
- See RELEASE-0.9.5.42.md and LotKeys-0.9.5.42-Test-Report.md. Read this checkpoint
  before historical notes; use bounded source reads to avoid repeating work.

## Released .41 checkpoint

# LotKeys TEST V0.9.5.41 — background-save recovery

Baseline main: 3b7ce5ce814e0b812f70f66b1e064340b68ba17e (.40).
Release: PR #11 plus codex/retained-media-guard-v095041 follow-up.
Web build 095041; keep the signed .40 connector and existing app/browser data.

- Reproduced .40: opening a pending Profile hydrated its incomplete Drive sheet,
  replacing the local revision/gallery and flagging Synced. The native revision
  guard then paused it. This matches SC1774's 50%, error and missing-cover images.
- Hydration skips unfinished/error/native records. Conditional IndexedDB writes
  reject intervening edits; delayed photos merge bytes only. Inventory refresh
  preserves native receipts; native handoff writes reject newer/deleted records.
- A mismatched native job with an emptied media list is kept for review if the
  exact recovery proof fails; an empty list cannot silently replace its originals.
- Profile status prioritizes errors and unfinished native work. Completion keeps
  the cover file ID and queues a thumbnail if needed.
- Explicit Sync Vehicle can repair the exact .40 overwrite using retained Android
  originals, only with matching account/Store/record/field snapshot/self-written
  sheet timestamp/error evidence. Genuine newer edits cannot use this recovery.
- 340 Node tests, 16 standalone/eight inline syntax checks and diff checks pass.
  Six .40 reproduction cases failed before the fix. No physical-phone result;
  real IndexedDB browser verification was blocked by local Chromium startup.
- Android/APKs, pairing, active/hourly Hub, six-message/ten-chat cache, Listings,
  native protocol, Processor and extensions are unchanged. No APK reinstall.
- Next: load .41, open SC1774, Sync Vehicle once, then check cover/completion and
  a new app-switch upload. Do not clear data. Retained files are not presumed lost.
- ChatGPT/REA freeze cause remains unresolved; this fixes an app upload defect.
  See RELEASE-0.9.5.41.md and LotKeys-0.9.5.41-Test-Report.md.

## Released .40 checkpoint

# LotKeys TEST V0.9.5.40 — phone pairing and live status

Baseline main: ec11dfba417375c02933afa30051983809c8cf86 (released .39).
Release branch: codex/phone-pairing-status-v095040; PR #10.
Signed .40 APK/checksum: downloads/LotKeys-Connector-TEST-V0.9.5.40.apk.
The original TEST certificate/package are preserved; update the installed app.

- Blair installed .39, authorized background Drive saves and reports that it
  appears to work. Thorough locked-phone/upload testing is not yet confirmed.
- Phone connection settings / connected devices gain Add a PC and Check for code.
  New-PC approval remains mandatory; existing trusted PCs can reconnect silently.
- Blue live-connection cards now colour their actual dots, open settings update
  as connection state changes, and the header light uses actual phone connectivity
  independently of Store readiness. Store warnings remain in their own text/details.
- Android connector PC relay text updates blue/green while the activity is visible.
  Pending approval screens refresh when a request arrives; the UI refresh stops
  onPause and adds no idle network polling.
- Background-ready upload status appears only after Android confirms all originals.
  Preparing originals still needs the browser; early switching can pause preparation
  until returning. Upload work after handoff stays separate from Hub polling.
- Web .40 works with .39; only the connector's new native status UI needs its .40 APK.
  Preserve package, original TEST signing identity, pairing, Store and account data.
- Focused UI/handoff tests and 321 Node tests pass. Android assembly/lint and
  all 16 native tests pass on 0baaddd (CI 41157648791; web CI 41157651453).
  The APK signatures, original certificate, package, version and ZIP contents
  are verified. No real-device claim for these .40 adjustments.

## Released .39 checkpoint

# LotKeys current work — TEST V0.9.5.39 release

TEST release merged through PR #9 at c2ae85b98795265ebbd3d7535f99495b7aa4a5ef.
Previous baseline: d8caf710905bd26ddb540489052ba387428ee9a0 (.38).
Website: https://mrmilo34.github.io/Lot-Keys-TEST/ (build 095039).
Matching signed APK: downloads/LotKeys-Connector-TEST-V0.9.5.39.apk.
Real-phone installation and testing remain the next owner step.

- Native original-file queue and Vehicle Profile media handoff implemented in
  source, with resumable Drive checkpoints, final size/checksum validation and
  stable allocated file IDs. Up to three photos + one video; documents first.
- Separate upload consent; existing pairing app-data scope unchanged. Web/older
  connector fallback preserved. Native features require the matching signed .39 APK.
- Shared Inventory cover finalization uses ETag/revision guards. Sheets cover,
  rename/delete reconciliation finishes in the foreground; no native deletions.
- PC auto retry/status changes: open page calls the saved phone, retries every
  15 seconds, shares one valid offer, and stops on pagehide. Manual retry lives
  inside status-light connection settings. Green = registered; blue = fresh ack.
- Blair now permits hourly idle checks. Adaptive native scheduling is implemented
  in source: two seconds during visible phone use or a live PC activity lease,
  hourly while idle with a trusted PC, no idle checks without trusted PCs.
  Hidden phone-browser polling stops; idle SMS events do not restart cloud work.
  A bounded active wake lock is released on idle. Android hourly jobs are inexact.
- This policy needs no Firebase. An idle phone may take about an hour (or longer
  under Android/network deferral) to notice a newly opened PC; opening the phone
  app checks promptly. Optional FCM remains inactive. No resources/billing enabled.
- 317 Node tests and syntax checks pass. Android assembly, all 16 native tests
  (including presence/idle policy and persisted hourly-job tests) and lint pass
  including final setup labels. The distributed APK is built from b50ea6a (Android CI 41153938625) and
  signed with the recovered original TEST key, verified against SHA-1
  6CAE202927D7884907C25147FE7FA0E11D87B741. Real-device verification is outstanding.
- PR: https://github.com/MrMilo34/Lot-Keys-TEST/pull/9. Signed APK/checksum live in
  downloads/. Install over the existing connector; preserve app data and trust.
  CI signing secrets are still unavailable: its UNSIGNED signing-candidate artifact
  is not an installable release. Use the original-key signed download instead.
  Never commit the private keystore/recovery password or generate a replacement key.
- Marketplace Listings, More contributions and Account assets retain existing
  foreground paths. See RELEASE-0.9.5.39.md and wake-sender/README.md for limits.
- Preserve prior .38 behaviour except the explicitly approved idle polling policy.
  Validate locked/deep-idle/reboot behaviour and power use on a real phone before
  claiming measured battery savings or guaranteed reconnection timing.

## Deployed baseline checkpoint (historical .38)


This is the short continuation reference. Verify current main/version.json before
changing it. Historical release files remain available for a specific question.

- Web 0.9.5.38 / build 095038, based on .37 commit
  `9ba361f63743228774fb1609cf6067f25263de43`.
- Android connector 0.9.5.12; Posting Buddy 0.1.24; distributed Processor 0.9.4.77.
  Correct installed Processor 0.9.4.76 remains compatible. No native rebuild or
  reinstall for this web release.
- TEST: https://mrmilo34.github.io/Lot-Keys-TEST/. Production is separate scope.

## Preserve

- Store switching/creation and account/Store-scoped interrupted work. Keep
  personal account, profile, Hub, settings and phone pairing across Store changes.
- Cumulative Go Auto and Legacy recognition; Legacy Price is the sale price.
  Keep vehicle identity, CARFAX, descriptions, original gallery and photo order.
- Vehicle Profiles and personal Marketplace Listings are distinct. Personal
  Listings/assets live under personal Account Storage, grouped by dealership
  (.32+), superseding the older Store/Users description in ARCHITECTURE-v0.2.md.
- Store Inventory setup is independent of personal listing migration. Keep
  local media recovery, permissions and pending writes; do not clear site data.
- Verified personal template/default/PC-sound backups, retry and latest-edit
  protection; preserve other Account.json sections and Listing wording.
- Preserve the active encrypted phone relay, trusted pairing, reconnect,
  revocation, live history, drafts, media, accurate send receipts and Check status
  request IDs. Never automatically resend an uncertain SMS.
- Store/account-scoped branding and persistent installed Processor Store binding.

## .38 Device cache

Six recent phone messages for each of the ten most recent unblocked conversations
are kept in temporary memory while connected. One background page is requested
at a time, yielding to foreground history before starting another. Changed
threads refresh, unchanged warm snapshots are reused, and failed threads back
off independently. Snapshots renew before their five-minute expiry. Disconnect,
account changes and page closure clear them and reject late writes. Older
history keeps a native timestamp/sort cursor at the six-message boundary. The
open conversation still receives complete pages and live arrivals.

Initial population depends on the existing phone/Drive relay; this is not a
guarantee of zero network delay for a never-warmed conversation. Image/video
bytes are not prefetched by this cache.

## Pending phone doorbell

Design only: no deployed FCM registration, receiver or secure sender. The two
Firebase JSON files supplied so far register Enigma, not the LotKeys Android
package `ca.lotkeys.connector.test`. See PHONE-WAKE-STATUS.md for setup and test
requirements. Do not disable working idle recovery, add slower polling, activate
billing, expose the Store Processor, merge app identities or call wake live.

## GPT conversation stalls

The exact platform cause remains unresolved. Infinite loading was previously
misread as Infiniti branding. Large repeated source/history reads and stale
documentation are workflow risks, not proof of a platform hang. AGENTS.md now
directs future work to this compact checkpoint and bounded source reads.
