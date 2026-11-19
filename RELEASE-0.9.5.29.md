# LotKeys TEST V0.9.5.29 — expanded dealership recognition

The Legacy Nautilus layout exposed a short metadata title, bulleted specifications, thumbnail-only gallery links, and recommended vehicles with separate prices. Recognition now handles those formats while retaining the earlier Go Auto-style and Grand Wagoneer examples.

## Resulting behavior

- Prefer the primary vehicle heading over a shorter metadata title, preserving the trim: **2024 Lincoln Nautilus Reserve**.
- Read bullet-prefixed specification labels, including stock, VIN, kilometres, exterior colour, body style, transmission and fuel.
- Stop target-vehicle price and availability checks at a standalone related-vehicle section after the main vehicle has been identified. An earlier navigation label alone does not truncate the vehicle facts.
- Resolve the known AutoScout24 listing-image resize path to its original image URL, then run the existing image probing, duplicate filtering and gallery review. Other image hosts keep their previous behavior.
- Permit a probed primary gallery at the standard **800 × 600** original size to be recommended. Gallery selection still requires matching dimensions, multiple images and a primary-page position.
- Use the existing rendered-page reader if a Legacy page returns a successful JavaScript shell without a vehicle heading.
- Retain Legacy Price as the sale price. Vehicle Price, financing payments and related-vehicle prices cannot replace it.
- Keep CARFAX report URLs specific to each vehicle. A **Request Carfax Report** button is not a vehicle history report link and does not establish accident or ownership history.

## Checked example

The exact [Nautilus listing](https://www.legacydodgewetaskiwin.com/vehicles/2024/lincoln/nautilus/wetaskiwin/ab/71216856/?sale_class=used) was retrieved on October 8, 2026. Its rendered content and embedded vehicle data agreed on:

| Field | Value |
| --- | --- |
| Vehicle | 2024 Lincoln Nautilus Reserve |
| Legacy Price | $55,990 |
| Stock | BT2550 |
| VIN | 5LMPJ8KA5RJ825421 |
| Kilometres | 38,366 |
| Exterior / body | White / SUV |
| Transmission / fuel | 8-Speed Automatic / Gas |

The page currently exposes **Request Carfax Report**, without Blair's supplied VHR URL. The parser accepts the supplied report URL when provided explicitly; it is not hardcoded into production recognition. Report contents were not independently verified.

## Compatibility and identifiers

- Web version: `0.9.5.29`, build `095029`, release `expanded-dealership-recognition`.
- Service worker cache: `lotkeys-app-v095029-expanded-dealership-recognition`.
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095029`.
- Android connector: `0.9.5.12`; Store Processor: `0.9.4.76`. This is a web update.

The regression fixture is a minimized transcription of the live rendered Nautilus page; narrative copy is omitted. Previous Go Auto examples remain synthetic parser fixtures, and the Grand Wagoneer fixture remains based on Blair's screenshot. A signed-in browser import and Drive save were not exercised in this verification.
