#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
glib-compile-schemas --strict --dry-run schemas
gjs -m tests/run.js
gjs -m tests/manager.js
python3 scripts/translations.py
LC_ALL=ja_JP.UTF-8 LANGUAGE=ja gjs -m tests/i18n.js
LC_ALL=C.UTF-8 LANGUAGE=en gjs -m tests/i18n.js
LC_ALL=ja_JP.UTF-8 LANGUAGE=fr gjs -m tests/i18n.js
