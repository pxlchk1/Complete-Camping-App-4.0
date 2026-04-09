/**
 * Onboarding Sequence Store
 *
 * Single source of truth for versioned, one-time onboarding sequence state.
 * Persisted via AsyncStorage so it survives app relaunch.
 *
 * CURRENT VERSION: "2026-04-onboarding-v2"
 *
 * Steps (in order):
 *   1. verifyEmail  — brand new email/password accounts only
 *   2. push         — push notification permission
 *   3. email        — email opt-in
 *   4. myCampsite   — profile setup prompt
 *
 * Resolution rules:
 *   verifyEmail: only resolved when Firebase confirms emailVerified === true
 *   push:        resolved on accept OR dismiss
 *   email:       resolved on submit, dismiss, or skip (Apple sign-in)
 *   myCampsite:  resolved on CTA tap or dismiss
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Version & Types ────────────────────────────────────────────────────────

export const CURRENT_ONBOARDING_VERSION = "2026-04-onboarding-v4";

export type OnboardingStepId = "verifyEmail" | "push" | "email" | "myCampsite";

export type OnboardingStepStatus =
  | "pending"
  | "completed"
  | "dismissed"
  | "skipped";

export interface OnboardingStepState {
  status: OnboardingStepStatus;
  resolvedAt: number | null;
}

export interface OnboardingVersionProgress {
  /** Whether the user needs verify-email-first flow (brand new email/password) */
  isBrandNewUser: boolean;
  steps: Record<OnboardingStepId, OnboardingStepState>;
  sequenceComplete: boolean;
  enrolledAt: number;
  completedAt: number | null;
  /** How many times the walkthrough modal has been shown (for re-show logic) */
  walkthroughShowCount: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STEP_ORDER: OnboardingStepId[] = ["verifyEmail", "push", "email", "myCampsite"];

function isResolved(step: OnboardingStepState): boolean {
  return step.status === "completed" || step.status === "dismissed" || step.status === "skipped";
}

function freshSteps(): Record<OnboardingStepId, OnboardingStepState> {
  return {
    verifyEmail: { status: "pending", resolvedAt: null },
    push: { status: "pending", resolvedAt: null },
    email: { status: "pending", resolvedAt: null },
    myCampsite: { status: "pending", resolvedAt: null },
  };
}

function freshProgress(isBrandNew: boolean): OnboardingVersionProgress {
  return {
    isBrandNewUser: isBrandNew,
    steps: freshSteps(),
    sequenceComplete: false,
    enrolledAt: Date.now(),
    completedAt: null,
    walkthroughShowCount: 0,
  };
}

// ─── Store Interface ────────────────────────────────────────────────────────

interface OnboardingStore {
  /** Whether the persisted store has finished hydrating from AsyncStorage */
  _hasHydrated: boolean;

  /** Progress keyed by onboarding version */
  progressByVersion: Record<string, OnboardingVersionProgress>;

  /** Enroll user into current version if not already enrolled */
  enrollIfNeeded: (isBrandNewUser: boolean) => void;

  /** Get progress for the current version (or null if not enrolled) */
  getCurrentProgress: () => OnboardingVersionProgress | null;

  /** Resolve a step with a given status */
  resolveStep: (stepId: OnboardingStepId, status: "completed" | "dismissed" | "skipped") => void;

  /** Check if the current version is fully complete */
  isSequenceComplete: () => boolean;

  /** Compute the active step for the current version, given email verification status */
  getActiveStep: (isEmailVerified: boolean) => OnboardingStepId | null;

  /** Increment the walkthrough show count for the current version */
  incrementWalkthroughShowCount: () => void;

  /** Reset dismissed walkthrough steps (push/email/myCampsite) back to pending for re-show */
  resetDismissedForReshow: () => void;

  /** Reset (for testing only) */
  _reset: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      progressByVersion: {},

      enrollIfNeeded: (isBrandNewUser: boolean) => {
        const current = get().progressByVersion[CURRENT_ONBOARDING_VERSION];
        if (current) return; // already enrolled

        set((state) => ({
          progressByVersion: {
            ...state.progressByVersion,
            [CURRENT_ONBOARDING_VERSION]: freshProgress(isBrandNewUser),
          },
        }));
      },

      getCurrentProgress: () => {
        return get().progressByVersion[CURRENT_ONBOARDING_VERSION] ?? null;
      },

      resolveStep: (stepId, status) => {
        const progress = get().progressByVersion[CURRENT_ONBOARDING_VERSION];
        if (!progress) return;
        if (isResolved(progress.steps[stepId])) return; // already resolved

        const updatedSteps = {
          ...progress.steps,
          [stepId]: { status, resolvedAt: Date.now() } as OnboardingStepState,
        };

        // Check if all required steps are now resolved
        const allResolved = STEP_ORDER.every((id) => isResolved(updatedSteps[id]));

        set((state) => ({
          progressByVersion: {
            ...state.progressByVersion,
            [CURRENT_ONBOARDING_VERSION]: {
              ...progress,
              steps: updatedSteps,
              sequenceComplete: allResolved,
              completedAt: allResolved ? Date.now() : null,
            },
          },
        }));
      },

      isSequenceComplete: () => {
        const progress = get().progressByVersion[CURRENT_ONBOARDING_VERSION];
        return progress?.sequenceComplete ?? false;
      },

      getActiveStep: (isEmailVerifiedNow: boolean): OnboardingStepId | null => {
        const progress = get().progressByVersion[CURRENT_ONBOARDING_VERSION];
        if (!progress || progress.sequenceComplete) return null;

        // Brand new users: verifyEmail must resolve first
        if (progress.isBrandNewUser) {
          const ve = progress.steps.verifyEmail;
          if (!isResolved(ve)) {
            // verifyEmail resolves only when actually verified
            if (isEmailVerifiedNow) {
              // Auto-resolve now — caller should call resolveStep after this
              return null; // will be resolved then re-checked next render
            }
            return "verifyEmail";
          }
        } else {
          // Non-brand-new: skip verifyEmail entirely (mark skipped if pending)
          if (!isResolved(progress.steps.verifyEmail)) {
            // Auto-skip for non-brand-new users — don't return it as active
            // Caller will handle this via enrollIfNeeded or resolveStep
          }
        }

        // Walk remaining steps in order
        const stepsToCheck: OnboardingStepId[] = progress.isBrandNewUser
          ? ["push", "email", "myCampsite"]
          : ["push", "email", "myCampsite"];

        for (const stepId of stepsToCheck) {
          if (!isResolved(progress.steps[stepId])) {
            return stepId;
          }
        }

        return null;
      },

      incrementWalkthroughShowCount: () => {
        const progress = get().progressByVersion[CURRENT_ONBOARDING_VERSION];
        if (!progress) return;

        set((state) => ({
          progressByVersion: {
            ...state.progressByVersion,
            [CURRENT_ONBOARDING_VERSION]: {
              ...progress,
              walkthroughShowCount: (progress.walkthroughShowCount ?? 0) + 1,
            },
          },
        }));
      },

      resetDismissedForReshow: () => {
        const progress = get().progressByVersion[CURRENT_ONBOARDING_VERSION];
        if (!progress) return;

        const walkSteps: OnboardingStepId[] = ["push", "email", "myCampsite"];
        const updatedSteps = { ...progress.steps };
        let anyReset = false;

        for (const id of walkSteps) {
          if (updatedSteps[id].status === "dismissed") {
            updatedSteps[id] = { status: "pending", resolvedAt: null };
            anyReset = true;
          }
        }

        if (!anyReset) return;

        set((state) => ({
          progressByVersion: {
            ...state.progressByVersion,
            [CURRENT_ONBOARDING_VERSION]: {
              ...progress,
              steps: updatedSteps,
              sequenceComplete: false,
              completedAt: null,
            },
          },
        }));
      },

      _reset: () => {
        set({ progressByVersion: {} });
      },
    }),
    {
      name: "onboarding-sequence-store",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist progressByVersion (_hasHydrated is ephemeral)
      partialize: (state) => ({ progressByVersion: state.progressByVersion }),
      onRehydrateStorage: () => () => {
        useOnboardingStore.setState({ _hasHydrated: true });
      },
    }
  )
);
