/**
 * Onboarding Steps Orchestrator
 * 
 * This is the ONLY place where onboarding Firestore writes should happen.
 * All writes are logged, validated, and handled with proper error management.
 * 
 * IMPORTANT: This module is designed to be IDEMPOTENT:
 * - Never overwrites existing user/profile docs
 * - Only creates missing docs
 * - Validates email index ownership before writing
 */

import {
  doc,
  getDoc,
  serverTimestamp,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { onboardingSetDoc } from './onboardingWrites';
import { getDebugErrorString, onboardingLog } from './onboardingDebug';
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
  PERMISSION_DENIED: 'permission-denied',
  UNKNOWN: 'unknown',
} as const;

/**
 * Creates the users/{uid} document with safe, minimal fields.
 * This is a CRITICAL step - failure will abort onboarding.
 */
async function ensureUserDoc(params: BootstrapAccountParams): Promise<void> {
  const { userId, email, displayName, handle, photoURL } = params;
  const userRef = doc(db, 'users', userId);

  // Check if document already exists
  const existingDoc = await getDoc(userRef);
  if (existingDoc.exists()) {
    onboardingLog('success', {
      step: STEPS.ENSURE_USER_DOC,
      op: 'getDoc',
      path: userRef.path,
    });
    return; // Already exists, skip creation
  }

  // Safe minimal payload - NO subscription fields
  const userData: DocumentData = {
    email: email,
    displayName: displayName,
    handle: handle,
    photoURL: photoURL || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // Default notification settings - these are safe non-subscription fields
    notificationsEnabled: true,
    emailSubscribed: true,
  };

  await onboardingSetDoc(userRef, userData, undefined, { step: STEPS.ENSURE_USER_DOC });
}

/**
 * Creates the profiles/{uid} document with safe, minimal fields.
 * This is a CRITICAL step - failure will abort onboarding.
 * 
 * IMPORTANT: Do NOT include any subscription-related fields:
 * - membershipTier
 * - subscriptionProvider
 * - subscriptionStatus
 * - subscriptionUpdatedAt
 * - subscriptionExpiresAt
 * - grantedBy
 * - grantedAt
 */
async function ensureProfileDoc(params: BootstrapAccountParams): Promise<void> {
  const { userId, email, displayName, handle, photoURL } = params;
  const profileRef = doc(db, 'profiles', userId);

  // Check if document already exists
  const existingDoc = await getDoc(profileRef);
  if (existingDoc.exists()) {
    onboardingLog('success', {
      step: STEPS.ENSURE_PROFILE_DOC,
      op: 'getDoc',
      path: profileRef.path,
    });
    return; // Already exists, skip creation
  }

  // Safe minimal payload - NO subscription fields
  // The app derives "free" tier from absence of subscription fields
  const profileData: DocumentData = {
    email: email,
    displayName: displayName,
    handle: handle,
    photoURL: photoURL || null,
    avatarUrl: photoURL || null,
    backgroundUrl: null,
    coverPhotoURL: null,
    bio: null,
    location: null,
    campingStyle: null,
    joinedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // Role defaults to "user" - not a subscription field
    role: 'user',
    // Stats are safe
    stats: {
      tripsCount: 0,
      tipsCount: 0,
      gearReviewsCount: 0,
      questionsCount: 0,
      photosCount: 0,
    },
  };

  await onboardingSetDoc(profileRef, profileData, undefined, { step: STEPS.ENSURE_PROFILE_DOC });
}

/**
 * Creates the userEmailIndex/{normalizedEmail} document.
 * This is a CRITICAL step - failure will abort onboarding.
 * 
 * IMPORTANT: 
 * - Field name must be exactly "userId" (not "uid").
 * - If the email index exists and belongs to a DIFFERENT user, this throws
 *   an "email-in-use" error to abort signup.
 * - If the email index exists and belongs to the SAME user, skip (idempotent).
 */
async function ensureUserEmailIndex(params: BootstrapAccountParams): Promise<void> {
  const { userId, email } = params;
  
  if (!email) {
    onboardingLog('success', {
      step: STEPS.ENSURE_USER_EMAIL_INDEX,
      op: 'setDoc',
      path: 'userEmailIndex/[skipped-no-email]',
    });
    return; // No email, skip
  }

  const emailNormalized = email.toLowerCase().trim();
  const emailIndexRef = doc(db, 'userEmailIndex', emailNormalized);

  // Check if document already exists
  const existingDoc = await getDoc(emailIndexRef);
  if (existingDoc.exists()) {
    const existingData = existingDoc.data();
    const existingUserId = existingData?.userId;

    // CRITICAL: Check if this email belongs to a different user
    if (existingUserId && existingUserId !== userId) {
      onboardingLog('error', {
        step: STEPS.ENSURE_USER_EMAIL_INDEX,
        op: 'getDoc',
        path: emailIndexRef.path,
      }, undefined, {
        code: ONBOARDING_ERROR_CODES.EMAIL_IN_USE,
        message: `Email index exists for different user`,
      });

      // Throw a specific error that can be caught and mapped to user-friendly message
      const error = new Error('That email is already in use. Try signing in instead.') as Error & { 
        code: string; 
        onboardingStep: string;
        emailInUse: boolean;
      };
      error.code = ONBOARDING_ERROR_CODES.EMAIL_IN_USE;
      error.onboardingStep = STEPS.ENSURE_USER_EMAIL_INDEX;
      error.emailInUse = true;
      throw error;
    }

    // Email index exists and belongs to this user - idempotent skip
    onboardingLog('success', {
      step: STEPS.ENSURE_USER_EMAIL_INDEX,
      op: 'getDoc',
      path: emailIndexRef.path,
    });
    return;
  }

  const emailIndexData: DocumentData = {
    userId: userId, // MUST be "userId" to match Firestore rules
    email: emailNormalized,
    createdAt: serverTimestamp(),
  };

  await onboardingSetDoc(emailIndexRef, emailIndexData, undefined, { step: STEPS.ENSURE_USER_EMAIL_INDEX });
}

/**
 * Creates the emailSubscribers/{uid} document.
 * This is an OPTIONAL step - failure will be logged but not abort onboarding.
 */
async function ensureEmailSubscriber(params: BootstrapAccountParams): Promise<void> {
  const { userId, email, displayName } = params;
  
  if (!email) {
    return; // No email, skip
  }

  const subscriberRef = doc(db, 'emailSubscribers', userId);

  // Check if document already exists
  const existingDoc = await getDoc(subscriberRef);
  if (existingDoc.exists()) {
    onboardingLog('success', {
      step: STEPS.ENSURE_EMAIL_SUBSCRIBER,
      op: 'getDoc',
      path: subscriberRef.path,
    });
    return; // Already exists, skip creation
  }

  // Extract first name from display name
  const firstname = displayName.split(' ')[0] || displayName;

  const subscriberData: DocumentData = {
    emailAddress: email,
    firstname: firstname,
    subscribedAt: serverTimestamp(),
    subscriptionStatus: 'subscribed',
  };

  await onboardingSetDoc(subscriberRef, subscriberData, undefined, { step: STEPS.ENSURE_EMAIL_SUBSCRIBER });
}

/**
 * Bootstraps a new account by creating all required Firestore documents.
 * 
 * This function orchestrates the onboarding writes in a specific order:
 * 1. ensureUserDoc (critical)
 * 2. ensureProfileDoc (critical)
 * 3. ensureUserEmailIndex (critical)
 * 4. ensureEmailSubscriber (optional)
 * 
 * Critical steps will abort onboarding if they fail.
 * Optional steps will log errors and continue.
 * 
 * @param params - The user data for creating the account
 * @returns Result indicating success or failure with error details
 */
export async function bootstrapNewAccount(params: BootstrapAccountParams): Promise<BootstrapAccountResult> {
  const startTime = Date.now();
  
  if (ONBOARDING_DEBUG) {
    console.log('[Onboarding] Starting bootstrapNewAccount for:', params.userId);
  }

  try {
    // Step 1: Create users/{uid} document (CRITICAL)
    await ensureUserDoc(params);

    // Step 2: Create profiles/{uid} document (CRITICAL)
    await ensureProfileDoc(params);

    // Step 3: Create userEmailIndex/{email} document (CRITICAL)
    await ensureUserEmailIndex(params);

    // Step 4: Create emailSubscribers/{uid} document (OPTIONAL)
    try {
      await ensureEmailSubscriber(params);
    } catch (error) {
      // Log but don't fail - this is optional
      const firebaseError = error as { code?: string; message?: string };
      if (ONBOARDING_DEBUG) {
        console.warn('[Onboarding] ensureEmailSubscriber failed (non-critical):', firebaseError.code, firebaseError.message);
      }
    }

    const duration = Date.now() - startTime;
    if (ONBOARDING_DEBUG) {
      console.log(`[Onboarding] bootstrapNewAccount completed in ${duration}ms`);
    }

    return { success: true };

  } catch (error) {
    const firebaseError = error as { 
      code?: string; 
      message?: string; 
      onboardingStep?: string;
      emailInUse?: boolean;
    };
    const step = firebaseError.onboardingStep || 'unknown';
    const errorCode = firebaseError.code || 'unknown';
    const errorMessage = firebaseError.message || 'Unknown error';

    if (ONBOARDING_DEBUG) {
      console.error('[Onboarding] bootstrapNewAccount FAILED:', {
        step,
        errorCode,
        errorMessage,
      });
    }

    // Handle email-in-use error specifically
    if (firebaseError.emailInUse || errorCode === ONBOARDING_ERROR_CODES.EMAIL_IN_USE) {
      return {
        success: false,
        error: 'That email is already in use. Try signing in instead.',
        emailInUse: true,
        debugInfo: getDebugErrorString(step, errorCode) || undefined,
      };
    }

    // Handle permission-denied errors
    if (errorCode === 'permission-denied') {
      return {
        success: false,
        error: "We couldn't finish setting up your account. Please try again.",
        debugInfo: getDebugErrorString(step, errorCode) || undefined,
      };
    }

    // Return user-friendly error with optional debug info
    const debugInfo = getDebugErrorString(step, errorCode);
    
    return {
      success: false,
      error: "We couldn't finish setting up your account. Please try again.",
      debugInfo: debugInfo || undefined,
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
    return 'That email is already in use. Try signing in instead.';
  }

  if (firebaseError.code === 'permission-denied') {
    const debugInfo = getDebugErrorString(
      firebaseError.onboardingStep || 'unknown',
      firebaseError.code
    );
    return `We couldn't finish setting up your account. Please try again.${debugInfo}`;
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
