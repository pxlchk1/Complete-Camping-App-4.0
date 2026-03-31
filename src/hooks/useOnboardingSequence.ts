/**
 * useOnboardingSequence Hook
 *
 * Single orchestrator for the versioned onboarding sequence.
 * Returns the current active step and handlers to resolve each step.
 *
 * This hook:
 * - Enrolls the user into the current onboarding version if not already enrolled
 * - Computes the single active step based on resolution state + email verification
 * - Provides resolve callbacks for each step
 * - Exposes `isOnboardingActive` so other modals can defer
 *
 * Integration:
 * - Rendered once in HomeScreen
 * - Controls visibility of StayInLoopModal, EmailOptInModal, CampsitePrompt
 * - EmailVerificationGate (RootNavigator) already blocks unverified brand-new users
 */

import { useEffect, useRef, useCallback } from "react";
import { auth } from "../config/firebase";
import {
  useOnboardingStore,
  OnboardingStepId,
} from "../state/onboardingStore";

interface UseOnboardingSequenceOptions {
  /** Is the user authenticated (non-guest)? */
  isAuthenticated: boolean;
  /** Is the user a guest? */
  isGuest: boolean;
  /** Is this the user's very first Home visit? (hasSeenWelcomeHome === false) */
  isBrandNewUser: boolean;
  /** Are user flags still loading? */
  userFlagsLoading: boolean;
  /** Is the user an Apple sign-in user? */
  isAppleUser: boolean;
  /** Has the user already subscribed to emails? */
  isEmailSubscribed: boolean;
}

interface OnboardingSequenceResult {
  /** The single active onboarding step, or null if complete */
  activeStep: OnboardingStepId | null;
  /** Whether onboarding is still in progress (other modals should defer) */
  isOnboardingActive: boolean;
  /** Whether the full sequence is complete for the current version */
  isComplete: boolean;
  /** Resolve push step */
  resolvePush: (outcome: "completed" | "dismissed") => void;
  /** Resolve email step */
  resolveEmail: (outcome: "completed" | "dismissed" | "skipped") => void;
  /** Resolve myCampsite step */
  resolveMyCampsite: (outcome: "completed" | "dismissed") => void;
}

export function useOnboardingSequence({
  isAuthenticated,
  isGuest,
  isBrandNewUser,
  userFlagsLoading,
  isAppleUser,
  isEmailSubscribed,
}: UseOnboardingSequenceOptions): OnboardingSequenceResult {
  const enrollIfNeeded = useOnboardingStore((s) => s.enrollIfNeeded);
  const resolveStep = useOnboardingStore((s) => s.resolveStep);
  const getActiveStep = useOnboardingStore((s) => s.getActiveStep);
  const getCurrentProgress = useOnboardingStore((s) => s.getCurrentProgress);
  const isSequenceComplete = useOnboardingStore((s) => s.isSequenceComplete);
  const progressByVersion = useOnboardingStore((s) => s.progressByVersion);

  const enrolled = useRef(false);

  // ─── Enrollment ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (enrolled.current) return;
    if (userFlagsLoading) return;
    if (!isAuthenticated || isGuest) return;

    enrolled.current = true;

    // Enroll into current version
    enrollIfNeeded(isBrandNewUser);

    const progress = getCurrentProgress();
    if (!progress) return;

    // For non-brand-new users: auto-skip verifyEmail
    if (!progress.isBrandNewUser && progress.steps.verifyEmail.status === "pending") {
      resolveStep("verifyEmail", "skipped");
    }

    // Auto-skip email for Apple sign-in users whose email opt-in is not applicable
    // Apple users with privaterelay emails can't meaningfully opt in
    if (isAppleUser && progress.steps.email.status === "pending") {
      const userEmail = auth.currentUser?.email || "";
      if (userEmail.includes("privaterelay.appleid.com") || !userEmail) {
        resolveStep("email", "skipped");
      }
    }

    // If user already subscribed to emails, skip the email step
    if (isEmailSubscribed && progress.steps.email.status === "pending") {
      resolveStep("email", "skipped");
    }
  }, [
    isAuthenticated,
    isGuest,
    userFlagsLoading,
    isBrandNewUser,
    isAppleUser,
    isEmailSubscribed,
    enrollIfNeeded,
    resolveStep,
    getCurrentProgress,
  ]);

  // ─── Auto-resolve verifyEmail when Firebase confirms it ─────────────────
  useEffect(() => {
    if (!isAuthenticated || isGuest) return;

    const progress = getCurrentProgress();
    if (!progress || !progress.isBrandNewUser) return;
    if (progress.steps.verifyEmail.status !== "pending") return;

    // Check if email is now verified
    const user = auth.currentUser;
    if (!user) return;

    const verified = user.emailVerified || isAppleUser;
    if (verified) {
      resolveStep("verifyEmail", "completed");
    }
  }, [isAuthenticated, isGuest, isAppleUser, resolveStep, getCurrentProgress, progressByVersion]);

  // ─── Compute active step ───────────────────────────────────────────────
  const user = auth.currentUser;
  const emailVerified = user?.emailVerified || isAppleUser;

  const progress = getCurrentProgress();
  let activeStep: OnboardingStepId | null = null;

  if (progress && !progress.sequenceComplete && isAuthenticated && !isGuest) {
    activeStep = getActiveStep(emailVerified);

    // If getActiveStep returns null but sequence isn't marked complete,
    // it means verifyEmail was just auto-resolved. Check again.
    if (activeStep === null && !isSequenceComplete()) {
      // All steps might be resolved now — re-check
      const recheckProgress = getCurrentProgress();
      if (recheckProgress && !recheckProgress.sequenceComplete) {
        // Walk steps manually
        const stepsToCheck: OnboardingStepId[] = recheckProgress.isBrandNewUser
          ? ["verifyEmail", "push", "email", "myCampsite"]
          : ["push", "email", "myCampsite"];

        for (const id of stepsToCheck) {
          const s = recheckProgress.steps[id];
          if (s.status === "pending") {
            activeStep = id;
            break;
          }
        }
      }
    }
  }

  const isOnboardingActive = activeStep !== null;
  const isComplete = isSequenceComplete();

  // ─── Resolve callbacks ─────────────────────────────────────────────────

  const resolvePush = useCallback(
    (outcome: "completed" | "dismissed") => {
      resolveStep("push", outcome);
    },
    [resolveStep]
  );

  const resolveEmail = useCallback(
    (outcome: "completed" | "dismissed" | "skipped") => {
      resolveStep("email", outcome);
    },
    [resolveStep]
  );

  const resolveMyCampsite = useCallback(
    (outcome: "completed" | "dismissed") => {
      resolveStep("myCampsite", outcome);
    },
    [resolveStep]
  );

  return {
    activeStep,
    isOnboardingActive,
    isComplete,
    resolvePush,
    resolveEmail,
    resolveMyCampsite,
  };
}
