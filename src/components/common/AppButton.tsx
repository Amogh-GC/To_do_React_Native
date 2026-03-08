/**
 * components/common/AppButton.tsx
 *
 * Reusable primary/secondary/ghost button component.
 * Handles loading state (shows spinner, disables press),
 * disabled state, and optional left icon.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';

// ─── Props ────────────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  isLoading?: boolean;
  disabled?: boolean;
  leftIcon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

// ─── Gradient maps per variant ────────────────────────────────────────────────

const GRADIENTS: Record<Variant, string[]> = {
  primary:   [COLORS.primary, COLORS.primaryDark],
  secondary: [COLORS.surface, COLORS.surface],
  ghost:     [COLORS.transparent, COLORS.transparent],
  danger:    [COLORS.danger, COLORS.accent],
};

// ─── Component ────────────────────────────────────────────────────────────────

const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  leftIcon,
  style,
  textStyle,
  fullWidth = true,
}) => {
  const isDisabled = disabled || isLoading;

  const textColor =
    variant === 'secondary'
      ? COLORS.primary
      : variant === 'ghost'
      ? COLORS.textSecondary
      : COLORS.white;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
      style={[styles.touch, fullWidth && styles.fullWidth, style]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
    >
      {/* LinearGradient handles the background for all variants */}
      <LinearGradient
        colors={GRADIENTS[variant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.gradient,
          variant === 'secondary' && styles.secondaryBorder,
          isDisabled && styles.disabledOverlay,
        ]}
      >
        {/* Left icon (optional) */}
        {leftIcon && !isLoading ? (
          <Icon name={leftIcon} size={18} color={textColor} style={styles.icon} />
        ) : null}

        {/* Loading spinner replaces content when in-flight */}
        {isLoading ? (
          <ActivityIndicator
            color={variant === 'secondary' ? COLORS.primary : COLORS.white}
            size="small"
          />
        ) : (
          <Text style={[styles.label, { color: textColor }, textStyle]}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  touch: {
    borderRadius: 14,
    overflow: 'hidden',   // clips the gradient to the border radius
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  secondaryBorder: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  disabledOverlay: {
    opacity: 0.5,
  },
  label: {
    fontSize: FONTS.base,
    fontWeight: FONTS.semiBold,
    letterSpacing: 0.3,
  },
  icon: {
    marginRight: 2,
  },
});

export default AppButton;
