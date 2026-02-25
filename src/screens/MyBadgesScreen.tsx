/**
 * MyBadgesScreen
 * 
 * Displays a user's earned merit badges in a grid layout.
 * Shows badge details with earned date and method.
 * Accessible from "View All" on My Campsite.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { auth } from "../config/firebase";
import { RootStackParamList } from "../navigation/types";
import {
  getUserBadges,
  getBadgeDefinition,
} from "../services/meritBadgesService";
import {
  UserBadge,
  BadgeDefinition,
  BadgeCategoryId,
  BADGE_COLORS,
  BADGE_CATEGORIES,
} from "../types/badges";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../constants/colors";
import ModalHeader from "../components/ModalHeader";

type MyBadgesScreenRouteProp = RouteProp<RootStackParamList, "MyBadges">;
type MyBadgesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface BadgeWithDefinition extends UserBadge {
  definition?: BadgeDefinition;
}

export default function MyBadgesScreen() {
  const navigation = useNavigation<MyBadgesScreenNavigationProp>();
  const route = useRoute<MyBadgesScreenRouteProp>();
  const insets = useSafeAreaInsets();

  const targetUserId = route.params?.userId || auth.currentUser?.uid;
  const isOwnProfile = !route.params?.userId || route.params.userId === auth.currentUser?.uid;

  const [badges, setBadges] = useState<BadgeWithDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadBadges();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetUserId])
  );

  const loadBadges = async () => {
    if (!targetUserId) return;

    if (!refreshing) {
      setLoading(true);
    }
    setError(null);

    try {
      const userBadges = await getUserBadges(targetUserId);

      // Fetch badge definitions for each earned badge
      const badgesWithDefs: BadgeWithDefinition[] = await Promise.all(
        userBadges.map(async (badge) => {
          try {
            const definition = await getBadgeDefinition(badge.badgeId);
            return {
              ...badge,
              definition: definition || undefined,
            };
          } catch {
            return badge;
          }
        })
      );

      // Sort by earnedAt (most recent first)
      badgesWithDefs.sort((a, b) => {
        const earnedAtA = a.earnedAt as any;
        const earnedAtB = b.earnedAt as any;
        const timeA = earnedAtA?.toMillis?.() || (earnedAtA instanceof Date ? earnedAtA.getTime() : 0);
        const timeB = earnedAtB?.toMillis?.() || (earnedAtB instanceof Date ? earnedAtB.getTime() : 0);
        return timeB - timeA;
      });

      setBadges(badgesWithDefs);
    } catch (err) {
      console.error("[MyBadges] Error loading badges:", err);
      setError("Failed to load badges");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBadges();
  };

  const handleBadgePress = (badgeId: string) => {
    Haptics.selectionAsync();
    navigation.navigate("BadgeDetail", { badgeId });
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

  const getEarnedViaLabel = (via: string) => {
    switch (via) {
      case "SELF":
        return "Self-marked";
      case "PHOTO":
        return "Photo verified";
      case "STAMP":
        return "Witness stamped";
      default:
        return "";
    }
  };

  // Group badges by category
  const badgesByCategory = badges.reduce(
    (acc, badge) => {
      const categoryId = badge.definition?.categoryId || "other";
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(badge);
      return acc;
    },
    {} as Record<string, BadgeWithDefinition[]>
  );

  if (loading && !refreshing) {
    return (
      <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <ModalHeader title={isOwnProfile ? "My Badges" : "Earned Badges"} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader title={isOwnProfile ? "My Badges" : "Earned Badges"} />

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
        {/* Stats Header */}
        <View className="px-4 pt-4 pb-2">
          <View
            className="flex-row items-center justify-between p-4 rounded-xl"
            style={{ backgroundColor: EARTH_GREEN + "15" }}
          >
            <View className="items-center flex-1">
              <Text className="text-3xl font-bold" style={{ color: EARTH_GREEN }}>
                {badges.length}
              </Text>
              <Text className="text-sm" style={{ color: TEXT_SECONDARY }}>
                Badges Earned
              </Text>
            </View>
            {isOwnProfile && (
              <Pressable
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: EARTH_GREEN }}
                onPress={() => navigation.navigate("MeritBadges")}
              >
                <Text className="font-medium" style={{ color: PARCHMENT }}>
                  Earn More
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Error */}
        {error && (
          <View className="mx-4 mt-2 p-3 rounded-lg" style={{ backgroundColor: "#FEE2E2" }}>
            <Text style={{ color: "#DC2626" }}>{error}</Text>
          </View>
        )}

        {/* Empty State */}
        {badges.length === 0 && (
          <View className="mx-4 mt-6 p-8 rounded-xl items-center" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: GRANITE_GOLD + "20" }}
            >
              <Ionicons name="ribbon-outline" size={32} color={GRANITE_GOLD} />
            </View>
            <Text className="text-lg font-medium text-center" style={{ color: TEXT_PRIMARY_STRONG }}>
              {isOwnProfile ? "No Badges Yet" : "No Badges Earned"}
            </Text>
            <Text className="text-center mt-2" style={{ color: TEXT_SECONDARY }}>
              {isOwnProfile
                ? "Start earning badges to showcase your camping accomplishments!"
                : "This camper hasn't earned any badges yet."}
            </Text>
            {isOwnProfile && (
              <Pressable
                className="mt-4 px-6 py-3 rounded-xl"
                style={{ backgroundColor: EARTH_GREEN }}
                onPress={() => navigation.navigate("MeritBadges")}
              >
                <Text className="font-semibold" style={{ color: PARCHMENT }}>
                  Browse Badges
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Badges by Category */}
        {Object.entries(badgesByCategory).map(([categoryId, categoryBadges]) => {
          const category = BADGE_CATEGORIES[categoryId as BadgeCategoryId];

          return (
            <View key={categoryId} className="px-4 mt-6">
              <View className="flex-row items-center mb-3">
                <Ionicons
                  name={(category?.icon as any) || "ribbon"}
                  size={20}
                  color={DEEP_FOREST}
                />
                <Text className="ml-2 text-base font-semibold" style={{ color: TEXT_PRIMARY_STRONG }}>
                  {category?.name || "Other"}
                </Text>
                <Text className="ml-2 text-sm" style={{ color: TEXT_MUTED }}>
                  ({categoryBadges.length})
                </Text>
              </View>

              <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
                {categoryBadges.map((badge) => {
                  const borderColor = badge.definition?.borderColorKey
                    ? BADGE_COLORS[badge.definition.borderColorKey as keyof typeof BADGE_COLORS] ||
                      EARTH_GREEN
                    : EARTH_GREEN;

                  return (
                    <Pressable
                      key={badge.id}
                      className="w-1/2 p-1"
                      onPress={() => handleBadgePress(badge.badgeId)}
                    >
                      <View
                        className="p-3 rounded-xl"
                        style={{
                          backgroundColor: CARD_BACKGROUND_LIGHT,
                          borderWidth: 2,
                          borderColor: borderColor,
                        }}
                      >
                        <View className="flex-row items-center">
                          <View
                            className="w-10 h-10 rounded-full items-center justify-center"
                            style={{ backgroundColor: borderColor + "20" }}
                          >
                            <Ionicons
                              name={(badge.definition?.iconAssetKey as any) || "ribbon"}
                              size={20}
                              color={borderColor}
                            />
                          </View>
                          <View className="flex-1 ml-2">
                            <Text
                              className="text-sm font-medium"
                              style={{ color: TEXT_PRIMARY_STRONG }}
                              numberOfLines={1}
                            >
                              {badge.definition?.name || "Badge"}
                            </Text>
                            <Text className="text-xs" style={{ color: TEXT_MUTED }}>
                              {formatDate(badge.earnedAt)}
                            </Text>
                          </View>
                        </View>
                        <View className="mt-2 flex-row items-center">
                          <Ionicons
                            name={
                              badge.earnedVia === "STAMP"
                                ? "checkmark-circle"
                                : badge.earnedVia === "PHOTO"
                                ? "camera"
                                : "checkbox"
                            }
                            size={12}
                            color={TEXT_MUTED}
                          />
                          <Text className="text-xs ml-1" style={{ color: TEXT_MUTED }}>
                            {getEarnedViaLabel(badge.earnedVia)}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* View All Badges CTA */}
        {isOwnProfile && badges.length > 0 && (
          <View className="px-4 mt-8">
            <Pressable
              className="flex-row items-center justify-center py-4 rounded-xl"
              style={{ backgroundColor: DEEP_FOREST + "10" }}
              onPress={() => navigation.navigate("MeritBadges")}
            >
              <Ionicons name="add-circle-outline" size={20} color={DEEP_FOREST} />
              <Text className="ml-2 font-medium" style={{ color: DEEP_FOREST }}>
                Continue Earning Badges
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
