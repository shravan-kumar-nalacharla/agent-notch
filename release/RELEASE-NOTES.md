# Agent Notch 0.22.0

File Actions now covers documents in addition to images, video and audio.

- DOCX, DOC, ODT, RTF, TXT, PPTX, XLSX and CSV can be converted to a new PDF.
- The conversion uses the installed LibreOffice (`soffice.exe`), discovered from PATH, the standard Program Files locations, or `AGENT_NOTCH_SOFFICE`.
- The original is never overwritten. No LibreOffice binary is bundled, so the installer stays under 1 GB.
- If LibreOffice is missing, the page explains the requirement.

Implementation: [src/document-tools.cjs](src/document-tools.cjs), [src/widgets-main.cjs](src/widgets-main.cjs), [src/widgets-ui.js](src/widgets-ui.js).

Verified locally: a generated DOCX converted to a 35,717-byte PDF with a valid `%PDF-` header. Packaged verification follows the built installer.

Groq remains the default assistant/transcription provider; Local (Windows, offline) remains the no-key alternative. Whisper/Parakeet model packs are still separate.
