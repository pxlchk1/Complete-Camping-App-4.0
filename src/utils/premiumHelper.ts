/**
 * Premium Feature Helper
 * 
 * ⚠️ DEPRECATED: Use authHelper.ts for the two-gate system (Login → Pro)
 * This file checks Pro status ONLY and skips the login check.
 * New code should use authHelper.ts instead.
 * 
 * Utility to check if user has premium access and route to paywall if needed
 */

import { useSubscriptionStore } from "../state/subscriptionStore";
import { NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";

/**
 * Check if user is pro
 */
export const useIsPro = (): boolean => {
  return useSubscriptionStore((state) => state.isPro);
};

/**
 * Check if user has premium access, show paywall if not
 * Returns true if user has access, false if paywall was shown
 */
export const requirePremium = (
  navigation: NavigationProp<RootStackParamList>,
  feature?: string
): boolean => {
  const isPro = useSubscriptionStore.getState().isPro;

  if (!isPro) {
    // Navigate to paywall
    navigation.navigate("Paywall" as any);
    return false;
  }

  return true;
};

/**
 * Hook to require premium access
 * Use this in components to check premium status and navigate to paywall
 */
export const useRequirePremium = () => {
  const isPro = useIsPro();

  const checkPremium = (
    navigation: NavigationProp<RootStackParamList>,
    feature?: string
  ): boolean => {
    if (!isPro) {
      navigation.navigate("Paywall" as any);
      return false;
    }
    return true;
  };

  return { isPro, checkPremium };
};
