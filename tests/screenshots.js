import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Graphene from 'gi://Graphene';
import {bindtextdomain} from 'gettext';
import {DOMAIN, gettext as _} from '../src/i18n.js';
import {fillPreferences} from '../src/preferences.js';
import System from 'system';
if (GLib.getenv('GSETTINGS_BACKEND') !== 'memory') throw new Error('Use memory settings');
const root = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();
bindtextdomain(DOMAIN, root.get_child('locale').get_path());
const language = GLib.getenv('LANGUAGE');
const app = new Adw.Application({application_id: 'org.gnome.NetworkDrives.Screenshots', flags: Gio.ApplicationFlags.NON_UNIQUE});
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
    Adw.StyleManager.get_default().color_scheme = Adw.ColorScheme.FORCE_DARK;
    Gtk.Settings.get_default().gtk_enable_animations = false;
    const settings = new Gio.Settings({schema_id: 'org.gnome.shell.extensions.network-drives'});
    const window = new Adw.PreferencesWindow({application: app, title: _('Network Drives')});
    fillPreferences(window, settings);
    window.present();
    settings.set_boolean('add-requested', true);
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
        const dialog = window.get_visible_dialog();
        for (const [title, value] of [['Name', 'Home NAS'], ['Server', 'nas.local'], ['Share', 'photos'], ['Username (optional)', 'demo']])
            walk(dialog, w => w instanceof Adw.EntryRow && w.title === _(title)).text = value;
        window.set_focus(null);
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
            try {
                const paintable = new Gtk.WidgetPaintable({widget: window});
                const snapshot = new Gtk.Snapshot();
                paintable.snapshot(snapshot, window.get_width(), window.get_height());
                const node = snapshot.to_node();
                const viewport = new Graphene.Rect();
                viewport.init(0, 0, window.get_width(), window.get_height());
                const texture = window.get_renderer().render_texture(node, viewport);
                const path = root.get_child(`screenshots/network-drives-${language}.png`).get_path();
                if (!texture.save_to_png(path)) throw new Error('PNG save failed');
                print(path);
            } catch (e) { printerr(e.stack); failed = true; }
            window.close(); app.quit();
            return GLib.SOURCE_REMOVE;
        });
        return GLib.SOURCE_REMOVE;
    });
});
app.run([]);
if (failed) System.exit(1);
