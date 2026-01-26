/**
 * Packing List Detail Screen V2
 * The main packing experience - category-based list with progress tracking
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";
import {
  PackingItemV2,
  PackingCategory,
  PACKING_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  PackingFilter,
  calculateProgress,
} from "../types/packingV2";
import {
  getTripPackingItems,
  getTripPackingList,
  toggleItemPacked,
  deletePackingItem,
  groupItemsByCategory,
  getCategoryProgress,
  filterItems,
  resetPackingList,
} from "../services/packingServiceV2";
import { useTrips } from "../state/tripsStore";
import { useSubscriptionStore } from "../state/subscriptionStore";
import { useAuth } from "../context/AuthContext";
import { requirePro } from "../utils/gating";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  GRANITE_GOLD,
  CARD_BACKGROUND_LIGHT,
} from "../constants/colors";
import AddEditPackingItemModal from "../components/AddEditPackingItemModal";
import GearClosetPickerModal from "../components/GearClosetPickerModal";
import SaveTemplateModal from "../components/SaveTemplateModal";

type PackingListDetailRouteProp = RouteProp<RootStackParamList, "PackingList">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PackingListDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PackingListDetailRouteProp>();
  const { tripId } = route.params;
  const { user } = useAuth();
  const trips = useTrips();
  const isPro = useSubscriptionStore((s) => s.isPro);

  const trip = useMemo(() => trips.find((t) => t.id === tripId), [trips, tripId]);

  // State
  const [items, setItems] = useState<PackingItemV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<PackingCategory>>(
    new Set(PACKING_CATEGORIES)
  );
  const [activeFilter, setActiveFilter] = useState<PackingFilter>("all");

  // Modal state
  const [showAddItem, setShowAddItem] = useState(false);
  const [showGearCloset, setShowGearCloset] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [editingItem, setEditingItem] = useState<PackingItemV2 | null>(null);
  const [addToCategory, setAddToCategory] = useState<PackingCategory | undefined>();

  // Pro gating check for customization actions
  const checkProForCustomization = useCallback((): boolean => {
    if (isPro) return true;
    
    // Show PaywallModal for non-Pro users (with tracking via requirePro)
    // Note: requirePro handles the async tracking internally
    return requirePro({
      openAccountModal: () => {}, // Not used for Pro gates
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "packing_customization", variant }),
    });
  }, [isPro, navigation]);

  // Load items
  const loadItems = useCallback(async () => {
    if (!user?.id) return;

    try {
      const loadedItems = await getTripPackingItems(user.id, tripId);
      setItems(loadedItems);
    } catch (error) {
      console.error("[PackingListDetail] Error loading items:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, tripId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadItems();
  }, [loadItems]);

  // Toggle category expansion
  const toggleCategory = (category: PackingCategory) => {
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

  // Toggle item packed
  const handleTogglePacked = async (item: PackingItemV2) => {
    if (!user?.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isPacked: !i.isPacked } : i))
    );

    try {
      await toggleItemPacked(user.id, tripId, item.id, !item.isPacked);
    } catch (error) {
      // Revert on error
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isPacked: item.isPacked } : i))
      );
    }
  };

  // Delete item - REQUIRES PRO
  const handleDeleteItem = async (item: PackingItemV2) => {
    if (!user?.id) return;
    
    // Pro gating for customization
    if (!checkProForCustomization()) return;

    Alert.alert("Delete Item", `Remove "${item.name}" from your packing list?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setItems((prev) => prev.filter((i) => i.id !== item.id));
          try {
            await deletePackingItem(user.id, tripId, item.id);
          } catch (error) {
            loadItems(); // Reload on error
          }
        },
      },
    ]);
  };

  // Edit item - REQUIRES PRO
  const handleEditItem = (item: PackingItemV2) => {
    // Pro gating for customization
    if (!checkProForCustomization()) return;
    
    setEditingItem(item);
    setShowAddItem(true);
  };

  // Add item to category - REQUIRES PRO
  const handleAddToCategory = (category: PackingCategory) => {
    // Pro gating for customization
    if (!checkProForCustomization()) return;
    
    setAddToCategory(category);
    setEditingItem(null);
    setShowAddItem(true);
  };

  // Reset list
  const handleResetList = () => {
    Alert.alert(
      "Reset Packing List",
      "Mark all items as unpacked?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: async () => {
            if (!user?.id) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setItems((prev) => prev.map((i) => ({ ...i, isPacked: false })));
            await resetPackingList(user.id, tripId);
          },
        },
      ]
    );
  };

  // Save as template - REQUIRES PRO
  const handleSaveAsTemplate = () => {
    // Pro gating for customization
    if (!checkProForCustomization()) return;
    
    if (items.length === 0) {
      Alert.alert("No Items", "Add items to your packing list before saving as a template.");
      return;
    }
    setShowSaveTemplate(true);
  };

  // More menu
  const handleMoreMenu = () => {
    Alert.alert(
      "Packing List Options",
      undefined,
      [
        { 
          text: "Save as Template", 
          onPress: handleSaveAsTemplate,
        },
        { text: "Reset to Unpacked", onPress: handleResetList },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  // Calculate totals
  const filteredItems = useMemo(
    () => filterItems(items, activeFilter),
    [items, activeFilter]
  );

  const groupedItems = useMemo(
    () => groupItemsByCategory(filteredItems),
    [filteredItems]
  );

  const totalPacked = items.filter((i) => i.isPacked).length;
  const totalItems = items.length;
  const progress = calculateProgress(totalPacked, totalItems);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <View className="flex-1 bg-parchment items-center justify-center">
        <ActivityIndicator size="large" color={DEEP_FOREST} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-parchment">
      {/* Header */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: DEEP_FOREST }}>
        <View
          style={{
            paddingTop: 8,
            paddingHorizontal: 20,
            paddingBottom: 16,
            backgroundColor: DEEP_FOREST,
          }}
        >
          {/* Top Row */}
          <View className="flex-row items-center justify-between mb-3">
            <Pressable
              onPress={() => navigation.goBack()}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              <Ionicons name="arrow-back" size={20} color={PARCHMENT} />
            </Pressable>

            <View className="flex-1 mx-4">
              <Text
                style={{
                  fontFamily: "Raleway_700Bold",
                  fontSize: 18,
                  color: PARCHMENT,
                  textAlign: "center",
                }}
                numberOfLines={1}
              >
                Packing List
              </Text>
              {trip && (
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.7)",
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  {trip.name}
                </Text>
              )}
            </View>

            <Pressable
              onPress={handleMoreMenu}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={PARCHMENT} />
            </Pressable>
          </View>

          {/* Progress Bar */}
          <View>
            <View className="flex-row justify-between mb-1">
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 13,
                  color: PARCHMENT,
                }}
              >
                {totalPacked} of {totalItems} packed
              </Text>
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {progress}%
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

      {/* Filters */}
      <View className="px-4 py-3 border-b" style={{ borderColor: BORDER_SOFT }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {(["all", "unpacked", "packed", "essentials", "gear-linked"] as PackingFilter[]).map(
            (filter) => {
              const isActive = activeFilter === filter;
              const labels: Record<PackingFilter, string> = {
                all: "All",
                unpacked: "Unpacked",
                packed: "Packed",
                essentials: "Essentials",
                "gear-linked": "Gear-linked",
              };
              const icons: Record<PackingFilter, string | null> = {
                all: null,
                unpacked: null,
                packed: null,
                essentials: null,
                "gear-linked": "cube",
              };
              return (
                <Pressable
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  className={`px-4 py-2 rounded-full border flex-row items-center ${
                    isActive
                      ? "bg-forest border-forest"
                      : "bg-parchment border-parchmentDark"
                  }`}
                >
                  {icons[filter] && (
                    <Ionicons
                      name={icons[filter] as any}
                      size={12}
                      color={isActive ? PARCHMENT : DEEP_FOREST}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 13,
                      color: isActive ? PARCHMENT : DEEP_FOREST,
                    }}
                  >
                    {labels[filter]}
                  </Text>
                </Pressable>
              );
            }
          )}
        </ScrollView>
      </View>

      {/* Items List */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {PACKING_CATEGORIES.map((category) => {
          const categoryItems = groupedItems.get(category) || [];
          if (categoryItems.length === 0) return null;

          const isExpanded = expandedCategories.has(category);
          const { packed, total } = getCategoryProgress(categoryItems);

          return (
            <View key={category} className="border-b" style={{ borderColor: BORDER_SOFT }}>
              {/* Category Header */}
              <Pressable
                onPress={() => toggleCategory(category)}
                className="flex-row items-center justify-between px-4 py-3"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
              >
                <View className="flex-row items-center flex-1">
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: DEEP_FOREST }}
                  >
                    <Ionicons
                      name={CATEGORY_ICONS[category] as any}
                      size={16}
                      color={PARCHMENT}
                    />
                  </View>
                  <Text
                    style={{
                      fontFamily: "Raleway_700Bold",
                      fontSize: 15,
                      color: DEEP_FOREST,
                      flex: 1,
                    }}
                  >
                    {CATEGORY_LABELS[category]}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 13,
                      color: TEXT_SECONDARY,
                      marginRight: 8,
                    }}
                  >
                    {packed}/{total}
                  </Text>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={EARTH_GREEN}
                  />
                </View>
              </Pressable>

              {/* Category Items */}
              {isExpanded && (
                <View>
                  {categoryItems.map((item) => (
                    <PackingItemRow
                      key={item.id}
                      item={item}
                      onToggle={() => handleTogglePacked(item)}
                      onEdit={() => handleEditItem(item)}
                      onDelete={() => handleDeleteItem(item)}
                    />
                  ))}

                  {/* Add item to category */}
                  <Pressable
                    onPress={() => handleAddToCategory(category)}
                    className="flex-row items-center px-4 py-3"
                    style={{ paddingLeft: 60 }}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={EARTH_GREEN} />
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 14,
                        color: EARTH_GREEN,
                        marginLeft: 8,
                      }}
                    >
                      Add item
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}

        {/* Empty state for filtered view */}
        {filteredItems.length === 0 && items.length > 0 && (
          <View className="items-center justify-center py-12 px-6">
            <Ionicons name="checkmark-circle" size={48} color={EARTH_GREEN} />
            <Text
              style={{
                fontFamily: "Raleway_700Bold",
                fontSize: 18,
                color: DEEP_FOREST,
                marginTop: 12,
                textAlign: "center",
              }}
            >
              {activeFilter === "packed"
                ? "Nothing packed yet"
                : activeFilter === "unpacked"
                ? "All packed!"
                : "No items match this filter"}
            </Text>
          </View>
        )}

        {/* Empty state for no items */}
        {items.length === 0 && (
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
              No packing list yet
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
              Generate a list or start adding items manually
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: PARCHMENT }}>
        <View
          className="flex-row items-center justify-around px-4 py-3 border-t"
          style={{ borderColor: BORDER_SOFT }}
        >
          <Pressable
            onPress={() => {
              // Pro gating for adding items
              if (!checkProForCustomization()) return;
              setAddToCategory(undefined);
              setEditingItem(null);
              setShowAddItem(true);
            }}
            className="flex-row items-center px-4 py-2 rounded-xl"
            style={{ backgroundColor: DEEP_FOREST }}
          >
            <Ionicons name="add" size={20} color={PARCHMENT} />
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 14,
                color: PARCHMENT,
                marginLeft: 6,
              }}
            >
              Add Item
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              // Pro gating for adding from gear closet
              if (!checkProForCustomization()) return;
              setShowGearCloset(true);
            }}
            className="flex-row items-center px-4 py-2 rounded-xl border"
            style={{ borderColor: DEEP_FOREST }}
          >
            <Ionicons name="cube-outline" size={20} color={DEEP_FOREST} />
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 14,
                color: DEEP_FOREST,
                marginLeft: 6,
              }}
            >
              From Gear Closet
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Modals */}
      <AddEditPackingItemModal
        visible={showAddItem}
        onClose={() => {
          setShowAddItem(false);
          setEditingItem(null);
          setAddToCategory(undefined);
        }}
        tripId={tripId}
        editingItem={editingItem}
        defaultCategory={addToCategory}
        onSaved={loadItems}
      />

      <GearClosetPickerModal
        visible={showGearCloset}
        onClose={() => setShowGearCloset(false)}
        tripId={tripId}
        existingItems={items}
        onItemsAdded={loadItems}
      />

      <SaveTemplateModal
        visible={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        tripId={tripId}
        onSaved={() => {
          setShowSaveTemplate(false);
          Alert.alert(
            "Template Saved!",
            "You can now use this template to generate packing lists for future trips."
          );
        }}
      />
    </View>
  );
}

// ============================================================================
// PACKING ITEM ROW
// ============================================================================

interface PackingItemRowProps {
  item: PackingItemV2;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function PackingItemRow({ item, onToggle, onEdit, onDelete }: PackingItemRowProps) {
  return (
    <Pressable
      onPress={onToggle}
      onLongPress={onEdit}
      className="flex-row items-center px-4 py-3 border-b"
      style={{
        borderColor: BORDER_SOFT,
        backgroundColor: item.isPacked ? "rgba(26, 76, 57, 0.05)" : PARCHMENT,
      }}
    >
      {/* Checkbox */}
      <Pressable
        onPress={onToggle}
        className="w-6 h-6 rounded-md border-2 items-center justify-center mr-3"
        style={{
          borderColor: item.isPacked ? DEEP_FOREST : BORDER_SOFT,
          backgroundColor: item.isPacked ? DEEP_FOREST : "transparent",
        }}
      >
        {item.isPacked && <Ionicons name="checkmark" size={16} color={PARCHMENT} />}
      </Pressable>

      {/* Item Info */}
      <View className="flex-1 mr-2">
        <View className="flex-row items-center">
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 15,
              color: item.isPacked ? TEXT_SECONDARY : TEXT_PRIMARY_STRONG,
              textDecorationLine: item.isPacked ? "line-through" : "none",
              flex: 1,
            }}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          {item.quantity > 1 && (
            <View
              className="px-2 py-0.5 rounded-full ml-2"
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 11,
                  color: TEXT_SECONDARY,
                }}
              >
                ×{item.quantity}
              </Text>
            </View>
          )}

          {item.isEssential && (
            <View
              className="px-2 py-0.5 rounded-full ml-2"
              style={{ backgroundColor: "rgba(185, 89, 29, 0.15)" }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 10,
                  color: GRANITE_GOLD,
                }}
              >
                Essential
              </Text>
            </View>
          )}

          {item.isFromGearCloset && (
            <Ionicons
              name="cube"
              size={14}
              color={EARTH_GREEN}
              style={{ marginLeft: 6 }}
            />
          )}
        </View>

        {item.notes && (
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 12,
              color: TEXT_SECONDARY,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {item.notes}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View className="flex-row items-center">
        <Pressable
          onPress={onEdit}
          className="p-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="create-outline" size={18} color={EARTH_GREEN} />
        </Pressable>

        <Pressable
          onPress={onDelete}
          className="p-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={TEXT_SECONDARY} />
        </Pressable>
      </View>
    </Pressable>
  );
}
