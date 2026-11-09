# Agent Notch 0.25.0 — Nashi PDF actions

- File actions accepts PDFs and shows the page count.
- **Merge PDFs**: choose multiple PDFs, save one merged document.
- **Split pages**: write one PDF per page into a chosen folder.
- **Rotate PDF**: 90°/180°/270° into a new file.
- **Images → PDF**: choose PNG/JPEG images and create one PDF.
- All operations use `pdf-lib` locally; originals are not overwritten.
- Added `src/pdf-tools.cjs` and `tests/pdf-tools.test.cjs`.

Verified locally: two one-page PDFs merged to two pages, split back into two files, and rotated to 90°.

This continues the Nashi port. Archive extraction, QR, metadata, annotation/redaction, collage/framing, web download and the full media suite remain.
