# TEST .45 — single-install Android readiness

Candidate based on released .44; production stays at the independently verified
.81 repository/deployment. Preserve .43 as the phone-confirmed upload fallback.

The existing Android installation opens the complete LotKeys web experience
and exposes contextual native phone/upload settings. It keeps the existing
package, launcher component, native permissions, trusted PCs and transfer files.
It uses the same browser origin and pins the browser provider after first launch.
No local data is imported, reset or silently moved between browsers. A second
PWA installation is optional. Custom Tab browser chrome remains in this build.

Readiness now requires a valid committed receipt, matching context, all original
bytes or confirmed Drive results, exact destinations and the finishing plan.
The receipt is saved locally before advice to switch apps. Timing appears in the
Vehicle Profile. Ten of eleven new behavior checks failed on .44; all eleven pass
with the guard. No measured phone timing or locked-screen success is claimed.

Android targets API 36 and adds a non-debuggable release APK/AAB build. Privacy
information now describes the current six-message/ten-conversation cache and
native retained originals. A manual account-deletion request page is reachable
from LotKeys and the privacy page; public review remains required.

No Drive layout, official Inventory permissions, personal Listings/Hub ownership,
Processor, outgoing MMS review, SMS deduplication, pairing, idle policy, extension,
backend or Firebase configuration is changed. Existing Google services remain.

Validation: 404 Node tests and 46 native Robolectric tests pass in CI. Debug and
release assembly/bundle/lint succeeded. The recovered release APK is signed with
the original TEST key and independently verified against .44; its checksum is
in downloads. Physical-phone .45 upgrade, upload timing, retry, app switching,
screen locking and PC relay tests remain pending. Preserve Blair's observed .44
retry/resynchronization improvement. See LotKeys-0.9.5.45-Test-Report.md.
