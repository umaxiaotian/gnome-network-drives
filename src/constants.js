import {gettext as _} from './i18n.js';
export const State = Object.freeze({CONNECTED: 'Connected', DISCONNECTED: 'Disconnected', CONNECTING: 'Connecting…', ERROR: 'Connection failed'});
export const PROTOCOLS = ['smb', 'sftp', 'dav', 'davs'];
export const PROTOCOL_LABELS = ['SMB', 'SFTP', 'WebDAV', 'WebDAV (HTTPS)'];
export const RETRY_DELAYS = [1, 2, 5, 10, 30];
export function retryDelay(attempt) {
    return RETRY_DELAYS[attempt] ?? null;
}

// Translate at display time; state values stay stable across locales.
export function stateLabel(state) {
    switch (state) {
    case State.CONNECTED: return _('Connected');
    case State.DISCONNECTED: return _('Disconnected');
    case State.CONNECTING: return _('Connecting…');
    case State.ERROR: return _('Connection failed');
    default: return state;
    }
}
