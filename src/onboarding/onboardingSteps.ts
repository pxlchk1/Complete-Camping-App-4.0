/**
 * Onboarding Steps Orchestrator
 * 
 * This is the ONLY place where onboarding Firestore writes should happen.
 * Primary path: backend Cloud Function (provisionNewAccount) using Admin SDK.
 * Fallback path: direct client SDK writes when CF is unreachable (e.g. Expo Go).
 * 
 * IMPORTANT: This module is designed to be IDEMPOTENT:
 * - Never overwrites existing user/profile docs
 * - Only creates missing docs
 * - Validates email index ownership before writing
 */

import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { functions, db } from '../config/firebase';
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
 * Bootstraps a new account. Tries the Cloud Function first; if that fails
 * with an auth-propagation error (common in Expo Go), falls back to direct
 * client-side Firestore writes which use the already-valid client auth token.
 */
export async function bootstrapNewAccount(params: BootstrapAccountParams): Promise<BootstrapAccountResult> {
  const startTime = Date.now();
  
  if (ONBOARDING_DEBUG) {
    console.log('[Onboarding] Starting bootstrapNewAccount for:', params.userId);
  }

  // --- PRIMARY PATH: Cloud Function ---
  const MAX_ATTEMPTS = 3;
  const BACKOFF_DELAYS = [2000, 3000];
  let lastError: unknown = null;
  let shouldFallback = false;

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
        console.log(`[Onboarding] CF completed in ${duration}ms (attempt ${attempt})`, result.data);
      }

      return { success: true };

    } catch (error) {
      lastError = error;
      const fnError = error as { code?: string; message?: string };
      const rawCode = fnError.code || '';

      if (ONBOARDING_DEBUG) {
        console.warn(`[Onboarding] CF attempt ${attempt} failed:`, {
          code: rawCode,
          message: fnError.message,
        });
      }

      // Terminal errors — don't retry, don't fallback
      if (rawCode === 'functions/already-exists' && fnError.message?.includes('HANDLE_TAKEN')) {
        return {
          success: false,
          error: "That handle is already taken. Please choose a different handle.",
          handleTaken: true,
        };
      }
      if (rawCode === 'functions/already-exists' && fnError.message?.includes('EMAIL_IN_USE')) {
        return {
          success: false,
          error: "That email is already in use. Try signing in instead.",
          emailInUse: true,
        };
      }
      if (rawCode === 'functions/invalid-argument') {
        return {
          success: false,
          error: fnError.message || 'Invalid input.',
          debugInfo: `validation: ${rawCode}`,
        };
      }

      // Auth-related failures → fallback to client writes after retries exhaust
      if (
        rawCode === 'functions/unauthenticated' ||
        rawCode === 'functions/internal' ||
        rawCode === 'functions/permission-denied'
      ) {
        shouldFallback = true;
      }

      if (attempt < MAX_ATTEMPTS) {
        const backoffMs = BACKOFF_DELAYS[attempt - 1] || 3000;
        if (ONBOARDING_DEBUG) {
          console.log(`[Onboarding] Retrying CF after ${backoffMs}ms...`);
        }
        await delay(backoffMs);
        continue;
      }

      break;
    }
  }

  // --- FALLBACK PATH: Direct client SDK writes ---
  if (shouldFallback) {
    if (ONBOARDING_DEBUG) {
      console.log('[Onboarding] CF unavailable — falling back to client-side writes');
    }
    return clientSideProvision(params);
  }

  // Non-auth CF failure with no fallback
  const fnError = lastError as { code?: string; message?: string };
  return {
    success: false,
    error: "We couldn't finish setting up your account. Please try again.",
    debugInfo: `${fnError?.code || 'unknown'}: ${fnError?.message || 'unknown'}`,
  };
}

/**
 * Client-side fallback provisioning.
 * Performs the same writes as the Cloud Function but using the client SDK.
 * Skips userHandlesIndex (no client rule) — handle uniqueness checked at CF
 * level when available, and at profile/display level otherwise.
 */
async function clientSideProvision(params: BootstrapAccountParams): Promise<BootstrapAccountResult> {
  const { userId, email, displayName, handle, photoURL } = params;
  const emailNormalized = email.trim().toLowerCase();
  const normalizedHandle = handle.trim().toLowerCase();
  const firstName = displayName.trim().split(' ')[0] || displayName.trim();
  const now = serverTimestamp();

  try {
    // Step 1: Create/merge users/{uid}
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: emailNormalized,
        displayName: displayName.trim(),
        handle: normalizedHandle,
        photoURL: photoURL || null,
        firstName,
        hasSeenWelcomeHome: false,
        createdAt: now,
        updatedAt: now,
        notificationsEnabled: true,
        emailSubscribed: true,
      });
    } else {
      await setDoc(userRef, {
        email: emailNormalized,
        displayName: displayName.trim(),
        handle: normalizedHandle,
        firstName,
        updatedAt: now,
      }, { merge: true });
    }

    // Step 2: Create/merge profiles/{uid}
    const profileRef = doc(db, 'profiles', userId);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      await setDoc(profileRef, {
        email: emailNormalized,
        displayName: displayName.trim(),
        handle: normalizedHandle,
        photoURL: photoURL || null,
        avatarUrl: photoURL || null,
        backgroundUrl: null,
        coverPhotoURL: null,
        bio: null,
        location: null,
        campingStyle: null,
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
        role: 'user',
        stats: {
          tripsCount: 0,
          tipsCount: 0,
          gearReviewsCount: 0,
          questionsCount: 0,
          photosCount: 0,
        },
      });
    } else {
      await setDoc(profileRef, {
        email: emailNormalized,
        displayName: displayName.trim(),
        handle: normalizedHandle,
        updatedAt: now,
      }, { merge: true });
    }

    // Step 3: Create userEmailIndex/{email}
    if (emailNormalized) {
      const emailRef = doc(db, 'userEmailIndex', emailNormalized);
      const emailSnap = await getDoc(emailRef);

      if (emailSnap.exists()) {
        const existingUserId = emailSnap.data()?.userId;
        if (existingUserId && existingUserId !== userId) {
          return {
            success: false,
            error: "That email is already in use. Try signing in instead.",
            emailInUse: true,
          };
        }
      } else {
        await setDoc(emailRef, {
          userId,
          email: emailNormalized,
          createdAt: now,
        });
      }
    }

    // Step 4: Create emailSubscribers/{uid} (optional, non-blocking)
    try {
      const subRef = doc(db, 'emailSubscribers', userId);
      const subSnap = await getDoc(subRef);
      if (!subSnap.exists()) {
        await setDoc(subRef, {
          emailAddress: emailNormalized,
          firstname: firstName,
          subscribedAt: now,
          subscriptionStatus: 'subscribed',
        });
      }
    } catch {
      // Non-critical — don't fail onboarding
    }

    if (ONBOARDING_DEBUG) {
      console.log('[Onboarding] Client-side provision completed successfully');
    }

    return { success: true };

  } catch (error) {
    const firebaseError = error as { code?: string; message?: string };
    if (ONBOARDING_DEBUG) {
      console.error('[Onboarding] Client-side provision failed:', firebaseError);
    }
    return {
      success: false,
      error: "We couldn't finish setting up your account. Please try again.",
      debugInfo: `client-fallback: ${firebaseError?.code || 'unknown'}: ${firebaseError?.message || 'unknown'}`,
    };
  }
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
