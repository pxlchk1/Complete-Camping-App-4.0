import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ImageBackground,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import PlanTopNav from "../components/PlanTopNav";
import AccountButtonHeader from "../components/AccountButtonHeader";
import FireflyLoader from "../components/common/FireflyLoader";
import EmptyState from "../components/EmptyState";
import { HERO_IMAGES } from "../constants/images";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  PARCHMENT_BORDER,
  TEXT_ON_DARK,
} from "../constants/colors";
import { useTrips, Trip } from "../state/tripsStore";
import { RootStackParamList } from "../navigation/types";
import { PackingItem } from "../types/camping";
import { getPackingList, togglePackingItem } from "../api/packing-service";
import * as LocalPackingService from "../services/localPackingService";
import * as Haptics from "expo-haptics";

type PlanTab = "trips" | "parks" | "weather" | "packing" | "meals";
type PackingTabNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PackingTabScreenProps {
  onTabChange: (tab: PlanTab) => void;
}

function getStatus(startISO: string, endISO: string): "In Progress" | "Upcoming" | "Completed" {
  const today = new Date();
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (today > end) return "Completed";
  if (today < start) return "Upcoming";
  return "In Progress";
}

export default function PackingTabScreen({ onTabChange }: PackingTabScreenProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<PackingTabNavigationProp>();
  const trips = useTrips();
  const userId = "demo_user_1"; // TODO: Get from auth

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [useLocalStorage, setUseLocalStorage] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Filter to active trips only (upcoming or in progress)
  const activeTrips = trips.filter((trip) => {
    const status = getStatus(trip.startDate, trip.endDate);
    return status === "In Progress" || status === "Upcoming";
  });

  // Auto-select first active trip if none selected
  useEffect(() => {
    if (!selectedTripId && activeTrips.length > 0) {
      setSelectedTripId(activeTrips[0].id);
    }
  }, [activeTrips.length]);

  // Load packing list when trip is selected
  const loadPackingList = useCallback(async () => {
    if (!selectedTripId) return;

    setLoading(true);
    try {
      if (!useLocalStorage) {
        try {
          const items = await getPackingList(userId, selectedTripId);
          setPackingItems(items);

          // Auto-expand all categories
          const categories = new Set(items.map((i) => i.category));
          setExpandedCategories(categories);
          return;
        } catch (fbError: any) {
          // Silently fall back to local storage
          // Check if it's a Firebase permissions error
          if (fbError?.code === 'permission-denied' || fbError?.message?.includes('permission')) {
            console.log("Using local storage for packing lists");
          }
          setUseLocalStorage(true);
        }
      }

      // Use local storage (fallback or already in local mode)
      const items = await LocalPackingService.getPackingList(selectedTripId);
      setPackingItems(items);

      // Auto-expand all categories
      const categories = new Set(items.map((i) => i.category));
      setExpandedCategories(categories);
    } catch (error: any) {
      console.error("Failed to load packing list:", error);
      setPackingItems([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTripId, userId, useLocalStorage]);

  useEffect(() => {
    if (selectedTripId) {
      loadPackingList();
    }
  }, [selectedTripId, loadPackingList]);

  const handleTogglePacked = async (item: PackingItem) => {
    if (!selectedTripId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic update
    setPackingItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isPacked: !i.isPacked } : i))
    );

    try {
      if (useLocalStorage) {
        await LocalPackingService.togglePackingItem(selectedTripId, item.id, !item.isPacked);
      } else {
        try {
          await togglePackingItem(userId, selectedTripId, item.id, !item.isPacked);
        } catch (fbError: any) {
          // If Firebase fails, switch to local storage and retry
          if (fbError?.code === 'permission-denied' || fbError?.message?.includes('permission')) {
            console.log("Switching to local storage for packing operations");
            setUseLocalStorage(true);
            await LocalPackingService.togglePackingItem(selectedTripId, item.id, !item.isPacked);
          } else {
            throw fbError;
          }
        }
      }
    } catch (error: any) {
      console.error("Failed to toggle item:", error);
      // Revert on error
      setPackingItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isPacked: item.isPacked } : i))
      );
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

  const handleManagePacking = () => {
    if (selectedTripId) {
      navigation.navigate("PackingList", { tripId: selectedTripId });
    }
  };

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

  const bottomSpacer = 50 + Math.max(insets.bottom, 18) + 12;

  const selectedTrip = activeTrips.find((t) => t.id === selectedTripId);

  return (
    <View className="flex-1 bg-parchment">

      {activeTrips.length === 0 ? (
        /* No Active Trips */
        <View style={{ flex: 1, backgroundColor: '#F4EBD0' }}>
          <EmptyState
            iconName="bag"
            title="No active trips"
            message="Create a trip to build a packing list."
            ctaLabel="View Trips"
            onPress={() => onTabChange("trips")}
          />
        </View>
      ) : (
        <View className="flex-1">
          {/* Trip Selector */}
          {activeTrips.length > 1 && (
            <View className="px-4 pt-3 pb-2">
              <Text
                className="text-xs mb-2"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: EARTH_GREEN }}
              >
                SELECT TRIP
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {activeTrips.map((trip) => {
                  const isSelected = trip.id === selectedTripId;
                  return (
                    <Pressable
                      key={trip.id}
                      onPress={() => setSelectedTripId(trip.id)}
                      className={`px-4 py-2 rounded-xl border ${
                        isSelected
                          ? "bg-forest border-forest"
                          : "bg-white border-stone-300"
                      }`}
                    >
                      <Text
                        className={isSelected ? "text-white" : "text-forest"}
                        style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14 }}
                      >
                        {trip.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Selected Trip Info */}
          {selectedTrip && (
            <View className="px-4 py-3 border-b border-stone-200">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text
                    className="text-lg mb-1"
                    style={{ fontFamily: "JosefinSlab_700Bold", color: DEEP_FOREST }}
                  >
                    {selectedTrip.name}
                  </Text>
                  <Text
                    className="text-sm"
                    style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                  >
                    {new Date(selectedTrip.startDate).toLocaleDateString()} -{" "}
                    {new Date(selectedTrip.endDate).toLocaleDateString()}
                  </Text>
                </View>
                <Pressable
                  onPress={handleManagePacking}
                  className="bg-forest rounded-xl px-4 py-2 active:opacity-90"
                >
                  <Text
                    className="text-sm"
                    style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                  >
                    Manage
                  </Text>
                </Pressable>
              </View>

              {/* Progress Bar */}
              {totalItems > 0 && (
                <View className="mt-3">
                  <View className="flex-row justify-between mb-1">
                    <Text
                      className="text-xs"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                    >
                      {packedItems} of {totalItems} packed
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                    >
                      {Math.round(progress)}%
                    </Text>
                  </View>
                  <View className="h-2 bg-stone-200 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-forest rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Packing List */}
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={DEEP_FOREST} />
            </View>
          ) : packingItems.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8">
              <Ionicons name="add-circle-outline" size={48} color={EARTH_GREEN} />
              <Text
                className="text-forest font-semibold mt-3 mb-1 text-center"
                style={{ fontFamily: "SourceSans3_600SemiBold" }}
              >
                No items yet
              </Text>
              <Text
                className="text-earthGreen text-center mb-4"
                style={{ fontFamily: "SourceSans3_400Regular" }}
              >
                Tap Manage to add items to your packing list
              </Text>
            </View>
          ) : (
            <ScrollView
              className="flex-1 px-4"
              contentContainerStyle={{ paddingBottom: bottomSpacer }}
            >
              {categories.map((category) => {
                const items = itemsByCategory[category] || [];
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
                    </Pressable>

                    {/* Items */}
                    {isExpanded &&
                      items.map((item) => (
                        <View
                          key={item.id}
                          className="flex-row items-center py-3 border-b border-stone-200"
                        >
                          {/* Checkbox */}
                          <Pressable
                            onPress={() => handleTogglePacked(item)}
                            className="mr-3 active:opacity-70"
                          >
                            <View
                              className={`w-6 h-6 rounded border-2 ${
                                item.isPacked
                                  ? "bg-forest border-forest"
                                  : "bg-transparent border-stone-300"
                              } items-center justify-center`}
                            >
                              {item.isPacked && (
                                <Ionicons name="checkmark" size={16} color={PARCHMENT} />
                              )}
                            </View>
                          </Pressable>

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
                        </View>
                      ))}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
      {loading && <FireflyLoader />}
    </View>
  );
}
