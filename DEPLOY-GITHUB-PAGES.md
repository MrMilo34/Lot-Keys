# Host the LotKeys test build with GitHub Pages

LotKeys needs a normal HTTPS origin for Google browser OAuth. Opening `index.html` with Android's `content://` URL is fine for UI testing but Google authorization will not work there.

## Team-test deployment

1. Open the existing `MrMilo34/Lot-Keys` repository and use its `main` branch.
2. Extract the release ZIP, then upload **everything inside it** directly to the repository root. The ZIP is already flat: `index.html` and `CNAME` appear immediately after extraction, with no version-named wrapper folder. Do not omit the `assets` or `extension` folders or either feature module. The required root items include:
   - `index.html`
   - `manifest.webmanifest`
   - `sw.js`
   - `icon.svg`
   - `lotkeys-messaging.js`
   - `lotkeys-awards.js`
   - `install.html`, `privacy.html`, and `terms.html`
   - `lotkeys-store-directory.json`, `lotkeys-creator-access.json`, `version.json`, and the exact file `CNAME`
   - the complete `assets` folder
   - `extension/latest.json`
   - the existing `extension/latest` unpacked Post Buddy source
   - `extension/releases/LotKeys-Facebook-Assistant-Beta-v0.1.13.zip`
   - no duplicate `LotKeys-Facebook-Assistant-Latest.zip` is required
3. Open the repository's **Settings**.
4. Open **Pages** under Code and automation.
5. Under Build and deployment, choose **Deploy from a branch**.
6. Select the `main` branch and `/ (root)` folder.
7. Save.
8. Wait for GitHub to publish the page, then use the HTTPS URL GitHub provides.
9. Open that URL in Chrome on Android.

The GitHub Pages project URL is `https://mrmilo34.github.io/Lot-Keys/`. With the root `CNAME` active, GitHub redirects it to the canonical public address, `https://lot-keys.ca/`; this redirect is expected.

Google OAuth Authorized JavaScript origins contain only the scheme and hostname: use `https://mrmilo34.github.io`, `https://lot-keys.ca`, and `https://www.lot-keys.ca` during the transition.

Do not put Google client secrets, passwords, Drive access tokens, customer data, VIN databases, or other private dealership data in the GitHub repository. This repository contains only the static application code. Actual vehicle/customer files stay in Google Drive.
