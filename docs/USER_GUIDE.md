# Agent Notch user guide

## Open and arrange the island

- Move the pointer to the faint top-center activation line to open Agent Notch. The idle state has no eyes or black panel.
- Leave the pointer outside the panel for one second to close it. Returning or interacting with the panel cancels the close.
- Use the pin button to keep the island open.
- Settings > Island changes the notch shape, theme, display, startup behavior, user name and open shortcut.
- In Floating Pill mode, drag the expanded island by its top text area.
- In Settings > Island, choose compact/default/roomy density, line opacity/size, hover intent, close grace and standard/subtle/off motion. The default panel is 470 × 250 DIP. Lyrics expand only when requested.

## System-wide dictation

1. Open Settings > Providers and save a transcription key for Groq, OpenAI or Gemini.
2. Open Settings > Voice and enable the global dictation hotkey.
3. Hold `Ctrl + Shift + Windows` and speak. An audio-reactive notch appears while recording.
4. Release the chord to transcribe, clean and insert into the application where recording began.

The native helper rejects password fields and excluded apps. Escape cancels an active session. The alternate Right Alt and Right Ctrl chords are available when the Windows chord conflicts with a keyboard layout or system utility.

## Voice chat inside Agent Notch

Click the microphone in Agent Notch to start an in-app voice conversation. The transcript is sent to the selected assistant model and the reply appears in the Assistant view. It does not type into another application.

The optional voice-chat shortcut is separate from system dictation. Change it under Settings > Island.

## Companion name, wake and natural voice (0.6.0)

Open Settings → Voice. Choose a companion name, for example **Cutie**, and save. Enable **Listen for hey + companion name** to use **hey Cutie**. This uses the default Windows microphone and installed speech recognizer locally. Listening stays off until enabled. Use **Wake engine status** to check that a recognizer is available. Saying the name opens in-island chat, speaks a greeting, and listens to your next question; a short pause ends the question. The global dictation shortcut still types into the previously focused app.

**Groq Orpheus — natural voice** uses the Groq key saved in Providers. Choose Hannah, Diana, Autumn, Austin, Daniel or Troy, then **Save & hear voice**. It downloads no model. Response text goes to Groq for synthesis; audio is played from memory. Use the square Stop button to stop a reply. Installed Windows voices remain an explicit offline fallback. If a saved key cannot be read or the provider rejects it, enter it again in Providers and use Save & test.

**Quiet Moments:** by default a small quote appears shortly after startup, then every five minutes when the island is available. Settings controls all-day delivery, interval, cap, category and DND. Voice/focus/fullscreen/Settings activity can defer a quote. The idle line returns after the quote folds away. The app does not perform sleeping or animated “hi” routines.

**Animation:** Standard explicitly enables spring motion, even if Windows animation effects are disabled. Choose Subtle or Off if preferred. The moving gradient follows the entire edge of the island.

## Provider selection

Agent Notch supports Gemini, Groq and OpenAI for the existing speech and screen features. DeepSeek supports assistant chat and transcript cleanup using its official endpoint, not speech recognition or vision. Use a separate vision provider for screen guidance. Keys are encrypted with Windows secure storage and never exposed to the renderer. Use **Save & test** after entering a key; it makes a real provider request. DeepSeek streaming can be stopped with the conversation's Stop control. Token counts are session diagnostics, not a price estimate.

## Quiet Moments and removal

Optional original, unattributed reflections appear in the island. Version 0.6.0 adds scheduled small quote cards and all-day intervals; see the controls above. Recording and running focus sessions suppress them. Dismiss or favorite the current line. No quotation API is used.

Settings > About shows the registered installation and opens its actual Windows uninstaller after confirmation. Portable/unpacked copies explain that installation is required. Windows Settings > Apps or Control Panel > Programs and Features can also start removal. Personal data is retained by default; choose the explicit erase option only if you want saved keys, settings and history removed. Shared applications and shelf documents are not erased.

## Diagnostics

Settings > Diagnostics reports:

- Native helper readiness and keyboard-hook state.
- The configured dictation chord and a deterministic begin/finish self-test.
- Detected microphones.
- Speech and assistant key availability.
- Last target window and active recording state.
- Electron shortcut registration failures.

## Troubleshooting

- **No key configured:** save a key under Settings > Providers. The app does not silently fall back to another provider.
- **No speech heard:** verify the selected microphone in Windows privacy settings, speak after the listening notch appears, and rerun Diagnostics.
- **Dictation types nowhere:** focus the destination field before starting dictation. Password fields and elevated windows are intentionally blocked.
- **Shortcut does not work:** check the chord self-test and the fallback chord in Settings > Voice.
- **No media:** Agent Notch uses the Windows media session. Play media in an app that appears in the Windows media overlay.
- **Lyrics unavailable:** lyrics come from LRCLIB and may not exist for local or very new tracks.

## Changes in 0.4.0

Use **Save changes** at the bottom of Settings from any section; wait for **Changes saved**. In **Island**, check the tools you want in the bottom menu (up to eight extras).

**Focus Time** is the single focus surface. Set minutes and choose **Start focus**, or use its main play/pause control. The **Stopwatch** tab counts upward until paused or reset. Break presets are on the same surface.

**Shelf:** use the small trash button on a file to remove its reference, or **Clear shelf**. Original files stay on disk. **Clipboard:** enable local history, then use Copy, individual Delete, or Clear history; up to 500 entries are retained.

**Water:** enable reminders with the toggle, then open Settings. **Fit daily goal** spaces drink notifications across your active hours using your bottle size and goal. **Custom interval** lets you pick minutes. Use Drink to log water and Undo to reverse the last log. Notifications stop after the goal is met.

**Teleprompter:** paste a script and click Start. It saves and scrolls the current text in the preview; Pause and Reset control playback. Speed is pixels per second. **Mirror:** Start camera opens a square crop; leaving the page stops the camera.

**Lyrics:** open Media while a song is playing, then click Lyrics. The app matches track metadata with LRCLIB. Some videos, trailers and tracks have no matching lyrics. Synchronized lines follow playback; click a line to seek when the player supports it.

Quit the previous Agent Notch from its tray menu before launching a newly built version, since both use the same profile and single-instance lock.
