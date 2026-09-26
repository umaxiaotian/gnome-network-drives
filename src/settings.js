import {gettext as _} from './i18n.js';
import {validateDrive} from './drive.js';

export function serialize(drives) {
    const ids = new Set();
    const clean = drives.map(d => {
        const drive = validateDrive(d);
        if (ids.has(drive.id))
            throw new Error(_('Duplicate drive ID.'));
        ids.add(drive.id);
        return drive;
    });
    return JSON.stringify({version: 1, drives: clean});
}

export function deserialize(text) {
    try {
        const data = JSON.parse(text);
        // Future migrations belong here; unknown versions must not be overwritten.
        if (data?.version !== 1)
            throw new Error(_('Unsupported settings version.'));
        if (!Array.isArray(data.drives))
            throw new Error(_('Invalid drive list.'));
        return {drives: JSON.parse(serialize(data.drives)).drives, error: null};
    } catch {
        return {drives: [], error: _('Saved drives could not be read. Restore a valid version 1 configuration before editing.')};
    }
}

export class DriveSettings {
    constructor(settings) { this.settings = settings; }
    read() { return deserialize(this.settings.get_string('drives')); }
    write(drives) {
        if (this.read().error)
            throw new Error(_('Invalid saved configuration; refusing to overwrite it.'));
        if (!this.settings.set_string('drives', serialize(drives)))
            throw new Error(_('Settings could not be saved.'));
    }
}
