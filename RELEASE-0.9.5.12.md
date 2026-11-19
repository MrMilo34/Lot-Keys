# LotKeys V0.9.5.12 — Android account relay recovery

## Physical-test failure corrected

V0.9.5.11 could show **PC relay · ready** immediately after account selection while the background service reported `AccountNotPresent`. The PC could create a four-digit offer, but Android never discovered it and the request remained **Waiting for phone approval**.

## Changes

- Preserve the exact Google account name and Android account type returned by the account picker.
- Pass the fresh Google authorization token directly into the running foreground service.
- Require one account re-selection when upgrading from V0.9.5.11, whose saved record did not contain the complete Android identity.
- Show the live relay error in the connector instead of painting a false Ready state from saved setup data alone.
- Stop the old relay before changing accounts so a cached token cannot survive into the replacement identity.
- Guide **⋮ → Allow restricted settings** when Android blocks Messages access for the sideloaded TEST APK.
- Open Android's direct battery-exemption confirmation from **Locked-Phone Battery Settings**.
- Retain trusted-PC automatic reconnect, latest-offer selection, encrypted ECDH/AES-GCM pairing, and one-active-PC rules from V0.9.5.11.

## Upgrade test

1. Install the signed V0.9.5.12 APK over V0.9.5.11.
2. Open the connector and select the LotKeys Google account once when prompted.
3. Confirm **PC relay · ready** has no error detail.
4. Tap **Open LotKeys & Link This Phone**.
5. Start pairing on the PC and verify the same four digits appear on the phone.
6. Approve a trust window, close the phone browser, and verify a later stale session reconnects without another manual approval while trust remains valid.

## Release identifiers

- Web version: `0.9.5.12`
- Web build: `095012`
- Android version code: `95012`
- Android version name: `0.9.5.12-test`
- Service worker cache: `lotkeys-app-v095012-android-relay-account-recovery`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095012`
