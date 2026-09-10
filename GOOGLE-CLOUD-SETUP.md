# Google Cloud setup for LotKeys Drive Test

Use this only for the current test build. The release version should not ask dealership users to enter developer credentials.

## V0.9.4.58 team-test note

The official build now includes the current LotKeys OAuth Web Client ID, so normal testers should not paste developer credentials into the app. Keep the Google Auth Platform app in **Testing** and add every tester's exact Google account email under **Test users**.

Add these Authorized JavaScript origins to the Web Client:

- `https://lot-keys.ca`
- `https://www.lot-keys.ca`
- `https://mrmilo34.github.io` during the domain transition

The current Store Code design resolves an existing shared Store folder and creates/updates content inside it. V0.9.4.58 therefore requests `https://www.googleapis.com/auth/drive` for the controlled team test. The previous `drive.file` plus `drive.readonly` combination could discover the folder but could not create children unless the folder had first been opened through Google Picker. Full Drive access is a production release gate: complete Google's required verification/security work or replace Store discovery with the planned authenticated backend and narrower picker/broker flow before public launch.

OAuth **Test users** controls who can authorize LotKeys. Google Drive sharing separately controls which Store folders that person can edit. Share the root LotKeys Store folder with each tester's exact Google account as **Editor**.

For public release, move to a separate production Google Cloud project, verify `lot-keys.ca`, publish the included Privacy/Terms pages, and complete the production readiness work in `SECURITY-RELEASE-GATE.md`.

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
- Under **Data Access**, add `https://www.googleapis.com/auth/drive` to the app's requested scopes.
- V0.9.4.58 requests `openid`, `email`, and `https://www.googleapis.com/auth/drive` for the controlled team test.

The Drive scope lets LotKeys locate the Store selected by its Store Code and build the required folders/files there. Treat it as a restricted team-test scope and do not move this static build to public production without completing the release gate.

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

Garage > Admin Level 2 · Store Configuration > Advanced Google / Store controls

Enter:

- OAuth Web Client ID
- Google Picker API Key
- Google Cloud Project Number

Tap **Save Google Test Credentials**.

## 8. Connect and choose the Store folder

Use **Connect Google Drive** and approve access.

Then use **Choose Store Folder** for creator-led Store setup, or give an existing tester the Store Code after sharing the root Store folder with their exact Google account as **Editor**.

Enter the Store name and your user name, then tap **Initialize / Repair Store Structure**.

## v0.7 user identity note

LotKeys v0.7 added the standard Google `openid` + `email` scopes to bind a LotKeys user name to the Google account that signed in, so another person cannot simply claim an existing LotKeys user name. This historical identity requirement remains part of the current grant.
