/**
 * Onboarding Configuration
 * 
 * This file contains the single debug switch for onboarding logging.
 * Set ONBOARDING_DEBUG to true when debugging sign-up issues.
 * IMPORTANT: Set to false for production/release builds.
 */

/**
 * Enable or disable onboarding debug logging.
 * When true, detailed logs are output for each Firestore write during onboarding.
 * When false, logging is completely disabled (no-op).
 */
export const ONBOARDING_DEBUG = false;
