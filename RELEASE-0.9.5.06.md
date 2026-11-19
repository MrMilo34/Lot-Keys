# LotKeys V0.9.5.06 — PC browser-route pairing recovery

V0.9.5.06 is a focused TEST release for the PC browser failure that left the prepared phone waiting because the PC could not create a private pairing offer.

## Included

- Replaces the failed hinted-consent retry with **Choose Google account**, which opens a fresh account chooser and omits the previous `login_hint`.
- Verifies the selected Google identity through the primary user-info endpoint, an alternate OpenID endpoint, or the Google API JavaScript client.
- Tries private Drive relay traffic through the primary and alternate Google API hosts using both `fetch` and `XMLHttpRequest`, then falls back to the Google API JavaScript client.
- Creates, reads, and deletes a short-lived probe in Drive's private app-data space before retrying the actual pairing offer.
- Adds a bounded authorization wait and route-specific diagnostics if the Google popup or every browser route fails.
- Preserves V0.9.5.05 pairing diagnostics and all V0.9.5.04 inline blocking and numeric SMS short-code behavior.

## Phone compatibility

This is a PC web-transport correction. The existing V0.9.5.05 Android connector uses the same encrypted pairing protocol and does not need to be reinstalled for this test. The V0.9.5.06 APK remains available as a matching optional build.

## Security and data boundary

The repair probe contains only a random identifier and timestamps. It expires after two minutes, is deleted immediately after verification, and is also covered by stale-relay cleanup. Pairing offers and encrypted session frames keep the existing private app-data boundary.

## Release identifiers

- Version: `0.9.5.06`
- Build: `095006`
- Android version code: `95006`
- Service worker cache: `lotkeys-app-v095006-pairing-browser-route-recovery`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095006`

## Verification

- Run `node --test tests/*.test.js`.
- Run JavaScript syntax checks for the external and inline scripts.
- Build and lint the Android test layer.
- Confirm **Validate LotKeys web build**, **pages build and deployment**, and **Build LotKeys Android Layer** succeed in GitHub Actions.
