/**
 * Trip Picker Modal
 * Allows user to select a trip to add gear to their packing list
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Trip, useTripsStore } from "../state/tripsStore";
import { GearItem, GearCategory } from "../types/gear";
import { PackingCategory, PackingItemV2 } from "../types/packingV2";
import { savePackingItem, getTripPackingItems } from "../services/packingServiceV2";
import { useAuthStore } from "../state/authStore";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  CARD_BACKGROUND_LIGHT,
} from "../constants/colors";

// Map Gear Closet categories to Packing List categories
const GEAR_TO_PACKING_CATEGORY: Record<GearCategory, PackingCategory> = {
  camp_comfort: "camp_comfort",
  campFurniture: "camp_comfort",
  clothing: "clothing",
  documents_essentials: "documents_essentials",
  electronics: "electronics",
  entertainment: "optional_extras",
  food: "food",
  hygiene: "hygiene",
  kitchen: "kitchen",
  lighting: "lighting",
  meal_prep: "kitchen",
  optional_extras: "optional_extras",
  pet_supplies: "optional_extras",
  safety: "navigation_safety",
  seating: "camp_comfort",
  shelter: "shelter",
  sleep: "sleep",
  tools: "tools_repairs",
  water: "water",
};

interface TripPickerModalProps {
  visible: boolean;
  onClose: () => void;
  gearItem: GearItem | null;
  onSuccess?: () => void;
}

export default function TripPickerModal({
  visible,
  onClose,
  gearItem,
  onSuccess,
}: TripPickerModalProps) {
  const user = useAuthStore((state) => state.user);
  const trips = useTripsStore((state) => state.trips);
  const [adding, setAdding] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Filter to active/upcoming trips only
  const activeTrips = useMemo(() => {
    const now = new Date();
    return trips.filter((trip) => {
      const endDate = new Date(trip.endDate);
      return endDate >= now;
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [trips]);

  const handleSelectTrip = async (tripId: string) => {
    if (!user?.id || !gearItem) return;

    setSelectedTripId(tripId);
    setAdding(true);
    Haptics.selectionAsync();

    try {
      // Check if item already exists in the trip's packing list
      const existingItems = await getTripPackingItems(user.id, tripId);
      
      // Check by gearClosetId
      const existsById = existingItems.some(
        (item) => item.gearClosetId === gearItem.id
      );
      
      // Check by normalized name
      const normalizedName = gearItem.name.toLowerCase().trim().replace(/[^\w\s]/g, "");
      const existsByName = existingItems.some(
        (item) => item.name.toLowerCase().trim().replace(/[^\w\s]/g, "") === normalizedName
      );

      if (existsById || existsByName) {
        Alert.alert(
          "Already in packing list",
          `${gearItem.name} is already on this trip's list`
        );
        setAdding(false);
        setSelectedTripId(null);
        return;
      }

      // Add the gear to the trip's packing list
      const packingCategory = GEAR_TO_PACKING_CATEGORY[gearItem.category] || "optional_extras";

      const itemData: Partial<PackingItemV2> = {
        name: gearItem.name,
        category: packingCategory,
        quantity: 1,
        notes: [gearItem.brand, gearItem.model].filter(Boolean).join(" ") || undefined,
        isEssential: false,
        isPacked: false,
        isFromGearCloset: true,
        gearClosetId: gearItem.id,
      };

      await savePackingItem(user.id, tripId, itemData);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("[TripPickerModal] Error adding to packing list:", error);
      Alert.alert("Error adding item", "Please try again");
    } finally {
      setAdding(false);
      setSelectedTripId(null);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderTrip = ({ item: trip }: { item: Trip }) => {
    const isSelected = selectedTripId === trip.id;
    const tripName = trip.name || trip.destination?.name || "Untitled Trip";
    const startDate = formatDate(trip.startDate);
    const endDate = formatDate(trip.endDate);

    return (
      <Pressable
        onPress={() => handleSelectTrip(trip.id)}
        disabled={adding}
        className="flex-row items-center px-4 py-4 border-b"
        style={{
          borderColor: BORDER_SOFT,
          backgroundColor: isSelected ? "rgba(26, 76, 57, 0.08)" : PARCHMENT,
          opacity: adding && !isSelected ? 0.5 : 1,
        }}
      >
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
        >
          <Ionicons name="trail-sign-outline" size={20} color={EARTH_GREEN} />
        </View>

        <View className="flex-1">
          <Text
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              fontSize: 16,
              color: TEXT_PRIMARY_STRONG,
            }}
            numberOfLines={1}
          >
            {tripName}
          </Text>
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 13,
              color: TEXT_SECONDARY,
              marginTop: 2,
            }}
          >
            {startDate} – {endDate}
          </Text>
        </View>

        {isSelected && adding ? (
          <ActivityIndicator size="small" color={DEEP_FOREST} />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={TEXT_SECONDARY} />
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
          style={{ backgroundColor: PARCHMENT, maxHeight: "70%" }}
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
                Add to Packing List
              </Text>

              <View style={{ width: 50 }} />
            </View>

            {/* Gear Item Preview */}
            {gearItem && (
              <View
                className="px-4 py-3 border-b"
                style={{ borderColor: BORDER_SOFT, backgroundColor: CARD_BACKGROUND_LIGHT }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 12,
                    color: TEXT_SECONDARY,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Adding
                </Text>
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 15,
                    color: TEXT_PRIMARY_STRONG,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {gearItem.name}
                </Text>
              </View>
            )}

            {/* Select Trip Label */}
            <View className="px-4 py-2">
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 13,
                  color: TEXT_SECONDARY,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Select a trip
              </Text>
            </View>

            {/* Trips List */}
            {activeTrips.length === 0 ? (
              <View className="items-center justify-center py-12 px-6">
                <Ionicons name="calendar-outline" size={48} color={EARTH_GREEN} />
                <Text
                  style={{
                    fontFamily: "Raleway_700Bold",
                    fontSize: 18,
                    color: DEEP_FOREST,
                    marginTop: 12,
                    textAlign: "center",
                  }}
                >
                  No upcoming trips
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
                  Create a trip first to add gear to a packing list
                </Text>
              </View>
            ) : (
              <FlatList
                data={activeTrips}
                keyExtractor={(item) => item.id}
                renderItem={renderTrip}
                contentContainerStyle={{ paddingBottom: 40 }}
              />
            )}
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
