import {gettext as _} from './src/i18n.js';
import St from 'gi://St';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {DriveManager} from './src/driveManager.js';
import {MountManager} from './src/mountManager.js';
import {NetworkMonitor} from './src/networkMonitor.js';
import {State, stateLabel} from './src/constants.js';

export default class NetworkDrivesExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._indicator = new PanelMenu.Button(0.0, _('Network Drives'));
        this._indicator.add_child(new St.Icon({icon_name: 'folder-remote-symbolic', style_class: 'system-status-icon'}));
        Main.panel.addToStatusArea(this.uuid, this._indicator);
        this._manager = new DriveManager(this._settings, () => this._render(), (title, body) => Main.notify(title, body), {MountManager, NetworkMonitor});
        this._render();
    }
    _render() {
        if (!this._manager || !this._indicator) return;
        const menu = this._indicator.menu;
        menu.removeAll();
        menu.addMenuItem(new PopupMenu.PopupMenuItem(_('Network Drives'), {reactive: false}));
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        if (this._manager.error)
            menu.addMenuItem(new PopupMenu.PopupMenuItem(_('Saved drives could not be read. Open settings.'), {reactive: false}));
        else if (!this._manager.records.size)
            menu.addMenuItem(new PopupMenu.PopupMenuItem(_('No network drives yet'), {reactive: false}));
        for (const record of this._manager.records.values()) {
            const section = new PopupMenu.PopupMenuSection();
            section.addMenuItem(new PopupMenu.PopupMenuItem(record.drive.name, {reactive: false}));
            const status = new PopupMenu.PopupMenuItem(stateLabel(record.state), {reactive: false});
            status.add_style_class_name('network-drives-status');
            section.addMenuItem(status);
            if (record.state === State.CONNECTED) {
                section.addAction(_('Open in Files'), () => this._manager.open(record));
                section.addAction(_('Disconnect'), () => void this._manager.disconnect(record)).setSensitive(!record.busy);
            } else {
                section.addAction(_('Connect'), () => void this._manager.connect(record)).setSensitive(!record.busy);
            }
            menu.addMenuItem(section);
        }
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        menu.addAction(_('Add Network Drive'), () => {
            this._settings.set_boolean('add-requested', true);
            this.openPreferences();
        });
        menu.addAction(_('Manage Network Drives'), () => this.openPreferences());
    }
    disable() {
        this._manager?.destroy();
        this._manager = null;
        this._indicator?.destroy();
        this._indicator = null;
        this._settings = null;
    }
}
