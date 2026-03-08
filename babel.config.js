/**
 * babel.config.js
 *
 * Babel configuration for React Native CLI.
 * Uses the @react-native/babel-preset which handles:
 *  - JSX and TSX transformation
 *  - Modern JS syntax (async/await, optional chaining, etc.)
 *  - React Native-specific transforms (Animated useNativeDriver, etc.)
 */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    /**
     * react-native-reanimated/plugin must be listed LAST.
     * Required for react-native-gesture-handler to work correctly.
     */
    'react-native-reanimated/plugin',
  ],
};
