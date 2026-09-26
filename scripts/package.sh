#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
python3 scripts/translations.py
mkdir -p dist
# Catalogs are already compiled by Babel; avoid pack's implicit msgfmt step.
empty_po=$(mktemp -d)
trap 'rmdir -- "$empty_po"' EXIT
gnome-extensions pack --podir="$empty_po" --force --out-dir=dist --extra-source=src --extra-source=icons --extra-source=LICENSE --extra-source=README.md --schema=schemas/org.gnome.shell.extensions.network-drives.gschema.xml .
# pack regenerates locale/ even with an empty PO directory; append our catalogs last.
zip -q -r dist/network-drives@umaxiaotian.shell-extension.zip locale -i '*.mo'
echo 'Package created in dist/'
