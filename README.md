# LotKeys TEST V0.9.5.47 — Store access requests

Administrators can **Copy Store Invitation**. New users connect with that invitation,
send Google's Request access prompt, and appear in **Reports / Requests**. Approve
provisions their Store workspace using the exact Google account; Deny grants nothing.
Store files remain private until approval. Existing Android .46 stays installed.

433 web tests and 30 syntax checks pass; real two-account Google/phone testing is
pending. This does not remove Google's separate OAuth test-user restriction.
[Release details](RELEASE-0.9.5.47.md) · [Verification](LotKeys-0.9.5.47-Test-Report.md).

# LotKeys TEST V0.9.5.46 — app launch and background upload controls

[Install the signed .46 Android update](downloads/LotKeys-Connector-TEST-V0.9.5.46.apk)
over the current TEST app. The verified origin enables Trusted Web Activity launch
without Chrome's URL toolbar on compatible browsers. Use the same browser/profile;
do not uninstall or clear data. Physical-phone toolbar confirmation is pending.

Keep LotKeys open while preparing originals. After a durable handoff, open native
Background upload controls and tap Continue uploads in background before switching
apps. Android can defer/stop work; existing retained retries and .44 improvements
remain. 406 web and 58 native tests pass; phone app-switch/lock/retry tests remain.
[Release details](RELEASE-0.9.5.46.md) · [Verification and rollback](LotKeys-0.9.5.46-Test-Report.md).

# LotKeys TEST V0.9.5.44 — earlier Android handoff

Folders and essential Vehicle data are saved first. Android then retains every
original and the remaining Info Sheet/Inventory work. At **Ready to switch apps**,
you can switch apps while Android uploads and finishes the Profile.

[Install the signed V0.9.5.44 connector](downloads/LotKeys-Connector-TEST-V0.9.5.44.apk)
over the current TEST app, preserving data and trusted PCs. Older connectors and
destructive/ambiguous media edits keep the established sequence. Readiness time
depends on original file sizes and device/network speed; 30 seconds is a target.
393 Node tests and 27 native tests pass, with assembly/lint/signature checks.
Physical-phone .44 verification remains pending.
[Release details](RELEASE-0.9.5.44.md) · [Verification](LotKeys-0.9.5.44-Test-Report.md).

# LotKeys TEST V0.9.5.43 — Android save status recovery

Incomplete Android replies now trigger retained-job recovery instead of being
mistaken for another account/Store/edit. Real mismatches still stop the save.
Queued work, upload reports and failures have distinct guidance, and reopening
LotKeys rechecks the retained job. Error text replaces stale switch-app advice.

369 tests and syntax checks pass. Keep Android .40 and Posting Buddy .25;
no APK reinstall. Physical-phone confirmation remains necessary.
[Release details](RELEASE-0.9.5.43.md) · [Verification](LotKeys-0.9.5.43-Test-Report.md).

# LotKeys TEST V0.9.5.42 — Posting Buddy V0.1.25

Fixes Update Photos on an empty Facebook uploader, reacquires its file picker
when the photo grid rebuilds, and preserves a selected video. Progress counts
photos separately and recognizes accepted photos after FileList clears.

[Download Posting Buddy V0.1.25](extension/releases/LotKeys-Facebook-Assistant-Beta-v0.1.25.zip).
Replace files in the same unpacked folder, Reload the extension at
chrome://extensions, reload Facebook and Sync. Review before manually saving.
355 tests pass; a real Facebook check is still needed. Android stays .40.
[Release details](RELEASE-0.9.5.42.md) · [Verification](LotKeys-0.9.5.42-Test-Report.md).

# LotKeys TEST V0.9.5.41 — background-save recovery

Opening a Vehicle Profile or refreshing Inventory now preserves its unfinished
Android save, local edit and photo list. A retained error or native upload cannot
appear as Synced. For the .40 paused-save issue, load .41 and tap Sync Vehicle
once on the affected Profile; verified recovery reuses Android's retained files.

Keep your installed .40 TEST connector. No APK reinstall or data clearing is
needed. 340 Node tests and syntax checks pass; physical-phone confirmation is
still required. [Release details](RELEASE-0.9.5.41.md),
[verification](LotKeys-0.9.5.41-Test-Report.md),
[current project state](CURRENT-STATE.md).

# LotKeys TEST V0.9.5.40 — phone connection polish

Phone connection settings have Add a PC / Check for code. Both devices show blue
for a live connection, including the dots and open connection details. The native
connector updates its PC relay status while visible and stops UI refresh onPause.
Store sync warnings remain separate; active/hourly Hub polling is unchanged.

Vehicle upload status says Background ready · you can switch apps only after
Android has confirmed every original. Preparation before that boundary still
needs the browser. Upload scheduling is independent of Hub checks.

[Download the .40 TEST connector](downloads/LotKeys-Connector-TEST-V0.9.5.40.apk)
and install it over the existing connector to retain app data/pairing. Web .40
remains compatible with .39. 321 web tests, 16 native tests, Android build/lint,
APK certificate/signatures/package/version and ZIP contents pass verification.
Real-device follow-up remains necessary. [Release details](RELEASE-0.9.5.40.md).

# LotKeys TEST V0.9.5.39 — background uploads and active/idle Hub

The PC page automatically calls its registered phone. Green means registered
and waiting; blue requires a fresh phone acknowledgement. Retry is inside the
status-light connection settings.

The matching Android connector checks every two seconds during visible phone
use or a live PC connection, then about hourly while idle with a trusted PC.
There are no idle checks without a trusted PC. Opening only the PC site can wait
for the idle phone check; opening the phone app checks promptly. No Firebase
setup is needed.

[Install the V0.9.5.39 TEST connector](downloads/LotKeys-Connector-TEST-V0.9.5.39.apk)
over the installed connector, keeping its data. The APK uses the original TEST
certificate. V0.9.5.12 remains compatible with the website but does not gain the
new native features until updated. Background Vehicle Profile uploads require
separate Drive approval; keep LotKeys open until Android has the originals.
Uploads have their own queue and do not wait for hourly Hub checks.

317 web tests, Android assembly, 16 native tests and lint pass. Real-device
battery, locked-phone and upload verification remains outstanding. The optional
FCM prototype stays inactive. See [release details](RELEASE-0.9.5.39.md).

# LotKeys V0.9.5.38 — Recent Device conversation cache

While the phone is connected, six recent messages are kept ready for ten recent conversations in temporary browser memory. Background warming yields between reads, and earlier history retains its phone cursor. See [release details](RELEASE-0.9.5.38.md), [verification](LotKeys-0.9.5.38-Test-Report.md) and [current project state](CURRENT-STATE.md).

## V0.9.5.37 retained

# LotKeys V0.9.5.37 — Store branding isolation

Keeps cached logos scoped to the active Store and account, validates logo file ownership, and removes the old dealership folder from the Processor template. See [release details](RELEASE-0.9.5.37.md) and [verification](LotKeys-0.9.5.37-Test-Report.md).

## V0.9.5.35 retained

# LotKeys V0.9.5.35 — Personal preferences backup

Description Builder templates, the default template and PC notification sounds now save to personal Account Storage with verified writes, retry state and cross-device restoration. Existing newer device templates and local PC sounds are picked up on reconnect. See [release details](RELEASE-0.9.5.35.md) and [verification](LotKeys-0.9.5.35-Test-Report.md).

## V0.9.5.34 retained

# LotKeys V0.9.5.34 — Posting Buddy listing names

Garage downloads Posting Buddy V0.1.24. Facebook name filling now uses the saved Listing title instead of the separate Vehicle Profile-derived Model wording. Matching Year/Make prefixes are not repeated; posting, selective Details updates and field retries share the correction. See [release details](RELEASE-0.9.5.34.md) and [verification](LotKeys-0.9.5.34-Test-Report.md).

## V0.9.5.33 retained

# LotKeys V0.9.5.33 — Inventory workspace recovery

Inventory sync and Store setup operate independently of personal listing migration. Missing approved-user workspace references are rebuilt without deleting device-saved listings. The personal per-dealership listing location and previous import/chat fixes remain. See [release details](RELEASE-0.9.5.33.md) and [verification](LotKeys-0.9.5.33-Test-Report.md).

## V0.9.5.32 retained

# LotKeys V0.9.5.32 — Personal listing storage and SMS receipts

Personal listings and their photos are grouped by dealership under the existing personal Account Storage folder. Previous Store copies migrate without deleting the originals. Device chat shows the phone’s send error and distinguishes an unconfirmed send; Check status reuses its original request ID. See [release details](RELEASE-0.9.5.32.md) and [verification](LotKeys-0.9.5.32-Test-Report.md).

## V0.9.5.31 retained

# LotKeys V0.9.5.31 — Device chat history reuse

Opening a Device notification reuses its recent phone history instead of starting another relay round trip. Bubble Chat, full chat, prefetch and overlapping phone reads share requests. Changes to another conversation retain the current chat’s warm page; changed or aged pages refresh from the phone. Full-chat history starts while private Hub metadata loads. Older-page cursors, new arrivals, media, read acknowledgements and disconnect privacy remain covered. See [RELEASE-0.9.5.31.md](RELEASE-0.9.5.31.md) and [verification](LotKeys-0.9.5.31-Test-Report.md).

## V0.9.5.30 retained

# LotKeys V0.9.5.30 — website description and gallery recovery

Vehicle descriptions now recognize the Legacy **Overview** heading and take precedence over generic metadata. Incomplete galleries are refreshed before photo selection; photo requests have deadlines and original gallery bytes can be reused. Distinct original views remain available even when their small comparison hashes look similar. Description Builder receives the overview and supplementary equipment while retaining existing Profile wording and price. Earlier Go Auto-style and Grand Wagoneer recognition remains covered. See [RELEASE-0.9.5.30.md](RELEASE-0.9.5.30.md) and [verification](LotKeys-0.9.5.30-Test-Report.md).

## V0.9.5.29 retained

# LotKeys V0.9.5.29 — expanded dealership recognition

The importer now reads the full vehicle heading and bulleted specifications, keeps recommended vehicles out of price recognition, and resolves the known photo CDN's thumbnails to original images. Legacy pages that return a JavaScript shell use the existing rendered-page reader. The actual Nautilus page was checked alongside earlier Go Auto-style and Grand Wagoneer regression examples. Recognition continues to build on previous templates. See [RELEASE-0.9.5.29.md](RELEASE-0.9.5.29.md) and [verification](LotKeys-0.9.5.29-Test-Report.md).

## V0.9.5.28 retained

# LotKeys V0.9.5.28 — import template compatibility

Website recognition is cumulative: Legacy support extends the existing importer, including its Go Auto-style **Your Price**, matching structured vehicle data and gallery rules. A separate payment heading below a sale price is no longer mistaken for that price's payment unit. Go Auto-style and Legacy examples are covered together by regression checks. See [RELEASE-0.9.5.28.md](RELEASE-0.9.5.28.md) and [verification](LotKeys-0.9.5.28-Test-Report.md).

## V0.9.5.27 retained

# LotKeys V0.9.5.27 — Legacy listing import

Imports from Legacy Dodge Wetaskiwin use **Legacy Price** as the selling price. **Vehicle Price** is the sticker/listed amount and is not substituted if a sale price cannot be confirmed. Payment amounts are removed from vehicle model names, colon-separated kilometres are read from specifications, and the listing's own CARFAX View Report link is captured. See [RELEASE-0.9.5.27.md](RELEASE-0.9.5.27.md) and [verification](LotKeys-0.9.5.27-Test-Report.md).

## V0.9.5.26 retained

# LotKeys V0.9.5.26 — Store sync and disconnect recovery

Garage can disconnect from a Store during an automatic refresh. Unfinished Store work stays on this device and returns only when the same Google account reconnects to that Store. The header labels read-only refreshes as “Refreshing…” so they are not confused with uploads. The personal Hub, profile and phone connection remain in place. See [RELEASE-0.9.5.26.md](RELEASE-0.9.5.26.md).

## V0.9.5.25 retained

# LotKeys V0.9.5.25 — Store switching and creation

Disconnect from a Store through the blue Garage connection button, then join another Store or create a separate Store as Owner / Admin Level 2. Your Google sign-in, Hub, phone connection, profile and personal preferences remain in place. A new Store starts with fresh Inventory, Listings, user roster and contributor points. See [RELEASE-0.9.5.25.md](RELEASE-0.9.5.25.md).

## V0.9.5.24 retained

# LotKeys V0.9.5.24 — persistent Hub reminder shortcut

The TEST web update keeps the Hub reminder shortcut visible so completed reminders remain accessible. The button turns grey when no active reminders need attention, and its glyph is slightly smaller on PC and phone. The existing V0.9.5.12 Android connector remains installed. See [RELEASE-0.9.5.24.md](RELEASE-0.9.5.24.md).

## V0.9.5.23 retained

# LotKeys V0.9.5.23 — Hub-aware incoming previews

The TEST web update suppresses the in-app message preview whenever Hub is open, so a new message does not cover a conversation or reply field. Elsewhere, the preview starts beside the Hub tab and fills the right side up to a safe gap before the PC scrollbar. The Android system messaging heads-up is controlled by the phone, not this web preview. Keep the V0.9.5.12 Android connector installed. See [RELEASE-0.9.5.23.md](RELEASE-0.9.5.23.md).

## V0.9.5.22 retained

# LotKeys V0.9.5.22 — quiet Device send confirmation

The TEST web update removes the redundant “SMS sent through the phone” pop-up from Device conversation sends. Each outgoing message continues to show its SMS Sent or MMS Sent state, while failures still display an error. Keep the V0.9.5.12 Android connector installed. See [RELEASE-0.9.5.22.md](RELEASE-0.9.5.22.md).

## V0.9.5.21 retained

# LotKeys V0.9.5.21 — chat layout and page headers

The TEST web update widens full LotKeys Chat and its composer to use the conversation area beside the action rail. Incoming LotKeys messages now match the Device chat card surface. Device message text adopts the in-app 14px size and line spacing. Home, Inventory, Listings, Garage and Account headers are white in light theme and black in dark theme. Keep the V0.9.5.12 Android connector installed. See [RELEASE-0.9.5.21.md](RELEASE-0.9.5.21.md).

## V0.9.5.20 retained

# LotKeys V0.9.5.20 — Device Bubble Chat frame and contact header

The TEST web update returns the expanded Device chat outline and divider to grey, while keeping its message bubbles and compact alerts in the conversation color. The phone number sits below the contact name. Keep the V0.9.5.12 Android connector installed. See [RELEASE-0.9.5.20.md](RELEASE-0.9.5.20.md).

## V0.9.5.19 retained

# LotKeys V0.9.5.19 — Bubble Chat for LotKeys and Device messages

The TEST web update shares one quick-reply Bubble Chat across LotKeys and connected Device conversations. Holding Hub opens the most recently replied-to chat; incoming message previews open the sender in Bubble Chat. The Hub action stack sits near the lower-right edge with its existing order and spacing, and both reminder bells have corrected alignment and sizing. Keep the V0.9.5.12 Android connector installed. See [RELEASE-0.9.5.19.md](RELEASE-0.9.5.19.md) for the complete change list and test limits.

## V0.9.5.18 retained

The previous update shows long Device contact names on two lines above the number and lets the phone name each trusted computer in Connected Devices. The V0.9.5.17 Hub action order, theme styling, PC side rail, and Enter-to-send remain.

- Remove the redundant SMS/MMS status from the compact Device conversation header so a long name can wrap over two lines without growing the vehicle card.
- On the phone, open **Phone connection → 🖥️ Connected → Rename** to give a trusted PC a recognizable name. A blank name restores its original browser label. The nickname is saved on that phone's LotKeys browser and also appears for its active connection there.
- Keep the six actions in order: **Notes, Questions, Call, Media, Booking, Organize**, with the inverted Organize colors in both themes.
- No Android APK reinstall, permission change, re-pairing, or Google-account re-selection.

## V0.9.5.17 retained

- Order Device chat actions as **Notes, Questions, Call, Media, Booking, Organize**.
- Apply the existing high-contrast Organize treatment everywhere it appears in Hub: black with white text in the light theme and white with black text in the dark theme.
- Dock Device and LotKeys chat actions in a fixed right-side rail on PC while preserving the compact horizontal phone layout.
- Reserve conversation space beside the desktop rail so action buttons never cover Device messages.
- Make **Enter** send from both Device and LotKeys chats on a PC while **Shift+Enter** inserts a line break. Touch/mobile keyboards keep their normal behavior.
- Retain live MMS previews, saved-photo restoration, scroll-loaded older history, reconnection, and the working V0.9.5.12 Android connector. No APK reinstall, permission change, re-pairing, or Google-account re-selection is required.

## V0.9.5.16 retained

- Automatically fetch and show a browser-decodable MMS photo when it arrives while that Device conversation is open.
- Keep older unsaved photos lightweight and private: they retain the existing **View photo** control and load only when requested.
- Preserve the relationship between a message attachment and its explicitly saved Media copy. Once **💾** has retained a photo, reopening that message restores the saved Drive copy inline even if the phone copy is no longer available.
- Replace the normal **Load older messages** tap with scroll-boundary loading. The button changes to **Loading older messages…** with a spinner while each existing 20-message chunk is revealed.
- Preserve the user's reading position as older chunks and inline images expand.
- Retain the newest-six-first opening, **💾 Media** shortcut, Photos/Documents sections, live replies, reconnection, and the working V0.9.5.12 Android connector. No APK reinstall, permission change, re-pairing, or Google-account re-selection is required.

## V0.9.5.15 retained

- Show **View photo** for older unsaved image attachments in Device SMS/MMS bubbles.
- Fetch an older unsaved preview from the connected phone only after the user requests it, keeping the six-message opening path fast.
- Keep previews in temporary browser memory and revoke them when the chat closes, the phone disconnects, the account changes, or the page closes.
- Keep retention explicit: the photo enters the contact's private Drive folder only after the user presses **💾**.
- Add **💾 Media** beside Notes, Questions, Call, Booking, and Organize in Device chats.
- Divide saved contact attachments into **Photos** and **Documents**, including separate counts and empty states. HEIC/HEIF filenames are classified as photos even when the browser reports a generic MIME type.
- Keep the V0.9.5.14 progressive-history/live-refresh behavior and the working V0.9.5.12 Android connector. No APK reinstall, permission change, re-pairing, or Google-account re-selection is required.

Browser-decodable MMS images can be previewed inline. If a browser cannot decode a particular image format, LotKeys keeps the **💾** save path available instead of retaining or converting the attachment silently.

## V0.9.5.14 retained

- Render only the newest six messages when a Device conversation first opens.
- Reveal the already-fetched older messages 20 at a time before requesting the next Android history page.
- Quietly prefetch the newest Device conversation and reuse recently viewed first pages from an eight-entry, five-minute in-memory cache.
- Show the existing conversation preview immediately while a completely cold PC request crosses the encrypted Drive relay.
- Clear volatile history on expiry, disconnect, or tab close; no message body is added to `localStorage`, IndexedDB, Hub records, or Google Drive.
- Keep the V0.9.5.13 live-refresh/reconnection behavior and the working V0.9.5.12 Android connector. No APK reinstall is required.

A completely cold paired-PC history fetch still depends on the encrypted Drive relay round trip. This release improves the common warm/recent path and perceived cold-load response without claiming that the browser can make the unchanged Android connector return a smaller native page.

## V0.9.5.13 retained

- Refresh the visible Device history when the Android connector or paired-PC relay reports changed message data.
- Show incoming replies without leaving and reopening the conversation on either the phone or paired PC.
- Follow the newest reply when the conversation is already near the bottom, while preserving the reading position when older messages are on screen.
- Keep unsent text, queued attachments, and already-loaded older history intact during a live refresh.
- Reconcile the locally rendered outgoing SMS with the phone-confirmed copy instead of displaying it twice.
- Keep the working V0.9.5.12 Android connector. This is a web-only update and does not require an APK reinstall or account re-selection.

## V0.9.5.12 retained

- Preserve the exact account name and Android account type returned by Google's account picker.
- Deliver the freshly authorized token into the live foreground service instead of discarding it after setup.
- Treat V0.9.5.11's incomplete saved identity as needing one fresh account selection, preventing a false green Ready state after upgrade.
- Show the background relay's actual error in the connector when service health and saved setup differ.
- Guide sideloaded-app **Allow restricted settings** recovery after Android blocks Messages access.
- Open Android's direct battery-exemption confirmation from **Locked-Phone Battery Settings**.
- Retain V0.9.5.11's trusted-PC automatic reconnect, newest-offer protection and encrypted session replacement.

## V0.9.5.10 included

- Require the installed LotKeys Connector TEST to own the phone-side PC relay. A Google Drive grant in the phone browser can no longer make an unavailable Android relay look ready.
- On the phone, **Check PC relay** explains how to finish or renew the connector's PC Pairing Account. The Android relay's own error remains visible even after SMS records refresh successfully.
- Automatically show a new PC pairing code when Hub is visible, so an automatic request does not require a second tap on **Pairing** to reveal the code.
- Keep a saved PC session and its previous V0.9.5.09 reconnect logic. A formerly browser-owned phone session is retired when the page reloads; approve a fresh code through Android if needed.
- This is a web-only change. The compatible installed Android connector is still required and was not rebuilt into a new signed APK for this release. A relay stopped by Android, network loss, or lost Google authorization must be restored in the connector.

## V0.9.5.09 included

- When the PC has a saved phone session that looks offline, **Reconnect phone** probes that session first. If it responds, messaging resumes without a new code; otherwise a fresh pairing offer is created.
- On the phone, **🖥️ Connected**, **Sync records**, and **Pair a computer** share one row in the connection dialog.
- Phone connection warnings show phone relay errors only. Hub record sync reports its own failure when that action is used.
- The pairing dialog tells testers to open the Android connector and check its relay account if the matching code does not appear.
- The V0.9.5.08 Android connector remains compatible; installing a new APK is not required for these web changes.

## V0.9.5.08 included

- Turn the Hub 📶 green when the phone has a paired PC; color the healthy sync label and light blue while the PC is paired.
- Add **🖥️ Connected** to the phone's Phone connection dialog. Review trusted computers, forget one, or disconnect and forget all.
- Retry expired automatic pairing offers for still-trusted PCs and replace a stale PC session after repeated heartbeat failures. The phone-owned Android relay continues independently of the phone browser.
- Process active message frames before scanning new pairing offers, and expose **Locked-Phone Battery Settings** in the updated Android TEST connector.
- Keep the V0.9.5.07 pairing upload correction and existing Store data.

## V0.9.5.07 included

- Send the exact multipart boundary in the request header and body across the primary, alternate, XHR, and Google API client routes.
- Keep the short-lived private pairing probe and the V0.9.5.06 account-choice recovery. The phone connector protocol is unchanged; the installed V0.9.5.05 or V0.9.5.06 APK remains compatible.
- Verify mixed-case boundaries in an automated regression test.

## V0.9.5.06 retained

- Add **Choose Google account** on the PC without signing out, clearing LotKeys data, or changing the Store connection.
- Open a fresh Google account chooser without reusing the account hint that produced the Google error page.
- Verify the selected Google identity through more than one browser route.
- Create, read, and delete a short-lived probe in Google Drive's private app-data space before retrying the real pairing offer.
- Try the primary Drive endpoint, an alternate Google API endpoint, and the official Google API JavaScript client; each direct endpoint can use both `fetch` and `XMLHttpRequest`.
- Show the exact route and Google or browser-network detail if no route can create the offer.

## V0.9.5.04 retained

- Keep **📵 Block Number / Unblock Number** inline with a saved Contact's primary messaging number.
- Accept numeric SMS short codes from three to fifteen digits for LotKeys blocking and Device organization.
- Keep Contact saving and **Call** actions restricted to full valid phone numbers.
- Retain every V0.9.5.03 Blocked, Unsorted, Interested Vehicle, and unread-alert behavior.

## V0.9.5.03 retained

- Move **Unsorted** beside **All Device** as the first organization choice.
- Replace **Saved contacts** with **📵 Blocked**, covering saved Contacts and unsaved Device numbers.
- Add **📵 Block Number / Unblock Number** controls to the Contact editor and saved Contact details.
- Exclude blocked numbers from normal Hub views, Hub unread totals, numbered category badges and starred Important-category dots without deleting phone history.
- Keep **Interested Vehicle**, **💾 Media** and **💬 Chat** together on one Contact shortcut row.
- Show **+ Interested Vehicle** in an empty Device-chat header; search Vehicle Profiles by year, make, model, stock or VIN, or save a custom typed vehicle.
- Retain every V0.9.5.02 unread acknowledgement rule.

## V0.9.5.02 included

- Clear the conversation-row badge, numbered category badge, main Hub total and matching Important-category dot together after Device history loads successfully.
- Restore all applicable alerts when a newer incoming SMS/MMS arrives.
- Keep an outgoing reply or other harmless Android thread update from reviving an already-read alert.
- Store only device/thread signatures and the latest incoming message marker locally; message bodies are never added to the receipt.
- Remain protocol-compatible with the V0.9.5.01 Android connector, so this particular web hotfix does not require reinstalling the APK.
- Retain every V0.9.5.01 category-count and Important Hub alert rule.

## V0.9.5.01 included

- Show a black numbered unread badge on every matching Device category chip in light theme and a white numbered badge in dark theme.
- Keep each chip badge independent from the category's ⭐ Important selection and visible while the chip is selected or unselected.
- Display `1` through `99`, then `99+`, while retaining the exact count in the accessible chip label and tooltip.
- Continue using parent/subcategory closure and live Device conversations only; saved contacts without a live phone thread remain at zero.
- Keep the smaller category-coloured dots beneath the main Hub badge limited to the up-to-three starred Important categories.

## V0.9.4.100 retained

- Add a ⭐ selector to every Device category and subcategory, preserve it across rename/recolour/reorder/parent changes, and enforce a clear three-category maximum.
- Count unread messages only from current live Device conversations, while retaining parent-category alerting for unread subcategory threads and multi-category assignments.
- Keep the existing blue all-unread Hub badge and add up to three smaller category-coloured dots beneath it in saved category order.
- Show category unread status with high-contrast light/dark badges.
- Rename the filter action to **🗂️ Organize**, using black with white text in light theme and white with black text in dark theme.
- Request and verify both Store Drive and private `drive.appdata` permissions, with useful pairing guidance for missing-scope and network failures.

## V0.9.4.99 retained

- Add a bottom-left physical ☰ grip to each category row with mouse and Android pointer-drag support, a moving row preview and clear before/after drop cues.
- Persist the new category order for both drag and arrow moves so rows no longer snap back after repaint or save.
- Make the Listing photo grid inherit Inventory's tile/handle layout and skip its extra scroll-restoration frame after a drag.
- Preserve the single Listing grid: tap toggles without relocating a tile, unselected photos remain grey and in place, selected photos alone receive Cover/sequential numbering, and no more than 20 can be selected.

## V0.9.4.98 retained

- Suppress duplicate phone-status events when the public connection state has not changed.
- Keep status-only updates away from the Device conversation cards and their Vehicle Profile image URLs.
- Compare refreshed thread data before notifying Hub and replace changed threads without first clearing the list.

## V0.9.4.97 retained

- Paint cached Vehicle Profile cover photos in linked Hub Device-list cards.
- Reuse the existing chat-header thumbnail path and clean up replaced object URLs during Hub list refreshes.
- Preserve the standard missing-vehicle image for manually entered, unlinked interested vehicles.

## V0.9.4.96 retained

- Enforce the optional reminder section's hidden state even though its expanded layout uses `display: grid`.
- Keep Customer / Contact, Phone number, and Interested Vehicle / Vehicle Profile together inside **Additional fields**.
- Automatically expand those fields when editing a reminder that already contains a linked Contact, phone number, or Vehicle Profile.

## V0.9.4.95 retained

- Enforce the header bell's hidden state even though its Android-safe visual layout uses `display: grid`.
- Keep the bell visible only while at least one reminder is active; completed reminders do not hold it open.
- Show **Synced [time]** in the phone header, using a compact time that fits beside readiness, reminders and Create.

## V0.9.4.94 retained

- Preserve the active Home, Inventory, Listings, Account, or Garage page in session storage so a browser-tab restore does not jump to Home.
- Display the newest successful Inventory or Listings refresh time on Home instead of the older timestamp, with the full time visible in the phone header.
- Render the header bell and its one/two urgency marks as separate elements for reliable Android sizing.
- Apply reminder deletion locally before Drive synchronization, immediately return to the previous list or Calendar, and repaint the filtered count and shared bells.
- Make Calendar's **＋ Reminder** button open **All reminders**; use the plus button there to create a reminder.

## V0.9.4.93 retained

- Add a Reminder from the top-right Create menu on every main application tab, the Hub action menu, Calendar, or a Contact note.
- Use one standalone reminder record with optional notes, due time/date, Contact, raw phone number, Vehicle Profile, and Daily Repeat.
- Show a compact bell between readiness and Create plus a matching Hub bell above Calendar; plain, one-mark, and two-mark states use America/Edmonton calendar days.
- Complete one-time reminders permanently or daily reminders only for the current local day. Undated and daily reminders never flood Calendar.
- Render each dated reminder once in Calendar as a lightweight bell/check row without appointment status, duration, or collision behavior.
- Sync reminders through the signed-in account's private `Hub/Reminders` folder with dirty state, conflicts, tombstones, deletion, and account isolation.
- Migrate old `kind: "Reminder"` appointment records idempotently, retaining the old record until its standalone copy has synced safely.
- Preserve a reminder when its linked Contact is deleted, clear the Contact link, and keep note text when a linked reminder is deleted.
- Show a phone-only appointment identity once while retaining `Name · Phone` for named appointments.

## V0.9.4.92 PC pairing retained

- The Android foreground service polls the same Google account's hidden Drive app-data space, so the paired PC no longer depends on an open phone browser tab.
- A new PC shows a short-lived matching four-digit code on both screens before Android can approve it.
- Ask Every Time, 36 Hours, 7 Days and Until Disconnect trust modes are enforced on the phone; expired trust cannot silently reconnect.
- The active encrypted browser session survives a normal refresh, while session secrets remain tab-scoped and time-bounded.
- Trusted PCs can reconnect with a fresh ECDH/AES-GCM session, and approving another PC cleanly transfers the one active connection.
- Connected Devices shows the Android relay account, active PC, last-active/expiry details and controls to disconnect, forget one PC or revoke all PC access.
- The TEST APK uses a stable TEST-only signing certificate supplied through GitHub Actions secrets, so its Android OAuth registration remains consistent without exposing the private key.

## V0.9.4.91 workflow retained

- A saved customer name and phone number now share the first line of each Device conversation card.
- Phone-only contacts show their number once instead of repeating it as both the title and subtitle.
- The Customer category and appointment date, explicit AM/PM start–end range and booking status share the second line.
- Tapping anywhere in the conversation card—including its vehicle/buying summary—opens the chat. The appointment chip remains a separate Calendar shortcut.
- Creating an appointment restores the phone/browser's native calendar and clock pickers. Editing an existing appointment keeps the compact date-entry and saved-time menus.
- Appointment field 6 is now **End Time (optional)**. Older saved durations remain compatible and appear as their calculated end time.
- Calendar day appointments place the start–end range above the card so the vehicle/customer details use the full width in a shorter card.
- The compact, clickable Interested Vehicle card remains inside the upper-right Device-chat header beside the customer details. It includes the vehicle photo, year/make/model, stock, odometer, price and buying summary without consuming a separate row.
- Add Note has searchable structured fields for purchase method, total budget, bi-weekly goal, down payment, trade/no trade, expected trade value and Interested Vehicle. Cash / Financing is now a two-button choice with no text box.
- Recent incoming messages can show a temporary ⤴️ suggestion for a narrow contact field. Only the newest five messages qualify; a user must choose every value before it is retained.
- Appointment entry follows the nine-field workflow, accepts a free typed customer name, uses Tentative/Booked/Confirmed/Double Confirm states, and displays MM/DD/YYYY plus uppercase 12-hour AM/PM times.
- Device and LotKeys Chat use the same ＋ Camera/Images/Documents and 🎙️ Voice memo/Talk to text composer. Tap opens choices for five seconds; a 0.5-second hold captures the gesture and enables directional shortcuts without browser scrolling or text selection.
- Sent and received Chat media exposes a deliberate 💾 action to save a separate copy in the private Contact folder. A source key prevents accidental duplicate saves.
- The conversation action row is Notes, Questions, Call, Booking and Organize. Add to Hub is reduced to Start Chat/Group, Create Contact, Add Note, Upload and Reminder.
- The Device composer no longer shows the implementation explanation beneath the message box, and the Lock Screen now asks simply for the user's Lock Screen Password.
- The matching V0.9.5.02 Android connector retains MMS attachment reading and the reviewed default-messaging-app handoff.
- V0.9.4.86 grouping, reminders, PC-only LotKeys alert sounds, corrected logo crop and responsive floating controls remain in place.

## First checkpoint included

- The current LotKeys Hub is the conversation interface on both phone and computer.
- A small Android setup layer requests SMS/MMS, SMS-send, optional Contact Names and connection-status access without becoming the default messenger.
- The phone reads its current Android SMS/MMS conversation index and paged message history.
- Existing Android contact names appear when optional Contacts access is granted; LotKeys custom contact names still take precedence.
- A computer on the same authorized LotKeys Google account pairs with a short-lived matching four-digit code and phone approval.
- Session requests and message responses are end-to-end encrypted before entering short-lived files in Google Drive's hidden application-data area. Processed and expired frames are deleted.
- The computer can open phone history and submit a plain-text SMS through the phone.
- Outgoing messages show Sending, Sent or Failed. A failure never retries automatically.
- Coverage is honest: amber means SMS/MMS is live but RCS safety coverage is not enabled; red locks Device Messages when the phone is unavailable.
- Phone numbers can be sorted without creating a full LotKeys contact folder. The same number keeps its category paths after the phone conversation is removed.
- The four trust choices are present: Ask Every Time, 36 Hours, 7 Days and Until I Disconnect.

## Existing V0.9.4.83 behavior retained

- Home, Inventory, Listings, Garage, Account, Store, media uploads, Management Updates, awards and Posting Buddy V0.1.23.
- Internal LotKeys direct/group chat and calls remain a separate Hub source.
- Private contacts, notes, documents, questions and appointments remain in the user's private Account/Hub Drive boundary.
- Multiple category assignments, one nested subcategory level, combined filtering and category colours remain functional.
- Restore-first Account sync, Account Photo/Celebration Sound recovery and Description Builder template recovery remain intact.
- The approved TEST OAuth web client, restricted Picker API key and matching Cloud project fallback remain present.

## Intentional checkpoint limits

- Android first; no iPhone connection yet.
- SMS/MMS history and direct plain-SMS sending are included. Existing private RCS history, RCS send and the RCS Notification Safety Watcher are not included.
- Device media is a reviewed handoff to the default phone messaging app, not a claim of direct MMS delivery. The user verifies the recipient and presses Send on the phone; LotKeys never retries it automatically.
- Group conversations are view-only and dual-SIM selection is deferred.
- One active computer session plus the phone. Several trusted computer records can exist, but simultaneous multi-PC messaging is deferred.
- Android keeps the private pairing relay active through its visible low-priority foreground-service notification. Google or Android may still require the connector to be reopened after account revocation, force-stop, battery restrictions or a recoverable authorization prompt.
- This is private test software using sensitive Android permissions. It is not a Google Play production release and has not completed an independent security review.

## Android build

The source is under `android/`. GitHub Actions builds and lints it through **Build LotKeys Android Layer** and publishes the screen-recording-enabled APK artifact as `LotKeys-Android-V0.9.5.12` when the stable TEST signing secrets are configured. Install that artifact over the existing connector so its signing identity and Android permissions are preserved. V0.9.4.85 is not sufficient for this background-reconnect test. Blocking remains enforced inside LotKeys Hub; Android's existing messaging app remains responsible for phone-level blocking and notifications.

The Android setup uses five short screens:

1. Confirm the existing messaging app remains the default.
2. Allow required Messages access.
3. Optionally allow Contact Names.
4. Allow the quiet connection-status notification.
5. Choose the same LotKeys Google account for private background pairing, then open LotKeys once to link the phone browser.

No `device.json`, `hub.json`, Python relay, HTTPS tunnel, Bluetooth, screen casting, Accessibility permission or default-messenger switch is used.

## TEST pairing walkthrough

1. Build and install the V0.9.5.12 Android TEST connector from the GitHub Actions artifact. Confirm the setup heading reads **Phone Connection · V0.9.5.12 TEST**.
2. Complete its permission screens, choose the same LotKeys Google account, and tap **Open LotKeys & Link This Phone**.
3. Sign into the same LotKeys Google account on phone and computer.
4. Open Hub on both devices.
5. On the computer, select **Connect phone**.
6. Confirm the same four digits on the phone, choose the trust position and tap **Approve & Connect**.
7. Close the phone browser, then open a Device conversation on the PC and send a fictional test SMS. Test media separately and confirm that Android opens the default messaging app for final review.

## TEST deployment

GitHub Pages serves:

`https://mrmilo34.github.io/Lot-Keys-TEST/?build=095013`

Keep `CNAME` absent. This repository is TEST only; `lot-keys.ca` is not changed by this release.

Fully close and reopen the installed TEST web app once after deployment so the V0.9.5.13 service worker replaces the old cache. Do not clear browser/app data or reinstall the V0.9.5.12 connector; existing LotKeys, Hub, pairing, and Android account state should remain.
