import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {fillPreferences} from './src/preferences.js';
export default class NetworkDrivesPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) { fillPreferences(window, this.getSettings()); }
}
