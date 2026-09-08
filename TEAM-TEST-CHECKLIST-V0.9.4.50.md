# LotKeys V0.9.4.50 team-test checklist

Use approved Google OAuth test accounts and non-sensitive dealership test data. Test on both a phone and a PC before replacing the current team build.

## 1. Clean start and installation

- Open `https://lot-keys.ca/?build=09450` in a private/incognito window after DNS and GitHub Pages are active.
- Confirm the first-run guide offers Google sign-in, automatic Lot-Keys Account setup, Store Code connection, and phone installation.
- Open `https://lot-keys.ca/install.html` and install LotKeys from Chrome/Safari's supported install or Home Screen action.
- Confirm the new LotKeys icon appears in the browser, installed app, loading view, Chat, and Post Buddy.

## 2. Account and Store connection

- Sign in using an account on the Google OAuth Test-user list.
- Confirm LotKeys automatically creates or restores `Lot-Keys Account/Account.json` in that user's My Drive.
- Connect with Store Code `INF-SE034` and confirm it resolves to Infiniti South Edmonton only when that Google account has Drive permission.
- Close and reopen LotKeys; confirm Account, appearance, Awards, personal posting locations, and saved Store restore correctly.
- Confirm an unapproved Google account receives a clear test-user message and an account without Store Drive permission is not admitted by knowing the Store Code.

## 3. Chat on two test accounts

- Open LotKeys on both accounts and leave it open for several minutes.
- Tap Chat and confirm cached conversations appear immediately without Home, Inventory, or Vehicle cards showing through.
- Confirm Chat remains highlighted in the bottom navigation and Call / ＋ sit immediately above that navigation.
- Send direct messages in both directions and confirm the other open app collects them without repeatedly reopening Chat.
- Press and hold Chat: confirm the 💭 cue appears, then the most recent conversation opens in Bubble Mode.
- Use ＋ and verify Add Contact accepts either the user's exact registered email address or optional phone number.
- Create a Group Chat, temporary Group Call, and Permanent Group Call. Test owner/admin member controls, personal mute, and personal block.
- Move a user out of the current Store and confirm an existing conversation remains visible while new cross-Store delivery stays unavailable in this test architecture.

## 4. Awards and Lot-Lvl

- Create a first Vehicle Profile and confirm New Kid on the Lot is granted once.
- Record unique Facebook-assisted sales and confirm the 1st/10th milestones and the two-sales-in-one-day Cherry's review request.
- Run Monthly Wrap-Up history through Admin testing and confirm repeatable Gold/Silver/Bronze totals, first-podium Awards, consecutive-win Awards, and last-place recognition do not duplicate on a second recalculation.
- Simulate an established account returning after 30 inactive days; confirm Iced Iced Baby appears. Confirm it clears after five consecutive active days.
- On Account, choose a new Primary Award and confirm its small artwork appears before the user's name immediately.
- Select five displayed Awards and drag the full tiles to reorder them on both touch and mouse. A press-and-hold must not open the browser context menu.
- Confirm only `blairk34@live.com` can approve the LotKeys Developer Award in this team build.

## 5. Lock Screen

- Set a 4-digit PIN, press Lock Screen, enter a wrong PIN, then enter the correct PIN.
- Refresh while locked and confirm the blurred LotKeys lock surface returns.
- Test None / PC Only / Phone Only / PC & Phone idle targets and at least two idle durations.
- Remember: this is local walk-away privacy, not a replacement for the device or Google account lock.

## 6. Listings and Garage

- Press Build Description once and confirm it builds without an approval step.
- Expand Show Vehicle Details, edit a source value, disable another with the checkbox on its left, and rebuild.
- Open an existing Vehicle Profile and confirm its photo review resembles the compact Posting Assistant grid rather than full-width images.
- Confirm My Saved Posting Locations and FaceBook Listings Analytics appear directly below Administrator & Users.
- As Admin Level 2, confirm Store Saved Locations and highlighted reveal controls appear inside Advanced Google / Store controls.
- Confirm Awards Administration appears before User Reports.

## 7. Facebook Post Buddy V0.1.13

- Download the stable `extension/releases/LotKeys-Facebook-Assistant-Latest.zip` link from LotKeys and unzip it.
- In desktop Chrome, open `chrome://extensions`, enable Developer mode, choose Load unpacked, and select the unzipped Post Buddy folder.
- Open LotKeys and Facebook Marketplace in separate tabs. Confirm the Post Buddy side panel reads the current LotKeys Listing and fills supported fields without pressing Facebook's final Next or Publish action.
- Confirm the same extension recognizes `lot-keys.ca`, `www.lot-keys.ca`, and the previous GitHub Pages URL during the transition.

## Known release gates

- Real Google sign-in, Drive sharing, two-account delivery, browser media permissions, and Facebook's live form must be verified manually with the team's approved accounts.
- Public/global Chat, server-enforced Admin/Creator authority, reliable closed-app notifications, production call signalling/TURN, and production Google OAuth verification remain release-gate work described in `SECURITY-RELEASE-GATE.md`.
- Several newly supplied Award files contain JPEG artwork under `.png` filenames and have opaque dark backgrounds in the source pixels. They are included as supplied for this visual test; replace them later with true alpha-background exports if the dark box is visible in the app.
