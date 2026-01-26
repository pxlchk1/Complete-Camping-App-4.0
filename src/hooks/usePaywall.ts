/**
 * usePaywall Hook
 * Provides helper functions for paywall navigation and Pro feature gating
 */

import { useNavigation } from "@react-navigation/native";
import { useSubscriptionStore } from "../state/subscriptionStore";
import { SUBSCRIPTIONS_ENABLED, PAYWALL_ENABLED } from "../config/subscriptions";
import { useAuth } from "../context/AuthContext";
import { getPaywallVariantAndTrack, type PaywallVariant } from "../services/proAttemptService";
import type { RootStackNavigationProp } from "../navigation/types";

export const usePaywall = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const isPro = useSubscriptionStore((s) => s.isPro);
  const { user } = useAuth();
  const isAuthenticated = !!user;

  /**
   * Check if user has Pro access
   * Returns true if:
   * - Subscriptions disabled (feature flag)
   * - Paywall disabled (feature flag)
   * - User has active Pro entitlement
   */
  const hasProAccess = (): boolean => {
    // If subscriptions disabled, grant access
    if (!SUBSCRIPTIONS_ENABLED || !PAYWALL_ENABLED) {
      return true;
    }
    return isPro;
  };

  /**
   * Navigate to paywall screen
   * Use this to present paywall when user tries to access Pro feature
   */
  const showPaywall = (variant?: PaywallVariant) => {
    if (!PAYWALL_ENABLED) {
      console.log("[Paywall] Paywall disabled via feature flag");
      return;
    }
    navigation.navigate("Paywall", { variant });
  };

  /**
   * Gate a Pro feature (sync version)
   * Returns true if user can access, false if paywall should be shown
   * Tracks Pro attempts asynchronously in background
   * 
   * Usage:
   * ```
   * const { gateFeature } = usePaywall();
   * 
   * const handleProFeature = () => {
   *   if (!gateFeature()) return;
   *   // Pro feature logic here
   * };
   * ```
   */
  const gateFeature = (): boolean => {
    if (hasProAccess()) {
      return true;
    }
    // Track attempt async and show paywall with variant when ready
    getPaywallVariantAndTrack(isAuthenticated, isPro).then((variant) => {
      showPaywall(variant);
    });
    return false;
  };

  /**
   * Gate a Pro feature (async version)
   * Returns true if user can access, false if paywall was shown
   * Waits for variant determination before showing paywall
   */
  const gateFeatureAsync = async (): Promise<boolean> => {
    if (hasProAccess()) {
      return true;
    }
    const variant = await getPaywallVariantAndTrack(isAuthenticated, isPro);
    showPaywall(variant);
    return false;
  };

  /**
   * Conditional rendering helper for Pro features
   * 
   * Usage:
   * ```
   * const { renderProFeature } = usePaywall();
   * 
   * {renderProFeature(
   *   <ProFeatureComponent />,
   *   <UpgradePrompt />
   * )}
   * ```
   */
  const renderProFeature = (
    proContent: React.ReactNode,
    fallbackContent?: React.ReactNode
  ): React.ReactNode => {
    if (hasProAccess()) {
      return proContent;
    }
    return fallbackContent || null;
  };

  return {
    isPro,
    hasProAccess,
    showPaywall,
    gateFeature,
    gateFeatureAsync,
    renderProFeature,
  };
};
