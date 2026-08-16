# LotKeys Drive Test v0.2

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
