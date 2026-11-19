# LotKeys TEST V0.9.5.28 — import template compatibility

Website layout recognition is cumulative. Legacy support adds recognition to the existing importer while preserving the earlier Go Auto-style price and gallery behavior. Future template changes should add representative regression examples and continue to pass all earlier examples.

## Correction and coverage

- V0.9.5.27 could mistake a separate **Weekly Payment** heading below **Your Price** for a payment unit belonging to that sale price. The check now distinguishes a new heading from an attached payment unit.
- **Your Price $59,500** followed by **Weekly Payment $125**, **Monthly Payment $500**, **Bi-weekly Payment $250**, or separate Weekly/Monthly headings remains a valid vehicle sale price.
- Actual units such as **$1,500 per month**, **$1,500 /mo**, or a separate **per month** unit still cannot become a sale price.
- Matching structured vehicle data keeps its prior ranking on other dealership domains. The existing gallery selection, high-resolution duplicate handling, logo/badge rejection and related-vehicle exclusions remain in place.
- Legacy-specific price priority remains confined to the Legacy website domains. Legacy Price is the sale amount; Vehicle Price is the sticker/listed amount. Missing, mismatched or rejected sale prices are not replaced by sticker metadata.

## Compatibility and identifiers

- Web version: `0.9.5.28`, build `095028`, release `import-template-compatibility`.
- Service worker cache: `lotkeys-app-v095028-import-template-compatibility`.
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095028`.
- Android connector: `0.9.5.12`; Store Processor: `0.9.4.76`. This is a web update.

The Go Auto-style fixtures are synthetic examples of existing parser formats, not new live-page captures. They validate compatibility alongside the Legacy screenshot fixture. A full import from a live dealership page still needs browser verification.
