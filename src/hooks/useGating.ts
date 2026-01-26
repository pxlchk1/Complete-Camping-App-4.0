/**
 * useGating Hook
 * 
 * Provides easy access to the gating system for components.
 * Manages modal state and provides gating functions.
 * 
 * Usage:
 * ```tsx
 * const { accessState, checkAccount, checkPro, AccountModal, PaywallModal } = useGating();
 * 
 * const handleVote = () => {
 *   if (!checkAccount()) return; // Will show modal if needed
 *   // ... do vote
 * };
 * 
 * const handleCreateTrip = () => {
 *   if (!checkPro('trip')) return; // Will show modal if needed
 *   // ... create trip
 * };
 * 
 * return (
 *   <>
 *     {content}
 *     {AccountModal}
 *     {PaywallModal}
 *   </>
 * );
 * ```
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAccessState, requireAccount, requirePro } from '../utils/gating';
import type { RootStackNavigationProp } from '../navigation/types';

// Paywall context for messaging
export type PaywallContext = 
  | 'feedback'
  | 'gearReview'
  | 'trip'
  | 'packing'
  | 'meal'
  | 'plan'
  | 'general';

interface UseGatingResult {
  /** Current access state: 'NO_ACCOUNT' | 'FREE' | 'PRO' */
  accessState: 'NO_ACCOUNT' | 'FREE' | 'PRO';
  
  /** Is user logged in? */
  isLoggedIn: boolean;
  
  /** Is user Pro (or in trial)? */
  isPro: boolean;
  
  /** Is user Free (logged in but not Pro)? */
  isFree: boolean;
  
  /** Check if user has account, show modal if not. Returns true if can proceed. */
  checkAccount: () => boolean;
  
  /** Check if user has Pro, show modal if not. Returns true if can proceed. */
  checkPro: (context?: PaywallContext) => boolean;
  
  /** Modal visibility states */
  showAccountModal: boolean;
  showPaywallModal: boolean;
  paywallContext: PaywallContext;
  
  /** Modal close handlers */
  closeAccountModal: () => void;
  closePaywallModal: () => void;
  
  /** Open modals directly */
  openAccountModal: () => void;
  openPaywallModal: (context?: PaywallContext) => void;
}

export function useGating(): UseGatingResult {
  const navigation = useNavigation<RootStackNavigationProp>();
  const accessState = useAccessState();
  
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallContext, setPaywallContext] = useState<PaywallContext>('general');
  
  const isLoggedIn = accessState !== 'NO_ACCOUNT';
  const isPro = accessState === 'PRO';
  const isFree = accessState === 'FREE';
  
  const openAccountModal = useCallback(() => {
    setShowAccountModal(true);
  }, []);
  
  const closeAccountModal = useCallback(() => {
    setShowAccountModal(false);
  }, []);
  
  const openPaywallModal = useCallback((context: PaywallContext = 'general') => {
    setPaywallContext(context);
    setShowPaywallModal(true);
  }, []);
  
  const closePaywallModal = useCallback(() => {
    setShowPaywallModal(false);
  }, []);
  
  /**
   * Check if user has account, show modal if not
   * Use for: Voting, Profile editing, any Connect submissions
   */
  const checkAccount = useCallback((): boolean => {
    return requireAccount({
      openAccountModal,
    });
  }, [openAccountModal]);
  
  /**
   * Check if user has Pro, show modal if not
   * Use for: Feedback, Trip creation, Packing/Meal plan edits
   */
  const checkPro = useCallback((context: PaywallContext = 'general'): boolean => {
    return requirePro({
      openAccountModal,
      openPaywallModal: () => openPaywallModal(context),
    });
  }, [openAccountModal, openPaywallModal]);
  
  return useMemo(() => ({
    accessState,
    isLoggedIn,
    isPro,
    isFree,
    checkAccount,
    checkPro,
    showAccountModal,
    showPaywallModal,
    paywallContext,
    closeAccountModal,
    closePaywallModal,
    openAccountModal,
    openPaywallModal,
  }), [
    accessState,
    isLoggedIn,
    isPro,
    isFree,
    checkAccount,
    checkPro,
    showAccountModal,
    showPaywallModal,
    paywallContext,
    closeAccountModal,
    closePaywallModal,
    openAccountModal,
    openPaywallModal,
  ]);
}

/**
 * Get context-specific paywall messaging
 */
export function getPaywallMessage(context: PaywallContext): {
  title: string;
  subtitle: string;
} {
  switch (context) {
    case 'feedback':
      return {
        title: 'Feedback is a Pro feature',
        subtitle: 'Upgrade to Pro to share your ideas and suggestions.',
      };
    case 'gearReview':
      return {
        title: 'Gear Reviews are a Pro feature',
        subtitle: 'Upgrade to Pro to share and read in-depth gear reviews.',
      };
    case 'trip':
      return {
        title: 'Planning trips is part of Pro',
        subtitle: 'Upgrade to Pro to create unlimited trips.',
      };
    case 'packing':
      return {
        title: 'Packing lists are part of Pro',
        subtitle: 'Upgrade to Pro to build custom packing lists.',
      };
    case 'meal':
      return {
        title: 'Meal planning is part of Pro',
        subtitle: 'Upgrade to Pro to plan meals for your trips.',
      };
    case 'plan':
      return {
        title: 'Trip planning is part of Pro',
        subtitle: 'Upgrade to Pro to unlock the full planning toolkit.',
      };
    default:
      return {
        title: 'Unlock Complete Camping Pro',
        subtitle: 'Upgrade to Pro for full app access.',
      };
  }
}
