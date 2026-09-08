# LotKeys Store Access Security

## Purpose

This policy governs public-ready Store Code onboarding and Google Drive access. LotKeys application permissions must never be weaker than the underlying Google Drive permissions.

## Stable Store identity

LotKeys users enter a human Store Code such as `INF-SE034`.

The public LotKeys Store directory resolves that code to a logical `storeId` and the Google Drive `driveFolderId`. The Drive folder ID is the authoritative location pointer. Moving or renaming the same Drive folder does not require changing the Store Code. If the Store is replaced by a newly created Drive folder, only the directory mapping is updated.

Regular users never need to see or enter the raw Store Drive URL.

## Hard permission rules

1. A regular LotKeys Store member must never receive `writer` / Editor permission on the Store root.
2. Approved regular members receive `reader` / Viewer access at the Store root only.
3. `Administration` must use Google Drive limited access so inherited regular-member access cannot open its contents. Only explicitly authorized administration accounts may access it.
4. Every `Vehicle Data - Administrative` folder must use limited access. Regular members may access the Vehicle Profile information LotKeys intentionally exposes through the app, but must not receive raw Drive editing access to dealership-administrative source files.
5. `Inventory/<Vehicle>/Shared` is the presentation/share area. It may be read by approved Store members and may optionally use public reader-link sharing when Store settings enable it.
6. A regular user's only direct Store-side write scope is their own approved `Users/<User Name>` workspace when direct Drive writes are required. A user must not receive write access to `Users`, another user's folder, `Administration`, or the Store root.
7. Inventory mutations must be performed by an authorized Store writer or by a brokered/approved LotKeys contribution workflow. Do not grant broad Drive Editor permission merely so the browser app can update Inventory.
8. Admin Level 1 and Admin Level 2 app permissions do not automatically imply unrestricted Drive permissions. Drive access must be the minimum needed for each role. Admin Level 2 is the Store authority capable of approving Store membership and protected Store changes.

## Public Store Code join flow

1. User creates their LotKeys identity (username and phone number), signs into Google, and adds their Account photo.
2. User enters the Store Code.
3. LotKeys resolves the Store Code through the LotKeys Store directory. Discovery does not depend on the user's Drive already containing Store files.
4. LotKeys shows the Store name and starts a Store access request.
5. Admin Level 2 reviews the request.
6. Approval grants only Store-root `reader` access and provisions the user's specific Store workspace/registry entry. Any user-specific write permission is scoped only to that user's folder.
7. Protected limited-access folders remain inaccessible unless the user's administrative role explicitly requires them.
8. LotKeys refreshes the Store connection and completes registration without exposing the raw Drive URL.

## Important architecture requirement

A browser-only client must not solve Store writes by granting users broad Google Drive Editor access. That would let the same user bypass LotKeys controls by opening Google Drive directly.

For public release, any operation that needs to modify Store-owned Inventory or protected records while regular members remain Viewer-only must go through an authorized Store-side write path (for example a LotKeys backend/broker or an explicit administration approval pipeline). The backend/broker must validate the user's LotKeys role and requested action before changing Store-owned Drive data.

## Current Infiniti South Edmonton mapping

- Store Code: `INF-SE034`
- Logical Store ID: `infiniti-south-edmonton`
- Current Drive folder ID: `1vJRzFWTVtg9o1fRw5dUNsY2JNlIhOf-g`
- Store-root regular-member role: `reader`

The Drive folder ID may be changed in `lotkeys-store-directory.json` if the Store is ever recreated under a new folder. Moving or renaming the existing folder should not require a directory update.
