import Gio from 'gi://Gio';

export function driveIcon(symbolic = false) {
    const root = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();
    return new Gio.FileIcon({file: root.get_child(`icons/network-drives${symbolic ? '-symbolic' : ''}.svg`)});
}
