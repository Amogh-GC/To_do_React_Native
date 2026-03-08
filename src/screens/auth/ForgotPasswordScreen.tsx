/**
 * screens/auth/ForgotPasswordScreen.tsx
 *
 * Forgot Password screen — sends a Firebase password reset email.
 *
 * Presents as a modal (slide up from bottom) so the user doesn't lose
 * the Login screen state underneath.
 *
 * Flow:
 *  1. User enters email → Yup validates format
 *  2. On submit → dispatch forgotPassword thunk
 *  3. On success → show confirmation message (NOT back to Login, so user knows it worked)
 *  4. On failure (rate limit, network) → show error banner
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Components & hooks
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import useAuth from '../../hooks/useAuth';

// Validation + types + constants
import { forgotPasswordSchema, ForgotPasswordFormValues } from '../../utils/validators';
import { ForgotPasswordNavigationProp } from '../../navigation/types';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';

// ─── Component ────────────────────────────────────────────────────────────────

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ForgotPasswordNavigationProp>();
  const { sendResetEmail, isLoading, error, clearError } = useAuth();

  // Track whether the email was sent successfully to show confirmation UI
  const [emailSent, setEmailSent] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    const success = await sendResetEmail(values.email);
    if (success) setEmailSent(true);
  };

  // ── Confirmation screen ────────────────────────────────────────────────
  if (emailSent) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Icon name="email-check-outline" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.successTitle}>Check your inbox</Text>
          <Text style={styles.successSubtitle}>
            We sent a password reset link to{'\n'}
            <Text style={styles.successEmail}>{getValues('email')}</Text>
          </Text>
          <Text style={styles.successHint}>
            Can't find it? Check your spam folder.
          </Text>
          <AppButton
            title="Back to Sign In"
            onPress={() => navigation.navigate('Login')}
            leftIcon="arrow-left"
            style={styles.backButton}
          />
        </View>
      </View>
    );
  }

  // ── Form screen ────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Handle bar (visual cue that this is a modal sheet) ───────── */}
        <View style={styles.handle} />

        {/* ── Header ──────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Close"
        >
          <Icon name="close" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <Icon name="lock-reset" size={36} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password.
        </Text>

        {/* ── Error banner ─────────────────────────────────────────────── */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text style={styles.errorDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Email field ──────────────────────────────────────────────── */}
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <AppInput
              ref={ref}
              label="Email address"
              placeholder="you@example.com"
              leftIcon="email-outline"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="done"
              value={value}
              onChangeText={(text) => { clearError(); onChange(text); }}
              onBlur={onBlur}
              onSubmitEditing={handleSubmit(onSubmit)}
              error={errors.email?.message}
            />
          )}
        />

        <AppButton
          title="Send Reset Link"
          onPress={handleSubmit(onSubmit)}
          isLoading={isLoading}
          leftIcon="send-outline"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.base,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
    lineHeight: FONTS.base * 1.6,
    marginBottom: SPACING.xl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.base,
    gap: SPACING.sm,
  },
  errorBannerText: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.danger,
  },
  errorDismiss: {
    color: COLORS.danger,
    fontWeight: FONTS.bold,
  },
  // ── Success ──
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  successTitle: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: FONTS.base * 1.6,
    marginBottom: SPACING.sm,
  },
  successEmail: {
    color: COLORS.primary,
    fontWeight: FONTS.semiBold,
  },
  successHint: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xxl,
  },
  backButton: {
    width: '100%',
  },
});

export default ForgotPasswordScreen;
