/**
 * App.tsx  — Application entry point
 *
 * Responsibilities:
 *  1. Provide the Redux store to the entire component tree via <Provider>
 *  2. Gate rendering behind <PersistGate> so the store is rehydrated
 *     from AsyncStorage before any screen is mounted
 *  3. Render <AppNavigator> which handles all routing logic
 *
 * Nothing else lives here — keep this file as lean as possible.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

// Store and persistor
import { store, persistor } from './src/store';

// Root navigator
import AppNavigator from './src/navigation/AppNavigator';

const App: React.FC = () => {
  return (
    /**
     * GestureHandlerRootView must wrap the entire app for react-native-gesture-handler
     * to work correctly (required by React Navigation and swipe gestures).
     * flex: 1 ensures it fills the screen.
     */
    <GestureHandlerRootView style={styles.root}>
      {/*
       * SafeAreaProvider enables useSafeAreaInsets() in every screen descendant.
       * Without this, safe area insets would always return zero on all devices.
       */}
      <SafeAreaProvider>
        {/* Provide the Redux store to all child components */}
        <Provider store={store}>
          {/*
           * PersistGate delays rendering the navigator until the persisted
           * Redux state is fully rehydrated. loading={null} means nothing
           * is shown during rehydration — AppNavigator's own SplashScreen
           * handles the loading state via isLoading in authSlice.
           */}
          <PersistGate loading={null} persistor={persistor}>
            <AppNavigator />
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
