/**
 * BadgeDetailScreen
 * 
 * Shows badge details, requirements, and earning actions.
 * Handles three earn types:
 * - SELF: Mark Complete
 * - PHOTO_REQUIRED: Upload Photo
 * - WITNESS_REQUIRED: Request Stamp
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
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
} from "../services/meritBadgesService";
import {
  BadgeDefinition,
  UserBadge,
  BadgeClaim,
  BADGE_COLORS,
  BadgeDisplayState,
} from "../types/badges";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../constants/colors";
import ModalHeader from "../components/ModalHeader";

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
  const [showPhotoPrompt, setShowPhotoPrompt] = useState(false);

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
    }, [loadData])
  );

  const handleMarkComplete = async () => {
    if (!badge) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);

    try {
      await createUserBadge({
        badgeId: badge.id,
        earnedVia: "SELF",
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowPhotoPrompt(true);
      await loadData();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to mark badge complete");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadPhoto = async () => {
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

      // Upload photo
      const photoUrl = await uploadBadgePhoto(user.uid, badge.id, photoUri);

      if (badge.earnType === "PHOTO_REQUIRED" && !earnedBadge) {
        // Earn badge via photo
        await createUserBadge({
          badgeId: badge.id,
          earnedVia: "PHOTO",
          photoUrl,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (earnedBadge) {
        // Update existing badge with photo
        await updateUserBadge(earnedBadge.id, { photoUrl });
      } else if (pendingClaim) {
        // Add photo to pending claim
        await updateBadgeClaim(pendingClaim.id, { photoUrl });
      }

      await loadData();
      setShowPhotoPrompt(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to upload photo");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestStamp = () => {
    if (!badge) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("SelectWitness", { badgeId: badge.id });
  };

  const getStatusPillText = (): string => {
    switch (displayState) {
      case "earned": return "Earned";
      case "pending_stamp": return "Pending";
      case "seasonal_active": return "Seasonal Active";
      case "seasonal_locked": return "Seasonal Locked";
      case "in_progress": return "In Progress";
      default: return "Not Started";
    }
  };

  const getStatusPillColor = (): string => {
    switch (displayState) {
      case "earned": return EARTH_GREEN;
      case "pending_stamp": return "#F59E0B";
      case "seasonal_active": return "#0EA5E9";
      case "seasonal_locked": return TEXT_MUTED;
      default: return TEXT_SECONDARY;
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

  const badgeColor = BADGE_COLORS[badge.borderColorKey] || GRANITE_GOLD;
  const isEarned = displayState === "earned";
  const isPending = displayState === "pending_stamp";
  const isSeasonalLocked = displayState === "seasonal_locked";
  const canEarn = !isEarned && !isPending && !isSeasonalLocked;

  return (
    <View style={{ flex: 1, backgroundColor: PARCHMENT }}>
      <ModalHeader
        title={badge.name}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}
      >
        {/* Badge Icon */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: isEarned ? badgeColor : CARD_BACKGROUND_LIGHT,
              borderWidth: isEarned ? 0 : 3,
              borderColor: isPending ? "#F59E0B" : BORDER_SOFT,
              borderStyle: isEarned ? "solid" : "dashed",
              justifyContent: "center",
              alignItems: "center",
              shadowColor: isEarned ? "#000" : "transparent",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isEarned ? 0.2 : 0,
              shadowRadius: 6,
              elevation: isEarned ? 5 : 0,
            }}
          >
            <Ionicons
              name={badge.iconAssetKey as any || "ribbon"}
              size={56}
              color={isEarned ? PARCHMENT : TEXT_MUTED}
            />
          </View>

          {/* Limited Edition Badge */}
          {badge.isLimitedEdition && badge.limitedYear && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#7C3AED",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
                marginTop: 12,
              }}
            >
              <Ionicons name="star" size={12} color="#FFF" />
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 11, color: "#FFF", marginLeft: 4 }}>
                Limited Edition {badge.limitedYear}
              </Text>
            </View>
          )}

          {/* Status Pill */}
          <View
            style={{
              backgroundColor: `${getStatusPillColor()}20`,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              marginTop: 12,
            }}
          >
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 13,
                color: getStatusPillColor(),
              }}
            >
              {getStatusPillText()}
            </Text>
          </View>
        </View>

        {/* Earned Info */}
        {isEarned && earnedBadge && (
          <View
            style={{
              backgroundColor: `${EARTH_GREEN}15`,
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_PRIMARY_STRONG }}>
              Earned on {new Date(earnedBadge.earnedAt as any).toLocaleDateString()}
            </Text>
            {earnedBadge.witnessUserId && (
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY, marginTop: 4 }}>
                Stamped by a fellow camper
              </Text>
            )}
            {earnedBadge.photoUrl && (
              <Image
                source={{ uri: earnedBadge.photoUrl }}
                style={{ width: "100%", height: 200, borderRadius: 8, marginTop: 12 }}
                resizeMode="cover"
              />
            )}
          </View>
        )}

        {/* Pending Info */}
        {isPending && pendingClaim && (
          <View
            style={{
              backgroundColor: "#FEF3C7",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: "#92400E" }}>
              Waiting on your witness to stamp this.
            </Text>
          </View>
        )}

        {/* Seasonal Locked Info */}
        {isSeasonalLocked && (
          <View
            style={{
              backgroundColor: "#F3F4F6",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY }}>
              This badge is only available during its season.
            </Text>
          </View>
        )}

        {/* How to Earn This */}
        {!isEarned && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 16,
                color: TEXT_PRIMARY_STRONG,
                marginBottom: 12,
              }}
            >
              How to Earn This
            </Text>
            {badge.requirements.map((req, index) => (
              <View key={index} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
                <Ionicons name="checkmark-circle-outline" size={18} color={EARTH_GREEN} style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_PRIMARY_STRONG, flex: 1 }}>
                  {req}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        {canEarn && (
          <View style={{ marginTop: 8 }}>
            {badge.earnType === "SELF" && (
              <>
                <Pressable
                  onPress={handleMarkComplete}
                  disabled={actionLoading}
                  style={{
                    backgroundColor: DEEP_FOREST,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    marginBottom: 12,
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  {actionLoading ? (
                    <ActivityIndicator color={PARCHMENT} />
                  ) : (
                    <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: PARCHMENT }}>
                      Mark Complete
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={handleUploadPhoto}
                  style={{
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: BORDER_SOFT,
                  }}
                >
                  <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: TEXT_PRIMARY_STRONG }}>
                    Add a Photo
                  </Text>
                </Pressable>
              </>
            )}

            {badge.earnType === "PHOTO_REQUIRED" && (
              <>
                <Pressable
                  onPress={handleUploadPhoto}
                  disabled={actionLoading}
                  style={{
                    backgroundColor: DEEP_FOREST,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    marginBottom: 12,
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  {actionLoading ? (
                    <ActivityIndicator color={PARCHMENT} />
                  ) : (
                    <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: PARCHMENT }}>
                      Upload Photo
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={handleRequestStamp}
                  style={{
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: BORDER_SOFT,
                  }}
                >
                  <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: TEXT_PRIMARY_STRONG }}>
                    Request Stamp
                  </Text>
                </Pressable>
              </>
            )}

            {badge.earnType === "WITNESS_REQUIRED" && (
              <>
                <Pressable
                  onPress={handleRequestStamp}
                  disabled={actionLoading}
                  style={{
                    backgroundColor: DEEP_FOREST,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    marginBottom: 12,
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: PARCHMENT }}>
                    Request Stamp
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleUploadPhoto}
                  style={{
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: BORDER_SOFT,
                  }}
                >
                  <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: TEXT_PRIMARY_STRONG }}>
                    Add a Photo
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {/* Add photo to pending claim */}
        {isPending && !pendingClaim?.photoUrl && (
          <Pressable
            onPress={handleUploadPhoto}
            disabled={actionLoading}
            style={{
              backgroundColor: CARD_BACKGROUND_LIGHT,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              borderWidth: 1,
              borderColor: BORDER_SOFT,
              marginTop: 12,
            }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: TEXT_PRIMARY_STRONG }}>
              Add a Photo
            </Text>
          </Pressable>
        )}

        {/* Post-earn photo prompt */}
        {showPhotoPrompt && (
          <View
            style={{
              backgroundColor: `${EARTH_GREEN}15`,
              borderRadius: 12,
              padding: 16,
              marginTop: 20,
            }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: TEXT_PRIMARY_STRONG, marginBottom: 12 }}>
              Want to add a photo from this moment?
            </Text>
            <Pressable
              onPress={handleUploadPhoto}
              style={{
                backgroundColor: DEEP_FOREST,
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: PARCHMENT }}>
                Add Photo
              </Text>
            </Pressable>
          </View>
        )}

        {/* Add photo to earned badge */}
        {isEarned && !earnedBadge?.photoUrl && (
          <Pressable
            onPress={handleUploadPhoto}
            disabled={actionLoading}
            style={{
              backgroundColor: CARD_BACKGROUND_LIGHT,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              borderWidth: 1,
              borderColor: BORDER_SOFT,
              marginTop: 12,
            }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: TEXT_PRIMARY_STRONG }}>
              Add a Photo
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
