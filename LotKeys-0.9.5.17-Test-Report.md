# LotKeys V0.9.5.17 test report

## Scope

- Device toolbar order: Notes, Questions, Call, Media, Booking, Organize
- Shared high-contrast Organize styling across Hub surfaces and themes
- Fixed right-side Device and LotKeys chat action rails on PC
- Message-space reservation beside the Device rail
- PC Enter-to-send and Shift+Enter line breaks in both chat composers
- V0.9.5.16 message, MMS, history, and reconnection regressions
- Android source unchanged from V0.9.5.12

## Automated checks

- JavaScript syntax validation for every first-party script
- Node test suite: **93 passed, 0 failed**
- Release-contract coverage for final Device action order, Organize class coverage, desktop rail layout, message-space reservation, PC-only keyboard detection, composition/repeat protection, Device form submission, and internal attachment sending
- Existing core-model coverage for message sorting, progressive history, live refresh, media retention, phone trust, and reconnection
- Release checksum verification
- Git whitespace validation

## Manual acceptance checks

1. Open a Device chat and confirm the actions read Notes, Questions, Call, Media, Booking, Organize on both phone and PC.
2. Switch between light and dark themes and confirm every Hub Organize action uses the inverted high-contrast style.
3. On PC, confirm Device and LotKeys chat actions dock vertically on the right without covering messages; on phone, confirm the horizontal toolbar remains.
4. In each PC composer, use Shift+Enter to create a multi-line draft and Enter to send it exactly once.
5. On a phone, confirm the touch keyboard continues to insert/send according to its existing controls rather than adopting the PC shortcut.
6. Confirm live replies, progressive history, live MMS photos, retained Media copies, and trusted phone reconnection still work.

## Compatibility

- Web version: `0.9.5.17`
- Build: `095017`
- Android connector: `0.9.5.12-test` (unchanged)
- APK reinstall required: **No**
