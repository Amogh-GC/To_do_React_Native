/**
 * services/authService.ts
 *
 * All Firebase Authentication operations live here.
 * Screens and Redux thunks call these methods — they never import Firebase directly.
 *
 * Flow for register / login:
 *  1. Call Firebase Auth (createUser / signIn)
 *  2. Retrieve the Firebase ID token (JWT)
 *  3. Persist the token + serialised user to device Keychain
 *  4. Return { user, token } to the calling thunk
 *
 * Flow for logout:
 *  1. Sign out from Firebase
 *  2. Delete token from Keychain
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import * as Keychain from 'react-native-keychain';
import { AuthUser, AuthResult, FirebaseAuthErrorCode } from '../types/auth.types';
import { COLLECTIONS } from '../config/firebase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * mapFirebaseUser
 * Converts a Firebase `User` object into our plain `AuthUser` shape.
 * Plain objects are safe to serialise into Redux + Keychain.
 */
const mapFirebaseUser = (firebaseUser: FirebaseAuthTypes.User): AuthUser => ({
  uid:           firebaseUser.uid,
  email:         firebaseUser.email ?? '',
  displayName:   firebaseUser.displayName,
  photoURL:      firebaseUser.photoURL,
  emailVerified: firebaseUser.emailVerified,
  createdAt:     firebaseUser.metadata.creationTime ?? new Date().toISOString(),
});

/**
 * getFirebaseErrorMessage
 * Converts Firebase error codes into user-friendly strings.
 * Returns a generic fallback for unknown codes.
 */
export const getFirebaseErrorMessage = (code: string): string => {
  const messages: Record<FirebaseAuthErrorCode, string> = {
    'auth/email-already-in-use':   'An account with this email already exists.',
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/weak-password':          'Password is too weak. Use at least 8 characters.',
    'auth/user-not-found':         'No account found with this email.',
    'auth/wrong-password':         'Incorrect password. Please try again.',
    'auth/too-many-requests':      'Too many attempts. Please try again later.',
    'auth/user-disabled':          'This account has been disabled.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/invalid-credential':     'Invalid credentials. Please try again.',
    'auth/operation-not-allowed':  'Email/password sign-in is not enabled. Please contact support.',
  };
  return messages[code as FirebaseAuthErrorCode] ?? `An unexpected error occurred. (code: ${code || 'unknown'})`;
};

/**
 * persistCredentials
 * Saves the token and user to device Keychain (iOS Keychain / Android Keystore).
 * Much more secure than AsyncStorage for sensitive auth tokens.
 */
const persistCredentials = async (token: string, user: AuthUser): Promise<void> => {
  // Keychain.setGenericPassword(username, password):
  //   username → JWT token
  //   password → serialised user JSON
  await Keychain.setGenericPassword(token, JSON.stringify(user), {
    service: 'com.todoapp.auth',
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  });
};

// ─── Auth Service ─────────────────────────────────────────────────────────────

const authService = {
  /**
   * register
   * Creates a new Firebase account, sets the display name, creates a
   * corresponding Firestore user document, then persists credentials locally.
   *
   * @param name     - Full name (stored as displayName in Firebase Auth + Firestore)
   * @param email    - User's email address
   * @param password - Plain-text password (Firebase hashes it securely)
   */
  register: async (name: string, email: string, password: string): Promise<AuthResult> => {
    // 1. Create the Firebase Auth account
    const credential = await auth().createUserWithEmailAndPassword(email, password);

    // 2. Set the display name on the Firebase profile
    await credential.user.updateProfile({ displayName: name });

    // 3. Reload the user to reflect the updated displayName
    await credential.user.reload();
    const updatedUser = auth().currentUser!;

    // 4. Get the Firebase ID token (JWT) — expires in 1 hour, Firebase auto-renews
    const token = await updatedUser.getIdToken();

    // 5. Map Firebase user to our plain AuthUser shape
    const user = mapFirebaseUser(updatedUser);

    // 6. Create a Firestore document for the user so we can store preferences,
    //    task metadata, etc. later. Uses the Firebase UID as the document ID.
    await firestore().collection(COLLECTIONS.USERS).doc(user.uid).set({
      uid:         user.uid,
      email:       user.email,
      displayName: user.displayName,
      createdAt:   firestore.FieldValue.serverTimestamp(),
      updatedAt:   firestore.FieldValue.serverTimestamp(),
    });

    // 7. Persist token + user to Keychain for session restoration
    await persistCredentials(token, user);

    return { user, token };
  },

  /**
   * login
   * Signs in an existing Firebase account and persists credentials locally.
   *
   * @param email    - Registered email
   * @param password - Plain-text password
   */
  login: async (email: string, password: string): Promise<AuthResult> => {
    // 1. Sign in with Firebase — throws on wrong credentials
    const credential = await auth().signInWithEmailAndPassword(email, password);

    // 2. Get a fresh ID token
    const token = await credential.user.getIdToken();

    // 3. Map to our AuthUser shape
    const user = mapFirebaseUser(credential.user);

    // 4. Persist to Keychain
    await persistCredentials(token, user);

    return { user, token };
  },

  /**
   * logout
   * Signs out from Firebase and removes credentials from the device Keychain.
   * After this, restoreSession() will return null → AppNavigator shows AuthStack.
   */
  logout: async (): Promise<void> => {
    // 1. Sign out from Firebase (invalidates the current session)
    await auth().signOut();

    // 2. Remove stored credentials from the device Keychain
    await Keychain.resetGenericPassword({ service: 'com.todoapp.auth' });
  },

  /**
   * sendPasswordResetEmail
   * Sends Firebase's standard password reset email to the given address.
   * Does NOT throw if the email is not registered (security best-practice:
   * never confirm whether an email exists).
   */
  sendPasswordResetEmail: async (email: string): Promise<void> => {
    await auth().sendPasswordResetEmail(email);
  },

  /**
   * restoreSession
   * Called on app launch. Reads credentials from Keychain and validates
   * expiry of the JWT. Returns AuthResult if valid, null otherwise.
   */
  restoreSession: async (): Promise<AuthResult | null> => {
    const credentials = await Keychain.getGenericPassword({
      service: 'com.todoapp.auth',
    });
    if (!credentials) return null;

    const { username: token, password: userJson } = credentials;
    if (!token) return null;

    // Decode JWT payload (base64) to check expiry — no library needed
    try {
      const [, payloadB64] = token.split('.');
      // React Native's JS engine supports atob
      const payload = JSON.parse(atob(payloadB64));
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        // Try to refresh via the currently signed-in Firebase user
        const currentUser = auth().currentUser;
        if (currentUser) {
          const freshToken = await currentUser.getIdToken(/* forceRefresh */ true);
          const user = mapFirebaseUser(currentUser);
          await persistCredentials(freshToken, user);
          return { user, token: freshToken };
        }
        // No Firebase user — clear stale Keychain entry and force re-login
        await Keychain.resetGenericPassword({ service: 'com.todoapp.auth' });
        return null;
      }

      const user: AuthUser = JSON.parse(userJson);
      return { user, token };
    } catch {
      return null;
    }
  },

  /**
   * getCurrentUser
   * Utility to get the currently signed-in Firebase user synchronously.
   * Returns null if no user is signed in.
   */
  getCurrentUser: (): AuthUser | null => {
    const firebaseUser = auth().currentUser;
    return firebaseUser ? mapFirebaseUser(firebaseUser) : null;
  },
};

export default authService;
