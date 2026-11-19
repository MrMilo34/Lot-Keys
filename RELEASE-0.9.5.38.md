# LotKeys TEST V0.9.5.38 — Recent Device conversation cache

While the phone is connected, LotKeys keeps the newest six messages ready for
the ten most recent unblocked Device conversations. Warming no longer depends
on keeping Hub home open. A cached chat paints its recent messages while a
fresh phone page is requested when needed; older history continues through the
existing progressive loading controls.

Background pages are fetched one at a time with a yield before the next read.
Outstanding foreground history takes priority over starting another background
read. Unchanged warm conversations are reused; new arrivals update the recent
ten. Each failed conversation has its own retry backoff, so it cannot prevent
the remaining conversations from warming. The first fill still depends on the
existing phone/Drive relay; a never-warmed chat can still need a network read.

Only six message snapshots per recent conversation remain in the shared cache;
the active chat can retain its existing full page and older-message buffer.
The retained six keep the native timestamp/sort cursor, including equal-time
messages, so loading older history does not skip discarded messages. Image and
video bytes are not prefetched. Temporary attachment preview bytes are omitted
from snapshots. Read/unread acknowledgements are not issued by warming.

Snapshots refresh before the existing five-minute expiry and clear on disconnect,
account changes and page closure. Late old-session responses cannot refill a
cleared cache. Hidden or locked pages do not start background warming.

AGENTS.md and CURRENT-STATE.md provide a compact continuation reference to avoid
repeated whole-project/history reads and accidental use of superseded storage
documentation. This does not claim to fix an internal ChatGPT platform fault.

## Install and compatibility

Refresh TEST and confirm V0.9.5.38. Keep Android connector V0.9.5.12 and Posting
Buddy V0.1.24 installed. Processor V0.9.4.77 and correctly configured .76 remain
compatible. No APK or Apps Script reinstall is required for this web release.
All .37 Store isolation and earlier import, upload, personal settings, Hub and
messaging behavior remain.

## Doorbell setup remains pending

The supplied Firebase files register Enigma only. LotKeys still needs an Android
Firebase entry for `ca.lotkeys.connector.test`, native FCM implementation and a
secure no-billing sender deployment, followed by real locked-phone tests.
This release leaves the working reconnect/relay unchanged and does not activate
push-to-wake or billing. See PHONE-WAKE-STATUS.md.
