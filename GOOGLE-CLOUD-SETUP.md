# Google Cloud setup for LotKeys Drive Test

Use this only for the current test build. The release version should not ask dealership users to enter developer credentials.

## 1. Create the project

Create a Google Cloud project such as `LotKeys Test`.

## 2. Enable APIs

Enable these three APIs in that project:

- Google Drive API
- Google Picker API
- Google Sheets API

## 3. Configure OAuth consent

In Google Auth Platform:

- Configure Branding / app information.
- Use External audience for a normal personal Google account.
- Keep the app in Testing while we develop.
- Add your own Google account under Test users.
- The application requests only `https://www.googleapis.com/auth/drive.file` for this test.

`drive.file` is Google's recommended narrow per-file Drive scope and can also authorize Sheets operations on files the user granted to the app.

## 4. Create the OAuth Web Client

Create an OAuth Client with application type **Web application**.

Under **Authorized JavaScript origins**, add the exact origin of your hosted LotKeys site.

Example:

`https://YOUR-GITHUB-USERNAME.github.io`

If the app is hosted as a project site such as `https://YOUR-GITHUB-USERNAME.github.io/lotkeys-test/`, the JavaScript origin is still only:

`https://YOUR-GITHUB-USERNAME.github.io`

Copy the generated Client ID. It ends with `.apps.googleusercontent.com`.

## 5. Create the Picker API key

Create an API key. For testing, enter it into LotKeys Settings.

Before public use, restrict the key to the Google Picker API and to the website origins that are allowed to use it.

## 6. Find Project Number

Google Picker's `setAppId` uses the numeric Cloud Project Number, not the textual Project ID. Copy the Project Number from Google Cloud project information.

## 7. Enter all three values in LotKeys

Open:

Settings > Test developer setup

Enter:

- OAuth Web Client ID
- Google Picker API Key
- Google Cloud Project Number

Tap **Save Google Test Credentials**.

## 8. Connect and choose the Store folder

Tap **Connect Google Drive** and approve access.

Then tap **Choose Store Folder**. Selecting the folder through Google Picker is important because the app intentionally uses the narrow `drive.file` scope instead of requesting access to the user's entire Drive.

Enter the Store name and your user name, then tap **Initialize / Repair Store Structure**.

## v0.7 user identity note

LotKeys v0.7 requests the standard Google `openid` + `email` scopes in addition to the existing `drive.file` scope. This is used only to bind a LotKeys user name to the Google account that signed in, so another person cannot simply claim an existing LotKeys user name. After upgrading, existing users should reconnect Google Drive once and approve the basic account-email permission.

## v0.7.6: allow LotKeys to see files added directly in Drive

LotKeys now treats the Store's Drive folders as the source of truth. To discover files that were uploaded manually (rather than created by LotKeys), the test build requests both:

- `https://www.googleapis.com/auth/drive.file` — write/manage LotKeys-created files
- `https://www.googleapis.com/auth/drive.readonly` — read existing/manual Store files

In Google Auth Platform → Data Access, add the **Google Drive API / `drive.readonly`** scope for this test project if Google asks you to configure the requested scope. Keep your account listed as a test user while the app is in Testing mode.

After deploying v0.7.6, reconnect Google Drive once so the browser receives a token with the new read permission.

Production note: `drive.readonly` is a restricted Google Drive scope. Before public release, LotKeys should move to an architecture that avoids requesting broad personal-Drive access where practical (for example a dedicated Store Shared Drive/backend permission model) or complete Google's required verification.
