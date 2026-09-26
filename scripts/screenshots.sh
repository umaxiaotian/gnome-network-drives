#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
python3 scripts/translations.py
glib-compile-schemas schemas
mkdir -p screenshots
for language in ja en ko zh_CN; do
    GSETTINGS_SCHEMA_DIR="$PWD/schemas" GSETTINGS_BACKEND=memory \
        LC_ALL=ja_JP.UTF-8 LANGUAGE="$language" gjs -m tests/screenshots.js
done
