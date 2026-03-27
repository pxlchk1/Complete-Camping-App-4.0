import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, LinkingOptions } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import {
  Raleway_400Regular,
  Raleway_500Medium,
  Raleway_600SemiBold,
  Raleway_700Bold,
} from "@expo-google-fonts/raleway";
import {
  SourceSans3_400Regular,
  SourceSans3_500Medium,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
} from "@expo-google-fonts/source-sans-3";
import { Satisfy_400Regular } from "@expo-google-fonts/satisfy";
import RootNavigator from "./src/navigation/RootNavigator";
import { ToastProvider } from "./src/components/ToastManager";
import { FireflyTimeProvider } from "./src/context/FireflyTimeContext";
import { OnboardingProvider } from "./src/context/OnboardingContext";
import { View, ImageBackground, Text, Pressable, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { initSubscriptions, identifyUser } from "./src/services/subscriptionService";
import { preloadHeroImages } from "./src/constants/images";
import { useAuthStore } from "./src/state/authStore";
import { useTripsStore } from "./src/state/tripsStore";
import { auth } from "./src/config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./src/config/firebase";
import { RootStackParamList } from "./src/navigation/types";

/**
 * Root-level error boundary.
 * Catches unhandled JS errors in the component tree and shows a recovery UI
 * instead of crashing the app.
 */
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[AppErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={boundaryStyles.container}>
          <Ionicons name="warning-outline" size={56} color="#B5591D" />
          <Text style={boundaryStyles.title}>Something went wrong</Text>
          <Text style={boundaryStyles.message}>
            {"The app ran into an unexpected error. Tap below to try again."}
          </Text>
          <Pressable onPress={this.handleRetry} style={boundaryStyles.retryButton}>
            <Text style={boundaryStyles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const boundaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#EEE7D9",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    color: "#3D2817",
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#485951",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: "#1A4C39",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  retryText: {
    color: "#EEE7D9",
    fontWeight: "bold",
    fontSize: 16,
  },
});

// Deep linking configuration
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    Linking.createURL('/'), // tentlantern:// (app scheme)
    'https://tentandlantern.com',
    'https://tentlantern.app',
  ],
  config: {
    screens: {
      // Paywall / subscription screen
      Paywall: {
        path: 'paywall',
      },
      // New campground invite format: /join?token=<token>
      AcceptInvite: {
        path: 'join',
        parse: {
          token: (token: string) => token,
        },
      },
      // Old invitation format: /invite/<token>
      AcceptInvitation: {
        path: 'invite/:invitationToken',
      },
      // Account deletion confirmation from email
      ConfirmDeleteAccount: {
        path: 'delete-account',
        parse: {
          token: (token: string) => token,
        },
      },
    },
  },
};

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project.
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

export default function App() {
  const [fontsLoaded] = useFonts({
    // Heading Font: Raleway
    Raleway_400Regular,
    Raleway_500Medium,
    Raleway_600SemiBold,
    Raleway_700Bold,
    // Body Font: Source Sans 3
    SourceSans3_400Regular,
    SourceSans3_500Medium,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
    // Accent Font: Satisfy (use very sparingly)
    Satisfy_400Regular,
  });

  // Log when fonts are loaded for verification
  if (__DEV__ && fontsLoaded) {
    console.log("Fonts loaded: Raleway + SourceSans3 + Satisfy");
  }

  const [appReady, setAppReady] = useState(false);
  const [subscriptionsInitialized, setSubscriptionsInitialized] = useState(false);

  // Initialize subscriptions ONCE at app launch (anonymous, before auth)
  useEffect(() => {
    if (fontsLoaded && !subscriptionsInitialized) {
      if (__DEV__) console.log("[App] Initializing subscriptions anonymously");
      initSubscriptions()
        .then(() => {
          setSubscriptionsInitialized(true);
          if (__DEV__) console.log("[App] Subscriptions initialized");
        })
        .catch((error) => {
          console.error("[App] Failed to initialize subscriptions:", error);
          setSubscriptionsInitialized(true); // Continue even if init fails
        });
    }
  }, [fontsLoaded, subscriptionsInitialized]);

  // Listen for Firebase auth state changes and identify user in RevenueCat
  useEffect(() => {
    if (!subscriptionsInitialized) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (__DEV__) console.log("[App] Firebase user signed in:", firebaseUser.uid);
        // Identify user in RevenueCat (has its own offline cache)
        try {
          await identifyUser(firebaseUser.uid);
          if (__DEV__) console.log("[App] User identified in RevenueCat");
        } catch (error) {
          console.error("[App] Failed to identify user in RevenueCat:", error);
        }

        // --- Bootstrap: Ensure Firestore user profile doc exists ---
        // NOTE: Profile creation is now handled by bootstrapNewAccount in AuthLanding.
        // This is only a safety net for edge cases (e.g., Apple Sign In session restore).
        // Non-critical: skip silently when offline.
        try {
          const userRef = doc(db, "profiles", firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const email = firebaseUser.email || "";
            const photoURL = firebaseUser.photoURL || "";
            await setDoc(userRef, {
              email,
              photoURL,
              role: "user",
              isBanned: false,
              notificationsEnabled: true,
              emailSubscribed: false,
              profilePublic: true,
              showUsernamePublicly: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }, { merge: true });
            if (__DEV__) console.log(`[App] Created safety-net profile for uid: ${firebaseUser.uid}`);
          }
        } catch (error) {
          if (__DEV__) console.log("[App] Profile safety-net skipped (offline):", (error as any)?.code || error);
        }
      } else {
        if (__DEV__) console.log("[App] Firebase user signed out");
        // Clear user-specific data from local stores
        useTripsStore.getState().clearTrips();
        useAuthStore.getState().signOut();
        // User remains anonymous in RevenueCat or call logOut if needed
      }
    });

    return () => unsubscribe();
  }, [subscriptionsInitialized]);

  // Show splash screen for minimum 3 seconds on cold start, preload hero images
  useEffect(() => {
    if (fontsLoaded) {
      preloadHeroImages();
      const timer = setTimeout(() => {
        setAppReady(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || !appReady) {
    return (
      <ImageBackground
        source={require('./assets/images/splash-screen.png')}
        style={{ flex: 1, width: "100%", height: "100%" }}
        resizeMode="cover"
      />
    );
  }

  return (
    <AppErrorBoundary>
      <FireflyTimeProvider>
        <OnboardingProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
              <ToastProvider>
                <NavigationContainer
                  linking={linking}
                  onStateChange={__DEV__ ? (state) => {
                    console.log('[Navigation] State changed:', state);
                  } : undefined}
                  onUnhandledAction={(action) => {
                    console.error('[Navigation] Unhandled action:', action);
                  }}
                >
                  <RootNavigator />
                  <StatusBar style="auto" />
                </NavigationContainer>
              </ToastProvider>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </OnboardingProvider>
      </FireflyTimeProvider>
    </AppErrorBoundary>
  );
}
