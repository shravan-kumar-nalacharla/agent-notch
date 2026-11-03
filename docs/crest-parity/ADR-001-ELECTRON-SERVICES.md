# ADR 001 — preserve the Electron and Windows service boundaries

Keep the Electron shell, sandboxed renderer, exact-window IPC checks and native .NET worker. Do not migrate to Tauri. Extend the existing library, reminder engine, media widget, task coordinator and provider store rather than introduce competing tools.

New core tools use narrowly validated, versioned requests and scoped storage. Domain logic stays in main/native code; renderers format data and submit explicit user actions. Plugins will need a separate opaque-origin frame and permission broker, not the normal preload API. Manual terminal input must not become an unrestricted agent shell. Vault/TOTP and broker integrations remain behind their separate review gates.

The reminder engine remains the scheduler and durable history for Agent Notch's own reminders. Meeting suppression feeds that engine and the HUD. Mic availability is a separate real resource policy; notification settings never unmute it. Playback controls bind to the observed media session and verify app/title before issuing commands.

Coordinates use Electron DIPs and work-area anchoring. Cursor follow requires dwell and freezes while open, recording, dragging or showing a pinned reminder. User activation temporarily overrides fullscreen rules; collapsing restores policy. Physical multi-monitor and protected-game checks remain separate from deterministic geometry tests.

These are incremental boundaries, not a speculative rewrite or a claim that the later plugin/capture/terminal milestones are already implemented.
