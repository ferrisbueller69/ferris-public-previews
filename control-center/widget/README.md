# Ferris Control Center — Multi-Mac Setup

This package installs the same Übersicht widget on any Mac user account.

## Current mode
- Local/shared mode: reads from `dataPath` in `/Users/Shared/FerrisControlCenter/config.json`
- Remote/live mode: if `dataUrl` is set, the widget fetches from that URL every 30 seconds.

## Install on another Mac/login
1. Install Übersicht.
2. Copy this `multi-mac/` folder to the target Mac.
3. Run `./install-widget.sh`.
4. Edit `/Users/Shared/FerrisControlCenter/config.json`:
   - set `dataPath` for local/synced-file mode, or
   - set `dataUrl` for true multi-Mac live mode.

## Best live setup
Use one shared hosted JSON endpoint and point all Macs at the same `dataUrl`.
