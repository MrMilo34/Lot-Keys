# Private LotKeys phone doorbell — setup candidate

This is a separate Apps Script project, not a change to the Store Processor.
It is not deployed. The supplied Firebase JSON files register only Enigma and
cannot configure `ca.lotkeys.connector.test`. No service-account private key,
OpenAI key, paid function or billing activation is needed by this design.

1. In a LotKeys-owned Firebase project that remains on Spark/no billing, register
   Android package `ca.lotkeys.connector.test`. Download its google-services.json.
   Keep its project separate from Enigma. Enable the FCM HTTP v1 API if necessary.
   The deployment owner needs permission to send FCM in that same project.
2. Create a new Apps Script project; copy Code.js and appsscript.json. Associate
   it with the LotKeys standard Google Cloud project so the Firebase Messaging
   scope/API and owner identity refer to the intended project. This association
   and the owner's authorization must be validated before calling it live.
3. In that script's properties, set `LOTKEYS_FIREBASE_PROJECT_ID` to the LotKeys
   Firebase project ID and `LOTKEYS_ENROLLMENT_KEY` to a cryptographically random
   base64url secret of at least 32 bytes. Generate it locally, for example:
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`.
   Keep this enrollment secret off GitHub, browser storage and chat.
4. Deploy this script as a web app executed **as the owner**, accessible to
   anonymous requests. Its application-level enrollment/HMAC authentication is
   mandatory. Use the resulting HTTPS `/macros/s/.../exec` URL. Do not publish the
   existing Store Processor. Authorize only the two manifest scopes.
5. Create a private local JSON file in this shape, replacing values locally:

   ```json
   {
     "endpoint": "https://script.google.com/macros/s/DEPLOYMENT_ID/exec",
     "enrollmentKey": "PRIVATE_RANDOM_BASE64URL_SECRET",
     "googleServices": { "replace": "with the complete LotKeys google-services.json object" }
   }
   ```

6. Install the matching signed TEST connector over the existing app. In native
   setup choose **Import LotKeys Wake Setup**, select the private file, then
   connect the already-trusted PC once. The phone obtains its FCM token and
   enrolls a grant in the sender; a subsequent encrypted foreground response
   gives that PC its own limited wake capability. No new pairing approval is
   required solely for this update. Delete the private setup file after import
   when its owner has retained a secure recovery copy.

Chrome sends `text/plain` POST with `mode: no-cors` because Apps Script's content
response is opaque to the browser. It must never treat dispatch as success. FCM
credentials remain in the owner's Apps Script OAuth context. Registration uses
the private enrollment key; PCs receive only their own expiring wake secret.
The script caps enrolled grants at 50, wake sends at one per grant per 10 seconds,
and 1,000 daily sends. Apps Script quotas/account restrictions can still deny
service; this is not an availability guarantee or a proven deployment.

Before removing idle recovery, validate real-device locked/deep-idle delivery,
the owner's Firebase authorization, reboot and token rotation, network loss,
revocation, duplicate requests, downgraded FCM priority and notification behavior.
Android force-stop prevents ordinary push reception until the app is reopened.
Keep the approved hourly recovery fallback while these checks are pending. No paid-resource
fallback is authorized by this setup.

Primary references:
- https://firebase.google.com/docs/cloud-messaging/android/get-started
- https://firebase.google.com/docs/cloud-messaging/android-message-priority
- https://firebase.google.com/docs/cloud-messaging/auth-server
- https://developers.google.com/apps-script/reference/script/script-app#getOAuthToken()
- https://developers.google.com/apps-script/concepts/scopes
- https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start
