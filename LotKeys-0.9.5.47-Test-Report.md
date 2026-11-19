# TEST .47 — Store join-request validation

Baseline: main 6f5d24622789d466237483f0a4bcf55f0eac7bdc, signed Android .46.
433 Node tests pass: 406 prior checks plus 27 new Store access-request checks.
30 JavaScript syntax checks pass, including web/inline and unchanged packaged
extension; git diff --check passes. CI/Pages results must be recorded at promotion.
No native source, signed APK, Google scope, Android permission or production changes.

Coverage: private invitations remove bearer fragments/old query state; reject foreign
origins/folders; actual Store connection distinguishes permission denial from failed
authorization/network; validates code/root against Store Access.json. Requests use
Google's current proposal APIs and authenticated Request access UI, never a locally
fabricated request. Pagination, omitted empty lists and repeated tokens are covered.

Fresh canonical Store Access.json administrator/disabled-recipient checks (not cached roles), Admin/Google-account/Store guards, canonical Google proposal recipient, Reader-only
approval, denial without provisioning, disabled accounts, delegated/view proposals,
request root mismatch, duplicate clicks, stale identity, interrupted workspace setup,
uncertain acceptance, fresh actual permission verification and cache isolation are
tested. Retained setup receipts are scoped to root + approver account and are not
accepted as evidence of a Google grant. Store role records are not taken from requests.
Errors from the new queue do not prevent existing Inventory requests from refreshing.

## Real Google acceptance check still required

1. An existing Store Admin/Drive approver copies Store Invitation from Approved Users.
2. A second signed-in account opens the invitation. If its OAuth project is Testing,
   it must also be on Google's separate OAuth test-user list; this is not Store access.
3. User presses Connect, opens Request access and SENDS in Google's own UI using
   the displayed account. Opening the link alone is not a sent/persisted request.
4. Admin Refresh Requests: verify recipient/requester, then Approve. Confirm root/
   Inventory Reader, only own workspace writable and correct canonical Approved User.
5. User Check approval connects without retyping email or clearing/switching data.
6. Repeat with a different request and Deny; no Store access/workspace should appear.
7. Interrupt approval/setup/network, refresh and Check / Finish Approval; verify no
   duplicate user/permission and no grants after account/Store/role change.
8. Test no Drive sharing capability and temporary proposal API failure; normal
   moderation/Reports remain available and permission errors are visible.

This has not been run with two real Google accounts, so no live end-to-end result
is claimed. Test permissions are not granted to any account by development tooling.
Google restricts creating access proposals to its own UI; no direct automatic send.
A private Store absent from the public directory needs its invitation/folder locator.
No new registry service or published administrator email addresses were introduced.

References checked 2026-11-10:
https://developers.google.com/workspace/drive/api/guides/pending-access
https://developers.google.com/workspace/drive/api/reference/rest/v3/accessproposals
https://developers.google.com/workspace/drive/api/reference/rest/v3/accessproposals/resolve

Rollback: retain .46 main at recovery/test-v095046-before-v095047. Revert the .47
web merge through a normal TEST commit; verify version/cache/runtime after Pages.
Leave Android .46/data/signing, root verification and existing users/permissions
alone. Rolling back UI does not undo an administrator's already approved Store user;
review such access through existing Approved Users/Drive controls if needed.
