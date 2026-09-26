# Network Drives

Map and manage network drives directly from GNOME Shell.

## Features

- SMB, SFTP, WebDAV and WebDAV over HTTPS
- One-click connect/disconnect from the top bar
- Automatic connection and bounded automatic reconnect
- GNOME Files integration and detection of existing connections
- GNOME Keyring integration through the standard GVfs authentication flow
- GTK4 / Libadwaita drive editor
- English, Japanese, Korean and Simplified Chinese UI, with gettext catalogs for additional languages
- No root required; no fstab editing

## Requirements

GNOME Shell **50**, GJS, GTK4, Libadwaita 1.9 or newer, and GVfs network backends. Development was performed on Ubuntu 26.04.1 with Shell 50.1, GJS 1.88.0, GLib 2.88.0, GTK 4.22 and Libadwaita 1.9. Other Shell versions are not declared compatible.

Ubuntu packages: `gnome-shell`, `gjs`, `gir1.2-adw-1`, `gir1.2-gtk-4.0`, `gvfs`, `gvfs-backends`, `libglib2.0-bin`, and `gnome-shell-extension-prefs` (or the distribution's Extensions application). Packaging uses `gnome-extensions`, `zip`, Python 3 and `python3-babel` to compile gettext catalogs. Install missing system dependencies using your distribution's software manager. Using this extension needs no administrator privileges.

## Installation

```sh
./scripts/install.sh
```

When run from a Snap editor, the installer uses the desktop data directory instead of the editor’s private directory. The extension installs under `${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions/network-drives@umaxiaotian`. On a first installation, log out and back in so Shell discovers it. Enable **Network Drives** using Extensions, or:

```sh
gnome-extensions enable network-drives@umaxiaotian
gnome-extensions info network-drives@umaxiaotian
```

Open the top-bar menu, select **Add Network Drive**, choose a protocol, enter a server and share/path, and save. Server accepts a hostname or IPv4/IPv6 address, not a URL. Share is a single SMB share name. Path is a remote folder; special characters are escaped automatically. Ports are optional. For HTTPS select **WebDAV (HTTPS)**. Supply a username and optional SMB domain in settings when needed; GNOME asks for the password during connection.

Use **Connect**, **Open in Files**, or **Disconnect** in the menu. **Manage Network Drives** opens editing and deletion. Deleting a definition or disabling the extension leaves the connection and remote files intact. Disconnecting a connection shared with Files or another definition affects all its users.

```sh
./scripts/uninstall.sh
```

Uninstalling preserves saved definitions and Keyring entries.

## Development

```sh
./scripts/test.sh
```

Tests run with GJS; Node.js and npm are not required. They cover URI escaping, host and input validation, settings versioning and serialization, secret exclusion, mount matching, error classification and bounded backoff. Compile schemas locally for standalone preferences tests:

```sh
glib-compile-schemas schemas
GSETTINGS_SCHEMA_DIR="$PWD/schemas" GSETTINGS_BACKEND=memory gjs -m tests/preferences.js
```

An optional integration test starts a separate headless GNOME session and a loopback-only WebDAV fixture (requires Python 3, `dbus-run-session`, `unzip` and headless graphics support):

```sh
./scripts/test-shell.sh
```

It uses temporary settings and runtime directories, exercises actual GVfs mount/read/unmount and extension lifecycle, and leaves diagnostic logs under `/tmp/network-drives-test.*`. It does not restart your desktop.

See [CONTRIBUTING.md](CONTRIBUTING.md) for interactive checks. After changing an installed extension, reinstall and log out/in on Wayland. Do not restart your running desktop compositor to test this project.

## Packaging

```sh
./scripts/package.sh
```

Creates `dist/network-drives@umaxiaotian.shell-extension.zip` using GNOME's pack tool, including the schema, modules, license and README. The bundle format is suitable for submission to extensions.gnome.org; publication still requires their review.

## Architecture

`extension.js` owns the top-bar menu and lifecycle. `src/driveManager.js` coordinates state and bounded retries; `mountManager.js` owns cancellables, standard Shell authentication and GIO operations. `networkMonitor.js` watches network availability. `Gio.VolumeMonitor` detects connections made by Files. `prefs.js` loads the Libadwaita UI in `src/preferences.js`. Drive validation, URI construction, settings and retry policy are separate modules.

Definitions are a version 1 JSON document in GSettings. Invalid documents or unknown versions are preserved and reported rather than silently overwritten. Future migrations belong in `deserialize()`. No daemon, subprocess, kernel mounts, fstab entries or system services are used by the extension.

Automatic connection starts when the extension is enabled and networking becomes available. Reconnection is opt-in per drive and uses delays of 1, 2, 5, 10 and 30 seconds, then stops. Only transient network failures are retried. Authentication cancellation suppresses further automatic attempts for that drive in the current session. Manual disconnect also suppresses reconnect until manual Connect or extension restart. Connection attempts have a 90-second limit, including time spent in authentication dialogs.

## Translations

The UI follows your desktop language. Japanese, Korean and Simplified Chinese are included; untranslated languages and messages fall back to English. Drive names, protocol identifiers and stored settings are never translated. GNOME/GVfs authentication dialogs use their own system translations.

Translation sources are in `po/`, with the domain `network-drives`. See [po/README.md](po/README.md) to add a language. Packaging automatically compiles `.po` files into `locale/<language>/LC_MESSAGES/network-drives.mo` and includes them in the ZIP. Runtime does not require Babel.

```sh
python3 scripts/translations.py --update-template
LC_ALL=ja_JP.UTF-8 LANGUAGE=ja gjs -m tests/i18n.js
GSETTINGS_SCHEMA_DIR="$PWD/schemas" GSETTINGS_BACKEND=memory LC_ALL=ja_JP.UTF-8 LANGUAGE=ja gjs -m tests/preferences.js
ND_TEST_LOCALE=ja_JP.UTF-8 ND_TEST_LANGUAGE=ja ./scripts/test-shell.sh
```

Japanese tests require the `ja_JP.UTF-8` system locale. Reopen preferences after updating translations. Installed Shell modules remain cached until the next login, so log out/in to update the panel menu.

## Security

Passwords are never stored in extension settings, files or logs. Only names, server addresses, usernames, domains and connection options are persisted. GNOME's mount operation handles password prompts; choosing to remember a password delegates storage to GVfs/Secret Service/GNOME Keyring. Username and domain are configured in the editor because the Shell 50 helper only prompts for the password. SFTP keys/agents and server identity prompts are handled by the installed GVfs backend. WebDAV without HTTPS does not encrypt transport; prefer WebDAV (HTTPS) when supported.

## Limitations

- GNOME 50 is the only supported Shell major version.
- Network availability does not prove that a particular NAS, VPN or server is reachable. GVfs may retain a connection during outages; the extension reflects GVfs mount state once networking returns.
- Paths under the same GVfs mount share a connection; disconnect affects every application using it.
- No kernel mounts, NFS, SSHFS, cloud sync or drive letters.
- Live protocol tests require reachable servers and credentials. See the validation record in CONTRIBUTING.md for what was actually verified.

## License

MIT; see [LICENSE](LICENSE).
