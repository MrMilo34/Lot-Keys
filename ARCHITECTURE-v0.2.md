# LotKeys architecture v0.2

## Core rule

A Vehicle Profile and a Marketplace Listing are different records.

- Vehicle Profile = shared store/customer vehicle information.
- Marketplace Listing = one user's Facebook-specific title, description, location, photo order, URL, status, and analytics.

## Store Drive structure

```text
STORE FOLDER
├── Users
│   └── Blair
│       ├── Listings
│       │   ├── Listings Index.json
│       │   └── <Marketplace Listing>.json
│       └── Listing Assets
│           └── <Vehicle>
│               └── Photos
├── Administration
│   └── LotKeys Store Config.json
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

Authorized users may add and update Vehicle Profiles. A vehicle created by a salesperson becomes part of the store inventory, not that salesperson's personal inventory.

### User listing data

Each salesperson's Marketplace listing records live under that user's Store/Users folder. Management can retain visibility into listing activity while the app keeps Facebook-specific descriptions separate from store vehicle descriptions.

## Local cache

IndexedDB is the fast client-side cache and offline working copy. Google Drive is the shared store storage layer once a vehicle/listing is synced.

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
- `Administration/Inventory Index.json` is a fast Store inventory cache generated from vehicle Administrative Sheets. LotKeys verifies Inventory folders on refresh and can rebuild the index with a full scan.
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
