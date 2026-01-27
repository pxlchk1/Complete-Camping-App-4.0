import { useEffect, useState } from 'react';
import { ImageBackground, View } from 'react-native';

import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';

import { LinkingOptions, NavigationContainer } from '@react-navigation/native';

import {
  Raleway_400Regular,
  Raleway_500Medium,
  Raleway_600SemiBold,
  Raleway_700Bold,
} from '@expo-google-fonts/raleway';
import { Satisfy_400Regular } from '@expo-google-fonts/satisfy';
import {
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
} from '@expo-google-fonts/source-sans-3';

import { onAuthStateChanged } from 'firebase/auth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from './src/components/ToastManager';
import { auth } from './src/config/firebase';
import { FireflyTimeProvider } from './src/context/FireflyTimeContext';
import { OnboardingProvider } from './src/context/OnboardingContext';
import RootNavigator from './src/navigation/RootNavigator';
import { RootStackParamList } from './src/navigation/types';
import { identifyUser, initSubscriptions } from './src/services/subscriptionService';
import { useAuthStore } from './src/state/authStore';
import { useTripsStore } from './src/state/tripsStore';

// Deep linking configuration
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    Linking.createURL('/'), // tentlantern:// (app scheme)
    'https://tentandlantern.com',
    'https://tentlantern.app',
  ],
  config: {
    screens: {
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
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
    // Accent Font: Satisfy (use very sparingly)
    Satisfy_400Regular,
  });

  // Log when fonts are loaded for verification
  if (fontsLoaded) {
    console.log('Fonts loaded: Raleway + SourceSans3 + Satisfy');
  }

  const [appReady, setAppReady] = useState(false);
  const [subscriptionsInitialized, setSubscriptionsInitialized] = useState(false);

  // Initialize subscriptions ONCE at app launch (anonymous, before auth)
  useEffect(() => {
    if (fontsLoaded && !subscriptionsInitialized) {
      console.log('[App] Initializing subscriptions anonymously');
      initSubscriptions()
        .then(() => {
          setSubscriptionsInitialized(true);
          console.log('[App] Subscriptions initialized');
        })
        .catch((error) => {
          console.error('[App] Failed to initialize subscriptions:', error);
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
        console.log('[App] Firebase user signed in:', firebaseUser.uid);
        try {
          // Identify user in RevenueCat with Firebase uid
          await identifyUser(firebaseUser.uid);
          console.log('[App] User identified in RevenueCat');

          // NOTE: Profile creation is handled by bootstrapNewAccount in AuthLanding.
          // We no longer create profiles here to avoid race conditions where this
          // listener fires before bootstrapNewAccount finishes, causing the user's
          // displayName to be overwritten with "Camper" fallback.
          // For returning users/session restore, the profile already exists.
        } catch (error) {
          console.error('[App] Failed to identify user in RevenueCat:', error);
        }
      } else {
        console.log('[App] Firebase user signed out');
        // Clear user-specific data from local stores
        useTripsStore.getState().clearTrips();
        useAuthStore.getState().signOut();
        // User remains anonymous in RevenueCat or call logOut if needed
      }
    });

    return () => unsubscribe();
  }, [subscriptionsInitialized]);

  // Show splash screen for minimum 2 seconds
  useEffect(() => {
    if (fontsLoaded) {
      const timer = setTimeout(() => {
        setAppReady(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || !appReady) {
    return (
      <ImageBackground
        source={require('./assets/images/splash-screen.png')}
        style={{ flex: 1, width: '100%', height: '100%' }}
        resizeMode="cover"
      />
    );
  }

  return (
    <FireflyTimeProvider>
      <OnboardingProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <ToastProvider>
              <NavigationContainer
                linking={linking}
                onStateChange={(state) => {
                  console.log('[Navigation] State changed:', state);
                }}
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
  );
}
