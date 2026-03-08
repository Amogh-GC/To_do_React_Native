/**
 * components/common/AppInput.tsx
 *
 * Reusable text input component used across all forms.
 * Wraps React Native's TextInput with:
 *  - Consistent styling (border, focus state, error state)
 *  - An optional left icon
 *  - A show/hide toggle for password fields
 *  - An inline error message slot (driven by react-hook-form)
 *  - Full TypeScript prop types
 */

import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppInputProps extends TextInputProps {
  /** Label shown above the input */
  label?: string;
  /** Error message shown below the input (from react-hook-form) */
  error?: string;
  /** MaterialCommunityIcons icon name shown on the left */
  leftIcon?: string;
  /** Override container style */
  containerStyle?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * forwardRef lets react-hook-form's Controller access the underlying
 * TextInput ref for focus management between fields.
 */
const AppInput = forwardRef<TextInput, AppInputProps>(
  (
    {
      label,
      error,
      leftIcon,
      containerStyle,
      secureTextEntry,
      ...rest
    },
    ref,
  ) => {
    // Track focus for the highlight ring
    const [isFocused, setIsFocused] = useState(false);

    // Toggle plain text / hidden for password inputs
    const [isSecure, setIsSecure] = useState(secureTextEntry ?? false);

    const hasError   = Boolean(error);
    const isPassword = secureTextEntry === true;

    // Determine border colour based on state priority: error > focus > idle
    const borderColor = hasError
      ? COLORS.danger
      : isFocused
      ? COLORS.primary
      : COLORS.border;

    return (
      <View style={[styles.wrapper, containerStyle]}>
        {/* ── Label ─────────────────────────────────────────────────────── */}
        {label ? (
          <Text style={styles.label}>{label}</Text>
        ) : null}

        {/* ── Input row ─────────────────────────────────────────────────── */}
        <View style={[styles.inputRow, { borderColor }]}>
          {/* Left icon */}
          {leftIcon ? (
            <Icon
              name={leftIcon}
              size={20}
              color={isFocused ? COLORS.primary : COLORS.textSecondary}
              style={styles.leftIcon}
            />
          ) : null}

          {/* Text input */}
          <TextInput
            ref={ref}
            style={styles.input}
            placeholderTextColor={COLORS.textDisabled}
            secureTextEntry={isSecure}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoCapitalize="none"
            autoCorrect={false}
            {...rest}
          />

          {/* Show/hide toggle for password fields */}
          {isPassword ? (
            <TouchableOpacity
              onPress={() => setIsSecure((prev) => !prev)}
              accessibilityLabel={isSecure ? 'Show password' : 'Hide password'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                name={isSecure ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={COLORS.textSecondary}
                style={styles.rightIcon}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── Error message ─────────────────────────────────────────────── */}
        {hasError ? (
          <View style={styles.errorRow}>
            <Icon name="alert-circle-outline" size={13} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>
    );
  },
);

AppInput.displayName = 'AppInput';

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.base,
  },
  label: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    height: 52,
  },
  leftIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    paddingVertical: 0,   // remove default vertical padding on Android
  },
  rightIcon: {
    marginLeft: SPACING.sm,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  errorText: {
    fontSize: FONTS.xs,
    color: COLORS.danger,
    flex: 1,
  },
});

export default AppInput;
