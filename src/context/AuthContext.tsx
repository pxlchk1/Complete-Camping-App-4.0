/**
 * Auth Context
 * Provides authentication state throughout the app
 * Wraps zustand store with React Context for compatibility
 */

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Alert } from "react-native";
import { auth } from "../config/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useAuthStore } from "../state/authStore";
import { useTripsStore } from "../state/tripsStore";
import { checkPendingInvitesOnLogin } from "../services/campgroundInviteService";

interface AuthContextType {
  user: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const setStoreUser = useAuthStore((state) => state.setUser);
  const signOutStore = useAuthStore((state) => state.signOut);
  const loadTrips = useTripsStore((state) => state.loadTrips);
  const clearTrips = useTripsStore((state) => state.clearTrips);
  const previousUserRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const previousUid = previousUserRef.current;
      const currentUid = firebaseUser?.uid || null;
      
      setUser(firebaseUser);
      setIsLoading(false);
      
      // Sync with zustand store
      if (firebaseUser) {
        setStoreUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          handle: "",
          displayName: firebaseUser.displayName || undefined,
          avatarUrl: firebaseUser.photoURL || undefined,
          createdAt: new Date().toISOString(),
        });
        
        // Check for pending invites when user logs in (not just on initial load)
        // Only check if this is a new login (user changed from null to logged in)
        if (previousUid === null && currentUid !== null) {
          console.log("[Auth] User logged in, checking for pending invites...");
          
          // Load user's trips from Firebase
          try {
            await loadTrips();
            console.log("[Auth] Trips loaded from Firebase");
          } catch (error) {
            console.error("[Auth] Error loading trips:", error);
          }
          
          try {
            const result = await checkPendingInvitesOnLogin();
            if (result.processed > 0) {
              console.log("[Auth] Pending invites processed:", result);
              // Show alert to user about the accepted invites
              Alert.alert(
                "Welcome to the campground! 🏕️",
                result.message
              );
            }
          } catch (error) {
            console.error("[Auth] Error checking pending invites:", error);
          }
        }
      } else {
        signOutStore();
        clearTrips(); // Clear trips when user logs out
      }
      
      // Update the previous user ref
      previousUserRef.current = currentUid;
    });

    return () => unsubscribe();
  }, [setStoreUser, signOutStore]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
