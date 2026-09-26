#!/usr/bin/env bash
set -euo pipefail
# Snap editors export private XDG paths that the desktop Shell does not read.
if [[ -n "${SNAP:-}" && "${XDG_DATA_HOME:-}" == "$HOME/snap/"* ]]; then
    export XDG_DATA_HOME="${SNAP_REAL_HOME:-$HOME}/.local/share"
fi
gnome-extensions disable network-drives@umaxiaotian || true
gnome-extensions uninstall network-drives@umaxiaotian
echo 'Removed. Saved drive settings and existing connections are kept.'
