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
│       └── Listings
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

The local Vehicle Profile stores explicit photo IDs in order. When Drive sync runs, managed photo filenames are prefixed with `01 -`, `02 -`, etc. Existing Marketplace listings retain their own photo-ID order and do not change when the master Vehicle Profile is reordered.

## Retention

Marketplace analytics are intended to use a rolling 120-day raw-data window. This build retains that local cleanup rule; store-wide analytics synchronization comes later.


## v0.4 additions

### Vehicle Profile folder naming
Vehicle profile folder names are generated as `Year Make Model - Stock #`. Drive IDs remain authoritative, so renaming the human-readable folder name does not break the app.

### Info From Photo
Info From Photo is an assisted data-entry layer only. It does not become a new source of truth. It reads one or more images locally in the browser, creates field suggestions, marks confidence, and requires user confirmation before applying values to the Vehicle Profile form. Analysis images are not stored in `Shared/Photos` unless the user separately adds them as vehicle photos.
