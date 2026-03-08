/**
 * navigation/AppNavigator.tsx
 *
 * ROOT navigator — the single entry point for all navigation.
 *
 * Responsibilities:
 *  1. Wrap everything in <NavigationContainer> (required by React Navigation)
 *  2. Read auth state from Redux to decide which stack to show
 *  3. Show a SplashScreen while auth state is being restored from storage
 *  4. Perform an animated switch between AuthStack and MainStack
 *
 * Flow:
 *
 *   App starts
 *     └── isLoading === true  →  SplashScreen (loading spinner)
 *     └── isLoading === false
 *           ├── isAuthenticated === true   →  MainNavigator (tasks, profile)
 *           └── isAuthenticated === false  →  AuthNavigator (login, register)
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';

// Sub-navigators
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

// Redux store types and actions
import { RootState, AppDispatch } from '../store';
import { restoreSession } from '../store/slices/authSlice';

// Typed root param list
import { RootStackParamList } from './types';

// Theme constants
import { COLORS } from '../constants/colors';

// ─── Root stack ───────────────────────────────────────────────────────────────
// A single stack with two "screens": AuthStack and MainStack.
// React Navigation handles the animated transition between them automatically
// when isAuthenticated changes.
const RootStack = createNativeStackNavigator<RootStackParamList>();

// ─── Splash / Loading Screen ──────────────────────────────────────────────────

/**
 * SplashScreen
 * Shown for the brief moment while redux-persist is rehydrating (usually < 500ms).
 * Rendered as a full-screen component rather than a separate route so there's
 * no navigation history to clear after loading completes.
 */
const SplashScreen: React.FC = () => {
  // Pulse animation for the loading indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.splash}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <Animated.Text style={[styles.splashLogo, { transform: [{ scale: pulseAnim }] }]}>
        ✓
      </Animated.Text>
      <ActivityIndicator color={COLORS.white} size="small" style={styles.splashSpinner} />
    </View>
  );
};

// ─── App Navigator ────────────────────────────────────────────────────────────

const AppNavigator: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Pull the two critical auth flags from the Redux store
  // isRestoringSession is true ONLY during the initial Keychain/session read.
  // isLoading is true during login/register/logout operations (handled per-screen).
  const { isAuthenticated, isRestoringSession: isLoading } = useSelector(
    (state: RootState) => state.auth,
  );

  /**
   * navigationRef lets us navigate programmatically from outside React components,
   * e.g. from an Axios interceptor that receives a 401 and must redirect to Login.
   */
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // On mount — attempt to restore the session from secure storage (Keychain).
  // The authSlice thunk reads the stored JWT, validates it, and sets isAuthenticated.
  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  // ── Main navigation tree ──────────────────────────────────────────────────
  //
  // NavigationContainer is always mounted so react-native-screens never
  // initialises from scratch mid-render (which caused the "detached tree"
  // commit-phase error).  SplashScreen is a proper navigator screen so the
  // entire navigator tree exists before auth state is resolved.
  return (
    <NavigationContainer ref={navigationRef}>
      {/*
       * StatusBar is controlled globally here so Auth and Main screens
       * can override it individually via useFocusEffect if needed.
       */}
      <StatusBar
        barStyle={isAuthenticated ? 'dark-content' : 'light-content'}
        backgroundColor={isAuthenticated ? COLORS.background : COLORS.primary}
      />

      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          // Crossfade when switching between Splash, Auth and Main stacks
          animation: 'fade',
          animationDuration: 300,
        }}
      >
        {isLoading ? (
          /*
           * ── LOADING ─────────────────────────────────────────────────────
           * Show the splash screen while the persisted session is being
           * restored.  Keeping this inside the Navigator (rather than
           * short-circuiting before NavigationContainer) avoids tearing
           * down and remounting the entire navigation tree on every startup,
           * which was the root cause of the "detached tree" commit error.
           */
          <RootStack.Screen name="Splash" component={SplashScreen} />
        ) : isAuthenticated ? (
          /*
           * ── AUTHENTICATED ───────────────────────────────────────────────
           * Mounting MainStack and unmounting AuthStack means there is no
           * "back" navigation possible to Login — the user must log out.
           */
          <RootStack.Screen
            name="MainStack"
            component={MainNavigator}
            options={{ animation: 'fade' }}
          />
        ) : (
          /*
           * ── UNAUTHENTICATED ─────────────────────────────────────────────
           * AuthStack renders Login as its initial screen.
           * Mounting/unmounting is handled automatically by the conditional.
           */
          <RootStack.Screen
            name="AuthStack"
            component={AuthNavigator}
            options={{ animation: 'fade' }}
          />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    fontSize: 72,
    color: COLORS.white,
    fontWeight: '700',
    marginBottom: 24,
  },
  splashSpinner: {
    marginTop: 8,
  },
});

export default AppNavigator;
