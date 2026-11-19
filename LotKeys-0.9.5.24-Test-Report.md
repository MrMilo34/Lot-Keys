# LotKeys TEST V0.9.5.24 — verification

- JavaScript syntax checks passed for Hub, Messaging, Phone and service worker.
- `node --test tests/*.test.js`: **94 passed, 0 failed**. The reminder-state check confirms completed reminders do not count as active; the Hub shortcut remains available and uses that state to grey its bell and button.
- `git diff --check` passed.
- Source checks confirmed the always-visible Hub shortcut, inactive grey styling, click access to all reminders, and smaller desktop and phone glyph sizes.
- The web release and service worker use build `095024`; Android remains V0.9.5.12.

A phone and PC visual check remains to confirm the Hub button greys out after the last active reminder is completed, remains tappable, and regains color when one becomes active.
