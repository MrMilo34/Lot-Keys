# LotKeys Drive Test v0.5.6

## v0.5.6

- Posting Assistant photo actions simplified to **💾 Download Photos** and **📂 Open Drive Photos**.
- Removed the redundant browser folder-save action.
- Facebook Selling shortcut now documents the tested Android behavior: if Facebook opens **No results found**, tap **Back once** to reach the Selling screen; Marketplace Home remains the fallback.
**Facebook Posting Assistant field correction:** Listing Name and Odometer are restored to the prepared Facebook copy fields. The full prepared set is now Listing Name, Year, Make, Model, Price, Odometer, Location / Postal Code, and Description.


**Facebook Android routing fix:** the direct `/marketplace/create/vehicle` deep link is no longer used from the Posting Assistant because the Facebook Android app can route it into a broken Marketplace search screen. The primary button now opens Marketplace Home and tells the user to use Facebook's normal Sell → Create listing flow.

# LotKeys Drive Test v0.5.1

## Facebook Posting Assistant

- Adds **Post to Facebook** to every LotKeys Marketplace listing.
- Adds **Save & Prepare Facebook** when creating/editing a listing so the user can jump directly into the posting workflow.
- Posting Assistant keeps the listing's exact custom photo order visible and provides:
  - **Open Drive Photos**
  - **Download Photos** with numbered filenames matching the listing order
  - **Share / Save Photos** through Android's Web Share sheet when supported
- Adds one-tap copy controls for:
  - Marketplace Title
  - Year / Make / Model
  - Price
  - Odometer + unit
  - Saved listing location/address/coordinates
  - Marketplace Description
- Adds **Open Facebook Marketplace** from the prepared listing.
- After publishing, **I Posted It** marks the listing Active, records `postedAt`, accepts the Facebook listing URL, and syncs that information to `Users/<User>/Listings` in Google Drive.
- Listing age now uses the actual Facebook `postedAt` time when available instead of only the LotKeys draft creation time.
- Duplicating a listing resets the Facebook URL, posted time and Drive listing file reference.
- Drive listing JSON schema bumped to version 3 to include `postedAt` and `lastPreparedAt`.
- Service-worker cache bumped to v0.5.1.

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


## v0.5.4 Facebook assistant refinements

- Posting Assistant now mirrors the Facebook Android vehicle form fields observed in testing: Year, Make, Model, Price, Postal Code location, and Description.
- Saved posting locations now have a dedicated Facebook Postal Code field; address/coordinates remain optional reference data.
- Primary Facebook button now targets the Marketplace Selling area (`/marketplace/you/selling`), with Marketplace Home kept as a fallback.
- Marketplace Title and odometer remain stored in LotKeys even though the current Facebook vehicle form does not request them on the first screen.


## v0.5.7 Facebook navigation test

- Facebook button now opens the parent Marketplace account route (`/marketplace/you/`) instead of `/marketplace/you/selling`.
- This is intended to avoid the Android Facebook app interpreting the final `selling` path as a Marketplace search.
- Marketplace Home remains available as a fallback.
