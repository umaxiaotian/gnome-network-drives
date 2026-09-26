import Gio from 'gi://Gio';
export class NetworkMonitor {
    constructor(changed) {
        this.monitor = Gio.NetworkMonitor.get_default();
        this.available = this.monitor.network_available;
        this.signal = this.monitor.connect('network-changed', (_monitor, available) => {
            const previous = this.available;
            this.available = available;
            if (previous !== available) changed(available);
        });
    }
    destroy() { this.monitor.disconnect(this.signal); }
}
