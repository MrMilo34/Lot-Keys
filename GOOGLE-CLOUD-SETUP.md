# Google Cloud setup for LotKeys Drive Test

Use this only for the current test build. The release version should not ask dealership users to enter developer credentials.

## V0.9.4.51 team-test note

The official build now includes the current LotKeys OAuth Web Client ID, so normal testers should not paste developer credentials into the app. Keep the Google Auth Platform app in **Testing** and add every tester's exact Google account email under **Test users**.

Add these Authorized JavaScript origins to the Web Client:

- `https://lot-keys.ca`
- `https://www.lot-keys.ca`
- `https://mrmilo34.github.io` during the domain transition

The current Store Code discovery design requests `drive.file` plus `drive.readonly`. `drive.readonly` is broader than the intended public scope and is a production release gate: either complete Google's required scope/security verification or replace discovery with the planned authenticated backend and a narrower file-access flow. Do not describe the current V0.9.4.51 scope as `drive.file`-only.

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
- V0.9.4.51 requests `openid`, `email`, `drive.file`, and `drive.readonly` for the controlled team test.

`drive.file` covers files the user granted to or created with LotKeys. The additional `drive.readonly` scope currently enables Store Code discovery across an already-shared Store folder and must be removed or formally reviewed before public launch.

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

Then use **Choose Store Folder**. Selecting the folder through Google Picker is still the preferred explicit setup path. V0.9.4.51's optional Store Code discovery currently also uses read-only Drive discovery as documented above.

Enter the Store name and your user name, then tap **Initialize / Repair Store Structure**.

## v0.7 user identity note

LotKeys v0.7 requests the standard Google `openid` + `email` scopes in addition to the existing `drive.file` scope. This is used only to bind a LotKeys user name to the Google account that signed in, so another person cannot simply claim an existing LotKeys user name. After upgrading, existing users should reconnect Google Drive once and approve the basic account-email permission.
