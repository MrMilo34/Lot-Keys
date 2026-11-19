# LotKeys TEST V0.9.5.35 verification

- 237 Node tests passed, including 26 new personal preference tests.
- Tested template changes with unchanged counts, local migration, unrelated remote changes, default choice, deletion recovery protection and failed recovery-file upload.
- Tested built-in, silent and custom PC sound backup/restore, private audio file references, duration/type/size constraints and unavailable audio recovery.
- Tested offline retry, failed readback, missing Account.json, wrong-account rejection, edits during upload, and the real Account queue and restore functions.
- JavaScript syntax passed for 11 root scripts and 8 executable inline scripts; shipped extension and previous regression checks retained.
- All 174 source baseline files matched the published V0.9.5.34 Git tree before editing.

Live Drive inspection found the existing Account.json and Description Templates folder. Their saved template copy was older and Account.json had no PC notification settings. No private account values were committed or edited by this release task. Latest unsynced settings live in the user's original browser and must be picked up when that browser opens the update. Browser playback and real-device migration remain user-environment checks; automated tests use simulated Drive storage.
