# LotKeys V0.9.5.09 — phone reconnection and connection dialog

Prepared September 27, 2026 for the LotKeys TEST site from V0.9.5.08.

## Changes

- On the PC, **Reconnect phone** tests a saved, apparently offline session before making a new pairing offer. A successful reply resumes the session without a new code. If the probe fails or times out, pairing proceeds, and a late reply cannot overwrite a replacement session.
- On the phone, **🖥️ Connected**, **Sync records**, and **Pair a computer** appear side by side in the Phone connection dialog, including at narrow mobile widths.
- Phone connection warnings report phone relay failures only. A separate Hub records sync failure no longer appears in that dialog as an unexplained “Failed to fetch.”
- The PC pairing screen asks testers to check the Android connector and same Google account if a request does not appear.
- The V0.9.5.08 connector remains protocol compatible; these web changes do not require its reinstall.

## Release identifiers

- Version: `0.9.5.09`
- Build: `095009`
- Android version code: `95009` (metadata only; no native behavior change)
- Service worker cache: `lotkeys-app-v095009-phone-reconnect-dialog-recovery`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095009`

## Physical PC and phone check

Pair with a four-digit code, let the session idle, and use **Reconnect phone** on the PC. Confirm a responsive saved session resumes without a new code. If it does not respond, check that a fresh code appears and that the Android connector receives it while awake on the same Google account. Test after locking the phone and after leaving the phone browser, and record any waiting time or connector error. Android deep idle can defer the Drive relay; this release does not guarantee immediate locked-phone delivery.
