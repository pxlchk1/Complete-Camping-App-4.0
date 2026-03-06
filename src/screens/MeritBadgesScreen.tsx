/**
 * MeritBadgesScreen
 *
 * Clean implementation based on UX wireframes.
 * Shows progress card, witness requests banner, and badge categories.
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
import * as Haptics from "expo-haptics";

import { auth } from "../config/firebase";
import { RootStackParamList } from "../navigation/types";
import {
  getBadgesByCategory,
  getBadgeProgressStats,
  getPendingClaimsForWitness,
} from "../services/meritBadgesService";
import {
  BadgeCategoryGroup,
  BadgeProgressStats,
  BadgeWithProgress,
} from "../types/badges";
import { resolveBadgeImage, deriveImageKey } from "../assets/images/merit_badges/resolveBadgeImage";
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

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// Layout constants from UX spec
const BADGE_TILE_WIDTH = 88;
const BADGE_IMAGE_SIZE = 72;

export default function MeritBadgesScreen() {
  const navigation = useNavigation<NavProp>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<BadgeCategoryGroup[]>([]);
  const [stats, setStats] = useState<BadgeProgressStats | null>(null);
  const [witnessCount, setWitnessCount] = useState(0);

  const loadData = useCallback(async (isRefresh = false) => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [categoryData, statsData] = await Promise.all([
        getBadgesByCategory(user.uid),
        getBadgeProgressStats(user.uid),
      ]);

      setCategories(categoryData);
      setStats(statsData);

      // Load witness request count
      try {
        const pending = await getPendingClaimsForWitness(user.uid);
        setWitnessCount(pending.length);
      } catch {
        // Silently fail - not critical
      }
    } catch (error) {
      console.error("[MeritBadgesScreen] Load error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(categories.length > 0);
    }, [loadData, categories.length])
  );

  const handleBadgePress = useCallback(
    (badge: BadgeWithProgress) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate("BadgeDetail", { badgeId: badge.id });
    },
    [navigation]
  );

  const handleWitnessPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("WitnessRequests");
  }, [navigation]);

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-parchment">
        <ActivityIndicator size="large" color={DEEP_FOREST} />
        <Text className="mt-4 font-source-regular text-base" style={{ color: TEXT_SECONDARY }}>
          Loading badges...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-parchment">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />
        }
      >
        {/* Subtitle */}
        <Text
          className="font-source-regular text-base px-4 mt-2 mb-4"
          style={{ color: TEXT_SECONDARY }}
        >
          Earn badges by doing real things outdoors.
        </Text>

        {/* Progress Card */}
        {stats && <ProgressCard stats={stats} />}

        {/* Witness Requests Banner */}
        {witnessCount > 0 && (
          <WitnessBanner count={witnessCount} onPress={handleWitnessPress} />
        )}

        {/* Category Sections */}
        {categories.map((group) => (
          <CategorySection
            key={group.categoryId}
            group={group}
            onBadgePress={handleBadgePress}
          />
        ))}

        {/* Empty State */}
        {categories.length === 0 && (
          <View className="items-center py-10 px-6">
            <Ionicons name="ribbon-outline" size={48} color={TEXT_MUTED} />
            <Text
              className="font-source-regular text-base mt-3 text-center"
              style={{ color: TEXT_SECONDARY }}
            >
              No badges available yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ==============================================
// Progress Card Component
// ==============================================

interface ProgressCardProps {
  stats: BadgeProgressStats;
}

const ProgressCard = memo(function ProgressCard({ stats }: ProgressCardProps) {
  const percent = Math.round(stats.percentComplete);

  return (
    <View
      className="mx-4 mb-5 p-4 rounded-xl"
      style={{
        backgroundColor: CARD_BACKGROUND_LIGHT,
        borderWidth: 1,
        borderColor: BORDER_SOFT,
      }}
    >
      {/* Main stat */}
      <Text
        className="font-source-semibold text-lg mb-3"
        style={{ color: TEXT_PRIMARY_STRONG }}
      >
        {stats.earnedBadges} of {stats.totalBadges} Badges Earned
      </Text>

      {/* Progress bar */}
      <View
        className="h-2 rounded-full mb-3 overflow-hidden"
        style={{ backgroundColor: BORDER_SOFT }}
      >
        <View
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            backgroundColor: EARTH_GREEN,
          }}
        />
      </View>

      {/* Breakdown */}
      <View className="flex-row justify-between">
        <Text className="font-source-regular text-sm" style={{ color: TEXT_SECONDARY }}>
          Core: {stats.coreEarned} / {stats.coreTotal}
        </Text>
        <Text className="font-source-regular text-sm" style={{ color: TEXT_SECONDARY }}>
          Seasonal: {stats.seasonalEarned} / {stats.seasonalTotal}
        </Text>
      </View>
    </View>
  );
});

// ==============================================
// Witness Banner Component
// ==============================================

interface WitnessBannerProps {
  count: number;
  onPress: () => void;
}

const WitnessBanner = memo(function WitnessBanner({ count, onPress }: WitnessBannerProps) {
  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mb-4 py-3.5 px-4 rounded-xl flex-row items-center justify-between"
      style={({ pressed }) => ({
        backgroundColor: pressed ? EARTH_GREEN : DEEP_FOREST,
      })}
    >
      <View className="flex-row items-center">
        <Ionicons name="checkmark-circle" size={24} color={PARCHMENT} />
        <Text className="font-source-semibold text-base ml-3" style={{ color: PARCHMENT }}>
          Stamp Requests
        </Text>
      </View>
      <View
        className="px-2.5 py-1 rounded-full min-w-[28px] items-center"
        style={{ backgroundColor: EARTH_GREEN }}
      >
        <Text className="font-source-bold text-sm" style={{ color: PARCHMENT }}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
});

// ==============================================
// Category Section Component
// ==============================================

interface CategorySectionProps {
  group: BadgeCategoryGroup;
  onBadgePress: (badge: BadgeWithProgress) => void;
}

const CategorySection = memo(function CategorySection({
  group,
  onBadgePress,
}: CategorySectionProps) {
  const earned = group.badges.filter((b) => b.displayState === "earned").length;
  const total = group.badges.length;

  const renderBadge = useCallback(
    ({ item }: { item: BadgeWithProgress }) => (
      <BadgeTile badge={item} onPress={() => onBadgePress(item)} />
    ),
    [onBadgePress]
  );

  return (
    <View className="mb-6">
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 mb-3">
        <Text
          className="font-source-semibold text-base"
          style={{ color: TEXT_PRIMARY_STRONG }}
        >
          {group.categoryName}
        </Text>
        <Text className="font-source-regular text-sm" style={{ color: TEXT_SECONDARY }}>
          {earned} / {total}
        </Text>
      </View>

      {/* Horizontal Badge Row */}
      <FlatList
        data={group.badges}
        renderItem={renderBadge}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        ItemSeparatorComponent={() => <View style={{ width: 4 }} />}
      />
    </View>
  );
});

// ==============================================
// Badge Tile Component
// ==============================================

interface BadgeTileProps {
  badge: BadgeWithProgress;
  onPress: () => void;
}

const BadgeTile = memo(function BadgeTile({ badge, onPress }: BadgeTileProps) {
  const isEarned = badge.displayState === "earned";
  const isPending = badge.displayState === "pending_stamp";
  const isInProgress = badge.displayState === "in_progress";
  const isLocked =
    badge.displayState === "seasonal_locked" || badge.displayState === "locked";

  const imageKey = badge.imageKey || deriveImageKey(badge.iconAssetKey);
  const badgeImage = resolveBadgeImage(imageKey);

  // Show accent ring for pending/in-progress states
  const showRing = isPending || isInProgress;

  return (
    <Pressable onPress={onPress} style={{ width: BADGE_TILE_WIDTH, alignItems: "center" }}>
      <View
        style={{
          width: BADGE_IMAGE_SIZE,
          height: BADGE_IMAGE_SIZE,
          borderRadius: BADGE_IMAGE_SIZE / 2,
          overflow: "hidden",
          borderWidth: showRing ? 3 : 0,
          borderColor: showRing ? EARTH_GREEN : "transparent",
          shadowColor: isEarned ? "#000" : "transparent",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isEarned ? 0.15 : 0,
          shadowRadius: 3,
          elevation: isEarned ? 3 : 0,
        }}
      >
        {/* Badge image - scaled to crop cream borders */}
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

        {/* Overlay for non-earned badges */}
        {!isEarned && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isLocked
                ? "rgba(255,255,255,0.7)"
                : "rgba(255,255,255,0.5)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {isLocked && <Ionicons name="lock-closed" size={16} color={TEXT_MUTED} />}
          </View>
        )}

        {/* Earned checkmark */}
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

      {/* Badge name */}
      <Text
        className="font-source-regular text-xs mt-1.5 text-center leading-tight"
        style={{ color: isEarned ? TEXT_PRIMARY_STRONG : TEXT_MUTED }}
        numberOfLines={2}
      >
        {badge.name}
      </Text>
    </Pressable>
  );
});
