# LotKeys V0.9.5.04 — Inline number blocking and SMS short codes

V0.9.5.04 is a focused TEST release for number blocking in Device Hub.

## Included

- Places **📵 Block Number / Unblock Number** beside the primary messaging number in saved Contact details.
- Accepts numeric SMS short codes such as `66000` for LotKeys blocking, unblocking, and Device organization.
- Keeps Contact phone validation and **Call** actions limited to full valid phone numbers.
- Retains the V0.9.5.03 Blocked and Unsorted views, Interested Vehicle shortcuts, category alerts, and unread acknowledgements.

## Behavior boundary

LotKeys blocking hides a sender from normal Hub views and alerts. It does not block the sender at the Android operating-system or carrier level; the phone's messaging app remains responsible for device-level blocking and notifications.

## Release identifiers

- Version: `0.9.5.04`
- Build: `095004`
- Android version code: `95004`
- Service worker cache: `lotkeys-app-v095004-inline-block-short-codes`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095004`

## Verification

- Run `node --test tests/*.test.js`.
- Run JavaScript syntax checks for the external and inline scripts.
- Confirm **Validate LotKeys web build**, **pages build and deployment**, and **Build LotKeys Android Layer** succeed in GitHub Actions.
