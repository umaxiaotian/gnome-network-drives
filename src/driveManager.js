import {gettext as _} from './i18n.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {DriveSettings} from './settings.js';
import {State, retryDelay} from './constants.js';
import {cancelled, explain, retryable} from './errors.js';
import {buildUri} from './uriBuilder.js';

export class DriveManager {
    constructor(settings, changed, notify, {MountManager, NetworkMonitor}) {
        this.settings = settings;
        this.store = new DriveSettings(settings);
        this.changed = changed;
        this.notify = notify;
        this.alive = true;
        this.records = new Map();
        this.launches = new Set();
        this.mounts = new MountManager(() => this.refresh());
        this.network = new NetworkMonitor(available => this.networkChanged(available));
        this.signal = settings.connect('changed::drives', () => this.reload());
        this.reload();
    }
    reload() {
        const {drives, error} = this.store.read();
        this.error = error;
        const old = this.records;
        this.records = new Map();
        for (const drive of drives) {
            const previous = old.get(drive.id);
            if (previous && JSON.stringify(previous.drive) === JSON.stringify(drive)) {
                this.records.set(drive.id, previous);
                old.delete(drive.id);
            } else {
                this.records.set(drive.id, {drive, state: State.DISCONNECTED, busy: false, timer: 0, attempt: 0, suppressed: false, initial: drive.autoConnect});
            }
        }
        for (const record of old.values()) {
            this.clearTimer(record);
            this.mounts.cancel(record.drive.id);
        }
        this.refresh();
        if (this.network.available) {
            for (const record of this.records.values()) {
                if (record.initial) this.schedule(record);
            }
        }
    }
    current(record) { return this.alive && this.records.get(record.drive.id) === record; }
    clearTimer(record) {
        if (record.timer) GLib.Source.remove(record.timer);
        record.timer = 0;
    }
    refresh() {
        if (!this.alive) return;
        for (const record of this.records.values()) {
            if (record.busy) continue;
            const wasConnected = record.state === State.CONNECTED;
            if (this.network.available && this.mounts.find(record.drive)) {
                record.state = State.CONNECTED;
                record.initial = false;
                record.attempt = 0;
                this.clearTimer(record);
            } else if (record.state !== State.ERROR) {
                record.state = State.DISCONNECTED;
            }
            if (wasConnected && record.state === State.DISCONNECTED && record.drive.reconnect && !record.suppressed)
                this.schedule(record);
        }
        this.changed();
    }
    schedule(record) {
        if (!this.current(record) || !this.network.available || record.busy || record.timer || record.suppressed || record.state === State.CONNECTED) return;
        const delay = retryDelay(record.attempt);
        if (delay === null) return;
        record.attempt++;
        record.timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, delay, () => {
            record.timer = 0;
            void this.connect(record, false);
            return GLib.SOURCE_REMOVE;
        });
    }
    networkChanged(available) {
        for (const record of this.records.values()) {
            this.clearTimer(record);
            if (!available) {
                record.networkInterrupted = record.busy;
                this.mounts.cancel(record.drive.id);
                record.state = State.DISCONNECTED;
            } else {
                record.attempt = 0;
                if (!record.suppressed && (record.initial || record.drive.reconnect)) this.schedule(record);
            }
        }
        this.refresh();
    }
    async connect(record, manual = true) {
        if (!this.current(record) || record.busy) return;
        this.clearTimer(record);
        if (manual) { record.suppressed = false; record.attempt = 0; }
        record.initial = false;
        record.busy = true;
        record.state = State.CONNECTING;
        this.changed();
        let again = false;
        try {
            await this.mounts.run(record.drive);
            if (this.current(record)) record.state = this.network.available ? State.CONNECTED : State.DISCONNECTED;
        } catch (error) {
            if (!this.current(record)) return;
            record.state = cancelled(error) ? State.DISCONNECTED : State.ERROR;
            if (cancelled(error) && this.network.available && !record.networkInterrupted) record.suppressed = true;
            if (manual && !cancelled(error)) this.notify(_('Could not connect to %s').replace('%s', () => record.drive.name), explain(error));
            again = !manual && retryable(error);
        } finally {
            record.busy = false;
            if (this.current(record)) {
                this.changed();
                if (again || (record.networkInterrupted && record.drive.reconnect)) this.schedule(record);
                record.networkInterrupted = false;
            }
        }
    }
    async disconnect(record) {
        if (!this.current(record) || record.busy) return;
        this.clearTimer(record);
        record.suppressed = true;
        record.busy = true;
        this.changed();
        try {
            await this.mounts.run(record.drive, true);
            if (this.current(record)) record.state = State.DISCONNECTED;
        } catch (error) {
            if (this.current(record) && !cancelled(error)) this.notify(_('Could not disconnect %s').replace('%s', () => record.drive.name), explain(error));
        } finally {
            record.busy = false;
            if (this.current(record)) this.refresh();
        }
    }
    open(record) {
        const cancellable = new Gio.Cancellable();
        this.launches.add(cancellable);
        Gio.AppInfo.launch_default_for_uri_async(buildUri(record.drive), global.create_app_launch_context(0, -1), cancellable, (_source, result) => {
            this.launches.delete(cancellable);
            try { Gio.AppInfo.launch_default_for_uri_finish(result); }
            catch (error) {
                if (this.alive && !cancelled(error)) this.notify(_('Could not open Files'), explain(error));
            }
        });
    }
    destroy() {
        this.alive = false;
        this.settings.disconnect(this.signal);
        this.network.destroy();
        for (const record of this.records.values()) this.clearTimer(record);
        for (const cancellable of this.launches) cancellable.cancel();
        this.launches.clear();
        this.mounts.destroy();
        this.records.clear();
        this.changed = () => {};
        this.notify = () => {};
    }
}
