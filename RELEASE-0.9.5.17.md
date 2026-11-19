# LotKeys V0.9.5.17 — Hub chat actions and PC composer

## What changed

- Device conversations now present the six actions in the requested order: **Notes, Questions, Call, Media, Booking, Organize**.
- Every Hub **🗂️ Organize** action now uses the same high-contrast treatment as Device Categories: black with white text in the light theme and white with black text in the dark theme.
- On PC-sized screens, the Device and LotKeys chat action strips become a fixed right-side rail. Device history reserves space for the rail so it cannot cover message bubbles.
- In both PC chat composers, **Enter** sends and **Shift+Enter** inserts a new line. Composition events and held-key repeats are ignored, and phone/touch keyboard behavior is unchanged.

## Retained behavior

V0.9.5.16 live MMS previews, saved-photo restoration, automatic older-message loading, newest-six-first rendering, media sections, open-chat refresh, and trusted reconnection remain in place.

This is a web-only update. Keep the signed V0.9.5.12 Android connector installed. No APK reinstall, permission change, account re-selection, or re-pairing is required.

## Release identifiers

- Web version: `0.9.5.17`
- Web build: `095017`
- Release: `hub-chat-actions`
- Service worker cache: `lotkeys-app-v095017-hub-chat-actions`
- Compatible Android version: `0.9.5.12-test`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095017`
