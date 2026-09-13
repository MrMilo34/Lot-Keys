# LotKeys Facebook Posting Buddy

Current beta: **V0.1.16**

V0.1.16 adds persistent posting milestones and a neutral inverse-theme timing panel. Auto-fill time freezes when all Facebook fields are complete; total time continues until the live Marketplace URL is saved. Both are compared with the 12:30 manual-posting benchmark, with saved time floored at zero. It also uses the shared optimized vehicle placeholder while retaining V0.1.15’s accent spinner and grey/blur source lock.

## Download

- [Download the newest Posting Buddy — V0.1.16](./releases/LotKeys-Facebook-Assistant-Beta-v0.1.16.zip)

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
