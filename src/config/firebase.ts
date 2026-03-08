/**
 * config/firebase.ts
 *
 * Firebase initialisation for React Native using @react-native-firebase.
 *
 * IMPORTANT — React Native Firebase (RNFB) is a native module:
 * it does NOT need a `firebase.initializeApp()` call in JavaScript.
 * Configuration is handled entirely through:
 *   Android → android/app/google-services.json
 *   iOS     → ios/GoogleService-Info.plist
 *
 * This file acts as a thin import wrapper so the rest of the app
 * imports from ONE place and never directly from '@react-native-firebase/*'.
 * That way, if the library ever changes, only this file needs updating.
 *
 * Setup checklist:
 *  1. Create a Firebase project at https://console.firebase.google.com
 *  2. Register your Android app (package: com.todoapp)
 *  3. Download google-services.json → place in android/app/
 *  4. Register your iOS app (bundle: com.todoapp)
 *  5. Download GoogleService-Info.plist → add to ios/TodoApp/ via Xcode
 *  6. Enable Email/Password sign-in in Firebase Console →
 *     Authentication → Sign-in method → Email/Password → Enable
 */

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Re-export the auth and firestore instances so screens/services
// import from here rather than directly from the Firebase packages.
export { auth, firestore };

/**
 * Firestore collection names — defined as constants to prevent typos.
 * Import COLLECTIONS in services instead of hard-coding strings.
 */
export const COLLECTIONS = {
  USERS: 'users',
  TASKS: 'tasks',
} as const;
