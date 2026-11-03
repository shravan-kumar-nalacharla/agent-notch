> Current private build: [0.6.2 animation, voice and lean packaging](0.6.0-MOTION-VOICE.md). Klyro/Python packaging statements below are historical; the native replacement preserves screen guidance.

> Current: [0.5.0 changes and acceptance report](0.5.0-RELEASE.md). Geometry, timer, lyrics, providers and uninstall details below are historical unless reaffirmed there. This ledger does not claim full feature parity with the reference applications.

# Combined application feature ledger

Updated 2026-11-01. This is an implementation ledger, not a claim of full parity. “Implemented” means connected code exists; hardware/API checks are recorded separately. The application is not ready to publish yet.

## Evidence

- Hey Nixi 0.3.0: REA desktop inspection of extracted NSIS payload, build metadata and notices; official https://heynixi.app. Compiled Nuitka/PySide6 code was identified, not recovered as editable Python. Closed-source assets and binaries are excluded.
- Nook 0.2.1: REA installer inspection plus official MIT source tag v0.2.1, b0a1089f935d630f932483500abbeeab32cb68c6. Source behavior inspected separately from binary identity. Newer Codex features are not attributed to 0.2.1.
- Nusa: REA installer/native executable inspection; installed native Rust application and official site/source preview at https://rama2555.github.io/nusa/. UI geometry documented in NUSA-UI-REFERENCE.md. No recovered Rust source; behavioral recreation.
- Voice Flow: supplied ZIP, Windows C# and macOS Swift source, cc41b1fc6ec187f61a009beef78f5ab34a4749d4. MIT C# core/audio/hotkey/safe-insertion code reused with attribution.
- TwoCode 1.2.0-beta.3: supplied unpacked Electron source in ../resources/app; original installation unchanged.
- Klyro: source at 0de9e786033a2f76bbc5f8e4ef45b1316a2381f1. Its screen capture, Windows OCR, UI Automation and grounding modules are integrated. Major peripheral modules remain experimental. No root license was found, so the repository owner must confirm redistribution rights before public release.

REA reports are in research/evidence. Downloaded README instructions were treated as reference content, not authorization to execute them.

## Desktop and island

| Feature | Sources | Implementation / remaining verification |
|---|---|---|
| Compact black notch, concave shoulders, eyes-only companion, hover open/leave close | Nusa, Nixi | Implemented. The closed state is a 150×30 flush notch; expanded content is 620 wide. Opening includes irregular blink, greeting wave, cursor-following eyes and spring bounds. Leaving starts a cancelable 1,000 ms close timer. Pin, notch/pill/line shapes, dark/light themes and separate Settings are implemented. |
| Display selection, minimal line, hide eyes, startup, fullscreen hiding | Nusa, Nook | Implemented settings/backend; multi-monitor, DPI and fullscreen transitions need live testing. |
| Tray and keyboard shortcuts | All | Implemented. The original eyes-only icon is used in Agent Notch, its tray and installer. Open and voice-chat shortcuts are editable through validated presets; registration failures are surfaced. |
| Media session, play/pause, prev/next, artwork, seek, system volume | Nusa, Nook, TwoCode | Implemented Windows transport bridge and UI. Real session reading verified; changing playback not yet tested. |
| Synchronized lyrics, clickable seeking | Nusa | Implemented LRCLIB lookup and LRC parser; live playback synchronization unverified. |
| File shelf, multi-select, drop in, native drag out, open | Nusa, Nook | Implemented with native file icons. Drag out into an external app needs manual test. |
| Pomodoro, custom duration, short/long breaks, pause/resume | Nusa, Nook, TwoCode | Implemented and timer persistence tested. Automatic focus/break cycles pending. |
| Daily todos with date filter | Nusa, Nook | Implemented add/complete/delete/edit. Richer calendar view pending. |
| Reminders, delivery, snooze, edit | Nusa, Nook, Nixi | Implemented persistent due checking, edit, snooze and Windows notifications; restart and suspend/resume notification behavior needs live check. |
| Hydration goal, bottle, hourly chart, undo, reminders | Nusa | Implemented local-day logs, hours editor, snooze and settings. Refill count pending. |
| Weather, calendar | TwoCode, Nusa | Implemented Open-Meteo city lookup and HTTPS ICS feeds. Calendar supports basic daily/weekly recurrence; full recurrence/exceptions and event creation pending. |
| Camera mirror | Nook | Implemented explicit start/stop; stops on page exit. Hardware test pending. |
| Notes / scratchpad | Nixi, TwoCode, Voice Flow macOS | Persistent note implemented. Selection-to-scratchpad and history-to-scratchpad flow pending. |
| Clipboard history | TwoCode | Implemented opt-in text history, copy/clear, field checks; password-manager behavior needs live safety tests. |
| CPU/RAM, battery/network/caps/language data | Nook, Nusa | Native reading verified. Dedicated metrics page, GPU, Bluetooth/WiFi detail and transient HUD pending. |

## Voice

| Feature | State |
|---|---|
| Groq, Gemini, OpenAI transcription and assistant; editable models; encrypted keys | Implemented; mocked request/error tests pass. User chose Groq. Live test awaits key entered directly in Settings. |
| Native WASAPI microphone; hold to talk, double tap, hands-free, Shift command gesture, Escape cancel | Voice Flow engine integrated and compiled self-contained. Live gestures/microphone checks pending. |
| System dictation and in-island chat separation | Implemented. Ctrl+Shift+Windows defaults to global dictation with a top-center audio-reactive notch. The island microphone starts a non-inserting chat session whose transcript is sent to the assistant and whose reply appears in the chatter. |
| Segmented recording up to 20 minutes; adjacent transcript overlap removal | Implemented; merge tested. Real long recording and unplug/recovery pending. |
| Quiet speech boost, light/medium cleanup, writing styles | Implemented; cleanup context/failure fallback tested. Per-app style configuration pending. |
| Dictionary and snippets; import/export/edit | Implemented and replacement/persistence tested. Automatic correction learning pending. |
| Multilingual language code and Telugu/mixed/roman output | Implemented preferences and Voice Flow prompt rules. Multilingual resolver and multilingual audio tests pending. |
| Safe insertion: focus/password/excluded apps/elevated app/terminal newline/clipboard restoration | Original MIT Windows inserter integrated; live safety matrix pending. |
| Selected-text voice rewrite/translation/search | Pending. Current command mode answers questions; does not yet capture selected text or execute actions. |
| Dictation history, search, WPM, activity chart, app breakdown, retention/export | Implemented; persistence/statistics tests pass. Edit learning and file-tag context pending. |
| Meeting microphone + system loopback; You/Others transcript; summary/decisions/actions/questions; Markdown export | Implemented. Long summaries are chunked. Live dual-channel test, crash recovery and automatic meeting detection pending. |
| Teleprompter | Implemented scrolling, speed, font size and camera mirror. Speech-following scroll and external display window pending. |
| Offline Whisper/Parakeet, local LLM, wake word | Pending. No offline model is bundled or silently downloaded. |
| Spoken apps/sites, file search, web search, panels, safe shortcuts, media/volume, tasks/notes/timers/reminders | Implemented through an explicit command parser. Arbitrary shell text is rejected. |

## Agent monitoring and Klyro

| Feature | State |
|---|---|
| Claude Code hooks/session activity, subagent tree, tool diffs, questions, approvals | Pending. Must preserve existing hook configs, preview merges and keep approvals attached to the requesting session. |
| Cursor status; Codex activity/approvals; usage windows | Pending. Original TwoCode monitor/source available for comparison. |
| Klyro screenshot/OCR/UIA guide | Implemented and packaged with a 112.7 MB slim runtime. Provider calls stay in Electron; grounded steps render in the feature UI and support highlight/click overlays. |
| Klyro grounded computer use | Implemented per-step highlight and explicit click. The matched target is revalidated before clicking; unrestricted autonomous loops remain disabled. |
| Browser planner, Edge/Playwright, Searxng research | Pending. Klyro browser simulation must not be shipped as functioning automation. |
| Mobile pairing, remote commands and file transfer | Pending real authenticated connection and mobile client integration. |
| WhatsApp automation | Pending. No messages sent during development. |
| Video editing / aicut C++ | Pending engine build, input/output controls and actual media test. |
| ESP32 lighting | Pending device connection/protocol/settings and hardware test. |
| Local documents/PDF and retrieval | Pending parser/indexing/attachments and verification. |

## Verification / release gate

- 39 Node tests pass: providers, cleanup, expanded command routing, in-island voice chat, Klyro output parsing, editable library records, recurrence, lyrics/ICS, native RPC, segmented merge and long meeting summaries.
- Self-contained .NET 8 Windows helper compiled; real ping, system, device list and media reads succeeded.
- Source and packaged Electron smoke passes across hover-open dimensions, the listening notch, non-blocking error dismissal, pinning, floating position persistence, profile greetings and light theme, voice-chat replies, the five-page carousel, todo add/save, water goal changes, every extra widget, Agents, Settings controls and the missing-key flow.
- The native helper installs the Ctrl+Shift+Win keyboard hook and passes a deterministic begin/finish chord self-test.
- Packaged Windows screen runtime probe succeeds for capture, Windows OCR, UI Automation and grounding.
- Windows NSIS installer builds successfully. The slim OCR/vision runtime reduced the Agent Notch 0.3.0 artifact to 193.6 MB.
- Not yet checked: live API audio, actual safe typing matrix, camera, multi-monitor/high DPI, clean-machine install, sustained audio memory, agent integrations, updater/signing, product name/icon, publish rights for any additional reused components.
- Do not label this release complete until pending rows have an implementation or an explicit user-approved scope change.

## Next implementation order

1. Finish current widget interactions, native/audio safety tests and settings; package the native engine.
2. Implement real agent monitoring/approval bridge and source-derived UI.
3. Complete voice command routing, selected text, context, offline speech and teleprompter following.
4. Review remaining Klyro peripheral modules against user demand, redistribution rights and live hardware/API tests.
5. Close every remaining ledger row, run clean-install/hardware checks and prepare the rebranded installer.
