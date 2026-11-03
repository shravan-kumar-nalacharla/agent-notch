# Implementation ledger

Phase 0: reference pinned at 6adc2936404d7b3b326028939bd780e34be6f0dd, licensing decision and 64-row matrix recorded; 204 baseline tests passed. Commit 5da942b preserves the previously uncommitted source baseline.

Phase 1 currently implements labelled notch Mute/Unmute, separate disabled Start voice while muted, Meeting/Gaming suppression in the shared reminder policy and HUD, memory-only clipboard with legacy purge, work-area centering and cursor dwell, per-app fullscreen/maximized policy, media pinning/session-bound controls/capability flags, LRC word/offset parsing, manual lyric timing adjustment and settings search. Native code compiles. The current suite passes 210 tests, and six real Electron smoke scenarios pass; media interaction uses fixture sessions in that UI check. No claim is made of real two-player transport testing, physical monitor switching or a Discord call.

Remaining phases are still work, not shipped features: core utilities/launcher, secure calendar/cache/join, capture/recording/local OCR, manual native terminal, hardware and documented provider balances; then notification CLI/parts/history, authorized Discord capabilities, themes/onboarding/portable mode, downloads, ambient sounds and an isolated plugin host/sample. Vault/TOTP and portfolio require the separate reviews in the supplied brief. Update the matrix with per-feature evidence as implementations land.

The original running desktop app was 0.12.0. Producing a new installer alone did not upgrade that process; the final deployment must close the old instance gracefully and open the tested new build so the user actually receives the mute control.
