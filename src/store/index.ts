/**
 * store/index.ts
 *
 * Redux store configuration with redux-persist.
 *
 * Persisted slices:
 *  - auth   → stores the user object and token so re-opening the app
 *             skips the login screen (if not expired)
 *
 * Not persisted (rebuilt fresh each session):
 *  - tasks  → fetched from the backend on login; local-only cache
 *             could be added later as a performance optimisation
 *
 * Exports:
 *  - store         — the configured Redux store
 *  - RootState     — inferred type of the full state tree
 *  - AppDispatch   — typed dispatch that understands async thunks
 *  - persistor     — used in App.tsx with <PersistGate>
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Slice reducers
import authReducer  from './slices/authSlice';
import tasksReducer from './slices/tasksSlice';

// ─── Persist configuration ────────────────────────────────────────────────────

/**
 * Auth persist — only serialise the three fields needed for session restoration.
 * isLoading, error, and isRestoringSession are transient and must NOT be persisted.
 */
const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['user', 'token', 'isAuthenticated'],
};

/**
 * Tasks persist — cache tasks locally so the list shows instantly on relaunch
 * before the Firestore fetch resolves. Only items, filter, and sortBy are stored.
 * Transient fields (isLoading, error, operatingId) are excluded.
 */
const tasksPersistConfig = {
  key: 'tasks',
  storage: AsyncStorage,
  whitelist: ['items', 'filter', 'sortBy'],
};

// ─── Root reducer ─────────────────────────────────────────────────────────────

const rootReducer = combineReducers({
  // Auth — persisted (session token + user profile)
  auth:  persistReducer(authPersistConfig, authReducer),
  // Tasks — persisted (local cache for instant list on startup)
  tasks: persistReducer(tasksPersistConfig, tasksReducer),
});

// ─── Store ────────────────────────────────────────────────────────────────────

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        /**
         * redux-persist dispatches non-serializable actions internally.
         * Ignoring them here prevents console warnings.
         */
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  // Enable Redux DevTools Extension in __DEV__ builds
  devTools: __DEV__,
});

// ─── Persistor ────────────────────────────────────────────────────────────────

export const persistor = persistStore(store);

// ─── Type exports ─────────────────────────────────────────────────────────────

/** Inferred type of the complete Redux state tree */
export type RootState = ReturnType<typeof store.getState>;

/** Typed dispatch — understands async thunks created with createAsyncThunk */
export type AppDispatch = typeof store.dispatch;
