# Agent Notch releases

Public download and automatic-update channel for **Agent Notch - a voice and screen assistant for Windows.**

This repository intentionally contains release binaries and update metadata only. Agent Notch source is private and is not published here. All rights are reserved by the copyright holder.

## Download

Use the stable link on the product site: https://shravan-kumar-nalacharla.github.io/agent-notch-site/

Or open the latest release here and use `Agent-Notch-Setup.exe`.

Verify the download against `SHA256SUMS.txt` and the `sha512` value in `latest.yml`.

## Updates

Installed builds read `latest.yml` from this repository's latest non-prerelease GitHub release. `electron-updater` downloads the NSIS package in the background. Agent Notch asks before restarting and waits while recording, capturing, using the terminal, editing unsaved settings or running a task.

## Data and privacy

Updating keeps the local profile under `%APPDATA%\agent-notch`: settings, encrypted provider keys, notes, reminders, history and SQLite data. Uninstalling keeps that profile unless the user explicitly chooses to erase it. No source archive or build evidence is uploaded here.

## Signing

The current installer is unsigned, so Windows SmartScreen may show an unknown-publisher warning. A signed release replaces it when a Windows code-signing certificate is configured in the private build pipeline.

## Notices

Required third-party notices are included with each release as `THIRD-PARTY-NOTICES.md` and inside the installed application. Do not redistribute modified builds.
