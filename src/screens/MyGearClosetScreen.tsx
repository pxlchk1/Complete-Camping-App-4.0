/**
 * My Gear Closet Screen
 * Private list of gear the user owns
 * 
 * GATING:
 * - GUEST: Can view but redirected to Auth for add (handled here)
 * - FREE: Can add up to 5 items; item #6 triggers gear_closet_limit paywall
 * - PRO/ADMIN: Unlimited gear items
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { auth } from "../config/firebase";
import { getUserGear, deleteGearItem, deleteGearImages } from "../services/gearClosetService";
import { GearItem, GearCategory, GEAR_CATEGORIES } from "../types/gear";
import { RootStackNavigationProp } from "../navigation/types";
import { useUserStatus } from "../utils/authHelper";
import { useSubscriptionStore } from "../state/subscriptionStore";
import { useIsAdministrator } from "../state/userStore";
import { getPaywallVariantAndTrack } from "../services/proAttemptService";
import { useAuth } from "../context/AuthContext";
import ModalHeader from "../components/ModalHeader";
import OnboardingModal from "../components/OnboardingModal";
import { useScreenOnboarding } from "../hooks/useScreenOnboarding";
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

// FREE user gear limit
const FREE_GEAR_LIMIT = 5;

type FilterOption = "all" | GearCategory;

export default function MyGearClosetScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { isLoggedIn, isGuest } = useUserStatus();
  const isPro = useSubscriptionStore((s) => s.isPro);
  const isAdmin = useIsAdministrator();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const [gear, setGear] = useState<GearItem[]>([]);
  const [filteredGear, setFilteredGear] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");

  // Onboarding modal
  const { showModal, currentTooltip, dismissModal, openModal } = useScreenOnboarding("GearCloset");

  const loadGear = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError("Please sign in to view your gear");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const gearData = await getUserGear(user.uid);
      setGear(gearData);
      applyFilter(gearData, activeFilter);
    } catch (err: any) {
      console.error("Error loading gear:", err);
      setError(err.message || "Failed to load gear");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGear();
  }, []);

  // Reload gear when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadGear();
    }, [])
  );

  const applyFilter = (gearList: GearItem[], filter: FilterOption) => {
    if (filter === "all") {
      setFilteredGear(gearList);
    } else {
      setFilteredGear(gearList.filter(item => item.category === filter));
    }
  };

  const handleFilterChange = (filter: FilterOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilter(filter);
    applyFilter(gear, filter);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadGear();
  };

  const handleAddGear = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Gate: Login required
    if (isGuest) {
      navigation.navigate("Auth");
      return;
    }

    // Gate: FREE users limited to 5 items; Pro and Admin users have unlimited
    if (!isPro && !isAdmin && gear.length >= FREE_GEAR_LIMIT) {
      const variant = await getPaywallVariantAndTrack(isAuthenticated, isPro);
      navigation.navigate("Paywall", { triggerKey: "gear_closet_limit", variant });
      return;
    }

    navigation.navigate("AddGear");
  };

  const handleGearPress = (item: GearItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("GearDetail", { gearId: item.id });
  };

  const getCategoryColor = (category: GearCategory): string => {
    const colors: Record<GearCategory, string> = {
      camp_comfort: "#10B981",
      campFurniture: "#059669",
      clothing: "#7C3AED",
      documents_essentials: "#8B5CF6",
      electronics: "#6366F1",
      entertainment: "#F59E0B",
      food: "#D97706",
      hygiene: "#EC4899",
      kitchen: "#D97706",
      lighting: "#F59E0B",
      meal_prep: "#EA580C",
      optional_extras: "#78716C",
      pet_supplies: "#84CC16",
      safety: "#EF4444",
      seating: "#14B8A6",
      shelter: "#8B4513",
      sleep: "#4A5568",
      tools: "#6B7280",
      water: "#3B82F6",
    };
    return colors[category] || "#6B7280";
  };

  const getCategoryLabel = (category: GearCategory): string => {
    return GEAR_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <ModalHeader
          title="My Gear Closet"
          showTitle
          rightAction={{
            icon: "add",
            onPress: handleAddGear,
          }}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
          <Text className="mt-4" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
            Loading gear...
          </Text>
        </View>
      </View>
    );
  }

  if (error && !auth.currentUser) {
    return (
      <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <ModalHeader title="My Gear Closet" showTitle />
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="briefcase-outline" size={64} color={EARTH_GREEN} />
          <Text
            className="mt-4 text-center text-lg"
            style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
          >
            Log in to manage your gear
          </Text>
          <Text
            className="mt-2 text-center"
            style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
          >
            Create an account to track your camping gear, add photos, and organize your equipment.
          </Text>
          <Pressable
            onPress={() => navigation.navigate("Auth")}
            className="mt-6 px-6 py-3 rounded-xl active:opacity-90"
            style={{ backgroundColor: DEEP_FOREST }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
              Log In / Create Account
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader
        title="My Gear Closet"
        showTitle
        onInfoPress={openModal}
        rightAction={{
          icon: "add",
          onPress: handleAddGear,
        }}
      />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={DEEP_FOREST}
          />
        }
      >
        {/* Header */}
        <View className="px-5 pt-6 pb-4">
          <Text
            className="mt-2"
            style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
          >
            Save the gear you own so it is easy to pack and plan.
          </Text>
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-5 pb-4"
          contentContainerStyle={{ gap: 8 }}
        >
          <Pressable
            onPress={() => handleFilterChange("all")}
            className="px-4 py-2 rounded-full"
            style={{
              backgroundColor: activeFilter === "all" ? DEEP_FOREST : CARD_BACKGROUND_LIGHT,
            }}
          >
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 14,
                color: activeFilter === "all" ? PARCHMENT : TEXT_PRIMARY_STRONG,
              }}
            >
              All
            </Text>
          </Pressable>

          {GEAR_CATEGORIES.map(category => (
            <Pressable
              key={category.value}
              onPress={() => handleFilterChange(category.value)}
              className="px-4 py-2 rounded-full"
              style={{
                backgroundColor: activeFilter === category.value ? DEEP_FOREST : CARD_BACKGROUND_LIGHT,
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 14,
                  color: activeFilter === category.value ? PARCHMENT : TEXT_PRIMARY_STRONG,
                }}
              >
                {category.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Gear List */}
        {filteredGear.length === 0 ? (
          <View className="py-12 px-5 items-center">
            <Ionicons name="briefcase-outline" size={64} color={BORDER_SOFT} />
            <Text
              className="mt-4 text-center text-lg"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              {gear.length === 0 ? "Your gear closet is empty" : "This category is empty"}
            </Text>
            <Text
              className="mt-2 text-center"
              style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}
            >
              {gear.length === 0 
                ? "Add the gear you own so you can pack and plan faster next time."
                : "Add gear to this category or browse your other items."}
            </Text>
            <Pressable
              onPress={handleAddGear}
              className="mt-6 px-6 py-3 rounded-xl active:opacity-90"
              style={{ backgroundColor: DEEP_FOREST }}
            >
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
                {gear.length === 0 ? "Add your first item" : "Add gear"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="px-5 pb-5">
            {filteredGear.map(item => (
              <Pressable
                key={item.id}
                onPress={() => handleGearPress(item)}
                className="mb-3 p-3 rounded-xl border active:opacity-70"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
              >
                <View className="flex-row">
                  {/* Thumbnail */}
                  <View
                    className="w-16 h-16 rounded-lg mr-3"
                    style={{ backgroundColor: BORDER_SOFT }}
                  >
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        className="w-full h-full rounded-lg"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-full h-full items-center justify-center">
                        <Ionicons name="briefcase-outline" size={24} color={TEXT_MUTED} />
                      </View>
                    )}
                  </View>

                  {/* Text Content */}
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text
                        className="text-base flex-1"
                        style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {item.isFavorite && (
                        <Ionicons name="star" size={16} color="#F59E0B" style={{ marginLeft: 8 }} />
                      )}
                    </View>

                    {(item.brand || item.model) && (
                      <Text
                        className="text-sm mb-1"
                        style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                        numberOfLines={1}
                      >
                        {[item.brand, item.model].filter(Boolean).join(" ")}
                      </Text>
                    )}

                    <View
                      className="self-start px-2 py-0.5 rounded"
                      style={{ backgroundColor: getCategoryColor(item.category) }}
                    >
                      <Text
                        className="text-xs"
                        style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                      >
                        {getCategoryLabel(item.category)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Onboarding Modal */}
      <OnboardingModal
        visible={showModal}
        tooltip={currentTooltip}
        onDismiss={dismissModal}
      />
    </View>
  );
}
