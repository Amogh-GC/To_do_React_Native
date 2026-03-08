/**
 * navigation/AuthNavigator.tsx
 *
 * Stack navigator for the unauthenticated flow.
 * Screens: Login → Register → ForgotPassword
 *
 * Shown by AppNavigator when auth.isAuthenticated === false.
 * Uses a slide animation and hides the default header in favour of
 * custom per-screen headers so we have full design control.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screen imports
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Typed param list for this stack
import { AuthStackParamList } from './types';

// ─── Create a typed stack navigator ──────────────────────────────────────────
const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      /**
       * Initial route — user always lands on Login first.
       * After successful registration, the app navigates back to Login
       * (or directly to Main, depending on the auth service flow).
       */
      initialRouteName="Login"
      screenOptions={{
        // Hide the native header — each auth screen renders its own header
        headerShown: false,

        // Smooth horizontal slide between auth screens
        animation: 'slide_from_right',

        // Prevent going back to Login once authenticated (handled by AppNavigator)
        gestureEnabled: true,

        // Dark status bar for the light auth background
        statusBarStyle: 'dark',
      }}
    >
      {/* ── Login ─────────────────────────────────────────────────────────── */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          // Fade in on the very first screen instead of a slide
          animation: 'fade',
        }}
      />

      {/* ── Register ──────────────────────────────────────────────────────── */}
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* ── Forgot Password ───────────────────────────────────────────────── */}
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          animation: 'slide_from_bottom',
          // Allow swipe-down to dismiss (modal feel)
          gestureDirection: 'vertical',
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
