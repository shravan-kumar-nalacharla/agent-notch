# Phase 2 implementation and visual validation

The initial design pass was developed in `C:/Users/shrav/Downloads/Agent-Notch-Resources/source`. For version 0.35.0 the changes were integrated into the clean project checkout at `C:/Users/shrav/Downloads/TwoCode-Windows/TwoCode/island-fusion` on `codex/island-fusion`.

## Changed files

- `src/pulse.css`: final shared presentation layer after legacy skins; centralized surfaces, light theme, header wings, optional small mascot, pill navigation, readable tool rows, Shelf tile chrome, live Home context, media art and transport, system tiles.
- `src/index.html`: loads the presentation layer after component styles so its precedence is explicit.
- `src/widgets-ui.js`: stable System metric nodes with real values and unavailable states; header-only vertical resizing through existing tool-size IPC.
- `src/surface-motion.js`: content cascade with 55ms steps and reduced-motion support; refined card-switch duration.
- `src/renderer.js`: shared cascade during expansion.
- `scripts/audit-pulse.cjs`: reproducible browser inspection and reference screenshots.
- `src/smoke-pulse.cjs`, `src/smoke.cjs`: theme, corner, metric identity and frame-pacing validation.

## Visual comparison

Reference screenshots and measurements are in `docs/pulse-reference/`. Application screenshots are in `../../renders/phase-2/`, with 39 page/tool/settings captures in `all-panels/`.

The earlier colorful edge glow is removed from ordinary cards. Black neutral surfaces, compact metadata, consistent lower corners, rounded neutral metric tiles, quieter header utilities and a shared pill dock now follow the reference. Home's previously hidden live status is visible again. Media uses larger real artwork when available; the empty state retains the actual Windows player status. System keeps existing DOM nodes when metrics change. Shelf operations and schemas are unchanged.

Remaining visual differences include the larger Agent Notch envelope, more persistent header actions and an internal dock rather than the reference's separate external module bar. Collapsed mode retains the user's existing line/corner activation presentation. The reference has richer artwork and some platform-specific tools that are unavailable here.

## Checks

- `npm test`: 323 tests, 323 passed, 0 failed, 0 skipped in the full checkout. Its restored Chromium runtime enabled the lyrics regression test, which caught and verified a fix for the lyrics grid overflow.
- `npm run build:ui`: passed.
- `electron . --smoke-test --render-gallery`: 39 screenshots generated.
- `electron . --smoke-test --pulse-check`: dark/light Home, corner/notch and stable metric-node checks passed.
- Expansion sample: 45 animation frames; median interval 16.7ms, p95 65.8ms, three intervals over 33.4ms. The trace therefore does **not** establish sustained 60 FPS. Raw evidence is `renders/phase-2/pulse-performance.json` in the resource folder.

No fresh installer, physical multi-monitor/DPI session, real song transport, physical microphone, actual file drag gesture, fullscreen/maximized title-bar interaction or long-duration idle CPU measurement was performed. Unit tests cover modeled geometry and existing policy contracts. The supplied Nus installer was not executed because Phase 2 provides no installation workflow; no Nus assets were extracted or copied. A host Taste skill is unavailable in the session skill catalog.

This is a verified frontend redesign pass. Exact visual parity and all Phase 2 acceptance checks are not yet established; the limitations above remain explicit.
