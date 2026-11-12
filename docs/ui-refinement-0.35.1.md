# UI refinement 0.35.1

Quick Access has one dotted plus tile. Empty state copy disappears after the first item. File drops have one owner: Home/Quick Access receives pinned paths; other surfaces receive Shelf items. Dropping no longer opens File Studio. The file actions button still opens File Studio explicitly.

The provided recordings informed the tool-name wheel and a 480ms damped panel resize. Native window space is held for 520ms during shrink, and user-selected panel sizes still override automatic tool sizes. Tool-list scrolling is smoothed in its actual inner scroll container and capped at 18px per wheel event with bounded accumulated travel.

The timer and other panels use shared accent lighting. Appearance now stores a validated accent color and one of four system font stacks. Timer duration controls have room below the action row; chat uses a flex input row with a centered 30px send button. The brand placeholder and routine transcript block are removed from normal chat, while review drafts remain accessible and History opens the existing history tool.

Assistant text reveals progressively, with reduced-motion preferences showing complete text immediately. Browser regression tests verify both paths. Phosphor 2.1.1 assets are sourced from jsDelivr, bundled locally, and retain their MIT license in `src/vendor/phosphor/LICENSE`.

Verification: `npm run build:ui` succeeded; `npm test` passed all 325 tests. Electron `--smoke-test --refinement-check` verified real file drops into Quick Access/Shelf without opening File Studio, empty-state replacement, timer fit, send alignment, color/font persistence, icon loading and 18.4px measured wheel travel. The desktop has reduced motion enabled; progressive typing was separately verified with reduced motion disabled in Chromium.

Screenshots and detailed smoke evidence are in `C:/Users/shrav/Downloads/Agent-Notch-Resources/renders/refinement-v2/`. The final packaged build is under `C:/Users/shrav/Downloads/Agent-Notch-Resources/builds/0.35.1/`; F: ran out of space during an earlier attempt. No existing user build was deleted and no public installer release is published by this development push.
