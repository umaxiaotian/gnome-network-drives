import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class TestExtension extends Extension {
    enable() {
        this._timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3, () => {
            this._timer = 0;
            void this.run();
            return GLib.SOURCE_REMOVE;
        });
    }
    async run() {
        const results = [];
        const check = (value, label) => {
            if (!value) throw new Error(label);
            results.push(label);
        };
        try {
            const pause = milliseconds => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, milliseconds, () => { resolve(); return GLib.SOURCE_REMOVE; }));
            const extension = Main.extensionManager.lookup('network-drives@umaxiaotian').stateObj;
            check(Boolean(Main.panel.statusArea['network-drives@umaxiaotian']), 'Top-bar indicator exists');
            if (GLib.getenv('LANGUAGE') === 'ja')
                check(extension._indicator.menu._getMenuItems()[0].label.text === 'ネットワークドライブ', 'Shell menu uses Japanese gettext catalog');
            const drive = {id: GLib.uuid_string_random(), name: 'Loopback DAV', protocol: 'dav', server: '127.0.0.1', share: '', path: '/share', port: Number(GLib.getenv('ND_TEST_PORT')), username: '', domain: '', autoConnect: true, reconnect: true};
            extension._settings.set_string('drives', JSON.stringify({version: 1, drives: [drive]}));
            const manager = extension._manager;
            const record = manager.records.get(drive.id);
            check(Boolean(record), 'Settings change populates drive menu');
            for (let i = 0; i < 40 && record.state !== 'Connected'; i++) await pause(200);
            check(record.state === 'Connected', 'Automatic connection succeeds');
            await manager.disconnect(record);
            await manager.connect(record);
            check(record.state === 'Connected', 'WebDAV connected through extension and GVfs');
            const file = Gio.File.new_for_uri(`dav://127.0.0.1:${drive.port}/share/hello.txt`);
            const bytes = await new Promise((resolve, reject) => file.load_contents_async(null, (f, result) => {
                try { resolve(f.load_contents_finish(result)[1]); } catch (e) { reject(e); }
            }));
            check(new TextDecoder().decode(bytes) === 'hello\n', 'Remote file read using GIO');
            extension.disable();
            extension.enable();
            let next = extension._manager.records.get(drive.id);
            check(next.state === 'Connected', 'Existing GVfs mount detected after re-enable');
            await extension._manager.disconnect(next);
            check(next.state === 'Disconnected', 'WebDAV safely disconnected');
            check(!extension._manager.mounts.find(drive), 'GVfs mount removed');
            drive.autoConnect = false;
            extension._settings.set_string('drives', JSON.stringify({version: 1, drives: [drive]}));
            for (let i = 0; i < 3; i++) { extension.disable(); extension.enable(); }
            check(Boolean(Main.panel.statusArea['network-drives@umaxiaotian']), 'Repeated lifecycle leaves one indicator');
            GLib.file_set_contents(GLib.getenv('ND_TEST_RESULT'), JSON.stringify({passed: results}, null, 2));
        } catch (e) {
            GLib.file_set_contents(GLib.getenv('ND_TEST_RESULT'), JSON.stringify({passed: results, error: e.message, stack: e.stack}, null, 2));
        }
    }
    disable() {
        if (this._timer) GLib.Source.remove(this._timer);
        this._timer = 0;
    }
}
