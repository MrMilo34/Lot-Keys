# LotKeys V0.9.4.81 + Posting Buddy V0.1.23 team-test checklist

## App baseline
- Open `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09481`.
- Confirm version metadata reports **V0.9.4.81 / 09481**.
- Confirm service worker cache is `lotkeys-app-v09481-fresh-video-management-updates`.
- Confirm V0.9.4.80 Vehicle Profile Photos + Video parallel upload behavior still works and active video progress still shows MB transferred / total MB.
- Confirm V0.9.4.79 Vehicle/Listing draft recovery still works.

## Management Updates
- As Admin Level 1/2, confirm **Administration controls** appears above the top/pinned post.
- Confirm regular users do not see Administration controls.
- Publish an image update and confirm the image shows without the original device filename, MIME type, or file size.
- Publish a video update and confirm no video filename/details are exposed in the post.
- Publish a PDF/document/file and confirm its filename plus open/download row still appears.

## Posting Buddy V0.1.23
- Confirm `extension/latest.json` reports **V0.1.23** and points to `LotKeys-Facebook-Assistant-Beta-v0.1.23.zip`.
- Create or use an existing LotKeys Listing whose Vehicle Profile initially has no video.
- Add a <=60 second video to the official Vehicle Profile **without editing/saving the LotKeys Listing again**.
- Re-select that Listing in Posting Buddy and confirm the new official video appears.
- Repeat with a video in the signed-in user's own existing More Media Videos; confirm it is available to that user and no other user's More Media is exposed.
- On a new Facebook post with Video selected, confirm video preparation begins early and the video is handed to Facebook before Photos / Description / Details.
- Confirm there is no fixed wait before video handoff after the user manually presses Post / Update on a ready Facebook editor.
- Confirm the **Fields filled in** timer stops when Facebook has accepted the video and the next Save / Update / Next action is enabled.
- On an existing Facebook Listing with Photos selected, confirm the old Facebook photos are cleared and the current LotKeys photo set is re-uploaded in saved order rather than appended.
- On a mixed media picker, confirm starting Video first does not cause the selected video to disappear when Photos are added.

## Processor
- Garage should still report **Store Processor V0.9.4.76** current.
- No Apps Script reinstall is expected for V0.9.4.81.
