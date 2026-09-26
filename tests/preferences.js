import {bindtextdomain} from 'gettext';
import {DOMAIN, gettext as _} from '../src/i18n.js';
import Adw from 'gi://Adw?version=1';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import System from 'system';
import Gtk from 'gi://Gtk?version=4.0';
import {fillPreferences} from '../src/preferences.js';
import {deserialize} from '../src/settings.js';

// An isolated backend prevents this UI smoke test from changing saved drives.
if (GLib.getenv('GSETTINGS_BACKEND') !== 'memory') throw new Error('Use GSETTINGS_BACKEND=memory');
bindtextdomain(DOMAIN, Gio.File.new_for_uri(import.meta.url).get_parent().get_parent().get_child('locale').get_path());
const app = new Adw.Application({application_id: 'org.gnome.NetworkDrives.Test', flags: Gio.ApplicationFlags.NON_UNIQUE});
let failed = false;
function walk(widget, predicate) {
    if (predicate(widget)) return widget;
    for (let child = widget.get_first_child(); child; child = child.get_next_sibling()) {
        const found = walk(child, predicate);
        if (found) return found;
    }
    return null;
}
app.connect('activate', () => {
    const settings = new Gio.Settings({schema_id: 'org.gnome.shell.extensions.network-drives'});
    const window = new Adw.PreferencesWindow({application: app});
    settings.set_boolean('add-requested', true);
    fillPreferences(window, settings);
    if (GLib.getenv('ND_TEST_COMPACT')) window.set_default_size(420, 480);
    window.present();
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
        try {
            const dialog = window.get_visible_dialog();
            if (!dialog) throw new Error('Add editor did not open');
            if (GLib.getenv('LANGUAGE') === 'ja' && dialog.title !== 'ネットワークドライブを追加') throw new Error('Japanese dialog title missing');
            const save = walk(dialog, w => w instanceof Gtk.Button && w.label === _('Save'));
            const [positioned, bounds] = save.compute_bounds(dialog);
            if (!positioned || bounds.get_y() < 0 || bounds.get_y() + bounds.get_height() > dialog.get_height()) throw new Error('Save button is clipped');
            let parent = save.get_parent();
            while (parent && parent !== dialog) {
                if (parent instanceof Gtk.ScrolledWindow) throw new Error('Save button must not scroll with the form');
                parent = parent.get_parent();
            }
            save.emit('clicked');
            const errorLabel = walk(dialog, w => w instanceof Gtk.Label && w.label === _('Enter a name (up to 120 characters).'));
            if (!errorLabel?.visible) throw new Error('Validation error is not visible');
            const options = walk(dialog, w => w instanceof Adw.ExpanderRow && w.title === _('Options'));
            if (!options || options.expanded) throw new Error('Options must start collapsed');
            options.expanded = true;
            const findEntry = title => walk(dialog, w => w instanceof Adw.EntryRow && w.title === _(title));
            findEntry('Name').text = 'Smoke NAS';
            findEntry('Server').text = 'localhost';
            findEntry('Share').text = 'test';
            save.emit('clicked');
            const {drives, error} = deserialize(settings.get_string('drives'));
            if (error || drives.length !== 1 || drives[0].name !== 'Smoke NAS') throw new Error('Save failed');
            print('Preferences: fixed Save visibility, validation, expandable options, add/save and GSettings roundtrip passed');
      } catch (e) { printerr(e.stack); failed = true; }
        window.close();
        app.quit();
        return GLib.SOURCE_REMOVE;
    });
});
app.run([]);
if (failed) System.exit(1);
