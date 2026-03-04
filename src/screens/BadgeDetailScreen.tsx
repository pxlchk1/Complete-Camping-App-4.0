/**
 * BadgeDetailScreen
 * 
 * Shows badge details, requirements, and earning actions.
 * Layout: Large Badge → Title → Description → Requirements → CTA
 * 
 * NEW FLOW (photo-first):
 * 1. ALL badges require a photo to submit
 * 2. SOME badges also require witness approval
 * 
 * CTA states:
 * - No photo: "Add Photo"
 * - Photo exists, no witness needed: "Submit Proof"
 * - Photo exists, witness needed: "Choose Witness"
 * - Submitted, pending: "Awaiting Approval"
 * - Approved: "Completed on MM.DD.YYYY"
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
  updateUserBadge,
  updateBadgeClaim,
  uploadBadgePhoto,
  deleteBadgePhoto,
} from "../services/meritBadgesService";
import { resolveBadgeImage, deriveImageKey } from "../assets/images/merit_badges/resolveBadgeImage";
import {
  BadgeDefinition,
  UserBadge,
  BadgeClaim,
  BadgeDisplayState,
} from "../types/badges";
import { doesBadgeRequireWitness, getWitnessRequirementReason } from "../config/badgeWitnessRequirements";
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

type BadgeDetailScreenRouteProp = RouteProp<RootStackParamList, "BadgeDetail">;
type BadgeDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BadgeDetailScreen() {
  const navigation = useNavigation<BadgeDetailNavigationProp>();
  const route = useRoute<BadgeDetailScreenRouteProp>();
  const { badgeId } = route.params;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [badge, setBadge] = useState<BadgeDefinition | null>(null);
  const [earnedBadge, setEarnedBadge] = useState<UserBadge | null>(null);
  const [pendingClaim, setPendingClaim] = useState<BadgeClaim | null>(null);
  const [displayState, setDisplayState] = useState<BadgeDisplayState>("not_started");
  const [actionLoading, setActionLoading] = useState(false);
  
  // Local photo state for unsubmitted photos
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  
  // Error modal state
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);

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
      console.error("[BadgeDetailScreen] Error loading badge:", error);
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
      // Clear local photo on focus if already submitted
      if (pendingClaim?.photoUrl || earnedBadge?.photoUrl) {
        setLocalPhotoUrl(null);
      }
    }, [loadData, pendingClaim?.photoUrl, earnedBadge?.photoUrl])
  );

  // Check if this badge requires witness approval (using centralized config)
  const requiresWitness = badge ? doesBadgeRequireWitness(badge.id) : false;

  // Handler: Add/Replace Photo
  const handleAddPhoto = async () => {
    if (!badge) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);

    try {
      const photoUri = result.assets[0].uri;
      const user = auth.currentUser;
      if (!user) throw new Error("Not signed in");

      // Log upload attempt for debugging
      console.log("[BadgeDetailScreen] Uploading photo:", {
        userId: user.uid,
        badgeId: badge.id,
        photoUri: photoUri.substring(0, 50) + "...",
      });

      // Upload photo to Firebase Storage
      const photoUrl = await uploadBadgePhoto(user.uid, badge.id, photoUri);
      
      // Store locally until submission
      setLocalPhotoUrl(photoUrl);
      
      console.log("[BadgeDetailScreen] Photo uploaded successfully:", {
        photoUrl: photoUrl.substring(0, 50) + "...",
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error("[BadgeDetailScreen] Photo upload failed:", {
        error: error.message,
        code: error.code,
        badgeId: badge.id,
      });
      setErrorModal({
        title: "Upload Failed",
        message: error.message || "Failed to upload photo. Please try again.",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Submit Proof (for badges that don't require witness)
  const handleSubmitProof = async () => {
    if (!badge || !localPhotoUrl) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not signed in");

      // Create earned badge record directly (no witness needed)
      await createUserBadge({
        badgeId: badge.id,
        earnedVia: "PHOTO",
        photoUrl: localPhotoUrl,
      });
      
      setLocalPhotoUrl(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadData();
    } catch (error: any) {
      console.error("[BadgeDetailScreen] Submit proof failed:", {
        error: error.message,
        badgeId: badge.id,
      });
      setErrorModal({
        title: "Submission Failed",
        message: error.message || "Failed to submit proof. Please try again.",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Choose Witness (for badges that require witness)
  const handleChooseWitness = () => {
    if (!badge || !localPhotoUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Pass the photoUrl to SelectWitness screen
    navigation.navigate("SelectWitness", { badgeId: badge.id, photoUrl: localPhotoUrl });
  };

  // Handler: Delete Photo
  const handleDeletePhoto = async () => {
    // If it's a local photo (not yet submitted), just clear state
    if (localPhotoUrl && !pendingClaim?.photoUrl && !earnedBadge?.photoUrl) {
      setLocalPhotoUrl(null);
      return;
    }
    
    // Otherwise, delete from storage/database
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
      console.error("[BadgeDetailScreen] Delete photo failed:", error);
      setErrorModal({
        title: "Delete Failed",
        message: error.message || "Failed to delete photo. Please try again.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Format date as MM.DD.YYYY
  const formatCompletedDate = (date: any): string | null => {
    if (!date) {
      console.warn("[BadgeDetailScreen] Missing approvedAt/earnedAt date for badge:", badge?.id);
      return null;
    }
    
    try {
      let dateObj: Date;
      if (date.toDate && typeof date.toDate === "function") {
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        dateObj = new Date(date);
      }
      
      if (isNaN(dateObj.getTime())) {
        console.warn("[BadgeDetailScreen] Invalid date for badge:", badge?.id, date);
        return null;
      }
      
      const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
      const dd = String(dateObj.getDate()).padStart(2, "0");
      const yyyy = dateObj.getFullYear();
      return `${mm}.${dd}.${yyyy}`;
    } catch (e) {
      console.error("[BadgeDetailScreen] Date formatting error:", e);
      return null;
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: PARCHMENT, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={DEEP_FOREST} />
      </View>
    );
  }

  if (!badge) {
    return (
      <View style={{ flex: 1, backgroundColor: PARCHMENT }}>
        <ModalHeader title="Badge" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
            Badge not found
          </Text>
        </View>
      </View>
    );
  }

  const isEarned = displayState === "earned";
  const isPending = displayState === "pending_stamp";
  const isSeasonalLocked = displayState === "seasonal_locked";
  const canEarn = !isEarned && !isPending && !isSeasonalLocked;

  // Determine current photo URL (local or server)
  const currentPhotoUrl = localPhotoUrl || pendingClaim?.photoUrl || earnedBadge?.photoUrl;
  const hasPhoto = !!currentPhotoUrl;
  
  // Determine CTA state based on new photo-first flow
  const getCTAConfig = () => {
    // Already earned - no CTA needed
    if (isEarned) {
      return null;
    }
    
    // Pending witness approval - show waiting state
    if (isPending) {
      return { label: "Awaiting Approval", handler: () => {}, disabled: true };
    }
    
    // Seasonal locked - no action
    if (isSeasonalLocked) {
      return null;
    }
    
    // No photo yet - must add photo first
    if (!hasPhoto) {
      return { label: "Add Photo", handler: handleAddPhoto, icon: "camera-outline" as const };
    }
    
    // Has photo - check if witness required
    if (requiresWitness) {
      return { label: "Choose Witness", handler: handleChooseWitness, icon: "people-outline" as const };
    }
    
    // Photo exists, no witness needed - submit directly
    return { label: "Submit Proof", handler: handleSubmitProof, icon: "checkmark-circle-outline" as const };
  };

  const ctaConfig = getCTAConfig();
  const completedDate = isEarned && earnedBadge ? formatCompletedDate(earnedBadge.earnedAt) : null;

  return (
    <View style={{ flex: 1, backgroundColor: PARCHMENT }}>
      <ModalHeader
        title=""
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}
      >
        {/* Large Badge Image - NO checkmark mask overlay */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <View
            style={{
              width: 210,
              height: 210,
              borderRadius: 105,
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
              source={resolveBadgeImage(badge.imageKey || deriveImageKey(badge.iconAssetKey))}
              style={{ width: 210, height: 210, borderRadius: 105 }}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Badge Title */}
        <Text
          style={{
            fontFamily: "SourceSans3_700Bold",
            fontSize: 24,
            color: TEXT_PRIMARY_STRONG,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          {badge.name}
        </Text>

        {/* Completed Date - shown as text under title when earned */}
        {isEarned && completedDate && (
          <Text
            style={{
              fontFamily: "SourceSans3_500Medium",
              fontSize: 14,
              color: EARTH_GREEN,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            Completed on {completedDate}
          </Text>
        )}

        {/* Badge Description */}
        {badge.description && (
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 15,
              color: TEXT_SECONDARY,
              textAlign: "center",
              marginBottom: 24,
              lineHeight: 22,
            }}
          >
            {badge.description}
          </Text>
        )}

        {/* Witness Requirement Info - shown when badge requires witness */}
        {requiresWitness && !isEarned && (
          <View
            style={{
              backgroundColor: "#EEF2FF",
              borderRadius: 12,
              padding: 14,
              marginBottom: 20,
              flexDirection: "row",
              alignItems: "flex-start",
            }}
          >
            <Ionicons name="people" size={18} color="#4F46E5" style={{ marginTop: 1 }} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: "#4F46E5", marginBottom: 2 }}>
                Witness Required
              </Text>
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: "#6366F1", lineHeight: 18 }}>
                {getWitnessRequirementReason(badge.id)}
              </Text>
            </View>
          </View>
        )}

        {/* Requirements Section */}
        <View
          style={{
            backgroundColor: CARD_BACKGROUND_LIGHT,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: BORDER_SOFT,
          }}
        >
          <Text
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              fontSize: 14,
              color: TEXT_PRIMARY_STRONG,
              marginBottom: 12,
            }}
          >
            Requirements
          </Text>
          {badge.requirements.map((req, index) => (
            <View key={index} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: index < badge.requirements.length - 1 ? 8 : 0 }}>
              <Ionicons
                name={isEarned ? "checkmark-circle" : "ellipse-outline"}
                size={18}
                color={isEarned ? EARTH_GREEN : TEXT_MUTED}
                style={{ marginRight: 10, marginTop: 1 }}
              />
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 14,
                  color: TEXT_PRIMARY_STRONG,
                  flex: 1,
                  lineHeight: 20,
                }}
              >
                {req}
              </Text>
            </View>
          ))}
        </View>

        {/* Pending Status (awaiting witness approval) */}
        {isPending && (
          <View
            style={{
              backgroundColor: "#FEF3C7",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Ionicons name="time-outline" size={16} color="#92400E" />
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: "#92400E", marginLeft: 8 }}>
                Awaiting Approval
              </Text>
            </View>
            <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: "#92400E" }}>
              Your evidence has been submitted. Waiting for your witness to confirm.
            </Text>
          </View>
        )}

        {/* Photo Evidence - shown if there's a photo (local or server) */}
        {currentPhotoUrl && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: TEXT_PRIMARY_STRONG, marginBottom: 10 }}>
              Your Photo Evidence
            </Text>
            <Image
              source={{ uri: currentPhotoUrl }}
              style={{ width: "100%", height: 200, borderRadius: 12 }}
              resizeMode="cover"
            />
            {/* Only show delete for non-earned, non-pending badges */}
            {!isEarned && !isPending && (
              <Pressable
                onPress={handleDeletePhoto}
                disabled={actionLoading}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 8,
                  paddingVertical: 8,
                }}
              >
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: "#DC2626", marginLeft: 4 }}>
                  Remove Photo
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Seasonal Locked Notice */}
        {isSeasonalLocked && (
          <View
            style={{
              backgroundColor: "#F3F4F6",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="lock-closed" size={18} color={TEXT_MUTED} />
            <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY, marginLeft: 10, flex: 1 }}>
              This badge is only available during its season.
            </Text>
          </View>
        )}

        {/* Primary CTA Button */}
        {ctaConfig && (
          <Pressable
            onPress={ctaConfig.handler}
            disabled={actionLoading || ctaConfig.disabled}
            style={{
              backgroundColor: ctaConfig.disabled ? "#9CA3AF" : DEEP_FOREST,
              paddingVertical: 16,
              borderRadius: 12,
              alignItems: "center",
              opacity: actionLoading ? 0.6 : 1,
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            {actionLoading ? (
              <ActivityIndicator color={PARCHMENT} />
            ) : (
              <>
                {ctaConfig.icon && (
                  <Ionicons name={ctaConfig.icon} size={20} color={PARCHMENT} style={{ marginRight: 8 }} />
                )}
                <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: PARCHMENT }}>
                  {ctaConfig.label}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {/* Secondary action: Change photo if already has one but hasn't submitted */}
        {hasPhoto && !isEarned && !isPending && !isSeasonalLocked && (
          <Pressable
            onPress={handleAddPhoto}
            disabled={actionLoading}
            style={{
              backgroundColor: CARD_BACKGROUND_LIGHT,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              borderWidth: 1,
              borderColor: BORDER_SOFT,
              marginTop: 12,
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            <Ionicons name="camera-outline" size={18} color={TEXT_PRIMARY_STRONG} />
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 15, color: TEXT_PRIMARY_STRONG, marginLeft: 8 }}>
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
    </View>
  );
}
