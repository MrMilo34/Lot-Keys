LotKeys Facebook Assistant Beta v0.1.15

Accent-colored working feedback and a clearer Facebook handoff.

What changed
- Uses the current LotKeys user accent for the animated working spinner instead of the old red/black ring.
- After Continue to URL & Views, greys and softly blurs the Listing-selection area instead of leaving it highlighted in blue.
- Locks that background area against accidental Listing changes during the Facebook publishing handoff.
- Adds Back to return safely to the completed-transfer screen and remove the lock.
- A successful Save / Use this Website also removes the lock and enables view tracking.
- Leaves the later URL/view screens, exact photo order, Location-last behavior, field completion sensing, reinjection and manual Facebook Next/Publish safety rule unchanged.

GitHub release layout
- extension/latest/ contains the current unpacked extension source.
- extension/latest.json identifies the newest public version and download.
- extension/latest.json points LotKeys to the current versioned release.
- extension/releases/LotKeys-Facebook-Assistant-Beta-v0.1.15.zip is the current release.

Install / update
1. Download and unzip the ZIP supplied by LotKeys.
2. Open chrome://extensions.
3. Turn on Developer mode.
4. Remove/reload the older unpacked LotKeys Facebook Assistant and choose Load unpacked for the new folder.
5. The extension may refresh already-open Facebook tabs once for the new version.

Important: Chrome does not silently install GitHub-hosted updates on ordinary Windows/Mac computers. The Posting Buddy can detect a newer GitHub release and take the user directly to its download; fully automatic browser updates require Chrome Web Store distribution or managed enterprise policy.

LotKeys never presses Facebook's final Next/Publish action for you.

--- Previous release history ---
LotKeys Facebook Assistant Beta v0.1.10

Field-completion sensing and URL/Views handoff built on the working v0.1.8 posting session.

What changed
- While Facebook needs attention, LotKeys now watches the Facebook form and detects when a previously blank/missed field has been filled manually.
- Fields that were blank in the LotKeys Listing stay visible as manual Facebook work until they are filled or the user confirms completion.
- Three bottom actions sit side by side: Jump to Next Missing Field, All Fields Filled, and Back.
- Jump to Next Missing Field cycles through both missed fields and fields that were blank in LotKeys.
- All Fields Filled is an explicit override: it advances the posting flow even when Facebook's custom controls cannot be reliably sensed.
- Back clears the active posting session and returns directly to the Listing selector.
- When every tracked field is detected as filled, LotKeys advances automatically to the large green completion check.
- The green completion stage now has Continue to URL & Views. After clicking it, the special effect disappears and the normal selected-Listing view returns with Facebook URL & Views brought into focus.
- The selected Listing and follow-up state survive Facebook navigation to the live /marketplace/item page.
- Save / Use this Website still turns green after the live Facebook URL is saved, then clears the session and returns to the Listing selector.
- Keeps v0.1.8 lifecycle recovery, loading animation, exact 20-photo transfer, field reinjection, wider dock, and manual Facebook Next/Publish.

Install / update
1. Unzip this package.
2. Open chrome://extensions.
3. Turn on Developer mode.
4. Replace/reload the older unpacked LotKeys Facebook Assistant and Load unpacked from this v0.1.10 folder.
5. The extension may refresh already-open Facebook tabs once for the new version.

LotKeys never presses Facebook's final Next/Publish action for you.

--- Previous release history ---
LotKeys Facebook Assistant Beta v0.1.8

Continuous posting-session polish built on the working v0.1.7 Helper.

What changed
- Fill Facebook now becomes one continuous posting session instead of dropping back to the Listing picker.
- Shows an animated LotKeys loading logo while the Helper moves and verifies fields/photos.
- Successful transfer gives a large animated green check, then keeps the same vehicle active with Save / Use this Website.
- If fields need attention, the same session shows the yellow check plus existing Jump / Reinject controls. Clearing the last missed field transitions into the green success state automatically.
- The active posting Listing survives Facebook navigation from the create form to the live /marketplace/item page. This temporary session is only restored while a post is in progress.
- Saving the live Facebook URL turns the button green with a check, writes the URL/status back to LotKeys, then clears the posting session and returns to the Listing selector for the next vehicle.
- Back to Listings is always available to abandon the active posting session manually.
- Existing manual view snapshots remain available when selecting a Listing that already has a saved Facebook URL.
- Keeps v0.1.7 fill behavior, field reinjection, wider dock, exact 20-photo order, and manual Facebook Next/Publish.
- Aligns all Helper/content-script lifecycle version checks to v0.1.8.

Install / update
1. Unzip this package.
2. Open chrome://extensions.
3. Turn on Developer mode.
4. Replace/reload the older unpacked LotKeys Facebook Assistant and Load unpacked from this v0.1.8 folder.
5. The extension may refresh already-open Facebook tabs once for the new version.

LotKeys never presses Facebook's final Next/Publish action for you.

--- Previous release history ---
LotKeys Facebook Assistant Beta v0.1.7

Full extension release based on v0.1.3.

What changed
- Facebook Model is treated as a text input on PC, not a dropdown, so it no longer returns a false “option not found” error.
- Exterior and Interior Color are normalized to Facebook's supported options: Black, Blue, Brown, Gold, Green, Gray, Pink, Purple, Red, Silver, Orange, White, Yellow, Charcoal, Off white, Tan, Beige, Burgundy, Turquoise, Other.
- Legacy Grey is normalized to Gray and Off-White variants to Off white; unsupported nonblank legacy colors fall back to Other.
- Vehicle Condition uses Facebook's exact options: Excellent, Very good, Good, Fair, Poor.
- Every field flagged for manual attention now has both Jump to field and ↻ Reinject, allowing a single field to be retried without rerunning the full Listing fill.
- A successful reinjection clears that field's yellow highlight and recomputes the green/yellow completion check.
- Keeps the v0.1.3 fill order, wider assistant, exact LotKeys photo selection/order, 20-photo maximum, URL writeback, and manual final Next/Publish.

Install / update
1. Unzip this package.
2. Open chrome://extensions.
3. Turn on Developer mode.
4. Remove/reload the older unpacked LotKeys Facebook Assistant and Load unpacked from this v0.1.7 folder.
5. Reload LotKeys and Facebook once.

LotKeys never presses Facebook's final Next/Publish action for you.

--- Previous v0.1.3 notes ---
LotKeys Facebook Assistant Beta v0.1.3

Full extension release based on the rolled-up v0.1.2 assistant.

What changed
- Faster top-to-bottom Facebook fill order: Vehicle Type → Photos → Year → Make → Model → Mileage → Price → Body Style → Description → Location → Exterior Color → Interior Color → Vehicle Condition → Fuel Type.
- Make is always completed before Model, with an adaptive wait for Facebook to rebuild Model choices.
- Price and Mileage use stricter exact input targeting and verify Facebook kept the value.
- Description is restricted to the actual Description textarea; it can no longer fall through to the Location control.
- Location is read from the saved LotKeys Listing location (postal code first, then saved name/address) and uses its own exact autocomplete path.
- Facebook Vehicle Condition mapping is limited to: Excellent, Very good, Good, Fair, Poor.
- Condition and Fuel Type remain lowest priority; blank/unsupported values are skipped instead of blocking the post.
- Photo transfer starts immediately after Vehicle Type and retrieves up to three LotKeys photos in parallel for a faster fill.
- Honors the new LotKeys Listing photo selector exactly: unchecked Vehicle Profile photos are NOT silently appended back into the Facebook set. Maximum remains 20.
- Wider embedded assistant dock with no horizontal photo strip scrolling.
- Denser two-column Listing picker on wider panels so more Listings are visible at once.
- Large green check when all available data moved successfully; large yellow check plus highlighted/jumpable Facebook controls when attention is needed.
- Keeps explicit Listing selection per assistant session, v0.1.1 connection/photo preview fixes, collapsible Marketplace dock, URL writeback, manual view snapshots, and manual final Next/Publish.

Install / update
1. Unzip this package.
2. Open chrome://extensions.
3. Turn on Developer mode.
4. Remove the older unpacked LotKeys Facebook Assistant, or choose Load unpacked and point to this v0.1.3 folder.
5. Reload the LotKeys and Facebook tabs once.
6. Open Facebook Marketplace. The LotKeys dock appears on the right and can be collapsed with its arrow tab.

LotKeys never presses Facebook's final Next/Publish action for you.


v0.1.7 extension lifecycle fix
- Fixes Chrome 'Extension context invalidated' errors after updating/reloading the unpacked Helper while a Facebook tab remains open.
- Existing Facebook tabs are reconnected automatically when the extension service worker restarts.
- Stale content-script timers stop using Chrome APIs after their context is invalidated.
- The dock is rebuilt with the fresh extension context so its embedded Helper UI is usable without manually closing Facebook first.


v0.1.7 lifecycle hardening:
- New Helper versions hard-reload already-open Facebook tabs once so stale extension contexts are destroyed instead of reused.
- The reload is version-guarded and does not repeat on normal MV3 service-worker wakeups.
- Embedded sidepanel runtime/storage calls are guarded so context loss does not create uncaught Chrome extension errors.


v0.1.7 visual completion pass
- Keeps the working v0.1.6 Facebook fill/lifecycle logic unchanged.
- Large centered green check appears immediately after a complete transfer.
- Large yellow check appears when Facebook still needs attention, with missing field names.
- Progress automatically scrolls into view after transfer.
- Selecting a Listing smoothly brings the Selected Listing controls into view.
- If Reinject clears the final missing field, the large green completion check appears.

V0.1.10 photo-selection correction
- Uses the exact saved LotKeys Listing photo IDs/order instead of treating photos only as position numbers.
- Re-reads lightweight Listing data immediately before Fill so recent Listing photo changes are honored without stale Helper state.
- Thumbnail cache keys include the selected photo ID, preventing an old image from remaining at a reused position after reorder/toggle changes.
- Keeps the V0.1.9 posting-session, completion, URL and field-review workflow.
- Uses the corrected ring-free LotKeys icon.
