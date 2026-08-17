# LotKeys Drive Test v0.4.2

- Adds **Videos** and **Attachments** galleries directly inside the Vehicle Profile, immediately below the master Photos area.
- Videos can be played in-app when a local copy is available, or opened from Google Drive after sync.
- Attachments show as visual cards with filenames, file type, sync state, and Open actions; image attachments get thumbnails.
- The Add/Edit Vehicle screen now previews existing Videos and Attachments instead of showing only file-picker boxes.
- Adding more Videos or Attachments **appends** to the existing set instead of replacing what was already attached.
- Videos and Attachments can be removed from the Edit Vehicle screen; Drive sync then removes the corresponding synced file.
- Keeps the v0.4.1 Info From Photo improvements.
- Service-worker cache bumped to v0.4.2.

# LotKeys Drive Test v0.4.1

- Polishes Info From Photo result rows to display clear `Label: Value` spacing on mobile.
- Adds an enhanced contrast/upscale OCR fallback for difficult key tags and labels.
- Adds `INFI` → `Infiniti` recognition for abbreviated lot tags.
- Adds a conservative suggested stock-number fallback when a tag shows an unlabeled dealer stock code.
- Service-worker cache bumped to v0.4.1.

# LotKeys Drive Test v0.4

## New in v0.4

- **Info From Photo (first test version):** when adding/editing a Vehicle Profile, choose one or more photos/screenshots and LotKeys runs browser-side OCR to suggest Year, Make, Model, Price, Odometer/Unit, VIN, and Stock #.
- High-confidence values are preselected but **nothing is applied until the user reviews and taps Apply Selected**.
- A valid 17-character VIN is treated as high confidence; labeled fields such as `STK`, `YEAR`, `MAKE`, and `MODEL` are prioritized.
- The photos used for Info From Photo are analysis-only and are **not** automatically added to the customer-facing vehicle Photos folder.
- OCR uses Tesseract.js in the browser and is loaded only when the feature is used; the first scan can take longer while the OCR engine/language data downloads.
- Vehicle Profile / Google Drive folder naming is now **`Year Make Model - Stock #`** (for example `2022 Infiniti Q60 - PH80225`). Existing synced profile folders will be renamed on their next save/sync.
- Service-worker cache bumped to v0.4 so phones pick up the new build.

# LotKeys Drive Test v0.3.1

**Hotfix:** fixes Google Drive vehicle sync error `buildVehicleProfileName is not defined`. The shared naming helper now lives outside the UI module so Drive sync can call it. Service-worker cache version was also bumped so the fixed build replaces v0.3 on phones.

# LotKeys Drive Test v0.3

This is the first hosted test build that can write real vehicle and listing data into Google Drive.

## What is implemented

- Google OAuth 2.0 browser authorization using Google Identity Services.
- Google Picker folder selection so the user deliberately grants LotKeys access to a Store folder.
- Store folder initialization:
  - `Users/<User Name>/Listings`
  - `Administration`
  - `Inventory`
- Vehicle Drive sync:
  - creates/updates one Vehicle Profile folder
  - creates `Vehicle Data - Administrative` as a Google Sheet
  - creates `Shared/Photos`, `Shared/Videos`, and `Shared/Documents`
  - uploads vehicle media into the correct Shared subfolder
  - preserves the master photo order by prefixing synced photo filenames `01 -`, `02 -`, etc.
  - stores Drive file/folder IDs so renaming a profile does not break references
  - automatically creates the Shared folder link
  - optionally enables `Anyone with the link can view` on the Shared folder
- Marketplace listing Drive sync:
  - listing data stays separate from the Vehicle Profile description
  - writes the salesperson's listing record under `Users/<User>/Listings`
- Store config sync:
  - saved posting locations are written into `Administration/LotKeys Store Config.json`
- Deleting a synced vehicle moves the Vehicle Profile folder to Google Drive Trash.
- Local IndexedDB remains the phone/browser cache and offline working copy.

## Important test-build limitation

The app uses Google's browser token model. The Drive access token is held only for the current browser session and expires. If needed, LotKeys will ask you to authorize again. A production release should use a more durable authentication architecture rather than storing long-lived secrets in the browser.

## Before testing Drive

1. Host this folder at an HTTPS URL.
2. Create a Google Cloud project.
3. Enable Google Drive API, Google Picker API, and Google Sheets API.
4. Configure the OAuth consent screen and add yourself as a test user.
5. Create a Web OAuth Client ID with the hosted app's exact origin as an Authorized JavaScript origin.
6. Create an API key for Google Picker and restrict it to your hosted site/API when possible.
7. Find the Google Cloud Project Number.
8. In LotKeys > Settings > Test developer setup, enter the Client ID, API key, and Project Number.
9. Tap Connect Google Drive.
10. Tap Choose Store Folder and select an empty test Store folder.
11. Enter Store Name and My User Name.
12. Tap Initialize / Repair Store Structure.
13. Create a small test vehicle with two photos and verify the Drive folders, Sheet, and Shared link.

See `GOOGLE-CLOUD-SETUP.md` and `DEPLOY-GITHUB-PAGES.md` for the detailed sequence.


## v0.3 naming rule
Vehicle Profile names are generated automatically as `STK: <stock> - <year> <make> <model>`. If the Model already begins with the Make, LotKeys avoids duplicating it. Marketplace titles remain salesperson-controlled and free-form. Existing synced vehicle folders are renamed on the next vehicle save/sync.
