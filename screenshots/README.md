# Localized screenshots

Actual GTK4/Libadwaita Network Drives add dialogs, captured using GTK's widget snapshot and renderer (760 × 760 PNG). These are application renders, not mockups or generated artwork.

- `network-drives-ja.png`: Japanese
- `network-drives-en.png`: English
- `network-drives-ko.png`: Korean
- `network-drives-zh_CN.png`: Simplified Chinese

All four use the dark theme and the same sample values: Home NAS, nas.local, photos, demo. The capture runs with in-memory settings and makes no network connections or changes to saved drives.

Recreate from a desktop session with `./scripts/screenshots.sh`. Dependencies are the regular development dependencies plus the `ja_JP.UTF-8` locale and CJK fonts. `LANGUAGE` selects each gettext catalog while the installed UTF-8 locale supplies the process locale. Output includes only the application window, not other desktop windows.
