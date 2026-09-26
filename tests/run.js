import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {newDrive, validateDrive} from '../src/drive.js';
import {buildUri, mountMatches} from '../src/uriBuilder.js';
import {serialize, deserialize} from '../src/settings.js';
import {retryDelay} from '../src/constants.js';
import {cancelled, retryable, explain} from '../src/errors.js';
let count = 0;
function equal(actual, expected) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    count++;
}
function rejects(fn) {
    try { fn(); } catch { count++; return; }
    throw new Error('Expected validation failure');
}
const d = {...newDrive(), name: 'Home NAS', server: 'nas.local', share: 'data'};
equal(buildUri(d), 'smb://nas.local/data');
equal(buildUri({...d, server: '192.168.1.4'}), 'smb://192.168.1.4/data');
equal(buildUri({...d, server: '2001:db8::1'}), 'smb://[2001:db8::1]/data');
equal(buildUri({...d, server: '[::1]'}), 'smb://[::1]/data');
equal(buildUri({...d, protocol: 'sftp', username: 'yuuma', port: 22, path: '/home/yuuma'}), 'sftp://yuuma@nas.local:22/home/yuuma');
equal(buildUri({...d, protocol: 'sftp', username: 'a@b: /', path: '/a b/#?%/日本'}), 'sftp://a%40b%3A%20%2F@nas.local/a%20b/%23%3F%25/%E6%97%A5%E6%9C%AC');
for (const protocol of ['dav', 'davs']) equal(buildUri({...d, protocol, path: '/files', port: 8443}), `${protocol}://nas.local:8443/files`);
equal(buildUri({...d, share: 'my data'}), 'smb://nas.local/my%20data');
for (const bad of [{name: ''}, {server: ''}, {server: 'host/path'}, {server: 'u:p@host'}, {server: 'https://host'}, {server: ':::1'}, {server: 'host:22'}, {share: ''}, {share: 'a/b'}, {port: 0}, {port: 65536}, {port: 1.5}, {port: '22'}, {protocol: 'nfs'}, {id: 'bad'}, {autoConnect: 'yes'}, {username: 'a\nb'}]) rejects(() => validateDrive({...d, ...bad}));
const saved = serialize([{...d, password: 'DO_NOT_SAVE', unknown: 'ignored'}]);
equal(saved.includes('DO_NOT_SAVE'), false);
equal(saved.includes('unknown'), false);
equal(deserialize(saved).drives[0], validateDrive(d));
for (const text of ['broken', '{}', 'null', '{"version":2,"drives":[]}', '{"version":1,"drives":{}}', JSON.stringify({version: 1, drives: [d, d]})]) equal(Boolean(deserialize(text).error), true);
rejects(() => serialize([d, d]));
equal(deserialize('{"version":1,"drives":[]}').drives, []);
equal([0, 1, 2, 3, 4, 5].map(retryDelay), [1, 2, 5, 10, 30, null]);
equal(mountMatches('sftp://me@host:22/home/me', 'sftp://me@HOST/'), true);
equal(mountMatches('smb://host/data/sub', 'smb://host/data'), true);
equal(mountMatches('smb://host/database', 'smb://host/data'), false);
equal(mountMatches('sftp://other@host/', 'sftp://me@host/'), false);
equal(mountMatches('davs://host/', 'dav://host/'), false);
equal(mountMatches('smb://other/data', 'smb://host/data'), false);
equal(mountMatches('not a uri', 'smb://host/data'), false);
const error = code => new GLib.Error(Gio.io_error_quark(), code, 'private server detail');
equal(cancelled(error(Gio.IOErrorEnum.CANCELLED)), true);
equal(retryable(error(Gio.IOErrorEnum.TIMED_OUT)), true);
equal(retryable(error(Gio.IOErrorEnum.PERMISSION_DENIED)), false);
equal(explain(error(Gio.IOErrorEnum.FAILED)).includes('private'), false);
print(`${count} assertions passed`);
