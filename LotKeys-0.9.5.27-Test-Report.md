# LotKeys TEST V0.9.5.27 — verification

## Automated checks

- `node --test tests/*.test.js`: 114 tests across eight test files passed.
- Fifteen new importer checks cover the screenshot vehicle facts, Legacy sale versus sticker metadata, new imports, mismatched stock, competing sale prices, payment/discount exclusion, recent wrong-price feedback, missing sale price, domain restrictions, Call for Price, model hyphens, exact CARFAX queries, escaped links, asset rejection and the reader fallback path.
- JavaScript syntax checks passed for all eight inline scripts and all nine top-level JavaScript sources, including the service worker.
- `git diff --check` passed.
- Runtime, manifest, install registration, release metadata and service worker use build `095027`.
- Android V0.9.5.12 and Store Processor V0.9.4.76 source are unchanged from the verified V0.9.5.26 baseline.
- The package checksum manifest covers every release file except itself. The package excludes local Git metadata and temporary working files.

## Sample expectations

| Field | Expected value |
| --- | --- |
| Vehicle | 2023 Jeep Grand Wagoneer Series II |
| Stock | BT2556 |
| Sale price — Legacy Price | $70,990 |
| Sticker/listed — Vehicle Price | $79,507; not imported as the sale price |
| Odometer | 39,446 km |
| CARFAX | Exact supplied View Report URL, including its case-sensitive ID |

The fixture is transcribed from Blair's screenshot, not downloaded from the live dealership page. Page retrieval is mocked in the reader test. Live dealership retrieval, gallery ordering, signed-in browser/Drive saving and CARFAX report contents remain unverified in this environment.
