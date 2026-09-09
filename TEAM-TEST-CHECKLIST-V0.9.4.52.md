# LotKeys V0.9.4.52 Post Buddy pointer checklist

Use approved test accounts and non-sensitive dealership data. Test once on a phone and once on a PC before replacing the current team build.

## Release and account

- Open `https://lot-keys.ca/?build=09452` in a private window and confirm the version bar says V0.9.4.52.
- On a PC, select **Download Current Post Buddy** and confirm LotKeys reads `extension/latest.json` and downloads the V0.1.13 versioned ZIP.
- Confirm `extension/releases` contains the versioned V0.1.13 ZIP and does not require a duplicate `Latest.zip`.
- As a signed-out user, confirm the first screen asks only for name and phone number before Google Sign In.
- Confirm an existing `Account.json` restores instead of being overwritten.
- Save a Lock Screen PIN and idle settings, reopen on another device, and confirm the settings restore from the user’s Lot-Keys Account folder.
- Expand Account settings and confirm the button becomes gray; confirm Sign Out appears beside Save Account Settings.
- As a connected regular user, confirm Store Code is hidden. Confirm Admin Level 1 sees it read-only and Admin Level 2 retains edit controls.

## Vehicle Profiles and Pending Deal

- Open a Vehicle Profile and confirm photos use a static compact review strip; use Edit Vehicle to confirm full photo editing remains available.
- Confirm the creator row reads left-to-right as profile photo, Primary Award, then the aligned name/date stack.
- As the Profile owner or a Trusted user, toggle Pending Deal and confirm it applies immediately.
- As another standard user, toggle Pending Deal and confirm a Management request is created; approve and deny sample requests as an Administrator.

## Listings and verified sales

- Confirm Save Listing & Post Later uses the dark action and Save & Post Facebook Listing uses the accent action.
- Confirm secondary Copy/View controls are black in light theme and white in dark theme.
- Confirm `I Sold This Vehicle` is disabled for missing, non-Facebook and generic Marketplace URLs.
- Confirm a valid `facebook.com/marketplace/item/<number>` URL works once and the same item URL cannot be counted again, including when query parameters differ.
- Confirm a verified sale also applies or requests Pending Deal on the linked Vehicle Profile.
- Confirm the first, 10th, 50th, 100th, 250th, 500th and 1,000th sale descriptions all state the unique Facebook URL requirement.
- Confirm `Faster as F Boy!` unlocks only after the source-page checker explicitly records a call/contact-for-price result and the Facebook Listing has a numeric price.

## Developer and Management tools

- Sign in as `blairk34@live.com` and confirm LotKeys Developer and Dev Tool Kit appear.
- Send a Store celebration to selected accounts, then test All users in Store and confirm the sender remains unchecked.
- Drop a one-off special Award and confirm the recipient receives the bubble, effect and Award without changing sales totals.
- Confirm Management Updates show a plain 🏁 beside Posted/Expires instead of a colored numbered chip.
- Confirm Google Test Credentials are collapsed by default and Vehicle Profiles • Inventory has its own settings bubble.

## Startup and synchronization

- Sign in with pending Vehicle sync work and wait for it to finish without switching tabs.
- Confirm Home and Inventory cards stop animating immediately when each Vehicle becomes synced.
- Confirm the Sync text is aligned 2 px lower and the readiness light/version strip attract attention only when action is needed.

## Manual release gates

- Real Google OAuth, Drive writes, account-to-account celebrations and Facebook’s live Marketplace form require approved-account testing in the deployed HTTPS build.
- Public/global identity, Admin and Creator enforcement still require the authenticated backend described in `SECURITY-RELEASE-GATE.md`.
