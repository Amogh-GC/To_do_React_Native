/**
 * metro.config.js
 *
 * Metro bundler configuration for React Native CLI.
 * Extends the default @react-native/metro-config preset.
 *
 * Customisations:
 *  - None required for now — the defaults work for this project.
 *
 * See: https://facebook.github.io/metro/docs/configuration
 */
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
