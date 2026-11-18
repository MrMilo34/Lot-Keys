# LotKeys TEST V0.9.5.43 — retained Android save status

Baseline: .42 main `9e13feb7e78b27ae3ce2d20bb4260fd98f3b2165`.
Website build 095043; Android stays .40; Posting Buddy stays .25.

Blair reported DT3526A stalled at 50% on .42, with switch-app advice beside a
needs-attention state. The Profile error was "The background upload belongs to
another account, Store or edit." Pressing Sync Vehicle recovered and completed
the save. No phone job snapshot was captured, so the exact triggering reply is
not established.

A reproducible source defect produces that same misleading error: nativeCall
swallowed JSON decode failures and returned an empty object for an HTTP-success
reply. The upload watcher then treated its missing identity as another account
or edit. In .43, incomplete replies are typed recovery errors. Status reads
validate the job structure before checking context, retain the current receipt
and originals, and enter the existing bounded retry path. Explicit authorization
or missing-job rejections remain stopped with their actual HTTP explanation.

Real account/Store/edit mismatches still fail the guard. Unconfirmed completion
IDs are rejected separately. No foreign files are adopted, cancelled or restaged
to bypass a mismatch. Hidden browser observation pauses and rechecks the retained
job when visible again; Android retains ownership of its existing upload.

Queued work is described as waiting for Android, and active status is described
as Android's report. Failures show the actual reason instead of stale switch-app
advice. Native job scheduling, consent, signing identity, .41 Drive recovery,
extension .25, Hub and recent-message cache are unchanged. No APK reinstall.

369 Node tests pass, including 14 new response/status/recovery cases. All 16 web,
eight inline and three packaged extension scripts pass syntax checks. Real-device
background/lock-screen verification remains necessary; this is not a claim that
every 50% stall is resolved. See [verification](LotKeys-0.9.5.43-Test-Report.md).
