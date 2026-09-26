#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME"
gsettings set org.gnome.shell enabled-extensions "['network-drives@umaxiaotian', 'network-drives-test@local']"
gsettings set org.gnome.shell disable-user-extensions false
gsettings set org.gnome.desktop.interface toolkit-accessibility false
gnome-shell --headless --wayland --virtual-monitor 1280x800 --no-x11 &
shell_pid=$!
trap 'kill "$shell_pid" 2>/dev/null || true' EXIT
for i in {1..45}; do
    [[ -f "$ND_TEST_RESULT" ]] && break
    sleep 1
done
gnome-extensions list
gnome-extensions info network-drives@umaxiaotian
gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell --method org.gnome.Shell.Extensions.GetExtensionErrors network-drives@umaxiaotian
