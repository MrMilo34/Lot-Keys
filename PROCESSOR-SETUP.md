# LotKeys Store Processor setup

The Store Processor is the trusted management writer between each user’s `More` request queue and the official Inventory. It allows ordinary and Trusted users to remain **Viewer** on Inventory. Install it once from the Google account registered in LotKeys as **Admin Level 2**.

## Before installing

1. Upload the complete V0.9.4.61 website package to GitHub Pages.
2. Sign in to LotKeys as Admin Level 2.
3. In **Garage → Approved Users**, add every tester using their exact Google account email.
4. Press **Repair Store Structure** once. This creates each user’s writable `Listings` and `More` workspace and applies the Viewer/Administrator Drive roles.
5. Confirm the Store folder ID at the top of `processor/Code.gs` is the correct Store. This release is preconfigured for `1vJRzFWTVtg9o1fRw5dUNsY2JNlIhOf-g`.

## Create the Apps Script project

1. Open [Google Apps Script](https://script.google.com/) while signed in as the Admin Level 2 Google account and create a **New project** named `LotKeys Store Processor`.
2. Replace the complete `Code.gs` contents with the complete contents of `processor/Code.gs` from this release, even if V0.9.4.60 is already installed.
3. Open **Project Settings**, enable **Show “appsscript.json” manifest file in editor**, then replace the complete manifest with `processor/appsscript.json` from this release.
4. Save the project. The manifest enables the Advanced Drive service (`Drive API v3`). If the editor still shows Drive as unavailable, open **Services → +**, choose **Drive API**, select **v3**, and add it.
5. From the function menu select `installLotKeysProcessor`, press **Run**, review the requested Google permissions, and approve them. Run this installer again when upgrading an existing processor; it safely replaces the old minute trigger.

The install function verifies the executing Google email against the LotKeys Admin Level 2 registry, repairs Drive access, processes the first request batch, and creates one trigger that runs every minute.

## Verify

Run `getLotKeysProcessorStatus` from Apps Script. Its execution result should report:

- `version: 0.9.4.61`
- `triggerInstalled: true`
- the expected Store folder ID
- the number of Approved Users

Then test with an ordinary user:

1. Connect using the Store Code while the Store/Inventory role is Viewer.
2. Open any Vehicle Profile and press **View Your More Media Folder**.
3. Submit one information correction and one photo.
4. Within about one minute, the information and photo should appear in the Administration contribution queue—not in official Inventory yet.
5. Approve the contribution as an Administrator. The photo is copied into the official Vehicle Profile while the user’s More copy remains available.

Repeat with a Trusted user. Vehicle information, price, and Pending Deal changes should apply after the processor runs; photos, videos, and documents must still remain pending for Administration.

For Chat testing, open V0.9.4.61 once as every test user. Their user-owned Public Profile publishes the encrypted Messaging identity; the processor refreshes Store Access and creates private `Messaging/Inbox` and `Messaging/Outbox` folders. Allow up to one minute for a newly sent message to be couriered, then keep LotKeys open to confirm the normal conversation and incoming popup bubble both update.

## Important boundaries

- `Approved Users.json` is the LotKeys Store role list. It does **not** replace the Google OAuth **Test users** list while the OAuth app is in Testing.
- Never share official Inventory as Editor with an ordinary or Trusted user.
- Direct Chat envelopes are encrypted and cross user boundaries only through the installed processor. A normal user does not need access to `Administration` or another user’s workspace.
- Never deploy this script as a public web app or as the visiting user. The time trigger must run as the Admin Level 2 installer.
- Do not move `Administration`, `Users`, or `Inventory` outside the configured Store folder.
- If an Admin Level changes or a user is disabled, LotKeys immediately updates that account's direct access. Run **Repair Store Structure** as well to audit every Store permission and limited-access boundary.
