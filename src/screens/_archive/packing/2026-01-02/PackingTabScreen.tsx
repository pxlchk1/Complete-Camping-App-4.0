import React, { useState, useCallback, useEffect, useMemo } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import EmptyState from "../components/EmptyState";
import FireflyLoader from "../components/common/FireflyLoader";
import { DEEP_FOREST, EARTH_GREEN, PARCHMENT } from "../constants/colors";
import { useTrips } from "../state/tripsStore";
import { RootStackParamList } from "../navigation/types";
import { PackingItem } from "../types/camping";
import { getPackingList, togglePackingItem } from "../api/packing-service";
import * as LocalPackingService from "../services/localPackingService";
import * as Haptics from "expo-haptics";
import { requirePro } from "../utils/gating";
import AccountRequiredModal from "../components/AccountRequiredModal";

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
  console.log("[PLAN_TRACE] Enter PackingTabScreen");

  useEffect(() => {
    console.log("[PLAN_TRACE] PackingTabScreen mounted");
  }, []);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<PackingTabNavigationProp>();
  const trips = useTrips();
  const userId = "demo_user_1"; // TODO: Get from auth

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Gating modal state
  const [showAccountModal, setShowAccountModal] = useState(false);
  
  const handleCreateTrip = () => {
    const canProceed = requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "create_trip", variant }),
    });
    if (!canProceed) return;
    navigation.navigate("CreateTrip");
  };
  const [useLocalStorage, setUseLocalStorage] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const activeTrips = useMemo(() => {
    return trips.filter((trip) => {
      const status = getStatus(trip.startDate, trip.endDate);
      return status === "In Progress" || status === "Upcoming";
    });
  }, [trips]);

  useEffect(() => {
    if (!selectedTripId && activeTrips.length > 0) {
      setSelectedTripId(activeTrips[0].id);
    }
  }, [activeTrips, selectedTripId]);

  const loadPackingList = useCallback(async () => {
    if (!selectedTripId) return;

    setLoading(true);
    try {
      if (!useLocalStorage) {
        try {
          const items = await getPackingList(userId, selectedTripId);
          setPackingItems(items);

          const categories = new Set(items.map((i) => i.category));
          setExpandedCategories(categories);
          return;
        } catch (fbError: any) {
          if (
            fbError?.code === "permission-denied" ||
            fbError?.message?.toLowerCase?.().includes("permission")
          ) {
            console.log("Using local storage for packing lists");
          }
          setUseLocalStorage(true);
        }
      }

      const items = await LocalPackingService.getPackingList(selectedTripId);
      setPackingItems(items);

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
        await LocalPackingService.togglePackingItem(selectedTripId, item.id, !item.isPacked);
      } else {
        try {
          await togglePackingItem(userId, selectedTripId, item.id, !item.isPacked);
        } catch (fbError: any) {
          if (
            fbError?.code === "permission-denied" ||
            fbError?.message?.toLowerCase?.().includes("permission")
          ) {
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
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const handleManagePacking = () => {
    if (selectedTripId) {
      navigation.navigate("PackingList", { tripId: selectedTripId });
    }
  };

  const categories = useMemo(() => {
    return Array.from(new Set(packingItems.map((i) => i.category)));
  }, [packingItems]);

  const itemsByCategory = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat] = packingItems.filter((i) => i.category === cat);
      return acc;
    }, {} as Record<string, PackingItem[]>);
  }, [categories, packingItems]);

  const totalItems = packingItems.length;
  const packedItems = packingItems.filter((i) => i.isPacked).length;
  const progress = totalItems > 0 ? (packedItems / totalItems) * 100 : 0;

  const bottomSpacer = 50 + Math.max(insets.bottom, 18) + 12;

  const selectedTrip = activeTrips.find((t) => t.id === selectedTripId);

  return (
    <View className="flex-1 bg-parchment">
      {activeTrips.length === 0 ? (
        <View style={{ flex: 1, backgroundColor: "#F4EBD0" }}>
          <EmptyState
            iconName="bag"
            title="No active trips."
            message="Your sleeping bag is bored."
            ctaLabel="Plan a new trip"
            onPress={handleCreateTrip}
          />
        </View>
      ) : (
        <View className="flex-1">
          {activeTrips.length > 1 && (
            <View className="px-4 pt-3 pb-2">
              <Text
                className="text-xs mb-2"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: EARTH_GREEN }}
              >
                SELECT TRIP
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {activeTrips.map((trip) => {
                  const isSelected = trip.id === selectedTripId;
                  return (
                    <Pressable
                      key={trip.id}
                      onPress={() => setSelectedTripId(trip.id)}
                      className={`px-4 py-2 rounded-xl border ${
                        isSelected ? "bg-forest border-forest" : "bg-parchment border-parchmentDark"
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

          {selectedTrip && (
            <View className="px-4 py-3 border-b border-stone-200">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text
                    className="text-lg mb-1"
                    style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
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

                <Pressable onPress={handleManagePacking} className="bg-forest rounded-xl px-4 py-2 active:opacity-90">
                  <Text className="text-sm" style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
                    Manage
                  </Text>
                </Pressable>
              </View>

              {totalItems > 0 && (
                <View className="mt-3">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}>
                      {packedItems} of {totalItems} packed
                    </Text>
                    <Text className="text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}>
                      {Math.round(progress)}%
                    </Text>
                  </View>
                  <View className="h-2 bg-white rounded-full overflow-hidden">
                    <View className="h-full bg-forest rounded-full" style={{ width: `${progress}%` }} />
                  </View>
                </View>
              )}
            </View>
          )}

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={DEEP_FOREST} />
            </View>
          ) : packingItems.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8">
              <Ionicons name="bag-outline" size={48} color={EARTH_GREEN} style={{ opacity: 0.5 }} />
              <Text className="text-earthGreen text-center mt-3" style={{ fontFamily: "SourceSans3_400Regular" }}>
                Tap Manage to add items to your packing list
              </Text>
            </View>
          ) : (
            <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: bottomSpacer }}>
              {categories.map((category) => {
                const items = itemsByCategory[category] || [];
                const isExpanded = expandedCategories.has(category);
                const categoryPacked = items.filter((i) => i.isPacked).length;

                return (
                  <View key={category} className="mt-4">
                    <Pressable onPress={() => toggleCategory(category)} className="flex-row items-center justify-between py-2 active:opacity-70">
                      <View className="flex-row items-center flex-1">
                        <Ionicons name={isExpanded ? "chevron-down" : "chevron-forward"} size={20} color={DEEP_FOREST} />
                        <Text className="ml-2 text-base font-bold" style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}>
                          {category}
                        </Text>
                        <Text className="ml-2 text-sm" style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}>
                          ({categoryPacked}/{items.length})
                        </Text>
                      </View>
                    </Pressable>

                    {isExpanded &&
                      items.map((item) => (
                        <View key={item.id} className="flex-row items-center py-3 border-b border-stone-200">
                          <Pressable onPress={() => handleTogglePacked(item)} className="mr-3 active:opacity-70">
                            <View
                              className={`w-6 h-6 rounded border-2 ${
                                item.isPacked ? "bg-forest border-forest" : "bg-transparent border-stone-300"
                              } items-center justify-center`}
                            >
                              {item.isPacked && <Ionicons name="checkmark" size={16} color={PARCHMENT} />}
                            </View>
                          </Pressable>

                          <View className="flex-1">
                            <Text
                              className={item.isPacked ? "line-through" : ""}
                              style={{
                                fontFamily: "SourceSans3_400Regular",
                                color: item.isPacked ? EARTH_GREEN : DEEP_FOREST,
                              }}
                            >
                              {item.label}
                              {item.quantity > 1 ? ` (${item.quantity})` : ""}
                            </Text>

                            {item.notes ? (
                              <Text className="text-xs mt-1" style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}>
                                {item.notes}
                              </Text>
                            ) : null}
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

      {loading ? <FireflyLoader /> : null}

      {/* Gating Modals */}
      <AccountRequiredModal
        visible={showAccountModal}
        onCreateAccount={() => {
          setShowAccountModal(false);
          navigation.navigate("Auth" as never);
        }}
        onMaybeLater={() => setShowAccountModal(false)}
      />
    </View>
  );
}
