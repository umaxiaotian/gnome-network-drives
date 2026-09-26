import {gettext as _} from './i18n.js';
import Gio from 'gi://Gio';
export function isError(error, code) { return error?.matches?.(Gio.io_error_quark(), code) ?? false; }
export function cancelled(error) {
    return isError(error, Gio.IOErrorEnum.CANCELLED) || isError(error, Gio.IOErrorEnum.FAILED_HANDLED);
}
export function retryable(error) {
    return [Gio.IOErrorEnum.PENDING, Gio.IOErrorEnum.TIMED_OUT, Gio.IOErrorEnum.HOST_NOT_FOUND, Gio.IOErrorEnum.HOST_UNREACHABLE, Gio.IOErrorEnum.NETWORK_UNREACHABLE, Gio.IOErrorEnum.CONNECTION_CLOSED, Gio.IOErrorEnum.CONNECTION_REFUSED].some(code => isError(error, code));
}
export function explain(error) {
    const cases = [
        ['PERMISSION_DENIED', _('Authentication failed. Check the username and access permissions.')],
        ['HOST_NOT_FOUND', _('The server could not be found. Check its name and your network connection.')],
        ['TIMED_OUT', _('The connection timed out. Try again when the server is available.')],
        ['NOT_FOUND', _('The share or folder does not exist. Check the drive settings.')],
        ['NOT_SUPPORTED', _('Support for this connection is unavailable. Install the GVfs network backends.')],
        ['BUSY', _('The drive is in use. Close files on the drive and try again.')],
    ];
    for (const [code, message] of cases) {
        if (isError(error, Gio.IOErrorEnum[code])) return message;
    }
    return _('The operation could not be completed. Check the server, network connection and drive settings.');
}
