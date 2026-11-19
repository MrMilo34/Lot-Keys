# LotKeys Facebook Posting Buddy

Current beta: **V0.1.25**

Update Photos now accepts Facebook's explicitly empty photo uploader, without requiring old-photo removal buttons. Existing-photo replacement prepares and decodes every new image before removing anything, checks removal controls within the upload section, and reacquires the live picker after Facebook rebuilds its grid. A selected video in a mixed picker is retained. Progress uses the actual photo count after Facebook clears FileList; a video alone cannot count as Photos filled.

[Download Posting Buddy V0.1.25](./releases/LotKeys-Facebook-Assistant-Beta-v0.1.25.zip). Extract it, replace the files in the **same unpacked extension folder**, press **Reload** for Posting Buddy at `chrome://extensions`, reload Facebook, then press Sync in Posting Buddy. Installing the website update alone does not replace Chrome's loaded extension files.

Saved Listing names, unchecked Details/Description, permissions and the review-before-save workflow remain. Posting Buddy never clicks Facebook's final Save/Update/Publish action. Live Facebook confirmation is still needed after installing this release.

[Previous .24 release](./releases/LotKeys-Facebook-Assistant-Beta-v0.1.24.zip) · [Older .23 release](./releases/LotKeys-Facebook-Assistant-Beta-v0.1.23.zip).
