# Agent Notch 0.31.0 — detached File Studio

Dropping a file on the notch opens a separate, resizable Windows window. The notch stays compact and no file editor is rendered inside it.

- Multi-file queue with thumbnails, add and remove.
- Image crop/resize/rotate/flip with real pixel exports.
- Video trim/crop/mute/speed/snapshot using FFmpeg.
- PDF.js page rendering, thumbnails, rotate/delete/duplicate/reorder, PDF save and page-to-PNG export.
- Window bounds persist; Studio uses a restricted `window.studio` API.
- Original files are never overwritten.
