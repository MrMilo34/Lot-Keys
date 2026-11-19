# LotKeys TEST .43 status recovery verification

Date: November 7, 2026. Baseline: .42 / main
`9e13feb7e78b27ae3ce2d20bb4260fd98f3b2165`.

## Reproduction and fixes

The actual nativeCall function was evaluated with an HTTP-success response whose
JSON body throws an incomplete-body error. On .42 it returned `{}`, which the
existing completion guard interprets as a different context. A separate empty
status snapshot reproduces the generic account/Store/edit error directly.
This establishes a source-level cause of that message, not the exact phone event.

Seven of the first eight new regression assertions failed on .42. The final
14 cases pass, covering truncated/valid replies, explicit authorization status,
malformed job identity, a dropped status connection, a missing job, a genuine
different edit/account, hidden-to-visible observation, automatic retry
classification, stale switch-app advice, queued/active/error guidance and
unconfirmed file results. The actual save handler is tested with both transient
status loss and a genuine mismatch: the receipt stays intact, transient failures
schedule resume, and genuine mismatches remain stopped.

The complete Node suite passes **369/369**, zero failures/skips. Existing original
handoff, .41 recovery, newer-edit protection, Listings, extension media/title,
phone/SMS, Store/account and recent-conversation checks also pass. Syntax checks
pass for 16 standalone web/wake scripts, eight executable inline scripts and
the three scripts in the unchanged .25 extension ZIP. Diff checks pass.

## Scope and limits

Android sources/APKs, extension files, native transfer protocol, wake sender,
Hub and message modules are unchanged. The phone module changes response-error
handling; it does not resend an uncertain SMS. The transfer core's existing
context and completed-file checks remain intact. No APK was rebuilt.
Release/build/cache and checksums are verified against the tested source.

Blair confirmed that manually pressing Sync Vehicle let DT3526A continue and
complete. No device log identifies whether the failing response was truncated
or a well-formed mismatched job. No live Drive data was modified during testing,
and no physical locked-phone test is claimed. On the next upload, check that
errors report their real reason and reconnect automatically where appropriate.
Keep app/browser data and the .40 connector intact.

A separate native follow-up was identified: TransferJobService.schedule returns
early for any existing pending job before trying a visible-activity UIDT upgrade.
That scheduler path needs a separately built, same-key signed APK and native
verification. It is not changed or claimed fixed by this web-only status release.
