# LotKeys TEST V0.9.5.39 — background transfers and phone doorbell

Prepared from main d8caf710905bd26ddb540489052ba387428ee9a0 (web .38,
Android .12). The matching .39 TEST APK uses the original signing certificate
and updates the existing connector in place. Real-device verification is
still outstanding.

[Download the phone update](downloads/LotKeys-Connector-TEST-V0.9.5.39.apk).
Keep the installed app and its data; do not uninstall it first.

## Vehicle Profile saves

An optional, separately consented Android Drive grant enables background saves
for administrator Vehicle Profiles, including original photos, videos and
document attachments. The existing browser path remains available with older
connectors and when background uploads have not been authorized. Personal
Marketplace Listings, non-admin More contributions and Account assets retain
their existing foreground paths in this release.

The browser prepares folders, core profile information and the Vehicle Info
Directory first, then hands every pending original to app-private Android
storage before committing one durable batch. Keep LotKeys open through
**Preparing originals**. **Android has the originals** means the browser may
close; it does not mean Drive has finished. The upload notification and retained
receipt track later progress. Android controls scheduling and may defer or stop
ordinary background jobs; a visible Chrome/PWA window is not the connector's
native activity. Resume Drive Saves in native setup can request a UIDT job on
eligible Android 14+ devices. No endless data-sync foreground service is added.

Atomic manifests and source checkpoints survive a process restart. Resumable
uploads trust Google's acknowledged ranges, retain stable allocated Drive IDs
across lost replies and expired sessions, and check final size/MD5. Documents
run first, followed by up to three photo streams and one original-video stream;
stream buffers are bounded. Google account consent is separate from pairing's
private app-data grant. The signed-in account, Store, record and edit travel with
every batch. A newer edit holds earlier work; a context change during handoff
prevents commit. Sources remain on errors and are released only after completion
or acknowledged foreground reconciliation. Batches are limited to 500 files /
4 GiB and require enough phone storage for all retained originals.

Core profile data is saved before media. The native finalizer updates only the
matching Inventory cover field using a fresh read and Drive v2 File ETag
precondition (not an assumed v3 media write precondition). A newer
edit, missing index or missing ETag produces **needs_reconcile**, retaining
confirmed media IDs for foreground repair. It never overwrites a whole stale
profile/index. Sheets has no values compare-and-swap: the native job deliberately
does not overwrite its cover cell. The next foreground sync refreshes that cell,
photo names/order and stale-asset cleanup. Native jobs never delete remote media.

## PC calling and connection status

Opening the PC site calls its saved phone automatically. While the page remains
open, valid-trust retries run every 15 seconds and reuse one current offer.
Concurrent manual/automatic attempts share the same pairing-start work. Manual
retry appears inside the existing status light connection details. A registered
phone is green; only a fresh acknowledgement makes it blue. Restored session
metadata alone stays green. Leaving the page stops retry timers; returning
resumes them. Hidden open tabs remain eligible, with normal browser throttling.
Expired/revoked trust still requires approval. Pending uncertain sends are not
interrupted or resent by this retry loop.

The approved adaptive scheduling policy below replaces continuous idle phone
polling with hourly recovery. Immediate wake from a PC-only arrival would still
need an incoming signal path. The Firebase prototype remains optional/inactive.

## Adaptive phone checks (new approved policy)

The phone now uses a native presence policy instead of an unconditional
fixed-delay loop. Visible phone UI keeps two-second checks. Authenticated PC
activity renews a 90-second recovery grace; visible phone-browser pulses have a
15-second lease and clear on hiding/leaving. When idle with a trusted PC, an
hourly timer and inexact Android periodic network job provide recovery. Without
a trusted PC, idle checks are unnecessary and stop. Idle SMS events do not
restart Drive polling. The active connection wake lock is released on idle.
A short startup recovery window preserves reboot/process recovery.

This needs no Firebase setup. The tradeoff is that opening only the PC site can
wait about an hour, or longer with Android/network deferral, before the idle
phone discovers it. Opening the phone app checks promptly. A PC request existing
in Drive is not itself a push notification. Actual battery savings and locked/
deep-idle behaviour need real-device verification. This replaces the earlier
fast-idle fallback restriction by explicit user instruction.

## Optional phone doorbell receiver prototype (inactive)

The PC writes its normal encrypted-relay pairing offer/request, then sends a
small signed doorbell to a **separate** Apps Script sender. Only an encrypted
phone reply establishes connectivity; an opaque HTTP dispatch or FCM send does
not. Wake payloads contain identifiers, a nonce, timestamp and signature, never
chat content. Phone-owned per-trusted-PC HMAC grants are exchanged inside
encrypted foreground replies, not plaintext pairing answers. The sender checks
binding, expiry, signature, replay, rate limits and a daily cap. The phone checks
its own current trust and account again. Token rotation re-registers grants;
forgetting a PC invalidates them locally and attempts broker revocation.

No Firebase config, sender deployment, billing change or Enigma identity is
included. See wake-sender/README.md. Without setup, the push receiver stays
inactive. The approved hourly fallback remains available; optional push wake still needs
locked/deep-idle delivery tests before activation. FCM priority can be downgraded; restricted foreground
launches produce an open-connector notification rather than assuming an
exemption. Do not promise zero latency, force-stop delivery or a sleeping laptop
wake: this feature wakes the Android phone connection, not the REA laptop.

## Evidence and validation

The Google Drive APK analysis observed native JobService/foreground content-sync
wrappers, not its private transfer protocol or a performance benchmark. This
implementation uses public Android scheduling and Drive resumable APIs.

Web: 317 tests and inline/module JavaScript syntax pass. Android assembly, all
16 recovery/security/presence/job tests and lint pass. The distributed APK is
built from b50ea6a (Android CI 41153938625) and signed locally with the recovered original TEST key; its
certificate is checked against SHA-1 6CAE202927D7884907C25147FE7FA0E11D87B741.
The download has a companion SHA-256 file. CI signing secrets remain unavailable;
its explicitly labeled UNSIGNED artifact is for signing only and must not be
installed. Use the signed download in this release. Real-device verification
has not been claimed. PR #9 records the implementation.

Real-device gates: locked screen and browser swipe-away; interrupted staging;
airplane mode during a chunk; process death/reboot; consent expiry; same-Store
newer edit and account/Store transition; large original video; lost upload reply;
concurrent Inventory updates; FCM token rotation; trust expiry/revocation;
duplicate doorbell; PC suspend; deep idle; and force-stop recovery. No such
device test has been claimed.
