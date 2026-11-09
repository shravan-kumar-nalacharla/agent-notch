# Agent Notch 0.20.0

Agent Notch 0.20.0 adds an optional local speech path that needs no API key.

- **Local (Windows, offline)** is now selectable as the dictation provider. It uses the speech recognizer already installed in Windows. Audio stays on the PC and no cloud-audio consent or provider key is required.
- Cloud transcription remains the default and is unchanged. Quality and supported languages depend on the installed Windows speech pack; this is not a Whisper/Parakeet model.
- The native helper exposes `voice.local` only to the main process. Audio is capped at 6 MB per segment, and the recognizer runs off the UI thread.
- The 0.19.0 fixes remain: uninstall scrubs saved API keys, lyrics render only current/previous full lines without per-word re-animation, Agent Face is customizable, and File actions converts/resizes images locally.

The installer remains unsigned. Verify the checksums. The stable alias is `Agent-Notch-Setup.exe`.
