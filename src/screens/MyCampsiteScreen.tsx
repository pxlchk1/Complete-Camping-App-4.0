/**
 * My Campsite Screen - Social-style profile
 * Backed by Firestore profiles collection
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ImageBackground,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useFocusEffect, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { auth, db } from "../config/firebase";
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { restorePurchases, syncSubscriptionToFirestore } from "../services/subscriptionService";
import { listenToFavoriteParks, removeFavoritePark, FavoritePark } from "../services/favoriteParksService";
import { listenToSavedPlaces, removeSavedPlace, SavedPlace } from "../services/savedPlacesService";
import { useUserStatus } from "../utils/authHelper";
import { useIsModerator, useIsAdministrator } from "../state/userStore";
import { HERO_IMAGES } from "../constants/images";
import AccountRequiredModal from "../components/AccountRequiredModal";
import OnboardingModal from "../components/OnboardingModal";
import { useScreenOnboarding } from "../hooks/useScreenOnboarding";
import { bootstrapNewAccount } from "../onboarding";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  BORDER_SOFT,
  RUST,
} from "../constants/colors";
import { PrefillLocation, RootStackParamList } from "../navigation/types";

type MembershipTier = "free" | "freeMember" | "subscribed" | "weekendCamper" | "trailLeader" | "backcountryGuide" | "isAdmin" | "isModerator";

type ProfileStats = {
  tripsCount: number;
  tipsCount: number;
  gearReviewsCount: number;
  questionsCount: number;
  photosCount: number;
};

type MeritBadge = {
  id: string;
  name: string;
  icon: string;
  color: string;
  earnedAt?: any;
};

type UserProfile = {
  displayName: string;
  handle: string; // Stored WITHOUT "@"
  email: string;
  avatarUrl: string | null;
  backgroundUrl: string | null;
  membershipTier: MembershipTier;
  bio: string | null;
  about?: string | null;
  location: string | null;
  campingStyle: string | null;
  favoriteCampingStyle?: string;
  favoriteGear?: Record<string, string>;
  joinedAt: any;
  stats?: ProfileStats;
  meritBadges?: MeritBadge[]; // Dynamic merit badges from Firestore
  isProfileContentPublic?: boolean; // Default true - whether content below header is public
};

type ActivityTab = "photos" | "connect";

// Type for user's recent photos
type UserPhoto = {
  id: string;
  imageUrl: string;
  createdAt: any;
};

// Type for user's recent Connect contributions
type ConnectContribution = {
  id: string;
  type: "tip" | "review" | "question" | "answer";
  title: string;
  createdAt: any;
};

const COVER_HEIGHT = 260;
const PROFILE_SIZE = 120;

export default function MyCampsiteScreen({ navigation }: any) {
  const route = useRoute<RouteProp<RootStackParamList, "MyCampsite">>();
  const viewingUserId = route.params?.userId;
  const viewAsPublic = route.params?.viewAsPublic || false;
  const isViewingOtherUser = !!viewingUserId && viewingUserId !== auth.currentUser?.uid;
  // When viewing as public (preview mode), treat it like viewing another user
  const shouldHidePrivateContent = isViewingOtherUser || viewAsPublic;
  
  const { isGuest } = useUserStatus();
  const isModerator = useIsModerator();
  const isAdministrator = useIsAdministrator();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActivityTab>("photos");
  const [restoring, setRestoring] = useState(false);
  const [favoriteParks, setFavoriteParks] = useState<FavoritePark[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [savedPlacesLoading, setSavedPlacesLoading] = useState(true);
  const [showBadgesInfo, setShowBadgesInfo] = useState(false);
  const [userPhotos, setUserPhotos] = useState<UserPhoto[]>([]);
  const [userPhotosLoading, setUserPhotosLoading] = useState(true);
  const [connectContributions, setConnectContributions] = useState<ConnectContribution[]>([]);
  const [connectLoading, setConnectLoading] = useState(true);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const insets = useSafeAreaInsets();

  // Onboarding modal
  const { showModal, currentTooltip, dismissModal, openModal } = useScreenOnboarding("MyCampsite");

  const loadProfile = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const profileRef = doc(db, "profiles", userId);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const data = profileSnap.data() as UserProfile;

        // Normalize handle - remove any "@" prefix if it exists
        const normalizedHandle = data.handle?.replace(/^@+/, "") || "";

        setProfile({
          ...data,
          handle: normalizedHandle,
        });

        // Compute stats if not present
        if (!data.stats) {
          await computeAndSaveStats(userId);
        }
      } else {
        // Create default profile
        await createDefaultProfile(userId);
      }
    } catch (error) {
      console.error("[MyCampsite] Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user's latest 9 photos
  const loadUserPhotos = useCallback(async (userId: string) => {
    try {
      setUserPhotosLoading(true);
      const photos: UserPhoto[] = [];
      console.log("[MyCampsite] Loading photos for userId:", userId);
      
      // Get photos from photoPosts collection
      const photoPostsQuery = query(
        collection(db, "photoPosts"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(9)
      );
      const photoPostsSnap = await getDocs(photoPostsQuery);
      console.log("[MyCampsite] Found photoPosts:", photoPostsSnap.size);
      photoPostsSnap.forEach((doc) => {
        const data = doc.data();
        const imageUrl = data.photoUrls?.[0] || data.imageUrl;
        if (imageUrl) {
          photos.push({
            id: doc.id,
            imageUrl,
            createdAt: data.createdAt,
          });
        }
      });
      
      // If we don't have 9 yet, also check stories collection (legacy)
      if (photos.length < 9) {
        const storiesQuery = query(
          collection(db, "stories"),
          where("userId", "==", userId),
          orderBy("createdAt", "desc"),
          limit(9 - photos.length)
        );
        const storiesSnap = await getDocs(storiesQuery);
        console.log("[MyCampsite] Found stories:", storiesSnap.size);
        storiesSnap.forEach((doc) => {
          const data = doc.data();
          if (data.imageUrl) {
            photos.push({
              id: doc.id,
              imageUrl: data.imageUrl,
              createdAt: data.createdAt,
            });
          }
        });
      }
      
      // Sort by createdAt and take first 9
      photos.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return bTime - aTime;
      });
      
      console.log("[MyCampsite] Total photos loaded:", photos.length);
      setUserPhotos(photos.slice(0, 9));
    } catch (error) {
      console.error("[MyCampsite] Error loading user photos:", error);
      setUserPhotos([]);
    } finally {
      setUserPhotosLoading(false);
    }
  }, []);

  // Load user's latest 9 Connect contributions (tips, reviews, questions, answers)
  const loadConnectContributions = useCallback(async (userId: string) => {
    try {
      setConnectLoading(true);
      const contributions: ConnectContribution[] = [];
      console.log("[MyCampsite] Loading contributions for userId:", userId);
      
      // Get tips
      const tipsQuery = query(
        collection(db, "tips"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(9)
      );
      const tipsSnap = await getDocs(tipsQuery);
      console.log("[MyCampsite] Found tips:", tipsSnap.size);
      tipsSnap.forEach((doc) => {
        const data = doc.data();
        contributions.push({
          id: doc.id,
          type: "tip",
          title: data.title || data.description?.substring(0, 50) || "Tip",
          createdAt: data.createdAt,
        });
      });
      
      // Get gear reviews
      const reviewsQuery = query(
        collection(db, "gearReviews"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(9)
      );
      const reviewsSnap = await getDocs(reviewsQuery);
      console.log("[MyCampsite] Found gearReviews:", reviewsSnap.size);
      reviewsSnap.forEach((doc) => {
        const data = doc.data();
        contributions.push({
          id: doc.id,
          type: "review",
          title: data.gearName || data.title || "Gear Review",
          createdAt: data.createdAt,
        });
      });
      
      // Get questions - check both authorId and userId fields since different services use different fields
      try {
        const questionsQuery1 = query(
          collection(db, "questions"),
          where("authorId", "==", userId),
          orderBy("createdAt", "desc"),
          limit(9)
        );
        const questionsSnap1 = await getDocs(questionsQuery1);
        console.log("[MyCampsite] Found questions (authorId):", questionsSnap1.size);
        questionsSnap1.forEach((doc) => {
          const data = doc.data();
          contributions.push({
            id: doc.id,
            type: "question",
            title: data.title || data.question || data.body?.substring(0, 50) || "Question",
            createdAt: data.createdAt,
          });
        });
      } catch (e) {
        console.log("[MyCampsite] authorId questions query failed, trying userId");
      }
      
      // Also try userId field for legacy questions
      try {
        const questionsQuery2 = query(
          collection(db, "questions"),
          where("userId", "==", userId),
          orderBy("createdAt", "desc"),
          limit(9)
        );
        const questionsSnap2 = await getDocs(questionsQuery2);
        console.log("[MyCampsite] Found questions (userId):", questionsSnap2.size);
        questionsSnap2.forEach((doc) => {
          const data = doc.data();
          // Only add if not already added (avoid duplicates)
          if (!contributions.some(c => c.id === doc.id)) {
            contributions.push({
              id: doc.id,
              type: "question",
              title: data.title || data.question || data.body?.substring(0, 50) || "Question",
              createdAt: data.createdAt,
            });
          }
        });
      } catch (e) {
        console.log("[MyCampsite] userId questions query failed");
      }
      
      // Get answers
      const answersQuery = query(
        collection(db, "answers"),
        where("authorId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(9)
      );
      const answersSnap = await getDocs(answersQuery);
      console.log("[MyCampsite] Found answers:", answersSnap.size);
      answersSnap.forEach((doc) => {
        const data = doc.data();
        contributions.push({
          id: doc.id,
          type: "answer",
          title: data.body?.substring(0, 50) || "Answer",
          createdAt: data.createdAt,
        });
      });
      
      // Sort all by createdAt and take first 9
      contributions.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return bTime - aTime;
      });
      
      console.log("[MyCampsite] Total contributions:", contributions.length);
      
      setConnectContributions(contributions.slice(0, 9));
    } catch (error) {
      console.error("[MyCampsite] Error loading Connect contributions:", error);
      setConnectContributions([]);
    } finally {
      setConnectLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // If viewing another user's profile, use their ID
      const targetUserId = viewingUserId || auth.currentUser?.uid;
      
      if (!targetUserId) {
        // Guest trying to view their own profile - show account required modal
        setLoading(false);
        setShowAccountModal(true);
        return;
      }

      loadProfile(targetUserId);
      
      // Load user photos and Connect contributions
      loadUserPhotos(targetUserId);
      loadConnectContributions(targetUserId);
      
      // Only load favorites and saved places for the current user's own profile
      if (!isViewingOtherUser) {
        // Listen to favorite parks
        setFavoritesLoading(true);
        const unsubscribeFavorites = listenToFavoriteParks(targetUserId, (favorites) => {
          setFavoriteParks(favorites);
          setFavoritesLoading(false);
        });

        // Listen to saved places
        setSavedPlacesLoading(true);
        const unsubscribeSavedPlaces = listenToSavedPlaces(targetUserId, (places) => {
          setSavedPlaces(places);
          setSavedPlacesLoading(false);
        });
        
        return () => {
          unsubscribeFavorites();
          unsubscribeSavedPlaces();
        };
      } else {
        // For other users, don't show favorites/saved places
        setFavoritesLoading(false);
        setSavedPlacesLoading(false);
        setFavoriteParks([]);
        setSavedPlaces([]);
      }
    }, [navigation, loadProfile, loadUserPhotos, loadConnectContributions, viewingUserId, isViewingOtherUser, isGuest])
  );

  const createDefaultProfile = async (userId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    // Derive handle from email prefix
    const emailPrefix = user.email?.split("@")[0] || "camper";
    const handle = emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, "");

    try {
      // Use protected onboarding layer for account creation
      const result = await bootstrapNewAccount({
        userId: userId,
        email: user.email || "",
        displayName: user.displayName || "Happy Camper",
        handle: handle,
        photoURL: user.photoURL,
      });

      if (!result.success) {
        console.error("[MyCampsite] Bootstrap failed:", result.error, result.debugInfo);
        return;
      }

      // Set the profile state for UI after successful creation
      const defaultProfile: UserProfile = {
        displayName: user.displayName || "Happy Camper",
        handle: handle,
        email: user.email || "",
        avatarUrl: user.photoURL || null,
        backgroundUrl: null,
        // Note: membershipTier is derived from absence of subscription fields
        // Free users don't have the field set - app logic treats absence as "free"
        membershipTier: "free",
        bio: null,
        location: null,
        campingStyle: null,
        joinedAt: serverTimestamp(),
        stats: {
          tripsCount: 0,
          tipsCount: 0,
          gearReviewsCount: 0,
          questionsCount: 0,
          photosCount: 0,
        },
      };

      setProfile(defaultProfile);
      console.log("[MyCampsite] Profile created successfully via onboarding layer");
    } catch (error) {
      console.error("[MyCampsite] Error creating profile:", error);
    }
  };

  const computeAndSaveStats = async (userId: string) => {
    try {
      // Count trips
      const tripsQuery = query(collection(db, "trips"), where("userId", "==", userId));
      const tripsSnap = await getDocs(tripsQuery);
      const tripsCount = tripsSnap.size;

      // Count tips
      const tipsQuery = query(collection(db, "tips"), where("userId", "==", userId));
      const tipsSnap = await getDocs(tipsQuery);
      const tipsCount = tipsSnap.size;

      // Count gear reviews
      const gearQuery = query(collection(db, "gearReviews"), where("userId", "==", userId));
      const gearSnap = await getDocs(gearQuery);
      const gearReviewsCount = gearSnap.size;

      // Count questions
      const questionsQuery = query(collection(db, "questions"), where("authorId", "==", userId));
      const questionsSnap = await getDocs(questionsQuery);
      const questionsCount = questionsSnap.size;

      // Count photos from both legacy stories and new photoPosts collections
      const storiesQuery = query(collection(db, "stories"), where("userId", "==", userId));
      const storiesSnap = await getDocs(storiesQuery);
      const photoPostsQuery = query(collection(db, "photoPosts"), where("userId", "==", userId));
      const photoPostsSnap = await getDocs(photoPostsQuery);
      const photosCount = storiesSnap.size + photoPostsSnap.size;

      const stats: ProfileStats = {
        tripsCount,
        tipsCount,
        gearReviewsCount,
        questionsCount,
        photosCount,
      };

      // Update profile with stats
      await setDoc(doc(db, "profiles", userId), { stats }, { merge: true });

      // Update local state
      setProfile((prev) => (prev ? { ...prev, stats } : null));
    } catch (error) {
      console.error("[MyCampsite] Error computing stats:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      if (navigation && navigation.reset) {
        navigation.reset({
          index: 0,
          routes: [{ name: "HomeTabs" }],
        });
      }
    } catch (error) {
      console.error("[MyCampsite] Error signing out:", error);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setRestoring(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const restored = await restorePurchases();

      if (restored) {
        await syncSubscriptionToFirestore();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Purchases Restored",
          "Your subscription has been restored successfully."
        );
      } else {
        Alert.alert(
          "No Purchases Found",
          "No active subscriptions were found for your account."
        );
      }
    } catch (error: any) {
      console.error("[MyCampsite] Restore error:", error);
      Alert.alert(
        "Restore Failed",
        "Unable to restore purchases. Please try again or contact support."
      );
    } finally {
      setRestoring(false);
    }
  };

  const getMembershipLabel = (tier: MembershipTier): string => {
    // Use the profile's membershipTier to determine badge (not the viewer's status)
    // Only profiles with isAdmin in Firebase show "Admin"
    if (tier === "isAdmin") return "Admin";
    if (tier === "isModerator") return "Moderator";
    switch (tier) {
      case "subscribed":
      case "weekendCamper":
      case "trailLeader":
      case "backcountryGuide":
        return "Pro Account";
      default:
        return "Free Account";
    }
  };

  // Handler for "Plan a trip" from Favorite Parks
  const handlePlanFromFavorite = (fav: FavoritePark) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Gate: Login required to create trips
    if (isGuest || !auth.currentUser) {
      navigation.navigate("Auth");
      return;
    }

    const prefillLocation: PrefillLocation = {
      source: "favorites",
      placeType: "park",
      placeId: fav.parkId,
      name: fav.name,
      subtitle: [fav.type, fav.state].filter(Boolean).join(" • "),
      state: fav.state || null,
      address: null,
      lat: null,
      lng: null,
    };

    navigation.navigate("CreateTrip", { prefillLocation });
  };

  // Handler for "Plan a trip" from Saved Places
  const handlePlanFromSavedPlace = (place: SavedPlace) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Gate: Login required to create trips
    if (isGuest || !auth.currentUser) {
      navigation.navigate("Auth");
      return;
    }

    const prefillLocation: PrefillLocation = {
      source: "saved_places",
      placeType: place.placeType === "campground" ? "campground" : 
                 place.placeType === "park" ? "park" : "custom",
      placeId: place.placeId,
      name: place.name,
      subtitle: place.address || null,
      state: null,
      address: place.address || null,
      lat: place.lat || null,
      lng: place.lon || null,
    };

    navigation.navigate("CreateTrip", { prefillLocation });
  };

  const getMembershipBadgeColor = (tier: MembershipTier): string => {
    // Use the profile's membershipTier to determine badge color (not the viewer's status)
    if (tier === "isAdmin") return "#dc2626"; // Red for admin
    if (tier === "isModerator") return "#2563eb"; // Blue for moderator
    switch (tier) {
      case "subscribed":
      case "weekendCamper":
      case "trailLeader":
      case "backcountryGuide":
        return GRANITE_GOLD; // Gold for all Pro tiers
      default:
        return EARTH_GREEN; // Green for free accounts
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: PARCHMENT }}>
        <ActivityIndicator size="large" color={DEEP_FOREST} />
        <Text
          className="mt-4"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
        >
          Loading your campsite...
        </Text>
      </View>
    );
  }

  // Guest viewing their own My Campsite tab - show account required modal
  if (showAccountModal || (!viewingUserId && !auth.currentUser)) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: PARCHMENT }}>
        <View className="items-center px-6">
          <Ionicons name="person-circle-outline" size={80} color={DEEP_FOREST} />
          <Text
            className="mt-4 text-center"
            style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 20, color: TEXT_PRIMARY_STRONG }}
          >
            Your Campsite Awaits
          </Text>
          <Text
            className="mt-2 text-center"
            style={{ fontFamily: "SourceSans3_400Regular", fontSize: 16, color: TEXT_SECONDARY }}
          >
            Create an account to save your favorite parks, track trips, and build your camping profile.
          </Text>
        </View>
        <AccountRequiredModal
          visible={true}
          triggerKey="my_campsite"
          onCreateAccount={() => {
            setShowAccountModal(false);
            navigation.navigate("Auth");
          }}
          onLogIn={() => {
            setShowAccountModal(false);
            navigation.navigate("Auth");
          }}
          onMaybeLater={() => {
            setShowAccountModal(false);
            // Navigate back or to home
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("Explore" as never);
            }
          }}
        />
      </View>
    );
  }

  // When viewing another user's profile, we don't need auth.currentUser
  // Only require auth.currentUser when viewing own profile (no viewingUserId)
  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: PARCHMENT }}>
        <ActivityIndicator color={DEEP_FOREST} />
      </View>
    );
  }

  const initials = profile.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Determine if profile content should be visible
  // Content is visible if:
  // 1. Viewing own profile (not as public preview)
  // 2. Profile content is set to public (default is true)
  const isProfileContentVisible = 
    (!shouldHidePrivateContent) || 
    (profile.isProfileContentPublic !== false);

  // Use safe area bottom padding for consistent tab bar height
  const bottomSpacer = Math.max(insets.bottom || 0, 18) + 72;

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      {/* Viewing as public banner */}
      {viewAsPublic && (
        <View 
          style={{ 
            backgroundColor: EARTH_GREEN, 
            paddingTop: insets.top + 8,
            paddingBottom: 8,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View className="flex-row items-center flex-1">
            <Ionicons name="eye-outline" size={18} color={PARCHMENT} />
            <Text
              className="ml-2"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT, fontSize: 14 }}
            >
              Viewing as public
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.goBack()}
            className="px-3 py-1 rounded-full active:opacity-70"
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT, fontSize: 13 }}>
              Done
            </Text>
          </Pressable>
        </View>
      )}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero Header with Background Image */}
        <View style={{ height: COVER_HEIGHT + insets.top }}>
          <ImageBackground
            source={profile.backgroundUrl ? { uri: profile.backgroundUrl } : HERO_IMAGES.WELCOME}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          >
            {/* Gradient Overlay */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.3)",
              }}
            />

            {/* Back & Settings Buttons */}
            <View
              style={{
                paddingTop: insets.top + 8,
                paddingHorizontal: 20,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.goBack();
                }}
                className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
              >
                <Ionicons name="arrow-back" size={24} color={PARCHMENT} />
              </Pressable>

              {/* Only show edit button for own profile */}
              {!isViewingOtherUser ? (
                <View className="flex-row items-center">
                  {/* Info Button */}
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      openModal();
                    }}
                    className="w-10 h-10 rounded-full items-center justify-center active:opacity-70 mr-2"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
                  >
                    <Ionicons name="information-circle-outline" size={24} color={PARCHMENT} />
                  </Pressable>
                  {/* Edit Button */}
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      
                      // Gate: Login required to edit profile
                      if (isGuest || !auth.currentUser) {
                        navigation.navigate("Auth");
                        return;
                      }
                      
                      navigation.navigate("EditProfile");
                    }}
                    className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
                  >
                    <Ionicons name="create-outline" size={24} color={PARCHMENT} />
                  </Pressable>
                </View>
              ) : (
                <View style={{ width: 40 }} />
              )}
            </View>

            {/* Centered Avatar and User Identity */}
            <View
              style={{
                position: "absolute",
                top: 20,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 20,
              }}
            >
              {/* Avatar */}
              <View
                style={{
                  width: PROFILE_SIZE,
                  height: PROFILE_SIZE,
                  borderRadius: PROFILE_SIZE / 2,
                  borderWidth: 4,
                  borderColor: PARCHMENT,
                  backgroundColor: PARCHMENT,
                }}
              >
                {profile.avatarUrl ? (
                  <Image
                    source={{ uri: profile.avatarUrl }}
                    style={{
                      width: PROFILE_SIZE - 8,
                      height: PROFILE_SIZE - 8,
                      borderRadius: (PROFILE_SIZE - 8) / 2,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: PROFILE_SIZE - 8,
                      height: PROFILE_SIZE - 8,
                      borderRadius: (PROFILE_SIZE - 8) / 2,
                      backgroundColor: DEEP_FOREST,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "SourceSans3_700Bold",
                        fontSize: 40,
                        color: PARCHMENT,
                      }}
                    >
                      {initials}
                    </Text>
                  </View>
                )}
              </View>

              {/* User Identity */}
              <View className="items-center mt-3">
                <Text
                  className="text-3xl mb-1"
                  style={{ fontFamily: "Raleway_700Bold", color: PARCHMENT, textAlign: "center" }}
                >
                  {profile.displayName}
                </Text>
                <Text
                  className="text-base mb-2"
                  style={{ fontFamily: "SourceSans3_400Regular", color: PARCHMENT, textAlign: "center" }}
                >
                  @{profile.handle}
                </Text>
                
                {/* Membership Badge */}
                <View
                  className="rounded-full px-3 py-1"
                  style={{ backgroundColor: getMembershipBadgeColor(profile.membershipTier) }}
                >
                  <Text
                    className="text-xs"
                    style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                  >
                    {getMembershipLabel(profile.membershipTier)}
                  </Text>
                </View>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* Profile Section */}
        <View className="px-5" style={{ marginTop: 16 }}>
          {/* Merit Badges Label */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowBadgesInfo(true);
            }}
            className="flex-row items-center justify-center mb-3"
          >
            <Text
              className="text-sm mr-1"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_SECONDARY }}
            >
              Merit Badges
            </Text>
            <Ionicons name="information-circle-outline" size={16} color={TEXT_SECONDARY} />
          </Pressable>

          {/* Merit Badges Row */}
          <View className="flex-row items-start justify-center mb-4">
            {/* Merit Badges from Firebase */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
              <View className="flex-row gap-2">
                {/* Show badges from Firestore or a "No badges yet" message */}
                {profile.meritBadges && profile.meritBadges.length > 0 ? (
                  profile.meritBadges.map((badge) => (
                    <View
                      key={badge.id}
                      className="items-center"
                      style={{ width: 70 }}
                    >
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 28,
                          backgroundColor: badge.color,
                          borderWidth: 3,
                          borderColor: PARCHMENT,
                          alignItems: "center",
                          justifyContent: "center",
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.15,
                          shadowRadius: 3,
                          elevation: 3,
                        }}
                      >
                        <Ionicons name={badge.icon as any} size={28} color={PARCHMENT} />
                      </View>
                      <Text
                        className="text-center mt-1"
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 9,
                          color: TEXT_SECONDARY,
                          lineHeight: 11,
                        }}
                      >
                        {badge.name.split(' ').join('\n')}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View className="items-center px-4 py-2">
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 13,
                        color: TEXT_SECONDARY,
                        fontStyle: "italic",
                      }}
                    >
                      No badges earned yet
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>

          {/* Social Stats Row */}
          <View className="flex-row mb-4 py-3 border-y" style={{ borderColor: BORDER_SOFT }}>
            <View className="flex-1 items-center">
              <Text
                className="text-2xl"
                style={{ fontFamily: "SourceSans3_700Bold", color: TEXT_PRIMARY_STRONG }}
              >
                {profile.stats?.tripsCount || 0}
              </Text>
              <Text
                className="text-xs uppercase"
                style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
              >
                Trips
              </Text>
            </View>

            <View className="flex-1 items-center">
              <Text
                className="text-2xl"
                style={{ fontFamily: "SourceSans3_700Bold", color: TEXT_PRIMARY_STRONG }}
              >
                {profile.stats?.tipsCount || 0}
              </Text>
              <Text
                className="text-xs uppercase"
                style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
              >
                Tips
              </Text>
            </View>

            <View className="flex-1 items-center">
              <Text
                className="text-2xl"
                style={{ fontFamily: "SourceSans3_700Bold", color: TEXT_PRIMARY_STRONG }}
              >
                {profile.stats?.gearReviewsCount || 0}
              </Text>
              <Text
                className="text-xs uppercase"
                style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
              >
                Reviews
              </Text>
            </View>

            <View className="flex-1 items-center">
              <Text
                className="text-2xl"
                style={{ fontFamily: "SourceSans3_700Bold", color: TEXT_PRIMARY_STRONG }}
              >
                {profile.stats?.questionsCount || 0}
              </Text>
              <Text
                className="text-xs uppercase"
                style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
              >
                Questions
              </Text>
            </View>

            <View className="flex-1 items-center">
              <Text
                className="text-2xl"
                style={{ fontFamily: "SourceSans3_700Bold", color: TEXT_PRIMARY_STRONG }}
              >
                {profile.stats?.photosCount || 0}
              </Text>
              <Text
                className="text-xs uppercase"
                style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
              >
                Photos
              </Text>
            </View>
          </View>

          {/* Quick Links - Only show on own profile (not when viewing others or as public) */}
          {!shouldHidePrivateContent && (
            <View className="flex-row gap-3 mb-4">
              {/* My Gear Closet */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate("MyGearCloset");
                }}
                className="flex-1 p-4 rounded-xl border items-center active:opacity-70"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
              >
                <Ionicons name="bag-handle-outline" size={28} color={EARTH_GREEN} />
                <Text
                  className="mt-2 text-center"
                  style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 13, color: TEXT_PRIMARY_STRONG }}
                >
                  My Gear Closet
                </Text>
              </Pressable>

              {/* My Campground */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate("MyCampground");
                }}
                className="flex-1 p-4 rounded-xl border items-center active:opacity-70"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
              >
                <Ionicons name="people-outline" size={28} color={EARTH_GREEN} />
                <Text
                  className="mt-2 text-center"
                  style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 13, color: TEXT_PRIMARY_STRONG }}
                >
                  My Campground
                </Text>
              </Pressable>
            </View>
          )}

          {/* Admin Dashboard - Only for admins on own profile */}
          {isAdministrator && !shouldHidePrivateContent && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("AdminDashboard");
              }}
              className="mb-4 p-4 rounded-xl border active:opacity-70"
              style={{ backgroundColor: "#fef2f2", borderColor: "#dc2626" }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <Ionicons name="shield-checkmark" size={22} color="#dc2626" />
                  <Text
                    className="ml-3"
                    style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: "#dc2626" }}
                  >
                    Admin Dashboard
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#dc2626" />
              </View>
            </Pressable>
          )}

          {/* About Section */}
          <View className="mb-6 p-4 rounded-xl" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
            <Text
              className="text-lg mb-3"
              style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
            >
              About
            </Text>

            <View className="mb-3">
              {profile.about || profile.bio ? (
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 15,
                    color: TEXT_PRIMARY_STRONG,
                    lineHeight: 22,
                  }}
                >
                  {profile.about || profile.bio}
                </Text>
              ) : (
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 15,
                    color: TEXT_SECONDARY,
                    fontStyle: "italic",
                  }}
                >
                  Add a short bio so campers know you.
                </Text>
              )}
            </View>

            {profile.location && (
              <View className="flex-row items-center mb-2">
                <Ionicons name="location-outline" size={18} color={EARTH_GREEN} />
                <Text
                  className="ml-2"
                  style={{ fontFamily: "SourceSans3_400Regular", fontSize: 15, color: TEXT_PRIMARY_STRONG }}
                >
                  {profile.location}
                </Text>
              </View>
            )}

            {profile.campingStyle && (
              <View className="flex-row items-center mb-2">
                <Ionicons name="bonfire-outline" size={18} color={EARTH_GREEN} />
                <Text
                  className="ml-2"
                  style={{ fontFamily: "SourceSans3_400Regular", fontSize: 15, color: TEXT_PRIMARY_STRONG }}
                >
                  {profile.campingStyle}
                </Text>
              </View>
            )}

            {profile.favoriteCampingStyle && (
              <View className="flex-row items-center mb-2">
                <Ionicons name="compass-outline" size={18} color={EARTH_GREEN} />
                <View className="ml-2">
                  <Text
                    style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 15, color: EARTH_GREEN }}
                  >
                    Favorite Camping Style
                  </Text>
                  <Text
                    style={{ fontFamily: "SourceSans3_400Regular", fontSize: 15, color: TEXT_PRIMARY_STRONG }}
                  >
                    {profile.favoriteCampingStyle.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ')}
                  </Text>
                </View>
              </View>
            )}

            {profile.favoriteGear && Object.keys(profile.favoriteGear).length > 0 && (
              <View className="mb-2">
                <View className="flex-row items-start mb-1">
                  <Ionicons name="bag-handle-outline" size={18} color={EARTH_GREEN} style={{ marginTop: 2 }} />
                  <Text
                    className="ml-2"
                    style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 15, color: EARTH_GREEN }}
                  >
                    Favorite Gear
                  </Text>
                </View>
                <View className="ml-7">
                  {Object.entries(profile.favoriteGear)
                    .filter(([category]) => isNaN(Number(category)) && category.trim().length > 0)
                    .map(([category, details]) => (
                    <View key={category} className="mb-1">
                      <Text
                        style={{ fontFamily: "SourceSans3_400Regular", fontSize: 15, color: TEXT_PRIMARY_STRONG }}
                      >
                        <Text style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                          {category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()}:
                        </Text> {details}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* My Activity Section - only visible if profile content is public or viewing own profile */}
        {isProfileContentVisible && (
        <View className="mb-6 px-5">
            <Text
              className="text-lg mb-3"
              style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
            >
              My Activity
            </Text>

            {/* Activity Tabs */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              {(["photos", "connect"] as ActivityTab[]).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab(tab);
                  }}
                  className="mr-3 px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: activeTab === tab ? DEEP_FOREST : CARD_BACKGROUND_LIGHT,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 14,
                      color: activeTab === tab ? PARCHMENT : TEXT_SECONDARY,
                    }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Activity Content - Photos Tab */}
            {activeTab === "photos" && (
              userPhotosLoading ? (
                <View className="p-6 rounded-xl items-center" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
                  <ActivityIndicator size="small" color={EARTH_GREEN} />
                  <Text
                    className="mt-2"
                    style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY }}
                  >
                    Loading photos...
                  </Text>
                </View>
              ) : userPhotos.length === 0 ? (
                <View className="p-6 rounded-xl items-center" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
                  <Ionicons name="images-outline" size={40} color={EARTH_GREEN} />
                  <Text
                    className="mt-3"
                    style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 15, color: TEXT_PRIMARY_STRONG }}
                  >
                    No photos yet
                  </Text>
                  <Text
                    className="mt-1 text-center"
                    style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY }}
                  >
                    Your photos will appear here
                  </Text>
                </View>
              ) : (
                <View className="rounded-xl overflow-hidden" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
                  {/* 3x3 Photo Grid */}
                  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                    {userPhotos.map((photo, index) => (
                      <Pressable
                        key={photo.id}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          navigation.navigate("PhotoDetail", { photoId: photo.id });
                        }}
                        style={{
                          width: "33.33%",
                          aspectRatio: 1,
                          padding: 1,
                        }}
                      >
                        <Image
                          source={{ uri: photo.imageUrl }}
                          style={{ width: "100%", height: "100%", backgroundColor: BORDER_SOFT }}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>
              )
            )}

            {/* Activity Content - Connect Tab */}
            {activeTab === "connect" && (
              connectLoading ? (
                <View className="p-6 rounded-xl items-center" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
                  <ActivityIndicator size="small" color={EARTH_GREEN} />
                  <Text
                    className="mt-2"
                    style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY }}
                  >
                    Loading contributions...
                  </Text>
                </View>
              ) : connectContributions.length === 0 ? (
                <View className="p-6 rounded-xl items-center" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
                  <Ionicons name="chatbubbles-outline" size={40} color={EARTH_GREEN} />
                  <Text
                    className="mt-3"
                    style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 15, color: TEXT_PRIMARY_STRONG }}
                  >
                    No contributions yet
                  </Text>
                  <Text
                    className="mt-1 text-center"
                    style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY }}
                  >
                    Your tips, reviews, and questions will appear here
                  </Text>
                </View>
              ) : (
                <View className="rounded-xl overflow-hidden" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
                  {connectContributions.map((contribution, index) => (
                    <Pressable
                      key={`${contribution.type}-${contribution.id}`}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        // Navigate to appropriate screen based on type
                        if (contribution.type === "question") {
                          navigation.navigate("QuestionDetail", { questionId: contribution.id });
                        } else if (contribution.type === "review") {
                          navigation.navigate("GearReviewDetail", { reviewId: contribution.id });
                        } else if (contribution.type === "tip") {
                          navigation.navigate("TipDetail", { tipId: contribution.id });
                        }
                        // Answers don't have their own detail screen
                      }}
                      className="flex-row items-center px-4 py-3"
                      style={{
                        borderBottomWidth: index < connectContributions.length - 1 ? 1 : 0,
                        borderBottomColor: BORDER_SOFT,
                      }}
                    >
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center mr-3"
                        style={{
                          backgroundColor: 
                            contribution.type === "tip" ? "#dcfce7" :
                            contribution.type === "review" ? "#fef3c7" :
                            contribution.type === "question" ? "#dbeafe" :
                            "#f3e8ff",
                        }}
                      >
                        <Ionicons
                          name={
                            contribution.type === "tip" ? "bulb-outline" :
                            contribution.type === "review" ? "star-outline" :
                            contribution.type === "question" ? "help-circle-outline" :
                            "chatbubble-outline"
                          }
                          size={16}
                          color={
                            contribution.type === "tip" ? "#16a34a" :
                            contribution.type === "review" ? "#d97706" :
                            contribution.type === "question" ? "#2563eb" :
                            "#9333ea"
                          }
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          numberOfLines={1}
                          style={{
                            fontFamily: "SourceSans3_600SemiBold",
                            fontSize: 14,
                            color: TEXT_PRIMARY_STRONG,
                          }}
                        >
                          {contribution.title}
                        </Text>
                        <Text
                          style={{
                            fontFamily: "SourceSans3_400Regular",
                            fontSize: 12,
                            color: TEXT_SECONDARY,
                            textTransform: "capitalize",
                          }}
                        >
                          {contribution.type === "review" ? "Gear Review" : contribution.type}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={TEXT_SECONDARY} />
                    </Pressable>
                  ))}
                </View>
              )
            )}
        </View>
        )}

        {/* Favorite Parks Section - only visible when viewing own profile (never public) */}
        {!shouldHidePrivateContent && (
        <View className="mb-6 px-5">
          <Text
            className="text-lg mb-3"
            style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
          >
            Favorite Parks
          </Text>

          {favoritesLoading ? (
            <View className="p-6 rounded-xl items-center" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
              <ActivityIndicator size="small" color={EARTH_GREEN} />
              <Text
                className="mt-2"
                style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY }}
              >
                Loading favorites...
              </Text>
            </View>
          ) : favoriteParks.length === 0 ? (
            <View className="p-6 rounded-xl items-center" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
              <Ionicons name="heart-outline" size={40} color={RUST} />
              <Text
                className="mt-3"
                style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 15, color: TEXT_PRIMARY_STRONG }}
              >
                No favorites yet
              </Text>
              <Text
                className="mt-1 text-center px-4"
                style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY }}
              >
                Save parks you love so they show up here.
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate("HomeTabs", { screen: "Plan" });
                }}
                className="mt-4 px-5 py-2 rounded-full"
                style={{ backgroundColor: EARTH_GREEN }}
              >
                <Text
                  style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: PARCHMENT }}
                >
                  Browse Parks
                </Text>
              </Pressable>
            </View>
          ) : (
            <View>
              {favoriteParks.map((fav) => (
                <Pressable
                  key={fav.parkId}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    // Navigate to Plan tab with Parks selected and park ID
                    navigation.navigate("MainTabs", {
                      screen: "Plan",
                      params: {
                        screen: "MyTrips",
                        params: {
                          initialTab: "parks",
                          selectedParkId: fav.parkId,
                        },
                      },
                    });
                  }}
                  className="p-4 rounded-xl border mb-3 active:opacity-90"
                  style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 mr-3">
                      <Text
                        className="text-base mb-1"
                        style={{ fontFamily: "Raleway_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                        numberOfLines={2}
                      >
                        {fav.name}
                      </Text>
                      <View className="flex-row items-center">
                        <Text
                          className="text-sm"
                          style={{ fontFamily: "SourceSans3_500Medium", color: TEXT_SECONDARY }}
                        >
                          {fav.type}
                        </Text>
                        {fav.state && (
                          <>
                            <Text className="mx-1" style={{ color: TEXT_SECONDARY }}>•</Text>
                            <Text
                              className="text-sm"
                              style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                            >
                              {fav.state}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      {/* Plan a trip button */}
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handlePlanFromFavorite(fav);
                        }}
                        className="w-9 h-9 rounded-full items-center justify-center active:opacity-70"
                        style={{ backgroundColor: "#f0f9f4" }}
                        accessibilityLabel="Plan a trip here"
                      >
                        <Ionicons name="calendar-outline" size={18} color={EARTH_GREEN} />
                      </Pressable>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          Alert.alert(
                            "Remove from Favorites?",
                            `Remove ${fav.name} from your favorites?`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Remove",
                                style: "destructive",
                                onPress: async () => {
                                  const userId = auth.currentUser?.uid;
                                  if (!userId) return;
                                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                  await removeFavoritePark(userId, fav.parkId);
                                },
                              },
                            ]
                          );
                        }}
                        className="w-9 h-9 rounded-full items-center justify-center active:opacity-70"
                        style={{ backgroundColor: "#fff5f5" }}
                        accessibilityLabel="Remove from favorites"
                      >
                        <Ionicons name="heart" size={20} color={RUST} />
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        )}

        {/* Parks I've Added Section - only visible when viewing own profile (never public) */}
        {!shouldHidePrivateContent && (
        <View className="mb-6 px-5">
          <Text
            className="text-lg mb-3"
            style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
          >
            Parks I've added
          </Text>

          {savedPlacesLoading ? (
            <View className="p-6 rounded-xl items-center" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
              <ActivityIndicator size="small" color={EARTH_GREEN} />
              <Text
                className="mt-2"
                style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY }}
              >
                Loading parks...
              </Text>
            </View>
          ) : savedPlaces.length === 0 ? (
            <View className="p-6 rounded-xl items-center" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
              <Ionicons name="location-outline" size={40} color={EARTH_GREEN} />
              <Text
                className="mt-3"
                style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 15, color: TEXT_PRIMARY_STRONG }}
              >
                No parks added yet
              </Text>
              <Text
                className="mt-1 text-center px-4"
                style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY }}
              >
                Add your own campgrounds from Plan &gt; Parks.
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate("HomeTabs", { screen: "Plan" });
                }}
                className="mt-4 px-5 py-2 rounded-full"
                style={{ backgroundColor: EARTH_GREEN }}
              >
                <Text
                  style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: PARCHMENT }}
                >
                  Browse Parks
                </Text>
              </Pressable>
            </View>
          ) : (
            <View>
              {savedPlaces.map((place) => (
                <Pressable
                  key={place.placeId}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    // Could navigate to place detail if available
                  }}
                  className="p-4 rounded-xl border mb-3 active:opacity-90"
                  style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 mr-3">
                      <Text
                        className="text-base mb-1"
                        style={{ fontFamily: "Raleway_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                        numberOfLines={2}
                      >
                        {place.name}
                      </Text>
                      <View className="flex-row items-center">
                        <Text
                          className="text-sm"
                          style={{ fontFamily: "SourceSans3_500Medium", color: TEXT_SECONDARY }}
                        >
                          {place.placeType === "campground" ? "Campground" : 
                           place.placeType === "park" ? "Park" : 
                           place.placeType === "trailhead" ? "Trailhead" : "Other"}
                        </Text>
                        {place.address && (
                          <>
                            <Text className="mx-1" style={{ color: TEXT_SECONDARY }}>•</Text>
                            <Text
                              className="text-sm flex-1"
                              style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                              numberOfLines={1}
                            >
                              {place.address}
                            </Text>
                          </>
                        )}
                      </View>
                      {place.notes && (
                        <Text
                          className="text-sm mt-1"
                          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, fontStyle: "italic" }}
                          numberOfLines={2}
                        >
                          {place.notes}
                        </Text>
                      )}
                    </View>
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      {/* Plan a trip button */}
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handlePlanFromSavedPlace(place);
                        }}
                        className="w-9 h-9 rounded-full items-center justify-center active:opacity-70"
                        style={{ backgroundColor: "#f0f9f4" }}
                        accessibilityLabel="Plan a trip here"
                      >
                        <Ionicons name="calendar-outline" size={18} color={EARTH_GREEN} />
                      </Pressable>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          Alert.alert(
                            "Remove Park?",
                            `Remove ${place.name} from your saved parks?`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Remove",
                                style: "destructive",
                                onPress: async () => {
                                  const userId = auth.currentUser?.uid;
                                  if (!userId) return;
                                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                  await removeSavedPlace(userId, place.placeId);
                                },
                              },
                            ]
                          );
                        }}
                        className="w-9 h-9 rounded-full items-center justify-center active:opacity-70"
                        style={{ backgroundColor: "#f0f9f4" }}
                        accessibilityLabel="Remove park"
                      >
                        <Ionicons name="location" size={20} color={EARTH_GREEN} />
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        )}

        {/* Account Actions - only show on own profile (not when viewing others) */}
        {!shouldHidePrivateContent && (
        <View className="px-5">
          {/* Restore Purchases Button */}
          <Pressable
            onPress={handleRestorePurchases}
            disabled={restoring}
            className="mb-4 py-4 rounded-xl border-2 active:opacity-70"
            style={{ borderColor: EARTH_GREEN, backgroundColor: CARD_BACKGROUND_LIGHT }}
          >
            <View className="flex-row items-center justify-center">
              {restoring ? (
                <ActivityIndicator size="small" color={EARTH_GREEN} />
              ) : (
                <>
                  <Ionicons name="reload-circle-outline" size={24} color={EARTH_GREEN} />
                  <Text
                    className="ml-2"
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 16,
                      color: TEXT_PRIMARY_STRONG,
                    }}
                  >
                    Restore Purchases
                  </Text>
                </>
              )}
            </View>
          </Pressable>

          {/* Sign Out Button */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleSignOut();
            }}
            className="mb-6 py-3 rounded-lg active:opacity-90"
            style={{ backgroundColor: "#dc2626" }}
          >
            <Text
              className="text-center"
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 16,
                color: PARCHMENT,
              }}
            >
              Sign Out
            </Text>
          </Pressable>
        </View>
        )}

        {/* Private Profile Message - shown when viewing other user's private profile */}
        {shouldHidePrivateContent && !isProfileContentVisible && (
          <View className="mb-6 px-5">
            <View 
              className="p-6 rounded-xl items-center" 
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
            >
              <Ionicons name="lock-closed-outline" size={40} color={TEXT_MUTED} />
              <Text
                className="mt-3 text-center"
                style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 15, color: TEXT_PRIMARY_STRONG }}
              >
                This profile is private
              </Text>
              <Text
                className="mt-1 text-center"
                style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY }}
              >
                The user has chosen to keep their activity and content private.
              </Text>
            </View>
          </View>
        )}

        {/* Bottom Spacer for Tab Bar */}
        <View style={{ height: bottomSpacer }} />
      </ScrollView>

      {/* Merit Badges Info Modal */}
      <Modal
        visible={showBadgesInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBadgesInfo(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-4"
          onPress={() => setShowBadgesInfo(false)}
        >
          <Pressable
            className="rounded-2xl w-full max-w-sm overflow-hidden"
            style={{ backgroundColor: PARCHMENT }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header - Deep Forest Green background */}
            <View
              style={{
                paddingTop: 24,
                paddingHorizontal: 20,
                paddingBottom: 16,
                backgroundColor: DEEP_FOREST,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text
                  style={{ fontFamily: "Raleway_700Bold", fontSize: 22, color: PARCHMENT, flex: 1, marginRight: 12 }}
                >
                  Merit Badges
                </Text>
                <Pressable
                  onPress={() => setShowBadgesInfo(false)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={20} color={PARCHMENT} />
                </Pressable>
              </View>
            </View>

            <View style={{ padding: 20 }}>
              <Text
                className="text-center mb-4"
                style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, lineHeight: 22 }}
              >
                Earn merit badges by camping, sharing tips, reviewing gear, and helping fellow campers. The more you contribute, the more badges you unlock!
              </Text>

              <View className="mb-4 p-3 rounded-xl" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
                <View className="flex-row items-center mb-2">
                  <Ionicons name="bonfire" size={20} color="#92AFB1" />
                  <Text className="ml-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
                    Weekend Camper
                  </Text>
                </View>
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_SECONDARY }}>
                  Complete your first camping trip
                </Text>
              </View>

              <View className="mb-4 p-3 rounded-xl" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
                <View className="flex-row items-center mb-2">
                  <Ionicons name="compass" size={20} color="#AC9A6D" />
                  <Text className="ml-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
                    Trail Leader
                  </Text>
                </View>
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_SECONDARY }}>
                  Share 5 tips with the community
                </Text>
              </View>

              <View className="mb-4 p-3 rounded-xl" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
                <View className="flex-row items-center mb-2">
                  <Ionicons name="navigate" size={20} color="#485952" />
                  <Text className="ml-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
                    Backcountry Guide
                  </Text>
                </View>
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_SECONDARY }}>
                  Complete 10 trips and write 3 gear reviews
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowBadgesInfo(false);
                }}
                className="rounded-xl py-3 active:opacity-90"
                style={{ backgroundColor: DEEP_FOREST }}
              >
                <Text
                  className="text-center"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                >
                  Got it
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Onboarding Modal */}
      <OnboardingModal
        visible={showModal}
        tooltip={currentTooltip}
        onDismiss={dismissModal}
      />
    </View>
  );
}
