# LotKeys V0.9.5.15 test report

## Scope

- On-demand MMS image preview inside Device conversations
- Explicit save-versus-preview separation
- Device-chat **💾 Media** shortcut
- Saved Photos/Documents grouping
- V0.9.5.14 progressive-history and live-refresh regression coverage
- Android source unchanged from V0.9.5.12

## Automated checks

- JavaScript syntax validation for all first-party scripts
- Node test suite: **91 passed, 0 failed**
- Release-contract coverage for transient preview controls, URL cleanup, six-button Device actions, and Photos/Documents grouping
- Core-model coverage for MIME- and filename-based photo classification
- Release checksum verification
- Git whitespace validation

## Manual acceptance checks

1. Open a Device conversation containing a supported MMS image.
2. Confirm the message shows **View photo** and that the contact's Media folder has not changed.
3. Tap **View photo** and confirm the image appears inline; tap the image to open the larger temporary preview.
4. Leave and reopen the conversation without saving. Confirm the image must be requested again.
5. Press the attachment's **💾** control and confirm one retained copy appears in **💾 Media → Photos**.
6. Open the chat-toolbar **💾 Media** shortcut and confirm images and non-images appear under separate headings.
7. Confirm new replies, newest-six-first history, older-message chunks, drafts, queued attachments, and reconnection still behave as in V0.9.5.14.

## Compatibility

- Web version: `0.9.5.15`
- Build: `095015`
- Android connector: `0.9.5.12-test` (unchanged)
- APK reinstall required: **No**
