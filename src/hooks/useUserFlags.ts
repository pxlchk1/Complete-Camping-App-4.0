/**
 * useUserFlags Hook
 * 
 * Provides real-time subscription to user flags stored in Firestore users collection.
 * Used for things like hasSeenWelcomeHome, firstName, etc.
 */

import { useState, useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../config/firebase";
import { USER_FLAGS, setHomeWelcomeSeen } from "../services/userFlagsService";

export interface UserFlagsState {
  /** Whether user has seen the first-time Home welcome */
  hasSeenWelcomeHome: boolean;
  /** Whether user has seen the stay-in-the-loop modal */
  hasSeenStayInLoop: boolean;
  /** Whether the user has completed the onboarding walkthrough (Firestore authority) */
  onboardingCompleted: boolean;
  /** User's first name from users collection */
  firstName: string | null;
  /** Whether the data is still loading */
  loading: boolean;
  /** Any error that occurred */
  error: Error | null;
}

/**
 * Hook to subscribe to user flags from Firestore
 * Returns real-time updates when the user document changes
 */
export function useUserFlags(): UserFlagsState {
  const [state, setState] = useState<UserFlagsState>({
    hasSeenWelcomeHome: false,
    hasSeenStayInLoop: false,
    onboardingCompleted: false,
    firstName: null,
    loading: true,
    error: null,
  });

  // Track if we've already marked hasSeenWelcomeHome to avoid multiple writes
  const hasMarkedSeen = useRef(false);
  // Track the current user UID so the effect re-runs on auth state change
  const [currentUid, setCurrentUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  // Track whether Firebase auth has resolved (auth uses AsyncStorage, so
  // auth.currentUser is null on first render until persistence restores).
  // Without this guard, loading becomes false with wrong defaults before
  // the real user flags arrive, causing enrollment with wrong isBrandNewUser.
  const [authResolved, setAuthResolved] = useState(auth.currentUser != null);

  // Listen for auth state changes so we re-subscribe when a user signs in/out
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUid(user?.uid ?? null);
      setAuthResolved(true);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    // Wait for Firebase auth to resolve before setting loading: false.
    // This prevents premature enrollment with wrong hasSeenWelcomeHome defaults.
    if (!authResolved) return;

    if (!currentUid) {
      setState({
        hasSeenWelcomeHome: false,
        hasSeenStayInLoop: false,
        onboardingCompleted: false,
        firstName: null,
        loading: false,
        error: null,
      });
      return;
    }

    const userRef = doc(db, "users", currentUid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const hasSeenWelcome = data?.[USER_FLAGS.HAS_SEEN_WELCOME_HOME] === true;
          const hasSeenStayInLoop = data?.hasSeenStayInLoop === true;
          const firstName = data?.firstName || null;
          // Firestore is the authority for onboarding completion.
          // Legacy fallback: existing users who already have profile data
          // (hasSeenWelcomeHome) are treated as completed even without
          // the explicit field, so they never see the onboarding modal.
          const onboardingCompleted = data?.onboardingCompleted === true || hasSeenWelcome;

          // If this is the first time seeing the Home screen, mark it as seen
          // Use a ref guard to ensure this only fires once
          if (!hasSeenWelcome && !hasMarkedSeen.current) {
            hasMarkedSeen.current = true;
            // Fire and forget - don't block on this
            setHomeWelcomeSeen().catch((err) => {
              console.warn("[useUserFlags] Failed to mark home welcome seen:", err);
            });
          }

          setState({
            hasSeenWelcomeHome: hasSeenWelcome,
            hasSeenStayInLoop: hasSeenStayInLoop,
            onboardingCompleted,
            firstName,
            loading: false,
            error: null,
          });
        } else {
          // Document doesn't exist yet - treat as first time user
          if (!hasMarkedSeen.current) {
            hasMarkedSeen.current = true;
            setHomeWelcomeSeen().catch((err) => {
              console.warn("[useUserFlags] Failed to mark home welcome seen:", err);
            });
          }
          setState({
            hasSeenWelcomeHome: false,
            hasSeenStayInLoop: false,
            onboardingCompleted: false,
            firstName: null,
            loading: false,
            error: null,
          });
        }
      },
      (error) => {
        console.error("[useUserFlags] Snapshot error:", error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error as Error,
        }));
      }
    );

    return () => unsubscribe();
  }, [currentUid, authResolved]);

  return state;
}
