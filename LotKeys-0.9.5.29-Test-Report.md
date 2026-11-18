# LotKeys TEST V0.9.5.29 — verification

- `node --test tests/*.test.js`: 127 tests across eight test files passed.
- Twenty-eight importer tests cover the Nautilus layout, Legacy sale-price priority, exact vehicle report links, and earlier Go Auto-style price, structured-data and gallery behavior together.
- Retrieved the exact live Nautilus HTML and its rendered reader content. Parsing the full rendered response confirmed **Nautilus Reserve**, **$55,990**, **BT2550**, **38,366 km**, and the other listed specifications.
- Separate tests confirm that recommended-vehicle prices and Call for Price text cannot contaminate the target vehicle, and a Recently Viewed navigation label cannot truncate it.
- Gallery tests cover thumbnail-to-original normalization, original/thumbnail deduplication, source-page placeholders, unrelated image hosts, gallery filtering and the standard 800 × 600 original size.
- The rendered response contained 34 distinct original vehicle photo URLs. One original URL was independently fetched and confirmed as an 800 × 600 PNG. The remaining photos were not individually downloaded or dimension-checked during this release review; the browser's existing probing remains responsible for that on import.
- Mocked retrieval tests cover a successful HTTP 200 JavaScript shell falling back to rendered content and a readable direct Legacy page retaining the direct path.
- The supplied CARFAX URL returned a JavaScript report shell. The dealership page did not embed that URL and showed Request Carfax Report. The parser preserves the explicitly supplied URL; report identity, accident history and ownership contents remain unverified.
- JavaScript syntax checks passed for eight inline scripts and nine top-level JavaScript files.
- `git diff --check` passed. Runtime, manifest, install registration and service worker consistently use build `095029`.
- Android connector, Store Processor, personal data, Store switching and Hub source logic are retained from V0.9.5.28.
- The checksum manifest covers every release file except itself. The full package excludes local Git metadata and was compared byte-for-byte with the release source.

Live retrieval and parser checks establish recognition of this page's content. They do not establish a complete signed-in browser import, saved Drive record, downloaded full gallery or CARFAX report contents.
