/**
 * screens/profile/ProfileScreen.tsx
 *
 * Profile screen — displays user info and provides a Logout button.
 *
 * Logout flow:
 *  1. User taps "Sign Out" → confirmation Alert shown
 *  2. On confirm → dispatch logoutUser thunk via useAuth hook
 *  3. logoutUser: signs out from Firebase, deletes token from Keychain
 *  4. Redux clears auth state → isAuthenticated = false
 *  5. AppNavigator automatically renders AuthNavigator (no navigate() needed)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import useAuth from '../../hooks/useAuth';
import AppButton from '../../components/common/AppButton';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';

// ─── Helper — avatar initials ─────────────────────────────────────────────────

const getInitials = (name: string | null | undefined): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ─── Component ────────────────────────────────────────────────────────────────

const ProfileScreen: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * handleLogout
   * Shows a confirmation Alert before performing the logout operation.
   * This prevents accidental logouts.
   */
  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            await logout();
            // AppNavigator re-routes automatically once isAuthenticated = false.
            // No need to call navigation.navigate() here.
            setIsLoggingOut(false);
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header with avatar ──────────────────────────────────────── */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.header}
        >
          {/* Circle avatar with initials */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(user?.displayName)}
            </Text>
          </View>
          <Text style={styles.name}>{user?.displayName ?? 'User'}</Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>

          {/* Email verified badge */}
          {user?.emailVerified ? (
            <View style={styles.verifiedBadge}>
              <Icon name="check-circle" size={12} color={COLORS.success} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : (
            <View style={styles.verifiedBadge}>
              <Icon name="alert-circle-outline" size={12} color={COLORS.warning} />
              <Text style={[styles.verifiedText, { color: COLORS.warning }]}>
                Email not verified
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Info rows ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Info</Text>

          <ProfileRow
            icon="identifier"
            label="User ID"
            value={user?.uid ? `${user.uid.slice(0, 16)}…` : '—'}
          />
          <ProfileRow
            icon="calendar-outline"
            label="Member since"
            value={
              user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })
                : '—'
            }
          />
          <ProfileRow icon="email-outline" label="Email" value={user?.email ?? '—'} />
        </View>

        {/* ── Danger zone ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session</Text>

          <AppButton
            title="Sign Out"
            onPress={handleLogout}
            variant="danger"
            isLoading={isLoggingOut || isLoading}
            leftIcon="logout"
          />
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Sub-component: ProfileRow ────────────────────────────────────────────────

interface ProfileRowProps {
  icon: string;
  label: string;
  value: string;
}

const ProfileRow: React.FC<ProfileRowProps> = ({ icon, label, value }) => (
  <View style={rowStyles.row}>
    <Icon name={icon} size={20} color={COLORS.primary} style={rowStyles.icon} />
    <View style={rowStyles.textBlock}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  </View>
);

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  icon: {
    marginRight: SPACING.md,
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  value: {
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    fontWeight: FONTS.medium,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.xxl,
    alignItems: 'center',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.bold,
    color: COLORS.white,
  },
  name: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  email: {
    fontSize: FONTS.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: SPACING.sm,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: FONTS.xs,
    color: COLORS.success,
    fontWeight: FONTS.medium,
  },
  section: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
});

export default ProfileScreen;
