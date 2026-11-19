# LotKeys V0.9.5.31 — Device chat history reuse

When a Device notification had already loaded phone history, opening it started another history request. Prefetch, Bubble Chat and the full conversation could also request that same page separately. Every thread-list change cleared all warmed history. The Android Drive relay serves requests sequentially, so those repeated reads could delay displaying an already-known conversation.

The notification and chat views now use the same bounded, temporary first-page cache and request pool. Other conversations changing preserve the current page. A changed conversation can paint its previous phone-sourced page immediately while retrieving current history; a fresh refresh only reuses a page for five seconds when the conversation signature still matches. Older pages retain independent cursors. An old response cannot overwrite a newer cached page.

The phone transport also coalesces overlapping reads for the same session, native revision, conversation signature and history cursor. Phone invalidation or session replacement separates new work from an earlier pending read. Failures release their slot for retry. Full Device chat starts history retrieval alongside independent Hub metadata loading.

## Compatibility and retention

- Web TEST build 095031; Android connector stays V0.9.5.12 and Store Processor stays V0.9.4.76.
- No APK reinstall, new Google Apps Script, Google-account change or re-pairing is needed for this web change.
- The phone remains the message source. Message bodies stay in the existing eight-page, five-minute browser-memory cache; this adds no persistent transcript.
- Disconnect, account identity changes and page closure still clear that memory. Late responses cannot repopulate a cleared cache.
- New messages, loaded older history, media, drafts, read acknowledgements, chat actions and all dealership-recognition updates remain in place.
- Enigma code and account/website services are unchanged.

## Verification and limits

Fourteen new behavioral regression cases cover notification-to-chat reuse, overlapping reads, unrelated updates, changed/aged pages, more than six new arrivals, old-response races, privacy clearing, capacity/expiry, independent older cursors, native/relay invalidation, replacement sessions, retry, disconnect, parallel opening and rejecting a phone swap during metadata loading.

The complete existing Node suite and JavaScript syntax checks are required GitHub Actions gates before TEST publication. See [the verification record](LotKeys-0.9.5.31-Test-Report.md) and the release commit's checks.

The observed approximately 40-second delay has not been reproduced with Blair's connected phone. This fixes verified redundant LotKeys work, without promising a measured new end-to-end time. Native provider query time, carrier MMS retrieval, Enigma's provider-write timing and Drive latency remain separate possible contributors. The current Enigma 0.1.55 source archive was located, but could not be unpacked in the unavailable local execution environment; receive/write-before-notification ordering is therefore unverified in this investigation.
