# Third-party source

Voice Flow cleanup prompt, Copyright (c) 2026 Saideep Reddy, MIT.
Original supplied archive: voiceflow-main.zip, commit cc41b1fc6ec187f61a009beef78f5ab34a4749d4.
The unmodified CleanupPrompt.cs and full MIT notice are in src/vendor/voiceflow.
The application adapts this prompt to Gemini, Groq and OpenAI through its own provider layer.
The native Windows worker also adapts Voice Flow.Core, Windows audio capture,
hotkey monitoring, focus detection and safe text insertion. Their full MIT license
is retained in native/vendor/VoiceFlow/LICENSE and included with the worker.
Voice Flow source is Copyright (c) 2026 Saideep Reddy.

Electron and build dependency notices are supplied by their respective packages.
Hey Nixi/Nook/Nusa artwork, voice clips and application binaries are not included in releases.
The 0.6.0 release uses the native Windows OCR and UI Automation engine for screen
capture and grounded guidance. Klyro and its Python runtime are retained only as
research/reference source and are no longer bundled or required by the app.

Bloom 3.10.1 animation presets were adapted from App.tsx at commit
8a8d6a9cf214c379dd6cb32746f6cecbc23e2e9e, https://github.com/SehajveerSingh2005/bloom.
Bloom is GPL-3.0-only. Its full license is included at src/assets/BLOOM-LICENSE.txt.
The private build retains this attribution; it does not replace the Windows taskbar
or include Bloom's original dock/backend.

Windows OCR, Speech recognition and installed voices use operating system components.
Groq Orpheus is accessed through the official API; no voice-model weights are bundled.
System.Speech, .NET, NAudio and Windows SDK components retain their respective licenses.

Nūs Desktop 0.2.7 (https://github.com/potlakai/nus-desktop), copyright (c) 2026 Pranav Desu, MIT.
The command-transcript cleanup and stop-intent classifier in src/voice-intents.cjs
are adapted from companion/src/guide/voice.js. The full license is included at
src/assets/NUS-LICENSE.txt. Speech endpoint timing and JSON step responses were
informed by renderer/app.js and companion/src/llm.js; its app, auth, telemetry,
billing, provider SDKs and binaries are not bundled.

Playwright Core, Copyright (c) Microsoft Corporation, Apache-2.0.
Its LICENSE and NOTICE are retained in the bundled playwright-core package.
The managed Chromium runtime retains its ABOUT file and built-in third-party
credits (chrome://credits). The accompanying FFmpeg runtime retains its
COPYING.LGPLv2.1 notice. These files are included with the browser resources.

Xterm.js (@xterm/xterm 6.0.0 and @xterm/addon-fit 0.11.0), MIT.
Copyright The xterm.js authors, SourceLair and Christopher Jeffrey.
Their complete LICENSE files are retained in the bundled packages.
Project: https://github.com/xtermjs/xterm.js


## ElevenLabs UI

The 17 requested ElevenLabs UI components and supporting primitives are adapted from
[elevenlabs/ui](https://github.com/elevenlabs/ui/tree/3a28ebab197f8cfa599934f52db12ad1396e54f4),
Copyright (c) 2025 Eleven Labs Inc., MIT. Full license:
`src/vendor/elevenlabs-ui-LICENSE.txt`. Source provenance and hashes:
`ui/eleven/SOURCES.json`. The React registry components now drive chat, music,
voice selection, visualization and dictation surfaces. The original orb shader
uses the existing native WebGL2 adapter. Windows media transport and native
microphone privacy retain control of playback and recording. Response uses
react-markdown instead of Streamdown. No ElevenLabs account or cloud voice
service is required. React, Motion, Radix, Lucide, react-markdown, remark-gfm,
use-stick-to-bottom and utility dependencies retain their upstream licenses;
bundler license notices are included in `src/vendor/eleven-components.js.LEGAL.txt`.

Short UI sound excerpts were provided by the application owner from their local editing pack. Redistribution rights for that pack must be confirmed by the owner before public distribution.
