import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { View, Text, ScrollView, Pressable, ImageBackground, Image, ActivityIndicator, Modal, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

// Components
import AccountButtonHeader from "../components/AccountButtonHeader";
import { SectionTitle, BodyText, BodyTextMedium } from "../components/Typography";
import PushPermissionPrompt from "../components/PushPermissionPrompt";
import HandleLink from "../components/HandleLink";
import AccountRequiredModal from "../components/AccountRequiredModal";
import OnboardingModal from "../components/OnboardingModal";
import EmailOptInModal from "../components/EmailOptInModal";
import StayInLoopModal from "../components/StayInLoopModal";

// Hooks
import { useScreenOnboarding } from "../hooks/useScreenOnboarding";
import { useUserFlags } from "../hooks/useUserFlags";

// Services
import { getPhotoPosts } from "../services/photoPostsService";
import { getUser } from "../services/userService";
import { getConnectDisplayHandle } from "../services/handleService";
import { PhotoPost } from "../types/photoPost";
import {
  checkNotificationModalEligibility,
  recordModalShown,
  trackModalEligible,
  trackModalShown,
  NotificationCohort,
} from "../services/notificationEligibilityService";

// State
import { useTripsStore } from "../state/tripsStore";
import { useGearStore } from "../state/gearStore";
import { useUserStore, createTestUser } from "../state/userStore";
import { usePlanTabStore } from "../state/planTabStore";
import { useSubscriptionStore } from "../state/subscriptionStore";
import { useUpsellStore, UPSELL_COPY, UPSELL_MODALS_ENABLED } from "../state/upsellStore";
import UpsellModal from "../components/UpsellModal";
import { trackUpsellModalViewed, trackUpsellCtaClicked, trackUpsellModalDismissed } from "../services/analyticsService";
import { PAYWALL_ENABLED } from "../config/subscriptions";

// Utils
import { getWelcomeTitle, getWelcomeSubtext } from "../utils/welcomeCopy";
import { useUserStatus } from "../utils/authHelper";

// Constants
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  RIVER_ROCK,
  SIERRA_SKY,
  PARCHMENT,
  PARCHMENT_BACKGROUND,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_ON_DARK,
} from "../constants/colors";
import { HERO_IMAGES, LOGOS } from "../constants/images";
import { RootStackParamList } from "../navigation/types";
import { auth, db } from "../config/firebase";
import { doc, getDoc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setCampsiteSetupPromptSeen, shouldSuppressCampsitePrompt } from "../services/userFlagsService";

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Home">;

// Daily camping tips
const CAMPING_TIPS = [
  "Always check the weather forecast before your trip and adjust your gear list accordingly.",
  "Pack light, pack right - you can always layer clothing!",
  "Bring a headlamp or flashlight for each person in your group.",
  "Store food properly to avoid attracting wildlife to your campsite.",
  "Leave No Trace - pack out everything you pack in.",
  "Bring extra batteries and a portable charger for electronics.",
  "Test all your gear at home before heading out on your trip.",
  "Bring a first aid kit and know how to use it.",
  "Set up camp at least 200 feet from water sources.",
  "Arrive at your campsite with enough daylight to set up comfortably.",
];



const safeHaptic = () => {
  // Don’t let haptics failures block navigation.
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
};

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const trips = useTripsStore((s) => s.trips);
  const gearLists = useGearStore((s) => s.packingLists);
  const insets = useSafeAreaInsets();
  const setCurrentUser = useUserStore((s) => s.setCurrentUser);
  const currentUser = useUserStore((s) => s.currentUser);
  const setActivePlanTab = usePlanTabStore((s) => s.setActiveTab);
  const isPro = useSubscriptionStore((s) => s.isPro);
  const { isLoggedIn: isAuthenticated, isGuest } = useUserStatus();

  // User flags for welcome greeting (real-time subscription to Firestore)
  const { hasSeenWelcomeHome, hasSeenStayInLoop, firstName: userFirstName, loading: userFlagsLoading } = useUserFlags();

  // Notification opt-in modal state
  const [showStayInLoopModal, setShowStayInLoopModal] = useState(false);
  const [notificationCohort, setNotificationCohort] = useState<NotificationCohort | null>(null);

  // Featured Community Photo state
  const [featuredPhoto, setFeaturedPhoto] = useState<PhotoPost | null>(null);
  const [featuredPhotoHandle, setFeaturedPhotoHandle] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(true);

  // Gating modals state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountModalTriggerKey, setAccountModalTriggerKey] = useState<string>("default");

  // Onboarding modal
  const { showModal, currentTooltip, dismissModal, openModal } = useScreenOnboarding("Home");

  // Admin test modal state (for Communications screen testing)
  const [adminTestModal, setAdminTestModal] = useState<{
    heading: string;
    body: string;
    ctaLabel: string;
    ctaLink: string;
    ctaMode: "url" | "subscription";
  } | null>(null);

  // Published announcement modal state (for all users)
  const [announcementModal, setAnnouncementModal] = useState<{
    versionId: string;
    headline: string;
    body: string;
    microCopy: string;
    ctaText: string;
    ctaMode: "url" | "subscription" | "none";
    ctaLink: string;
  } | null>(null);

  // Email opt-in modal state
  const [showEmailOptIn, setShowEmailOptIn] = useState(false);

  // Session soft upsell nudge state
  const [showSessionNudge, setShowSessionNudge] = useState(false);
  const canShowSessionNudge = useUpsellStore((s) => s.canShowSessionNudge);
  const markSessionUpsellShown = useUpsellStore((s) => s.markSessionUpsellShown);
  const recordUpsellDismissal = useUpsellStore((s) => s.recordModalDismissal);
  const sessionNudgeChecked = useRef(false);

  // First-login onboarding sequence state
  // Steps: "idle" (not first-login), "notifications" (step 1), "campsite" (step 2), "done"
  const firstLoginStep = useRef<"idle" | "notifications" | "campsite" | "done">("idle");
  const [showCampsitePrompt, setShowCampsitePrompt] = useState(false);
  const firstLoginChecked = useRef(false);
  const returningUserChecked = useRef(false);
  const returningUserNeedsCampsite = useRef(false);

  // First-login sequence: detect brand new user and orchestrate steps
  useEffect(() => {
    if (firstLoginChecked.current) return;
    if (userFlagsLoading) return;
    if (!isAuthenticated || isGuest) return;
    // hasSeenWelcomeHome is false only on the very first Home visit
    if (hasSeenWelcomeHome) {
      firstLoginStep.current = "idle";
      return;
    }

    firstLoginChecked.current = true;
    firstLoginStep.current = "notifications";

    const userId = auth.currentUser?.uid;
    if (!userId) return;

    let cancelled = false;

    const startFirstLoginSequence = async () => {
      try {
        // Check if user already customized their profile or saw this prompt
        const suppressCampsite = await shouldSuppressCampsitePrompt();

        const eligibility = await checkNotificationModalEligibility(userId);
        if (cancelled) return;

        if (eligibility.isEligible && eligibility.cohort) {
          // Store campsite need for after notification modal dismisses
          returningUserNeedsCampsite.current = !suppressCampsite;

          trackModalEligible(eligibility.cohort);
          setNotificationCohort(eligibility.cohort);
          await recordModalShown(userId, eligibility.cohort);

          setTimeout(() => {
            if (!cancelled) {
              trackModalShown(eligibility.cohort!);
              setShowStayInLoopModal(true);
            }
          }, 300);
        } else if (!suppressCampsite) {
          // Not eligible for notification ask — skip to campsite step
          firstLoginStep.current = "campsite";
          setTimeout(() => {
            if (!cancelled) setShowCampsitePrompt(true);
          }, 300);
        } else {
          firstLoginStep.current = "done";
        }
      } catch (error) {
        console.error("[HomeScreen] First-login sequence error:", error);
        // On error, skip entirely
        firstLoginStep.current = "done";
      }
    };

    startFirstLoginSequence();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isGuest, userFlagsLoading]);

  // Show notification opt-in modal for returning users (non-first-login)
  // First-login users get this through the first-login sequence above instead
  useEffect(() => {
    // Skip if first-login sequence is handling this
    if (firstLoginStep.current !== "idle") return;
    if (returningUserChecked.current) return;
    if (userFlagsLoading) return;

    // Only proceed for authenticated non-guest users
    if (!isAuthenticated || isGuest) return;
    
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    returningUserChecked.current = true;

    let cancelled = false;

    const checkEligibility = async () => {
      try {
        const eligibility = await checkNotificationModalEligibility(userId);
        
        if (cancelled) return;

        // Pre-check campsite prompt eligibility for after notification modal
        const suppressCampsite = await shouldSuppressCampsitePrompt();

        if (eligibility.isEligible && eligibility.cohort) {
          // Store campsite need for after notification modal
          returningUserNeedsCampsite.current = !suppressCampsite;

          // Track eligibility
          trackModalEligible(eligibility.cohort);
          setNotificationCohort(eligibility.cohort);
          
          // Record that we showed the modal
          await recordModalShown(userId, eligibility.cohort);
          
          // Show modal immediately (small delay for UI stability)
          setTimeout(() => {
            if (!cancelled) {
              trackModalShown(eligibility.cohort!);
              setShowStayInLoopModal(true);
            }
          }, 300);
        } else if (!suppressCampsite) {
          // Not eligible for notifications — show campsite prompt directly
          setTimeout(() => {
            if (!cancelled) setShowCampsitePrompt(true);
          }, 300);
        }
      } catch (error) {
        console.error("[HomeScreen] Error checking notification eligibility:", error);
      }
    };

    checkEligibility();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isGuest, userFlagsLoading]);

  // Check for admin test modal on mount (admin-only, user-scoped)
  useEffect(() => {
    const checkAdminTestModal = async () => {
      const user = auth.currentUser;
      if (!user) {
        console.log("[HomeScreen] No auth user, skipping admin modal check");
        return;
      }
      
      // Use store-based currentUser for admin check (works offline)
      const isAdmin = currentUser?.role === "administrator" || 
                      currentUser?.membershipTier === "isAdmin";

      if (!isAdmin) {
        return;
      }

      try {
        const modalDoc = await getDoc(doc(db, "adminTestModals", user.uid));
        
        if (modalDoc.exists()) {
          const data = modalDoc.data();
          if (data?.isActive) {
            console.log("[HomeScreen] Showing admin test modal:", data.heading);
            setAdminTestModal({
              heading: data.heading || "Test Modal",
              body: data.body || "",
              ctaLabel: data.ctaLabel || "OK",
              ctaLink: data.ctaLink || "",
              ctaMode: data.ctaMode || "url",
            });
          }
        }
      } catch (error) {
        console.log("[HomeScreen] Error checking admin test modal:", error);
      }
    };

    checkAdminTestModal();
  }, [currentUser]);

  // Dismiss admin test modal and delete from Firestore
  const dismissAdminTestModal = async () => {
    setAdminTestModal(null);
    const user = auth.currentUser;
    if (user) {
      try {
        await deleteDoc(doc(db, "adminTestModals", user.uid));
        console.log("[HomeScreen] Admin test modal dismissed and deleted");
      } catch (error) {
        console.log("[HomeScreen] Error deleting admin test modal:", error);
      }
    }
  };

  // Check for published announcement modal (for all users)
  // Uses consolidated dismissal storage: announcement_dismissals_v1 = { [versionId]: timestamp }
  useEffect(() => {
    const DISMISSALS_KEY = "announcement_dismissals_v1";
    const MAX_ENTRIES = 75;
    const KEEP_RECENT = 25;
    const KEEP_DAYS = 180;

    const checkAnnouncementModal = async () => {
      try {
        const announcementDoc = await getDoc(doc(db, "announcements", "active"));
        if (!announcementDoc.exists()) {
          console.log("[HomeScreen] No active announcement");
          return;
        }

        const data = announcementDoc.data();
        if (!data?.isActive || !data?.versionId) {
          console.log("[HomeScreen] Announcement not active or no versionId");
          return;
        }

        // Load consolidated dismissals object
        let dismissals: Record<string, number> = {};
        const storedDismissals = await AsyncStorage.getItem(DISMISSALS_KEY);
        if (storedDismissals) {
          try {
            dismissals = JSON.parse(storedDismissals);
          } catch {
            console.log("[HomeScreen] Failed to parse dismissals, resetting");
            dismissals = {};
          }
        }

        // Migrate old-style key for this versionId if it exists
        const oldKey = `announcement_dismissed_${data.versionId}`;
        const oldValue = await AsyncStorage.getItem(oldKey);
        if (oldValue === "true" && !dismissals[data.versionId]) {
          console.log("[HomeScreen] Migrating old dismissal key:", data.versionId);
          dismissals[data.versionId] = Date.now();
          await AsyncStorage.setItem(DISMISSALS_KEY, JSON.stringify(dismissals));
          await AsyncStorage.removeItem(oldKey);
        }

        // Check if this version was dismissed
        if (dismissals[data.versionId]) {
          console.log("[HomeScreen] Announcement already dismissed:", data.versionId);
          return;
        }

        // Prune old entries to prevent unbounded growth
        const entries = Object.entries(dismissals);
        if (entries.length > KEEP_RECENT) {
          const now = Date.now();
          const cutoffTime = now - KEEP_DAYS * 24 * 60 * 60 * 1000;
          // Sort by timestamp descending
          entries.sort((a, b) => b[1] - a[1]);
          // Keep entries within KEEP_DAYS or top KEEP_RECENT, but cap at MAX_ENTRIES
          const pruned: Record<string, number> = {};
          let count = 0;
          for (const [vid, ts] of entries) {
            if (count >= MAX_ENTRIES) break;
            if (count < KEEP_RECENT || ts >= cutoffTime) {
              pruned[vid] = ts;
              count++;
            }
          }
          if (Object.keys(pruned).length < entries.length) {
            console.log("[HomeScreen] Pruned dismissals:", entries.length, "->", Object.keys(pruned).length);
            await AsyncStorage.setItem(DISMISSALS_KEY, JSON.stringify(pruned));
          }
        }

        console.log("[HomeScreen] Showing announcement modal:", data.headline);
        setAnnouncementModal({
          versionId: data.versionId,
          headline: data.headline || "Announcement",
          body: data.body || "",
          microCopy: data.microCopy || "",
          ctaText: data.ctaText || "OK",
          ctaMode: data.ctaMode || "none",
          ctaLink: data.ctaLink || "",
        });
      } catch (error) {
        console.log("[HomeScreen] Error checking announcement modal:", error);
      }
    };

    checkAnnouncementModal();
  }, []);

  // Dismiss announcement modal and mark as dismissed
  const dismissAnnouncementModal = async () => {
    const DISMISSALS_KEY = "announcement_dismissals_v1";
    if (announcementModal?.versionId) {
      // Load, update, save dismissals object
      let dismissals: Record<string, number> = {};
      const stored = await AsyncStorage.getItem(DISMISSALS_KEY);
      if (stored) {
        try {
          dismissals = JSON.parse(stored);
        } catch {
          dismissals = {};
        }
      }
      dismissals[announcementModal.versionId] = Date.now();
      await AsyncStorage.setItem(DISMISSALS_KEY, JSON.stringify(dismissals));
      console.log("[HomeScreen] Announcement dismissed:", announcementModal.versionId);
    }
    setAnnouncementModal(null);
  };

  // Check if user should see email opt-in modal
  // Show after 3rd app open if user is logged in and hasn't opted in
  useEffect(() => {
    const checkEmailOptIn = async () => {
      const user = auth.currentUser;
      if (!user || isGuest) {
        console.log("[HomeScreen] No auth user or guest, skipping email opt-in check");
        return;
      }

      try {
        // Check if already shown too recently (don't show more than once per week)
        const lastShownKey = "email_optin_last_shown";
        const lastShown = await AsyncStorage.getItem(lastShownKey);
        if (lastShown) {
          const lastShownDate = new Date(lastShown);
          const daysSinceLastShown = (Date.now() - lastShownDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceLastShown < 7) {
            console.log("[HomeScreen] Email opt-in shown recently, skipping");
            return;
          }
        }

        // Check if user already subscribed to emails
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData?.emailSubscribed === true) {
            console.log("[HomeScreen] User already subscribed to emails");
            return;
          }
        }

        // Check how many times app has been opened
        const openCountKey = "app_open_count";
        const currentCountStr = await AsyncStorage.getItem(openCountKey);
        const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
        const newCount = currentCount + 1;
        await AsyncStorage.setItem(openCountKey, String(newCount));

        // Show opt-in modal on 3rd app open (or later, if not dismissed permanently)
        if (newCount >= 3) {
          // Check if permanently dismissed
          const dismissedKey = "email_optin_dismissed_permanently";
          const dismissed = await AsyncStorage.getItem(dismissedKey);
          if (dismissed === "true") {
            console.log("[HomeScreen] Email opt-in permanently dismissed");
            return;
          }

          console.log("[HomeScreen] Showing email opt-in modal");
          // Small delay to let other modals settle
          setTimeout(() => {
            // Block during first-login sequence (ref is always current)
            if (firstLoginStep.current === "notifications" || firstLoginStep.current === "campsite") {
              console.log("[HomeScreen] Email opt-in deferred — first-login sequence in progress");
              return;
            }
            // Only show if no other modals are active
            if (!adminTestModal && !announcementModal && !showAccountModal) {
              setShowEmailOptIn(true);
              AsyncStorage.setItem(lastShownKey, new Date().toISOString());
            }
          }, 1500);
        }
      } catch (error) {
        console.log("[HomeScreen] Error checking email opt-in:", error);
      }
    };

    checkEmailOptIn();
  }, [isGuest, adminTestModal, announcementModal, showAccountModal]);

  // Session soft upsell nudge — once per session, after other modals settle
  useEffect(() => {
    // Only check once per component mount; session flag prevents re-show anyway
    if (sessionNudgeChecked.current) return;
    if (!isAuthenticated || isGuest) return;
    if (!UPSELL_MODALS_ENABLED || !PAYWALL_ENABLED) return;

    sessionNudgeChecked.current = true;

    const timer = setTimeout(() => {
      // Block during first-login sequence (ref is always current, avoids stale closures)
      if (firstLoginStep.current === "notifications" || firstLoginStep.current === "campsite") {
        return;
      }
      // Don't stack on top of other active modals
      if (
        showStayInLoopModal ||
        adminTestModal ||
        announcementModal ||
        showEmailOptIn ||
        showAccountModal ||
        showModal ||
        showCampsitePrompt
      ) {
        return;
      }

      if (canShowSessionNudge()) {
        markSessionUpsellShown();
        trackUpsellModalViewed("learning_complete"); // reuse closest analytics type for session browse
        setShowSessionNudge(true);
      }
    }, 5000); // 5s delay to let other modals settle

    return () => clearTimeout(timer);
  }, [isAuthenticated, isGuest, canShowSessionNudge, markSessionUpsellShown,
      showStayInLoopModal, adminTestModal, announcementModal, showEmailOptIn, showAccountModal, showModal, showCampsitePrompt]);

  // Fetch a random featured photo on screen focus
  useFocusEffect(
    useCallback(() => {
      const fetchRandomPhoto = async () => {
        try {
          setPhotoLoading(true);
          // Fetch recent photos (limit 50 to get a good pool)
          const result = await getPhotoPosts(undefined, 50);
          if (result.posts.length > 0) {
            // Pick a random photo from the pool
            const randomIndex = Math.floor(Math.random() * result.posts.length);
            const selectedPhoto = result.posts[randomIndex];
            setFeaturedPhoto(selectedPhoto);
            
            // Fetch author's handle if not stored on the photo
            if (!selectedPhoto.userHandle && selectedPhoto.userId) {
              try {
                const author = await getUser(selectedPhoto.userId);
                if (author?.handle) {
                  setFeaturedPhotoHandle(author.handle);
                }
              } catch (err) {
                console.log("Could not fetch featured photo author handle:", err);
              }
            } else {
              setFeaturedPhotoHandle(null);
            }
          }
        } catch (error) {
          console.error("[HomeScreen] Failed to fetch featured photo:", error);
        } finally {
          setPhotoLoading(false);
        }
      };

      fetchRandomPhoto();
    }, [])
  );

  /**
   * IMPORTANT: this was previously running in production too.
   * Keep test-user auto-creation strictly DEV-only so it never pollutes real users.
   */
  useEffect(() => {
    if (!__DEV__) return;

    const existing = useUserStore.getState().currentUser;
    // eslint-disable-next-line no-console
    console.log("🔍 [HomeScreen] Current User:", JSON.stringify(existing, null, 2));

    if (!existing) {
      // eslint-disable-next-line no-console
      console.log("⚠️ [HomeScreen] No user found, creating test user");
      setCurrentUser(createTestUser("administrator"));
    } else {
      // eslint-disable-next-line no-console
      console.log("✅ [HomeScreen] User exists:", {
        id: existing.id,
        displayName: existing.displayName,
        handle: existing.handle,
        membershipTier: existing.membershipTier,
      });
    }
  }, [setCurrentUser]);

  // Get daily tip (rotates based on day of year)
  const currentTip = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return CAMPING_TIPS[dayOfYear % CAMPING_TIPS.length];
  }, []);

  // User display data - show "Camper" if not logged in, otherwise show first name or display name
  // Check Firebase auth state - if not logged in, show generic avatar and "Welcome, Camper!"
  const isLoggedIn = !!auth.currentUser;
  const userAvatarSource = isLoggedIn && currentUser?.photoURL 
    ? { uri: currentUser.photoURL } 
    : LOGOS.APP_ICON;

  // Welcome greeting and message using centralized utility
  // Uses hasSeenWelcomeHome and firstName from Firestore users collection
  const welcomeGreeting = getWelcomeTitle(hasSeenWelcomeHome, userFirstName, isLoggedIn);
  const welcomeMessage = getWelcomeSubtext(hasSeenWelcomeHome, isLoggedIn);

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log("🎯 [HomeScreen] Welcome Greeting:", welcomeGreeting);
    // eslint-disable-next-line no-console
    console.log("🎯 [HomeScreen] Welcome Message:", welcomeMessage);
    // eslint-disable-next-line no-console
    console.log("🎯 [HomeScreen] hasSeenWelcomeHome:", hasSeenWelcomeHome);
    // eslint-disable-next-line no-console
    console.log("🎯 [HomeScreen] firstName from users doc:", userFirstName);
    // Prevent “unused var” lint confusion if you re-enable sections that rely on these.
    void trips;
    void gearLists;
  }

  const bottomSpacer = 50 + Math.max(insets.bottom, 18) + 12;

  /**
   * Merge-conflict fix:
   * - Prefer the nested navigation (HomeTabs -> Connect -> Ask) if available.
   * - Fall back to QuestionsListScreen if that’s the route your navigator uses.
   */
  const navigateToAsk = () => {
    // Navigate to Connect tab with Ask sub-tab
    (navigation as any).navigate("Connect", { screen: "Ask" });
  };

  return (
    <View className="flex-1 bg-forest">
      {/* Push Permission Soft Prompt - suppressed during first-login onboarding sequence */}
      <PushPermissionPrompt suppressed={firstLoginStep.current !== "idle" && firstLoginStep.current !== "done"} />
      
      <View className="flex-1" style={{ backgroundColor: PARCHMENT_BACKGROUND }}>
        {/* Welcome Hero Image - full bleed */}
        <View style={{ height: 200 + insets.top }}>
          <ImageBackground
            source={HERO_IMAGES.WELCOME}
            style={{ flex: 1, backgroundColor: DEEP_FOREST }}
            resizeMode="cover"
            accessibilityLabel="Welcome to camping - forest scene"
          >
            {/* Gradient Overlay - covers full image including safe area */}
            <LinearGradient
              colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.6)"]}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
              }}
            />
            <View className="flex-1" style={{ paddingTop: insets.top }}>
              {/* Account Button - Top Right */}
              <AccountButtonHeader color={TEXT_ON_DARK} />

              {/* Welcome message with centered avatar above */}
              <View className="flex-1 justify-end">
                <View className="items-center px-4 pb-4" style={{ zIndex: 1 }}>
                  {/* Centered Avatar */}
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: PARCHMENT,
                      overflow: "hidden",
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 12,
                      borderWidth: 3,
                      borderColor: PARCHMENT,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 4,
                      elevation: 4,
                    }}
                  >
                    <Image source={userAvatarSource} style={{ width: 80, height: 80 }} resizeMode="cover" />
                  </View>
                  {/* Welcome Text - Centered */}
                  <Text
                    className="text-2xl text-center"
                    style={{
                      fontFamily: "Raleway_700Bold",
                      color: TEXT_ON_DARK,
                      textShadowColor: "rgba(0, 0, 0, 0.5)",
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 4,
                    }}
                  >
                    {welcomeGreeting}
                  </Text>
                  <Text
                    className="mt-1 text-center"
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      color: TEXT_ON_DARK,
                      textShadowColor: "rgba(0, 0, 0, 0.5)",
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 3,
                    }}
                  >
                    {welcomeMessage}
                  </Text>
                </View>
              </View>
            </View>
          </ImageBackground>
        </View>

        <ScrollView
          className="flex-1 px-4 pt-4"
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ paddingBottom: bottomSpacer }}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Actions */}
          <View className="mb-6">
            <SectionTitle className="mb-4" color={DEEP_FOREST} style={{ fontSize: 18 }}>
              Get camp-ready
            </SectionTitle>

            <View className="space-y-3">
              {/* Trip Plans */}
              <Pressable
                className="rounded-xl active:scale-95"
                style={{ backgroundColor: "#59625C", paddingVertical: 14, borderRadius: 10 }}
                onPress={() => {
                  safeHaptic();
                  // Gate: GUEST needs account to view trip data
                  if (isGuest) {
                    setAccountModalTriggerKey("trip_plans_quick_action");
                    setShowAccountModal(true);
                    return;
                  }
                  setActivePlanTab("trips");
                  navigation.navigate("Plan");
                }}
                accessibilityLabel="Trip Plans"
                accessibilityRole="button"
              >
                <View className="flex-row items-center justify-between px-4">
                  <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={24} color="#FFFFFF" />
                    <Text
                      className="ml-3"
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 15,
                        textTransform: "uppercase",
                        letterSpacing: 0.08,
                        textAlign: "center",
                        color: "#FFFFFF",
                      }}
                    >
                      Trip Plans
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                </View>
              </Pressable>

              {/* Weather Forecast */}
              <Pressable
                className="rounded-xl active:scale-95"
                style={{ backgroundColor: "#8A8165", paddingVertical: 14, borderRadius: 10 }}
                onPress={() => {
                  safeHaptic();
                  setActivePlanTab("weather");
                  navigation.navigate("Plan");
                }}
                accessibilityLabel="Weather Forecast"
                accessibilityRole="button"
              >
                <View className="flex-row items-center justify-between px-4">
                  <View className="flex-row items-center">
                    <Ionicons name="cloud-outline" size={24} color="#FFFFFF" />
                    <Text
                      className="ml-3"
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 15,
                        textTransform: "uppercase",
                        letterSpacing: 0.08,
                        textAlign: "center",
                        color: "#FFFFFF",
                      }}
                    >
                      Weather Forecast
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                </View>
              </Pressable>

              {/* Ask a Camper */}
              <Pressable
                className="rounded-xl active:scale-95"
                style={{ backgroundColor: "#5A635C", paddingVertical: 14, borderRadius: 10 }}
                onPress={() => {
                  safeHaptic();
                  navigateToAsk();
                }}
                accessibilityLabel="Ask a Camper"
                accessibilityRole="button"
              >
                <View className="flex-row items-center justify-between px-4">
                  <View className="flex-row items-center">
                    <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFFFFF" />
                    <Text
                      className="ml-3"
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 15,
                        textTransform: "uppercase",
                        letterSpacing: 0.08,
                        textAlign: "center",
                        color: "#FFFFFF",
                      }}
                    >
                      Ask a Camper
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                </View>
              </Pressable>

              {/* My Gear Closet */}
              <Pressable
                className="rounded-xl active:scale-95"
                style={{ backgroundColor: "#6B5B4F", paddingVertical: 14, borderRadius: 10 }}
                onPress={() => {
                  safeHaptic();
                  // Gate: GUEST needs account for personal data
                  if (isGuest) {
                    setAccountModalTriggerKey("gear_closet_quick_action");
                    setShowAccountModal(true);
                    return;
                  }
                  navigation.navigate("MyGearCloset");
                }}
                accessibilityLabel="My Gear Closet"
                accessibilityRole="button"
              >
                <View className="flex-row items-center justify-between px-4">
                  <View className="flex-row items-center">
                    <Ionicons name="cube-outline" size={24} color="#FFFFFF" />
                    <Text
                      className="ml-3"
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 15,
                        textTransform: "uppercase",
                        letterSpacing: 0.08,
                        textAlign: "center",
                        color: "#FFFFFF",
                      }}
                    >
                      My Gear Closet
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                </View>
              </Pressable>

              {/* My Campground */}
              <Pressable
                className="rounded-xl active:scale-95"
                style={{ backgroundColor: "#4A6B5D", paddingVertical: 14, borderRadius: 10 }}
                onPress={async () => {
                  safeHaptic();
                  // Gate: GUEST needs account for personal data
                  if (isGuest) {
                    setAccountModalTriggerKey("my_campground_quick_action");
                    setShowAccountModal(true);
                    return;
                  }
                  // Logged-in users go directly to MyCampground
                  navigation.navigate("MyCampground");
                }}
                accessibilityLabel="My Campground"
                accessibilityRole="button"
              >
                <View className="flex-row items-center justify-between px-4">
                  <View className="flex-row items-center">
                    <Ionicons name="bonfire-outline" size={24} color="#FFFFFF" />
                    <Text
                      className="ml-3"
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 15,
                        textTransform: "uppercase",
                        letterSpacing: 0.08,
                        textAlign: "center",
                        color: "#FFFFFF",
                      }}
                    >
                      My Campground
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                </View>
              </Pressable>
            </View>
          </View>

          {/* Evergreen Upgrade Card — logged-in free non-admin users only */}
          {isAuthenticated && !isGuest && !isPro
            && currentUser?.role !== "administrator"
            && currentUser?.membershipTier !== "isAdmin" && (
            <View
              className="mb-6 rounded-xl overflow-hidden"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderWidth: 1,
                borderColor: EARTH_GREEN,
              }}
            >
              <View className="p-5">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="sparkles" size={20} color={EARTH_GREEN} />
                  <Text
                    className="ml-2"
                    style={{
                      fontFamily: "Raleway_700Bold",
                      fontSize: 17,
                      color: TEXT_PRIMARY_STRONG,
                    }}
                  >
                    Unlock the full experience
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 14,
                    color: TEXT_SECONDARY,
                    lineHeight: 20,
                    marginBottom: 14,
                  }}
                >
                  Get unlimited trips, smarter planning tools, and more ways to stay organized.
                </Text>
                <Pressable
                  onPress={() => {
                    safeHaptic();
                    navigation.navigate("Paywall" as any, { triggerKey: "home_upgrade_card" });
                  }}
                  className="rounded-lg active:opacity-85"
                  style={{
                    backgroundColor: EARTH_GREEN,
                    paddingVertical: 12,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 15,
                      color: "#FFFFFF",
                    }}
                  >
                    See plans
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Featured Community Photo */}
          <View className="mb-6">
            <SectionTitle className="mb-4" color={DEEP_FOREST} style={{ fontSize: 18 }}>
              Featured Community Photo
            </SectionTitle>

            <Pressable
              onPress={() => {
                if (featuredPhoto) {
                  safeHaptic();
                  navigation.navigate("PhotoDetail", { photoId: featuredPhoto.id });
                }
              }}
              className="rounded-xl overflow-hidden active:opacity-90"
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderWidth: 1, borderColor: BORDER_SOFT }}
              disabled={!featuredPhoto}
            >
              {photoLoading ? (
                <View className="h-48 items-center justify-center">
                  <ActivityIndicator size="small" color={EARTH_GREEN} />
                </View>
              ) : featuredPhoto && featuredPhoto.photoUrls?.[0] ? (
                <View>
                  <Image
                    source={{ uri: featuredPhoto.photoUrls[0] }}
                    style={{ width: "100%", height: 200 }}
                    resizeMode="cover"
                  />
                  <View className="p-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        {featuredPhoto.caption && (
                          <Text
                            numberOfLines={2}
                            style={{
                              fontFamily: "SourceSans3_400Regular",
                              fontSize: 14,
                              color: TEXT_PRIMARY_STRONG,
                            }}
                          >
                            {featuredPhoto.caption}
                          </Text>
                        )}
                        <View className="flex-row items-center mt-1">
                          <Text
                            style={{
                              fontFamily: "SourceSans3_500Medium",
                              fontSize: 12,
                              color: TEXT_SECONDARY,
                            }}
                          >
                            by{" "}
                          </Text>
                          {featuredPhoto.userId && (featuredPhoto.userHandle || featuredPhotoHandle) ? (
                            <HandleLink 
                              handle={featuredPhoto.userHandle || featuredPhotoHandle || ""}
                              userId={featuredPhoto.userId}
                              style={{ fontFamily: "SourceSans3_500Medium", fontSize: 12 }}
                            />
                          ) : (
                            <Text
                              style={{
                                fontFamily: "SourceSans3_500Medium",
                                fontSize: 12,
                                color: TEXT_SECONDARY,
                              }}
                            >
                              @{getConnectDisplayHandle(featuredPhoto.userHandle || featuredPhotoHandle || featuredPhoto.displayName, featuredPhoto.userId)}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View className="flex-row items-center ml-3">
                        <Ionicons name="camera-outline" size={16} color={EARTH_GREEN} />
                        <Text
                          className="ml-1"
                          style={{
                            fontFamily: "SourceSans3_600SemiBold",
                            fontSize: 12,
                            color: EARTH_GREEN,
                          }}
                        >
                          View
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="h-48 items-center justify-center p-4">
                  <Ionicons name="images-outline" size={40} color={TEXT_SECONDARY} />
                  <Text
                    className="mt-2 text-center"
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 15,
                      color: TEXT_SECONDARY,
                    }}
                  >
                    No photos yet
                  </Text>
                  <Text
                    className="mt-1 text-center"
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 14,
                      color: TEXT_SECONDARY,
                    }}
                  >
                    {"This space is waiting for its first good camp photo."}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Daily Tip Banner */}
          <View className="rounded-xl p-4 mb-6 border" style={{ backgroundColor: "#C2B9A5", borderColor: BORDER_SOFT }}>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Ionicons name="bulb" size={20} color={GRANITE_GOLD} />
                <BodyTextMedium className="ml-2" color={TEXT_PRIMARY_STRONG}>
                  Field note
                </BodyTextMedium>
              </View>
            </View>
            <BodyText className="leading-5" color={TEXT_PRIMARY_STRONG}>
              {currentTip}
            </BodyText>
          </View>
        </ScrollView>
      </View>

      {/* Admin Test Modal (for Communications screen testing) */}
      {adminTestModal && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-start",
            alignItems: "center",
            paddingTop: insets.top + 24,
            paddingBottom: 8,
            paddingHorizontal: "2.5%",
            zIndex: 9999,
            elevation: 9999,
          }}
        >
          <ScrollView
            style={{
              width: "100%",
              maxHeight: "100%",
            }}
            contentContainerStyle={{
              flexGrow: 0,
            }}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            <View
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderRadius: 16,
                padding: 24,
                width: "100%",
                borderWidth: 1,
                borderColor: BORDER_SOFT,
                position: "relative",
              }}
            >
              {/* X Close Button */}
              <Pressable
                onPress={dismissAdminTestModal}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: BORDER_SOFT,
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1,
                }}
              >
                <Ionicons name="close" size={20} color={TEXT_SECONDARY} />
              </Pressable>

              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: EARTH_GREEN + "20",
                  alignItems: "center",
                  justifyContent: "center",
                  alignSelf: "center",
                  marginBottom: 16,
                  marginTop: 8,
                }}
              >
                <Ionicons name="megaphone" size={24} color={EARTH_GREEN} />
              </View>
              <Text
                style={{
                  fontFamily: "Raleway_700Bold",
                  fontSize: 20,
                  color: TEXT_PRIMARY_STRONG,
                  textAlign: "center",
                  marginBottom: 12,
                }}
              >
                {adminTestModal.heading}
              </Text>
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 15,
                  color: TEXT_SECONDARY,
                  textAlign: "center",
                  marginBottom: 20,
                  lineHeight: 22,
                }}
              >
                {adminTestModal.body}
              </Text>
              <View
                style={{
                  backgroundColor: "#FFF3CD",
                  padding: 8,
                  borderRadius: 6,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 11,
                    color: "#856404",
                    textAlign: "center",
                  }}
                >
                  ⚠️ ADMIN TEST MODAL
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  const shouldOpenPaywall = adminTestModal.ctaMode === "subscription";
                  const ctaLink = adminTestModal.ctaLink;
                  dismissAdminTestModal();
                  if (shouldOpenPaywall) {
                    navigation.navigate("Paywall" as any, { triggerKey: "admin_test_modal" });
                  } else if (ctaLink) {
                    // Strip URL scheme prefix to get screen name
                    const stripped = ctaLink.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "").replace(/^\/+/, "").replace(/\/+$/, "");
                    if (stripped && !ctaLink.startsWith("http")) {
                      try {
                        navigation.navigate(stripped as any);
                      } catch (e) {
                        console.log("[HomeScreen] CTA navigation failed:", e);
                      }
                    } else if (ctaLink.startsWith("http")) {
                      Linking.openURL(ctaLink);
                    }
                  }
                }}
                style={{
                  backgroundColor: DEEP_FOREST,
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 15,
                    color: "#FFFFFF",
                  }}
                >
                  {adminTestModal.ctaLabel || "Dismiss"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Published Announcement Modal (for all users) */}
      {announcementModal && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-start",
            alignItems: "center",
            paddingTop: insets.top + 24,
            paddingBottom: 8,
            paddingHorizontal: "2.5%",
            zIndex: 9999,
            elevation: 9999,
          }}
        >
          <ScrollView
            style={{ width: "100%", maxHeight: "100%" }}
            contentContainerStyle={{ flexGrow: 0 }}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            <View
              style={{
                backgroundColor: PARCHMENT,
                borderRadius: 16,
                padding: 24,
                width: "100%",
                borderWidth: 1,
                borderColor: BORDER_SOFT,
                position: "relative",
              }}
            >
              {/* X Close Button */}
              <Pressable
                onPress={dismissAnnouncementModal}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: BORDER_SOFT,
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1,
                }}
              >
                <Ionicons name="close" size={20} color={TEXT_SECONDARY} />
              </Pressable>

              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: EARTH_GREEN + "20",
                  alignItems: "center",
                  justifyContent: "center",
                  alignSelf: "center",
                  marginBottom: 16,
                  marginTop: 8,
                }}
              >
                <Ionicons name="megaphone" size={24} color={EARTH_GREEN} />
              </View>
              <Text
                style={{
                  fontFamily: "Raleway_700Bold",
                  fontSize: 20,
                  color: TEXT_PRIMARY_STRONG,
                  textAlign: "center",
                  marginBottom: 12,
                }}
              >
                {announcementModal.headline}
              </Text>
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 15,
                  color: TEXT_SECONDARY,
                  textAlign: "center",
                  marginBottom: announcementModal.microCopy ? 12 : 20,
                  lineHeight: 22,
                }}
              >
                {announcementModal.body}
              </Text>
              {announcementModal.microCopy ? (
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 12,
                    color: TEXT_SECONDARY,
                    textAlign: "center",
                    marginBottom: 20,
                    opacity: 0.7,
                  }}
                >
                  {announcementModal.microCopy}
                </Text>
              ) : null}
              {announcementModal.ctaMode !== "none" && (
                <Pressable
                  onPress={() => {
                    const shouldOpenPaywall = announcementModal.ctaMode === "subscription";
                    const ctaLink = announcementModal.ctaLink;
                    dismissAnnouncementModal();
                    if (shouldOpenPaywall) {
                      navigation.navigate("Paywall" as any, { triggerKey: "announcement_modal" });
                    } else if (announcementModal.ctaMode === "url" && ctaLink) {
                      // Strip URL scheme prefix to get screen name for in-app deep links
                      const stripped = ctaLink.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "").replace(/^\/+/, "").replace(/\/+$/, "");
                      if (stripped && !ctaLink.startsWith("http")) {
                        try {
                          navigation.navigate(stripped as any);
                        } catch (e) {
                          console.log("[HomeScreen] Announcement CTA navigation failed:", e);
                        }
                      } else if (ctaLink.startsWith("http")) {
                        Linking.openURL(ctaLink);
                      }
                    }
                  }}
                  style={{
                    backgroundColor: DEEP_FOREST,
                    paddingVertical: 14,
                    borderRadius: 10,
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 15,
                      color: "#FFFFFF",
                    }}
                  >
                    {announcementModal.ctaText}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={dismissAnnouncementModal}
                style={{
                  paddingVertical: 10,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 14,
                    color: TEXT_SECONDARY,
                  }}
                >
                  Dismiss
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Email Opt-In Modal */}
      <EmailOptInModal
        visible={showEmailOptIn}
        onClose={() => setShowEmailOptIn(false)}
        onOptInComplete={() => {
          console.log("[HomeScreen] Email opt-in completed");
        }}
      />

      {/* Account Required Modal for Quick Actions */}
      <AccountRequiredModal
        visible={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onCreateAccount={() => {
          setShowAccountModal(false);
          navigation.navigate("Auth");
        }}
        onMaybeLater={() => setShowAccountModal(false)}
        triggerKey={accountModalTriggerKey}
      />

      {/* Onboarding Modal — suppressed during first-login sequence to avoid collision */}
      <OnboardingModal
        visible={showModal && firstLoginStep.current === "idle"}
        tooltip={currentTooltip}
        onDismiss={dismissModal}
      />

      {/* Stay in the Loop Modal - shown once after first login */}
      <StayInLoopModal
        visible={showStayInLoopModal}
        onDismiss={() => {
          setShowStayInLoopModal(false);
          // Show campsite prompt if user hasn't customized their profile yet
          if (firstLoginStep.current === "notifications" || returningUserNeedsCampsite.current) {
            if (returningUserNeedsCampsite.current) {
              returningUserNeedsCampsite.current = false;
              firstLoginStep.current = "campsite";
              setTimeout(() => setShowCampsitePrompt(true), 300);
            } else {
              firstLoginStep.current = "done";
            }
          }
        }}
        cohort={notificationCohort}
      />

      {/* First-Login Step 2: My Campsite Setup Prompt */}
      <Modal
        visible={showCampsitePrompt}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCampsitePrompt(false);
          firstLoginStep.current = "done";
          setCampsiteSetupPromptSeen();
        }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
          <View
            style={{
              backgroundColor: CARD_BACKGROUND_LIGHT,
              borderRadius: 20,
              padding: 28,
              marginHorizontal: 32,
              maxWidth: 360,
              width: "100%",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: EARTH_GREEN + "20",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="person-circle-outline" size={26} color={EARTH_GREEN} />
            </View>
            <Text
              style={{
                fontFamily: "Raleway_700Bold",
                fontSize: 20,
                color: TEXT_PRIMARY_STRONG,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {"Set up My Campsite"}
            </Text>
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 15,
                color: TEXT_SECONDARY,
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              {"Add your name, handle, and a few details so people can recognize you, and so your camping profile feels like yours from the start."}
            </Text>
            <Pressable
              onPress={() => {
                safeHaptic();
                setShowCampsitePrompt(false);
                firstLoginStep.current = "done";
                setCampsiteSetupPromptSeen();
                navigation.navigate("MyCampsite" as any);
              }}
              style={{
                backgroundColor: DEEP_FOREST,
                paddingVertical: 14,
                borderRadius: 10,
                alignItems: "center",
                width: "100%",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 15,
                  color: "#FFFFFF",
                }}
              >
                {"Set Up My Campsite"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setShowCampsitePrompt(false);
                firstLoginStep.current = "done";
                setCampsiteSetupPromptSeen();
              }}
              style={{ paddingVertical: 10, alignItems: "center" }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 14,
                  color: TEXT_SECONDARY,
                }}
              >
                {"Maybe Later"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Session Soft Upsell Nudge - once per session for eligible free users */}
      <UpsellModal
        visible={showSessionNudge}
        title={UPSELL_COPY.session_browse.title}
        body={UPSELL_COPY.session_browse.body}
        primaryCtaText={UPSELL_COPY.session_browse.primaryCta}
        secondaryCtaText={UPSELL_COPY.session_browse.secondaryCta}
        finePrint={UPSELL_COPY.session_browse.finePrint}
        onPrimaryPress={() => {
          setShowSessionNudge(false);
          trackUpsellCtaClicked("learning_complete");
          navigation.navigate("Paywall" as any, { triggerKey: "session_browse_nudge" });
        }}
        onSecondaryPress={() => {
          setShowSessionNudge(false);
          recordUpsellDismissal();
          trackUpsellModalDismissed("learning_complete");
        }}
        onDismiss={() => {
          setShowSessionNudge(false);
          recordUpsellDismissal();
          trackUpsellModalDismissed("learning_complete");
        }}
      />
    </View>
  );
}