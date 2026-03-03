/**
 * MeritBadgesScreen
 * 
 * Main screen for browsing and tracking Merit Badges.
 * Shows:
 * - Simple tally progress card
 * - Category blocks with horizontal scroll badge rows
 */

import React, { useState, useCallback, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Image,
  FlatList,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { resolveBadgeImage, deriveImageKey } from "../assets/images/merit_badges/resolveBadgeImage";

import { auth } from "../config/firebase";
import { RootStackParamList } from "../navigation/types";
import {
  getBadgesByCategory,
  getBadgeProgressStats,
  seedBadgeDefinitions,
  getPendingClaimsForWitness,
} from "../services/meritBadgesService";
import {
  BadgeCategoryGroup,
  BadgeProgressStats,
  BadgeWithProgress,
} from "../types/badges";
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

type MeritBadgesNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const BADGE_TILE_WIDTH = 88;
const BADGE_IMAGE_SIZE = 72;

export default function MeritBadgesScreen() {
  const navigation = useNavigation<MeritBadgesNavigationProp>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [categoryGroups, setCategoryGroups] = useState<BadgeCategoryGroup[]>([]);
  const [progressStats, setProgressStats] = useState<BadgeProgressStats | null>(null);
  const [pendingWitnessCount, setPendingWitnessCount] = useState(0);

  const loadData = useCallback(async (showRefresh = false) => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const [groups, stats] = await Promise.all([
        getBadgesByCategory(user.uid),
        getBadgeProgressStats(user.uid),
      ]);

      setCategoryGroups(groups);
      setProgressStats(stats);

      // Load pending witness requests count
      try {
        const pendingClaims = await getPendingClaimsForWitness(user.uid);
        setPendingWitnessCount(pendingClaims.length);
      } catch {
        console.log("[MeritBadgesScreen] Could not load pending witness count");
      }
    } catch (error) {
      console.error("[MeritBadgesScreen] Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(categoryGroups.length > 0);
    }, [loadData, categoryGroups.length])
  );

  const handleBadgePress = useCallback((badge: BadgeWithProgress) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("BadgeDetail", { badgeId: badge.id });
  }, [navigation]);

  const handleSeedBadges = useCallback(async () => {
    setSeeding(true);
    try {
      await seedBadgeDefinitions();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadData(false);
    } catch (error) {
      console.error("[MeritBadgesScreen] Error seeding badges:", error);
    } finally {
      setSeeding(false);
    }
  }, [loadData]);

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
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
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
            paddingHorizontal: 16,
          }}
        >
          Earn badges by doing real things outdoors.
        </Text>

        {/* Progress Card - Simple Tally */}
        {progressStats && (
          <View
            style={{
              backgroundColor: CARD_BACKGROUND_LIGHT,
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              marginHorizontal: 16,
              borderWidth: 1,
              borderColor: BORDER_SOFT,
            }}
          >
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 16,
                color: TEXT_PRIMARY_STRONG,
                marginBottom: 12,
              }}
            >
              Total Badges Earned: {progressStats.earnedBadges}
            </Text>

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY }}>
                Core: {progressStats.coreEarned} / {progressStats.coreTotal}
              </Text>
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY }}>
                Seasonal: {progressStats.seasonalEarned} / {progressStats.seasonalTotal}
              </Text>
            </View>
          </View>
        )}

        {/* Stamp Requests Button - Show if there are pending requests */}
        {pendingWitnessCount > 0 && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("WitnessRequests");
            }}
            style={({ pressed }) => ({
              backgroundColor: pressed ? EARTH_GREEN : DEEP_FOREST,
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
              marginHorizontal: 16,
              marginBottom: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="checkmark-circle" size={24} color={PARCHMENT} />
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 16,
                  color: PARCHMENT,
                  marginLeft: 12,
                }}
              >
                Stamp Requests
              </Text>
            </View>
            <View
              style={{
                backgroundColor: EARTH_GREEN,
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
                minWidth: 24,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_700Bold",
                  fontSize: 14,
                  color: PARCHMENT,
                }}
              >
                {pendingWitnessCount}
              </Text>
            </View>
          </Pressable>
        )}

        {/* Category Blocks */}
        {categoryGroups.map((group) => (
          <CategoryBlock
            key={group.categoryId}
            group={group}
            onBadgePress={handleBadgePress}
          />
        ))}

        {categoryGroups.length === 0 && !loading && (
          <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 }}>
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
            
            {/* Seed sample badges button (dev) */}
            {__DEV__ && (
              <Pressable
                onPress={handleSeedBadges}
                disabled={seeding}
                style={{
                  marginTop: 20,
                  backgroundColor: DEEP_FOREST,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                  opacity: seeding ? 0.6 : 1,
                }}
              >
                {seeding ? (
                  <ActivityIndicator color={PARCHMENT} size="small" />
                ) : (
                  <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: PARCHMENT }}>
                    Seed Sample Badges
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================
// Category Block Component
// ============================================

interface CategoryBlockProps {
  group: BadgeCategoryGroup;
  onBadgePress: (badge: BadgeWithProgress) => void;
}

const CategoryBlock = memo(function CategoryBlock({ group, onBadgePress }: CategoryBlockProps) {
  const earnedCount = group.badges.filter(b => b.displayState === "earned").length;
  const totalCount = group.badges.length;

  const renderBadge = useCallback(({ item }: { item: BadgeWithProgress }) => (
    <BadgeTile badge={item} onPress={() => onBadgePress(item)} />
  ), [onBadgePress]);

  const keyExtractor = useCallback((item: BadgeWithProgress) => item.id, []);

  return (
    <View style={{ marginBottom: 24 }}>
      {/* Category Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontFamily: "SourceSans3_600SemiBold",
            fontSize: 16,
            color: TEXT_PRIMARY_STRONG,
          }}
        >
          {group.categoryName}
        </Text>
        <Text
          style={{
            fontFamily: "SourceSans3_400Regular",
            fontSize: 14,
            color: TEXT_SECONDARY,
          }}
        >
          {earnedCount} / {totalCount} earned
        </Text>
      </View>

      {/* Horizontal Scroll Row */}
      <FlatList
        data={group.badges}
        renderItem={renderBadge}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        ItemSeparatorComponent={() => <View style={{ width: 4 }} />}
      />
    </View>
  );
});

// ============================================
// Badge Tile Component (Memoized) - No borders
// ============================================

interface BadgeTileProps {
  badge: BadgeWithProgress;
  onPress: () => void;
}

const BadgeTile = memo(function BadgeTile({ badge, onPress }: BadgeTileProps) {
  const isEarned = badge.displayState === "earned";
  const isPending = badge.displayState === "pending_stamp";
  const isInProgress = badge.displayState === "in_progress";
  const isLocked = badge.displayState === "seasonal_locked" || badge.displayState === "locked";

  // Get the badge image
  const imageKey = badge.imageKey || deriveImageKey(badge.iconAssetKey);
  const badgeImage = resolveBadgeImage(imageKey);

  // Visual states - only show accent ring for pending/in-progress
  const showAccentRing = isPending || isInProgress;

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: BADGE_TILE_WIDTH,
        alignItems: "center",
        paddingHorizontal: 4,
      }}
    >
      <View
        style={{
          width: BADGE_IMAGE_SIZE,
          height: BADGE_IMAGE_SIZE,
          borderRadius: BADGE_IMAGE_SIZE / 2,
          overflow: "hidden",
          borderWidth: showAccentRing ? 3 : 0,
          borderColor: showAccentRing ? EARTH_GREEN : "transparent",
          shadowColor: isEarned ? "#000" : "transparent",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isEarned ? 0.15 : 0,
          shadowRadius: 3,
          elevation: isEarned ? 3 : 0,
        }}
      >
        {/* Badge PNG image - scaled up to crop out cream borders */}
        <Image
          source={badgeImage}
          style={{
            width: "130%",
            height: "130%",
            marginLeft: "-15%",
            marginTop: "-15%",
          }}
          resizeMode="cover"
        />
        
        {/* Desaturated overlay for locked/unearned badges */}
        {!isEarned && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isLocked ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.5)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {isLocked && <Ionicons name="lock-closed" size={16} color={TEXT_MUTED} />}
          </View>
        )}

        {/* Checkmark for earned badges */}
        {isEarned && (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: EARTH_GREEN,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 2,
              borderColor: PARCHMENT,
            }}
          >
            <Ionicons name="checkmark" size={10} color="#FFF" />
          </View>
        )}
      </View>

      {/* Badge Name */}
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
});

