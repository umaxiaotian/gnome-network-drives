import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {ShellMountOperation} from 'resource:///org/gnome/shell/ui/shellMountOperation.js';
import {buildUri, mountMatches} from './uriBuilder.js';
import {isError} from './errors.js';

export class MountManager {
    constructor(changed) {
        this.monitor = Gio.VolumeMonitor.get();
        this.signals = ['mount-added', 'mount-removed', 'mount-changed'].map(s => this.monitor.connect(s, changed));
        this.pending = new Map();
    }
    find(drive) {
        const uri = buildUri(drive);
        return this.monitor.get_mounts().find(m => !m.is_shadowed() && mountMatches(uri, m.get_root().get_uri())) ?? null;
    }
    async run(drive, disconnect = false) {
        if (this.pending.has(drive.id)) throw new GLib.Error(Gio.io_error_quark(), Gio.IOErrorEnum.PENDING, 'A previous connection is still closing.');
        const mount = this.find(drive);
        if (disconnect && !mount) return;
        if (!disconnect && mount) return;
        const cancellable = new Gio.Cancellable();
        // The Shell helper only requires get_drive(); network locations have no physical drive.
        const helper = new ShellMountOperation(mount ?? {get_drive: () => null});
        helper.mountOp.set_username(drive.username);
        helper.mountOp.set_domain(drive.domain);
        const timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 90, () => {
            entry.timeout = 0;
            entry.timedOut = true;
            cancellable.cancel();
            helper.close();
            return GLib.SOURCE_REMOVE;
        });
        const entry = {cancellable, helper, timeout};
        this.pending.set(drive.id, entry);
        try {
            await new Promise((resolve, reject) => {
                const done = (object, result) => {
                    try {
                        if (disconnect) object.unmount_with_operation_finish(result);
                        else object.mount_enclosing_volume_finish(result);
                        resolve();
                    } catch (error) {
                        if (!disconnect && isError(error, Gio.IOErrorEnum.ALREADY_MOUNTED)) resolve();
                        else reject(error);
                    }
                };
                if (disconnect) mount.unmount_with_operation(Gio.MountUnmountFlags.NONE, helper.mountOp, cancellable, done);
                else Gio.File.new_for_uri(buildUri(drive)).mount_enclosing_volume(Gio.MountMountFlags.NONE, helper.mountOp, cancellable, done);
            });
        } catch (error) {
            if (entry.timedOut) throw new GLib.Error(Gio.io_error_quark(), Gio.IOErrorEnum.TIMED_OUT, 'Connection timed out');
            throw error;
        } finally {
            if (entry.timeout) GLib.Source.remove(entry.timeout);
            entry.timeout = 0;
            helper.close();
            if (this.pending.get(drive.id) === entry) this.pending.delete(drive.id);
        }
    }
    cancel(id) {
        const entry = this.pending.get(id);
        if (!entry) return;
        entry.cancellable.cancel();
        entry.helper.close();
        if (entry.timeout) GLib.Source.remove(entry.timeout);
        entry.timeout = 0;
    }
    destroy() {
        for (const id of this.signals) this.monitor.disconnect(id);
        for (const id of this.pending.keys()) this.cancel(id);
        this.signals = [];
    }
}
