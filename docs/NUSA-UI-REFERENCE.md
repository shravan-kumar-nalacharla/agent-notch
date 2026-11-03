# Nusa interface reference — 2026-11-01

Reference: installed C:/Users/shrav/AppData/Local/Programs/Nusa/nusa.exe (909,312 bytes), SHA-256 2dfa517fe20fb944cd263597e9f731b8245fc2b5253d9f1a241221636e8d1bdb.
REA inspect-managed-artifact confirms a native x64 PE with no managed CLI metadata. It does not recover the Rust implementation. Static strings identify NotchWindow, Segoe UI, NusaShelf, media lyrics, focus and water-reminder controls.

The installed native window did not expose a targetable window through the computer-use inventory. For visual geometry the official interactive preview was inspected instead:
- https://rama2555.github.io/nusa/
- https://github.com/rama2555/nusa (reference checkout under research/nusa-reference)
- preview CSS .mn, .mn::before/after, .l-hdr, .dots, .l-pomo

Observed exact reference dimensions: resting 150 × 30; normal widgets 420 × 140; lyrics 520 × 140. Black background, top edge attachment, bottom radii 14 closed / 32 expanded, concave shoulders 10 / 22. Segoe UI Variable Text; small gray secondary labels, circular controls, bottom page navigation, white eyes with blue ambient glow. Hover opens, moving away closes; gear/tray opens a separate Settings window.

Implemented matching geometry and visual conventions. The assistant/notes panels grow to fit content, while focus retains the 420 × 140 widget footprint. Window bounds include transparent shoulder margins; Windows DPI scaling can round those bounds by 1–2 device-independent pixels. Feature-specific controls remain original implementations. Nusa application code, branding, media and assets are not bundled.

Input fixes: remove the unlabeled dot in favor of an actual microphone icon and recording labels; open Settings and show an error when a key is missing; refresh credential configuration after returning from Settings; expose Settings from the gear, right-click and tray; keep the overlay above other topmost windows. Face-click always opens, avoiding a hover-open/click-close race.

Smoke test now verifies closed dimensions, expansion, focus resize, separate Settings load, provider selectors and missing-key microphone behavior without recording audio or uploading anything.
