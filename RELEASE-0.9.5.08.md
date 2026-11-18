# LotKeys V0.9.5.08 — paired PC and background recovery

Prepared September 27, 2026 for the LotKeys TEST site from the verified V0.9.5.07 checkpoint.

## Changes

- Hub 📶 turns green when the Android connector has an active or still-trusted PC. SMS/MMS coverage and the RCS limitation remain visible in the connection detail.
- On the phone, the healthy synchronization label and dot turn blue for a paired PC. Warnings and errors keep their existing colors.
- Phone connection offers **🖥️ Connected** to inspect active and trusted computers and forget individual PCs.
- The paired phone dialog shows the Android Battery → Unrestricted path, including for the previously installed compatible connector.
- The PC retries an expired automatic pairing offer, and after repeated failed heartbeats and a stale session it starts a new key exchange only for a still-trusted PC. Explicit disconnection still removes its remembered pair.
- The Android relay serves message frames before scanning new offers. The updated Android connector links to its battery settings to help keep messaging available with the screen locked.

## Release identifiers

- Version: `0.9.5.08`
- Build: `095008`
- Android version code: `95008`
- Service worker cache: `lotkeys-app-v095008-phone-pairing-background-recovery`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095008`

## Physical phone checks

Install the V0.9.5.08 TEST Android APK, leave its phone connection enabled, and set battery usage to Unrestricted for a locked-phone test. Verify paired colors, the connected PC list and Forget action, then send a fictional SMS from the PC with the phone locked and its browser closed. Repeat after idle and after a network interruption.

The relay uses Google Drive polling. Android Doze can suspend network access during deep idle; immediate delivery in every locked-phone state cannot be guaranteed without a wake mechanism such as an appropriate push path. This release improves recovery and exposes the battery setting; it does not claim to bypass Android's network restrictions.
