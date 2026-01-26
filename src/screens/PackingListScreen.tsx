/**
 * Packing List Screen
 * Shows packing items for a selected trip with Firebase integration
 * Structure: /users/{userId}/trips/{tripId}/packingList/{itemId}
 */

import React, { useEffect, useState, useCallback } from "react";
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
import { RootStackParamList } from "../navigation/types";
import { PackingItem } from "../types/camping";
import {
  getPackingList,
  addPackingItem,
  updatePackingItem,
  togglePackingItem,
  deletePackingItem,
  generatePackingListFromTemplate,
} from "../api/packing-service";
import * as LocalPackingService from "../services/localPackingService";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  RIVER_ROCK,
  SIERRA_SKY,
  PARCHMENT,
  PARCHMENT_BORDER,
} from "../constants/colors";

type PackingListScreenRouteProp = RouteProp<RootStackParamList, "PackingList">;
type PackingListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "PackingList"
>;

const DEFAULT_CATEGORIES = [
  "Shelter",
  "Sleep System",
  "Kitchen",
  "Clothing",
  "Tools",
  "Safety and First Aid",
  "Personal Items",
  "Food and Kitchen",
  "Trip Specific",
];

export default function PackingListScreen() {
  const navigation = useNavigation<PackingListScreenNavigationProp>();
  const route = useRoute<PackingListScreenRouteProp>();
  const { tripId } = route.params;
  const { isGuest } = useUserStatus();

  const trip = useTripsStore((s) => s.getTripById(tripId));
  const userId = "demo_user_1"; // TODO: Get from auth

  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useLocalStorage, setUseLocalStorage] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(DEFAULT_CATEGORIES)
  );
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [filterPacked, setFilterPacked] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Add item form state
  const [newItemCategory, setNewItemCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemNotes, setNewItemNotes] = useState("");

  // Add category form state
  const [newCategoryName, setNewCategoryName] = useState("");

  // Load packing list
  const loadPackingList = useCallback(async () => {
    if (!trip) return;

    setLoading(true);
    setError(null);
    try {
      // Try Firebase first if not already using local storage
      if (!useLocalStorage) {
        try {
          const items = await getPackingList(userId, tripId);

          // If no items and trip has camping style, auto-generate
          if (items.length === 0 && trip.campingStyle) {
            await generatePackingListFromTemplate(userId, tripId, trip.campingStyle);
            const newItems = await getPackingList(userId, tripId);
            setPackingItems(newItems);
          } else {
            setPackingItems(items);
          }
          return; // Success with Firebase
        } catch (fbError: any) {
          console.log("Firebase error, falling back to local storage:", fbError);
          setUseLocalStorage(true);
        }
      }

      // Use local storage (fallback or already in local mode)
      const items = await LocalPackingService.getPackingList(tripId);

      // If no items and trip has camping style, auto-generate
      if (items.length === 0 && trip.campingStyle) {
        await LocalPackingService.generatePackingListFromTemplate(tripId, trip.campingStyle);
        const newItems = await LocalPackingService.getPackingList(tripId);
        setPackingItems(newItems);
      } else {
        setPackingItems(items);
      }
    } catch (error: any) {
      console.error("Failed to load packing list:", error);
      setError("Unable to load packing list. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId, tripId, trip, useLocalStorage]);

  useEffect(() => {
    loadPackingList();
  }, [loadPackingList]);

  const handleTogglePacked = async (item: PackingItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic update
    setPackingItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isPacked: !i.isPacked } : i))
    );

    try {
      if (useLocalStorage) {
        await LocalPackingService.togglePackingItem(tripId, item.id, !item.isPacked);
      } else {
        await togglePackingItem(userId, tripId, item.id, !item.isPacked);
      }
    } catch (error) {
      console.error("Failed to toggle item:", error);
      // Revert on error
      setPackingItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isPacked: item.isPacked } : i))
      );
    }
  };

  const handleAddItem = async () => {
    if (!newItemLabel.trim()) return;

    // Gate: Login required to add items
    if (isGuest) {
      navigation.navigate("Auth" as any);
      return;
    }

    const quantity = parseInt(newItemQuantity) || 1;

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
        itemId = await addPackingItem(userId, tripId, newItem);
      }

      setPackingItems((prev) => [...prev, { ...newItem, id: itemId }]);

      // Reset form
      setNewItemLabel("");
      setNewItemQuantity("1");
      setNewItemNotes("");
      setShowNewCategoryInput(false);
      setNewCategoryName("");
      setShowAddItem(false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to add item:", error);
    }
  };

  const handleDeleteItem = async (item: PackingItem) => {
    try {
      if (useLocalStorage) {
        await LocalPackingService.deletePackingItem(tripId, item.id);
      } else {
        await deletePackingItem(userId, tripId, item.id);
      }
      setPackingItems((prev) => prev.filter((i) => i.id !== item.id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (!trip) {
    return null;
  }

  // Group items by category
  const categories = Array.from(new Set(packingItems.map((i) => i.category)));
  const itemsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = packingItems.filter((i) => i.category === cat);
    return acc;
  }, {} as Record<string, PackingItem[]>);

  // Calculate stats
  const totalItems = packingItems.length;
  const packedItems = packingItems.filter((i) => i.isPacked).length;
  const progress = totalItems > 0 ? (packedItems / totalItems) * 100 : 0;

  return (
    <>
      {/* Header with Deep Forest Background - extends to top */}
      <View style={{ backgroundColor: DEEP_FOREST }}>
        <SafeAreaView edges={["top"]} style={{ backgroundColor: DEEP_FOREST }}>
          <View className="px-5 pt-4 pb-3 border-b" style={{ borderColor: PARCHMENT }}>
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
                  style={{ fontFamily: "JosefinSlab_700Bold", color: PARCHMENT }}
                >
                  Packing List
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setEditMode(!editMode);
                  }}
                  className="active:opacity-70"
                >
                  <Text
                    className="text-base"
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      color: editMode ? GRANITE_GOLD : PARCHMENT
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
              For: {trip.name}
            </Text>

            {/* Progress bar */}
            <View className="mt-3">
              <View className="flex-row justify-between mb-1">
                <Text
                  className="text-xs"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                >
                  {packedItems} of {totalItems} packed
                </Text>
                <Text
                  className="text-xs"
                  style={{ fontFamily: "SourceSans3_400Regular", color: PARCHMENT }}
                >
                  {Math.round(progress)}%
                </Text>
              </View>
              <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(229, 220, 192, 0.3)" }}>
                <View
                  className="h-full rounded-full"
                  style={{ width: `${progress}%`, backgroundColor: GRANITE_GOLD }}
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <SafeAreaView className="flex-1 bg-parchment" edges={["bottom"]}>

      {/* Controls */}
      <View className="px-5 py-3 flex-row items-center justify-between border-b border-parchmentDark">
        <View className="flex-row gap-2">
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
        </View>

        <Pressable
          onPress={() => setFilterPacked(!filterPacked)}
          className="border border-parchmentDark rounded-xl px-3 py-2 active:opacity-70"
        >
          <Text
            className="text-xs"
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              color: filterPacked ? GRANITE_GOLD : DEEP_FOREST,
            }}
          >
            {filterPacked ? "All" : "Unpacked"}
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
            style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
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
              style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
            >
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5">
          {categories.length === 0 ? (
            <View className="flex-1 items-center justify-center py-12">
              <Ionicons name="bag-outline" size={48} color={EARTH_GREEN} />
              <Text
                className="mt-3 mb-1 text-center"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
              >
                No items yet
              </Text>
              <Text
                className="text-center"
                style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
              >
                Add items to start packing
              </Text>
            </View>
          ) : (
            categories.map((category) => {
              const items = itemsByCategory[category] || [];
              const visibleItems = filterPacked
                ? items.filter((i) => !i.isPacked)
                : items;

              if (visibleItems.length === 0 && filterPacked) return null;

              const isExpanded = expandedCategories.has(category);
              const categoryPacked = items.filter((i) => i.isPacked).length;

              return (
                <View key={category} className="mt-4">
                  {/* Category Header */}
                  <Pressable
                    onPress={() => toggleCategory(category)}
                    className="flex-row items-center justify-between py-2 active:opacity-70"
                  >
                    <View className="flex-row items-center flex-1">
                      <Ionicons
                        name={isExpanded ? "chevron-down" : "chevron-forward"}
                        size={20}
                        color={DEEP_FOREST}
                      />
                      <Text
                        className="ml-2 text-base font-bold"
                        style={{
                          fontFamily: "JosefinSlab_700Bold",
                          color: DEEP_FOREST,
                        }}
                      >
                        {category}
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
                        onPress={(e) => {
                          e.stopPropagation();
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setNewItemCategory(category);
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
                        className="flex-row items-center py-3 border-b border-parchmentDark active:opacity-70"
                      >
                        {/* Checkbox */}
                        <View className="mr-3">
                          <View
                            className={`w-6 h-6 rounded border-2 ${
                              item.isPacked
                                ? "bg-forest border-forest"
                                : "bg-transparent border-parchmentDark"
                            } items-center justify-center`}
                          >
                            {item.isPacked && (
                              <Ionicons name="checkmark" size={16} color={PARCHMENT} />
                            )}
                          </View>
                        </View>

                        {/* Item Info */}
                        <View className="flex-1">
                          <Text
                            className={item.isPacked ? "line-through" : ""}
                            style={{
                              fontFamily: "SourceSans3_400Regular",
                              color: item.isPacked ? EARTH_GREEN : DEEP_FOREST,
                            }}
                          >
                            {item.label}
                            {item.quantity > 1 && ` (${item.quantity})`}
                          </Text>
                          {item.notes && (
                            <Text
                              className="text-xs mt-1"
                              style={{
                                fontFamily: "SourceSans3_400Regular",
                                color: EARTH_GREEN,
                              }}
                            >
                              {item.notes}
                            </Text>
                          )}
                        </View>

                        {/* Delete/Remove */}
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
                                color: "#dc2626"
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
                              <Ionicons name="trash-outline" size={18} color="#dc2626" />
                            </Pressable>
                          )
                        )}
                      </Pressable>
                    ))}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Add Item Modal */}
      <Modal
        visible={showAddItem}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowAddItem(false);
          setShowNewCategoryInput(false);
          setNewCategoryName("");
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <Pressable
            className="flex-1 bg-black/50 justify-end"
            onPress={() => {
              setShowAddItem(false);
              setShowNewCategoryInput(false);
              setNewCategoryName("");
            }}
          >
            <Pressable
              className="bg-parchment rounded-t-2xl p-6"
              onPress={(e) => e.stopPropagation()}
            >
              <Text
                className="text-xl font-bold mb-4"
                style={{ fontFamily: "JosefinSlab_700Bold", color: DEEP_FOREST }}
              >
                Add Item
              </Text>

              <View className="flex-row items-center justify-between mb-2">
                <Text
                  className="text-sm"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                >
                  Category
                </Text>
                <Pressable
                  onPress={() => setShowNewCategoryInput(!showNewCategoryInput)}
                  className="flex-row items-center gap-1 px-2 py-1 rounded-lg active:opacity-70"
                  style={{ backgroundColor: showNewCategoryInput ? "#f0f9f4" : "transparent" }}
                >
                  <Ionicons name="add-circle-outline" size={16} color={EARTH_GREEN} />
                  <Text
                    className="text-xs"
                    style={{ fontFamily: "SourceSans3_600SemiBold", color: EARTH_GREEN }}
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
                    className="bg-white border border-parchmentDark rounded-xl px-4 py-3 mb-2"
                    style={{ fontFamily: "SourceSans3_400Regular", color: DEEP_FOREST }}
                    placeholderTextColor={EARTH_GREEN}
                    autoFocus
                  />
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => {
                        setShowNewCategoryInput(false);
                        setNewCategoryName("");
                      }}
                      className="flex-1 border border-parchmentDark rounded-lg py-2 active:opacity-70"
                    >
                      <Text
                        className="text-center text-xs"
                        style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                      >
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        if (newCategoryName.trim()) {
                          setNewItemCategory(newCategoryName.trim());
                          setShowNewCategoryInput(false);
                          setNewCategoryName("");
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                      }}
                      className="flex-1 bg-forest rounded-lg py-2 active:opacity-90"
                    >
                      <Text
                        className="text-center text-xs"
                        style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
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
                    className="flex-row gap-2"
                  >
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <Pressable
                        key={cat}
                        onPress={() => setNewItemCategory(cat)}
                        className={`px-3 py-2 rounded-xl border ${
                          newItemCategory === cat
                            ? "bg-forest border-forest"
                            : "bg-white border-parchmentDark"
                        }`}
                      >
                        <Text
                          className="text-xs"
                          style={{
                            fontFamily: "SourceSans3_600SemiBold",
                            color: newItemCategory === cat ? PARCHMENT : DEEP_FOREST,
                          }}
                        >
                          {cat}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text
                className="text-sm mb-2"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
              >
                Item Name
              </Text>
              <TextInput
                value={newItemLabel}
                onChangeText={setNewItemLabel}
                placeholder="Enter item name"
                className="bg-white border border-parchmentDark rounded-xl px-4 py-3 mb-4"
                style={{ fontFamily: "SourceSans3_400Regular", color: DEEP_FOREST }}
                placeholderTextColor={EARTH_GREEN}
              />

              <Text
                className="text-sm mb-2"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
              >
                Quantity
              </Text>
              <TextInput
                value={newItemQuantity}
                onChangeText={setNewItemQuantity}
                placeholder="1"
                keyboardType="number-pad"
                className="bg-white border border-parchmentDark rounded-xl px-4 py-3 mb-4"
                style={{ fontFamily: "SourceSans3_400Regular", color: DEEP_FOREST }}
                placeholderTextColor={EARTH_GREEN}
              />

              <Text
                className="text-sm mb-2"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
              >
                Notes (optional)
              </Text>
              <TextInput
                value={newItemNotes}
                onChangeText={setNewItemNotes}
                placeholder="Add notes"
                multiline
                numberOfLines={2}
                className="bg-white border border-parchmentDark rounded-xl px-4 py-3 mb-6"
                style={{ fontFamily: "SourceSans3_400Regular", color: DEEP_FOREST }}
                placeholderTextColor={EARTH_GREEN}
              />

              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => {
                    setShowAddItem(false);
                    setShowNewCategoryInput(false);
                    setNewCategoryName("");
                  }}
                  className="flex-1 border border-parchmentDark rounded-xl py-3 active:opacity-70"
                >
                  <Text
                    className="text-center"
                    style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleAddItem}
                  className="flex-1 bg-forest rounded-xl py-3 active:opacity-90"
                >
                  <Text
                    className="text-center"
                    style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                  >
                    Add
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>


      </SafeAreaView>
    </>
  );
}
