// src/theme/theme.ts
import { Platform, StyleSheet } from "react-native";
import {
  INK,
  PARCHMENT,
  PARCHMENT_SOFT,
  DEEP_FOREST,
  DEEP_FOREST_PRESSED,
  EARTH_GREEN,
  RIVER_ROCK,
  GRANITE_GOLD,
  RUST,
  RUST_DEEP,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_ON_DARK,
  BORDER_SOFT,
  CARD_BACKGROUND_LIGHT,
  DISABLED_BG,
  DISABLED_TEXT,
} from "../constants/colors";

// Font family strings must match what we load in the app.
// If they differ, adjust only these strings (do not change usage across screens).
export const fonts = {
  display: Platform.select({
    ios: "Satisfy_400Regular",
    android: "Satisfy_400Regular",
    default: "Satisfy_400Regular",
  }),
  // Heading fonts: Raleway
  heading: Platform.select({
    ios: "Raleway_600SemiBold",
    android: "Raleway_600SemiBold",
    default: "Raleway_600SemiBold",
  }),
  headingSemi: Platform.select({
    ios: "Raleway_600SemiBold",
    android: "Raleway_600SemiBold",
    default: "Raleway_600SemiBold",
  }),
  body: Platform.select({
    ios: "SourceSans3_400Regular",
    android: "SourceSans3_400Regular",
    default: "SourceSans3_400Regular",
  }),
  bodySemi: Platform.select({
    ios: "SourceSans3_600SemiBold",
    android: "SourceSans3_600SemiBold",
    default: "SourceSans3_600SemiBold",
  }),
  // Legacy aliases for backward compatibility - now using Raleway
  displayRegular: "Raleway_600SemiBold",
  displaySemibold: "Raleway_600SemiBold",
  displayBold: "Raleway_700Bold",
  bodyRegular: "SourceSans3_400Regular",
  bodySemibold: "SourceSans3_600SemiBold",
  bodyBold: "SourceSans3_700Bold",
  accent: "Satisfy_400Regular",
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 34,
};

export const spacing = {
  xxs: 4,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
};

// Compatibility object. Keep both semantic tokens and legacy-style aliases.
export const colors = {
  // Text
  ink: INK,
  text: TEXT_PRIMARY,
  textSecondary: TEXT_SECONDARY,
  textOnDark: TEXT_ON_DARK,
  darkBrown: INK,

  // Surfaces
  parchment: PARCHMENT,
  parchmentSoft: PARCHMENT_SOFT,
  background: PARCHMENT,
  surface: PARCHMENT_SOFT,
  cardBgLight: CARD_BACKGROUND_LIGHT,
  cardFill: PARCHMENT_SOFT,

  // Brand
  deepForest: DEEP_FOREST,
  deepForestPressed: DEEP_FOREST_PRESSED,
  earthGreen: EARTH_GREEN,
  riverRock: RIVER_ROCK,

  graniteGold: GRANITE_GOLD,
  rust: RUST,
  rustDeep: RUST_DEEP,

  // Lines and states
  borderSoft: BORDER_SOFT,
  border: BORDER_SOFT,

  disabledBg: DISABLED_BG,
  disabledText: DISABLED_TEXT,

  // Common semantic aliases some screens use
  primary: DEEP_FOREST,
  primaryPressed: DEEP_FOREST_PRESSED,
};

// Shadows (soft, print-inspired)
export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  modal: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Optional text presets if our Typography components support them.
export const textStyles = StyleSheet.create({
  h1: { fontFamily: fonts.heading, fontSize: fontSizes.xxl, lineHeight: 34, color: colors.text },
  h2: { fontFamily: fonts.heading, fontSize: fontSizes.xl, lineHeight: 28, color: colors.text },
  h3: { fontFamily: fonts.headingSemi, fontSize: fontSizes.lg, lineHeight: 24, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: fontSizes.md, lineHeight: 22, color: colors.text },
  bodySecondary: { fontFamily: fonts.body, fontSize: fontSizes.md, lineHeight: 22, color: colors.textSecondary },
  label: { fontFamily: fonts.bodySemi, fontSize: fontSizes.sm, lineHeight: 18, color: colors.text },
  caption: { fontFamily: fonts.body, fontSize: fontSizes.xs, lineHeight: 16, color: colors.textSecondary },
  // Legacy text style aliases for backward compatibility
  headingHero: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.xxl,
    lineHeight: 34,
    textAlign: "center" as const,
    color: colors.deepForest,
  },
  headingSection: {
    fontFamily: fonts.displaySemibold,
    fontSize: fontSizes.xl,
    lineHeight: 28,
    color: colors.text,
  },
  headingCard: {
    fontFamily: fonts.displayRegular,
    fontSize: fontSizes.lg,
    lineHeight: 24,
    color: colors.text,
  },
  labelSoft: {
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  accentScript: {
    fontFamily: fonts.accent,
    fontSize: fontSizes.sm,
    color: colors.graniteGold,
  },
  buttonPrimary: {
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.sm,
    color: colors.parchment,
  },
  buttonSecondary: {
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  buttonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
});

// Component styles for backward compatibility
export const componentStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  screenInner: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.cardFill,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: spacing.sm,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginVertical: spacing.sm,
  },
  buttonPrimary: {
    backgroundColor: colors.deepForest,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  buttonSecondary: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.deepForest,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  buttonText: {
    paddingVertical: spacing.xs,
  },
  pill: {
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: colors.deepForest,
  },
  pillText: {
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.xs,
    color: colors.parchment,
  },
  tabBar: {
    backgroundColor: colors.parchment,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    height: 70,
    paddingHorizontal: spacing.md,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  tabItem: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  heroImage: {
    width: "100%" as const,
    height: undefined,
    aspectRatio: 16 / 9,
  },
  heroContent: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
});

// Layout constants
export const layout = {
  screenPadding: spacing.lg,
  sectionMarginTop: spacing.lg,
  sectionHeaderMarginBottom: spacing.sm,
  cardSpacing: spacing.md,
  scrollBottomPadding: spacing.xl,
  minTapTarget: 44,
};

// Icon colors
export const iconColors = {
  default: colors.deepForest,
  muted: colors.earthGreen,
  accent: colors.graniteGold,
  active: colors.deepForest,
  inactive: colors.earthGreen,
};
