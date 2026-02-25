/**
 * MeritBadgesScreen
 * 
 * Main screen for browsing and tracking Merit Badges.
 * Accessible from Learn tab.
 * 
 * Shows:
 * - Progress bar with cumulative stats
 * - Category breakdown
 * - Badge grid grouped by category
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { auth } from "../config/firebase";
import { RootStackParamList } from "../navigation/types";
import {
  getBadgesByCategory,
  getBadgeProgressStats,
  getCurrentSeasonEndDate,
} from "../services/meritBadgesService";
import {
  BadgeCategoryGroup,
  BadgeProgressStats,
  BadgeWithProgress,
  BADGE_COLORS,
  BADGE_CATEGORIES,
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

type MeritBadgesNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MeritBadgesScreen() {
  const navigation = useNavigation<MeritBadgesNavigationProp>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryGroups, setCategoryGroups] = useState<BadgeCategoryGroup[]>([]);
  const [progressStats, setProgressStats] = useState<BadgeProgressStats | null>(null);
  const [seasonEndDate, setSeasonEndDate] = useState<Date | null>(null);

  const loadData = useCallback(async (showRefresh = false) => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const [groups, stats, seasonEnd] = await Promise.all([
        getBadgesByCategory(user.uid),
        getBadgeProgressStats(user.uid),
        getCurrentSeasonEndDate(),
      ]);

      setCategoryGroups(groups);
      setProgressStats(stats);
      setSeasonEndDate(seasonEnd);
    } catch (error) {
      console.error("[MeritBadgesScreen] Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData])
  );

  const handleBadgePress = (badge: BadgeWithProgress) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("BadgeDetail", { badgeId: badge.id });
  };

  const formatSeasonEndDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: PARCHMENT, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={DEEP_FOREST} />
        <Text style={{ marginTop: 16, fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
          Loading badges...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: PARCHMENT }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />
        }
      >
        {/* Subline */}
        <Text
          style={{
            fontFamily: "SourceSans3_400Regular",
            fontSize: 15,
            color: TEXT_SECONDARY,
            marginTop: 8,
            marginBottom: 16,
          }}
        >
          Earn badges by doing real things outdoors.
        </Text>

        {/* Progress Section */}
        {progressStats && (
          <View
            style={{
              backgroundColor: CARD_BACKGROUND_LIGHT,
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
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
              Your Badge Progress
            </Text>

            {/* Progress Bar */}
            <View style={{ marginBottom: 12 }}>
              <View
                style={{
                  height: 8,
                  backgroundColor: "#E5E7EB",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${progressStats.percentComplete}%`,
                    backgroundColor: EARTH_GREEN,
                    borderRadius: 4,
                  }}
                />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 13, color: TEXT_PRIMARY_STRONG }}>
                  {progressStats.earnedBadges} / {progressStats.totalBadges} Earned
                </Text>
                <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 13, color: EARTH_GREEN }}>
                  {progressStats.percentComplete}%
                </Text>
              </View>
            </View>

            {/* Category Breakdown */}
            <View style={{ borderTopWidth: 1, borderTopColor: BORDER_SOFT, paddingTop: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_SECONDARY }}>
                  Core: {progressStats.coreEarned} / {progressStats.coreTotal}
                </Text>
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_SECONDARY }}>
                  Seasonal: {progressStats.seasonalEarned} / {progressStats.seasonalTotal}
                </Text>
              </View>
              {progressStats.limitedEarned > 0 && (
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_SECONDARY }}>
                  Limited Edition: {progressStats.limitedEarned}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Badge Categories */}
        {categoryGroups.map((group) => (
          <View key={group.categoryId} style={{ marginBottom: 24 }}>
            {/* Category Header */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Ionicons
                name={BADGE_CATEGORIES[group.categoryId]?.icon as any || "ribbon"}
                size={18}
                color={DEEP_FOREST}
              />
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 16,
                  color: TEXT_PRIMARY_STRONG,
                  marginLeft: 8,
                }}
              >
                {group.categoryName}
              </Text>
            </View>

            {/* Season End Notice for Seasonal */}
            {group.categoryId === "seasonal" && seasonEndDate && (
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 12,
                  color: TEXT_MUTED,
                  marginBottom: 8,
                  fontStyle: "italic",
                }}
              >
                This season ends {formatSeasonEndDate(seasonEndDate)}
              </Text>
            )}

            {/* Badge Grid */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>
              {group.badges.map((badge) => (
                <BadgeGridItem
                  key={badge.id}
                  badge={badge}
                  onPress={() => handleBadgePress(badge)}
                />
              ))}
            </View>
          </View>
        ))}

        {categoryGroups.length === 0 && !loading && (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Ionicons name="ribbon-outline" size={48} color={TEXT_MUTED} />
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 15,
                color: TEXT_SECONDARY,
                marginTop: 12,
                textAlign: "center",
              }}
            >
              No badges available yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================
// Badge Grid Item Component
// ============================================

interface BadgeGridItemProps {
  badge: BadgeWithProgress;
  onPress: () => void;
}

function BadgeGridItem({ badge, onPress }: BadgeGridItemProps) {
  const badgeColor = BADGE_COLORS[badge.borderColorKey] || GRANITE_GOLD;
  const isEarned = badge.displayState === "earned";
  const isPending = badge.displayState === "pending_stamp";
  const isSeasonalLocked = badge.displayState === "seasonal_locked";
  const isActive = badge.displayState === "seasonal_active" || badge.displayState === "not_started";

  // Determine visual state
  let borderStyle: "solid" | "dashed" = isEarned ? "solid" : "dashed";
  let opacity = isEarned ? 1 : isSeasonalLocked ? 0.4 : 0.6;
  let backgroundColor = isEarned ? badgeColor : CARD_BACKGROUND_LIGHT;
  let borderColor = isPending ? "#F59E0B" : isEarned ? badgeColor : BORDER_SOFT;
  let borderWidth = isPending ? 3 : 2;

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: "25%",
        paddingHorizontal: 6,
        marginBottom: 16,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor,
          borderWidth,
          borderColor,
          borderStyle,
          opacity,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: isEarned ? "#000" : "transparent",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isEarned ? 0.15 : 0,
          shadowRadius: 3,
          elevation: isEarned ? 3 : 0,
        }}
      >
        <Ionicons
          name={badge.iconAssetKey as any || "ribbon"}
          size={24}
          color={isEarned ? PARCHMENT : TEXT_MUTED}
        />
        {/* Pending dot */}
        {isPending && (
          <View
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: "#F59E0B",
              borderWidth: 2,
              borderColor: PARCHMENT,
            }}
          />
        )}
        {/* Limited edition star */}
        {badge.isLimitedEdition && (
          <View
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: "#7C3AED",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="star" size={8} color="#FFF" />
          </View>
        )}
      </View>
      <Text
        style={{
          fontFamily: "SourceSans3_400Regular",
          fontSize: 11,
          color: isEarned ? TEXT_PRIMARY_STRONG : TEXT_MUTED,
          marginTop: 6,
          textAlign: "center",
          lineHeight: 13,
        }}
        numberOfLines={2}
      >
        {badge.name}
      </Text>
    </Pressable>
  );
}
