# LotKeys V0.9.5.05 — PC pairing relay recovery

V0.9.5.05 is a focused TEST release for the PC-side failure that can stop phone pairing before the four-digit code is created.

## Included

- Adds **Reconnect pairing access** to renew only the PC's temporary Google authorization without signing out, clearing LotKeys data, or changing the Store connection.
- Confirms the exact Google identity, then creates, reads, and deletes a short-lived probe in the private Drive app-data space.
- Retries private relay requests with `XMLHttpRequest` when the browser's normal `fetch` transport is blocked.
- Shows the specific Google HTTP response or both browser-network failures under **Technical detail**.
- Preserves all V0.9.5.04 inline blocking and numeric SMS short-code behavior.

## Security and data boundary

The repair probe contains only a random identifier and timestamps. It expires after two minutes, is deleted immediately after verification, and is also covered by stale-relay cleanup. Pairing offers and encrypted session frames keep the existing private app-data boundary.

## Release identifiers

- Version: `0.9.5.05`
- Build: `095005`
- Android version code: `95005`
- Service worker cache: `lotkeys-app-v095005-pairing-relay-recovery`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095005`

## Verification

- Run `node --test tests/*.test.js`.
- Run JavaScript syntax checks for the external and inline scripts.
- Build and lint the Android test layer.
- Confirm **Validate LotKeys web build**, **pages build and deployment**, and **Build LotKeys Android Layer** succeed in GitHub Actions.
