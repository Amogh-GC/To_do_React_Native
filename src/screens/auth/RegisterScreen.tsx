/**
 * screens/auth/RegisterScreen.tsx
 *
 * Registration screen — creates a new Firebase account.
 *
 * Flow:
 *  1. User fills name, email, password, confirmPassword
 *  2. Yup validates all four fields (strength rules, email format, match)
 *  3. On submit → dispatch registerUser thunk via useAuth hook
 *  4. On success → Firestore user doc created, credentials stored in Keychain,
 *     Redux sets isAuthenticated = true → AppNavigator routes to MainNavigator
 *  5. On failure → Firebase error shown in ErrorBanner
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
import { registerSchema, RegisterFormValues } from '../../utils/validators';

// Types & constants
import { RegisterNavigationProp } from '../../navigation/types';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';

// ─── Component ────────────────────────────────────────────────────────────────

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterNavigationProp>();
  const { register, isLoading, error, clearError } = useAuth();

  // Input refs for keyboard "Next" navigation between fields
  const emailRef           = useRef<TextInput>(null);
  const passwordRef        = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Entrance animation
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: 100, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [fadeAnim, slideAnim]);

  // ── react-hook-form ─────────────────────────────────────────────────────
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: yupResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  // ── Submit ──────────────────────────────────────────────────────────────
  const onSubmit = async (values: RegisterFormValues) => {
    await register(values.name, values.email, values.password);
    // Success: AppNavigator handles routing automatically.
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
        {/* ── Gradient header ──────────────────────────────────────────── */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.logo}>✓</Text>
          <Text style={styles.headerTitle}>Create account</Text>
          <Text style={styles.headerSubtitle}>Join thousands of organised people</Text>
        </LinearGradient>

        {/* ── Form card ────────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Password strength hint */}
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              Password must be 8+ characters with an uppercase letter and a number.
            </Text>
          </View>

          {/* ── Firebase error banner ───────────────────────────────────── */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
              <TouchableOpacity onPress={clearError} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.errorDismiss}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ── Full name ───────────────────────────────────────────────── */}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <AppInput
                ref={ref}
                label="Full name"
                placeholder="Jane Smith"
                leftIcon="account-outline"
                textContentType="name"
                autoComplete="name"
                autoCapitalize="words"
                returnKeyType="next"
                value={value}
                onChangeText={(text) => { clearError(); onChange(text); }}
                onBlur={onBlur}
                onSubmitEditing={() => emailRef.current?.focus()}
                error={errors.name?.message}
              />
            )}
          />

          {/* ── Email ───────────────────────────────────────────────────── */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <AppInput
                ref={(node) => {
                  (ref as React.RefCallback<TextInput>)(node);
                  (emailRef as React.MutableRefObject<TextInput | null>).current = node;
                }}
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

          {/* ── Password ────────────────────────────────────────────────── */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <AppInput
                ref={(node) => {
                  (ref as React.RefCallback<TextInput>)(node);
                  (passwordRef as React.MutableRefObject<TextInput | null>).current = node;
                }}
                label="Password"
                placeholder="Create a strong password"
                leftIcon="lock-outline"
                secureTextEntry
                textContentType="newPassword"
                autoComplete="new-password"
                returnKeyType="next"
                value={value}
                onChangeText={(text) => { clearError(); onChange(text); }}
                onBlur={onBlur}
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                error={errors.password?.message}
              />
            )}
          />

          {/* ── Confirm password ────────────────────────────────────────── */}
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <AppInput
                ref={(node) => {
                  (ref as React.RefCallback<TextInput>)(node);
                  (confirmPasswordRef as React.MutableRefObject<TextInput | null>).current = node;
                }}
                label="Confirm password"
                placeholder="Re-enter your password"
                leftIcon="lock-check-outline"
                secureTextEntry
                textContentType="newPassword"
                autoComplete="new-password"
                returnKeyType="done"
                value={value}
                onChangeText={(text) => { clearError(); onChange(text); }}
                onBlur={onBlur}
                onSubmitEditing={handleSubmit(onSubmit)}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          {/* ── Submit ──────────────────────────────────────────────────── */}
          <AppButton
            title="Create Account"
            onPress={handleSubmit(onSubmit)}
            isLoading={isLoading}
            leftIcon="account-plus-outline"
            style={styles.submitButton}
          />

          {/* ── Login link ──────────────────────────────────────────────── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign in</Text>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.xxxl,
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  backArrow: {
    fontSize: FONTS.xl,
    color: COLORS.white,
  },
  logo: {
    fontSize: 48,
    color: COLORS.white,
    fontWeight: FONTS.extraBold,
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.white,
  },
  headerSubtitle: {
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
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  hintBox: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.base,
  },
  hintText: {
    fontSize: FONTS.xs,
    color: COLORS.primary,
    lineHeight: 18,
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
  submitButton: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
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

export default RegisterScreen;
