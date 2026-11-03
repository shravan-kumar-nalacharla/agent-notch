# Windows acceptance report — Agent Notch 0.9.0

Current release QA: [0.10.0 notch-reminder checks](0.10.0-WINDOWS-QA.md). This document retains the0.9.0 Windows-first test history; its notification presentation is superseded by the user's0.10.0 notch request.

Date: 2026-11-03, Asia/Calcutta. Host: Windows 10.0.26300, one display at 125% scaling. Electron 44.5.1 / Node 24.21.0 / SQLite 3.53.4 in the desktop runtime; command-line Node 24.14.0. Native helper: self-contained .NET 8. All automated desktop checks use disposable profiles. The older installed tray process and its personal data were not replaced or erased.

## Executed results

| Check | Result | Evidence |
|---|---|---|
| Baseline before changes | 97 unit tests; native build; 60 desktop checks | `feature-audit.md`, 0.8.0 reports/archive |
| Final Node unit/integration suite | **139 passed, 0 failed** | `artifacts-0.9.0-tests.log` |
| Native Windows helper build | PASS, self-contained executable generated | `native/bin/IslandNative.exe`; native build output |
| Source desktop regression | **60 passed**, max center drift 0.6001 DIP | `artifacts-0.9.0-desktop.log`, `artifacts/0.9.0/report.json`, `motion.json` |
| Source Settings save/scroll/key drafts/hotkey | **15 passed** | `artifacts-0.9.0-settings.log`, settings smoke report |
| Source Gemini UI, error/cancel/consent | **11 passed**, zero cloud requests/microphone capture | `artifacts-0.9.0-gemini.log` |
| Source typed-chat speech defaults | **4 passed**, zero cloud requests | `artifacts-0.9.0-speech.log` |
| Source productivity UI | **12 passed**, real IPC/store/forms/Windows encryption | `artifacts-0.9.0-productivity.log`, `artifacts/0.9.0/productivity-ui-report.json` |
| Packaged desktop regression | **60 passed**, max center drift 0.6001 DIP | `artifacts-0.9.0-packaged-desktop.log` |
| Packaged productivity UI | **12 passed**, including actual Windows DPAPI | `artifacts-0.9.0-packaged-productivity.log` |
| Packaged Settings / Gemini / speech | **15 / 11 / 4 passed** | `artifacts-0.9.0-packaged-{settings,gemini,speech}.log` |
| Real 60-second hidden-window scheduler | **PASS delivered** after OS enabled; user confirmed **banner with sound** | Background reminder report, native status `Enabled`; `user-observed-banner.json` |

Packaged results and source/package byte verification are recorded in `artifacts/0.9.0/release-verification.txt` after the NSIS build. Do not substitute source-only tests for this check. Packaged screenshots/reports are copied to `artifacts/0.9.0/packaged/`. Release artifacts are under `release/0.9.0/`.

The UI checks automate actual Electron windows through their own trusted interfaces and inspect rendered controls and saved data. They are not claims of a human clicking native Windows toast buttons or hearing audio. The screenshot helper waits for navigation/save completion and painted frames. Provider responses in API unit tests are fixtures; the OAuth test does open a real local callback HTTP server.

## Feature acceptance and phase record

| Phase | Concrete changes | Checks and remaining risk |
|---|---|---|
| A: audit/stabilization | `feature-audit.md`; inspect installed profile, shortcut identity and native OS notification status | Water disabled and OS globally disabled confirmed. Identity valid. Initial visibility blocked; later user-enabled test delivered with banner/sound confirmed. |
| B: shared services | `productivity-store.cjs`, `reminder-time.cjs`, `reminder-engine.cjs`, `windows-reminders.cjs`, `productivity-main.cjs`, `NotificationSupport.cs`, legacy adapter | Transactional migration, unique occurrences, quiet/lock/sleep/grouping/goal/snooze/failure/action tests pass. Native physical toast actions/sound remain unverified. |
| C: books | `routines.cjs`, `routine-ui.js` | 300 pages; +4→296 remaining, +6→10, correction→7, undo; total edit280; page24 note/edit/delete/restore; explicit finish/archive; clock checkpoints; exports/backups pass. No copyrighted content download. |
| D: courses | `routines.cjs`, `course-import.cjs`, course detail | Manual40 lessons/eight completions20%; skip/revisit not mastery; reorder; timestamp12:34→754s; safe links; CSV/JSON/YouTube fixture imports pass. Live key/quota responses not exercised. |
| E: workouts | `routines.cjs`, workout detail | Five exercises/three logged remains active; pause/resume; conversions preserve session units; duplicate IDs rejected; rest rule uses shared engine; history saved. Physical rest-toast/sound not exercised. |
| F: Spotify | `spotify.cjs`, `integration-secrets.cjs`, `spotify-ui.js` | PKCE/state/refresh/disconnect/errors/rate limit/device tests; UI config and actual DPAPI roundtrip pass. Real OAuth/playback requires own client registration/account. |
| G: integration | `productivity-commands.cjs`, Gemini prepare-only tool, `productivity-i18n.js`, launcher/settings/preload/main integration | Confirmed mutation flow, five-style layout, compact centered regression and silent typed chat pass. Advanced labels intentionally use English fallback. |
| H: release | NSIS0.9.0, source ZIP/diff/checksums, this report | Packaged application smoke and byte checks recorded separately. Unsigned build. Interactive install/uninstall requires user action and remains unverified. |

Existing quotes, dormant line, optional eyes, one-second exit grace, fixed timer rings, ToDo, Shelf, generic media and previous settings/Gemini fixes are retained. New details require explicit launch. Main timer continues after the panel closes. Clean restart restores activity as paused; an abrupt crash can lose the last 15-second checkpoint of elapsed time. Saved progress/notes commit independently. Unsaved drafts need Save before quitting.

## Windows notification acceptance — delivery, banner and sound confirmed

Initially observed `HKCU\Software\Microsoft\Windows\CurrentVersion\PushNotifications\ToastEnabled=0`; WinRT reports `DisabledForUser`. Installed Start Menu shortcut uses `app.agentnotch.desktop` and populated toast activator CLSID. Native shell state is 5, but that is not proof DND is off. Water was disabled in the original profile. Existing preferences were preserved. No OS setting was changed to force a test.

The initial deadline test hid the island for 67 seconds and recorded deferred with reason “Windows notifications are disabled.” After the user enabled notifications, a fresh packaged test ran with the island hidden and recorded **delivered**, native globalEnabled=true and WinRT `Enabled`. The user answered **“Banner appeared with sound”** to the test observation question. This verifies a real background reminder banner and the tested scheduled sound, with human observation distinguished from the automatic Windows submission event. Evidence: `artifacts/0.9.0/packaged/background-reminder-report.json`, `user-observed-banner.json`, and the packaged background log. Regular Water schedules remain separately opt-in.

To reproduce this result and finish the remaining physical acceptance:

1. In Windows Settings → System → Notifications, enable notifications and Agent Notch banners/sounds. Disable DND for the test if you want a banner; the app must still respect it when enabled.
2. Install 0.9.0, open Reminders, run Diagnostics, then Test in 60 seconds. Collapse the island and leave the tray process running. Observe exactly one banner and the selected system sound. Compare Notification Center state; “submitted” still does not prove perception.
3. Enable/save Water and choose a near-future fixed time or a short custom interval inside the current window. Click +250 ml twice rapidly; total should increase only250. Test Snooze5/10/30, Dismiss, Skip today and Open item from real Windows UI. Restart after snooze; confirm no duplicates.
4. Test quiet hours, sound off, preview volume, per-category/override cues, privacy, media mute and grouping. Confirm no layered sound. Lock/sleep for three hours, then unlock; no alert flood. Test Windows DND/full-screen and a timezone/DST change.
5. Quit from tray: no reminders can run. Reopen/login startup resumes future schedules; it must not replay a backlog. App setting/startup registry tests pass, but actual Windows reboot/login remains unverified.

## Installer/data acceptance

The installer retains per-user identity and existing NSIS custom hooks. Normal uninstall registration and the prior installed shortcut were inspected. `installer/consent.nsh` retains data by default and requires two explicit interactive confirmations to remove only `$APPDATA\agent-notch`; silent/upgrade uninstall does not erase data. It also removes app-owned startup hooks. Unit tests validate hook behavior. Source review and successful NSIS compilation do not prove interactive uninstall.

Before interactive testing, export a routine backup. Test ordinary upgrade, Start Menu launch, Installed Apps uninstall with Keep data, reinstall and verify notes; separately test delete-data only on a disposable Windows user/profile. User Downloads/books/course sites must remain untouched. The production user's running older installation was not uninstalled during this task.

## NOT VERIFIED / deliberate limitations

- Physical toast buttons, other category sound profiles/preview volume, actual lock/suspend/resume and OS DND hardware interaction. The single hidden-island test banner and scheduled sound are now confirmed by the user; this does not verify every sound or action.
- Live Spotify account authorization, Premium playback, minimized Spotify device control, account eligibility and provider catalog endpoints. No developer Client ID/account credentials available. No standalone Electron music playback is advertised.
- Live YouTube public metadata/playlist API quota/permissions. Manual course workflow is verified; network behavior uses fixtures.
- Live Gemini audio, multilingual microphone recognition and insertion into third-party apps. UI/protocol tests run with no audio upload; provider accuracy is not inferred.
- Actual100/150/200% display changes, mixed-DPI dual monitors, taskbar auto-hide and screenshot/snipping z-order hardware cases. Geometry is covered by deterministic tests and a125% real display regression, not every physical setup.
- Native-speaker translation review, screen-reader behavior and extended keyboard-only review. Core five-style text fits; advanced English fallback is intentional. Existing reduced-motion and keyboard styling remain.
- Interactive0.9.0 upgrade/uninstall, login after reboot, code signing, public redistribution/licensing approval. This is an unsigned private-use build with attribution retained.

Optional embedded Spotify audio, AI note rewriting, authenticated course scraping and health-prescriptive workouts were omitted. Routine categories organize user-created plans. Course completion and exercise completion are always explicitly logged; browser playback is never inferred as mastery.
