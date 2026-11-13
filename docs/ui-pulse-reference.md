# Pulse reference inspection — 13 November 2026

Inspected in real headless Google Chrome through Playwright, with JavaScript enabled. Reproduce with `node scripts/audit-pulse.cjs`.

The homepage contains the exact `.pg-scope.pg-island-wrap` selector (one match). The standalone `/playground` contains `.pg-island-wrap` (one match), without `pg-scope`. The live playground supplied the interactive measurements. No website source or artwork is vendored; saved artifacts contain screenshots and computed style observations only.

## Verified hierarchy

```
pg-root
  pg-menubar (desktop simulation)
  pg-notch-stage (centered)
    pg-notch (physical-notch simulation)
    pg-island-wrap
      pg-island (role=button, tabindex, aria-expanded)
        persistent background / state opacity layers
        compact artwork wing / central spacer / equalizer wing
        expanded header and optional pg-header-link
        pg-card (active module, absolute-positioned)
          media artwork / title / artist / timeline / transport
          OR pg-hud-tile metric grid
          OR pg-tile Shelf file tiles
        pg-iconbar
          pg-iconbar-btn / is-on / pg-iconbar-lens
```

SVG icons and dynamically mounted card contents sit below these nodes. The reference includes external desktop chrome and dock that do not belong inside Agent Notch.

## Measurements

| Property | Observed |
|---|---|
| Collapsed shell | 281 × 32 px |
| Compact media sample, first run | 430 × 170 px |
| Expanded sample, second run | 600 × 270 px |
| Lower shell radius | 18 px idle; 28 px settled expanded |
| Card inset, compact sample | 6px 20px 12px |
| Shadow | 0 6px 11px rgba(0,0,0,.26) idle; 0 6px 20px expanded |
| Main surface | Black, with separate background layer |
| Header | 11px / 700 / 13.2px line height |
| Track | 13.5px / 700 / 16.2px line height |
| Artist | 11px / 500 / white at .6 alpha |
| Time values | 9.5px monospace, white at .6 alpha |
| Overflow | Hidden on shell; visible on inner pg-card |
| Pseudo-elements | No generated content on inspected shell |

Different runs produced different settled expansion sizes, so these are state samples, not a universal fixed size. Complete component observations, including font stacks, transforms, borders, positioning, pointer behavior and inherited values, are in [measurements.json](pulse-reference/measurements.json).

## Captured states and motion

Screenshots: `pulse-reference/{idle,hover,expanded,system,shelf,focus,weather,media,pinned-or-closed}.png`.

Hover inserts expanded card content and changes shell size/radius continuously. Scroll, module buttons and departure were exercised. The System, Shelf, Timer, Weather and Media states were reached using actual module controls. The click/departure sequence closed the reference; it did not establish a persistent pinned state. Exact spring constants, 55ms stagger, interruption behavior and loading states were not verified from the browser sample. The 55ms cascade in Agent Notch is an adaptation from the requested motion direction.

## Windows adaptation

Agent Notch keeps its native monitor anchor, work-area geometry, hit testing, reminder ownership and optional mascot. Its existing 470 × 250 default envelope and 315px media height accommodate Windows controls, the privacy button, more navigation actions and source selection. The reference's macOS menu bar, AirDrop controls, branding, songs and artwork are not reproduced as fake Windows features. The Mobbin reference informs neutral light surfaces and restrained pill controls; Windows system typography remains Segoe UI.
