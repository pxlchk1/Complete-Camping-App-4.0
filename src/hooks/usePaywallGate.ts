/**
 * Paywall Gating Hook
 * Provides helper for gating Pro features and showing paywall
 */

import { useNavigation } from "@react-navigation/native";
import { useSubscriptionStore } from "../state/subscriptionStore";
import { SUBSCRIPTIONS_ENABLED, PAYWALL_ENABLED } from "../config/subscriptions";
import { useAuth } from "../context/AuthContext";
import { getPaywallVariantAndTrack, type PaywallVariant } from "../services/proAttemptService";
import type { RootStackNavigationProp } from "../navigation/types";

interface PaywallGateResult {
  isPro: boolean;
  requirePro: () => boolean;
  requireProAsync: () => Promise<boolean>;
  showPaywall: (variant?: PaywallVariant) => void;
}

/**
 * Hook to check Pro status and gate features
 * 
 * Usage:
 * ```typescript
 * const { isPro, requirePro, requireProAsync, showPaywall } = usePaywallGate();
 * 
 * // Check if user has Pro access
 * if (!isPro) {
 *   // Show upgrade prompt
 * }
 * 
 * // Gate a feature tap (sync - tracks async in background)
 * const handleProFeature = () => {
 *   if (!requirePro()) return; // Shows paywall if not Pro
 *   // ... continue with Pro feature
 * };
 * 
 * // Gate a feature tap (async - tracks and determines variant)
 * const handleProFeatureAsync = async () => {
 *   if (!(await requireProAsync())) return;
 *   // ... continue with Pro feature
 * };
 * ```
 */
export function usePaywallGate(): PaywallGateResult {
  const navigation = useNavigation<RootStackNavigationProp>();
  const isPro = useSubscriptionStore((s) => s.isPro);
  const { user } = useAuth();
  const isAuthenticated = !!user;

  /**
   * Show the paywall modal
   */
  const showPaywall = (variant?: PaywallVariant) => {
    if (PAYWALL_ENABLED) {
      navigation.navigate("Paywall", { variant });
    }
  };

  /**
   * Require Pro access for a feature (sync version)
   * Returns true if user has Pro, false if paywall was shown
   * Tracks Pro attempts asynchronously in background
   * 
   * Use this at the start of Pro-gated functions:
   * ```
   * if (!requirePro()) return;
   * ```
   */
  const requirePro = (): boolean => {
    // If subscriptions disabled, allow all features
    if (!SUBSCRIPTIONS_ENABLED) {
      return true;
    }

    // If paywall disabled, allow all features
    if (!PAYWALL_ENABLED) {
      return true;
    }

    // Check if user has Pro
    if (isPro) {
      return true;
    }

    // Track attempt async and show paywall with variant when ready
    getPaywallVariantAndTrack(isAuthenticated, isPro).then((variant) => {
      showPaywall(variant);
    });
    return false;
  };

  /**
   * Require Pro access for a feature (async version)
   * Returns true if user has Pro, false if paywall was shown
   * Waits for variant determination before showing paywall
   */
  const requireProAsync = async (): Promise<boolean> => {
    // If subscriptions disabled, allow all features
    if (!SUBSCRIPTIONS_ENABLED) {
      return true;
    }

    // If paywall disabled, allow all features
    if (!PAYWALL_ENABLED) {
      return true;
    }

    // Check if user has Pro
    if (isPro) {
      return true;
    }

    // Track attempt and get variant
    const variant = await getPaywallVariantAndTrack(isAuthenticated, isPro);
    showPaywall(variant);
    return false;
  };

  return {
    isPro,
    requirePro,
    requireProAsync,
    showPaywall,
  };
}
