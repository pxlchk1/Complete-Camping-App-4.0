/**
 * Onboarding Steps Orchestrator
 * 
 * This is the ONLY place where onboarding Firestore writes should happen.
 * All provisioning now routes through a backend Cloud Function
 * (provisionNewAccount) using Admin SDK — no client scatter-writes.
 * 
 * IMPORTANT: This module is designed to be IDEMPOTENT:
 * - Never overwrites existing user/profile docs
 * - Only creates missing docs
 * - Validates email index ownership before writing
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { ONBOARDING_DEBUG } from './onboardingConfig';

/**
 * Parameters for bootstrapping a new account.
 */
export interface BootstrapAccountParams {
  userId: string;
  email: string;
  displayName: string;
  handle: string;
  photoURL?: string | null;
}

/**
 * Result of the bootstrap operation.
 */
export interface BootstrapAccountResult {
  success: boolean;
  error?: string;
  debugInfo?: string;
  /** Set when email is already in use by another account */
  emailInUse?: boolean;
  /** Set when handle is already taken by another user */
  handleTaken?: boolean;
}

/**
 * Step names for logging and error tracking.
 */
const STEPS = {
  ENSURE_USER_DOC: 'ensureUserDoc',
  ENSURE_PROFILE_DOC: 'ensureProfileDoc',
  ENSURE_USER_EMAIL_INDEX: 'ensureUserEmailIndex',
  ENSURE_EMAIL_SUBSCRIBER: 'ensureEmailSubscriber',
  ENSURE_PUSH_TOKEN: 'ensurePushToken',
} as const;

/**
 * Error codes for onboarding failures.
 */
export const ONBOARDING_ERROR_CODES = {
  EMAIL_IN_USE: 'email-in-use',
  HANDLE_TAKEN: 'handle-taken',
  PERMISSION_DENIED: 'permission-denied',
  UNKNOWN: 'unknown',
} as const;

// Cloud Function reference
const provisionNewAccountFn = httpsCallable<
  {
    email: string;
    displayName: string;
    handle: string;
    photoURL?: string | null;
  },
  {
    success: boolean;
    uid: string;
    handle: string;
    email: string;
  }
>(functions, 'provisionNewAccount');

/**
 * Small delay helper for retry backoff.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks if a Cloud Functions error code is a transient auth-propagation error.
 * Brand-new Firebase users can hit UNAUTHENTICATED or INTERNAL briefly
 * while the token propagates to Cloud Functions infrastructure.
 */
function isTransientAuthError(code: string): boolean {
  return (
    code === 'functions/unauthenticated' ||
    code === 'functions/internal'
  );
}

/**
 * Bootstraps a new account by calling the backend provisionNewAccount
 * Cloud Function. All Firestore writes happen server-side via Admin SDK.
 * 
 * This function orchestrates:
 * 1. Handle reservation with atomicity check
 * 2. users/{uid} creation/merge
 * 3. profiles/{uid} creation/merge
 * 4. userEmailIndex/{email} creation
 * 5. emailSubscribers/{uid} creation (optional)
 * 
 * @param params - The user data for creating the account
 * @returns Result indicating success or failure with error details
 */
export async function bootstrapNewAccount(params: BootstrapAccountParams): Promise<BootstrapAccountResult> {
  const startTime = Date.now();
  
  if (ONBOARDING_DEBUG) {
    console.log('[Onboarding] Starting bootstrapNewAccount for:', params.userId);
  }

  // Retry once for transient auth-propagation errors (brand-new users).
  // Firebase Cloud Functions can briefly reject the token of a
  // just-created user with UNAUTHENTICATED before propagation completes.
  const MAX_ATTEMPTS = 2;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await provisionNewAccountFn({
        email: params.email,
        displayName: params.displayName,
        handle: params.handle,
        photoURL: params.photoURL || null,
      });

      const duration = Date.now() - startTime;
      if (ONBOARDING_DEBUG) {
        console.log(`[Onboarding] bootstrapNewAccount completed in ${duration}ms (attempt ${attempt})`, result.data);
      }

      return { success: true };

    } catch (error) {
      lastError = error;
      const fnError = error as { code?: string; message?: string };
      const rawCode = fnError.code || '';

      if (ONBOARDING_DEBUG) {
        console.warn(`[Onboarding] bootstrapNewAccount attempt ${attempt} failed:`, {
          code: rawCode,
          message: fnError.message,
        });
      }

      // Only retry on transient auth-propagation errors, and only once
      if (attempt < MAX_ATTEMPTS && isTransientAuthError(rawCode)) {
        if (ONBOARDING_DEBUG) {
          console.log('[Onboarding] Transient auth error — retrying after delay...');
        }
        await delay(1500);
        continue;
      }

      // Non-retryable error or final attempt — fall through to error handling
      break;
    }
  }

  // Error handling — uses lastError from the final failed attempt
  const duration = Date.now() - startTime;
  // Extract Firebase Functions error details
  const fnError = lastError as {
    code?: string;
    message?: string;
    details?: unknown;
  };

  // The httpsCallable wraps errors as "functions/CODE"
  const rawCode = fnError?.code || '';
  const message = fnError?.message || 'Unknown error';

  if (ONBOARDING_DEBUG) {
    console.error(`[Onboarding] bootstrapNewAccount FAILED in ${duration}ms:`, {
      code: rawCode,
      message,
    });
  }

  // Handle taken
  if (rawCode === 'functions/already-exists' && message.includes('HANDLE_TAKEN')) {
    return {
      success: false,
      error: "That handle is already taken. Please choose a different handle.",
      handleTaken: true,
    };
  }

  // Email in use
  if (rawCode === 'functions/already-exists' && message.includes('EMAIL_IN_USE')) {
    return {
      success: false,
      error: "That email is already in use. Try signing in instead.",
      emailInUse: true,
    };
  }

  // Invalid argument
  if (rawCode === 'functions/invalid-argument') {
    return {
      success: false,
      error: message,
      debugInfo: `validation: ${rawCode}`,
    };
  }

  // Permission denied (should not happen with Admin SDK, but just in case)
  if (rawCode === 'functions/permission-denied' || rawCode === 'permission-denied') {
    return {
      success: false,
      error: "We couldn't finish setting up your account. Please try again.",
      debugInfo: `permission-denied`,
    };
  }

  // Generic fallback
  return {
    success: false,
    error: "We couldn't finish setting up your account. Please try again.",
    debugInfo: `${rawCode}: ${message}`,
  };
}

/**
 * Maps Firestore errors to user-friendly messages.
 * Use this in the auth flow to display appropriate error messages.
 */
export function getOnboardingErrorMessage(error: unknown): string {
  const firebaseError = error as { code?: string; onboardingStep?: string; emailInUse?: boolean };
  
  // Handle email-in-use specifically
  if (firebaseError.emailInUse || firebaseError.code === ONBOARDING_ERROR_CODES.EMAIL_IN_USE) {
    return "That email is already in use. Try signing in instead.";
  }

  if (firebaseError.code === 'permission-denied') {
    return "We couldn't finish setting up your account. Please try again.";
  }

  // Default error message
  return "We couldn't finish setting up your account. Please try again.";
}

/**
 * Checks if an error indicates the email is already in use by another account.
 */
export function isEmailInUseError(error: unknown): boolean {
  const firebaseError = error as { code?: string; emailInUse?: boolean };
  return firebaseError.emailInUse === true || firebaseError.code === ONBOARDING_ERROR_CODES.EMAIL_IN_USE;
}

export { STEPS as ONBOARDING_STEPS };
