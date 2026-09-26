# Contributing

Keep runtime code in ES modules and use GIO asynchronously. Never introduce shell commands, root requirements, password persistence, or a daemon. Preserve the user's existing connections on disable. New protocol or persistence behavior needs GJS tests.

Run `./scripts/test.sh` and `./scripts/package.sh`. Test preferences with the memory settings backend as described in README. Real settings use `org.gnome.shell.extensions.network-drives` and should not be reset during testing.

## Desktop checks

1. Install, log in again if necessary, enable and inspect `gnome-extensions info network-drives@umaxiaotian`.
2. Open the top-bar menu and add/edit/delete drives. Invalid fields should leave the editor open with a useful message.
3. Register SMB, SFTP, WebDAV and HTTPS WebDAV test endpoints. Connect, authenticate, open Files, and disconnect each. Verify cancellation and invalid credentials.
4. Connect in Files first, then enable the extension. The drive should be shown as connected. Test multiple paths sharing a mount.
5. Enable automatic connection and log in again. Toggle the network offline/online and observe bounded retries. Manually disconnected drives must stay disconnected.
6. Test unavailable servers, missing shares, busy disconnects, cancelled authentication and missing backends. Check that notifications do not expose secrets.
7. Disable during authentication and during connection, then repeat enable/disable. Connections already in use must remain; no duplicated indicators or pending dialogs should remain.
8. Restart preferences and the session to check persistence. Inspect the saved JSON to confirm that only allowed fields are stored.
9. Inspect recent Shell logs with `journalctl --user -b`; do not paste authentication data into bug reports.

## Validation record

Validated on Ubuntu 26.04.1 / GNOME Shell 50.1:

- GJS logic suite: 49 assertions for URI, validation, persistence and error/retry policy.
- Drive manager suite: 15 assertions including network transitions, concurrent operations, cancellation, manual disconnect suppression and lifecycle cleanup.
- Real GTK4/Libadwaita preferences: add dialog, fields, save and GSettings roundtrip using an isolated memory backend.
- Separate headless GNOME 50 session: extension ACTIVE, top-bar indicator created, automatic and manual WebDAV connections through GVfs, remote file read, detection after disable/enable, safe unmount and repeated lifecycle. Extension error list was empty.
- GNOME extension ZIP generated and installed in the desktop user directory. The already-running Wayland session requires logout/login to discover a newly installed extension; it was not forcibly restarted.

Not verified against real servers: SMB, SFTP, HTTPS WebDAV, password/Keyring persistence, server certificate or SSH host-key prompts, busy-file unmount and physical Wi-Fi loss/recovery. GIO launch integration is implemented, but opening the remote location in a real Files window needs a desktop manual check. Protocol URI tests are not substitutes for these checks.

## Internationalization validation

Japanese translations cover all 62 extracted messages. The regression suite adds 24 assertions across Japanese, English and missing-language fallback. A real Japanese GTK preferences session passed add/save, and an isolated Japanese GNOME 50 session verified the translated panel menu alongside the existing WebDAV and lifecycle checks. Run `./scripts/test.sh` and the Japanese UI/Shell commands in README after translation changes. See `po/README.md` for catalog maintenance.
