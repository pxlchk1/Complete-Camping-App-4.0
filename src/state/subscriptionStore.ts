/**
 * Subscription State Store
 * Global state for managing subscription status and entitlements
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CustomerInfo } from "react-native-purchases";

export interface SubscriptionState {
  // State
  isPro: boolean;
  activeEntitlements: string[];
  subscriptionLoading: boolean;
  subscriptionError: string | null;
  customerInfo: CustomerInfo | null;
  lastChecked: string | null;

  // Actions
  setSubscriptionInfo: (customerInfo: CustomerInfo | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearSubscription: () => void;
  refreshEntitlements: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      // Initial state
      isPro: false,
      activeEntitlements: [],
      subscriptionLoading: false,
      subscriptionError: null,
      customerInfo: null,
      lastChecked: null,

      // Update subscription info from CustomerInfo
      // CRITICAL: isPro is determined by entitlement "Pro" (case-sensitive)
      setSubscriptionInfo: (customerInfo: CustomerInfo | null) => {
        if (!customerInfo) {
          set({
            isPro: false,
            activeEntitlements: [],
            customerInfo: null,
            lastChecked: new Date().toISOString(),
          });
          return;
        }

        const entitlements = Object.keys(customerInfo.entitlements.active);
        // Check for exact entitlement "Pro" (case-sensitive)
        const hasPro = Boolean(customerInfo.entitlements.active["Pro"]);

        console.log("[SubscriptionStore] Updated subscription info:", {
          isPro: hasPro,
          activeEntitlements: entitlements,
          originalAppUserId: customerInfo.originalAppUserId,
        });

        set({
          isPro: hasPro,
          activeEntitlements: entitlements,
          customerInfo,
          lastChecked: new Date().toISOString(),
          subscriptionError: null,
        });
      },

      // Set loading state
      setLoading: (loading: boolean) => {
        set({ subscriptionLoading: loading });
      },

      // Set error state
      setError: (error: string | null) => {
        set({ subscriptionError: error, subscriptionLoading: false });
      },

      // Clear all subscription data
      clearSubscription: () => {
        set({
          isPro: false,
          activeEntitlements: [],
          subscriptionLoading: false,
          subscriptionError: null,
          customerInfo: null,
          lastChecked: null,
        });
      },

      // Refresh entitlements from RevenueCat
      refreshEntitlements: async () => {
        const { setLoading, setSubscriptionInfo, setError } = get();

        try {
          setLoading(true);

          // Import dynamically to avoid circular dependencies
          const { getCustomerInfo } = await import("../lib/revenuecatClient");
          const customerInfo = await getCustomerInfo();

          setSubscriptionInfo(customerInfo);
        } catch (error: any) {
          console.error("[SubscriptionStore] Failed to refresh entitlements:", error);
          setError(error.message || "Failed to refresh subscription status");
        } finally {
          setLoading(false);
        }
      },
    }),
    {
      name: "subscription-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the essential data, not loading states
      partialize: (state) => ({
        isPro: state.isPro,
        activeEntitlements: state.activeEntitlements,
        lastChecked: state.lastChecked,
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useIsPro = () => useSubscriptionStore((s) => s.isPro);
export const useActiveEntitlements = () => useSubscriptionStore((s) => s.activeEntitlements);
export const useSubscriptionLoading = () => useSubscriptionStore((s) => s.subscriptionLoading);
export const useSubscriptionError = () => useSubscriptionStore((s) => s.subscriptionError);
