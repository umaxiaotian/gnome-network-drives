import {gettext as _} from './i18n.js';
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import {DriveSettings} from './settings.js';
import {newDrive, validateDrive} from './drive.js';
import {PROTOCOLS, PROTOCOL_LABELS} from './constants.js';
import {buildUri} from './uriBuilder.js';

export function fillPreferences(window, settings) {
    const store = new DriveSettings(settings);
    window.set_default_size(760, 760);
    const page = new Adw.PreferencesPage({title: _('Network Drives'), icon_name: 'folder-remote-symbolic'});
    window.add(page);
    let group;
    let editor = null;
    const toast = message => window.add_toast(new Adw.Toast({title: message}));
    const rebuild = () => {
        if (group) page.remove(group);
        const {drives, error} = store.read();
        group = new Adw.PreferencesGroup({title: _('Drives'), description: error ?? _('Connect to shared folders on your network.')});
        page.add(group);
        for (const drive of drives) {
            const row = new Adw.ActionRow({title: drive.name, subtitle: `${PROTOCOL_LABELS[PROTOCOLS.indexOf(drive.protocol)]} · ${drive.server}`, activatable: true, use_markup: false});
            row.add_suffix(new Gtk.Image({icon_name: 'go-next-symbolic'}));
            row.connect('activated', () => edit(drive));
            group.add(row);
            const automatic = new Adw.SwitchRow({title: _('Connect automatically'), active: drive.autoConnect});
            automatic.connect('notify::active', () => {
                try {
                    store.write(store.read().drives.map(d => d.id === drive.id ? {...d, autoConnect: automatic.active} : d));
                } catch (e) { toast(e.message); }
            });
            group.add(automatic);
        }
        const add = new Gtk.Button({label: _('Add Network Drive'), sensitive: !error, margin_top: 12});
        add.add_css_class('suggested-action');
        add.connect('clicked', () => edit(null));
        group.add(add);
    };
    const edit = existing => {
        if (editor) return;
        const draft = existing ? {...existing} : newDrive();
        const dialog = new Adw.Dialog({title: existing ? _('Edit Network Drive') : _('Add Network Drive'), content_width: 680, content_height: 720});
        const toolbar = new Adw.ToolbarView();
        dialog.set_child(toolbar);
        const header = new Adw.HeaderBar({show_start_title_buttons: false, show_end_title_buttons: false});
        const cancel = new Gtk.Button({label: _('Cancel')});
        cancel.connect('clicked', () => dialog.close());
        header.pack_start(cancel);
        const save = new Gtk.Button({label: _('Save')});
        save.add_css_class('suggested-action');
        header.pack_end(save);
        toolbar.add_top_bar(header);
        // Actions and validation stay visible while the form scrolls on small displays.
        const errorRow = new Gtk.Label({visible: false, wrap: true, xalign: 0,
            margin_start: 18, margin_end: 18, margin_top: 6, margin_bottom: 6});
        errorRow.add_css_class('error');
        toolbar.add_top_bar(errorRow);
        editor = dialog;
        dialog.connect('closed', () => { editor = null; });
        const editorPage = new Adw.PreferencesPage();
        toolbar.set_content(editorPage);
        const general = new Adw.PreferencesGroup({title: _('General')});
        const connection = new Adw.PreferencesGroup({title: _('Connection')});
        const options = new Adw.PreferencesGroup();
        const advanced = new Adw.ExpanderRow({title: _('Options')});
        options.add(advanced);
        editorPage.add(general);
        editorPage.add(connection);
        editorPage.add(options);
        const entries = {};
        const entry = (key, title, parent) => {
            const row = new Adw.EntryRow({title, text: String(draft[key] ?? '')});
            entries[key] = row;
            parent.add(row);
            return row;
        };
        entry('name', _('Name'), general);
        const protocol = new Adw.ComboRow({title: _('Protocol'), model: Gtk.StringList.new(PROTOCOL_LABELS), selected: PROTOCOLS.indexOf(draft.protocol)});
        general.add(protocol);
        entry('server', _('Server'), connection);
        entry('share', _('Share'), connection);
        entry('port', _('Port (optional)'), connection).input_purpose = Gtk.InputPurpose.DIGITS;
        entry('path', _('Path'), connection);
        entry('username', _('Username (optional)'), connection);
        entry('domain', _('Domain (optional)'), connection);
        const updateFields = () => {
            const smb = PROTOCOLS[protocol.selected] === 'smb';
            entries.share.visible = smb;
            entries.domain.visible = smb;
            entries.path.visible = !smb;
            entries.port.visible = !smb;
        };
        protocol.connect('notify::selected', updateFields);
        updateFields();
        const auto = new Adw.SwitchRow({title: _('Connect automatically'), active: draft.autoConnect});
        const reconnect = new Adw.SwitchRow({title: _('Reconnect when network becomes available'), active: draft.reconnect});
        advanced.add_row(auto);
        advanced.add_row(reconnect);
        const actions = new Adw.PreferencesGroup({description: _('Passwords are requested when connecting and can be remembered by GNOME. Disconnecting a shared connection also affects Files and other saved drives using it.')});
        editorPage.add(actions);
        save.connect('clicked', () => {
            try {
                const value = {...draft, protocol: PROTOCOLS[protocol.selected], autoConnect: auto.active, reconnect: reconnect.active};
                for (const key of ['name', 'server', 'share', 'path', 'username', 'domain']) value[key] = entries[key].text;
                const portText = entries.port.text.trim();
                if (value.protocol !== 'smb' && portText && !/^\d+$/.test(portText)) throw new Error(_('Port must be a number between 1 and 65535.'));
                value.port = value.protocol === 'smb' || !portText ? null : Number(portText);
                const clean = validateDrive(value);
                buildUri(clean);
                const current = store.read().drives;
                if (existing && !current.some(d => d.id === existing.id)) throw new Error(_('This drive was deleted. Close this editor and add a new drive.'));
                store.write(existing ? current.map(d => d.id === clean.id ? clean : d) : [...current, clean]);
                dialog.close();
            } catch (e) {
                errorRow.label = e.message;
                errorRow.visible = true;
            }
        });
        if (existing) {
            const remove = new Gtk.Button({label: _('Delete Network Drive'), margin_top: 12});
            remove.add_css_class('destructive-action');
            actions.add(remove);
            remove.connect('clicked', () => {
                const confirm = new Adw.AlertDialog({heading: _('Delete Network Drive?'), body: _('Remove “%s” from your saved drives? Its files and current connection will be kept.').replace('%s', () => existing.name)});
                confirm.add_response('cancel', _('Cancel'));
                confirm.add_response('delete', _('Delete'));
                confirm.set_response_appearance('delete', Adw.ResponseAppearance.DESTRUCTIVE);
                confirm.default_response = 'cancel';
                confirm.close_response = 'cancel';
                confirm.connect('response', (_dialog, response) => {
                    if (response !== 'delete') return;
                    try {
                        store.write(store.read().drives.filter(d => d.id !== existing.id));
                        dialog.close();
                    } catch (e) { errorRow.label = e.message; errorRow.visible = true; }
                });
                confirm.present(window);
            });
        }
        dialog.present(window);
    };
    const addRequested = () => {
        if (!settings.get_boolean('add-requested')) return;
        settings.set_boolean('add-requested', false);
        if (!store.read().error) edit(null);
    };
    const changed = settings.connect('changed::drives', rebuild);
    const requested = settings.connect('changed::add-requested', addRequested);
    window.connect('close-request', () => {
        settings.disconnect(changed);
        settings.disconnect(requested);
        return false;
    });
    rebuild();
    addRequested();
}
