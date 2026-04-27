#!/bin/zsh
set -euo pipefail
WROOT="$HOME/Library/Application Support/Übersicht/widgets"
mkdir -p "$WROOT"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "$SCRIPT_DIR/ferris-control-center.jsx" "$WROOT/ferris-control-center.jsx"
open '/Applications/Übersicht.app' 2>/dev/null || open '/Applications/Übersicht.app' 2>/dev/null || true
printf 'Installed Ferris Control Center to %s\n' "$WROOT/ferris-control-center.jsx"
