import { useEffect, useState, useCallback } from "react";
import { auth } from "../config/firebase";
// Assume RevenueCat or similar entitlement service is available
// Replace with your actual entitlement fetch logic

export type EntitlementStatus = "active" | "inactive" | "loading";

export function useAuthAndEntitlement() {
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [entitlementStatus, setEntitlementStatus] = useState<EntitlementStatus>("loading");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsSignedIn(!!user);
      // When auth state changes, entitlement status should be re-fetched
      setEntitlementStatus("loading");
      if (user) {
        // Simulate async entitlement fetch
        fetchEntitlementStatus(user.uid).then(setEntitlementStatus);
      } else {
        setEntitlementStatus("inactive");
      }
    });
    return () => unsubscribe();
  }, []);

  // Simulated async entitlement fetch (replace with real logic)
  const fetchEntitlementStatus = useCallback(async (uid: string): Promise<EntitlementStatus> => {
    // TODO: Replace with RevenueCat or your own logic
    // For now, always return 'inactive' after 1s
    return new Promise((resolve) => setTimeout(() => resolve("inactive"), 1000));
  }, []);

  const isPro = entitlementStatus === "active";
  const isEntitlementLoading = entitlementStatus === "loading";

  return { isSignedIn, entitlementStatus, isPro, isEntitlementLoading };
}

// Guard helpers
export function guardAccount(action: () => void, openAccountRequiredModal: () => void) {
  const { isSignedIn } = useAuthAndEntitlement();
  if (!isSignedIn) return openAccountRequiredModal();
  return action();
}

export function guardPro(
  action: () => void,
  openAccountRequiredModal: () => void,
  showLightningBug: () => void,
  openProRequiredModal: () => void
) {
  const { isSignedIn, isEntitlementLoading, isPro } = useAuthAndEntitlement();
  if (!isSignedIn) return openAccountRequiredModal();
  if (isEntitlementLoading) return showLightningBug();
  if (!isPro) return openProRequiredModal();
  return action();
}

export function guardSignedIn(action: () => void, openAccountRequiredModal: () => void) {
  const { isSignedIn } = useAuthAndEntitlement();
  if (!isSignedIn) return openAccountRequiredModal();
  return action();
}
