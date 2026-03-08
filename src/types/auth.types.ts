/**
 * types/auth.types.ts
 *
 * All TypeScript interfaces and types related to authentication.
 * Imported by authService, authSlice, screens, and hooks.
 */

// ─── User ─────────────────────────────────────────────────────────────────────

/** The user object stored in Redux and serialised to Keychain/AsyncStorage */
export interface AuthUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  createdAt: string;   // ISO date string
}

// ─── Auth State (mirrors authSlice state shape) ────────────────────────────────

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ─── Form payloads ─────────────────────────────────────────────────────────────

/** Data submitted by the Register form */
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/** Data submitted by the Login form */
export interface LoginPayload {
  email: string;
  password: string;
}

/** Data submitted by the Forgot Password form */
export interface ForgotPasswordPayload {
  email: string;
}

// ─── Auth service result ───────────────────────────────────────────────────────

/** Successful auth result returned by authService methods */
export interface AuthResult {
  user: AuthUser;
  token: string;
}

// ─── Firebase error codes ─────────────────────────────────────────────────────

/**
 * Subset of Firebase Auth error codes used for user-friendly messages.
 * See full list: https://firebase.google.com/docs/auth/admin/errors
 */
export type FirebaseAuthErrorCode =
  | 'auth/email-already-in-use'
  | 'auth/invalid-email'
  | 'auth/weak-password'
  | 'auth/user-not-found'
  | 'auth/wrong-password'
  | 'auth/too-many-requests'
  | 'auth/user-disabled'
  | 'auth/network-request-failed'
  | 'auth/invalid-credential'
  | 'auth/operation-not-allowed';
