# LotKeys V0.9.5.34 — Posting Buddy listing names

Garage now supplies **Posting Buddy V0.1.24**. The extension already displayed the saved Listing title, but Facebook filling sent the separate Model field, which could still contain Vehicle Profile wording. The Facebook Model input now derives its value from the saved Listing title. It removes only a matching leading Year/Make pair because the editor fills those in separate controls; the remaining custom wording, punctuation and trim details are preserved. The Listing and Vehicle Profile records are not renamed.

New posts, selective Details updates and Model retries share that rule. Unchecked Details do not alter the name. Unnamed legacy records retain the existing model fallback. A name consisting only of Year/Make asks for manual Model completion rather than inventing Profile wording. Retry handling also now derives its own update mode instead of referencing a variable outside its scope.

The extension's permissions, side-panel behavior, photos, videos, pricing, descriptions and manual final Publish/Save controls remain. The prior V0.1.23 archive is retained. Web release V0.9.5.34 updates the bundled download and release pointer on TEST; production is not changed. Android V0.9.5.12 and Store Processor V0.9.4.76 are unchanged.

## Install

Download Posting Buddy V0.1.24 from Garage or the supplied extension ZIP. Extract it and replace the files in the existing unpacked extension folder. Open `chrome://extensions`, reload LotKeys Facebook Assistant, reload Facebook, and press **Sync** in Posting Buddy. For a new installation, use **Load unpacked** and select the extracted folder containing manifest.json. A website refresh alone does not replace the installed Chrome extension.

Review the filled Facebook fields before the final Publish/Save action. See [verification](LotKeys-0.9.5.34-Test-Report.md).
