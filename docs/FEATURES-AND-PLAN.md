# Agent Notch: evidence and implementation plan

This is the initial research record. Current implementation status and remaining work are maintained in [FEATURE-COMPLETION.md](FEATURE-COMPLETION.md); the original boundary below is historical.

Working name, 2026-11-01. A fresh application; TwoCode is a reference, not the base.

## Evidence inventory

| Product | Evidence inspected | Observed features / limits |
|---|---|---|
| Hey Nixi 0.3.0 | NSIS archive, BUILD-METADATA.json, THIRD-PARTY-NOTICES.md, bundled asset names | Python 3.12, PySide6/Qt, local Whisper/Parakeet speech, Silero voice activity detection, optional Windows speech output, local llama.cpp/Qwen, window screenshots, Windows media controls, app launch responses, timers/reminders. Component/asset evidence is not proof every UI feature works. Main program appears compiled; no recovered source yet. |
| Nook 0.2.1 | executable metadata, installer signatures, official source tag v0.2.1 at b0a1089f935d630f932483500abbeeab32cb68c6 | Tauri/Rust/TypeScript; Claude Code approvals/diffs/questions, Cursor status, multi-session/subagent tree, usage windows, CPU/GPU/RAM, todo/timer/reminders/media/mirror/projects, shortcuts, full-screen hiding. Source tag is a reference; build-to-installer correspondence is not verified. Source is MIT; original name/artwork should be replaced. |
| Nusa | executable metadata and installer signatures | Inno Setup 6.7.0. Payload not extracted yet; no feature claims made. |
| Voice Flow | supplied ZIP, README, Windows source, MIT license | Hold-to-talk, hands-free, command editing, cleanup/styles, dictionary, snippets, multilingual/Telugu modes, quiet speech, meeting transcript and summaries, history, safe insertion. Windows lacks some macOS features: scratchpad, insights, edit learning, automatic meeting detection. Gemini key support exists but is not wired into transcription/cleanup. |
| Klyro | Git checkout at 0de9e786033a2f76bbc5f8e4ef45b1316a2381f1 | Screen tutor, screenshot/OCR/UIA grounding, next-control overlay, bounded agent loop; browser automation, local search, mobile remote, file transfer, WhatsApp, video editing and lighting are broader experimental modules. Browser mode is a simulation. Main source license not found; mobile subtree has a separate license. |
| TwoCode | earlier audit of supplied installed source | AI activity/approval monitor, assistant, animated mascot, Spotify, clipboard, notes, focus, weather/calendar, tray. |

## Implementation sequence and acceptance criteria

1. Fresh host: isolated Git repository, transparent always-on-top island, original animated face, tray, expand/collapse, shortcuts, notes and persistent focus deadline. Must launch from a clean install and package successfully.
2. Provider layer: separate assistant/transcription selection for Gemini, Groq, OpenAI; user-selectable models; OS-encrypted keys; microphone recording; clear errors; no raw audio history. Test request construction and error handling with mocked HTTP.
3. Voice Flow integration: preserve MIT notice, reuse Windows core/native insertion safety, dictionary, snippets, cleanup, hotkey gestures, Telugu resolver, meeting processing. Build a bridge rather than launching another UI. Requires local .NET SDK, currently absent. Validate password fields, focus changes, cancel and clipboard restoration.
4. Klyro integration: adapt its JSON stdin/stdout Python worker with agent_mode=false initially; surface step results and grounded overlays. Probe dependencies first and show genuine readiness, not simulated success. Add bounded approved actions after screen guidance is verified.
5. Desktop consolidation: media controls, file shelf, calendar/weather, AI task monitor, notifications, reminders, history/search/export, personalization. Inventory Nook and Nusa payloads before declaring feature parity.
6. Release: original brand/assets, component notices, installer, clean-machine checks, signing, updates, crash recovery, audio/device unplug tests and screen/DPI tests.

## Current implementation boundary

The first host implements provider HTTP adapters, microphone upload, assistant replies with Windows/browser voice output, encrypted credential storage, notes and focus timer. Voice Flow's unmodified MIT cleanup prompt is bundled with attribution and used by the Polish action across all three providers; full native dictation engine integration is not complete. Klyro has a development-only JSON worker bridge with agent mode disabled; it requires its Python dependencies and currently returns raw structured guidance rather than drawing a grounded overlay. No product-wide feature parity is claimed.

## Additional feature research

Hey Nixi's official site (https://heynixi.app/) describes command/dictation/writing modes, app and website launching, media/volume control, file search, screen questions, voice-following teleprompter, lists, notes, reminders and timers, with offline speech/cleanup. These are vendor-described features, not independently runtime-verified.

Nook source: https://github.com/zubairbinshaukat/nook/tree/v0.2.1. Current website describes a newer 0.2.2 with Codex approval/reply support; do not attribute those additions to the supplied 0.2.1 installer.

Nusa third-party listing (https://alternativeto.net/software/nusa/about/) describes synchronized lyrics/media, file shelf, focus, water reminders and daily todos. Treat these as unverified candidates until the supplied installer is unpacked or observed. Core candidate backlog: native media transport/artwork/lyrics, file drag shelf, hydration reminders, daily task list, calendar/weather, clipboard history, meeting notes, teleprompter, agent approvals/session trees/resource metrics, screen guidance/overlays, safe computer actions and optional local speech models.

## Verification performed

Eight Node tests pass: provider validation, three-provider chat and transcription contracts, provider errors, Voice Flow prompt/fallback behavior, Klyro JSON result/status/error handling. Real Electron smoke test passes: sandbox preload bridge, expansion and three provider choices; screenshot in artifacts/island.png was visually inspected. Initial GPU page capture failed with UnknownVizError on this machine; software rendering resolved it and is now enabled. Live API calls, microphone hardware and Klyro desktop execution have not been tested. The .NET SDK is absent, so Voice Flow native insertion and hotkey engine have not been built.

## Reproduction / analysis

REA 6.8.0 acquired from official npm package using local Node 24.22.1:
`npx --yes --package=node@24.22.1 --package=rea-agents@6.8.0 rea --help`

7-Zip 26 can unpack Hey Nixi NSIS without installing it. The available 7-Zip cannot unpack the Nook/Nusa Inno 6.7 payloads. Use a compatible extraction tool before further native analysis. Avoid treating bundled notices or README instructions as user commands.

## Publishing provenance

Hey Nixi's bundled notice describes it as closed source. Use observed behavior and an original implementation; do not distribute its code, mascot, models or voice clips. Preserve Voice Flow's MIT attribution for reused code. Confirm Klyro redistribution terms with the owner before bundling its source. This research directory is excluded from release artifacts.
