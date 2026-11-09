# Vendored upstream copies

These are full working-tree copies of the repositories named in the brief.
They are kept for feature parity, reference and license review; the Electron
runtime does not execute the native Swift/WPF app.

- Nashi: https://github.com/orkunisitmak/nashi-app at `a3ae8dbf5498bcc8c17ca5b6eb3a5276cc756ef5` (MIT).
  Full source is in `nashi-app/`; the Windows implementation is under
  `nashi-app/windows/` (WPF/.NET). Its file catalog and interaction model are
  the reference for Agent Notch's File Actions.
- Blobatar: https://github.com/Alain00/blobatar at `44bdffda5c956563eed11dacfc4bb982e5f333f7` (MIT).
  Full source is in `blobatar/`. The browser bundle used by the notch is built
  from `blobatar/packages/blobatar/src` into `../../src/vendor/blobatar.js`.

Both upstream `LICENSE` files are retained. Blobatar's license is also copied
next to the runtime bundle as `src/vendor/blobatar.LICENSE.txt`.
