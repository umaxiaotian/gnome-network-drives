import GLib from 'gi://GLib';
import {validateDrive} from './drive.js';

export function buildUri(input) {
    const d = validateDrive(input);
    const host = d.server.includes(':') ? `[${d.server}]` : d.server.toLowerCase();
    const user = d.protocol !== 'smb' && d.username ? `${encodeURIComponent(d.username)}@` : '';
    const port = d.protocol !== 'smb' && d.port !== null ? `:${d.port}` : '';
    const path = d.protocol === 'smb' ? d.share : d.path.replace(/^\/+/, '');
    const uri = `${d.protocol}://${user}${host}${port}/${path.split('/').map(encodeURIComponent).join('/')}`;
    GLib.Uri.parse(uri, GLib.UriFlags.NONE);
    return uri;
}

// GVfs may normalize default ports and omit the user in a mount root.
export function mountMatches(target, root) {
    try {
        const a = GLib.Uri.parse(target, GLib.UriFlags.NONE);
        const b = GLib.Uri.parse(root, GLib.UriFlags.NONE);
        const port = u => u.get_port() === -1 ? ({smb: 445, sftp: 22, dav: 80, davs: 443}[u.get_scheme()]) : u.get_port();
        if (a.get_scheme() !== b.get_scheme() || a.get_host()?.toLowerCase() !== b.get_host()?.toLowerCase() || port(a) !== port(b))
            return false;
        if (a.get_userinfo() && b.get_userinfo() && a.get_userinfo() !== b.get_userinfo())
            return false;
        const p = a.get_path().replace(/\/+$/, '');
        const r = b.get_path().replace(/\/+$/, '');
        return p === r || p.startsWith(`${r}/`);
    } catch {
        return false;
    }
}
