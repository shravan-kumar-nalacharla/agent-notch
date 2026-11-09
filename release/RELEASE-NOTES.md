# Agent Notch 0.24.0

## Blobatar, copied

The previous hand-drawn blob is replaced by the actual **Blobatar** library from
[Alain00/blobatar](https://github.com/Alain00/blobatar), vendored at
`vendor/blobatar` and bundled from its source into `src/vendor/blobatar.js`.
The notch uses Blobatar's own silhouettes, fourteen expressions, hue, custom
seed and contrast rules. Settings → Appearance exposes all ten silhouettes,
all fourteen expressions and the seed.

## Drop files on the notch

- Drag an image, video, audio file or document anywhere over the notch. The
  overlay appears and the drop opens **File actions** with that file inspected.
- A new paperclip button in the header and a **Files** button on Home open the
  same surface without dragging.
- Existing All Tools → File actions remains.

## Nashi, copied

The full [orkunisitmak/nashi-app](https://github.com/orkunisitmak/nashi-app)
working tree is vendored at `vendor/nashi-app` with its license and upstream
commit. Nashi's shipping app is Swift/WPF, so the Electron runtime uses its
file catalog and interaction model rather than executing the native app.
Image, video/audio and document actions are wired through Agent Notch's own
preload/IPC boundaries.

This first integration covers drop, inspect, image editing, media trim/convert
and document → PDF. The rest of Nashi's 27-tool catalog is tracked as follow-up
work; it is not claimed complete here.

## Verification

- 297 unit tests before this change; Blobatar and drop wiring tests are added
  with the build.
- Packaged verification follows the installer.
