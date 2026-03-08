/**
 * hooks/useAuth.ts
 *
 * Custom hook that encapsulates all authentication actions.
 * Screens import `useAuth` instead of calling `useDispatch` directly,
 * keeping the screens thin and the auth logic testable in one place.
 *
 * Returns:
 *  - user, isAuthenticated, isLoading, error  → from Redux auth state
 *  - register, login, logout, sendResetEmail  → dispatch wrappers
 *  - clearError                               → resets the error field
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  registerUser,
  loginUser,
  logoutUser,
  forgotPassword,
  clearAuthError,
} from '../store/slices/authSlice';

const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Pull the entire auth slice from Redux
  const { user, token, isAuthenticated, isLoading, error, isRestoringSession } =
    useSelector((state: RootState) => state.auth);

  // ── Action dispatchers ────────────────────────────────────────────────────

  /**
   * register
   * Dispatches registerUser thunk. Returns true on success, false on failure.
   * The screen can await this to navigate on success.
   */
  const register = useCallback(
    async (name: string, email: string, password: string): Promise<boolean> => {
      const result = await dispatch(registerUser({ name, email, password }));
      return registerUser.fulfilled.match(result);
    },
    [dispatch],
  );

  /**
   * login
   * Dispatches loginUser thunk. Returns true on success.
   */
  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const result = await dispatch(loginUser({ email, password }));
      return loginUser.fulfilled.match(result);
    },
    [dispatch],
  );

  /**
   * logout
   * Signs the user out and clears all state.
   * AppNavigator automatically switches to AuthStack once isAuthenticated = false.
   */
  const logout = useCallback(async (): Promise<void> => {
    await dispatch(logoutUser());
  }, [dispatch]);

  /**
   * sendResetEmail
   * Sends a Firebase password-reset email to the given address.
   * Returns true if the request was sent (regardless of whether the
   * email is registered — for security).
   */
  const sendResetEmail = useCallback(
    async (email: string): Promise<boolean> => {
      const result = await dispatch(forgotPassword({ email }));
      return forgotPassword.fulfilled.match(result);
    },
    [dispatch],
  );

  /**
   * clearError
   * Called when the user starts editing a field after a failed auth attempt.
   */
  const clearError = useCallback(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    // State
    user,
    token,
    isAuthenticated,
    isLoading,
    isRestoringSession,
    error,

    // Actions
    register,
    login,
    logout,
    sendResetEmail,
    clearError,
  };
};

export default useAuth;
