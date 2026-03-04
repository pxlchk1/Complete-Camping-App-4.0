/**
 * Upsell State Store
 * Manages trial upsell modals eligibility, rate-limiting, and state persistence
 * 
 * Feature Flag: UPSELL_MODALS_ENABLED controls whether modals show at all
 * 
 * Note: hasUsedFreeTrip is managed in userStore for persistence with user data.
 * This store only manages modal-specific state (show-once flags, cooldowns).
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSubscriptionStore } from "./subscriptionStore";
import { useUserStore } from "./userStore";

// ============================================
// FEATURE FLAG
// ============================================

export const UPSELL_MODALS_ENABLED = true;

// ============================================
// CONSTANTS
// ============================================

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// ============================================
// TYPES
// ============================================

export type UpsellModalType = "completion" | "packing" | "invite";

export interface UpsellState {
  // Modal show-once flags
  hasShownCompletionModal: boolean;
  hasShownPackingModal: boolean;
  hasShownInviteModal: boolean;
  lastUpsellModalDismissedAt: number | null; // timestamp
  sessionUpsellShownThisSession: boolean; // resets on app restart (not persisted)
  
  // Actions
  markCompletionModalShown: () => void;
  markPackingModalShown: () => void;
  markInviteModalShown: () => void;
  recordModalDismissal: () => void;
  markSessionUpsellShown: () => void;
  resetSessionFlag: () => void;
  
  // Eligibility checks (read-only helpers)
  canShowSoftModal: (type: UpsellModalType, hasUsedFreeTrip: boolean) => boolean;
  isTrialOrSubscribed: () => boolean;
  canShowTrip2Gate: (hasUsedFreeTrip: boolean) => boolean;
}

// ============================================
// STORE
// ============================================

export const useUpsellStore = create<UpsellState>()(
  persist(
    (set, get) => ({
      // Initial state
      hasShownCompletionModal: false,
      hasShownPackingModal: false,
      hasShownInviteModal: false,
      lastUpsellModalDismissedAt: null,
      sessionUpsellShownThisSession: false,
      
      // Modal shown markers
      markCompletionModalShown: () => {
        set({ hasShownCompletionModal: true, sessionUpsellShownThisSession: true });
        console.log("[UpsellStore] Completion modal marked as shown");
      },
      
      markPackingModalShown: () => {
        set({ hasShownPackingModal: true, sessionUpsellShownThisSession: true });
        console.log("[UpsellStore] Packing modal marked as shown");
      },
      
      markInviteModalShown: () => {
        set({ hasShownInviteModal: true, sessionUpsellShownThisSession: true });
        console.log("[UpsellStore] Invite modal marked as shown");
      },
      
      // Record modal dismissal for cooldown
      recordModalDismissal: () => {
        set({ lastUpsellModalDismissedAt: Date.now() });
        console.log("[UpsellStore] Modal dismissal recorded");
      },
      
      // Session tracking
      markSessionUpsellShown: () => {
        set({ sessionUpsellShownThisSession: true });
      },
      
      resetSessionFlag: () => {
        set({ sessionUpsellShownThisSession: false });
      },
      
      // Check if trial or subscribed (delegate to subscription store)
      isTrialOrSubscribed: () => {
        return useSubscriptionStore.getState().isPro;
      },
      
      // Check if Trip #2 gate should show
      // hasUsedFreeTrip comes from userStore, passed as parameter
      canShowTrip2Gate: (hasUsedFreeTrip: boolean) => {
        if (!UPSELL_MODALS_ENABLED) return false;
        
        const { isTrialOrSubscribed } = get();
        
        // Only gate if user has used free trip AND is not subscribed
        return hasUsedFreeTrip && !isTrialOrSubscribed();
      },
      
      /**
       * Check if a soft upsell modal can be shown
       * 
       * Criteria:
       * 1. Feature flag enabled
       * 2. Not trial/subscribed
       * 3. Still on free trip (hasUsedFreeTrip === false) - for packing/invite only
       * 4. Modal-specific show-once flag not set
       * 5. Session limit not reached (max 1 per session)
       * 6. Cooldown period elapsed (24h after last dismissal)
       * 
       * @param type - Type of modal to check
       * @param hasUsedFreeTrip - From userStore, indicates if user has completed their free trip
       */
      canShowSoftModal: (type: UpsellModalType, hasUsedFreeTrip: boolean) => {
        if (!UPSELL_MODALS_ENABLED) return false;
        
        const state = get();
        
        // 1. Check subscription status
        if (state.isTrialOrSubscribed()) {
          return false;
        }
        
        // 2. Check if still on free trip (soft modals only during free trip)
        // Note: Completion modal is shown at the moment of completion before marking as used
        if (type !== "completion" && hasUsedFreeTrip) {
          return false;
        }
        
        // 3. Check modal-specific show-once flag
        switch (type) {
          case "completion":
            if (state.hasShownCompletionModal) return false;
            break;
          case "packing":
            if (state.hasShownPackingModal) return false;
            break;
          case "invite":
            if (state.hasShownInviteModal) return false;
            break;
        }
        
        // 4. Check session limit (max 1 soft modal per session)
        if (state.sessionUpsellShownThisSession) {
          return false;
        }
        
        // 5. Check cooldown (24h after last dismissal)
        if (state.lastUpsellModalDismissedAt) {
          const timeSinceLastDismissal = Date.now() - state.lastUpsellModalDismissedAt;
          if (timeSinceLastDismissal < COOLDOWN_MS) {
            return false;
          }
        }
        
        return true;
      },
    }),
    {
      name: "upsell-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist session flag
      partialize: (state) => ({
        hasShownCompletionModal: state.hasShownCompletionModal,
        hasShownPackingModal: state.hasShownPackingModal,
        hasShownInviteModal: state.hasShownInviteModal,
        lastUpsellModalDismissedAt: state.lastUpsellModalDismissedAt,
        // sessionUpsellShownThisSession is intentionally NOT persisted
      }),
    }
  )
);

// ============================================
// SELECTORS (reference userStore for hasUsedFreeTrip)
// ============================================

export const useIsTrialOrSubscribed = () => useUpsellStore((s) => s.isTrialOrSubscribed());

// ============================================
// UPSELL COPY
// ============================================

export const UPSELL_COPY = {
  completion: {
    title: "Your trip plan is ready ✅",
    body: "Want this for every trip? Start a 3-day free trial to create unlimited trip plans, packing lists, meals, and sharing.",
    primaryCta: "Start 3-Day Free Trial",
    secondaryCta: "Not now",
    finePrint: "Free for 3 days. Cancel anytime before day 3.",
  },
  trip2Gate: {
    title: "Ready for trip #2?",
    body: "You've used your free complete trip plan. Start a 3-day free trial to create unlimited trips—plus packing lists, meals, weather, and sharing.",
    primaryCta: "Start 3-Day Free Trial",
    secondaryCta: "Maybe later",
    finePrint: "Free for 3 days. Cancel anytime before day 3.",
  },
  packing: {
    title: "Want your packing list done for you?",
    body: "Start a 3-day free trial to generate packing lists from your Gear Closet—so nothing gets left behind.",
    primaryCta: "Start 3-Day Free Trial",
    secondaryCta: "Not now",
    finePrint: "Free for 3 days. Cancel anytime before day 3.",
  },
  invite: {
    title: "Keep everyone on the same plan",
    body: "Start a 3-day free trial to share trip details, packing lists, and meals—without endless texts.",
    primaryCta: "Start 3-Day Free Trial",
    secondaryCta: "Not now",
    finePrint: "Free for 3 days. Cancel anytime before day 3.",
  },
} as const;
