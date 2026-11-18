# LotKeys TEST V0.9.5.30 — website description and gallery recovery

The Nautilus import read specifications but missed its description because Legacy labels that copy **Overview**. A later reader response also returned the vehicle text without any gallery links. The importer now recognizes the description heading and refreshes that incomplete gallery instead of silently treating it as a complete import.

## Resulting behavior

- Recognize **Vehicle details**, **Description** and **Overview** sections in both rendered Markdown and plain text. Bound the imported description before separate options, pricing and location sections.
- Prefer a real vehicle description section over generic page metadata. Retain metadata as a fallback when no descriptive section is available.
- Pass the overview into Description Builder, read bulleted engine/drivetrain specifications, and preserve decimal values such as **2.0L** when producing a concise overview.
- Retain existing Profile wording and price in Description Builder. Equipment suggestions remain subject to the existing user review.
- If a Legacy reader response omits the gallery, request a fresh rendering and wait for the listing images. The existing exact-URL reader is reused; no new service or deployment is required.
- A readable direct page can obtain a missing gallery from the reader while retaining its directly read price.
- Allow the known original gallery CDN more time for image probing. Compare those images directly when available, retain the proxy fallback, reuse available immutable image bytes, and keep deadlines active until image bytes have finished downloading.
- Keep distinct originals at the same resolution when their small visual hashes look similar. Existing thumbnail deduplication and lower-resolution duplicate removal remain available.
- If the gallery still cannot be obtained, keep the vehicle information already read and show a retry message.

## Live verification and photo count

The exact [Nautilus listing](https://www.legacydodgewetaskiwin.com/vehicles/2024/lincoln/nautilus/wetaskiwin/ab/71216856/?sale_class=used) was checked again during this release review. The full rendered response now produces a 2,434-character overview, **Nautilus Reserve**, **$55,990**, the **2.0L 4 Cylinder Engine**, and **All Wheel Drive** supplementary information.

Blair reports 20 visible photos. The current embedded gallery contains 34 distinct original image entries; all 34 were downloaded and decoded as 800 × 600 PNGs with browser-readable CORS headers. A rendered response initially omitted those image links. A fresh response that waited for the gallery returned them. The importer follows the gallery returned by the exact listing and does not impose a 20-photo limit.

The regression fixture uses observed headings and vehicle facts with our own short descriptive wording, rather than reproducing the dealership's marketing copy. A separate 20-image scenario confirms that every image returned by that gallery remains in order.

## Existing Vehicle Profiles

Open the Nautilus Vehicle Profile for editing, import its website again, select **Description** and the photos to add, choose **Apply Selected**, then save the Profile. Refreshing the app alone does not rewrite an existing saved description or import photos into it. Photos with an already-saved matching source URL keep the existing duplicate guard.

## Compatibility and identifiers

- Web version: `0.9.5.30`, build `095030`, release `website-description-gallery-recovery`.
- Service worker cache: `lotkeys-app-v095030-website-description-gallery-recovery`.
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095030`.
- Android connector: `0.9.5.12`; Store Processor: `0.9.4.76`. No APK or Apps Script reinstall is needed.

Earlier Go Auto-style prices, structured vehicle data, Legacy Price priority, Grand Wagoneer recognition and exact CARFAX links remain covered. CARFAX report contents and a signed-in Drive save were not verified during this review.
