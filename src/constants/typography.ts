/**
 * constants/typography.ts
 * Font sizes, weights, and line-heights used across the app.
 */

export const FONTS = {
  // ── Sizes (px) ────────────────────────────────────────────────────────────
  xs:   11,
  sm:   13,
  md:   15,
  base: 16,
  lg:   18,
  xl:   22,
  xxl:  28,
  hero: 36,

  // ── Weights ───────────────────────────────────────────────────────────────
  regular:   '400' as const,
  medium:    '500' as const,
  semiBold:  '600' as const,
  bold:      '700' as const,
  extraBold: '800' as const,

  // ── Line heights (px — paired with size above) ────────────────────────────
  //   Use these instead of raw numbers so line-height tracks with font size.
  lineXs:   16,   // for xs (11px)
  lineSm:   18,   // for sm (13px)
  lineMd:   22,   // for md (15px)
  lineBase: 24,   // for base (16px)
  lineLg:   26,   // for lg (18px)
  lineXl:   30,   // for xl (22px)
  lineXxl:  36,   // for xxl (28px)
  lineHero: 44,   // for hero (36px)

  // ── Deprecated multipliers (kept for backward compat) ────────────────────
  tight:  1.2,
  normal: 1.5,
  loose:  1.8,
} as const;
