# LotKeys V0.9.5.11 — trusted-phone automatic reconnect

Prepared September 26, 2026 (Edmonton) from V0.9.5.10 after physical testing with the V0.9.4.85 Android connector.

## What the physical test proved

- V0.9.5.09 could create a fresh pairing after the saved session stopped answering, but the user still had to initiate or finish it while LotKeys was open on the phone.
- V0.9.5.10 correctly stopped treating that browser-owned connection as background-capable. With the installed V0.9.4.85 connector, the PC could show a code but no Android background relay existed to accept it.
- The V0.9.4.85 connector must therefore be replaced. Website code alone cannot keep a phone-side relay alive after the phone browser is backgrounded.

## Changes

- A restored PC session is actively probed. If it does not answer, the saved trusted-phone record is retained and LotKeys automatically creates a fresh encrypted pairing offer.
- Repeated heartbeat failure triggers the same recovery without requiring the **Reconnect phone** button.
- Automatic reconnect attempts are rate-limited to ten seconds and retried after recoverable failures.
- The Android relay recognizes the existing browser ID and automatically approves a new offer only while that computer's 36-hour, 7-day, or Until Disconnect trust remains valid.
- After a successful connection, the PC remembers the Android install ID and directs future automatic recovery offers back to that same phone.
- Android chooses the newest trusted offer and clears older trusted offers before approving it, preventing stale requests from repeatedly replacing the recovered session.
- A same-browser recovery does not spend time sending a transfer notice to the already-stale session.
- Hub waits eight seconds before showing the matching code for an automatic attempt. A normally trusted reconnect should finish quietly; the code remains available as a fallback if Android trust was lost.
- Android source, workflow artifact name, connector screen, phone capability version, and web build metadata are all updated to V0.9.5.11.

## Required Android update

After uploading this complete release to the TEST repository, download the **LotKeys-Android-V0.9.5.11** artifact from the successful **Build LotKeys Android Layer** GitHub Action and install its APK over the existing connector. The stable TEST signing secret must be configured for an in-place update.

Open the connector and confirm **Phone Connection · V0.9.5.11 TEST**. Complete the new **PC Pairing Account** step with the same Google account used by LotKeys, keep the connection notification enabled, and leave Android battery access set to **Unrestricted**.

The first computer connection still requires matching-code approval. Automatic reconnection starts only after the computer has been deliberately trusted.

## Release identifiers

- Web version: `0.9.5.11`
- Web build: `095011`
- Android version code: `95011`
- Android version name: `0.9.5.11-test`
- Service worker cache: `lotkeys-app-v095011-trusted-phone-auto-reconnect`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095011`

## Physical check

1. Install the V0.9.5.11 connector and authorize its PC Pairing Account.
2. Pair once and select **Trust 36 Hours** or longer.
3. Confirm Device messages load on the PC.
4. Leave the phone's LotKeys website and open another phone app. Do not press Reconnect on either device.
5. Wait for the PC indicator to recover automatically, then refresh a fictional conversation.
6. Lock the phone and repeat. Android deep idle can still delay network access; force-stop, revoked Google access, or expired trust correctly requires user attention.
