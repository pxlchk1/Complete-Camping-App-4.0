/**
 * Access Control Hook
 * Centralized logic for checking user authentication and Pro status.
 *
 * NOTE: Not currently imported by any screen. The primary runtime gating
 * layer is src/utils/gating.ts (requirePro, requireAccount, useAccessState).
 * This hook is kept consistent so it is safe if used in the future.
 */

import { useState } from "react";
import { useCurrentUser, useUserStore } from "../state/userStore";
import { useSubscriptionStore } from "../state/subscriptionStore";

interface AccessControl {
  isLoggedIn: boolean;
  isPro: boolean;
  isAdmin: boolean;
  showAccountModal: boolean;
  showPaywallModal: boolean;
  checkAccess: (requiresPro?: boolean) => boolean;
  requestAccess: (requiresPro?: boolean) => void;
  closeAccountModal: () => void;
  closePaywallModal: () => void;
}

export function useAccessControl(): AccessControl {
  const currentUser = useCurrentUser();
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  const isLoggedIn = !!currentUser;
  const isAdmin = useUserStore((s) => s.isAdministrator());
  const hasProEntitlement = useSubscriptionStore((s) => s.isPro);
  // Pro access = RevenueCat entitlement OR admin
  const isPro = isLoggedIn && (hasProEntitlement || isAdmin);

  const checkAccess = (requiresPro: boolean = false): boolean => {
    if (!isLoggedIn) return false;
    if (requiresPro && !isPro) return false;
    return true;
  };

  const requestAccess = (requiresPro: boolean = false): void => {
    if (!isLoggedIn) {
      setShowAccountModal(true);
      return;
    }

    if (requiresPro && !isPro) {
      setShowPaywallModal(true);
      return;
    }
  };

  const closeAccountModal = () => setShowAccountModal(false);
  const closePaywallModal = () => setShowPaywallModal(false);

  return {
    isLoggedIn,
    isPro,
    isAdmin,
    showAccountModal,
    showPaywallModal,
    checkAccess,
    requestAccess,
    closeAccountModal,
    closePaywallModal,
  };
}
