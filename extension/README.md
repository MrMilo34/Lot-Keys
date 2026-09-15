# LotKeys Facebook Posting Buddy

Current beta: **V0.1.17**

V0.1.17 adds an optional walkaround-video step after the normal Facebook fields and photos are complete. It checks the Vehicle Profile only when **Add Video** is pressed, accepts one compatible video no longer than 60 seconds, and preserves the completed photo set if Facebook uses one mixed media control. A missing, unreadable or over-limit video leaves the finished fields/photos untouched. V0.1.16’s posting timers, neutral handoff panel, accent spinner and grey/blur source lock remain unchanged.

## Download

- [Download the newest Posting Buddy — V0.1.17](./releases/LotKeys-Facebook-Assistant-Beta-v0.1.17.zip)

## Install or update

1. Download and unzip the newest package.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Remove or reload the older unpacked LotKeys extension.
5. Choose **Load unpacked** and select the unzipped extension folder.

The Posting Buddy checks `latest.json` and displays a download button when a newer GitHub release exists. Chrome does not silently install GitHub-hosted extensions on ordinary Windows or macOS computers; automatic browser installation and updating requires Chrome Web Store distribution or a managed enterprise policy.

## Publishing the next beta

1. Update the maintained development copy outside the public LotKeys website package.
2. Add only the new versioned ZIP to `releases/` and remove the superseded ZIP from the deployed website snapshot.
3. Update `latest.json` last so users are never pointed at a partially uploaded release.

The public website package intentionally contains no unpacked `latest/` or `source/` copy. The current versioned ZIP is the downloadable extension package and `latest.json` is its small update pointer.

## Safety rule

LotKeys fills supported Facebook Marketplace fields but never presses Facebook's final **Next** or **Publish** action for the user.
