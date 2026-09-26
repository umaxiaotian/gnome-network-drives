import {gettext as _} from './i18n.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {PROTOCOLS} from './constants.js';

export function validateDrive(input) {
    if (!input || typeof input !== 'object')
        throw new Error(_('Invalid drive definition.'));
    const d = {};
    for (const key of ['id', 'name', 'protocol', 'server', 'share', 'path', 'username', 'domain']) {
        if (input[key] !== undefined && typeof input[key] !== 'string')
            throw new Error(_('Invalid field value.'));
        d[key] = (input[key] ?? '').trim();
    }
    if (!GLib.uuid_string_is_valid(d.id))
        throw new Error(_('Invalid drive ID.'));
    if (!d.name || d.name.length > 120)
        throw new Error(_('Enter a name (up to 120 characters).'));
    if (!PROTOCOLS.includes(d.protocol))
        throw new Error(_('Choose a supported protocol.'));
    d.server = d.server.replace(/^\[([^\]]+)\]$/, '$1');
    const ip = Gio.InetAddress.new_from_string(d.server);
    if (!ip && (!d.server || d.server.length > 253 || !d.server.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))))
        throw new Error(_('Enter a hostname or IPv4/IPv6 address, without a URL or path.'));
    if (d.protocol === 'smb' && (!d.share || /[\/\\]/.test(d.share)))
        throw new Error(_('Enter a share name without slashes.'));
    for (const key of ['name', 'share', 'path', 'username', 'domain']) {
        if (/[\x00-\x1f\x7f]/.test(d[key]))
            throw new Error(_('Remove control characters from the input.'));
    }
    d.port = input.port ?? null;
    if (d.port !== null && (!Number.isInteger(d.port) || d.port < 1 || d.port > 65535))
        throw new Error(_('Port must be a number between 1 and 65535.'));
    for (const key of ['autoConnect', 'reconnect']) {
        if (input[key] !== undefined && typeof input[key] !== 'boolean')
            throw new Error(_('Invalid connection option.'));
        d[key] = input[key] ?? false;
    }
    // Whitelisting prevents accidental persistence of authentication secrets.
    return d;
}

export function newDrive() {
    return {id: GLib.uuid_string_random(), name: '', protocol: 'smb', server: '', share: '', path: '', port: null, username: '', domain: '', autoConnect: false, reconnect: true};
}
