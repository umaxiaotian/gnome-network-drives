#!/usr/bin/env bash
set -euo pipefail
# Snap editors export private XDG paths that the desktop Shell does not read.
if [[ -n "${SNAP:-}" && "${XDG_DATA_HOME:-}" == "$HOME/snap/"* ]]; then
    export XDG_DATA_HOME="${SNAP_REAL_HOME:-$HOME}/.local/share"
fi
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
./scripts/package.sh
gnome-extensions install --force dist/network-drives@umaxiaotian.shell-extension.zip
echo 'Installed. Log out and back in if this is a new installation, then enable Network Drives in Extensions.'
echo 'Or run: gnome-extensions enable network-drives@umaxiaotian'
