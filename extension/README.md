# LotKeys Facebook Posting Buddy

Current beta: **V0.1.14**

V0.1.14 follows the active LotKeys accent and light/dark appearance, handles Facebook Location last, scrolls to the final Next/Submit control without clicking it, and keeps view tracking covered until a live Marketplace URL is saved.

## Download

- [Download the newest Posting Buddy — V0.1.14](./releases/LotKeys-Facebook-Assistant-Beta-v0.1.14.zip)

## Install or update

1. Download and unzip the newest package.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Remove or reload the older unpacked LotKeys extension.
5. Choose **Load unpacked** and select the unzipped extension folder.

The Posting Buddy checks `latest.json` and displays a download button when a newer GitHub release exists. Chrome does not silently install GitHub-hosted extensions on ordinary Windows or macOS computers; automatic browser installation and updating requires Chrome Web Store distribution or a managed enterprise policy.

## Publishing the next beta

1. Increase the version in `latest/manifest.json`, `latest/background.js`, and `latest/facebook.js`.
2. Put the complete new unpacked source in `latest/`.
3. Add the versioned ZIP to `releases/`.
4. Update `latest.json` last so users are never pointed at a partially uploaded release.

## Safety rule

LotKeys fills supported Facebook Marketplace fields but never presses Facebook's final **Next** or **Publish** action for the user.
