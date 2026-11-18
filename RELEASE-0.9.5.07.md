# LotKeys V0.9.5.07 — PC pairing multipart upload correction

Prepared September 26, 2026 (America/Edmonton) for the LotKeys TEST site.

## Observed failure

V0.9.5.06 reached Google Drive, but its PC pairing probe returned “Invalid multipart request with 0 mime parts.” The upload's random boundary contained uppercase characters. Constructing a `Blob` with a multipart MIME type lowercased its `type` and therefore the request header, while the body kept the original mixed-case delimiter. Google could not match the parts.

## Correction

- Build the JSON multipart body without setting `Blob.type`; send the original, matching boundary as the explicit request `Content-Type` header.
- Apply the same request representation through Fetch, XMLHttpRequest, and the Google API client fallback.
- Add a regression test that parses an actual mixed-case multipart body and verifies both JSON parts against the header boundary.
- Preserve the V0.9.5.06 account chooser, route fallbacks, probe cleanup, pairing encryption, and V0.9.5.05 Android protocol compatibility.

## Release identifiers

- Version: `0.9.5.07`
- Build: `095007`
- Android version code: `95007` (matching optional TEST build; existing V0.9.5.05+ connector remains compatible)
- Service worker cache: `lotkeys-app-v095007-pairing-multipart-boundary-fix`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095007`

## Verification

Run the JavaScript syntax checks, inline script parse, `node --test tests/*.test.js`, release checksum validation, and GitHub Pages/web/Android workflows. Real Google account and phone pairing must be confirmed on the user's devices.
