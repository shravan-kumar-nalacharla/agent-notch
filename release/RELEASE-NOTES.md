# Agent Notch 0.19.0

Agent Notch 0.19.0 fixes the post-0.18.0 issues and starts the file and agent-face work.

- **API keys are removed on uninstall.** Provider keys, integration secrets and the local agent token are scrubbed even when notes and history are kept. Keys live in the Windows profile, not in the installer.
- **Lyrics stop re-animating.** Only the current and previous full lines render. The current line slides in once and stays still; word-level repainting is removed from the fallback surface too.
- **Agent Face.** Settings → Appearance adds a blob companion with five shapes, hue, five expressions, live preview and a click reaction.
- **File actions.** All Tools → File actions accepts a dropped or chosen image, shows its size, converts PNG/JPEG and optionally resizes to a new file. The original is never overwritten.
- **PRD published** for Nashi-style file tools, Blobatar-shaped faces, Rune/Astryx UI evaluation and optional Handy/Whisper offline speech. Video/audio/document packs and offline models are not bundled yet.

Automatic updates continue from 0.18.0. The installer is unsigned; verify the published checksums. The stable alias is `Agent-Notch-Setup.exe`.
