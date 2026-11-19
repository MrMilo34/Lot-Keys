# Regular LotKeys V0.9.5.50 reliability preview

Promote the verified TEST .50 source 39e89f0306e9fd10da4f06771dc62ac78566af85
to the regular repository/site, preserving regular .81 commit
82543c12cee842c869bced97b92c29e61b2d36a1 on rollback/regular-v09481-82543c1-before-v095050.
Only the additional requested Google scope drive.appdata is approved; no client,
DNS, sharing, Store processor, APK, signing or publishing settings are changed.
Database autolister-v1/version2 and saved account/Store data remain in place.

Includes the reviewed .44-.50 web fixes: media refresh/retry and selection,
checkpointed browser submissions, Store access-request workflow, cached-token
recovery, visible preparation wake lease and minimal Account upload/connector
controls. Posting Buddy .1.25 is served through the regular release paths while
older regular extension artifacts remain available. Compare is manual/import
only. Locked-screen regular-user native finalization, the exact PC-send report
and automatic website Compare search are not represented as repaired.

Runtime JS is copied from .50 with the existing regular Google client fallback and blank API-key/project defaults preserved. The first stylesheet is extracted unchanged to
lotkeys-app.css for reliable source upload; relative paths/order are unchanged.
CNAME, install.html, production creator/access directory files and security/setup
guidance retain their production bytes. No TEST runtime data/config is substituted.
Original Android .46 source and its build template are reference only; this regular
web release introduces no native build workflow and distributes no APK.

Checks: run the source Node/DOM and responsive browser checks plus the production
preservation contract. No real Google/Store/device mutation is part of automated
QA. Promote via a reviewed PR only, then verify Pages success and served version
and release-file hashes. User live testing follows the authorized normal flow.

Rollback via a normal revert/PR restoring the protected .81 tree (not force push);
verify the old version/cache after deployment. Do not clear browser/IndexedDB,
uninstall the connector or reset user authorization as part of rollback.
