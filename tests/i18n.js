import {bindtextdomain} from 'gettext';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {DOMAIN, gettext as _} from '../src/i18n.js';
import {State, stateLabel} from '../src/constants.js';
import {newDrive, validateDrive} from '../src/drive.js';
import {serialize, deserialize} from '../src/settings.js';
import {explain} from '../src/errors.js';

bindtextdomain(DOMAIN, Gio.File.new_for_uri(import.meta.url).get_parent().get_parent().get_child('locale').get_path());
const japanese = GLib.getenv('LANGUAGE') === 'ja';
let count = 0;
function equal(actual, expected) {
    if (actual !== expected) throw new Error(`Expected ${expected}; got ${actual}`);
    count++;
}
equal(_('Add Network Drive'), japanese ? 'ネットワークドライブを追加' : 'Add Network Drive');
equal(stateLabel(State.CONNECTED), japanese ? '接続済み' : 'Connected');
equal(State.CONNECTED, 'Connected');
equal(_('Untranslated fallback'), 'Untranslated fallback');
const name = '日本語 NAS $&';
equal(_('Could not connect to %s').replace('%s', () => name), japanese ? `「${name}」に接続できませんでした` : `Could not connect to ${name}`);
try { validateDrive({...newDrive(), name: ''}); }
catch (e) { equal(e.message, japanese ? '名前を120文字以内で入力してください。' : 'Enter a name (up to 120 characters).'); }
const drive = {...newDrive(), name, server: 'nas.local', share: 'data'};
equal(deserialize(serialize([drive])).drives[0].name, name);
const error = new GLib.Error(Gio.io_error_quark(), Gio.IOErrorEnum.BUSY, 'private');
equal(explain(error), japanese ? 'ドライブは使用中です。ドライブ上のファイルを閉じてから再試行してください。' : 'The drive is in use. Close files on the drive and try again.');
print(`${count} translation assertions passed (${japanese ? 'Japanese' : 'English fallback'})`);
