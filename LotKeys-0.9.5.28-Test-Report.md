# LotKeys TEST V0.9.5.28 — verification

- `node --test tests/*.test.js`: 117 tests across eight test files passed.
- Eighteen importer tests cover Legacy recognition and the established Go Auto-style sale-price, structured-data and gallery behavior together.
- Direct comparison with the verified V0.9.5.26 parser confirmed the reported payment-heading case was a V0.9.5.27 regression. The fix restores the previous result while keeping Legacy recognition.
- Payment-heading variants preserve **Your Price $59,500**. Actual payment-unit variants remain excluded.
- The existing gallery fixture keeps large vehicle photos, removes their smaller duplicates, rejects logo/CARFAX badge images and excludes similar vehicles.
- JavaScript syntax checks passed for eight inline scripts and nine top-level JavaScript files.
- `git diff --check` passed. Runtime, manifest, install registration and service worker use build `095028`.
- Android connector, Store Processor, personal data, Store switching and Hub source logic are retained from the preceding release.
- The full package checksum manifest covers every release file except itself, and the package excludes local Git metadata.

Go Auto-style tests use synthetic parser examples, and Legacy tests use Blair's screenshot transcription. Neither constitutes a complete live dealership import. Live page retrieval, signed-in Drive saving, gallery ordering and CARFAX report contents remain unverified in this environment.
