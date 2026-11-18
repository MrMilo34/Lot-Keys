# LotKeys .50 — partial reliability TEST preview

TEST-only publication of this partial preview is now authorized. Based on .49
main a3cbd0aac8d956ec9d8110a1c5dd7f08f7fb7cbe, with that exact rollback preserved
on rollback/test-v095049-before-reliability-preview. Production stays .81.
This is not a completed release of all requested reliability work. Native source, original signed Android .46, browser
storage, Google scopes, Store permissions and actual user data are unchanged.

## Implemented in this candidate

- A still-valid cached Google token is used before waiting for external Google
  libraries. Expired tokens and explicit consent still require normal Google
  authorization. No account reset or credential migration is introduced.
- A definite HTTP 401 from the PC's private Drive mailbox gets one shared token
  recovery and one retry of the same request. HTTP 403, network uncertainty and
  other failures do not retry. Existing SMS request IDs, uncertain receipts and
  Check status safeguards remain intact. This addresses a verified expired-token
  failure path; it does not establish the cause of Blair's reported wording.
- A shared screen-wake lease covers Vehicle Profile preparation, including regular
  user browser submissions and photo/metadata work. It releases on every exit,
  on hiding and after verified native handoff; it reacquires on return only when
  preparation is still active. Denied/unsupported Wake Lock remains non-fatal.
  This prevents avoidable visible-screen sleep where supported, not browser
  execution after locking or switching apps.
- Account has two minimal upload/connector rows directly under Lock Screen.
  Upload controls use the installed .46 app's existing visible native action.
  Connector reconnect uses the existing local bridge. Missing Google/Android
  access still goes through existing native setup/permission UI. No new permission
  is silently granted and the native foreground-user-action boundary is retained.
  Saved configuration alone stays amber. Green requires a fresh connected phone
  with matching account and read/send permissions, confirmed transfer progress,
  or a checked completed receipt. Deferred/error/foreign/malformed state stays
  amber. Status reads lightweight native receipts, not every cached photo blob.
  No idle polling was added; returning to the app refreshes the section.

## Still required — not represented as completed

Regular users' More requests are still browser-dependent. The .46 native protocol
supports eligible administrator saves; extending durable original retention,
request publication and receipt reconciliation for ordinary users is separate
native/processor work needing bounded implementation and device validation.
Screen wake is an interim preparation improvement, not that missing native path.
Other upload types are not claimed universally supported in the background.

The paired-PC "higher authority" error was not captured verbatim. Its exact text,
which screen shows it, current Android SMS permissions and a real retained send
receipt are needed to confirm whether the 401 fix addresses it. Do not loosen
Drive/Android permissions, claim a 403 is fixed, or resend uncertain SMS messages.
A clarification request is pending; no answer is assumed.

Physical phone app-switch/lock/network-loss, real Google renewal and actual
paired-PC SMS tests remain outstanding. No installer newer than original .46
was built or signed. The included .46 APK is unchanged, not a .50 APK.

## Compare feasibility retained for .50/.51 scope

The requested result remains active sourced searching, exact dealer target link,
user-provided vehicle/year +/- criteria and optional prices, service-supported
radius around the user's chosen location, locations/odometers/links, price sorting,
starred target and truthful source/unknown facts. Do not substitute dealer location
for the user's requested radius origin or treat an example as a current listing.
Keep the existing .49 manual pilot and PR23 preparation separate.

PR23 remains draft at 6bde950214902eef2c12a84a569027b70a49279a; its standalone
query/coordinator work, source contract, provenance and exclusion-precedence fix
are preserved there. They are not merged into this reliability candidate.

Rechecked primary sources 2026-11-18:
- [Cardog terms](https://cardog.app/api-terms) require approved application/data use,
  attribution/metadata and family-specific retention; report sharing remains
  unresolved. [Pricing](https://cardog.app/pricing) publishes 50 no-card monthly
  free credits and a stop at the allowance. No account or API access was created.
- [MarketCheck terms](https://www.marketcheck.com/terms-of-service) allow live
  user queries but restrict independent/persistent datasets and competing data
  products. This does not establish a licence for the requested saved report.
- [AutoTrader terms](https://www.autotrader.ca/company/terms-of-use/) restrict
  automated/commercial collection. No AutoTrader or CarGurus feed is connected.
- One bounded read of the supplied exact Legacy Highlander page checks direct
  access only: HTTP200, no Access-Control-Allow-Origin header, expected stock
  mentioned in a bounded400KB sample. That is not exact target identity, current
  availability, comparable discovery or permission to crawl. No proxy, broad crawl,
  provider query, fee, signup or outreach was performed.

Actual target identity, Legacy/platform coverage, source/report rights, usable
geographic filters and a private credential host remain the active-Compare gate.
Existing single-page import access is not equivalent to a multi-site search feed.
No .51 implementation or automatic next stage is started by this candidate.

## Checks and handoff

Focused behavior tests cover cached/expired/forced token flows, single 401 retry,
403/lost-response non-retry, wake lifecycle and actual Vehicle-sync cleanup,
Account permission/receipt states and disposed/account-changed mounts. Existing
.49 Compare local-write/remount/Drive-receipt tests remain in the normal checks.
Record exact final CI and artifact hash in the PR/project checkpoint. Browser
checks use synthetic phone/Drive data and are not physical phone/provider proof.

The review ZIP contains tracked source and the unchanged .46 APK; historical
installers are omitted and listed in REVIEW-MANIFEST.json. It is a source review
bundle, not an installable .50 app. TEST publication is separately authorized
and must be confirmed by Pages success and served-byte checks. The manifest
records the source commit and file hashes. Do not clear storage, uninstall, reset
Google accounts, replace signing keys or run source previews against real reports.

Rollback remains f7ec1b8fd095f2455dddcc300516c510fccc819c on
rollback/test-v095048-before-compare-pilot; working .49 is the current main above.
Keep .44 retries, .43 fallback, .46 toolbar/native queues, .47 Store access,
.48 gallery/checkpoints/processor receipts and .49 Compare safeguards intact.
