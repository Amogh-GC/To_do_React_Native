/**
 * screens/auth/LoginScreen.tsx
 *
 * Login screen — allows existing users to sign in with email + password.
 *
 * Flow:
 *  1. User fills email + password (validated by Yup via react-hook-form)
 *  2. On submit → dispatch loginUser thunk via useAuth hook
 *  3. On success → Redux sets isAuthenticated = true
 *     → AppNavigator automatically renders MainNavigator (no manual navigate())
 *  4. On failure → Firebase error converted to human-readable message, shown in ErrorBanner
 *
 * Components used:
 *  - AppInput    (controlled, with icon + error message)
 *  - AppButton   (gradient, loading state)
 *  - LinearGradient (decorative header background)
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TextInput,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigation } from '@react-navigation/native';

// Components
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';

// Auth hook + validation
import useAuth from '../../hooks/useAuth';
import { loginSchema, LoginFormValues } from '../../utils/validators';

// Types & constants
import { LoginNavigationProp } from '../../navigation/types';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';

// ─── Component ────────────────────────────────────────────────────────────────

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNavigationProp>();
  const { login, isLoading, error, clearError } = useAuth();

  // Ref for the password input so "Next" on the email keyboard focuses it
  const passwordRef = useRef<TextInput>(null);

  // Subtle fade-in animation for the form card
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: 100, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [fadeAnim, slideAnim]);

  // ── react-hook-form setup ───────────────────────────────────────────────
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // ── Submit handler ─────────────────────────────────────────────────────
  const onSubmit = async (values: LoginFormValues) => {
    await login(values.email, values.password);
    // Success: AppNavigator handles routing automatically via isAuthenticated.
    // Failure: error is set in Redux and displayed via ErrorBanner below.
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Gradient header ─────────────────────────────────────────── */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.header}
        >
          <Text style={styles.logo}>✓</Text>
          <Text style={styles.appName}>TodoApp</Text>
          <Text style={styles.tagline}>Stay organised. Get things done.</Text>
        </LinearGradient>

        {/* ── Form card ────────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          {/* ── Firebase error banner ───────────────────────────────────── */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
              <TouchableOpacity onPress={clearError} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.errorDismiss}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ── Email field ─────────────────────────────────────────────── */}
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
                returnKeyType="next"
                value={value}
                onChangeText={(text) => { clearError(); onChange(text); }}
                onBlur={onBlur}
                onSubmitEditing={() => passwordRef.current?.focus()}
                error={errors.email?.message}
              />
            )}
          />

          {/* ── Password field ──────────────────────────────────────────── */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <AppInput
                ref={(node) => {
                  // Assign both the form ref and the local passwordRef
                  (ref as React.RefCallback<TextInput>)(node);
                  (passwordRef as React.MutableRefObject<TextInput | null>).current = node;
                }}
                label="Password"
                placeholder="Enter your password"
                leftIcon="lock-outline"
                secureTextEntry
                textContentType="password"
                autoComplete="current-password"
                returnKeyType="done"
                value={value}
                onChangeText={(text) => { clearError(); onChange(text); }}
                onBlur={onBlur}
                onSubmitEditing={handleSubmit(onSubmit)}
                error={errors.password?.message}
              />
            )}
          />

          {/* ── Forgot password link ────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Forgot your password?</Text>
          </TouchableOpacity>

          {/* ── Submit button ───────────────────────────────────────────── */}
          <AppButton
            title="Sign In"
            onPress={handleSubmit(onSubmit)}
            isLoading={isLoading}
            leftIcon="login"
            style={styles.submitButton}
          />

          {/* ── Register link ───────────────────────────────────────────── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Create one</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scroll: {
    flexGrow: 1,
  },
  // ── Header ──
  header: {
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: SPACING.xxxl,
    alignItems: 'center',
  },
  logo: {
    fontSize: 56,
    color: COLORS.white,
    fontWeight: FONTS.extraBold,
    marginBottom: SPACING.sm,
  },
  appName: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.white,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: FONTS.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: SPACING.xs,
  },
  // ── Card ──
  card: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
  },
  title: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  // ── Error banner ──
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
    fontSize: FONTS.sm,
    color: COLORS.danger,
    fontWeight: FONTS.bold,
  },
  // ── Form ──
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -SPACING.sm,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.xs,
  },
  forgotText: {
    fontSize: FONTS.sm,
    color: COLORS.primary,
    fontWeight: FONTS.medium,
  },
  submitButton: {
    marginBottom: SPACING.xl,
  },
  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },
  footerLink: {
    fontSize: FONTS.sm,
    color: COLORS.primary,
    fontWeight: FONTS.semiBold,
  },
});

export default LoginScreen;
