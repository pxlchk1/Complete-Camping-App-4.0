/**
 * 🚫 LOCKED UX: PACKING LIST (DO NOT REFACTOR BEHAVIOR)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * This screen displays the packing list for a specific trip.
 * 
 * PROHIBITED CHANGES:
 * - Do not auto-seed items on screen mount
 * - Do not create empty category shells
 * - Do not change the intent-based routing behavior
 * - Do not modify the canonical category key system
 * 
 * REQUIRED BEHAVIOR:
 * - intent="build": Show builder UI (no auto-seed)
 * - intent="view": Load existing items only
 * - Only show categories that have items (no 0/0)
 * - Use categoryKey from canonical enum
 * - Derive labels using getCategoryLabel()
 * 
 * Firestore path: /users/{userId}/trips/{tripId}/packingList/{itemId}
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTripsStore } from "../state/tripsStore";
import { useUserStatus } from "../utils/authHelper";
import AccountButton from "../components/AccountButton";
import { requirePro } from "../utils/gating";
import AccountRequiredModal from "../components/AccountRequiredModal";
import { RootStackParamList } from "../navigation/types";
import { PackingItem } from "../types/camping";
import { TripPackingItem, PackingSuggestion, PackingCategoryGroup } from "../types/packingLibrary";
import {
  getPackingList,
  addPackingItem,
  togglePackingItem,
  deletePackingItem,
  generatePackingListFromTemplate,
} from "../api/packing-service";
import * as LocalPackingService from "../services/localPackingService";
import * as PackingV2 from "../services/packingListServiceV2";
import { auth } from "../config/firebase";
import { 
  getCategoryLabel as getCanonicalCategoryLabel, 
  normalizeCategoryKey,
  getCategoryIcon,
  getCategoryOrder,
  PACK_CATEGORIES,
} from "../constants/packingCategories";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  PARCHMENT,
} from "../constants/colors";

type PackingListScreenRouteProp = RouteProp<RootStackParamList, "PackingList">;
type PackingListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "PackingList"
>;

// Default expanded categories (using canonical keys)
const DEFAULT_EXPANDED_CATEGORIES = [
  "shelter",
  "sleep",
  "kitchen",
  "clothing",
  "tools",
  "safety",
  "personal",
  "tripSpecific",
];

/**
 * Determine weather conditions based on trip start date and camping style
 * Used to add seasonal packing items (cold weather gear, rain gear, etc.)
 */
function determineWeatherConditions(
  startDate?: string,
  campingStyle?: string
): { isCold: boolean; isRainy: boolean; isHot: boolean } {
  const conditions = {
    isCold: false,
    isRainy: false,
    isHot: false,
  };

  // If camping style is explicitly WINTER, mark as cold
  if (campingStyle === "WINTER") {
    conditions.isCold = true;
    return conditions;
  }

  // Determine conditions based on trip start date
  if (startDate) {
    try {
      const date = new Date(startDate);
      const month = date.getMonth(); // 0-11

      // Winter months (December, January, February) - cold weather
      if (month === 11 || month === 0 || month === 1) {
        conditions.isCold = true;
      }
      // Spring months (March, April, May) - can be rainy
      else if (month >= 2 && month <= 4) {
        conditions.isRainy = true;
        // Early spring can still be cold
        if (month === 2) {
          conditions.isCold = true;
        }
      }
      // Summer months (June, July, August) - hot weather
      else if (month >= 5 && month <= 7) {
        conditions.isHot = true;
      }
      // Fall months (September, October, November) - can be rainy and cool
      else if (month >= 8 && month <= 10) {
        conditions.isRainy = true;
        // Late fall is cold
        if (month >= 9) {
          conditions.isCold = true;
        }
      }
    } catch (e) {
      console.warn("Error parsing trip date for weather conditions:", e);
    }
  }

  return conditions;
}

export default function PackingListScreen() {
  const navigation = useNavigation<PackingListScreenNavigationProp>();
  const route = useRoute<PackingListScreenRouteProp>();
  const { tripId, intent = "view" } = route.params;
  const { isGuest } = useUserStatus();

  const trip = useTripsStore((s) => s.getTripById(tripId));
  const userId = auth.currentUser?.uid || "demo_user_1"; // Fallback for guests

  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useLocalStorage, setUseLocalStorage] = useState(false);
  
  // V2: Suggestions state
  const [suggestions, setSuggestions] = useState<PackingSuggestion[]>([]);
  // Show suggestions by default in build mode, collapsed in view mode
  const [showSuggestions, setShowSuggestions] = useState(intent === "build");
  const [isInitializing, setIsInitializing] = useState(false);

  const [showAddItem, setShowAddItem] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(DEFAULT_EXPANDED_CATEGORIES)
  );
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [filterUnpackedOnly, setFilterUnpackedOnly] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Gating modal state
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Add item form state
  const [newItemCategory, setNewItemCategory] = useState(PACK_CATEGORIES[0].key);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemNotes, setNewItemNotes] = useState("");

  // Add category form state
  const [newCategoryName, setNewCategoryName] = useState("");

  // V2: Build categories from items using categoryKey (normalized)
  // Only categories with items are included - NO empty categories
  const categoryGroups = useMemo(() => {
    if (!packingItems.length) return [];
    return PackingV2.groupItemsByCategory(
      packingItems.map(item => ({
        id: item.id,
        name: item.label,
        categoryId: normalizeCategoryKey(item.category),
        qty: item.quantity || 1,
        isPacked: item.isPacked,
        source: (item as any).source || "base",
        libraryItemId: (item as any).libraryItemId,
        addedReason: (item as any).addedReason,
      }))
    );
  }, [packingItems]);

  // Derive categories ONLY from items that exist - NO empty categories
  const categories = useMemo(() => {
    // Get unique normalized category keys from items
    const categoryKeys = new Set<string>();
    packingItems.forEach(item => {
      const key = normalizeCategoryKey(item.category);
      categoryKeys.add(key);
    });
    
    // Sort by canonical order
    return Array.from(categoryKeys).sort((a, b) => {
      return getCategoryOrder(a) - getCategoryOrder(b);
    });
  }, [packingItems]);

  // Group items by normalized categoryKey
  const itemsByCategory = useMemo(() => {
    return categories.reduce((acc, catKey) => {
      acc[catKey] = packingItems.filter(i => 
        normalizeCategoryKey(i.category) === catKey
      );
      return acc;
    }, {} as Record<string, PackingItem[]>);
  }, [categories, packingItems]);

  // Calculate stats
  const totalItems = packingItems.length;
  const packedItems = packingItems.filter((i) => i.isPacked).length;
  const progress = totalItems > 0 ? (packedItems / totalItems) * 100 : 0;

  const closeAddModalAndReset = useCallback(() => {
    setShowAddItem(false);
    setShowNewCategoryInput(false);
    setNewCategoryName("");
    setNewItemLabel("");
    setNewItemQuantity("1");
    setNewItemNotes("");
  }, []);

  // V2: Load suggestions based on trip context
  const loadSuggestions = useCallback(async () => {
    if (!trip) return;
    
    try {
      const result = await PackingV2.computeSuggestions(userId, tripId, trip);
      setSuggestions(result.suggestions);
      console.log(`[PackingV2] Loaded ${result.suggestions.length} suggestions for ${result.context.season} season, ${result.context.tempBand} temps`);
    } catch (err) {
      console.error("Error loading suggestions:", err);
      // Don't show error for suggestions - they're optional
    }
  }, [userId, tripId, trip]);

  // V2: Add a suggestion to the packing list
  const handleAddSuggestion = useCallback(async (suggestion: PackingSuggestion) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await PackingV2.addSuggestion(userId, tripId, suggestion, suggestion.reason);
      
      // Reload items and suggestions
      const items = await getPackingList(userId, tripId);
      setPackingItems(items);
      await loadSuggestions();
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("Error adding suggestion:", err);
    }
  }, [userId, tripId, loadSuggestions]);

  // V2: Dismiss a suggestion
  const handleDismissSuggestion = useCallback(async (libraryItemId: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await PackingV2.dismissSuggestion(userId, tripId, libraryItemId);
      
      // Remove from local state immediately
      setSuggestions(prev => prev.filter(s => s.id !== libraryItemId));
    } catch (err) {
      console.error("Error dismissing suggestion:", err);
    }
  }, [userId, tripId]);

  // V2: Add all suggestions at once
  const handleAddAllSuggestions = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      for (const suggestion of suggestions) {
        await PackingV2.addSuggestion(userId, tripId, suggestion, suggestion.reason);
      }
      
      // Reload items and suggestions
      const items = await getPackingList(userId, tripId);
      setPackingItems(items);
      setSuggestions([]);
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("Error adding all suggestions:", err);
    }
  }, [userId, tripId, suggestions]);

  // Load packing list - NO AUTO-SEEDING
  // Builder is the only path to create starter items
  const loadPackingList = useCallback(async () => {
    if (!trip) return;

    setLoading(true);
    setError(null);

    try {
      if (!useLocalStorage) {
        try {
          // Just load existing items - DO NOT auto-initialize
          const items = await getPackingList(userId, tripId);
          setPackingItems(items);
          
          // Load suggestions for user to optionally add
          await loadSuggestions();

          // Expand categories that have items
          setExpandedCategories((prev) => {
            const next = new Set(prev);
            items.forEach((i) => {
              const key = normalizeCategoryKey(i.category);
              next.add(key);
            });
            return next;
          });

          return;
        } catch (fbError: any) {
          console.log("Firebase error, falling back to local storage:", fbError);
          setUseLocalStorage(true);
        }
      }

      // Local storage fallback - also NO auto-seeding
      const items = await LocalPackingService.getPackingList(tripId);
      setPackingItems(items);

      setExpandedCategories((prev) => {
        const next = new Set(prev);
        items.forEach((i) => {
          const key = normalizeCategoryKey(i.category);
          next.add(key);
        });
        return next;
      });
    } catch (err: any) {
      console.error("Failed to load packing list:", err);
      setError("Unable to load packing list. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId, tripId, trip, useLocalStorage, loadSuggestions]);

  useEffect(() => {
    loadPackingList();
  }, [loadPackingList]);

  const handleTogglePacked = async (item: PackingItem) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore haptics failures
    }

    // Optimistic update
    setPackingItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isPacked: !i.isPacked } : i))
    );

    try {
      if (useLocalStorage) {
        await LocalPackingService.togglePackingItem(
          tripId,
          item.id,
          !item.isPacked
        );
      } else {
        try {
          await togglePackingItem(userId, tripId, item.id, !item.isPacked);
        } catch (fbError: any) {
          // If Firebase fails, switch and retry locally
          setUseLocalStorage(true);
          await LocalPackingService.togglePackingItem(
            tripId,
            item.id,
            !item.isPacked
          );
        }
      }
    } catch (err) {
      console.error("Failed to toggle item:", err);
      // Revert on error
      setPackingItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, isPacked: item.isPacked } : i
        )
      );
    }
  };

  const handleAddItem = async () => {
    if (!newItemLabel.trim()) return;

    // Gate: PRO required to add items
    if (!requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "packing_add_item", variant }),
    })) {
      return;
    }

    const quantity = Math.max(1, parseInt(newItemQuantity, 10) || 1);

    try {
      const newItem: Omit<PackingItem, "id"> = {
        category: newItemCategory,
        label: newItemLabel.trim(),
        quantity,
        isPacked: false,
        isAutoGenerated: false,
        notes: newItemNotes.trim() || undefined,
      };

      let itemId: string;
      if (useLocalStorage) {
        itemId = await LocalPackingService.addPackingItem(tripId, newItem);
      } else {
        try {
          itemId = await addPackingItem(userId, tripId, newItem);
        } catch (fbError: any) {
          setUseLocalStorage(true);
          itemId = await LocalPackingService.addPackingItem(tripId, newItem);
        }
      }

      setPackingItems((prev) => [...prev, { ...newItem, id: itemId }]);

      // Ensure category is visible and expanded
      setExpandedCategories((prev) => {
        const next = new Set(prev);
        next.add(newItem.category);
        return next;
      });

      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch {
        // ignore
      }

      closeAddModalAndReset();
    } catch (err) {
      console.error("Failed to add item:", err);
    }
  };

  const handleDeleteItem = async (item: PackingItem) => {
    // Gate: PRO required to delete items
    if (!requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "packing_delete_item", variant }),
    })) {
      return;
    }

    try {
      if (useLocalStorage) {
        await LocalPackingService.deletePackingItem(tripId, item.id);
      } else {
        try {
          await deletePackingItem(userId, tripId, item.id);
        } catch (fbError: any) {
          setUseLocalStorage(true);
          await LocalPackingService.deletePackingItem(tripId, item.id);
        }
      }

      setPackingItems((prev) => prev.filter((i) => i.id !== item.id));

      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch {
        // ignore
      }
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  if (!trip) return null;

  return (
    <>
      {/* Header with Deep Forest Background */}
      <View style={{ backgroundColor: DEEP_FOREST }}>
        <SafeAreaView edges={["top"]} style={{ backgroundColor: DEEP_FOREST }}>
          <View
            className="px-5 pt-4 pb-3 border-b"
            style={{ borderColor: PARCHMENT }}
          >
            <View className="flex-row items-center mb-2 justify-between">
              <View className="flex-row items-center flex-1">
                <Pressable
                  onPress={() => navigation.goBack()}
                  className="mr-2 active:opacity-70"
                >
                  <Ionicons name="arrow-back" size={24} color={PARCHMENT} />
                </Pressable>
                <Text
                  className="text-xl font-bold flex-1"
                  style={{
                    fontFamily: "Raleway_700Bold",
                    color: PARCHMENT,
                  }}
                  numberOfLines={1}
                >
                  {packingItems.length === 0 ? trip.name : "Packing List"}
                </Text>
              </View>

              <View className="flex-row items-center" style={{ gap: 12 }}>
                <Pressable
                  onPress={async () => {
                    try {
                      await Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light
                      );
                    } catch {
                      // ignore
                    }
                    setEditMode((v) => !v);
                  }}
                  className="active:opacity-70"
                >
                  <Text
                    className="text-base"
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      color: editMode ? GRANITE_GOLD : PARCHMENT,
                    }}
                  >
                    {editMode ? "Done" : "Edit"}
                  </Text>
                </Pressable>
                <AccountButton color={PARCHMENT} />
              </View>
            </View>

            <Text
              className="text-sm"
              style={{ fontFamily: "SourceSans3_400Regular", color: PARCHMENT }}
            >
              {packingItems.length === 0 
                ? "Build your packing list" 
                : `For: ${trip.name}`}
            </Text>

            {/* Progress bar */}
            <View className="mt-3">
              <View className="flex-row justify-between mb-1">
                <Text
                  className="text-xs"
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    color: PARCHMENT,
                  }}
                >
                  {packedItems} of {totalItems} packed
                </Text>
                <Text
                  className="text-xs"
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    color: PARCHMENT,
                  }}
                >
                  {Math.round(progress)}%
                </Text>
              </View>
              <View
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: "#FFFFFF" }}
              >
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: GRANITE_GOLD,
                  }}
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <SafeAreaView className="flex-1 bg-parchment" edges={["bottom"]}>
        {/* Controls */}
        <View className="px-5 py-3 flex-row items-center justify-between border-b border-stone-200">
          <Pressable
            onPress={() => setShowAddItem(true)}
            className="bg-forest rounded-xl px-4 py-2 flex-row items-center active:opacity-90"
          >
            <Ionicons name="add" size={18} color={PARCHMENT} />
            <Text
              className="ml-1"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
            >
              Add Item
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterUnpackedOnly((v) => !v)}
            className="border border-stone-300 rounded-xl px-3 py-2 active:opacity-70"
          >
            <Text
              className="text-xs"
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                color: filterUnpackedOnly ? GRANITE_GOLD : DEEP_FOREST,
              }}
            >
              {filterUnpackedOnly ? "All" : "Unpacked"}
            </Text>
          </Pressable>
        </View>

        {/* Packing List */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={DEEP_FOREST} />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-5">
            <Ionicons name="alert-circle-outline" size={64} color="#dc2626" />
            <Text
              className="mt-4 mb-2 text-center text-lg"
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                color: DEEP_FOREST,
              }}
            >
              Connection Error
            </Text>
            <Text
              className="text-center mb-6"
              style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
            >
              {error}
            </Text>
            <Pressable
              onPress={loadPackingList}
              className="bg-forest rounded-xl px-6 py-3 active:opacity-90"
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  color: PARCHMENT,
                }}
              >
                Retry
              </Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingBottom: 28 }}
          >
            {/* V2: Suggestions Section */}
            {suggestions.length > 0 && showSuggestions && (
              <View className="mt-4 mb-2 bg-amber-50 rounded-xl p-4 border border-amber-200">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Ionicons name="bulb-outline" size={20} color={GRANITE_GOLD} />
                    <Text
                      className="ml-2 text-base font-bold"
                      style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
                    >
                      Suggested for this trip
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setShowSuggestions(false)}
                    className="p-1 active:opacity-70"
                  >
                    <Ionicons name="close" size={18} color={EARTH_GREEN} />
                  </Pressable>
                </View>
                
                <Text
                  className="text-xs mb-3"
                  style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                >
                  Based on your trip dates and location
                </Text>

                {suggestions.slice(0, 6).map((suggestion) => (
                  <View
                    key={suggestion.id}
                    className="flex-row items-center justify-between py-2 border-b border-amber-100"
                  >
                    <View className="flex-1 mr-2">
                      <Text
                        className="text-sm"
                        style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                      >
                        {suggestion.name}
                      </Text>
                      <Text
                        className="text-xs"
                        style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                      >
                        {suggestion.reason}
                      </Text>
                    </View>
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <Pressable
                        onPress={() => handleDismissSuggestion(suggestion.id)}
                        className="p-2 active:opacity-70"
                      >
                        <Ionicons name="close-circle-outline" size={22} color={EARTH_GREEN} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleAddSuggestion(suggestion)}
                        className="bg-forest rounded-lg px-3 py-1.5 active:opacity-90"
                      >
                        <Text
                          className="text-xs"
                          style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                        >
                          Add
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}

                {suggestions.length > 1 && (
                  <Pressable
                    onPress={handleAddAllSuggestions}
                    className="mt-3 bg-forest rounded-lg py-2 items-center active:opacity-90"
                  >
                    <Text
                      className="text-sm"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                    >
                      Add All ({suggestions.length})
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Collapsed suggestions indicator */}
            {suggestions.length > 0 && !showSuggestions && (
              <Pressable
                onPress={() => setShowSuggestions(true)}
                className="mt-4 mb-2 bg-amber-50 rounded-xl p-3 flex-row items-center justify-between border border-amber-200 active:opacity-80"
              >
                <View className="flex-row items-center">
                  <Ionicons name="bulb-outline" size={18} color={GRANITE_GOLD} />
                  <Text
                    className="ml-2 text-sm"
                    style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                  >
                    {suggestions.length} suggestions available
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={EARTH_GREEN} />
              </Pressable>
            )}

            {categories.length === 0 ? (
              <View className="flex-1 items-center justify-center py-12">
                <Ionicons name="bag-outline" size={48} color={EARTH_GREEN} />
                <Text
                  className="mt-3 mb-1 text-center text-lg"
                  style={{
                    fontFamily: "Raleway_700Bold",
                    color: DEEP_FOREST,
                  }}
                >
                  {intent === "build" ? "Build Your Packing List" : "No items yet"}
                </Text>
                <Text
                  className="text-center px-8 mb-4"
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    color: EARTH_GREEN,
                  }}
                >
                  {intent === "build" 
                    ? "Add items using the + button or choose from our suggestions below."
                    : "Add items to start packing"}
                </Text>
                
                {/* Show prominent suggestions in build mode */}
                {intent === "build" && suggestions.length > 0 && (
                  <View className="w-full mt-4 bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <Text
                      className="text-base font-bold mb-3"
                      style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
                    >
                      Suggested starter items
                    </Text>
                    {suggestions.slice(0, 8).map((suggestion) => (
                      <View
                        key={suggestion.id}
                        className="flex-row items-center justify-between py-2 border-b border-amber-100"
                      >
                        <View className="flex-1 mr-2">
                          <Text
                            className="text-sm"
                            style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                          >
                            {suggestion.name}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleAddSuggestion(suggestion)}
                          className="bg-forest rounded-lg px-3 py-1.5 active:opacity-90"
                        >
                          <Text
                            className="text-xs"
                            style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                          >
                            Add
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                    {suggestions.length > 1 && (
                      <Pressable
                        onPress={handleAddAllSuggestions}
                        className="mt-3 bg-forest rounded-lg py-2 items-center active:opacity-90"
                      >
                        <Text
                          className="text-sm"
                          style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                        >
                          Add All Suggested Items ({suggestions.length})
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <>
                {categories.map((categoryKey) => {
                const items = itemsByCategory[categoryKey] || [];
                
                // Never show empty categories
                if (items.length === 0) return null;
                
                const visibleItems = filterUnpackedOnly
                  ? items.filter((i) => !i.isPacked)
                  : items;

                // If filtering and no visible items, skip this category
                if (visibleItems.length === 0 && filterUnpackedOnly) return null;

                const isExpanded = expandedCategories.has(categoryKey);
                const categoryPacked = items.filter((i) => i.isPacked).length;
                const categoryLabel = getCanonicalCategoryLabel(categoryKey);
                const categoryIcon = getCategoryIcon(categoryKey);

                return (
                  <View key={categoryKey} className="mt-4">
                    {/* Category Header */}
                    <Pressable
                      onPress={() => toggleCategory(categoryKey)}
                      className="flex-row items-center justify-between py-2 active:opacity-70"
                    >
                      <View className="flex-row items-center flex-1">
                        <Ionicons
                          name={isExpanded ? "chevron-down" : "chevron-forward"}
                          size={20}
                          color={DEEP_FOREST}
                        />
                        <Ionicons
                          name={categoryIcon as any}
                          size={18}
                          color={EARTH_GREEN}
                          style={{ marginLeft: 8 }}
                        />
                        <Text
                          className="ml-2 text-base font-bold"
                          style={{
                            fontFamily: "Raleway_700Bold",
                            color: DEEP_FOREST,
                          }}
                        >
                          {categoryLabel}
                        </Text>
                        <Text
                          className="ml-2 text-sm"
                          style={{
                            fontFamily: "SourceSans3_400Regular",
                            color: EARTH_GREEN,
                          }}
                        >
                          ({categoryPacked}/{items.length})
                        </Text>
                      </View>

                      {editMode && (
                        <Pressable
                          onPress={async (e) => {
                            e.stopPropagation();
                            try {
                              await Haptics.impactAsync(
                                Haptics.ImpactFeedbackStyle.Light
                              );
                            } catch {
                              // ignore
                            }
                            setNewItemCategory(categoryKey);
                            setShowAddItem(true);
                          }}
                          className="ml-2 bg-forest rounded-full p-1 active:opacity-90"
                        >
                          <Ionicons name="add" size={16} color={PARCHMENT} />
                        </Pressable>
                      )}
                    </Pressable>

                    {/* Items */}
                    {isExpanded &&
                      visibleItems.map((item) => (
                        <Pressable
                          key={item.id}
                          onPress={() => handleTogglePacked(item)}
                          className="flex-row items-center py-3 border-b border-stone-200 active:opacity-70"
                        >
                          {/* Checkbox */}
                          <View className="mr-3">
                            <View
                              className={`w-6 h-6 rounded border-2 ${
                                item.isPacked
                                  ? "bg-forest border-forest"
                                  : "bg-transparent border-stone-300"
                              } items-center justify-center`}
                            >
                              {item.isPacked && (
                                <Ionicons
                                  name="checkmark"
                                  size={16}
                                  color={PARCHMENT}
                                />
                              )}
                            </View>
                          </View>

                          {/* Item Info */}
                          <View className="flex-1">
                            <Text
                              className={item.isPacked ? "line-through" : ""}
                              style={{
                                fontFamily: "SourceSans3_400Regular",
                                color: item.isPacked
                                  ? EARTH_GREEN
                                  : DEEP_FOREST,
                              }}
                            >
                              {item.label}
                              {item.quantity > 1 ? ` (${item.quantity})` : ""}
                            </Text>
                            {item.notes ? (
                              <Text
                                className="text-xs mt-1"
                                style={{
                                  fontFamily: "SourceSans3_400Regular",
                                  color: EARTH_GREEN,
                                }}
                              >
                                {item.notes}
                              </Text>
                            ) : null}
                          </View>

                          {/* Remove */}
                          {editMode ? (
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item);
                              }}
                              className="ml-2 px-3 py-1 rounded-lg active:opacity-70"
                              style={{ backgroundColor: "#fee2e2" }}
                            >
                              <Text
                                className="text-sm"
                                style={{
                                  fontFamily: "SourceSans3_600SemiBold",
                                  color: "#dc2626",
                                }}
                              >
                                Remove
                              </Text>
                            </Pressable>
                          ) : (
                            !item.isAutoGenerated && (
                              <Pressable
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem(item);
                                }}
                                className="ml-2 p-2 active:opacity-70"
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={18}
                                  color="#dc2626"
                                />
                              </Pressable>
                            )
                          )}
                        </Pressable>
                      ))}
                  </View>
                );
              })}
              </>
            )}
          </ScrollView>
        )}

        {/* Add Item Modal */}
        <Modal
          visible={showAddItem}
          transparent
          animationType="fade"
          onRequestClose={closeAddModalAndReset}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            <Pressable
              className="flex-1 bg-black/50 justify-end"
              onPress={closeAddModalAndReset}
            >
              <Pressable
                className="bg-parchment rounded-t-2xl p-6"
                onPress={(e) => e.stopPropagation()}
              >
                <Text
                  className="text-xl font-bold mb-4"
                  style={{
                    fontFamily: "Raleway_700Bold",
                    color: DEEP_FOREST,
                  }}
                >
                  Add Item
                </Text>

                <View className="flex-row items-center justify-between mb-2">
                  <Text
                    className="text-sm"
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      color: DEEP_FOREST,
                    }}
                  >
                    Category
                  </Text>

                  <Pressable
                    onPress={() => setShowNewCategoryInput((v) => !v)}
                    className="flex-row items-center px-2 py-1 rounded-lg active:opacity-70"
                    style={{
                      backgroundColor: showNewCategoryInput
                        ? "#f0f9f4"
                        : "transparent",
                      gap: 6,
                    }}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={16}
                      color={EARTH_GREEN}
                    />
                    <Text
                      className="text-xs"
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        color: EARTH_GREEN,
                      }}
                    >
                      New Category
                    </Text>
                  </Pressable>
                </View>

                {showNewCategoryInput ? (
                  <View className="mb-4">
                    <TextInput
                      value={newCategoryName}
                      onChangeText={setNewCategoryName}
                      placeholder="Enter new category name"
                      className="bg-white border border-stone-300 rounded-xl px-4 py-3 mb-2"
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        color: DEEP_FOREST,
                      }}
                      placeholderTextColor="#6b7280"
                      autoFocus
                    />

                    <View className="flex-row" style={{ gap: 8 }}>
                      <Pressable
                        onPress={() => {
                          setShowNewCategoryInput(false);
                          setNewCategoryName("");
                        }}
                        className="flex-1 border border-stone-300 rounded-lg py-2 active:opacity-70"
                      >
                        <Text
                          className="text-center text-xs"
                          style={{
                            fontFamily: "SourceSans3_600SemiBold",
                            color: DEEP_FOREST,
                          }}
                        >
                          Cancel
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={async () => {
                          const name = newCategoryName.trim();
                          if (!name) return;

                          setNewItemCategory(name);
                          setShowNewCategoryInput(false);
                          setNewCategoryName("");

                          // Make it visible immediately
                          setExpandedCategories((prev) => {
                            const next = new Set(prev);
                            next.add(name);
                            return next;
                          });

                          try {
                            await Haptics.notificationAsync(
                              Haptics.NotificationFeedbackType.Success
                            );
                          } catch {
                            // ignore
                          }
                        }}
                        className="flex-1 bg-forest rounded-lg py-2 active:opacity-90"
                      >
                        <Text
                          className="text-center text-xs"
                          style={{
                            fontFamily: "SourceSans3_600SemiBold",
                            color: PARCHMENT,
                          }}
                        >
                          Create Category
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View className="mb-4">
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {PACK_CATEGORIES.map((cat) => (
                        <Pressable
                          key={cat.key}
                          onPress={() => setNewItemCategory(cat.key)}
                          className={`px-3 py-2 rounded-xl border ${
                            newItemCategory === cat.key
                              ? "bg-forest border-forest"
                              : "bg-white border-stone-300"
                          }`}
                        >
                          <Text
                            className="text-xs"
                            style={{
                              fontFamily: "SourceSans3_600SemiBold",
                              color:
                                newItemCategory === cat.key
                                  ? PARCHMENT
                                  : DEEP_FOREST,
                            }}
                          >
                            {cat.label}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Text
                  className="text-sm mb-2"
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    color: DEEP_FOREST,
                  }}
                >
                  Item Name
                </Text>
                <TextInput
                  value={newItemLabel}
                  onChangeText={setNewItemLabel}
                  placeholder="Enter item name"
                  className="bg-white border border-stone-300 rounded-xl px-4 py-3 mb-4"
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    color: DEEP_FOREST,
                  }}
                  placeholderTextColor="#6b7280"
                />

                <Text
                  className="text-sm mb-2"
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    color: DEEP_FOREST,
                  }}
                >
                  Quantity
                </Text>
                <TextInput
                  value={newItemQuantity}
                  onChangeText={setNewItemQuantity}
                  placeholder="1"
                  keyboardType="number-pad"
                  className="bg-white border border-stone-300 rounded-xl px-4 py-3 mb-4"
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    color: DEEP_FOREST,
                  }}
                  placeholderTextColor="#6b7280"
                />

                <Text
                  className="text-sm mb-2"
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    color: DEEP_FOREST,
                  }}
                >
                  Notes (optional)
                </Text>
                <TextInput
                  value={newItemNotes}
                  onChangeText={setNewItemNotes}
                  placeholder="Add notes"
                  multiline
                  numberOfLines={2}
                  className="bg-white border border-stone-300 rounded-xl px-4 py-3 mb-6"
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    color: DEEP_FOREST,
                  }}
                  placeholderTextColor="#6b7280"
                />

                <View className="flex-row" style={{ gap: 12 }}>
                  <Pressable
                    onPress={closeAddModalAndReset}
                    className="flex-1 border border-stone-300 rounded-xl py-3 active:opacity-70"
                  >
                    <Text
                      className="text-center"
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        color: DEEP_FOREST,
                      }}
                    >
                      Cancel
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleAddItem}
                    className="flex-1 bg-forest rounded-xl py-3 active:opacity-90"
                    style={{ opacity: newItemLabel.trim() ? 1 : 0.6 }}
                    disabled={!newItemLabel.trim()}
                  >
                    <Text
                      className="text-center"
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        color: PARCHMENT,
                      }}
                    >
                      Add
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>

        {/* Gating Modals */}
        <AccountRequiredModal
          visible={showAccountModal}
          onCreateAccount={() => {
            setShowAccountModal(false);
            navigation.navigate("Auth" as any);
          }}
          onMaybeLater={() => setShowAccountModal(false)}
        />
      </SafeAreaView>
    </>
  );
}
