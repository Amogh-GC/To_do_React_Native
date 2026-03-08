/**
 * store/slices/authSlice.ts
 *
 * Redux slice for authentication state.
 *
 * Async thunks (each maps to an authService method):
 *  - restoreSession  → called on app launch to rehydrate from Keychain
 *  - registerUser    → creates a new Firebase account
 *  - loginUser       → signs in to an existing account
 *  - logoutUser      → signs out and clears Keychain + Redux state
 *  - forgotPassword  → sends a Firebase password reset email
 *
 * State:
 *  - user            → AuthUser | null
 *  - token           → JWT string | null
 *  - isAuthenticated → drives AppNavigator routing
 *  - isLoading       → drives SplashScreen + button disabled states
 *  - error           → human-readable error shown in form screens
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import authService, { getFirebaseErrorMessage } from '../../services/authService';
import { AuthUser } from '../../types/auth.types';

// ─── State shape ──────────────────────────────────────────────────────────────

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  /** true while any async auth operation is in flight */
  isLoading: boolean;
  error: string | null;
  /** true specifically during the initial session restore (shows SplashScreen) */
  isRestoringSession: boolean;
}

const initialState: AuthState = {
  user:               null,
  token:              null,
  isAuthenticated:    false,
  isLoading:          false,
  error:              null,
  isRestoringSession: true,   // true until restoreSession settles
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * restoreSession
 * Called once by AppNavigator on mount. Reads the stored token from Keychain,
 * validates JWT expiry, and refreshes if needed. Sets isAuthenticated accordingly.
 */
export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      const result = await authService.restoreSession();
      return result; // { user, token } | null
    } catch {
      return rejectWithValue('Failed to restore session.');
    }
  },
);

/**
 * registerUser
 * Creates a new Firebase account, a Firestore user document,
 * and persists credentials to Keychain.
 */
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (
    { name, email, password }: { name: string; email: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      return await authService.register(name, email, password);
    } catch (error: any) {
      console.error('[registerUser] Firebase error:', error.code, error.message);
      return rejectWithValue(getFirebaseErrorMessage(error.code ?? ''));
    }
  },
);

/**
 * loginUser
 * Signs the user in with email + password and persists credentials.
 */
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      return await authService.login(email, password);
    } catch (error: any) {
      return rejectWithValue(getFirebaseErrorMessage(error.code ?? ''));
    }
  },
);

/**
 * logoutUser
 * Signs out from Firebase and clears Keychain + Redux auth state.
 */
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
    } catch {
      return rejectWithValue('Logout failed. Please try again.');
    }
  },
);

/**
 * forgotPassword
 * Sends a Firebase password reset email.
 */
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async ({ email }: { email: string }, { rejectWithValue }) => {
    try {
      await authService.sendPasswordResetEmail(email);
      return true;
    } catch (error: any) {
      return rejectWithValue(getFirebaseErrorMessage(error.code ?? ''));
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,

  reducers: {
    /** Set credentials directly (e.g. after a token refresh) */
    setCredentials: (
      state,
      action: PayloadAction<{ user: AuthUser; token: string }>,
    ) => {
      state.user            = action.payload.user;
      state.token           = action.payload.token;
      state.isAuthenticated = true;
      state.error           = null;
    },

    /** Clear all credentials (used by logoutUser.fulfilled) */
    clearCredentials: (state) => {
      state.user            = null;
      state.token           = null;
      state.isAuthenticated = false;
      state.error           = null;
    },

    /** Store a human-readable error message */
    setAuthError: (state, action: PayloadAction<string>) => {
      state.error     = action.payload;
      state.isLoading = false;
    },

    /** Clear the error — called when user starts editing after a failed attempt */
    clearAuthError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    // ── restoreSession ────────────────────────────────────────────────────────
    builder
      .addCase(restoreSession.pending, (state) => {
        state.isRestoringSession = true;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.isRestoringSession = false;
        if (action.payload) {
          state.user            = action.payload.user;
          state.token           = action.payload.token;
          state.isAuthenticated = true;
        } else {
          state.isAuthenticated = false;
        }
      })
      .addCase(restoreSession.rejected, (state) => {
        state.isRestoringSession = false;
        state.isAuthenticated    = false;
      });

    // ── registerUser ──────────────────────────────────────────────────────────
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error     = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading       = false;
        state.user            = action.payload.user;
        state.token           = action.payload.token;
        state.isAuthenticated = true;
        state.error           = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string;
      });

    // ── loginUser ─────────────────────────────────────────────────────────────
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error     = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading       = false;
        state.user            = action.payload.user;
        state.token           = action.payload.token;
        state.isAuthenticated = true;
        state.error           = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string;
      });

    // ── logoutUser ────────────────────────────────────────────────────────────
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, () => {
        // Return a fresh initial state (isRestoringSession = false so no splash)
        return { ...initialState, isRestoringSession: false };
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string;
      });

    // ── forgotPassword ────────────────────────────────────────────────────────
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true;
        state.error     = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string;
      });
  },
});

export const {
  setCredentials,
  clearCredentials,
  setAuthError,
  clearAuthError,
} = authSlice.actions;

export default authSlice.reducer;
