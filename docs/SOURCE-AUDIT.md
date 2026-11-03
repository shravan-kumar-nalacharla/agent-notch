# Source audit

Audit date: 2026-11-01. The canonical source is this repository. The generated
0.2.0 installer was inspected and then superseded by the source changes below.

## Feature matrix

| Area | State | Evidence |
|---|---|---|
| Provider chat and transcription | Working with mocked HTTP; live account use unverified | `src/providers.cjs`, `tests/providers.test.cjs` |
| Native microphone, insertion and clipboard fallback | Implemented; physical microphone and insertion matrix unverified | `native/IslandNative/Program.cs`, VoiceFlow sources |
| Separate global dictation and in-island chat | Working; chat event contract tested | `src/voice-main.cjs`, `tests/voice-main.test.cjs` |
| Ctrl+Shift+Win chord | Native hook installation and deterministic chord self-test pass | `HotkeyProcessor.cs`, `voice.diagnostics` |
| Error visibility | Broken in 0.2.0 and fixed here | `src/renderer.js`; one-second non-blocking toast |
| Hover-close timing | Changed to one cancelable 1,000 ms timer per current specification | `src/renderer.js` |
| Pin, profile name, shapes and theme | Implemented and smoke-tested | `src/main.cjs`, `src/renderer.js`, `src/preferences.js` |
| Floating pill drag | Implemented; position persistence smoke-tested | `src/main.cjs`, `src/style.css` |
| Media, Pomodoro, Shelf, Water and Todo carousel | Implemented with functional controls | `src/widgets-ui.js`, `src/widgets.css`, `src/library.cjs` |
| Other shipped widgets | Preserved behind All Tools | `src/widgets-ui.js`, `src/widgets-main.cjs` |
| Screen guidance and grounded click | Implemented; provider call requires user API key | `src/klyro.cjs`, `src/main.cjs` |
| Agent approvals | Implemented for Claude Code | `src/agents.cjs`, `tests/agents.test.cjs` |
| Cursor and Codex monitoring | Missing | No supported local event contract is installed |
| Offline ASR, local LLM and wake word | Missing | No model runtime is bundled |
| Mobile, WhatsApp, video editing and ESP32 modules | Missing | Experimental in the reference source and not required by current Windows UI |

## Persisted data

- `settings.json`: provider choices/models, encrypted keys, voice preferences, appearance, profile name and shortcuts.
- `library.json`: todos, reminders, water, shelf references, projects, dictionary, snippets, history, meetings, clipboard entries, focus sessions and teleprompter.
- `agent-token`: secret for the loopback Claude hook endpoint.

Writes use temporary files followed by rename. Existing Island Fusion data is
migrated by copying only these app-owned files.

## Native contract

`NativeClient` sends newline-delimited JSON to `IslandNative.exe`. Responses use
the same request id and an `ok` flag. Displays, microphones, media transport,
screen capture, safe insertion and meeting capture stay in the native process;
renderer access is limited to the validated preload bridge.

## Security boundaries

- Renderer sandbox and context isolation are enabled.
- IPC rejects every sender other than the two application windows.
- Provider keys remain in the main process and use Electron `safeStorage`.
- Agent events require a local secret and reject browser origins.
- Meeting capture is explicit and requires user consent.
- Screen targets are revalidated before a grounded click.
