/**
 * Access Control Hook
 * Centralized logic for checking user authentication and Pro status
 */

import { useState } from "react";
import { useCurrentUser } from "../state/userStore";

interface AccessControl {
  isLoggedIn: boolean;
  isPro: boolean;
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
  
  // TODO: Check actual Pro entitlement from RevenueCat
  // For now, assume all logged-in users are free
  const isPro = false;

  /**
   * Check if user has access to a feature
   * @param requiresPro - Whether the feature requires Pro subscription
   * @returns true if user has access, false otherwise
   */
  const checkAccess = (requiresPro: boolean = false): boolean => {
    if (!isLoggedIn) return false;
    if (requiresPro && !isPro) return false;
    return true;
  };

  /**
   * Request access to a feature - shows appropriate modal if needed
   * @param requiresPro - Whether the feature requires Pro subscription
   */
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
    showAccountModal,
    showPaywallModal,
    checkAccess,
    requestAccess,
    closeAccountModal,
    closePaywallModal,
  };
}
