/**
 * constants/colors.ts
 *
 * Single source of truth for the entire app's colour palette.
 * All navigators, screens, and components import from here.
 * Keeping colours here (not inline) makes theming and dark-mode toggling trivial.
 */

export const COLORS = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  primary:        '#6C63FF',   // Deep violet — buttons, FAB, active tab tint
  primaryLight:   '#EAE8FF',   // Tinted backgrounds, selected states
  primaryDark:    '#4B44CC',   // Pressed state for primary button
  primaryGlow:    '#6C63FF40', // Semi-transparent for shadow glows

  // ── Accent ─────────────────────────────────────────────────────────────────
  accent:         '#FF6584',
  accentLight:    '#FFE4EA',

  // ── Semantic ───────────────────────────────────────────────────────────────
  success:        '#34C759',
  successLight:   '#E8FAF0',   // Completed card background tint
  warning:        '#FF9500',
  warningLight:   '#FFF4E5',   // Medium priority card tint
  danger:         '#FF3B30',
  dangerLight:    '#FFEBEA',   // High priority / overdue card tint

  // ── Neutrals ──────────────────────────────────────────────────────────────
  background:     '#F4F6FB',
  surface:        '#FFFFFF',
  surfaceRaised:  '#FAFBFF',   // Slightly lifted surface (nested cards)
  border:         '#E8ECF4',
  borderStrong:   '#D0D7E8',   // More visible dividers
  shadow:         '#1A1D2E',   // Deep-toned shadow (more realistic than pure black)

  // ── Shadow levels (use with opacity + elevation) ──────────────────────────
  shadowSm: '#1A1D2E',         // opacity 0.05, radius 4,  offset 1
  shadowMd: '#1A1D2E',         // opacity 0.08, radius 10, offset 3
  shadowLg: '#1A1D2E',         // opacity 0.14, radius 20, offset 6

  // ── Text ──────────────────────────────────────────────────────────────────
  textPrimary:    '#1A1D2E',
  textSecondary:  '#6B7280',
  textDisabled:   '#C0C7D4',
  textInverse:    '#FFFFFF',   // Text on dark/colour backgrounds

  // ── General ───────────────────────────────────────────────────────────────
  white:          '#FFFFFF',
  black:          '#000000',
  transparent:    'transparent',

  // ── Priority — solid ──────────────────────────────────────────────────────
  priorityHigh:       '#FF3B30',
  priorityHighLight:  '#FFEBEA',  // Card/badge background tint
  priorityMedium:     '#FF9500',
  priorityMediumLight:'#FFF4E5',
  priorityLow:        '#34C759',
  priorityLowLight:   '#E8FAF0',

  // ── Priority gradient pairs [start, end] ─────────────────────────────────
  gradientHigh:   ['#FF3B30', '#FF6B35'] as const,
  gradientMedium: ['#FF9500', '#FFBE00'] as const,
  gradientLow:    ['#34C759', '#00C896'] as const,
  gradientBrand:  ['#6C63FF', '#4B44CC'] as const,
} as const;

// Derive a union type of all colour keys for type-safe usage
export type ColorKey = keyof typeof COLORS;
