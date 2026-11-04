# Agent Notch

0.15.0 fixes More Tools jumping back to the top during background updates. It adds a reviewed manual ConPTY terminal, advanced-tool size presets and pending-reminder badges that preserve input focus. See [implementation and verification](docs/crest-parity/PHASE3_CHECKPOINT.md). This is a partial checkpoint of the 64-feature expansion.

0.14.0 adds the labelled notch Mute/Unmute button, core workspace utilities, local screenshots/OCR, encrypted multi-feed calendar, supported provider integrations and window/media reliability improvements. See [core-tools scope and limits](docs/crest-parity/PHASE2_CHECKPOINT.md).

0.13.0 adds persisted microphone mute, manual activation by default, held-key Push-to-Talk, Gaming / Meeting Mode, configurable mute shortcuts and managed browser tasks with verified navigation. Microphone preferences use the main Save changes action. See [privacy, browser architecture and test limits](docs/0.13.0-PRIVACY-AND-BROWSER.md). Installer: `release/0.13.0/Agent Notch Setup 0.13.0.exe` (unsigned).

0.12.0 restores Groq as the default assistant/transcription provider, keeps Gemini Live optional, adds five independent saved-key fields with Show/Hide, simplifies Settings into separate sections with toggle switches, and fixes the dictation gradient gaps. Keys remain encrypted and survive Save/reopening. See [settings, migration and validation](docs/0.12.0-SETTINGS-AND-GROQ.md). Installer: `release/0.12.0/Agent Notch Setup 0.12.0.exe` (unsigned).

0.11.0 adds multi-step Windows tasks to chat and voice, browser-aware compound commands, native control inspection/actions, progress, Stop and concrete action review. Simple launches bypass model planning; Gemini Live can keep talking while a task runs. Includes analysis and selected MIT-licensed voice adaptations from the supplied Nūs source. See [Windows tasks, latency changes, Nūs analysis and limits](docs/0.11.0-WINDOWS-TASKS.md). Installer: `release/0.11.0/Agent Notch Setup 0.11.0.exe` (unsigned).

0.10.1 fixes Spotify incorrectly showing Connected after profile/API authorization fails. Verification is required before connection/playback UI is enabled; incomplete sessions can be reset, and provider Premium/allowlist requirements are explained. See [Spotify access fix and recovery](docs/0.10.1-SPOTIFY-ACCESS.md). Installer: `release/0.10.1/Agent Notch Setup 0.10.1.exe` (unsigned). The notch reminders and workout plans from0.10.0 are retained.

0.10.0 makes reminders appear **at the notch** with the user's looping bottle, droplet, book and treadmill GIFs. Water has Refill/Drink/Snooze; reading and workouts stay pinned with main-process timers until completed, snoozed or cancelled. Adds editable treadmill/dumbbell/mixed plans, global off/busy controls and optional Windows delivery with no duplicate toast. See [release notes](docs/0.10.0-NOTCH-REMINDERS.md), [all-frame video analysis](docs/0.10.0-VIDEO-ANALYSIS.md) and [Windows QA](docs/0.10.0-WINDOWS-QA.md). Installer: `release/0.10.0/Agent Notch Setup 0.10.0.exe` (unsigned).

0.9.0 adds Reading, Courses, Workouts, durable background water/reminders and optional Spotify Connect. Saved tracking data uses transactional SQLite with migration backups and export/restore. Start with the [release notes](docs/0.9.0-RELEASE-NOTES.md), [reminder architecture](docs/reminder-architecture.md), [Spotify setup](docs/spotify-integration.md) and [Windows QA report](docs/manual-windows-qa.md). Installer: `release/0.9.0/Agent Notch Setup 0.9.0.exe` (unsigned). After the user enabled Windows notifications, the packaged hidden-island test delivered a real reminder; the user confirmed its banner and sound. Physical toast buttons and live account integrations remain unverified.

0.8.0 adds Gemini Live voice conversation using the existing native microphone, streamed spoken replies, transcripts and interruption handling. Enter a Gemini key in Providers, then select Gemini Live in Voice settings and enable cloud audio plus Read assistant answers aloud. Global dictation keeps its existing speech provider. See [Gemini setup and verification](docs/0.8.0-GEMINI-LIVE.md). Installer: `release/0.8.0/Agent Notch Setup 0.8.0.exe` (unsigned).

0.7.2 separates spoken voice-chat replies from typed-chat read-aloud, defaults to installed Windows speech, and explains Groq voice errors with a local fallback. See [speech-output fixes and manual setup](docs/0.7.2-SPEECH-OUTPUT.md). Installer: `release/0.7.2/Agent Notch Setup 0.7.2.exe` (unsigned).

0.7.1 fixes settings saves, global voice-hotkey activation, API-key draft preservation, settings scrolling and screenshot-overlay hiding. Start with Windows now persists and registers the current executable correctly. See [the save and Windows fix report](docs/0.7.1-SAVE-FIX.md). Installer: `release/0.7.1/Agent Notch Setup 0.7.1.exe` (unsigned).

0.7.0 adds the curated offline collection of 129 ideas in English, Hindi, Telugu, Hinglish and Tenglish. Open **Settings → Languages & Voice** to choose app, quote, recognition, dictation and reply languages independently; **Thought library** offers search, favorites, hide/undo and versioned localization corrections. Quotes stay inside the compact island and never open it at startup. Cloud audio requires explicit consent. Deepgram Nova-3 joins the existing speech providers, and uncertain or script-changing dictation requires review before insertion. This is an unsigned localization preview; see [implementation and verification](docs/0.7.0-MULTILINGUAL.md) for limitations and the installer location.

Agent Notch 0.7.0 is a compact Windows desktop island. The original TwoCode installation is not the application base.

0.6.2 adds spring reveal/collapse, sliding tools, a moving perimeter gradient, scheduled quotes, a configurable wake name and Groq natural speech. It fixes unfocused-window animation throttling and late-event shutdown errors, and removes the Python screen runtime. See [changes, frame analysis and verification](docs/0.6.0-MOTION-VOICE.md). Installer: `F:\AgentNotch-builds\0.6.2\Agent Notch Setup 0.6.2.exe`.

See [0.5.0 changes and acceptance report](docs/0.5.0-RELEASE.md) for the preceding feature release and unverified cases; the Settings visibility claim is superseded by the 0.5.1 regression fix above. This build is for private desktop use. Bloom attribution and its license are retained; the installer is unsigned.

Read [the current feature-completion ledger](docs/FEATURE-COMPLETION.md) for evidence, implemented features and remaining work. The consolidated application and Windows installer build successfully; code signing and redistribution confirmation remain release blockers.

## Run

Node.js and npm are required for development:

```
npm ci
npm run build:native
npm start
```

Agent Notch rests as a faint 100 × 2 DIP activation line without eyes. Deliberate hover opens a centered 470 × 250 DIP panel; explicitly expanded lyrics may use 315 DIP of height. Compact/default/roomy densities, hover intent, cancelable one-second close grace, motion and line appearance are configurable. Pinning keeps it open. Media, Focus Time/Stopwatch, Water, Shelf and Todo form the carousel; All Tools preserves the other modules and the bottom navigation stays visible. The default open shortcut is Ctrl+Shift+Space. Your profile name is used in greetings.

In Settings, select assistant and transcription providers independently. Gemini, Groq and OpenAI support the existing speech pipeline. Official DeepSeek is available for assistant chat and cleanup, including streaming and cancellation; it is not a speech or vision provider. Select a separate vision provider for screen guidance. Defaults are editable; availability depends on the account. Requests go directly from the Electron main process to the selected provider. The renderer cannot read stored credentials.

System-wide dictation uses the integrated MIT speech engine and defaults to Ctrl+Shift+Windows. A compact audio-wave notch appears at the top while it listens, then safely types into the application where recording began. Hands-free, selected-text editing, cleanup, dictionary/snippets and language/Telugu controls remain available. Segments are uploaded while recording and when you stop; raw audio is not retained.

The notch microphone is separate: it starts in-island voice chat. It never inserts text into another app. The transcript is sent to the selected assistant and the reply appears in the Assistant conversation, just like typed chat. Voice chat has its own optional shortcut, initially Ctrl+Shift+Alt+Space, and can always be started by clicking the microphone.

Widgets include media/lyrics/volume, file shelf with native icons, editable daily tasks, editable reminders, hydration with hours and snooze controls, timers, clipboard, editable dictionary and snippets, history/insights, meeting notes, projects, weather/calendar, camera mirror and a mirrored/font-adjustable teleprompter. Notes and widget data persist locally. Camera and clipboard capture require explicit in-app activation. Meetings can capture microphone and system audio, then save summaries/transcripts as Markdown.

Assistant commands include "timer for 5 minutes", "remind me in 10 minutes to stretch", "add task review notes", "note call tomorrow", "volume 40 percent", "next song", "open example.com", "open Firefox", "find file report", "search the web for Windows audio devices", "show my notes", and safe shortcut commands such as "press the keyboard shortcut copy". Commands use defined operations; they never execute arbitrary shell text.

Agents shows Claude Code sessions, tool activity/diffs, subagents, plans/questions and individual approvals. Set up previews the hook settings merge. Apply creates a dated backup and refuses if the file changed after preview. No existing hooks are installed or altered automatically. Claude Code must load/review its hooks after setup. Codex/Cursor support and usage reporting remain pending.

Screen guidance uses the native Windows capture, OCR and UI Automation engine; the provider stays in the Electron main process. Each grounded step can be highlighted or clicked only after an explicit user click, after which the target is revalidated. It never follows instructions printed on the screen.

## Verify / package

```
npm test
npm start -- --smoke-test
npm run pack
npm run dist
```

The smoke test launches an isolated temporary profile and checks hover-open dimensions, the listening notch, non-blocking auto-dismissing errors, pinning, profile greetings, in-island voice replies, every widget panel, Agents, all Settings sections, provider-test and Settings-close controls, and the missing-key flow. It writes screenshots under `artifacts` (packaged builds use the system temp folder). Packaging includes the self-contained Windows engine and its license, so the end user does not need .NET installed. If the .NET 8 SDK is absent, packaging reuses the verified native binary already under `native/bin`.

The current installer and `SHA256SUMS.txt` are in `F:\AgentNotch-builds\0.6.2`. It is unsigned. Quit the older tray instance before upgrading. Windows uninstall retains personal data by default; interactive removal offers an explicit erase choice. See the release report for tested install/uninstall paths and remaining gaps.

## 0.4.0 interface and tool fixes

See [changes and validation](docs/0.4.0-CHANGES.md) for the fixed-size centered surface, persistent configurable dock, chat sizing, Focus Time/stopwatch, clipboard and shelf removal, hydration scheduling, lyrics and teleprompter fixes. The user guide covers the new controls.

## Research dependencies

`research/voiceflow-main` is the supplied MIT Voice Flow source. `research/Klyro` is a pinned source checkout. `research/nook` is official source tag v0.2.1. REA reports for each supplied product are retained in research/evidence; TwoCode source analysis reached its deadline and contains partial evidence. Klyro's screen guide uses native/klyro_worker.py over its real OCR/UIA/grounding modules. It deliberately excludes the original router, which can automatically switch into execution. Version 0.6.0 ports the screen workflow to the native Windows engine and no longer bundles or needs Python. The legacy worker stays in research/source for reference. Screen context goes only to the selected provider. Research binaries/artwork are excluded from release artifacts.
