# Agent Notch 0.27.0 — remove metadata

- File Actions adds **Remove metadata** for images, PDFs, video and audio.
- Images are decoded and re-encoded, dropping EXIF.
- Media uses FFmpeg `-map_metadata -1 -c copy`.
- PDFs clear title, author, subject, keywords and creator.
- Originals are never overwritten.
- Unit test confirms PDF title/author removal.
