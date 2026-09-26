import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {DriveManager} from '../src/driveManager.js';
import {newDrive} from '../src/drive.js';
import {serialize} from '../src/settings.js';
import {State} from '../src/constants.js';
let assertions = 0;
function ok(value, message) { if (!value) throw new Error(message); assertions++; }
const drive = {...newDrive(), name: 'NAS', server: 'localhost', share: 'data'};
class Settings {
    constructor() { this.value = serialize([drive]); }
    get_string() { return this.value; }
    connect(_name, cb) { this.changed = cb; return 1; }
    disconnect() { this.changed = null; }
}
class Mounts {
    constructor(changed) { this.changed = changed; this.mounted = false; this.calls = 0; this.cancelled = 0; }
    find() { return this.mounted ? {} : null; }
    async run(_drive, disconnect) {
        this.calls++;
        if (this.failure) throw this.failure;
        if (this.block) await new Promise(resolve => { this.release = resolve; });
        this.mounted = !disconnect;
        this.changed();
    }
    cancel() { this.cancelled++; }
    destroy() { this.destroyed = true; }
}
class Network {
    constructor(changed) { this.available = true; this.changed = changed; }
    set(value) { this.available = value; this.changed(value); }
    destroy() { this.destroyed = true; }
}
const settings = new Settings();
const notifications = [];
const manager = new DriveManager(settings, () => {}, (...args) => notifications.push(args), {MountManager: Mounts, NetworkMonitor: Network});
let record = manager.records.get(drive.id);
await manager.connect(record);
ok(record.state === State.CONNECTED, 'connect state');
await manager.disconnect(record);
ok(record.state === State.DISCONNECTED && record.suppressed, 'manual disconnect suppression');
manager.network.set(false);
manager.network.set(true);
ok(!record.timer, 'manual disconnect must survive network bounce');
manager.mounts.block = true;
const pending = manager.connect(record);
await manager.connect(record);
ok(manager.mounts.calls === 3, 'no duplicate concurrent operations');
ok(record.busy && record.state === State.CONNECTING, 'busy state');
manager.mounts.release();
await pending;
manager.mounts.block = false;
manager.network.set(false);
ok(record.state === State.DISCONNECTED, 'network loss updates state');
manager.mounts.mounted = false;
manager.network.set(true);
ok(record.timer > 0, 'network recovery schedules reconnect');
manager.clearTimer(record);
record.state = State.CONNECTED;
manager.mounts.mounted = false;
manager.refresh();
ok(record.timer > 0, 'unexpected mount removal schedules retry');
manager.clearTimer(record);
manager.mounts.failure = new GLib.Error(Gio.io_error_quark(), Gio.IOErrorEnum.TIMED_OUT, 'private');
await manager.connect(record, false);
ok(record.state === State.ERROR && record.timer > 0, 'transient automatic failure retries');
manager.clearTimer(record);
record.attempt = 5;
manager.schedule(record);
ok(!record.timer, 'bounded retries');
await manager.connect(record, true);
ok(notifications.length === 1, 'manual failure notifies');
manager.mounts.failure = new GLib.Error(Gio.io_error_quark(), Gio.IOErrorEnum.CANCELLED, 'private');
await manager.connect(record);
ok(record.suppressed && !record.timer, 'authentication cancellation suppresses retries');
manager.mounts.failure = null;
manager.mounts.block = true;
const disabledPending = manager.connect(record);
manager.destroy();
manager.mounts.release();
await disabledPending;
ok(!manager.alive && manager.records.size === 0, 'disable during async operation');
ok(manager.network.destroyed && manager.mounts.destroyed && !settings.changed, 'monitor and settings cleanup');
ok(!record.timer && !record.busy, 'timer and busy cleanup');
print(`${assertions} manager assertions passed`);
