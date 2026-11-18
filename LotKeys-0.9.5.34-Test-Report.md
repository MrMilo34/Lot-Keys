# LotKeys V0.9.5.34 / Posting Buddy V0.1.24 — verification

**211 Node tests pass**, including 19 checks against the JavaScript read directly from the shipped V0.1.24 ZIP and a Garage download/version check. The prior 191 checks retain Inventory workspace recovery, personal listing storage, messaging and vehicle import coverage.

The actual extension reader was exercised with two differently named Listings sharing one Vehicle Profile. Both retain their saved titles. The actual Facebook fill/retry functions and native input setter were exercised using simulated input controls: new posts use the saved name, Details updates replace old wording, and Model/price/description retries preserve update behavior without an out-of-scope variable. Unchecked Details do not touch Model.

Cases cover custom punctuation, Unicode, trim wording, titles without a Year/Make prefix, multiword makes, different years, similar make names, matching words later in the title, blank legacy names and prefix-only names. Only an exact leading Year/Make pair is stripped; the remaining text is not replaced with Profile wording. The saved Listing and Vehicle Profile objects are not mutated.

The packaged permissions and host permissions are identical to V0.1.23. Icons, vehicle placeholder, side-panel CSS and side-panel JavaScript are byte-identical. The extension manifest, runtime/ping version and visible version are consistently V0.1.24, and the TEST download pointer and bundled version match the supplied archive. JavaScript syntax is checked for the extension, web files and executable inline scripts.

These are code and simulated-control tests. No user's Facebook listing was edited or published, and this record does not claim a signed-in Facebook end-to-end test. Chrome must load the updated unpacked extension files for the fix to take effect.
