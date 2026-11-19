# LotKeys TEST V0.9.5.42 — Posting Buddy V0.1.25 media updates

Baseline: .41 main `246b49696911bc447f7b7b7d27032cd402d2692d`.
Website build 095042; extension 0.1.25; Android remains 0.9.5.40.

The .24 extension required at least one successful photo removal whenever a
Listing had a saved Facebook URL. An empty uploader with Photos 0/20 therefore
stopped with the reported safe-replacement warning. When removal did work,
Facebook could replace its file input while the extension kept the detached
reference. Progress also treated any File, including a video, as a photo and
missed photos accepted by Facebook after it cleared FileList.

Posting Buddy .25 fixes these cases. It recognizes a scoped, explicitly empty
photo uploader; downloads and decodes every replacement before changing old
photos; checks safe removal controls only within the upload area; verifies
removal takes effect; and reacquires the current picker before assigning files.
The selected video is retained when the picker accepts both images and video.
Removal and acceptance checks are bounded and return a review message on failure.
Unknown or protected existing media is not treated as an empty uploader.

Photo progress uses Facebook's count and image files, keeping video separate.
Accepted photos remain filled when the browser input is reset. Unchanged old
photos cannot automatically clear a blocked replacement warning. Saved Listing
titles and unchecked Details/Description retain their previous behavior.
The extension does not click Facebook's final Save, Update or Publish button.

Install the .25 ZIP into the same unpacked extension folder, click Reload at
`chrome://extensions`, reload Facebook, then Sync in Posting Buddy. Confirm the
extension reports V0.1.25. Updating only the LotKeys website will not replace
Chrome's already loaded extension. Garage and the release pointer now offer .25;
the previous .23/.24 archives remain available.

355 Node checks and JavaScript syntax checks pass, including 15 new media cases.
Seven of the initial 12 media cases failed against .24 before the fix. Source
and packaged-script checks are automated; a real Facebook edit/upload is still
needed after installation. No live account or listing was changed during testing.
Android, native Drive recovery, Hub, pairing and the recent-message cache are
unchanged. See [verification](LotKeys-0.9.5.42-Test-Report.md).

[Download Posting Buddy V0.1.25](extension/releases/LotKeys-Facebook-Assistant-Beta-v0.1.25.zip).
