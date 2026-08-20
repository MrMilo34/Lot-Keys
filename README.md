# LotKeys Drive Test v0.8.9.4

## v0.8.9.4 — Account data in personal Drive folder

- The selected **Lot-Keys Account** folder is now the persistent home for personal account data.
- Saves account data as `Account.json` and the optional photo as `Account Photo.jpg`.
- `Account.json` carries the Google account identifier, store user name, sales/display name, theme, accent color, personal description templates, default template, photo file ID, and update timestamp.
- Saving Account preferences/photo/templates now waits for the small personal Drive write so the UI can report whether the data actually reached Google Drive.
- Existing `Profile.json` / `Profile Photo.jpg` data is detected and migrated in place for backward compatibility.
- The Account Storage card shows whether `Account.json` is saved.
- Service-worker cache bumped for v0.8.9.4.


## v0.8.9.3 — responsive media uploads

- Uses one live in-memory media progress source for both the Vehicle card and the top status label, so the two percentages no longer drift apart.
- Stops writing the full Vehicle record (including large video Blobs) to IndexedDB every ~700 ms just to save upload percentage. Progress checkpoints are now tiny local metadata writes.
- Navigation rendering no longer waits for the full readiness scan before opening Account, Settings, Listings or other tabs.
- The readiness header avoids re-reading every Vehicle record while media is actively uploading.
- Removed the deliberate "wait until visible" gate between Drive upload chunks. LotKeys now keeps transferring while Chrome/Android allows background network work.
- Resumable Google Drive session URLs and accepted-byte checkpoints are retained locally so an interrupted/suspended upload can query Drive and continue from the server-accepted offset when LotKeys resumes.
- Upload progress is restored as paused after a full page/browser restart until the resumable session reconnects and reports the real Drive offset.
- Keeps the v0.8.9.2 Account storage-location controls, Account naming, personal Google Drive recovery, and the v0.8.9.1 shared Inventory refresh fix.
- Service-worker cache bumped for v0.8.9.3.

## v0.8.9.2 — Account storage location + naming

- Renamed the user-facing **Profile** tab/page to **Account** (Vehicle Profile terminology is unchanged).
- Added a theme-accented **Lot-Keys Account Storage** box on the Account page.
- Users can choose a Google Drive location; LotKeys links an existing `Lot-Keys Account` / legacy personal-profile folder or creates `Lot-Keys Account` inside the selected folder.
- The selected Google Drive folder ID is remembered and can be reopened from the Account page.
- Personal Account restore now waits for a linked/discovered Account folder instead of silently creating a new folder in the wrong place.
- Fixed the deployed Store refresh crash caused by DriveSync not being able to access `normalizeStoreUsers` / `normalizeUserAccount`.
- Store Inventory refresh can now rebuild a stale browser cache from the shared Drive Inventory without clearing local browser storage.
- Vehicle Profile metadata, folders, admin sheet, directory and Inventory Index are saved before large media transfers so a video cannot hold the whole Profile save hostage.
- Photos, Documents and Videos use resumable chunked Drive uploads with live percentage progress.
- Inventory cards and the top sync label show which media folder is uploading and the current percentage.
- If Android/Chrome suspends an upload while LotKeys is backgrounded, the media job pauses safely instead of turning the Vehicle Profile red; it retries when LotKeys becomes active again.
- Added per-vehicle upload locking to prevent duplicate sync jobs when returning to the app, focusing the browser, or refreshing.
- Video compression is intentionally not enabled in this patch; reliability and resumable upload behavior are fixed first.
- Service-worker cache bumped for v0.8.9.2.

## v0.8.9 — moderation + administration levels
- User moderation cards are collapsed by default; tap a user row/avatar area to view deletion-request history and Request Ranking.
- Request Ranking starts at 75 and is based only on approved vs false reports; neutral removed requests do not affect it.
- Added ⭐ Admin Level 1 and 🌟 Admin Level 2 with owner-only Store/Google configuration at Level 2.
- Removal requests are resolved per Vehicle Profile: Approve+Delete approves all reporters, Deny gives all open reporters a false-report tally, Remove Requests clears them neutrally.
- Admins see ❕ on flagged Profiles/users; the reporting user sees ❔ on a Vehicle Profile they personally flagged.
- Profiles Marked for Removal acts as a review queue and returns to Settings after resolution; Inventory-origin reviews return to Inventory.
- Legacy Administrator accounts migrate to Admin Level 2.
- The Posting Assistant hero now follows the selected accent gradient as part of the theme-consistency cleanup.
- Service-worker cache bumped for v0.8.9.



## v0.8.8 — Vehicle Profile ownership + moderation controls
- Home **Find a vehicle fast** gradient now follows the user's selected accent theme, matching the Create/Edit Listing vehicle search treatment.
- Vehicle Profile ownership is enforced: the original creator (and Administrators) can delete the Profile; other users receive **Mark for Deletion** instead.
- Removal requests use a clear selectable reason flow: **Duplicate Vehicle Profile**, **Missing Details**, **Wrong Vehicle Listed**, or **Other** with a custom explanation.
- Deletion requests are stored with the Vehicle Profile's administrative data and Inventory Index so they survive refreshes and are visible across authorized Store sessions.
- Only Administrators see the **❕** removal marker and request details. Requests show the reporting user's name/profile thumbnail and submitted reason.
- Settings → Administrator / Store Configuration now includes a **Profiles Marked for Removal** review area with dismiss, false-report, open, and delete actions.
- User administration now stores per-user permissions for Vehicle Profile creation, deletion reporting, Listings, leaderboard visibility, Description Builder, future Chrome extension access, and full account status.
- User moderation counters track submitted, approved, dismissed and false deletion reports so repeated misuse is visible to Administration.
- Duplicate stock numbers are allowed, but LotKeys warns before saving when that STK# already exists.
- Description Builder restrictions are now enforced in Create/Edit Listing while leaving manual description editing available.
- Advanced Google / Store controls sit above the main Store Configuration save actions.
- Service-worker cache bumped for v0.8.8.





## v0.8.6 Profile foundation
- Added a dedicated **Profile** tab to the bottom navigation between Listings and Settings. Home and Settings retain their existing icons.
- Users can upload/change/remove a familiar circular profile photo. LotKeys center-crops and resizes the selected image to a compact 360 px avatar for the current browser profile.
- When a profile photo exists, the bottom **Profile** navigation icon displays that photo; otherwise it uses the generic person icon.
- Personal **User / Sales Name**, Appearance, accent color, and Description Templates moved out of Settings into Profile.
- Description Templates retain **＋ Create / Add** at the top plus Marketplace - Quick, Marketplace - Detailed, and custom templates.
- Profile shows the user's dealership/store and role while keeping the personal selling identity visually separate from Store Inventory.
- Settings now focuses on **Google & Store Connection**, Administration, posting locations, and technical/local configuration.
- Profile data remains browser-local for this test build; the approved Profile layer is intended to become portable through the user's personal Google Drive in the next foundation step.
- Service-worker cache bumped for v0.8.6.

## v0.8.5.1 polish
- Accent buttons now automatically use readable foreground text: light accents such as yellow, green, and white use dark text; dark accents retain white text.
- The top-right + action button now follows the user's selected accent color and matching contrast text.
- Dark mode was changed from navy to a neutral ChatGPT-like black/charcoal palette: black app background, charcoal cards, and grey inputs/secondary controls.
- Browser theme color follows light/dark appearance.
- Service-worker cache bumped for v0.8.5.1.

## v0.8.5 changes

- Facebook Posting Assistant photo area is now **review-only**.
- Removed **Add Photos**, **Expand & Order Photos**, removal controls, drag ordering, and **Reset to Inventory Order** from the Posting Assistant.
- Listing photo additions, removals, cover choice and ordering remain available in **Create/Edit Listing**, where they are saved before the Facebook Posting Assistant opens.
- Posting Assistant Step 1 is now **Review listing photos** and shows the saved posting sequence only.
- **Download Photos** and **Open Shared Folder** remain available from the Posting Assistant.
- No changes were made to the Inventory master-photo set or the protected website-import/photo-identification logic.
- Service-worker cache bumped for v0.8.5.

## v0.8.4 changes

- Replaced the long native Vehicle Profile dropdown in **Create Listing** with a compact fuzzy search panel.
- Listing vehicle search accepts partial combinations such as `17 Civ`, `Honda Civ`, stock-number fragments, VIN fragments, year, make/brand, and model.
- Only the **top 3** vehicle matches are shown with thumbnails, keeping the mobile picker compact.
- **Create Listing Manually** remains available for listings that are not linked to Inventory.
- Marketplace Listings now support their own photo set/order without modifying Inventory photos.
- Users can add salesperson-only photos, remove Inventory photos from a specific listing, choose a different cover, and reorder the listing before posting.
- The Facebook Posting Assistant now includes **Add Photos** plus an expandable photo-order editor and no longer shows the large introductory gradient panel.
- **Open Drive Photos** was replaced by **Open Shared Folder** in the Posting Assistant.
- Listing-added photos are uploaded once to `Users/<User>/Listing Assets/<Vehicle>/Photos` and listing records reference those Drive files. Duplicating a listing reuses those references rather than copying high-resolution photos.
- Inventory master photos remain referenced by file ID; they are never duplicated into a Marketplace listing.
- Listing sync schema bumped to v6 to preserve listing-added asset references and intentional custom photo order.
- Existing v0.8.3.x listing JSON records remain readable.
- Protected website-import, CARFAX VHR validation, photo-identification, sorting, authentication, and Inventory photo behavior remain intact.
- Service-worker cache bumped for v0.8.4.

## v0.8.3.4 changes

- Vehicle Profile **Open Shared Folder** and **Sync Vehicle** actions now use the same grey secondary-button treatment as **Edit Vehicle**, improving contrast against the white profile card.
- Existing pressed/syncing states and the Sync Vehicle loading spinner are retained.


- CARFAX website imports now accept only actual `https://vhr.carfax.ca/...` vehicle-history report URLs.
- CARFAX badge/logo/image assets such as `cdn.carfax.ca/...svg` are explicitly ignored and will never populate the CARFAX Link field.
- Direct page imports inspect both clickable links and embedded page source for a valid VHR report URL, including escaped URLs found in page data.
- The read-only website fallback uses the same VHR-only rule. If a valid report URL is not exposed, LotKeys leaves CARFAX blank rather than importing an image or unrelated CARFAX asset.
- Service-worker cache bumped for v0.8.3.4.

## v0.8.3.2 changes

- Vehicle Profile secondary actions now use the same pressed-state treatment as the polished refresh controls.
- **Sync Vehicle** shows a grey busy state with an inline loading spinner while Drive synchronization is running.
- Added a **🏷️ Open Vehicle Info Sheet** shortcut directly beside **Copy Vehicle Info Sheet Link**. It opens the same customer-facing PDF in a new tab.
- **Open Shared Folder** keeps its clean white idle state and greys while pressed.
- Service-worker cache bumped for v0.8.3.2.

## v0.8.3.1 changes

- Inventory and Listings **Refresh** buttons now use a clean white idle state instead of the transparent ghost style.
- While a manual or background refresh is running, the matching Refresh button switches to the same pressed/grey visual language used by the expanded photo-order control.
- A blue loading spinner appears inside the Refresh button during synchronization so users get immediate feedback that the click was received and LotKeys is working.
- The Refresh button is temporarily disabled while that refresh is active, preventing accidental duplicate refresh requests.
- Keeps the v0.8.3 returning-user Google authorization improvements and all existing website importer, photo-identification, sorting, CARFAX filter, photo-order safety, and Drive source-of-truth behavior intact.
- Service-worker cache bumped for v0.8.3.1.

## v0.8.3 changes

- Google Drive authorization now survives normal page refreshes in the same browser tab/session by keeping the current short-lived access token in `sessionStorage` until Google expires it. The token is never written into LotKeys Drive files or exported backups.
- Returning Google users are recognized from their saved account email and LotKeys supplies that account as a Google `login_hint`, reducing repeated account-selection screens when a fresh token is needed.
- Normal Connect/Reconnect no longer forces `prompt=consent`. Google is allowed to reuse the user's existing grant and only asks for consent when Google actually requires it.
- Expired/revoked authorization no longer launches a forced consent flow from a background refresh. LotKeys returns to **Please Sync** and lets the user reconnect deliberately.
- When a valid session token is restored after reload, LotKeys quietly resumes Inventory/Listings refresh without asking the user to connect again.
- Failed/cancelled Google authorization no longer clears the user's stored LotKeys role.
- Keeps all v0.8.2.4 photo-order safety/UI behavior, sorting, CARFAX filter, Drive source-of-truth behavior, and protected website/photo-import identification logic.
- Service-worker cache bumped for v0.8.3.

## v0.8.2.4 changes

- Photo ordering control is now visually explicit: **⬇️ Expand & Order Photos** is blue while collapsed, and **⬆️ Collapse Photo Order** becomes a pressed/grey state while the photo-ordering gallery is open.

- Vehicle Profile photo galleries are now read-only; photo reordering is available only from Edit Vehicle.
- Edit Vehicle keeps existing photos collapsed by default behind **Expand & Order Photos**, placed directly under the photo chooser. New photos can still be added without opening the ordering gallery.
- The Accident-Free CARFAX filter is grouped on the same compact control row immediately to the left of the Inventory sort selector, keeping the Inventory title and vehicle count clear.
- Preserves v0.8.2.2 sorting, CARFAX filtering, Drive-as-source-of-truth behavior, and the protected website/photo-import identification logic from v0.8.1.2.
- Service-worker cache bumped for v0.8.2.4.

## v0.8.2.2 changes

- Adds **Odometer L → H** sorting to Inventory and Listings. Vehicles/listings with an odometer sort from lowest to highest; missing odometers are kept at the end. MI values are normalized for comparison so mixed KM/MI inventory still sorts sensibly.
- Adds an **Accident-Free CARFAX** checkbox filter to the Inventory tab. When enabled, only Vehicle Profiles with the existing **No Accidents** CARFAX highlight/badge selected are shown; vehicles with No Accidents plus other CARFAX badges are included too.
- The accident-free filter is display-only, remembers its state on that device, and never changes Vehicle Profiles or Drive data.
- Sorting labels now appear as: **Low → High**, **High → Low**, **New → Old**, **Old → New**, **Odometer L → H**, **Brand A → Z**.
- Restores `sw.js` to the full release archive and bumps its cache to v0.8.2.2.
- Preserves the protected v0.8.1.2 website/photo identification pipeline and all v0.8.2.x navigation/sync behavior.

## v0.8.2.1 changes

- Adds **Low → High** sorting for least-to-most expensive vehicles/listings.
- Adds **High → Low** sorting for most-to-least expensive vehicles/listings.
- Renames **Make A–Z** to **Brand A–Z** while preserving compatibility with the prior saved sort preference.
- Sorting options now appear as: Low → High, High → Low, New → Old, Old → New, Brand A–Z.
- Retains the v0.8.2 navigation/sync polish and the protected v0.8.1.2 website-import identification pipeline.
- Service-worker cache bumped to v0.8.2.1.

## v0.8.2 changes
- Quality-of-life navigation polish: **🏷️ Inventory** replaces the Vehicles tab label/icon and **📒 Listings** replaces the Listings icon. Existing Home and Settings icons are intentionally preserved.
- The Create menu now labels **📝 Marketplace Listing**.
- **Shared store inventory** is renamed to **Inventory**.
- Inventory/Listings refresh timestamps move into a compact header status beside the readiness light, using a 12-hour AM/PM clock such as **Sync 1:30 PM**. The label also shows **Syncing…**, **Please Sync**, **Setup Needed**, or **Sync Error** when appropriate.
- Normal background refreshes still do **not** turn the global readiness light yellow; the established readiness-light behavior is preserved.
- Adds persistent display sorting to both Inventory and Listings: **New → Old**, **Old → New**, and **Make A–Z**. Each tab remembers its own selected sort on the device.
- Sorts are display-only and do not rename/move Drive folders, change photo order, or alter the protected website/photo identification logic.
- User-visible sync/posting times use a 12-hour AM/PM format.
- Retains all v0.8.1.2 website-import region, resolution, duplicate-photo, confidence, and collapsed-review behavior without changing that importer pipeline.
- Service-worker cache bumped to v0.8.2.

## v0.8.1.2 changes
- Website photo selection now favors the **highest-resolution repeated primary gallery** instead of letting the largest image-count group win automatically.
- Images appearing after obvious related-inventory sections such as **Explore more vehicles / Similar vehicles / Recently viewed** are excluded from the vehicle-photo candidate pool.
- Adds lightweight visual fingerprints so resized/cropped copies of the same scene can be collapsed to the highest-resolution version when the image service permits it.
- Adds a fallback parallel-gallery heuristic for responsive duplicate sets (for example two interleaved size variants of the same gallery), keeping the larger dimension group.
- High-confidence recommended photos stay visible; lower-confidence Review photos are collapsed behind **Expand to View All** to reduce scrolling.
- Keeps the exact supplied listing URL as the only website source and preserves the compact field-confidence/checkbox layout.
- Retains the Facebook odometer numeric-only copy fix and all Drive/source-of-truth fixes from earlier releases.
- Service-worker cache bumped to v0.8.1.2.

## v0.8.1.1 changes
- Website photo importing now probes actual image dimensions before recommending photos.
- The strongest repeated high-resolution image-size group (2+ matching large images) is treated as the likely vehicle gallery and is preselected automatically.
- Other plausible high-resolution images remain visible but unchecked as **Review** items so the user can decide.
- Obvious thumbnails, maps/location graphics, logos, tiny artwork and lower-resolution resized duplicates are omitted from the review grid.
- Photo review now shows High/Review confidence and detected dimensions, plus a Recommended button that restores the automatic selection.
- Retains v0.8.1 heading/model parsing, compact field review layout and all v0.8.0 importer/Facebook odometer fixes.
- Service-worker cache bumped to v0.8.1.1.

## v0.8.1 changes
- Website and photo review rows are tighter: the confidence chip and checkbox now sit together on the right side of each field.
- Website Year + Make + Model parsing now reads the same vehicle heading line first, preventing badges such as “JUST ARRIVED!” from becoming the model.
- Website gallery extraction now prefers the largest `srcset` / sized image variant, collapses resized thumbnail duplicates, and filters common map/location artwork.
- Retains v0.8.0 exact-URL importing and Facebook odometer numeric-only copy behavior.
- Service-worker cache bumped to v0.8.1.

## v0.8.0 changes

- Adds **🌐 Import From Website** to Vehicle Profile create/edit. Paste the exact dealership vehicle URL and LotKeys scans only that supplied page for Year, Make, Model, current/sale Price, Odometer + unit, VIN, Stock #, Vehicle Profile Description, CARFAX link when exposed, and gallery photos.
- The pasted dealership URL is automatically included as the **Original Vehicle Listing URL** suggestion.
- Website importing uses the exact supplied page only; missing information stays blank/untouched rather than being filled from search results or another dealership page.
- Website results use the same checkbox approval workflow as Info From Photo, including Select All / Clear All and photo selection before import.
- Info From Photo review rows are compacted so checkbox, field/value and confidence level share one line where possible.
- Facebook Posting Assistant keeps showing formatted odometer text such as `95,639 KM`, but the Copy button now sends numeric-only `95639` so Facebook's mileage field accepts the paste.
- Website photo import attempts to preserve the page's gallery order and skips photos already imported from the same source URL.
- Service-worker cache bumped to v0.8.0.

## v0.7.9 changes

- Keeps the top readiness light yellow for the entire Google Drive connection/store-loading process, even if the user changes tabs.
- Adds immediate press/working feedback to Vehicle and Listing cards.
- Vehicle Profiles now open a loading panel immediately while Drive media is reconciled, so slower first-load Drive checks no longer look like a missed click.
- Keeps the broader Drive read permission required to discover photos/videos/documents added directly in Google Drive, not only through LotKeys.

## v0.7.8 changes

- Fixed photo filename order prefixes multiplying on every sync. LotKeys now strips any previous leading order markers and writes exactly one current marker, e.g. `03 - original-photo.jpg`. Reordering overwrites that number instead of adding another one.
- Vehicle media remains Drive-authoritative: files added directly to Shared/Photos, Shared/Videos or Shared/Documents are discovered when a Vehicle Profile is opened/refreshed.
- Fixed Vehicle Info Directory duplication. `Vehicle Info Directory.pdf` is now treated as a singleton per vehicle: LotKeys reuses/overwrites the existing PDF and moves stale duplicate copies to Drive Trash on the next vehicle sync.
- Preserves Drive-only metadata while refreshing a Vehicle Profile so the browser does not forget the existing Vehicle Info Directory file ID and accidentally create another copy.
- Service-worker cache bumped to v0.7.7.

- Fixed mobile photo drag/reorder by using document-level pointer tracking and touch-friendly drop targeting.
- CARFAX report placeholder is now a normal clickable VIEW CARFAX REPORT text link; LotKeys no longer inserts the old View Report graphic.
- Global readiness light stays green during ordinary item/background synchronization; individual cards still show their sync state.

## v0.7.6 changes

- Google Drive is the source of truth for Vehicle Profile Photos, Videos and Documents; manually added Drive files are discovered by LotKeys.
- Drive authorization includes read access needed to discover files that were not originally uploaded by LotKeys.

# LotKeys Drive Test v0.7.5

## v0.7.5 changes

- Full clean release based on the complete v0.7.4 build plus the CARFAX badge sizing hotfix.
- One Owner, Low Kilometres and No Reported Accidents are inserted using the same display height so the One Owner badge no longer renders taller than the others.
- CARFAX history badges remain on one line when all three placeholders are kept together in the Administration template.
- VIEW CARFAX REPORT remains a normal text hyperlink; the old CARFAX View Report graphic is not required.
- Service-worker cache bumped to v0.7.5 to avoid stale partial-patch files after replacing the GitHub release.

# LotKeys Drive Test v0.7.3

## v0.7.3 changes

- Added a traffic-light readiness indicator beside the + button on every main screen.
  - Green = Google Drive connected, user/store ready, and no pending local changes.
  - Yellow = Google Drive needs reconnecting, an item is pending/syncing, or a background refresh is running.
  - Red = Store/account setup is incomplete or one or more items have a Drive sync error.
- Tap the readiness circle to see what is happening and plain-language instructions to correct it.
- Vehicle and Marketplace cards highlight yellow while local/pending/syncing; Marketplace status Pending also highlights yellow. Drive sync errors highlight red.
- Copy buttons briefly turn yellow and show “Copied ✓” after copying a link or Facebook field.
- Marketplace listing forms now close after the local save and synchronize to Drive in the background, making the pending/syncing state visible instead of holding the user on “Saving…”.



## v0.7.2 changes

- CARFAX placeholders can now render the supplied CARFAX graphics in generated Vehicle Info Directory PDFs. The report image is linked to the vehicle CARFAX URL; One Owner / Low Kilometres / No Reported Accidents images appear only when their Vehicle Profile checkboxes are selected.
- Fixed v0.7.1 listing migration pulling old duplicate test drafts back into My Listings. Legacy no-location/no-Facebook draft copies for the same vehicle are collapsed to the newest record and stale duplicate files are moved to Drive Trash. Posted, active, Facebook-linked, and location-specific listings are preserved.
- New listing records use schema v5 so future intentional drafts are not treated as v0.7.1 legacy duplicates.

## v0.7.1 changes

- Marketplace Listings are now user-specific Drive data, not device-only data. The same LotKeys/Google user can load their listings on phone, PC, or another browser.
- Added `Users/<User>/Listings/Listings Index.json` for faster cross-device listing refreshes. Existing listing JSON files are discovered and indexed automatically.
- Existing local listings are migrated to the signed-in user's Drive Listings folder when needed.
- My Listings refreshes every 5 minutes, when returning to LotKeys, when opening Home/Listings, and with a manual **Refresh Listings** button.
- A listing keeps a snapshot of its location for display on another device, while saved Posting Locations/Postal Codes remain client-side preferences.
- Deleting a listing now removes its synced Drive listing record and updates the user Listings index.
- Vehicle Info Directory placeholders now inject plain text only. LotKeys no longer adds emojis/checkmarks; administrators control all icons/graphics in the Google Doc template.
- Vehicle Info Directory fingerprints were bumped so the text-only placeholder behavior is picked up on the next vehicle sync.

# LotKeys Drive Test v0.7.0

## v0.7.0 changes

- Shared Inventory now loads back from Google Drive on other devices.
- Added a Drive-backed `Inventory Index.json` for fast store-wide refreshes, with full-scan fallback for existing inventory.
- Store inventory refreshes every 5 minutes while LotKeys is open and when returning to the app; manual Refresh Inventory is also available.
- Vehicle editing now saves locally immediately and syncs to Drive in the background. Unchanged media and Vehicle Info Directory work are skipped when possible.
- LotKeys users are bound to the Google account used to connect. Duplicate user names cannot be claimed by another Google account. The first registered user is the Store Administrator.
- Settings are role-aware: normal users see account/Drive status and their own posting locations; Store/Drive/template/developer controls are Administrator-only.
- Saved Facebook posting locations are client-side user preferences and are no longer stored in the shared Store configuration.
- One Store Name is now used everywhere; the duplicate Vehicle Info Directory Store Name setting was removed.
- Vehicle Profile actions are now: Copy Vehicle Info Sheet Link, Open Shared Folder, Sync Vehicle.
- CARFAX checkbox label spacing was refined.
- Existing v0.6.x directory template references are re-resolved from Administration once during migration.
- Vehicle media is hydrated from Drive on demand when opening a vehicle or preparing a listing on another device.

# LotKeys Drive Test v0.6.2

Adds the customer-facing **Vehicle Info Directory** system.


## New in v0.6.1

- Store-wide settings now live in `Administration/LotKeys.json`.
- Existing `LotKeys Store Config.json` files are migrated/renamed automatically.
- A staff member connecting to an existing Store folder loads the shared Store name, address, directions URL, template reference, and saved posting locations.
- User name remains device/user-specific and is not written into the shared Store config.
- CARFAX checkboxes are displayed side-by-side: **One Owner**, **Low Odometer**, **No Accidents**.
- Customer directory badge wording follows the shorter labels while the existing template placeholders remain compatible.

## New in v0.6
- Vehicle Profile fields for optional Original Vehicle Listing URL and CARFAX URL.
- User-controlled CARFAX badges: One Owner, Low Kilometres, No Reported Accidents.
- Store-level customer directory name, address and directions URL.
- An editable Google Doc template named `Vehicle Info Directory Template` in Administration.
- Every synced vehicle generates/updates `Vehicle Info Directory.pdf` inside Shared.
- PDF links to the original listing (when supplied), Photos, Videos, Inspections & Documents, CARFAX (when supplied), and store directions.
- Existing photo/video/document and Facebook Posting Assistant behavior remains.

## One-time Google Cloud change
Enable **Google Docs API** in the same LotKeys Google Cloud project. No new OAuth client is required; the existing `drive.file` scope is accepted by the Docs API.

## Template rule
Administrators can edit branding, graphics, fonts, wording and layout. Keep the `{{...}}` placeholder tokens intact so LotKeys can replace them when creating each PDF.

# LotKeys Drive Test v0.6

- Facebook Posting Assistant displays prices as formatted Canadian currency (for example `$18,488`) while the Copy button still sends the plain numeric value (`18488`) for Facebook compatibility.

# LotKeys Drive Test v0.5.9

UI cleanup: the **Create Listing → Vehicle Profile** selector now displays saved vehicles consistently as `Year Make Model — Stock #`. Stock numbers remain searchable/useful without being repeated in the visible label.

# LotKeys Drive Test v0.5.6

## v0.5.6

- Posting Assistant photo actions simplified to **💾 Download Photos** and **📂 Open Drive Photos**.
- Removed the redundant browser folder-save action.
- Facebook Selling shortcut now documents the tested Android behavior: if Facebook opens **No results found**, tap **Back once** to reach the Selling screen; Marketplace Home remains the fallback.
**Facebook Posting Assistant field correction:** Listing Name and Odometer are restored to the prepared Facebook copy fields. The full prepared set is now Listing Name, Year, Make, Model, Price, Odometer, Location / Postal Code, and Description.


**Facebook Android routing fix:** the direct `/marketplace/create/vehicle` deep link is no longer used from the Posting Assistant because the Facebook Android app can route it into a broken Marketplace search screen. The primary button now opens Marketplace Home and tells the user to use Facebook's normal Sell → Create listing flow.

# LotKeys Drive Test v0.5.1

## Facebook Posting Assistant

- Adds **Post to Facebook** to every LotKeys Marketplace listing.
- Adds **Save & Prepare Facebook** when creating/editing a listing so the user can jump directly into the posting workflow.
- Posting Assistant keeps the listing's exact custom photo order visible and provides:
  - **Open Drive Photos**
  - **Download Photos** with numbered filenames matching the listing order
  - **Share / Save Photos** through Android's Web Share sheet when supported
- Adds one-tap copy controls for:
  - Marketplace Title
  - Year / Make / Model
  - Price
  - Odometer + unit
  - Saved listing location/address/coordinates
  - Marketplace Description
- Adds **Open Facebook Marketplace** from the prepared listing.
- After publishing, **I Posted It** marks the listing Active, records `postedAt`, accepts the Facebook listing URL, and syncs that information to `Users/<User>/Listings` in Google Drive.
- Listing age now uses the actual Facebook `postedAt` time when available instead of only the LotKeys draft creation time.
- Duplicating a listing resets the Facebook URL, posted time and Drive listing file reference.
- Drive listing JSON schema bumped to version 3 to include `postedAt` and `lastPreparedAt`.
- Service-worker cache bumped to v0.5.1.

# LotKeys Drive Test v0.4.2

- Adds **Videos** and **Attachments** galleries directly inside the Vehicle Profile, immediately below the master Photos area.
- Videos can be played in-app when a local copy is available, or opened from Google Drive after sync.
- Attachments show as visual cards with filenames, file type, sync state, and Open actions; image attachments get thumbnails.
- The Add/Edit Vehicle screen now previews existing Videos and Attachments instead of showing only file-picker boxes.
- Adding more Videos or Attachments **appends** to the existing set instead of replacing what was already attached.
- Videos and Attachments can be removed from the Edit Vehicle screen; Drive sync then removes the corresponding synced file.
- Keeps the v0.4.1 Info From Photo improvements.
- Service-worker cache bumped to v0.4.2.

# LotKeys Drive Test v0.4.1

- Polishes Info From Photo result rows to display clear `Label: Value` spacing on mobile.
- Adds an enhanced contrast/upscale OCR fallback for difficult key tags and labels.
- Adds `INFI` → `Infiniti` recognition for abbreviated lot tags.
- Adds a conservative suggested stock-number fallback when a tag shows an unlabeled dealer stock code.
- Service-worker cache bumped to v0.4.1.

# LotKeys Drive Test v0.4

## New in v0.4

- **Info From Photo (first test version):** when adding/editing a Vehicle Profile, choose one or more photos/screenshots and LotKeys runs browser-side OCR to suggest Year, Make, Model, Price, Odometer/Unit, VIN, and Stock #.
- High-confidence values are preselected but **nothing is applied until the user reviews and taps Apply Selected**.
- A valid 17-character VIN is treated as high confidence; labeled fields such as `STK`, `YEAR`, `MAKE`, and `MODEL` are prioritized.
- The photos used for Info From Photo are analysis-only and are **not** automatically added to the customer-facing vehicle Photos folder.
- OCR uses Tesseract.js in the browser and is loaded only when the feature is used; the first scan can take longer while the OCR engine/language data downloads.
- Vehicle Profile / Google Drive folder naming is now **`Year Make Model - Stock #`** (for example `2022 Infiniti Q60 - PH80225`). Existing synced profile folders will be renamed on their next save/sync.
- Service-worker cache bumped to v0.4 so phones pick up the new build.

# LotKeys Drive Test v0.3.1

**Hotfix:** fixes Google Drive vehicle sync error `buildVehicleProfileName is not defined`. The shared naming helper now lives outside the UI module so Drive sync can call it. Service-worker cache version was also bumped so the fixed build replaces v0.3 on phones.

# LotKeys Drive Test v0.3

This is the first hosted test build that can write real vehicle and listing data into Google Drive.

## v0.6.2 changes

- Create menu now puts **🚙 Vehicle Profile** first and uses **📄 Marketplace Listing** second.
- CARFAX history checkboxes keep all three choices in one row with reliable spacing between each box and label.
- Vehicle Info Directory generation re-resolves **Administration / Vehicle Info Directory Template** before every generation. The Administration template is now the source of truth instead of a stale cached template ID.
- **Info From Photo** now prioritizes a grouped **Year + Make + Model** heading and nearby **STK/VIN** evidence before page-wide fallbacks. This prevents dealership branding such as Infiniti from overriding the actual vehicle make on website screenshots.
- Odometer/KM may still be recovered from elsewhere on the image because dealership sites often place mileage in a separate section.
- Sale/Your Price is preferred over a regular/list price when both are visible.

## What is implemented

- Google OAuth 2.0 browser authorization using Google Identity Services.
- Google Picker folder selection so the user deliberately grants LotKeys access to a Store folder.
- Store folder initialization:
  - `Users/<User Name>/Listings`
  - `Administration`
  - `Inventory`
- Vehicle Drive sync:
  - creates/updates one Vehicle Profile folder
  - creates `Vehicle Data - Administrative` as a Google Sheet
  - creates `Shared/Photos`, `Shared/Videos`, and `Shared/Documents`
  - uploads vehicle media into the correct Shared subfolder
  - preserves the master photo order by prefixing synced photo filenames `01 -`, `02 -`, etc.
  - stores Drive file/folder IDs so renaming a profile does not break references
  - automatically creates the Shared folder link
  - optionally enables `Anyone with the link can view` on the Shared folder
- Marketplace listing Drive sync:
  - listing data stays separate from the Vehicle Profile description
  - writes the salesperson's listing record under `Users/<User>/Listings`
- Store config sync:
  - saved posting locations are written into `Administration/LotKeys Store Config.json`
- Deleting a synced vehicle moves the Vehicle Profile folder to Google Drive Trash.
- Local IndexedDB remains the phone/browser cache and offline working copy.

## Important test-build limitation

The app uses Google's browser token model. The Drive access token is held only for the current browser session and expires. If needed, LotKeys will ask you to authorize again. A production release should use a more durable authentication architecture rather than storing long-lived secrets in the browser.

## Before testing Drive

1. Host this folder at an HTTPS URL.
2. Create a Google Cloud project.
3. Enable Google Drive API, Google Picker API, and Google Sheets API.
4. Configure the OAuth consent screen and add yourself as a test user.
5. Create a Web OAuth Client ID with the hosted app's exact origin as an Authorized JavaScript origin.
6. Create an API key for Google Picker and restrict it to your hosted site/API when possible.
7. Find the Google Cloud Project Number.
8. In LotKeys > Settings > Test developer setup, enter the Client ID, API key, and Project Number.
9. Tap Connect Google Drive.
10. Tap Choose Store Folder and select an empty test Store folder.
11. Enter Store Name and My User Name.
12. Tap Initialize / Repair Store Structure.
13. Create a small test vehicle with two photos and verify the Drive folders, Sheet, and Shared link.

See `GOOGLE-CLOUD-SETUP.md` and `DEPLOY-GITHUB-PAGES.md` for the detailed sequence.


## v0.3 naming rule
Vehicle Profile names are generated automatically as `STK: <stock> - <year> <make> <model>`. If the Model already begins with the Make, LotKeys avoids duplicating it. Marketplace titles remain salesperson-controlled and free-form. Existing synced vehicle folders are renamed on the next vehicle save/sync.


## v0.5.4 Facebook assistant refinements

- Posting Assistant now mirrors the Facebook Android vehicle form fields observed in testing: Year, Make, Model, Price, Postal Code location, and Description.
- Saved posting locations now have a dedicated Facebook Postal Code field; address/coordinates remain optional reference data.
- Primary Facebook button now targets the Marketplace Selling area (`/marketplace/you/selling`), with Marketplace Home kept as a fallback.
- Marketplace Title and odometer remain stored in LotKeys even though the current Facebook vehicle form does not request them on the first screen.


## v0.5.7 Facebook navigation test

- Facebook button now opens the parent Marketplace account route (`/marketplace/you/`) instead of `/marketplace/you/selling`.
- This is intended to avoid the Android Facebook app interpreting the final `selling` path as a Marketplace search.
- Marketplace Home remains available as a fallback.

## v0.5.8 Facebook Selling route test
- Primary Facebook button now targets exactly `https://www.facebook.com/marketplace/selling`.
- This tests the simpler Selling route observed during live Android/Facebook app testing.
- Marketplace Home remains available as the fallback.


## v0.8.5 — Account + Description Recipe Builder
- Added a personal **Account** section at the bottom of Settings with sales/display name, System/Light/Dark appearance and selectable accent color.
- Added **Description Templates** with **＋ Create / Add** first, plus built-in **Marketplace - Quick** and **Marketplace - Detailed** recipes.
- Custom templates use draggable building blocks for Headline, Vehicle Details, Overview, Features, Top Features, Price, Financing, Signature and Custom Text. Sections and emoji treatment can be toggled independently.
- Create/Edit Listing now includes **✨ Build Description**. It uses Vehicle Profile values as the source of truth, checks the exact Original Listing URL for supplementary facts/features, flags a current website price that differs from the Profile without silently overwriting the Profile, and lets the user approve/edit ingredients before building editable Marketplace copy.
- Description template selection defaults to the user's last-used recipe.
- Renamed listing actions to **Save Listing for later** and **Save & Prepare Facebook Listing**.
- Personal templates/preferences are local-browser backed in this test build; portable personal-profile sync is the next foundation before the Chrome Marketplace extension.

## v0.8.7 — Portable Profile + theme polish + Vehicle Profile builders
- Personal Profile data now uses a **local browser cache plus a user-owned Google Drive backup** in `My Drive/LotKeys Personal Profile`. It carries the user's display name, theme, accent color, personal Description Templates, last-used template and profile photo independently of any dealership Store folder.
- A compact `Profile Thumbnail.jpg` is also maintained inside the user's Store-side `Users/<User>/` folder. Store Administration can use this small thumbnail without duplicating the full personal profile image.
- New Vehicle Profiles record the **original creator** and creation date. Creator metadata is written to the administrative Sheet and Inventory Index, then displayed on the Vehicle Profile with the creator's small profile photo when available.
- Administrators now get a **Vehicle Profile Builders** chart below Store Configuration showing the top 10 registered users by active Inventory profiles created, plus the signed-in user's personal active-profile count. Legacy profiles without creator metadata remain clearly identified as unassigned rather than guessed.
- Dark-mode syncing cards now keep the yellow warning outline **and** receive a dark amber/yellow-tinted fill so the syncing state is visible against charcoal cards.
- The Create/Edit Listing vehicle-search gradient follows the user's selected accent hue.
- Info From Photo / Import From Website panels and other previously light-only surfaces now use charcoal surfaces in Dark mode while retaining subtle blue/green functional tints.
- Checkboxes now follow the selected accent color and use the calculated contrasting checkmark color. Light accent choices also receive improved active-navigation contrast/drop shadow.



## v0.8.7.2 — Neutral modal backdrop polish

- Removed the blue/slate saturation from the page dimming layer shown behind dialogs and loading modals.
- Dialog backdrops now use a neutral black transparency in both Light and Dark appearance modes, preserving the underlying UI without introducing a blue hue.
- All v0.8.7.1 navigation, rankings, portable profile and thumbnail behavior remains unchanged.

## v0.8.7.1 — Competition visibility + navigation polish
- Vehicle Profile Builders ranking is visible to every registered Store user; Administrator / Store Configuration remains admin-only.
- Bottom navigation order is now Home → Inventory → Listings → Settings → Profile, keeping Profile on the far right.
- Active bottom tabs receive a consistent translucent backplate and contrast-aware drop-shadow treatment so light/dark accents remain visible across themes.
- Store profile thumbnails remain one small image per user. Updating a profile photo overwrites that thumbnail and now invalidates/version-keys the in-app thumbnail cache so refreshed Store data updates avatars across Vehicle creator strips, Users and the leaderboard without creating duplicate active thumbnail files.


## v0.8.9.5 — Account Drive save reliability
- Fixed Personal Account saves being incorrectly skipped when the green Store sync state was healthy but the in-memory Google access token had not yet been restored after a page reload. Account sync now restores/renews authorization before writing.
- `Account.json` and `Account Photo.jpg` now write to the selected Lot-Keys Account folder whenever Account preferences/photo changes are saved.
- Store-side `Users/<User>/Profile Thumbnail.jpg` generation now restores authorization independently and forces a complete Store user structure lookup when needed.
- Personal Account saving and Store thumbnail publishing are treated as separate steps, so a thumbnail registry problem can no longer falsely report that the personal Account file failed to save.
- Account/photo toast messages no longer claim a cloud save when only the local browser cache was updated.
