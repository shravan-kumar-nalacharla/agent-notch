# Agent Notch 0.40.0

- Voice assistant stays in listening mode across replies until Stop, Escape or mute. Capture resumes after speech playback to avoid recording the assistant's own reply.
- Selecting a voice preserves the ElevenLabs orb. Picker rows no longer exhaust WebGL contexts, and reply controls no longer overlap.
- Separate providers and models for chat, voice recognition, voice answers and agentic tasks; expanded voice presets and Grok support.
- Theme and contrast improvements across settings, controls and File Studio. Compact media volume and stable lyric transitions.
- Looping Quick Access with an always-visible add button, compact first-open Home and a 300 ms close delay.

Updates preserve saved keys, settings, notes and history. This Windows installer is unsigned, as with the previous public build.

Verification: 344 unit tests passed, two GUI-dependent tests skipped; 21 packaged interface checks passed. Physical microphone and acoustic echo behavior need a hardware check.
