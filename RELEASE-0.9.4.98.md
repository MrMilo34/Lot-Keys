# LotKeys V0.9.4.98 — Hub refresh change-detection hotfix

Released for controlled team testing on 2026-09-25.

## Fixed

- The three-second Android connection monitor still checks promptly but no longer dispatches duplicate status events when its public state is unchanged.
- Phone-status changes update only the Hub connection indicator instead of rebuilding every Device conversation card.
- Refreshed thread snapshots are compared before Hub is notified, so identical message data causes no list repaint.
- A real Android message revision refreshes the current thread index in place rather than clearing the visible list before new rows arrive.

## Preserved

- V0.9.4.97 linked Vehicle Profile thumbnails and the correct placeholder for manually entered, unlinked vehicles.
- V0.9.4.96 reminder Additional fields behavior.
- V0.9.4.95 reminder-bell visibility and **Synced [time]** labeling.
- The approved Android TEST relay, pairing, trust, MMS review handoff, and device controls.

## Release identifiers

- Version: `0.9.4.98`
- Build: `09498`
- Service worker cache: `lotkeys-app-v09498-hub-refresh-change-detection-hotfix`
