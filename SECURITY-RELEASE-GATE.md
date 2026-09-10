# LotKeys security and release gate

## Current status: team testing

V0.9.4.58 is suitable for controlled testing with approved Google accounts and non-sensitive dealership test data. It is **not yet the public-production security finish line**.

The current release is a static browser application. Google Drive enforces file access, but browser code cannot safely be the final authority for Creator/Admin roles, global contact discovery, cross-Store message delivery, abuse controls, or long-lived authorization secrets.

## Team-test controls now present

- Google Identity Services account selection and explicit Drive authorization.
- Automatic personal `Lot-Keys Account` creation/restoration in the signed-in user's My Drive.
- Store Code lookup still requires the Google account to have permission to the Store Drive folder.
- Creator-only award checks are case-insensitively bound to the configured Google account email.
- Chat envelopes are encrypted in-browser under the current test design.
- Account Lock Screen credentials use PBKDF2-SHA-256, a unique random device salt, and delays after repeated failures.
- Lock state survives a page refresh in the current tab.
- Public source contains no Google client secret, Drive access token, user password, or customer financial record.
- Privacy, Terms, install, domain, and team-test guidance are included in the release.

## Important limitations

- The local Lock Screen is walk-away privacy. It cannot replace the device lock, Google account security, or server authentication; someone controlling browser storage/developer tools can bypass it.
- A Store Code locates a Store. It is not a password or security boundary.
- The public creator-access file is a UI authorization hint in this static build. Public release must validate Creator/Admin actions server-side.
- Polling can collect messages while LotKeys is open. Reliable notifications or message receipt while the app is fully closed needs authenticated push delivery.
- WebRTC calling needs production signalling, TURN fallback, call authorization, and abuse controls for reliable use across restrictive networks.
- The current team-test build requests the full Google Drive scope so Store Codes can write inside existing shared Store folders. This restricted scope requires Google's applicable verification/security work or replacement with a narrower authenticated broker/picker architecture before public launch.
- End-to-end encryption, key changes, recovery, attachments, group membership changes, and multi-device behavior require an independent security review before sensitive use.

## Required before public launch

1. **Authenticated service boundary**
   - Add a backend/Cloudflare Worker API that verifies Google identity tokens.
   - Resolve Store Codes server-side without publishing Store folder identifiers as authority.
   - Enforce Store membership, Admin Level 1/2, group ownership, and Creator-only grants on the server.
   - Issue short-lived app sessions; never put service secrets in GitHub Pages JavaScript.

2. **Production identity**
   - Use a separate production Google Cloud project.
   - Verify ownership of `lot-keys.ca`.
   - Publish the homepage, Privacy Policy, and Terms on the verified HTTPS domain.
   - Move OAuth from Testing to Production and complete brand/sensitive-scope verification as required.
   - Prefer Google Identity Services authorization-code flow with PKCE and a backend token exchange for long-lived production sessions.
   - Request the minimum scopes at the moment a feature needs them.

3. **Messaging and calls**
   - Add an authenticated user/contact directory with rate-limited exact email/phone lookup.
   - Add server-enforced block, mute, kick, ban, report, and group-admin actions.
   - Use a durable encrypted message queue plus Web Push for closed-app notifications.
   - Add key verification/change notices, delivery acknowledgements, attachment scanning/limits, retention rules, and recovery design.
   - Add authenticated signalling and a managed TURN service for calls.

4. **Operational protection**
   - Add immutable audit events for role changes, Store access, special awards, moderation, and security-sensitive actions.
   - Add per-user/IP rate limits, abuse detection, revocation, backup/restore tests, and incident-response steps.
   - Add Content Security Policy, Permissions Policy, Referrer Policy, dependency review, secret scanning, and release checksums.
   - Separate test data from production data and document retention/deletion responsibilities.

5. **Release verification**
   - Test two normal accounts plus Admin Level 1, Admin Level 2, and Creator roles.
   - Test revoked Drive access, removed Store membership, disabled accounts, expired OAuth sessions, offline recovery, and device changes.
   - Test direct/group Chat, block/mute/admin removal, unread state, key changes, attachments, and calls across two networks.
   - Complete accessibility, privacy, threat-model, and independent security reviews.

## Safe V0.9.4.58 test rules

- Keep Google OAuth in **Testing** and explicitly add every tester.
- Share the Store folder only with those same tester Google accounts.
- Use test/non-sensitive customer and dealership data.
- Back up the Store folder before testing migrations or administration actions.
- Do not advertise Chat/calls as production-secure or always-on while the app is closed.
- Do not distribute an EXE that modifies Chrome policy or silently installs the extension. Use the reviewed ZIP during testing and the Chrome Web Store for public release.
