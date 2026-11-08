# Agent Notch 0.17.9

Agent Notch 0.17.9 is the verified Windows release with automatic updates.

- Checks for updates shortly after startup, every six hours and from Settings > About > Updates.
- Downloads the NSIS package in the background and verifies it against `latest.yml`.
- Offers **Restart now** or **Later**. Settings and the tray show download and ready state.
- Creates the install helper through Windows Management Instrumentation so it survives the app's process job, waits for the app to exit, removes `ELECTRON_RUN_AS_NODE`, and runs `--updated /S --force-run`. The updated app reopens.
- Waits while dictating, recording, capturing the screen, using the manual terminal, editing unsaved settings or running a task.
- Stops voice, agents, capture and the managed browser, closes the native helper, checkpoints SQLite, flushes settings and then quits.
- Keeps settings, encrypted provider keys, notes, reminders, history, SQLite data and user documents.

Existing 0.17.1 installations need one manual 0.17.9 install because they contain no updater. Builds 0.17.2 through 0.17.7 may not install automatically; install 0.17.9 manually if you are on one of those builds.

The installer is unsigned, so Windows SmartScreen may show an unknown-publisher warning. Verify `SHA256SUMS.txt` and the `sha512` in `latest.yml` before running it. The installer file is `Agent-Notch-Setup-0.17.9.exe`.

If a release is faulty, publish a higher version with the corrected code. Deleting a release does not downgrade an installed machine.
