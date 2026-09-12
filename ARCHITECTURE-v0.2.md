# LotKeys architecture v0.2

## V0.9.4.72 least-privilege Store model

The official Inventory remains on the Store side. Ordinary and Trusted users receive Viewer access to it; each user receives Writer access only to their own limited-access workspace. The Admin Level 2 Store Processor validates the workspace that contains a request instead of trusting identity fields supplied by the browser.

## V0.9.4.47 account Awards and Lot-Lvl

- Store data owns the shared Award definitions, nomination/review queue and each current Store member's public Award summary.
- Personal `Account.json` carries the user's earned Awards, Primary/five-display choices, Lot-Lvl progress and check-in state across Store changes.
- Lot-Lvl uses deduplicated, confirmed Facebook Marketplace vehicle-post records. The V0.9.4.47 testing curve spans Level 1–100 and reaches Level 100 at 1,000 confirmed posts.
- Automatic grants use stable audit IDs so the same correction, Listing or Monthly Wrap-Up event cannot be counted twice.
- The current Google Drive design provides Store-administered records; a future LotKeys account-directory/backend remains necessary for global cross-Store discovery and stronger server-authoritative enforcement.

## Core rule

A Vehicle Profile and a Marketplace Listing are different records.

- Vehicle Profile = shared store/customer vehicle information.
- Marketplace Listing = one user's Facebook-specific title, description, location, photo order, URL, status, and analytics.

## Store Drive structure

```text
STORE FOLDER
├── Users
│   └── Blair
│       ├── PublicProfile.json
│       ├── Profile Thumbnail.jpg
│       ├── Listings
│       │   ├── Listings Index.json
│       │   └── <Marketplace Listing>.json
│       ├── Listing Assets
│       │   └── <Vehicle>
│       │       └── Photos
│       ├── Messaging
│       │   ├── Inbox
│       │   └── Outbox
│       │       └── LotKeys Live Messages - <recipient address>
│       └── More
│           └── <Vehicle>
│               ├── Client Media [only after a media submission]
│               │   ├── Photos [only after a photo submission]
│               │   ├── Videos [only after a video submission]
│               │   └── Documents [only after a document submission]
│               └── Requests
│                   └── Pending
├── Administration
│   ├── LotKeys.json
│   └── Approved Users.json
├── Store Access.json
├── Inventory Index.json
└── Inventory
    └── 2023 Challenger Scat 392 - PCH0336A
        ├── Vehicle Data - Administrative
        └── Shared
            ├── Photos
            ├── Videos
            └── Documents
```

## Ownership

### Shared/store data

Any approved user may propose or introduce a Vehicle Profile, but official files are written only by Administrators or the Store Processor. The user who introduces a genuinely new VIN/Stock profile receives LotKeys creator rights for that profile; Drive ownership of official Inventory does not transfer to that user. Another user’s corrections require Administration approval, except Trusted users may automatically change vehicle information, price, and Pending Deal. Trusted users cannot delete official content, and their media still requires approval.

### User listing data

Each salesperson's Marketplace listing records live under that user's Store/Users folder. Management can retain visibility into listing activity while the app keeps Facebook-specific descriptions separate from store vehicle descriptions.

### More and approval data

Every user has a separate More folder for every Vehicle Profile they work with. `Client Media` can be shared by link with a client. Pending request JSON stays beside it under `Requests/Pending`, not inside the client-shared folder. Approval or denial removes the request JSON. When Administration approves media, LotKeys copies it into the official Vehicle Profile and leaves the user’s More copy intact. Deleting the user copy later cannot delete the approved official copy.

## Local cache

IndexedDB is the fast client-side cache and offline working copy. Google Drive remains the shared source of truth once a vehicle, listing, profile, request, or message is synchronized. Vehicle Profiles paint from IndexedDB first; cached More links, Vehicle media, and Inventory Index metadata are verified in the background.

## Chat delivery

Each encrypted message is written into a lane owned by its sender and shared Reader-only with the exact recipient Google account. The open recipient browser checks known lanes every few seconds, saves the decrypted message locally, updates the UI, and then archives history to the recipient's personal Drive. The Store Processor separately makes one deduplicated Inbox copy as recovery. It never deletes another user's Outbox file; the owning browser expires old envelopes.

## Shared link

The app creates the Shared folder automatically. If store settings allow it, LotKeys attempts to grant `Anyone with the link` reader access to that Shared folder. Photos, videos, and documents inherit that sharing permission.

## File IDs

LotKeys stores Google Drive file/folder IDs instead of depending on names. This lets a user rename a Vehicle Profile without breaking the app. App-specific Drive properties are also written onto managed Drive items to allow recovery after local metadata loss.

## Photo order

The local Vehicle Profile stores explicit photo IDs in order. When Drive sync runs, managed photo filenames are prefixed with `01 -`, `02 -`, etc. Existing Marketplace listings retain their own photo-ID order and do not change when the master Vehicle Profile is reordered. Listing-added salesperson photos are stored once in the user's reusable `Listing Assets/<Vehicle>/Photos` area and referenced by listing metadata, so duplicated/location-specific listings do not create additional high-resolution Drive copies.

## Retention

Marketplace analytics are intended to use a rolling 120-day raw-data window. This build retains that local cleanup rule; store-wide analytics synchronization comes later.


## v0.4 additions

### Vehicle Profile folder naming
Vehicle profile folder names are generated as `Year Make Model - Stock #`. Drive IDs remain authoritative, so renaming the human-readable folder name does not break the app.

### Info From Photo
Info From Photo is an assisted data-entry layer only. It does not become a new source of truth. It reads one or more images locally in the browser, creates field suggestions, marks confidence, and requires user confirmation before applying values to the Vehicle Profile form. Analysis images are not stored in `Shared/Photos` unless the user separately adds them as vehicle photos.


## v0.7 additions
- `Administration/LotKeys.json` stores Store-wide configuration plus the LotKeys user registry. Personal posting locations remain local/user-side.
- Root `Inventory Index.json` is the viewer-readable Store inventory cache generated from vehicle Administrative Sheets. LotKeys verifies Inventory folders on refresh and can rebuild the index with a full scan.
- The signed-in Google account is bound to a unique LotKeys user name. The first registered Store user becomes Administrator.
- Store inventory refreshes from Drive every five minutes while the app is active, when returning to the app, and on manual refresh.

## v0.7.1 additions
- Each user's Marketplace Listings folder is a Drive-backed source of truth for that user's listings across devices.
- `Listings Index.json` caches the user's listing records for fast refresh while individual listing JSON files remain recoverable records.
- Personal posting-location presets remain local/client-side; synced listings store a location snapshot so an existing listing still displays coherently on another device.
- Vehicle Info Directory placeholder replacement is presentation-neutral: LotKeys injects text/hyperlinks only, while the Administration template owns emojis, graphics, icons, colors, and layout.

## v0.7.2 additions

- Vehicle Info Directory CARFAX placeholders may be replaced by hosted image assets during generation. The template still controls placement; LotKeys controls whether each CARFAX asset appears.
- Listing refresh performs targeted legacy cleanup for duplicate v0.7.1-era drafts with no location and no Facebook URL while preserving real posted/location-specific records.


## v0.8.4 additions

- Create Listing uses the shared fuzzy vehicle-search scoring logic instead of a native full-inventory dropdown. The listing picker renders at most three thumbnail results.
- A Marketplace Listing can reference Inventory master photo IDs and reusable user-added listing photo IDs in the same `photoOrder`.
- User-added listing photos are uploaded once under `Users/<User>/Listing Assets/<Vehicle>/Photos`. Listing JSON records store Drive references, not image copies.
- Listing duplication copies only metadata/references. It does not duplicate Inventory photos or already-synced user listing assets in Google Drive.
- `photoOrderCustomized` distinguishes an intentional empty/custom listing order from the default Inventory photo order.


## v0.8.4.1 posting assistant rule
- Posting Assistant is review-only for listing photos; all listing-specific add/remove/reorder changes are made and saved in Create/Edit Listing before posting.


## Personal description/profile layer (v0.8.5)
- Store Inventory remains dealership-owned. Marketplace description structure is user-owned.
- Personal Description Templates are building-block recipes, separate from Vehicle Profile descriptions and separate from Store Administration.
- Vehicle Profile Year/Make/Model/Price/Odometer/VIN/STK remain authoritative during description generation. Website reads are supplementary and discrepancies (especially price) are surfaced for review rather than silently overwriting the Profile.
- Current v0.8.5 stores personal template/preferences in the browser settings store. A portable user-profile sync location outside the dealership Store Folder is planned before browser-extension rollout.


## Appearance polish (v0.8.5.1)
- Personal accent color drives primary actions and the global + action button.
- LotKeys calculates dark/light foreground text for accent contrast.
- Dark mode uses a neutral black/charcoal palette rather than the earlier navy palette.

## Personal Profile tab (v0.8.6)
- Bottom navigation now separates the user's personal **Profile** from technical/dealership **Settings**.
- The Profile owns personal display/sales name, profile photo, appearance/accent choices, last-used description template, and personal Description Templates.
- Profile photos are currently center-cropped/resized to 360x360 and stored in the browser settings store as a compact data URL. This avoids adding a full-resolution phone photo to the current test profile and makes later personal-Drive migration straightforward.
- A saved profile photo is rendered as the circular Profile navigation icon; the generic person icon is the fallback.
- Dealership identity, Google authorization, Store configuration, Administration, and store-user registry remain under Settings / the dealership Store Folder.
- The Profile remains browser-local in v0.8.6 while its UX is tested. The intended next step is a user-owned Google Drive profile outside any dealership Store Folder so the same selling identity can follow the user between stores/devices.


## Portable personal profile + creator attribution (v0.8.7)
- The user's personal identity is independent of Store ownership. Browser IndexedDB remains the fast cache, while a user-owned `LotKeys Personal Profile` folder in My Drive is the portable source for display name, appearance, description templates, last-used template and full profile photo.
- Each connected dealership Store receives only a compact `Users/<User>/Profile Thumbnail.jpg` plus thumbnail file metadata in the Store user registry. This supports staff identity/competition UI without copying the full personal profile into every Store.
- Vehicle Profiles now carry immutable-origin fields `createdByUserName`, `createdByEmail` and `createdAt`. These fields are included in the administrative Sheet and `Inventory Index.json` so counts work across devices.
- Active Vehicle Profile competition counts are derived from currently present Inventory profiles, so deleting a Vehicle Profile naturally removes it from the active count. Legacy profiles with no creator metadata are not guessed.


### v0.8.7.1 profile-thumbnail + leaderboard refinement
- Store leaderboard visibility is not an admin privilege: all registered Store users can view the top-10 Vehicle Profile builders and their own active count. Store configuration controls remain admin-only.
- Each Store user keeps a single tiny `Profile Thumbnail.jpg` under `Users/<user>/`; profile changes overwrite that file and update the Store user registry timestamp. UI thumbnail caching is versioned by that timestamp so the same Drive file ID can refresh everywhere without duplicating media.


### v0.8.7.2 UI polish
Dialog/modal backdrops use neutral black transparency rather than a blue/slate overlay in both appearance modes.
