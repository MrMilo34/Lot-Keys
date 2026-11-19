# LotKeys V0.9.5.02 — Unread alert read receipts

Released: 2026-09-25 23:07 MDT

## Included

- Records a LotKeys read receipt only after the selected Device conversation history loads successfully.
- Clears that conversation's row badge, every matching numbered category badge, the main Hub total, and any matching starred Important-category dot together.
- Uses the thread signature and latest incoming-message marker to keep outgoing replies and harmless Android thread refreshes from reviving an acknowledged alert.
- Restores every applicable alert when a genuinely newer incoming SMS/MMS appears.
- Keeps the Android SMS/MMS provider read-only; the bounded device-scoped receipt contains no message body and expires after 180 days.
- Remains protocol-compatible with the V0.9.5.01 Android connector; no APK reinstall is required for this web alert fix.
- Retains every V0.9.5.01 numbered-category and Important Hub alert rule.

## Verification target

- Open a Device conversation with one unread message and confirm its row, category, main Hub and Important alerts clear after history appears.
- Return to Hub and confirm the alert stays cleared.
- Send an outgoing reply and confirm the old unread alert does not return.
- Receive a newer incoming message and confirm all applicable alerts return.
- Open the conversation again and confirm they clear a second time.

## Release identity

- Version: `0.9.5.02`
- Build: `095002`
- Android version code: `95002`
- Android version name: `0.9.5.02-test`
- Channel: `test`
- Service worker cache: `lotkeys-app-v095002-unread-alert-read-receipts`
- Base: LotKeys V0.9.5.01 numbered category unread badges

Production `lot-keys.ca` is not changed by this TEST release.
