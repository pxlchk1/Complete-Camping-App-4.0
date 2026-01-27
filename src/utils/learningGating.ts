/**
 * Learning Module Gating
 *
 * Centralized access control for learning modules.
 *
 * Access Rules (2026-01-26):
 * - Leave No Trace track is FREE for ALL users including GUESTS
 * - All other tracks require Pro subscription (show PaywallModal for GUEST or FREE)
 * - AccountRequiredModal is NOT used for learning - Pro modules show PaywallModal
 */

// Free track IDs - all modules in these tracks are available to all users including guests
export const FREE_TRACK_IDS = ['leave-no-trace'] as const;

// Free module IDs - individual modules that are free (legacy support)
// Note: "lnt-principles" is the actual module ID in the Leave No Trace track
export const FREE_MODULE_IDS = [
  'lnt-principles',
  'leave_no_trace',
  'leave-no-trace',
] as const;

/**
 * Lock reasons for modules
 */
export type LockReason = 'pro_required' | null;

/**
 * Access state for a learning module
 */
export type ModuleAccessState =
  | 'free_unlocked' // Free module - anyone can access (GUEST, FREE, PRO)
  | 'pro_locked' // Pro module, user is GUEST or FREE - show PaywallModal
  | 'pro_unlocked'; // Pro module, user is PRO - can access

/**
 * Check if a track is free (available to all users)
 */
export function isFreeTrack(trackId: string): boolean {
  const normalizedId = trackId.toLowerCase().replace(/_/g, '-');
  return FREE_TRACK_IDS.some(
    (id) => id.toLowerCase().replace(/_/g, '-') === normalizedId,
  );
}

/**
 * Check if a module is free (available to all authenticated users)
 */
export function isFreeModule(moduleId: string, trackId?: string): boolean {
  // If track is specified and is free, all its modules are free
  if (trackId && isFreeTrack(trackId)) {
    return true;
  }

  // Normalize the module ID (handle both underscore and hyphen formats)
  const normalizedId = moduleId.toLowerCase().replace(/_/g, '-');
  return FREE_MODULE_IDS.some(
    (id) => id.toLowerCase().replace(/_/g, '-') === normalizedId,
  );
}

/**
 * Get the access state for a learning module
 *
 * Rules (2026-01-01):
 * - Leave No Trace: accessible to ALL (GUEST, FREE, PRO)
 * - Other modules: Pro-gated (GUEST or FREE sees PaywallModal)
 *
 * @param moduleId - The module's ID
 * @param isAuthenticated - Whether the user is logged in (not used for free modules)
 * @param isPro - Whether the user has an active Pro subscription
 * @returns ModuleAccessState
 */
export function getModuleAccessState(
  moduleId: string,
  isAuthenticated: boolean,
  isPro: boolean,
): ModuleAccessState {
  // Free modules (Leave No Trace) - accessible to everyone
  if (isFreeModule(moduleId)) {
    return 'free_unlocked';
  }

  // Pro modules - check if user has Pro
  if (isPro) {
    return 'pro_unlocked';
  }

  // GUEST or FREE trying to access Pro module
  return 'pro_locked';
}

/**
 * Check if user can open a learning module
 *
 * @param moduleId - The module's ID
 * @param isAuthenticated - Whether the user is logged in
 * @param isPro - Whether the user has an active Pro subscription
 * @returns boolean - true if user can access the module
 */
export function canOpenLearningModule(
  moduleId: string,
  isAuthenticated: boolean,
  isPro: boolean,
): boolean {
  const state = getModuleAccessState(moduleId, isAuthenticated, isPro);
  return state === 'free_unlocked' || state === 'pro_unlocked';
}

/**
 * Get the lock reason for a module
 *
 * Returns "pro_required" if user needs Pro, null if accessible
 * Note: AccountRequiredModal is NOT used for learning modules
 *
 * @param moduleId - The module's ID
 * @param isAuthenticated - Whether the user is logged in
 * @param isPro - Whether the user has an active Pro subscription
 * @returns LockReason - null if not locked
 */
export function getLearningModuleLockReason(
  moduleId: string,
  isAuthenticated: boolean,
  isPro: boolean,
): LockReason {
  const state = getModuleAccessState(moduleId, isAuthenticated, isPro);

  if (state === 'pro_locked') {
    return 'pro_required';
  }

  return null;
}

/**
 * Get the badge type to display for a module
 *
 * @param moduleId - The module's ID
 * @returns "Free" | "Pro"
 */
export function getModuleBadgeType(moduleId: string): 'Free' | 'Pro' {
  return isFreeModule(moduleId) ? 'Free' : 'Pro';
}

/**
 * Get helper text for a locked module based on user state
 *
 * @param lockReason - The reason the module is locked
 * @returns string - Helper text to display
 */
export function getLockedModuleHelperText(lockReason: LockReason): string {
  if (lockReason === 'pro_required') {
    return 'Included with Pro';
  }
  return '';
}
