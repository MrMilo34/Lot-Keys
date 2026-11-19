# LotKeys V0.9.5.10 — Android relay required for PC pairing

Prepared September 26, 2026 (Edmonton) for the LotKeys TEST site from V0.9.5.09.

## Changes

- The phone page no longer substitutes its own Google Drive pairing loop when the Android connector's PC relay is unauthorized. That browser-only path explained why a session could appear paired while the site was open and then lose the PC when the phone left it.
- **Check PC relay** reports the connector's authorization state and directs the user to finish the same-account PC Pairing Account step in LotKeys Connector TEST. A native relay error remains visible after local SMS records refresh.
- A pending automatic PC pairing offer opens its four-digit matching code when Hub is visible, without a second tap on **Pairing**. It closes when the matching session connects or the offer ends.
- Old browser-owned phone sessions are not restored after reload; the Android service must own the phone side of a new PC pairing.
- The compatible installed Android connector is unchanged. This web release does not produce a signed APK, restart a stopped Android service, or guarantee immediate delivery while Android suspends network access.

## Release identifiers

- Version: `0.9.5.10`
- Build: `095010`
- Service worker cache: `lotkeys-app-v095010-android-relay-required-pairing-code`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095010`
- Android source metadata remains V0.9.5.09; the installed compatible connector can be reused.

## Physical phone check

Open LotKeys Connector TEST and confirm its PC Pairing Account is authorized on the same Google account as the PC. Leave its phone connection notification running. Pair with the matching code, switch the phone to another app, and try refreshing a fictional conversation on the PC. If it disconnects, capture the exact text of the connector notification and Phone connection's Android relay warning, plus the connector version; these distinguish a stopped service from a Google relay or network failure.
