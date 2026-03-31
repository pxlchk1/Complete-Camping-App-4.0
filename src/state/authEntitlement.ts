import { useEffect, useState, useCallback } from "react";
import { auth } from "../config/firebase";
import { useSubscriptionStore } from "./subscriptionStore";
import { useUserStore } from "./userStore";

export type EntitlementStatus = "active" | "inactive" | "loading";

/**
 * Hook that combines auth state and entitlement status from real stores.
 * Uses subscriptionStore (RevenueCat) and userStore (admin role) as sources of truth.
 *
 * NOTE: Not currently imported by any screen. The primary runtime gating
 * layer is src/utils/gating.ts (requirePro, requireAccount, useAccessState).
 * This hook is kept consistent so it is safe if used in the future.
 */
export function useAuthAndEntitlement() {
  const [isSignedIn, setIsSignedIn] = useState<boolean>(!!auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsSignedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const hasProEntitlement = useSubscriptionStore((s) => s.isPro);
  const subscriptionLoading = useSubscriptionStore((s) => s.subscriptionLoading);
  const isAdmin = useUserStore((s) => s.isAdministrator());

  // Pro access = RevenueCat entitlement OR admin
  const isPro = isSignedIn && (hasProEntitlement || isAdmin);
  const isEntitlementLoading = isSignedIn && subscriptionLoading;

  const entitlementStatus: EntitlementStatus = !isSignedIn
    ? "inactive"
    : isEntitlementLoading
      ? "loading"
      : isPro
        ? "active"
        : "inactive";

  return { isSignedIn, entitlementStatus, isPro, isEntitlementLoading };
}

// Guard helpers (non-hook versions — use store getState for imperative calls)
export function guardAccount(action: () => void, openAccountRequiredModal: () => void) {
  if (!auth.currentUser) return openAccountRequiredModal();
  return action();
}

export function guardPro(
  action: () => void,
  openAccountRequiredModal: () => void,
  showLightningBug: () => void,
  openProRequiredModal: () => void
) {
  if (!auth.currentUser) return openAccountRequiredModal();
  const loading = useSubscriptionStore.getState().subscriptionLoading;
  if (loading) return showLightningBug();
  const isPro = useSubscriptionStore.getState().isPro;
  const isAdmin = useUserStore.getState().isAdministrator();
  if (!isPro && !isAdmin) return openProRequiredModal();
  return action();
}

export function guardSignedIn(action: () => void, openAccountRequiredModal: () => void) {
  if (!auth.currentUser) return openAccountRequiredModal();
  return action();
}
