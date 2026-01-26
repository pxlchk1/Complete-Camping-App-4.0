/**
 * Onboarding Module
 * 
 * Protected layer for handling sign-up and first bootstrapping writes.
 * This module provides:
 * - Debug logging (controlled by ONBOARDING_DEBUG flag)
 * - Safe Firestore write wrappers
 * - Orchestrated account bootstrapping
 */

// Configuration
export { ONBOARDING_DEBUG } from './onboardingConfig';

// Debug utilities
export {
  onboardingLog,
  getDebugErrorString,
  safeStringify,
  getPayloadKeys,
  redactSensitiveData,
} from './onboardingDebug';

// Write wrappers
export {
  onboardingSetDoc,
  onboardingUpdateDoc,
  onboardingBatchCommit,
  isPermissionDeniedError,
  hasOnboardingStep,
} from './onboardingWrites';
export type { OnboardingWriteMeta } from './onboardingWrites';

// Main orchestrator
export {
  bootstrapNewAccount,
  getOnboardingErrorMessage,
  isEmailInUseError,
  ONBOARDING_STEPS,
  ONBOARDING_ERROR_CODES,
} from './onboardingSteps';
export type {
  BootstrapAccountParams,
  BootstrapAccountResult,
} from './onboardingSteps';
