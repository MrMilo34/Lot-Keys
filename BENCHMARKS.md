# LotKeys success benchmarks

## V0.9.4.84 — working Android phone-source checkpoint

- Preserved GitHub branch: `benchmark-v09484-success`
- Preserved TEST commit: `677d8af00d63aacb9021a9c063cff815f81ccfa5`
- Confirmed by Blair after real-phone testing on September 23, 2026.
- Includes live SMS/MMS conversation discovery, Android contact names, phone-number organization, paged message history, plain SMS sending, four-digit phone approval, the loopback reconnect repair, stable open Device chats and local unsent drafts.
- This benchmark deliberately remains amber for coverage because the RCS safety watcher is not implemented yet.

Use this branch as the known-good rollback/reference point for future Phone Source and Hub work. Do not move the benchmark branch when later TEST hotfixes are published.
