/**
 * Gear Closet Picker Modal
 * Modal for selecting items from user's gear closet to add to packing list
 * Features: Search, category filter chips, multi-select, duplicate detection
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { GearItem, GearCategory, GEAR_CATEGORIES } from "../types/gear";
import { PackingItemV2, PackingCategory } from "../types/packingV2";
import { getUserGear } from "../services/gearClosetService";
import { savePackingItem } from "../services/packingServiceV2";
import { useAuthStore } from "../state/authStore";
import { auth } from "../config/firebase";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  CARD_BACKGROUND_LIGHT,
  GRANITE_GOLD,
} from "../constants/colors";

interface GearClosetPickerModalProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  existingItems: PackingItemV2[];
  onItemsAdded: () => void;
}

// Map gear categories to packing categories
// Seating maps to camp_comfort as per requirements
const GEAR_TO_PACKING_CATEGORY: Record<GearCategory, PackingCategory> = {
  camp_comfort: "camp_comfort",
  campFurniture: "camp_comfort", // Camp Furniture maps to Camp Comfort packing category
  clothing: "clothing",
  documents_essentials: "documents_essentials",
  electronics: "electronics",
  entertainment: "optional_extras", // Entertainment maps to Optional Extras
  food: "food",
  hygiene: "hygiene",
  kitchen: "kitchen",
  lighting: "lighting",
  meal_prep: "kitchen", // Meal Prep maps to Kitchen
  optional_extras: "optional_extras",
  pet_supplies: "optional_extras", // Pet Supplies maps to Optional Extras
  safety: "navigation_safety",
  seating: "camp_comfort", // Seating maps to Camp Comfort
  shelter: "shelter",
  sleep: "sleep",
  tools: "tools_repairs",
  water: "water",
};

export default function GearClosetPickerModal({
  visible,
  onClose,
  tripId,
  existingItems,
  onItemsAdded,
}: GearClosetPickerModalProps) {
  const user = useAuthStore((state) => state.user);
  const firebaseUser = auth.currentUser;

  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<GearCategory | "all">("all");

  // Load gear items
  useEffect(() => {
    if (visible && firebaseUser?.uid) {
      loadGear();
    }
  }, [visible, firebaseUser?.uid]);

  // Reset selection and filters when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedIds(new Set());
      setSearchQuery("");
      setSelectedCategory("all");
    }
  }, [visible]);

  const loadGear = async () => {
    if (!firebaseUser?.uid) return;

    setLoading(true);
    try {
      const items = await getUserGear(firebaseUser.uid);
      setGearItems(items);
    } catch (error) {
      console.error("[GearClosetPicker] Error loading gear:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get existing gear item IDs in packing list
  const existingGearIds = useMemo(() => {
    return new Set(
      existingItems
        .filter((item) => item.gearClosetId)
        .map((item) => item.gearClosetId!)
    );
  }, [existingItems]);

  // Get existing item names (normalized) for duplicate detection
  const existingItemNames = useMemo(() => {
    return new Set(
      existingItems.map((item) => 
        item.name.toLowerCase().trim().replace(/[^\w\s]/g, "")
      )
    );
  }, [existingItems]);

  // Check if item is already in list (by gearId or name)
  const isItemInList = (gear: GearItem): boolean => {
    if (existingGearIds.has(gear.id)) return true;
    const normalizedName = gear.name.toLowerCase().trim().replace(/[^\w\s]/g, "");
    return existingItemNames.has(normalizedName);
  };

  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    return gearItems.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = item.name.toLowerCase().includes(query);
        const brandMatch = item.brand?.toLowerCase().includes(query) || false;
        const modelMatch = item.model?.toLowerCase().includes(query) || false;
        return nameMatch || brandMatch || modelMatch;
      }
      return true;
    });
  }, [gearItems, searchQuery, selectedCategory]);

  // Get available favorites (not already in list)
  const availableFavorites = useMemo(() => {
    return gearItems.filter((item) => item.isFavorite && !isItemInList(item));
  }, [gearItems, existingGearIds, existingItemNames]);

  // Toggle selection
  const toggleSelection = (gearId: string) => {
    Haptics.selectionAsync();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(gearId)) {
        next.delete(gearId);
      } else {
        next.add(gearId);
      }
      return next;
    });
  };

  // Select all favorites
  const handleSelectAllFavorites = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const favoriteIds = availableFavorites.map((item) => item.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      favoriteIds.forEach((id) => next.add(id));
      return next;
    });
  };

  // Add selected items to packing list
  const handleAddItems = async () => {
    if (!user?.id || selectedIds.size === 0) return;

    setAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const itemsToAdd = gearItems.filter((g) => selectedIds.has(g.id));
      let addedCount = 0;
      let skippedCount = 0;

      for (const gear of itemsToAdd) {
        // Skip if already in list (duplicate detection)
        if (isItemInList(gear)) {
          skippedCount++;
          continue;
        }

        const packingCategory = GEAR_TO_PACKING_CATEGORY[gear.category] || "optional_extras";

        const itemData: Partial<PackingItemV2> = {
          name: gear.name,
          category: packingCategory,
          quantity: 1,
          notes: [gear.brand, gear.model].filter(Boolean).join(" ") || undefined,
          isEssential: false,
          isPacked: false,
          isFromGearCloset: true,
          gearClosetId: gear.id,
        };

        await savePackingItem(user.id, tripId, itemData);
        addedCount++;
      }

      // Show feedback
      if (addedCount > 0 && skippedCount > 0) {
        Alert.alert(
          "Added to packing list",
          `${addedCount} item${addedCount > 1 ? "s" : ""} added, ${skippedCount} already in list`
        );
      } else if (skippedCount > 0) {
        Alert.alert(
          "Already on your list",
          `${skippedCount} item${skippedCount > 1 ? "s" : ""} already in packing list`
        );
      }

      onItemsAdded();
      onClose();
    } catch (error) {
      console.error("[GearClosetPicker] Error adding items:", error);
      Alert.alert("Error adding items", "Please try again");
    } finally {
      setAdding(false);
    }
  };

  // Render gear item
  const renderGearItem = (gear: GearItem) => {
    const isSelected = selectedIds.has(gear.id);
    const alreadyInList = existingGearIds.has(gear.id) || isItemInList(gear);

    return (
      <Pressable
        key={gear.id}
        onPress={() => !alreadyInList && toggleSelection(gear.id)}
        className="flex-row items-center px-4 py-3 border-b"
        style={{
          borderColor: BORDER_SOFT,
          backgroundColor: isSelected ? "rgba(26, 76, 57, 0.08)" : PARCHMENT,
          opacity: alreadyInList ? 0.5 : 1,
        }}
        disabled={alreadyInList}
      >
        {/* Checkbox */}
        <View
          className="w-6 h-6 rounded-md border-2 items-center justify-center mr-3"
          style={{
            borderColor: isSelected
              ? DEEP_FOREST
              : alreadyInList
              ? TEXT_SECONDARY
              : BORDER_SOFT,
            backgroundColor: isSelected ? DEEP_FOREST : "transparent",
          }}
        >
          {isSelected && <Ionicons name="checkmark" size={16} color={PARCHMENT} />}
          {alreadyInList && !isSelected && (
            <Ionicons name="checkmark" size={14} color={TEXT_SECONDARY} />
          )}
        </View>

        {/* Gear Info */}
        <View className="flex-1">
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 15,
              color: alreadyInList ? TEXT_SECONDARY : TEXT_PRIMARY_STRONG,
            }}
            numberOfLines={1}
          >
            {gear.name}
          </Text>
          {(gear.brand || gear.model) && (
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 12,
                color: TEXT_SECONDARY,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {[gear.brand, gear.model].filter(Boolean).join(" ")}
            </Text>
          )}
        </View>

        {/* Status */}
        {alreadyInList && (
          <View
            className="px-2 py-1 rounded-full"
            style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
          >
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 11,
                color: TEXT_SECONDARY,
              }}
            >
              In list
            </Text>
          </View>
        )}

        {gear.isFavorite && !alreadyInList && (
          <Ionicons name="star" size={16} color={GRANITE_GOLD} style={{ marginLeft: 8 }} />
        )}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        {/* Backdrop */}
        <Pressable
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={onClose}
        />

        {/* Content */}
        <View
          className="rounded-t-3xl overflow-hidden"
          style={{ backgroundColor: PARCHMENT, maxHeight: "85%" }}
        >
          <SafeAreaView edges={["bottom"]}>
            {/* Header */}
            <View
              className="flex-row items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: BORDER_SOFT }}
            >
              <Pressable onPress={onClose} hitSlop={10}>
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 16,
                    color: EARTH_GREEN,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>

              <Text
                style={{
                  fontFamily: "Raleway_700Bold",
                  fontSize: 17,
                  color: DEEP_FOREST,
                }}
              >
                Gear Closet
              </Text>

              <Pressable
                onPress={handleAddItems}
                disabled={selectedIds.size === 0 || adding}
                hitSlop={10}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 16,
                    color: selectedIds.size > 0 ? DEEP_FOREST : TEXT_SECONDARY,
                  }}
                >
                  {adding ? "Adding..." : `Add (${selectedIds.size})`}
                </Text>
              </Pressable>
            </View>

            {/* Search Bar */}
            <View className="px-4 pt-3 pb-2">
              <View
                className="flex-row items-center px-3 py-2 rounded-lg"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
              >
                <Ionicons name="search" size={18} color={TEXT_SECONDARY} />
                <TextInput
                  className="flex-1 ml-2"
                  placeholder="Search gear..."
                  placeholderTextColor={TEXT_SECONDARY}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 15,
                    color: TEXT_PRIMARY_STRONG,
                    padding: 0,
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={TEXT_SECONDARY} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Quick Actions - Add All Favorites */}
            {availableFavorites.length > 0 && (
              <Pressable
                onPress={handleSelectAllFavorites}
                className="flex-row items-center mx-4 mb-2 px-4 py-3 rounded-xl border"
                style={{
                  borderColor: GRANITE_GOLD,
                  backgroundColor: "rgba(152, 108, 66, 0.08)",
                }}
              >
                <Ionicons name="star" size={18} color={GRANITE_GOLD} />
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 14,
                    color: GRANITE_GOLD,
                    marginLeft: 8,
                    flex: 1,
                  }}
                >
                  Select All Favorites ({availableFavorites.length})
                </Text>
                <Ionicons name="chevron-forward" size={16} color={GRANITE_GOLD} />
              </Pressable>
            )}

            {/* Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
              style={{ flexGrow: 0 }}
            >
              {/* All chip */}
              <Pressable
                onPress={() => setSelectedCategory("all")}
                className="px-4 py-2 rounded-full"
                style={{
                  backgroundColor: selectedCategory === "all" ? DEEP_FOREST : CARD_BACKGROUND_LIGHT,
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 13,
                    color: selectedCategory === "all" ? PARCHMENT : TEXT_SECONDARY,
                  }}
                >
                  All
                </Text>
              </Pressable>

              {GEAR_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.value;
                const categoryCount = gearItems.filter((g) => g.category === cat.value).length;
                if (categoryCount === 0) return null;

                return (
                  <Pressable
                    key={cat.value}
                    onPress={() => setSelectedCategory(isActive ? "all" : cat.value)}
                    className="px-4 py-2 rounded-full"
                    style={{
                      backgroundColor: isActive ? DEEP_FOREST : CARD_BACKGROUND_LIGHT,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 13,
                        color: isActive ? PARCHMENT : TEXT_SECONDARY,
                      }}
                    >
                      {cat.label} ({categoryCount})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Content */}
            {loading ? (
              <View className="items-center justify-center py-12">
                <ActivityIndicator size="large" color={DEEP_FOREST} />
              </View>
            ) : gearItems.length === 0 ? (
              <View className="items-center justify-center py-12 px-6">
                <Ionicons name="cube-outline" size={48} color={EARTH_GREEN} />
                <Text
                  style={{
                    fontFamily: "Raleway_700Bold",
                    fontSize: 18,
                    color: DEEP_FOREST,
                    marginTop: 12,
                    textAlign: "center",
                  }}
                >
                  Your Gear Closet is empty
                </Text>
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 14,
                    color: TEXT_SECONDARY,
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  Add gear in the Gear tab to select from here
                </Text>
              </View>
            ) : filteredItems.length === 0 ? (
              <View className="items-center justify-center py-12 px-6">
                <Ionicons name="search-outline" size={40} color={TEXT_SECONDARY} />
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 15,
                    color: TEXT_SECONDARY,
                    marginTop: 12,
                    textAlign: "center",
                  }}
                >
                  No gear matches your search
                </Text>
                <Pressable
                  onPress={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  className="mt-4 px-4 py-2 rounded-lg"
                  style={{ backgroundColor: EARTH_GREEN }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 14,
                      color: PARCHMENT,
                    }}
                  >
                    Clear filters
                  </Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={filteredItems}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                renderItem={({ item }) => renderGearItem(item)}
                contentContainerStyle={{ paddingBottom: 40 }}
              />
            )}
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
