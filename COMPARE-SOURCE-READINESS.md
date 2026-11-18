# Compare source readiness — reviewed 2026-11-14

The candidate compares manually entered or authorized imported rows. Opening a
source URL does not retrieve its listings. No marketplace scraping, feed
subscription, credentials, Google scope change or paid infrastructure was added.

| Source | Verified documented capability | Candidate status / remaining requirement |
| --- | --- | --- |
| AutoTrader.ca | Public terms prohibit automated access and collection. Commercial agreements may have additional terms. | Open/manual preset only. No automated adapter or approved commercial data agreement established. |
| CarGurus | Official Car Selector API lists makes/models and constructs a redirect to its own search page. That documentation does not return comparable listing rows. Canadian terms restrict systematic extraction and reuse. | Open/manual preset only. Canadian integration and appropriate listing-data access are unverified. A redirect is not an in-app comparison feed. |
| Dealership website | The existing exact-vehicle importer is preserved. Its existence does not establish permission or capability for inventory-wide collection. | Manual/import preset. Evaluate each supplied site/feed, permission, pagination, fields, robots/access rules, freshness and browser compatibility before adding an adapter. |
| MarketCheck | Its documented active inventory API covers US and Canada with VIN, price, mileage, specification, sorting and pagination. Canada requires country=ca; documentation gives country-specific currency conventions. | A possible authorized API path to evaluate. No account/key, commercial redistribution rights, price or usable entitlement has been established. No integration or signup performed. |
| OmniaAuto | Its published Canadian API documentation describes listings, VIN, body/trim, price, mileage, filtering and pagination. Published API plans include a prepaid Starter tier. | A possible feed/API path to evaluate, not a vendor endorsement. No account/key, source coverage, original listing links/stock availability, licensing for a shared public app, CORS or terms acceptance was verified. No purchase or integration performed. |

Primary sources:

- https://www.autotrader.ca/company/terms-of-use/
- https://www.cargurus.ca/about/terms-of-use
- https://www.cargurus.com/Cars/developers/docs/CarSelector.html
- https://docs.marketcheck.com/docs/api/cars/inventory/introduction
- https://docs.marketcheck.com/docs/api/cars/inventory/inventory-search
- https://omniaauto.ca/docs
- https://omniaauto.ca/api

Prices and entitlements can change. A public marketing price is not an agreed
LotKeys cost or a license to redistribute rows. Do not embed a provider secret in
the public GitHub Pages JavaScript or create credentials silently. Any automated
path needs an appropriate access arrangement, bounded usage/costs, source
attribution and a secure transport before being presented as working.

Matching in this candidate uses supplied facts only: known make/model/generation/
body conflicts are excluded but retained for review; different trims remain
included with equipment/price differences labelled, and missing fields remain
possible matches. Same-year or nearby-year vehicles do not establish a generation.
Cheaper and higher prices are retained without an invented percentage cutoff.
