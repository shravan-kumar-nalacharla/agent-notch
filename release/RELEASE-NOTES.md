# Agent Notch 0.23.0

- Adds **Local Whisper base.en** as a dictation option when the `openai-whisper` CLI and cached model are installed.
- Groq remains the default. Local (Windows) remains available; both local options need no key and no cloud-audio consent.
- Local Whisper writes a temporary WAV, runs `whisper --model base.en --output_format txt`, and returns the text. Audio stays on the PC.
- This is a CLI integration, not a bundled model. The cached `base.en` model is about 145 MB; it is not in the installer.
- [src/local-whisper.cjs](src/local-whisper.cjs)

Verified locally: the installed Whisper CLI transcribed a generated WAV as `"Hello Agent Notch, this is a whisper test."` Packaged verification follows the built installer.
