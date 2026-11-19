# LotKeys TEST V0.9.5.27 — Legacy listing import

Imports from Legacy Dodge Wetaskiwin now use the displayed **Legacy Price** as the selling price. **Vehicle Price** is the sticker/listed price. For the supplied Grand Wagoneer example, the expected sale price is **$70,990**, rather than the **$79,507** sticker amount, the **$8,517** discount, or a weekly/biweekly payment.

## Changes

- On `legacydodgewetaskiwin.com` and `.ca`, an explicit Legacy Price outranks structured sticker metadata. Missing or recently rejected sale prices do not fall back to sticker metadata. Multiple different Legacy Prices remain ambiguous and require review.
- Existing-vehicle checks still require the expected vehicle identity. Other dealership domains retain their previous price ranking. Call for Price remains a separate status.
- Weekly, biweekly and monthly payments are removed from vehicle-heading model names while model hyphens, such as `F-150`, are preserved.
- Kilometres with a colon-separated label are recognized. The supplied example is 39,446 km.
- CARFAX report URLs are captured from View Report links, button URL attributes, escaped page data and reader output. Each listing supplies its own report. Badge images, trade-in links and lookalike domains are rejected; report findings are not inferred from the URL.

## Compatibility and identifiers

- Web version: `0.9.5.27`, build `095027`, release `legacy-listing-import`.
- Service worker cache: `lotkeys-app-v095027-legacy-listing-import`.
- Android connector: `0.9.5.12`; Store Processor: `0.9.4.76`. This update requires no APK or Apps Script reinstall.
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095027`.
- Previous Store switching, disconnect recovery, Hub, phone and personal account behavior remain in the release.

## Verification limits

Automated tests use the supplied screenshot transcription and mocked page-fetch paths. The dealership page and CARFAX report were unavailable to this environment, so this release does not claim a completed live import, gallery verification or a review of CARFAX report contents. The final live-site check is to import the supplied URL in TEST and confirm the sale price, vehicle details, photos and report link before saving.
