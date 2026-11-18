# .40 connection UI update

Add a PC, live blue status and visible-only native UI refresh pass source checks.
321 web tests and Android assembly/lint plus 16 native tests pass; real-device
verification is pending. The matching APK uses the original TEST certificate.
The .39 approved active/hourly scheduling policy below is unchanged. UI refresh
reads local snapshots only while the activity is visible and stops onPause.

# Adaptive phone checks — approved revision, 2026-10-30

Blair explicitly permits hourly idle recovery instead of the old two-second
idle loop. This supersedes the earlier requirement to retain fast idle polling
until push wake exists. This implementation requires no Firebase activation.

- Native setup foreground or a visible linked phone browser: fast two-second
  Drive checks. Browser presence renews a 15-second lease and clears on hiding
  or leaving; hidden phone-browser refresh loops stop.
- Fresh authenticated PC frames / newly approved pairing: fast checks through
  a 90-second recovery grace, renewed by PC activity. The PC continues owning
  retries and keeps its existing heartbeat. A registered connector gets a bounded
  30-second startup recovery window after service/process restart.
- Neither side active, with a still-trusted PC: an hourly timer plus an inexact
  persisted Android hourly network job provide recovery. A 45-minute duplicate
  guard accommodates periodic-job flex without repeated scans. Android may defer
  the job; this is not an exact clock alarm or an immediate remote wake.
- No valid trusted PC and no visible phone UI: no idle Drive checks or hourly job.
- Incoming SMS/MMS changes retain invalidation but do not restart idle cloud
  polling. The connection's partial wake lock is held only during active use and
  released when the activity leases expire or the service is destroyed.
- The periodic job can nudge the running connector. If it must restart a stopped
  service, Android background-start rules still apply: use the existing battery
  exemption when available, otherwise request an owner open via notification.

Tradeoff: opening only the PC site cannot immediately notify an hourly-idle
phone through the current Drive mailbox. Initial reconnection can wait about an
hour, or longer if Android/network conditions defer recovery. Opening LotKeys on
the phone initiates a prompt check. The hourly job is a useful recovery fallback;
it is not needed when no PC is registered. Existing optional FCM code stays off.

Implemented in PR #9. Android assembly, all 16 native tests and lint pass;
317 Node tests pass. The matching .39 APK is signed with the recovered original
TEST key and verified against its registered certificate. Install the signed
download over the existing connector, preserving app data. CI secrets remain
unavailable; do not install its UNSIGNED artifact. Real-device power/locked-phone
verification remains outstanding.

## Earlier PC behaviour and history

# PC-led connection contract — latest clarification, 2026-10-30

- Opening the PC site automatically calls its registered/trusted phone. While
  the page remains open and trust is valid, the PC retries until acknowledged.
- A single manual **Retry phone connection** action lives inside the existing
  status-light / connection settings, not a new standalone Doorbell control.
- Green means registered and awaiting connection. Blue requires a fresh phone
  acknowledgement on the current page. A cached session/offer is not proof.
- PC attempts reuse the current valid offer and are spaced at 15 seconds. A
  manual attempt shares in-flight work; neither path silently starts a new
  approval process for an already trusted phone. Expired trust needs approval.
- Hidden but open tabs remain eligible, subject to browser timer throttling.
  Pagehide stops retry timers; pageshow resumes. PC suspension/network loss is
  handled by the existing session heartbeat/expiry, not a guaranteed close event.

These PC-side changes are implemented/tested in draft PR #9, not deployed.
The idle-phone battery fix is still incomplete: Android DriveRelay continues
its two-second fallback checks. A reachable inbound signal path must be working
and tested before those checks can stop. PC retry logic alone cannot deliver a
signal to an unreachable/suspended receiver. The user prefers avoiding Firebase;
the FCM prototype below is optional, not a requirement approved for activation.
Do not describe the PC UI/retry change as fixing idle phone battery use.
Before activating the optional prototype, also verify that wake dispatch restores
the current Google account identity after a full PC page reload; it must not
require the manual pairing-access repair flow to populate that identity.

## Earlier .39 receiver prototype (inactive)

# Phone wake-up candidate — 2026-10-30

The .39 work branch adds native FCM reception, encrypted per-PC wake grants,
PC dispatch and a separate authenticated Apps Script sender. It is source only,
not activated or real-device verified. Import requires a genuine LotKeys Android
Firebase registration and a private owner sender setup. Existing idle polling
remains intact. See wake-sender/README.md and RELEASE-0.9.5.39.md. No billing,
Store Processor exposure or Enigma identity reuse is authorized.

## Earlier baseline and constraints (still applicable)

# Phone wake-up continuation — 2026-10-16

Blair wants no intentional polling wait: a trusted PC opening LotKeys should wake the phone; keep the existing quick SMS/MMS relay active while the PC is reachable; after a recovery grace period with no PC, let the connector sleep. Opening LotKeys on the phone can also initiate work. Preserve trusted pairing and the working active messaging path.

Status: design only. Android V0.9.5.12 currently runs the DriveRelay worker with a two-second fixed delay, including idle offer checks. Reconnection after reboot resumes those checks; it does not prove an inbound wake channel exists. No push endpoint, Firebase Android registration or FCM receiver has been deployed in this work.

FCM delivery is listed as no-cost. Sending requires a trusted environment that protects server credentials, authenticates the approved PC, validates phone/trust/revocation and resists replay/abuse. The sender's hosting also must satisfy Blair's zero-spend requirement. Firebase Cloud Functions require Blaze, so their free usage allowance alone does not meet the no-billing condition. A quota-limited no-billing sender such as Apps Script is a candidate requiring verification and separate configuration; it is not yet a proven deployment. Do not deploy the Store Processor as a public wake endpoint.

Enigma already has a separate Firebase account/backend project and remains under its own Spark/zero-spend hold. Sharing a provider or implementation approach does not authorize merging identities, exposing credentials or activating paid resources.

Android high-priority push and foreground-service launch rules apply, including user-visible notification requirements and possible delivery delays. Do not promise guaranteed instantaneous wake or successful reception while the phone is offline or force-stopped. Test deep idle, reboot, PC suspension, ordinary network blips, token rotation, revocation and duplicate wake requests before allowing the current idle loop to stop.

References: https://firebase.google.com/pricing ; https://firebase.google.com/docs/cloud-messaging/server-environment ; https://firebase.google.com/docs/cloud-messaging/android-message-priority ; https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start .

## V0.9.5.38 setup check

The two supplied google-services JSON files both contain only the Enigma Android client `ca.enigma.messages.alpha2` in its Firebase project. Neither registers `ca.lotkeys.connector.test`. Do not substitute Enigma resources or claim that its current setup activates LotKeys wake. A LotKeys Android app entry/configuration, native receiver and secure sender deployment are still required. The .38 web cache is independent of this setup and retains the installed .12 connector.
