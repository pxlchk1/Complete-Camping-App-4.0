/**
 * WitnessRequestsScreen
 * 
 * Displays incoming badge stamp requests for the current user to approve.
 * Users can view the badge details and approve or deny the request.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { auth } from "../config/firebase";
import { RootStackParamList } from "../navigation/types";
import {
  getPendingClaimsForWitness,
  approveBadgeClaim,
  denyBadgeClaim,
  getBadgeDefinition,
} from "../services/meritBadgesService";
import { resolveBadgeImage, deriveImageKey } from "../assets/images/merit_badges/resolveBadgeImage";
import { BadgeClaim, BadgeDefinition, BADGE_COLORS } from "../types/badges";
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

type WitnessRequestsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ClaimWithBadge extends BadgeClaim {
  badge?: BadgeDefinition;
  claimantName?: string;
}

export default function WitnessRequestsScreen() {
  const navigation = useNavigation<WitnessRequestsScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  const [claims, setClaims] = useState<ClaimWithBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userId = auth.currentUser?.uid;

  useFocusEffect(
    useCallback(() => {
      loadClaims();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])
  );

  const loadClaims = async () => {
    if (!userId) return;

    if (!refreshing) {
      setLoading(true);
    }
    setError(null);

    try {
      const pendingClaims = await getPendingClaimsForWitness(userId);

      // Fetch badge details for each claim
      const claimsWithBadges: ClaimWithBadge[] = await Promise.all(
        pendingClaims.map(async (claim) => {
          try {
            const badge = await getBadgeDefinition(claim.badgeId);
            return {
              ...claim,
              badge: badge || undefined,
            };
          } catch {
            return claim;
          }
        })
      );

      setClaims(claimsWithBadges);
    } catch (err) {
      console.error("[WitnessRequests] Error loading claims:", err);
      setError("Failed to load requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadClaims();
  };

  const handleApprove = async (claimId: string) => {
    if (!userId) return;

    setProcessingId(claimId);

    try {
      await approveBadgeClaim(claimId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Remove from list
      setClaims((prev) => prev.filter((c) => c.id !== claimId));
    } catch (err) {
      console.error("[WitnessRequests] Error approving claim:", err);
      setError("Failed to approve request");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (claimId: string) => {
    if (!userId) return;

    setProcessingId(claimId);

    try {
      await denyBadgeClaim(claimId, userId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      
      // Remove from list
      setClaims((prev) => prev.filter((c) => c.id !== claimId));
    } catch (err) {
      console.error("[WitnessRequests] Error denying claim:", err);
      setError("Failed to deny request");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <ModalHeader title="Stamp Requests" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader title="Stamp Requests" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={DEEP_FOREST}
          />
        }
      >
        {/* Header Info */}
        <View className="px-4 pt-4 pb-2">
          <Text style={{ color: TEXT_SECONDARY }}>
            Fellow campers have asked you to witness and stamp their badges.
          </Text>
        </View>

        {/* Error */}
        {error && (
          <View className="mx-4 mt-2 p-3 rounded-lg" style={{ backgroundColor: "#FEE2E2" }}>
            <Text style={{ color: "#DC2626" }}>{error}</Text>
          </View>
        )}

        {/* Empty State */}
        {claims.length === 0 && (
          <View className="mx-4 mt-8 p-8 rounded-xl items-center" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: EARTH_GREEN + "20" }}
            >
              <Ionicons name="ribbon-outline" size={32} color={EARTH_GREEN} />
            </View>
            <Text className="text-lg font-medium text-center" style={{ color: TEXT_PRIMARY_STRONG }}>
              No Pending Requests
            </Text>
            <Text className="text-center mt-2" style={{ color: TEXT_SECONDARY }}>
              When campers in your network request badge stamps, they will appear here.
            </Text>
          </View>
        )}

        {/* Claims List */}
        {claims.map((claim) => {
          const isProcessing = processingId === claim.id;
          const borderColor = claim.badge?.borderColorKey
            ? BADGE_COLORS[claim.badge.borderColorKey as keyof typeof BADGE_COLORS] || EARTH_GREEN
            : EARTH_GREEN;

          return (
            <View
              key={claim.id}
              className="mx-4 mt-4 rounded-xl overflow-hidden"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderLeftWidth: 4,
                borderLeftColor: borderColor,
              }}
            >
              {/* Badge Info */}
              <Pressable
                className="p-4"
                onPress={() => navigation.navigate("BadgeDetail", { badgeId: claim.badgeId })}
              >
                <View className="flex-row items-center">
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center overflow-hidden"
                    style={{ backgroundColor: borderColor + "20" }}
                  >
                    <Image
                      source={resolveBadgeImage(claim.badge?.imageKey || deriveImageKey(claim.badge?.iconAssetKey))}
                      style={{ width: 48, height: 48, borderRadius: 24 }}
                      resizeMode="cover"
                    />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-base font-semibold" style={{ color: TEXT_PRIMARY_STRONG }}>
                      {claim.badge?.name || "Badge"}
                    </Text>
                    <Text className="text-sm" style={{ color: TEXT_SECONDARY }}>
                      Requested {formatDate(claim.createdAt)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
                </View>
              </Pressable>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: BORDER_SOFT }} />

              {/* Photo if provided */}
              {claim.photoUrl && (
                <View className="p-4">
                  <Text className="text-sm font-medium mb-2" style={{ color: TEXT_MUTED }}>
                    PHOTO EVIDENCE
                  </Text>
                  <Pressable
                    className="h-40 rounded-lg overflow-hidden"
                    style={{ backgroundColor: DEEP_FOREST + "10" }}
                  >
                    {/* Would use Image component here with claim.photoUrl */}
                    <View className="flex-1 items-center justify-center">
                      <Ionicons name="image-outline" size={32} color={TEXT_MUTED} />
                      <Text className="text-sm mt-2" style={{ color: TEXT_MUTED }}>
                        Tap to view photo
                      </Text>
                    </View>
                  </Pressable>
                </View>
              )}

              {/* Actions */}
              <View className="flex-row p-4 pt-2">
                <Pressable
                  className="flex-1 py-3 rounded-lg mr-2 items-center"
                  style={{
                    backgroundColor: BORDER_SOFT,
                  }}
                  onPress={() => handleDeny(claim.id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={TEXT_SECONDARY} />
                  ) : (
                    <Text className="font-medium" style={{ color: TEXT_SECONDARY }}>
                      Not Yet
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  className="flex-1 py-3 rounded-lg ml-2 items-center"
                  style={{
                    backgroundColor: EARTH_GREEN,
                  }}
                  onPress={() => handleApprove(claim.id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={PARCHMENT} />
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name="checkmark-circle" size={18} color={PARCHMENT} />
                      <Text className="font-medium ml-1" style={{ color: PARCHMENT }}>
                        Stamp It
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
