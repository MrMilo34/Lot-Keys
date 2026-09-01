# Host the LotKeys test build with GitHub Pages

LotKeys needs a normal HTTPS origin for Google browser OAuth. Opening `index.html` with Android's `content://` URL is fine for UI testing but Google authorization will not work there.

## Simple test deployment

1. Create a GitHub repository, for example `lotkeys-test`.
2. Upload the contents of the `LotKeys-Drive-Test` folder to the root of that repository:
   - `index.html`
   - `manifest.webmanifest`
   - `sw.js`
   - `icon.svg`
3. Open the repository's **Settings**.
4. Open **Pages** under Code and automation.
5. Under Build and deployment, choose **Deploy from a branch**.
6. Select the `main` branch and `/ (root)` folder.
7. Save.
8. Wait for GitHub to publish the page, then use the HTTPS URL GitHub provides.
9. Open that URL in Chrome on Android.

For a repository named `lotkeys-test`, the URL normally looks like:

`https://YOUR-GITHUB-USERNAME.github.io/lotkeys-test/`

The OAuth Authorized JavaScript origin you enter in Google Cloud is only the origin portion:

`https://YOUR-GITHUB-USERNAME.github.io`

Do not put Google client secrets, passwords, Drive access tokens, customer data, VIN databases, or other private dealership data in the GitHub repository. This repository contains only the static application code. Actual vehicle/customer files stay in Google Drive.
