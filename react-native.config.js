/**
 * react-native.config.js
 *
 * React Native CLI configuration.
 * Used to configure assets like fonts/icons that need to be linked
 * into native Android/iOS resource folders via `react-native link`.
 *
 * After running `npx react-native link`, MaterialCommunityIcons fonts
 * will be copied to:
 *   Android → android/app/src/main/assets/fonts/
 *   iOS     → ios/TodoApp/Fonts/
 */
module.exports = {
  assets: ['./node_modules/react-native-vector-icons/Fonts'],
};
