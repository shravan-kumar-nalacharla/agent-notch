# Release checklist

## Publishing an update

A source push or portable build does not update installed applications. Installed builds use the latest stable release in `shravan-kumar-nalacharla/agent-notch-releases`.

1. Build and test the versioned NSIS installer, then run `node scripts/verify-release.cjs --dir <build-folder> --version <version>`.
2. Upload the versioned installer, stable `Agent-Notch-Setup.exe` alias, blockmap, `latest.yml`, checksums, release notes and notices to a draft release. Publish the complete draft as latest, without the prerelease flag.
3. Run `node scripts/verify-public-update.cjs --from <previous-public-version> --expected <version> --installer <built-installer>`. This uses the production updater's GitHub provider anonymously and checks availability and hashes without installing anything.
4. Confirm the public latest release, record its URL and evidence, and only then report that users can update.

The release workflow runs on the release branch or manual dispatch. Development pushes do not publish binaries. Signing policy remains enforced by the workflow.

## Current — 0.25.0

File Actions adds the Nashi PDF core: inspect, merge, split and rotate, plus images → PDF through `pdf-lib`. Actual Blobatar remains the companion; drop-on-notch, image editing, media trim/convert and document → PDF remain. See [0.25.0 notes](0.25.0-UPDATES.md). Archive/QR/metadata/annotation/collage/subtitle/web tools are still outstanding. Source stays private; release binaries and metadata are public. The installer is unsigned; the release workflow requires a certificate for normal releases and fails closed otherwise.

## Previous — 0.6.2

Superseded by later releases. Retained as historical evidence.

## Current — 0.5.0

Superseded by [0.5.1 Settings visibility hotfix](0.5.1-SETTINGS-FIX.md). Use `F:\AgentNotch-builds\0.5.1\Agent Notch Setup 0.5.1.exe`.

See [the current release report](0.5.0-RELEASE.md). Installer, checksums, packaged evidence and logs are under `F:\AgentNotch-builds`. The 0.4.0 build below is retained as the audit baseline. Live microphone/provider tests, Windows 10, physical mixed-DPI/multiple displays, signing and Klyro redistribution clearance remain outstanding. Per-user QA retain-data and erase-data uninstalls have been exercised on this Windows 11 machine.

## Built — 0.4.0

- Installer: `dist-v0.4.0/Agent Notch Setup 0.4.0.exe`
- Size: 218,456,631 bytes (208.3 MiB)
- SHA-256: `37A97DC7A851D61411241918E5CE3F7DDA3BA934DEC5D7530B4C14D48422CA1F`
- Source and packaged Electron smoke tests pass. Packaged smoke exit code: 0.
- All 36 source files match their packaged copies. The installer was statically extracted and its app.asar/native helper hashes match the tested build.
- The packaged screen runtime reports ready for capture, Windows OCR, UI Automation and grounding.
- 47 Node tests pass.
- A live public LRCLIB sample lookup returned synchronized/plain lyrics. Media control UI checks use a clearly labeled fixture.
- See [0.4.0 changes](0.4.0-CHANGES.md) and `artifacts/packaged-smoke.log`.

### Reproduce this build

```powershell
npm ci
npm test
npm run build:native
node scripts/prepare-package.cjs
$env:ELECTRON_BUILDER_COMPRESSION_LEVEL='1'
npx electron-builder --win nsis --config.directories.output=dist-v0.4.0
& '.\dist-v0.4.0\win-unpacked\Agent Notch.exe' --smoke-test
```

The separate output folder allows the previous `dist/win-unpacked` instance to remain running. Close a running instance from the output folder before rebuilding that same folder. Lower compression changes size/build time, not the installed application.

## Required before a public release

- Obtain a Windows code-signing certificate and sign both the application and installer.
- Confirm that the Klyro owner has authorized redistribution. Its checkout had no root license file.
- Run live Groq transcription and assistant tests with a real API key on the release machine.
- Test microphone hotkeys, selected-text replacement, password-field exclusion, elevated apps and clipboard restoration.
- Test multiple monitors, fractional DPI, fullscreen transitions, sleep/resume reminders and audio-device removal.
- Install on a clean Windows VM, uninstall it, and verify local profile data can be retained or removed as intended.

## Deliberately not represented as complete

- Cursor/Codex status and Claude usage windows.
- Offline Whisper/Parakeet, local language models and wake word.
- Speech-following teleprompter.
- Klyro mobile pairing, WhatsApp automation, browser automation, video editing and ESP32 lighting.
