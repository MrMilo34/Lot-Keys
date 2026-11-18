# LotKeys TEST V0.9.5.35

Description Builder saves no longer report Drive success when an unrelated Account.json baseline guard rejects the write. Templates and their selected default use a separate, verified preference patch that preserves other account sections. The personal Description Templates recovery files are updated as part of the save. Deleted templates leave a durable tombstone so recovery cannot recreate them.

PC notification selection and custom audio are now personal account preferences. Custom clips upload privately to Notification Sounds beneath the existing personal Account Storage folder. Account.json stores the selection and audio file metadata; a fresh PC restores the clip. Android LotKeys Chat stays silent. No new Drive sharing or permissions are introduced.

Newer local template edits are detected by ID and update time even when local and remote counts match. Legacy browser-only PC sounds are queued for their first backup. Account and sound dialogs distinguish a local save with a pending backup from verified Drive success. Pending preferences retry on reconnect, foreground resume, every five minutes while open, and through Retry Drive backup in Account.

All Account loads and writes share one queue. A later local edit is not cleared by an earlier save finishing. Preference writes re-read Account.json after asset preparation, patch only changed sections, and verify readback before clearing retry state. The general Account restore-before-write guard remains.

## Use

Open this update on the PC/browser containing your latest templates and custom sound, while signed into your usual Google account. Its retained local settings can then upload to your existing personal folder. In Account, look for Personal templates & PC sounds. If backup remains pending, its error and Retry Drive backup action are shown. Avoid forcing an older Drive restore before that first backup finishes.

Posting Buddy V0.1.24, Android connector V0.9.5.12, Store Processor V0.9.4.76, dealership imports, messaging transport, saved Listings and Vehicle Profiles are retained. This is a TEST web update; no Apps Script installation is required.
