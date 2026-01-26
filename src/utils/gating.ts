// src/utils/gating.ts
/**
 * Centralized Access Gating System (Updated 2026-01-01)
 * 
 * PRIMARY PRINCIPLE (NON-NEGOTIABLE):
 * - If a user taps a Pro-gated feature, ALWAYS show PaywallModal first, even if not logged in.
 * - Do not send guests to AccountRequiredModal for Pro features.
 * - AccountRequiredModal is only for free-tier allowed actions that require login to save/persist.
 * 
 * User States:
 * - NO_ACCOUNT (GUEST): Not logged in
 * - FREE: Logged in, not subscribed
 * - PRO: Subscribed (includes active trial)
 * 
 * Gating Rules:
 * - requiresPro=true → Show PaywallModal for GUEST or FREE
 * - requiresAccount=true (and requiresPro=false) → Show AccountRequiredModal for GUEST only
 * 
 * Pro Attempt Tracking (2026-01-01):
 * - Every blocked Pro attempt increments a counter
 * - On the 3rd attempt, show "nudge_trial" variant of PaywallModal
 * - Nudge is rate-limited to once per 30 days
 * 
 * Connect Permissions:
 * - FREE allowed: Vote, Profile, Questions, Tips, Photos (1/day)
 * - FREE blocked: Feedback, Gear Reviews (paywall)
 * - NO_ACCOUNT: All write actions blocked (account prompt for free-tier, paywall for pro-tier)
 */

import { auth } from '../config/firebase';
import { useSubscriptionStore } from '../state/subscriptionStore';
import { useAuthStore } from '../state/authStore';
import { useUserStore } from '../state/userStore';
import { SUBSCRIPTIONS_ENABLED, PAYWALL_ENABLED } from '../config/subscriptions';
import { getPaywallVariantAndTrack, type PaywallVariant } from '../services/proAttemptService';

// Re-export PaywallVariant for convenience
export type { PaywallVariant };

// ============================================
// ACCESS STATE TYPES
// ============================================

export type AccessState = 'NO_ACCOUNT' | 'FREE' | 'PRO';

export interface AccessGateCallbacks {
  showAccountPrompt?: () => void;
  openAccountModal: () => void;
  openPaywallModal: (variant?: PaywallVariant) => void;
}

// ============================================
// CONSTANTS
// ============================================

export const ACCOUNT_PROMPT_MESSAGE = "You need to have an account or be logged in to do that.";
export const PHOTO_LIMIT_MESSAGE = "You've hit today's photo limit. Try again tomorrow, or upgrade for unlimited photo posts.";
export const AUTO_HIDE_DOWNVOTE_THRESHOLD = 3;

// ============================================
// CORE STATE FUNCTION
// ============================================

/**
 * Get current user access state
 * Returns: 'NO_ACCOUNT' | 'FREE' | 'PRO'
 * 
 * Note: PRO includes active trial and administrators - they are treated the same everywhere
 */
export function getAccessState(): AccessState {
  const isLoggedIn = !!auth.currentUser;
  
  if (!isLoggedIn) {
    return 'NO_ACCOUNT';
  }
  
  // If subscriptions disabled via feature flag, treat as PRO
  if (!SUBSCRIPTIONS_ENABLED || !PAYWALL_ENABLED) {
    return 'PRO';
  }
  
  // Check if user is an administrator (admins get full PRO access)
  const isAdmin = useUserStore.getState().isAdministrator();
  if (isAdmin) {
    return 'PRO';
  }
  
  const isPro = useSubscriptionStore.getState().isPro;
  return isPro ? 'PRO' : 'FREE';
}

/**
 * Hook version for reactive state
 */
export function useAccessState(): AccessState {
  const user = useAuthStore((s) => s.user);
  const isPro = useSubscriptionStore((s) => s.isPro);
  const isAdmin = useUserStore((s) => s.isAdministrator());
  
  if (!user) {
    return 'NO_ACCOUNT';
  }
  
  if (!SUBSCRIPTIONS_ENABLED || !PAYWALL_ENABLED) {
    return 'PRO';
  }
  
  // Admins get full PRO access
  if (isAdmin) {
    return 'PRO';
  }
  
  return isPro ? 'PRO' : 'FREE';
}

// ============================================
// UNIFIED ACTION GATING
// ============================================

/**
 * requireProForAction: Unified gate for Pro-gated actions (2026-01-01)
 * 
 * PRIMARY RULE: Pro-gated features ALWAYS show PaywallModal first,
 * even for guests. Never show AccountRequiredModal for Pro features.
 * 
 * Pro Attempt Tracking: Increments counter and shows "nudge_trial" variant
 * on the 3rd attempt (rate-limited to once per 30 days).
 * 
 * - If guest (NO_ACCOUNT): opens PaywallModal (NOT AccountRequiredModal)
 * - If logged in but not Pro: opens PaywallModal
 * - If logged in and Pro: runs the action
 * 
 * Usage:
 * requireProForAction(
 *   () => submitVote(),
 *   { openPaywallModal: (variant) => navigation.navigate("Paywall", { variant }) }
 * );
 * 
 * @param action - The function to run if user is Pro
 * @param callbacks - Modal callbacks (only openPaywallModal needed)
 */
export async function requireProForAction(
  action: () => void | Promise<void>,
  callbacks: Pick<AccessGateCallbacks, 'openAccountModal' | 'openPaywallModal'>
): Promise<void> {
  // If subscriptions disabled, allow
  if (!SUBSCRIPTIONS_ENABLED || !PAYWALL_ENABLED) {
    await action();
    return;
  }
  
  // Check if user is an administrator (admins bypass paywall)
  const isAdmin = useUserStore.getState().isAdministrator();
  if (isAdmin) {
    await action();
    return;
  }
  
  // Check if user is logged in AND has Pro
  const isLoggedIn = !!auth.currentUser;
  const isPro = useSubscriptionStore.getState().isPro;
  
  if (!isLoggedIn || !isPro) {
    // GUEST or FREE - track attempt and show PaywallModal
    // This increments the counter and returns the variant to use
    const variant = await getPaywallVariantAndTrack();
    callbacks.openPaywallModal(variant);
    return;
  }
  
  // User is Pro - run the action
  await action();
}

// ============================================
// GATING FUNCTIONS
// ============================================

/**
 * requireAccount: Gate for free-tier actions that require persistence (2026-01-01)
 * 
 * ONLY use for: Actions that are FREE but need a logged-in user to persist data.
 * Examples: First trip creation, favorites #1-5, trip-linked packing checklist, My Campsite
 * 
 * DO NOT use for: Pro-gated features (use requirePro instead)
 * 
 * @param callbacks - showAccountPrompt (optional toast), openAccountModal (required)
 * @returns true if user can proceed, false if blocked
 */
export function requireAccount(callbacks: Pick<AccessGateCallbacks, 'showAccountPrompt' | 'openAccountModal'>): boolean {
  if (!auth.currentUser) {
    // Show small prompt if provided
    callbacks.showAccountPrompt?.();
    // Open the account required modal
    callbacks.openAccountModal();
    return false;
  }
  return true;
}

/**
 * requirePro: Gate for Pro-gated actions (2026-01-01)
 * 
 * PRIMARY RULE: Pro-gated features ALWAYS show PaywallModal first,
 * even for guests. Never show AccountRequiredModal for Pro features.
 * 
 * Note: This is synchronous for backwards compatibility. It tracks Pro attempts
 * in the background. For full async tracking with nudge variant support, use
 * requireProAsync instead.
 * 
 * Use for: Trip #2+, packing customization, favorites #6+, custom campsites, learning modules
 * 
 * @param callbacks - full callbacks (only openPaywallModal used for Pro gates)
 * @returns true if user can proceed, false if blocked
 */
export function requirePro(callbacks: AccessGateCallbacks): boolean {
  // If subscriptions disabled, allow
  if (!SUBSCRIPTIONS_ENABLED || !PAYWALL_ENABLED) {
    return true;
  }
  
  // Check if user is an administrator (admins bypass paywall)
  const isAdmin = useUserStore.getState().isAdministrator();
  if (isAdmin) {
    return true;
  }
  
  // Check if user is logged in AND has Pro
  const isLoggedIn = !!auth.currentUser;
  const isPro = useSubscriptionStore.getState().isPro;
  
  if (!isLoggedIn || !isPro) {
    // GUEST or FREE - track attempt and show PaywallModal
    // Track in background, determine variant, then open paywall
    getPaywallVariantAndTrack().then((variant) => {
      callbacks.openPaywallModal(variant);
    }).catch(() => {
      // Fallback: show standard paywall if tracking fails
      callbacks.openPaywallModal('standard');
    });
    return false;
  }
  
  return true;
}

/**
 * requireProAsync: Async gate for Pro-gated actions with full tracking (2026-01-01)
 * 
 * Same as requirePro but properly awaits the Pro attempt tracking
 * to determine the correct paywall variant.
 * 
 * @param callbacks - full callbacks (only openPaywallModal used for Pro gates)
 * @returns Promise<true> if user can proceed, Promise<false> if blocked
 */
export async function requireProAsync(callbacks: AccessGateCallbacks): Promise<boolean> {
  // If subscriptions disabled, allow
  if (!SUBSCRIPTIONS_ENABLED || !PAYWALL_ENABLED) {
    return true;
  }
  
  // Check if user is an administrator (admins bypass paywall)
  const isAdmin = useUserStore.getState().isAdministrator();
  if (isAdmin) {
    return true;
  }
  
  // Check if user is logged in AND has Pro
  const isLoggedIn = !!auth.currentUser;
  const isPro = useSubscriptionStore.getState().isPro;
  
  if (!isLoggedIn || !isPro) {
    // GUEST or FREE - track attempt and show PaywallModal with correct variant
    const variant = await getPaywallVariantAndTrack();
    callbacks.openPaywallModal(variant);
    return false;
  }
  
  return true;
}

// ============================================
// RECIPIENT (CAMPGROUND MEMBER) ACCESS GATING
// ============================================

/**
 * Recipient Access Level for Shared Trips
 * 
 * - 'owner': Full access (creator of the trip)
 * - 'read_only': Can view, cannot edit (invited campground member)
 * - 'none': No access to this trip
 */
export type RecipientAccessLevel = 'owner' | 'read_only' | 'none';

/**
 * Check the current user's access level for a trip
 * 
 * @param tripUserId - The userId of the trip owner
 * @param tripMemberIds - Array of userIds with access to the trip
 * @returns RecipientAccessLevel
 */
export function getTripAccessLevel(
  tripUserId: string | undefined,
  tripMemberIds: string[] = []
): RecipientAccessLevel {
  const currentUserId = auth.currentUser?.uid;
  
  if (!currentUserId) {
    return 'none';
  }
  
  // Owner has full access
  if (tripUserId === currentUserId) {
    return 'owner';
  }
  
  // Member has read-only access
  if (tripMemberIds.includes(currentUserId)) {
    return 'read_only';
  }
  
  return 'none';
}

/**
 * Hook version for reactive access level
 */
export function useTripAccessLevel(
  tripUserId: string | undefined,
  tripMemberIds: string[] = []
): RecipientAccessLevel {
  const user = useAuthStore((s) => s.user);
  
  if (!user) {
    return 'none';
  }
  
  if (tripUserId === user.id) {
    return 'owner';
  }
  
  if (tripMemberIds.includes(user.id)) {
    return 'read_only';
  }
  
  return 'none';
}

/**
 * Check if current user can edit a trip
 * 
 * Only owners can edit. Recipients (campground members) have read-only access.
 * 
 * @param tripUserId - The userId of the trip owner
 * @returns true if user can edit, false otherwise
 */
export function canEditTrip(tripUserId: string | undefined): boolean {
  const currentUserId = auth.currentUser?.uid;
  return !!currentUserId && tripUserId === currentUserId;
}

/**
 * Hook version for reactive edit permission
 */
export function useCanEditTrip(tripUserId: string | undefined): boolean {
  const user = useAuthStore((s) => s.user);
  return !!user && tripUserId === user.id;
}

/**
 * Block edit attempt for read-only recipients
 * 
 * Use this to show a toast or alert when a recipient tries to edit.
 * 
 * @param tripUserId - The userId of the trip owner
 * @param onBlocked - Callback when edit is blocked (show toast/alert)
 * @returns true if user can edit, false if blocked
 */
export function requireTripEditAccess(
  tripUserId: string | undefined,
  onBlocked?: () => void
): boolean {
  if (canEditTrip(tripUserId)) {
    return true;
  }
  
  onBlocked?.();
  return false;
}

// ============================================
// LEGACY COMPATIBILITY (will be deprecated)
// ============================================

/**
 * @deprecated Use requireAccount() instead
 * requireAuth: Centralized gating for auth-required actions.
 * If not logged in, triggers the provided showLoginModal callback and returns false.
 * Returns true if user is authenticated.
 */
export function requireAuth(showLoginModal: () => void): boolean {
  if (!auth.currentUser) {
    showLoginModal();
    return false;
  }
  return true;
}

/**
 * @deprecated Use requirePro() instead
 * requireEntitlement: Centralized gating for Pro/free logic.
 */
export function requireEntitlement({
  tripCount,
  membershipTier,
  showPaywall,
}: {
  tripCount: number;
  membershipTier: string;
  showPaywall: () => void;
}): boolean {
  if (membershipTier === 'pro' || membershipTier === 'subscribed' || membershipTier === 'isAdmin') {
    return true;
  }
  if (membershipTier === 'free' && tripCount >= 1) {
    showPaywall();
    return false;
  }
  return true;
}
