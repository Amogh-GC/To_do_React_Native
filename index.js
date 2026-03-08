/**
 * index.js — React Native entry point.
 *
 * registerComponent MUST be called with the same string that is used in:
 *   Android: android/app/src/main/java/.../MainApplication.kt  (getMainComponentName)
 *   iOS:     ios/TodoApp/AppDelegate.mm                        (moduleName)
 *
 * The string must exactly match "TodoApp" as configured in the native modules.
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
