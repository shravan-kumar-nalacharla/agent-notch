# Agent Notch 0.21.0

File Actions now handles **video and audio** in addition to images.

- Drop or choose an MP4/MOV/MKV/WebM/AVI video, or MP3/WAV/M4A/AAC/FLAC/OGG/Opus audio.
- If FFmpeg is installed, the page shows duration/resolution and can trim to a new MP4 or MP3. All commands use argument arrays, never a shell; the original is never overwritten.
- If FFmpeg is missing, the page says so. The app does not bundle or redistribute FFmpeg, so the installer stays under 1 GB and no GPL binary is added.
- Groq remains the default assistant/transcription provider. Local (Windows, offline) remains the no-key alternative.

Implementation: [src/media-tools.cjs](src/media-tools.cjs) (probe, argument builder, transcode), [src/widgets-main.cjs](src/widgets-main.cjs), [src/widgets-ui.js](src/widgets-ui.js).

This is a system-tool integration, not a bundled model. Document conversion and Whisper/Parakeet packs remain separate work.
