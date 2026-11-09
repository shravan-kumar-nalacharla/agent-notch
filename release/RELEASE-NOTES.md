# Agent Notch 0.26.0

- **Archive extraction**: ZIP, TAR, GZ and TGZ into a chosen folder. Rejects `..` paths, limits to 10,000 entries / 2 GB expanded.
- **Subtitles**: SRT ↔ VTT conversion, preserving cue text.
- PDF merge/split/rotate and images → PDF remain from 0.25.0.
- `src/archive-tools.cjs`, `src/subtitle-tools.cjs`, tests for both.

Remaining Nashi tools: QR, metadata, annotation/redaction, framing/collage, web download, full media suite.
