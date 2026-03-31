/**
 * BadgeDetailScreen
 *
 * Clean implementation based on UX wireframes.
 * Shows badge details, requirements, photo upload, and earning actions.
 *
 * CTA Flow (photo-first):
 * 1. not_started → "Add Photo"
 * 2. has photo, no witness needed → "Submit Proof"
 * 3. has photo, witness needed → "Choose Witness"
 * 4. pending_stamp → "Awaiting Approval" (disabled)
 * 5. earned → Shows completion date
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

import { auth } from "../config/firebase";
import { RootStackParamList } from "../navigation/types";
import {
  getBadgeDefinition,
  getUserBadge,
  getClaimForBadge,
  createUserBadge,
  uploadBadgePhoto,
  deleteBadgePhoto,
  updateUserBadge,
  updateBadgeClaim,
} from "../services/meritBadgesService";
import { resolveBadgeImage, deriveImageKey } from "../assets/images/merit_badges/resolveBadgeImage";
import {
  BadgeDefinition,
  UserBadge,
  BadgeClaim,
  BadgeDisplayState,
} from "../types/badges";
import { getWitnessRequirementReason } from "../config/badgeWitnessRequirements";
import { useSubscriptionStore } from "../state/subscriptionStore";
import { useIsAdministrator } from "../state/userStore";
import UpsellModal from "../components/UpsellModal";
import { trackUpsellModalViewed, trackUpsellCtaClicked, trackUpsellModalDismissed } from "../services/analyticsService";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../constants/colors";
import ModalHeader from "../components/ModalHeader";
import ErrorModal from "../components/ErrorModal";

type RoutePropType = RouteProp<RootStackParamList, "BadgeDetail">;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

// Hero badge size from UX spec
const BADGE_HERO_SIZE = 210;

export default function BadgeDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { badgeId } = route.params;
  const insets = useSafeAreaInsets();

  // Data state
  const [loading, setLoading] = useState(true);
  const [badge, setBadge] = useState<BadgeDefinition | null>(null);
  const [earnedBadge, setEarnedBadge] = useState<UserBadge | null>(null);
  const [pendingClaim, setPendingClaim] = useState<BadgeClaim | null>(null);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const isPro = useSubscriptionStore((s) => s.isPro);
  const isAdmin = useIsAdministrator();
  const hasPremiumAccess = isPro || isAdmin;
  const [displayState, setDisplayState] = useState<BadgeDisplayState>("not_started");

  // Photo state
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Error modal
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);

  // Load badge data
  const loadData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [badgeDef, earned, claim] = await Promise.all([
        getBadgeDefinition(badgeId),
        getUserBadge(user.uid, badgeId),
        getClaimForBadge(user.uid, badgeId),
      ]);

      setBadge(badgeDef);
      setEarnedBadge(earned);
      setPendingClaim(claim);

      // Determine display state
      if (earned) {
        setDisplayState("earned");
      } else if (claim?.status === "PENDING_STAMP") {
        setDisplayState("pending_stamp");
      } else if (badgeDef?.seasonWindow) {
        const now = new Date();
        const start = new Date(badgeDef.seasonWindow.startsAt as any);
        const end = new Date(badgeDef.seasonWindow.endsAt as any);
        const isAvailable = now >= start && now <= end;

        if (badgeDef.isLimitedEdition && badgeDef.limitedYear && now.getFullYear() !== badgeDef.limitedYear) {
          setDisplayState("seasonal_locked");
        } else if (isAvailable) {
          setDisplayState("seasonal_active");
        } else {
          setDisplayState("seasonal_locked");
        }
      } else {
        setDisplayState("not_started");
      }
    } catch (error) {
      console.error("[BadgeDetailScreen] Load error:", error);
    } finally {
      setLoading(false);
    }
  }, [badgeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // Clear local photo if already submitted
      if (pendingClaim?.photoUrl || earnedBadge?.photoUrl) {
        setLocalPhotoUrl(null);
      }
    }, [loadData, pendingClaim?.photoUrl, earnedBadge?.photoUrl])
  );

  // Check if badge requires witness (use earnType from badge definition)
  const requiresWitness = badge?.earnType === "WITNESS_REQUIRED";

  // Photo picker handler
  const handleAddPhoto = async () => {
    if (!badge) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not signed in");

      const photoUrl = await uploadBadgePhoto(user.uid, badge.id, result.assets[0].uri);
      setLocalPhotoUrl(photoUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error("[BadgeDetailScreen] Photo upload error:", error);
      setErrorModal({
        title: "Upload Failed",
        message: error.message || "Failed to upload photo. Please try again.",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setActionLoading(false);
    }
  };

  // Submit proof (no witness needed)
  const handleSubmitProof = async () => {
    if (!badge || !localPhotoUrl) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not signed in");

      const newBadge = await createUserBadge({
        badgeId: badge.id,
        earnedVia: "PHOTO",
        photoUrl: localPhotoUrl,
      });

      // Update state directly to avoid loading spinner flash
      setEarnedBadge(newBadge);
      setDisplayState("earned");
      setLocalPhotoUrl(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Show upsell nudge for non-Pro users
      if (!hasPremiumAccess) {
        trackUpsellModalViewed("badge_earned");
        setShowUpsellModal(true);
      }
    } catch (error: any) {
      console.error("[BadgeDetailScreen] Submit error:", error);
      setErrorModal({
        title: "Submission Failed",
        message: error.message || "Failed to submit proof. Please try again.",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setActionLoading(false);
    }
  };

  // Choose witness (witness required)
  const handleChooseWitness = () => {
    if (!badge || !localPhotoUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("SelectWitness", { badgeId: badge.id, photoUrl: localPhotoUrl });
  };

  // Delete photo
  const handleDeletePhoto = async () => {
    // If local photo only, just clear state
    if (localPhotoUrl && !pendingClaim?.photoUrl && !earnedBadge?.photoUrl) {
      setLocalPhotoUrl(null);
      return;
    }

    setActionLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !badge) return;

      if (earnedBadge?.photoUrl) {
        await deleteBadgePhoto(user.uid, badge.id);
        await updateUserBadge(earnedBadge.id, { photoUrl: undefined });
      } else if (pendingClaim?.photoUrl) {
        await deleteBadgePhoto(user.uid, badge.id);
        await updateBadgeClaim(pendingClaim.id, { photoUrl: undefined });
      }

      setLocalPhotoUrl(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadData();
    } catch (error: any) {
      console.error("[BadgeDetailScreen] Delete error:", error);
      setErrorModal({
        title: "Delete Failed",
        message: error.message || "Failed to delete photo.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Format completion date
  const formatDate = (date: any): string | null => {
    if (!date) return null;
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      if (isNaN(d.getTime())) return null;
      return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}.${d.getFullYear()}`;
    } catch {
      return null;
    }
  };

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 bg-parchment justify-center items-center">
        <ActivityIndicator size="large" color={DEEP_FOREST} />
      </View>
    );
  }

  // Badge not found
  if (!badge) {
    return (
      <View className="flex-1 bg-parchment">
        <ModalHeader title="Badge" onBack={() => navigation.goBack()} />
        <View className="flex-1 justify-center items-center">
          <Text className="font-source-regular" style={{ color: TEXT_MUTED }}>
            Badge not found
          </Text>
        </View>
      </View>
    );
  }

  // Derived state
  const isEarned = displayState === "earned";
  const isPending = displayState === "pending_stamp";
  const isSeasonalLocked = displayState === "seasonal_locked";
  const currentPhotoUrl = localPhotoUrl || pendingClaim?.photoUrl || earnedBadge?.photoUrl;
  const hasPhoto = !!currentPhotoUrl;

  // CTA configuration
  const getCTA = () => {
    if (isEarned) return null;
    if (isPending) return { label: "Awaiting Approval", handler: () => {}, disabled: true };
    if (isSeasonalLocked) return null;
    if (!hasPhoto) return { label: "Add Photo", handler: handleAddPhoto, icon: "camera-outline" as const };
    if (requiresWitness) return { label: "Choose Witness", handler: handleChooseWitness, icon: "people-outline" as const };
    return { label: "Submit Proof", handler: handleSubmitProof, icon: "checkmark-circle-outline" as const };
  };

  const cta = getCTA();
  const completedDate = isEarned && earnedBadge ? formatDate(earnedBadge.earnedAt) : null;
  const imageKey = badge.imageKey || deriveImageKey(badge.iconAssetKey);

  return (
    <View className="flex-1 bg-parchment">
      <ModalHeader title="" onBack={() => navigation.goBack()} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 48 }}
      >
        {/* Hero Badge Image */}
        <View className="items-center mb-5">
          <View
            style={{
              width: BADGE_HERO_SIZE,
              height: BADGE_HERO_SIZE,
              borderRadius: BADGE_HERO_SIZE / 2,
              overflow: "hidden",
              backgroundColor: CARD_BACKGROUND_LIGHT,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
              elevation: 5,
            }}
          >
            <Image
              source={resolveBadgeImage(imageKey)}
              style={{ width: BADGE_HERO_SIZE, height: BADGE_HERO_SIZE, borderRadius: BADGE_HERO_SIZE / 2 }}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Badge Title */}
        <Text
          className="font-source-bold text-2xl text-center mb-2"
          style={{ color: TEXT_PRIMARY_STRONG }}
        >
          {badge.name}
        </Text>

        {/* Completed Date */}
        {isEarned && completedDate && (
          <Text
            className="font-source-medium text-sm text-center mb-4"
            style={{ color: EARTH_GREEN }}
          >
            Completed on {completedDate}
          </Text>
        )}

        {/* Description */}
        {badge.description && (
          <Text
            className="font-source-regular text-base text-center mb-6 leading-relaxed"
            style={{ color: TEXT_SECONDARY }}
          >
            {badge.description}
          </Text>
        )}

        {/* Witness Requirement Notice */}
        {requiresWitness && !isEarned && (
          <View
            className="rounded-xl p-3.5 mb-5 flex-row items-start"
            style={{ backgroundColor: "#EEF2FF" }}
          >
            <Ionicons name="people" size={18} color="#4F46E5" style={{ marginTop: 1 }} />
            <View className="ml-2.5 flex-1">
              <Text className="font-source-semibold text-sm mb-0.5" style={{ color: "#4F46E5" }}>
                Witness Required
              </Text>
              <Text className="font-source-regular text-[13px] leading-[18px]" style={{ color: "#6366F1" }}>
                {getWitnessRequirementReason(badge.id)}
              </Text>
            </View>
          </View>
        )}

        {/* Requirements Card */}
        <View
          className="rounded-xl p-4 mb-6"
          style={{
            backgroundColor: CARD_BACKGROUND_LIGHT,
            borderWidth: 1,
            borderColor: BORDER_SOFT,
          }}
        >
          <Text
            className="font-source-semibold text-sm mb-3"
            style={{ color: TEXT_PRIMARY_STRONG }}
          >
            Requirements
          </Text>
          {badge.requirements.map((req, i) => (
            <View key={i} className="flex-row items-start mb-2">
              <Ionicons
                name={isEarned ? "checkmark-circle" : "ellipse-outline"}
                size={18}
                color={isEarned ? EARTH_GREEN : TEXT_MUTED}
                style={{ marginRight: 10, marginTop: 1 }}
              />
              <Text
                className="font-source-regular text-sm flex-1 leading-5"
                style={{ color: TEXT_PRIMARY_STRONG }}
              >
                {req}
              </Text>
            </View>
          ))}
        </View>

        {/* Pending Status Banner */}
        {isPending && (
          <View className="rounded-xl p-4 mb-5" style={{ backgroundColor: "#FEF3C7" }}>
            <View className="flex-row items-center mb-1">
              <Ionicons name="time-outline" size={16} color="#92400E" />
              <Text className="font-source-semibold text-sm ml-2" style={{ color: "#92400E" }}>
                Awaiting Approval
              </Text>
            </View>
            <Text className="font-source-regular text-[13px]" style={{ color: "#92400E" }}>
              Your evidence has been submitted. Waiting for your witness to confirm.
            </Text>
          </View>
        )}

        {/* Photo Evidence Section */}
        {currentPhotoUrl && (
          <View className="mb-5">
            <Text
              className="font-source-semibold text-sm mb-2.5"
              style={{ color: TEXT_PRIMARY_STRONG }}
            >
              Your Photo Evidence
            </Text>
            <Image
              source={{ uri: currentPhotoUrl }}
              className="w-full h-[200px] rounded-xl"
              resizeMode="cover"
            />
            {/* Delete option for non-earned, non-pending */}
            {!isEarned && !isPending && (
              <Pressable
                onPress={handleDeletePhoto}
                disabled={actionLoading}
                className="flex-row items-center justify-center mt-2 py-2"
              >
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text className="font-source-regular text-[13px] ml-1" style={{ color: "#DC2626" }}>
                  Remove Photo
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Seasonal Locked Notice */}
        {isSeasonalLocked && (
          <View
            className="rounded-xl p-4 mb-5 flex-row items-center"
            style={{ backgroundColor: "#F3F4F6" }}
          >
            <Ionicons name="lock-closed" size={18} color={TEXT_MUTED} />
            <Text
              className="font-source-regular text-sm ml-2.5 flex-1"
              style={{ color: TEXT_SECONDARY }}
            >
              This badge is only available during its season.
            </Text>
          </View>
        )}

        {/* Primary CTA */}
        {cta && (
          <Pressable
            onPress={cta.handler}
            disabled={actionLoading || cta.disabled}
            className="py-4 rounded-xl items-center flex-row justify-center mt-2"
            style={{
              backgroundColor: cta.disabled ? "#9CA3AF" : DEEP_FOREST,
              opacity: actionLoading ? 0.6 : 1,
            }}
          >
            {actionLoading ? (
              <ActivityIndicator color={PARCHMENT} />
            ) : (
              <>
                {cta.icon && (
                  <Ionicons name={cta.icon} size={20} color={PARCHMENT} style={{ marginRight: 8 }} />
                )}
                <Text className="font-source-semibold text-base" style={{ color: PARCHMENT }}>
                  {cta.label}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {/* Secondary: Change Photo */}
        {hasPhoto && !isEarned && !isPending && !isSeasonalLocked && (
          <Pressable
            onPress={handleAddPhoto}
            disabled={actionLoading}
            className="py-3.5 rounded-xl items-center flex-row justify-center mt-3"
            style={{
              backgroundColor: CARD_BACKGROUND_LIGHT,
              borderWidth: 1,
              borderColor: BORDER_SOFT,
            }}
          >
            <Ionicons name="camera-outline" size={18} color={TEXT_PRIMARY_STRONG} />
            <Text
              className="font-source-semibold text-base ml-2"
              style={{ color: TEXT_PRIMARY_STRONG }}
            >
              Change Photo
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Error Modal */}
      {errorModal && (
        <ErrorModal
          visible={!!errorModal}
          title={errorModal.title}
          message={errorModal.message}
          onDismiss={() => setErrorModal(null)}
        />
      )}

      {/* Upsell Modal after badge earned */}
      <UpsellModal
        visible={showUpsellModal}
        title="Go Pro"
        body="Unlock the full camping toolkit with a 3-day free trial!"
        primaryCtaText="Start 3-Day Free Trial"
        secondaryCtaText="Maybe Later"
        finePrint="After your free trial, your annual subscription begins. Cancel anytime."
        onPrimaryPress={() => {
          trackUpsellCtaClicked("badge_earned");
          setShowUpsellModal(false);
          navigation.navigate("Paywall", { triggerKey: "badge_earned" });
        }}
        onSecondaryPress={() => {
          trackUpsellModalDismissed("badge_earned");
          setShowUpsellModal(false);
        }}
        onDismiss={() => {
          trackUpsellModalDismissed("badge_earned");
          setShowUpsellModal(false);
        }}
      />
    </View>
  );
}
