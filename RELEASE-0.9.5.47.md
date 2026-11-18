# TEST .47 — request Store access

Administration can copy a Store invitation instead of typing each new user's email.
The user signs into Google, opens the invitation and connects. If access is missing,
LotKeys opens Google's Request access screen. Send the request there, then return
and use Check approval. The private Store is not shared before approval.

An administrator with Google Drive sharing rights sees the request in Garage →
Reports / Requests. Approve grants ordinary Reader Store access and provisions
that exact Google account's Listings/More workspace. Deny leaves access unchanged.
Existing manual Add User & Provision Access remains available. Interrupted setup
can be checked/finished without creating duplicate permissions or accounts.

Unlisted private Stores need the copied invitation: an arbitrary private Store Code
cannot be discovered through Google Drive by someone with no access. The invitation
contains only the folder locator/Store code/name, never a login bearer or public grant.
Google requires the initial request in its UI; the Drive API can list/resolve but
cannot create access proposals. No new server, credentials, scopes or public sharing.

433 automated web tests and 30 syntax checks pass. Google two-account and phone
checks remain pending. Keep the installed signed .46 APK; no reinstall/data clearing.
This does not remove Google's separate OAuth test-user gate or implement the future
Account background-controls layout. Production is unchanged.
