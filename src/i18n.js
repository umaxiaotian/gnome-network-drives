import {dgettext} from 'gettext';

// ExtensionBase binds this domain to locale/ in both Shell and preferences.
// Shared modules can also run in GJS tests without importing Shell or GTK.
export const DOMAIN = 'network-drives';
export function gettext(message) {
    return dgettext(DOMAIN, message);
}
