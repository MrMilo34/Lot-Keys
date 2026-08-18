# LotKeys Drive Test v0.7.5

## v0.7.5 changes

- Full clean release based on the complete v0.7.4 build plus the CARFAX badge sizing hotfix.
- One Owner, Low Kilometres and No Reported Accidents are inserted using the same display height so the One Owner badge no longer renders taller than the others.
- CARFAX history badges remain on one line when all three placeholders are kept together in the Administration template.
- VIEW CARFAX REPORT remains a normal text hyperlink; the old CARFAX View Report graphic is not required.
- Service-worker cache bumped to v0.7.5 to avoid stale partial-patch files after replacing the GitHub release.

# LotKeys Drive Test v0.7.3

## v0.7.3 changes

- Added a traffic-light readiness indicator beside the + button on every main screen.
  - Green = Google Drive connected, user/store ready, and no pending local changes.
  - Yellow = Google Drive needs reconnecting, an item is pending/syncing, or a background refresh is running.
  - Red = Store/account setup is incomplete or one or more items have a Drive sync error.
- Tap the readiness circle to see what is happening and plain-language instructions to correct it.
- Vehicle and Marketplace cards highlight yellow while local/pending/syncing; Marketplace status Pending also highlights yellow. Drive sync errors highlight red.
- Copy buttons briefly turn yellow and show “Copied ✓” after copying a link or Facebook field.
- Marketplace listing forms now close after the local save and synchronize to Drive in the background, making the pending/syncing state visible instead of holding the user on “Saving…”.



## v0.7.2 changes

- CARFAX placeholders can now render the supplied CARFAX graphics in generated Vehicle Info Directory PDFs. The report image is linked to the vehicle CARFAX URL; One Owner / Low Kilometres / No Reported Accidents images appear only when their Vehicle Profile checkboxes are selected.
- Fixed v0.7.1 listing migration pulling old duplicate test drafts back into My Listings. Legacy no-location/no-Facebook draft copies for the same vehicle are collapsed to the newest record and stale duplicate files are moved to Drive Trash. Posted, active, Facebook-linked, and location-specific listings are preserved.
- New listing records use schema v5 so future intentional drafts are not treated as v0.7.1 legacy duplicates.

## v0.7.1 changes

- Marketplace Listings are now user-specific Drive data, not device-only data. The same LotKeys/Google user can load their listings on phone, PC, or another browser.
- Added `Users/<User>/Listings/Listings Index.json` for faster cross-device listing refreshes. Existing listing JSON files are discovered and indexed automatically.
- Existing local listings are migrated to the signed-in user's Drive Listings folder when needed.
- My Listings refreshes every 5 minutes, when returning to LotKeys, when opening Home/Listings, and with a manual **Refresh Listings** button.
- A listing keeps a snapshot of its location for display on another device, while saved Posting Locations/Postal Codes remain client-side preferences.
- Deleting a listing now removes its synced Drive listing record and updates the user Listings index.
- Vehicle Info Directory placeholders now inject plain text only. LotKeys no longer adds emojis/checkmarks; administrators control all icons/graphics in the Google Doc template.
- Vehicle Info Directory fingerprints were bumped so the text-only placeholder behavior is picked up on the next vehicle sync.

# LotKeys Drive Test v0.7.0

## v0.7.0 changes

- Shared Inventory now loads back from Google Drive on other devices.
- Added a Drive-backed `Inventory Index.json` for fast store-wide refreshes, with full-scan fallback for existing inventory.
- Store inventory refreshes every 5 minutes while LotKeys is open and when returning to the app; manual Refresh Inventory is also available.
- Vehicle editing now saves locally immediately and syncs to Drive in the background. Unchanged media and Vehicle Info Directory work are skipped when possible.
- LotKeys users are bound to the Google account used to connect. Duplicate user names cannot be claimed by another Google account. The first registered user is the Store Administrator.
- Settings are role-aware: normal users see account/Drive status and their own posting locations; Store/Drive/template/developer controls are Administrator-only.
- Saved Facebook posting locations are client-side user preferences and are no longer stored in the shared Store configuration.
- One Store Name is now used everywhere; the duplicate Vehicle Info Directory Store Name setting was removed.
- Vehicle Profile actions are now: Copy Vehicle Info Sheet Link, Open Shared Folder, Sync Vehicle.
- CARFAX checkbox label spacing was refined.
- Existing v0.6.x directory template references are re-resolved from Administration once during migration.
- Vehicle media is hydrated from Drive on demand when opening a vehicle or preparing a listing on another device.

# LotKeys Drive Test v0.6.2

Adds the customer-facing **Vehicle Info Directory** system.


## New in v0.6.1

- Store-wide settings now live in `Administration/LotKeys.json`.
- Existing `LotKeys Store Config.json` files are migrated/renamed automatically.
- A staff member connecting to an existing Store folder loads the shared Store name, address, directions URL, template reference, and saved posting locations.
- User name remains device/user-specific and is not written into the shared Store config.
- CARFAX checkboxes are displayed side-by-side: **One Owner**, **Low Odometer**, **No Accidents**.
- Customer directory badge wording follows the shorter labels while the existing template placeholders remain compatible.

## New in v0.6
- Vehicle Profile fields for optional Original Vehicle Listing URL and CARFAX URL.
- User-controlled CARFAX badges: One Owner, Low Kilometres, No Reported Accidents.
- Store-level customer directory name, address and directions URL.
- An editable Google Doc template named `Vehicle Info Directory Template` in Administration.
- Every synced vehicle generates/updates `Vehicle Info Directory.pdf` inside Shared.
- PDF links to the original listing (when supplied), Photos, Videos, Inspections & Documents, CARFAX (when supplied), and store directions.
- Existing photo/video/document and Facebook Posting Assistant behavior remains.

## One-time Google Cloud change
Enable **Google Docs API** in the same LotKeys Google Cloud project. No new OAuth client is required; the existing `drive.file` scope is accepted by the Docs API.

## Template rule
Administrators can edit branding, graphics, fonts, wording and layout. Keep the `{{...}}` placeholder tokens intact so LotKeys can replace them when creating each PDF.

# LotKeys Drive Test v0.6

- Facebook Posting Assistant displays prices as formatted Canadian currency (for example `$18,488`) while the Copy button still sends the plain numeric value (`18488`) for Facebook compatibility.

# LotKeys Drive Test v0.5.9

UI cleanup: the **Create Listing → Vehicle Profile** selector now displays saved vehicles consistently as `Year Make Model — Stock #`. Stock numbers remain searchable/useful without being repeated in the visible label.

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

## v0.6.2 changes

- Create menu now puts **🚙 Vehicle Profile** first and uses **📄 Marketplace Listing** second.
- CARFAX history checkboxes keep all three choices in one row with reliable spacing between each box and label.
- Vehicle Info Directory generation re-resolves **Administration / Vehicle Info Directory Template** before every generation. The Administration template is now the source of truth instead of a stale cached template ID.
- **Info From Photo** now prioritizes a grouped **Year + Make + Model** heading and nearby **STK/VIN** evidence before page-wide fallbacks. This prevents dealership branding such as Infiniti from overriding the actual vehicle make on website screenshots.
- Odometer/KM may still be recovered from elsewhere on the image because dealership sites often place mileage in a separate section.
- Sale/Your Price is preferred over a regular/list price when both are visible.

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

## v0.5.8 Facebook Selling route test
- Primary Facebook button now targets exactly `https://www.facebook.com/marketplace/selling`.
- This tests the simpler Selling route observed during live Android/Facebook app testing.
- Marketplace Home remains available as the fallback.
