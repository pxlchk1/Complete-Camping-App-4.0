/**
 * Onboarding Firestore Write Wrappers
 * 
 * These wrappers should ONLY be used during onboarding (sign-up and first bootstrapping).
 * They provide consistent logging, error handling, and payload validation.
 */

import {
  DocumentReference,
  DocumentData,
  SetOptions,
  WriteBatch,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { onboardingLog, getPayloadKeys } from './onboardingDebug';

/**
 * Metadata about the current onboarding step for logging.
 */
export interface OnboardingWriteMeta {
  step: string;
}

/**
 * Wrapped setDoc for onboarding writes.
 * Logs before and after the write, catches and rethrows errors with logging.
 */
export async function onboardingSetDoc<T extends DocumentData>(
  docRef: DocumentReference<T>,
  data: T,
  options: SetOptions | undefined,
  meta: OnboardingWriteMeta
): Promise<void> {
  const path = docRef.path;
  const payloadKeys = getPayloadKeys(data as Record<string, unknown>);

  // Log before write
  onboardingLog('before', {
    step: meta.step,
    op: 'setDoc',
    path,
  }, {
    payloadKeys,
    payload: data as Record<string, unknown>,
    includePayload: true,
  });

  try {
    if (options) {
      await setDoc(docRef, data, options);
    } else {
      await setDoc(docRef, data);
    }

    // Log success
    onboardingLog('success', {
      step: meta.step,
      op: 'setDoc',
      path,
    });
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    
    // Log error
    onboardingLog('error', {
      step: meta.step,
      op: 'setDoc',
      path,
    }, undefined, {
      code: firebaseError.code,
      message: firebaseError.message,
    });

    // Rethrow with step context attached
    const enhancedError = error as Error & { onboardingStep?: string };
    enhancedError.onboardingStep = meta.step;
    throw enhancedError;
  }
}

/**
 * Wrapped updateDoc for onboarding writes.
 * Logs before and after the write, catches and rethrows errors with logging.
 */
export async function onboardingUpdateDoc<T extends DocumentData>(
  docRef: DocumentReference<T>,
  data: Partial<T>,
  meta: OnboardingWriteMeta
): Promise<void> {
  const path = docRef.path;
  const payloadKeys = getPayloadKeys(data as Record<string, unknown>);

  // Log before write
  onboardingLog('before', {
    step: meta.step,
    op: 'updateDoc',
    path,
  }, {
    payloadKeys,
    payload: data as Record<string, unknown>,
    includePayload: true,
  });

  try {
    await updateDoc(docRef, data as DocumentData);

    // Log success
    onboardingLog('success', {
      step: meta.step,
      op: 'updateDoc',
      path,
    });
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    
    // Log error
    onboardingLog('error', {
      step: meta.step,
      op: 'updateDoc',
      path,
    }, undefined, {
      code: firebaseError.code,
      message: firebaseError.message,
    });

    // Rethrow with step context attached
    const enhancedError = error as Error & { onboardingStep?: string };
    enhancedError.onboardingStep = meta.step;
    throw enhancedError;
  }
}

/**
 * Wrapped batch commit for onboarding writes.
 * Logs before and after the commit, catches and rethrows errors with logging.
 */
export async function onboardingBatchCommit(
  batch: WriteBatch,
  meta: OnboardingWriteMeta,
  operations?: string[]
): Promise<void> {
  const path = 'batch';

  // Log before write
  onboardingLog('before', {
    step: meta.step,
    op: 'batchCommit',
    path,
  }, {
    payloadKeys: operations || ['batch operations'],
  });

  try {
    await batch.commit();

    // Log success
    onboardingLog('success', {
      step: meta.step,
      op: 'batchCommit',
      path,
    });
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    
    // Log error
    onboardingLog('error', {
      step: meta.step,
      op: 'batchCommit',
      path,
    }, undefined, {
      code: firebaseError.code,
      message: firebaseError.message,
    });

    // Rethrow with step context attached
    const enhancedError = error as Error & { onboardingStep?: string };
    enhancedError.onboardingStep = meta.step;
    throw enhancedError;
  }
}

/**
 * Type guard to check if an error is a Firebase permission error.
 */
export function isPermissionDeniedError(error: unknown): boolean {
  const firebaseError = error as { code?: string };
  return firebaseError?.code === 'permission-denied';
}

/**
 * Type guard to check if an error has an onboarding step attached.
 */
export function hasOnboardingStep(error: unknown): error is Error & { onboardingStep: string } {
  return (error as Error & { onboardingStep?: string })?.onboardingStep !== undefined;
}
