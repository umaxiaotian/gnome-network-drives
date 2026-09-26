#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
./scripts/package.sh
root=$(pwd)
test_dir=$(mktemp -d /tmp/network-drives-test.XXXXXX)
mkdir -p "$test_dir/data/gnome-shell/extensions/network-drives@umaxiaotian" "$test_dir/runtime"
chmod 700 "$test_dir/runtime"
unzip -q dist/network-drives@umaxiaotian.shell-extension.zip -d "$test_dir/data/gnome-shell/extensions/network-drives@umaxiaotian"
glib-compile-schemas "$test_dir/data/gnome-shell/extensions/network-drives@umaxiaotian/schemas"
cp -a tests/shell-extension "$test_dir/data/gnome-shell/extensions/network-drives-test@local"
python3 tests/webdav-server.py "$test_dir/port" &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT
for i in {1..30}; do [[ -s "$test_dir/port" ]] && break; sleep 0.1; done
export ND_TEST_PORT
ND_TEST_PORT=$(cat "$test_dir/port")
env -i HOME="$HOME" USER="$USER" PATH=/usr/bin:/bin LANG=C.UTF-8 LC_ALL="${ND_TEST_LOCALE:-C.UTF-8}" LANGUAGE="${ND_TEST_LANGUAGE:-en}" \
    XDG_RUNTIME_DIR="$test_dir/runtime" XDG_DATA_HOME="$test_dir/data" \
    XDG_CONFIG_HOME="$test_dir/config" XDG_CACHE_HOME="$test_dir/cache" \
    ND_TEST_PORT="$ND_TEST_PORT" ND_TEST_RESULT="$test_dir/result.json" \
    timeout 55 dbus-run-session -- bash "$root/tests/shell-session.sh" > "$test_dir/session.log" 2>&1 || true
python3 - "$test_dir" <<'PY'
import json, pathlib, sys
root = pathlib.Path(sys.argv[1])
print(f'Integration logs: {root}')
result = root / 'result.json'
if not result.exists():
    print((root / 'session.log').read_text()[-6000:])
    raise SystemExit('Shell integration did not complete')
data = json.loads(result.read_text())
print(json.dumps(data, indent=2))
if 'error' in data:
    raise SystemExit(1)
PY
