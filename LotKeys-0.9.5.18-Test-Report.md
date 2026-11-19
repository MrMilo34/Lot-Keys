# LotKeys V0.9.5.18 test report

## Scope

- Two-line Device contact name and compact header height
- Removal of the Device card's SMS/MMS status line
- Trusted computer nicknames on the phone, including reset and forget
- V0.9.5.17 Hub actions and V0.9.5.16 message/history regressions
- Android source and installed V0.9.5.12 connector unchanged

## Automated checks

- JavaScript syntax validation for first-party scripts
- Node test suite: **93 passed, 0 failed**
- Release checksum verification and Git whitespace validation

## Device acceptance checks

1. Open a Device conversation with a long contact name and an Interested Vehicle card on a narrow phone. Confirm two name lines, the number beneath, and no SMS/MMS status in that card.
2. On the phone, open **Phone connection → 🖥️ Connected**, rename a trusted PC, close and reopen LotKeys, and confirm the label remains. Clear it to restore the browser label; forget the PC to remove its name.
3. Confirm the six action buttons still appear in the requested order on phone and PC, with Organize inverted in both themes.
4. Confirm existing SMS/MMS previews, saved Media, older message loading, and trusted reconnection on the actual paired devices.

The automated suite does not exercise a live paired phone or measure the rendered card in Blair's Android browser. Those checks remain for device testing.
