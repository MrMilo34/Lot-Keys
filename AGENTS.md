# LotKeys work

Read `CURRENT-STATE.md` and current `version.json` first. Check current Git main
before changing a recovered baseline. For phone-wake work also read
`PHONE-WAKE-STATUS.md`. Older architecture and release notes are historical where
newer implemented releases supersede them.

Search the relevant functions and tests, then read bounded sections. Avoid
dumping the full index.html, BUILD.txt, historical README, diffs or test logs
into the conversation. Keep full logs locally and report summaries/errors.

Preserve unrelated source paths and existing settings/data. Add focused behavior
checks, run the existing Node suite and syntax checks, then stop repeating tests
unless a change or failure requires it. Match release/build/service-worker IDs.
Refresh CURRENT-STATE.md and retain historical release notes when shipping.

Report implemented, tested, deployed and real-device-verified work separately.
An idle spinner does not establish that work is continuing. State concrete
blockers, keep progress updates frequent, and save a continuation checkpoint.
