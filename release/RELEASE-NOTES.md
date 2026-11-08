# Agent Notch 0.18.0

Agent Notch 0.18.0 is the public Windows release from Huygen Studios. It makes the island easier to live with.

- Lyrics now show the current line and the line before it. The current line is larger and bold; the previous line is smaller and faded. The third clipped row is gone.
- Chat no longer opens with “Ask a question” or an empty-state paragraph.
- The island closes after the pointer leaves, unless it is pinned or voice, capture, a task or a manual terminal session is active.
- Settings → About adds **What’s new** with the current release notes and recent history.
- The product site, install guide and full update catalog are live at `https://shravan-kumar-nalacharla.github.io/agent-notch-site/`.
- Automatic updates remain built in: checks after startup, every six hours and on demand; download in the background; Restart now or Later; local data preserved.

Existing 0.17.1 installations need one manual 0.18.0 install because they contain no updater. Builds 0.17.2 through 0.17.7 may not install automatically; install 0.18.0 manually if you are on one of them.

This is an unsigned build. Windows SmartScreen may warn about an unknown publisher. Verify `SHA256SUMS.txt` and the `sha512` in `latest.yml` before running it. The installer file is `Agent-Notch-Setup-0.18.0.exe`; the stable alias is `Agent-Notch-Setup.exe`.

If a release is faulty, publish a higher version with the corrected code. Deleting a release does not downgrade an installed machine.
