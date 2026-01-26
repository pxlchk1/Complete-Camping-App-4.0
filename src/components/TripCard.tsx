import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Trip } from "../types/camping";
import { format } from "date-fns";
import { DEEP_FOREST, EARTH_GREEN, GRANITE_GOLD, TEXT_SECONDARY, SIERRA_SKY, PARCHMENT, PARCHMENT_BORDER } from "../constants/colors";

function formatDateRange(startISO: string, endISO: string) {
  const start = new Date(startISO);
  const end = new Date(endISO);

  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const currentYear = new Date().getFullYear();

  const showYear = endYear !== currentYear;

  const startStr = format(start, "MMM d");
  const endStr = format(end, showYear ? "MMM d, yyyy" : "MMM d");

  const nights = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
  return `${startStr}–${endStr} • ${nights} ${nights === 1 ? "night" : "nights"}`;
}

function getStatus(startISO: string, endISO: string): "In Progress" | "Upcoming" | "Completed" {
  const today = new Date();
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (today > end) return "Completed";
  if (today < start) return "Upcoming";
  return "In Progress";
}

function badgeColor(status: string) {
  switch (status) {
    case "In Progress":
      return { bg: "bg-[#d4e7dc]", text: "text-forest" };
    case "Upcoming":
      return { bg: "bg-sierraSky/30", text: "text-riverRock" };
    default:
      return { bg: "bg-parchment", text: "text-earthGreen" };
  }
}

export interface TripCardProps {
  trip: Trip;
  onResume?: (trip: Trip) => void;
  onMenu?: (trip: Trip) => void;
  onPackingPress?: (trip: Trip) => void;
  onWeatherPress?: (trip: Trip) => void;
  onMealsPress?: (trip: Trip) => void;
}

export default function TripCard({ trip, onResume, onMenu, onPackingPress, onWeatherPress, onMealsPress }: TripCardProps) {
  const status = getStatus(trip.startDate, trip.endDate);
  const colors = badgeColor(status);

  // Calculate packing progress
  const packingProgress = trip.packing
    ? `${trip.packing.itemsChecked}/${trip.packing.totalItems}`
    : null;

  // Get weather info
  const weatherInfo = trip.weather?.forecast?.[0];

  return (
    <Pressable
      onPress={() => onResume?.(trip)}
      className="bg-parchment rounded-2xl p-4 border border-parchmentDark mb-3 active:opacity-95"
      accessibilityLabel={`${trip.name}, ${formatDateRange(trip.startDate, trip.endDate)}, ${status}`}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <Text className="text-forest text-base font-bold mb-1" style={{ fontFamily: "Raleway_700Bold" }} numberOfLines={1}>
            {trip.name}
          </Text>
          <Text className="text-earthGreen text-sm" style={{ fontFamily: "SourceSans3_400Regular" }} numberOfLines={1}>
            {formatDateRange(trip.startDate, trip.endDate)}
          </Text>
        </View>

        {onMenu && (
          <Pressable
            accessibilityLabel={`Open menu for trip ${trip.name}`}
            onPress={() => onMenu(trip)}
            className="px-2 py-2 rounded-xl bg-parchment active:opacity-80"
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={EARTH_GREEN} />
          </Pressable>
        )}
      </View>

      {/* Status and Location */}
      <View className="flex-row items-center mb-3">
        <View className={`px-2 py-1 rounded-full ${colors.bg}`}>
          <Text className={`text-xs font-medium ${colors.text}`}>{status}</Text>
        </View>
        {trip.destination && (
          <View className="flex-row items-center ml-2">
            <Ionicons name="location" size={14} color={EARTH_GREEN} />
            <Text className="text-earthGreen text-xs ml-1" style={{ fontFamily: "SourceSans3_400Regular" }} numberOfLines={1}>
              {trip.destination.name}
            </Text>
          </View>
        )}
      </View>

      {/* Quick Info Chips */}
      <View className="flex-row flex-wrap gap-2">
        {trip.partySize && (
          <View className="px-2 py-1 rounded-full bg-parchment border border-parchmentDark flex-row items-center">
            <Ionicons name="people" size={12} color={DEEP_FOREST} />
            <Text className="text-xs text-forest ml-1" style={{ fontFamily: "SourceSans3_400Regular" }}>{trip.partySize}</Text>
          </View>
        )}

        {trip.campingStyle && (
          <View className="px-2 py-1 rounded-full bg-parchment border border-parchmentDark">
            <Text className="text-xs text-forest" style={{ fontFamily: "SourceSans3_400Regular" }}>{trip.campingStyle}</Text>
          </View>
        )}

        {packingProgress && (
          <Pressable
            onPress={() => onPackingPress?.(trip)}
            className="px-2 py-1 rounded-full bg-parchment border border-parchmentDark flex-row items-center active:opacity-70"
          >
            <Ionicons name="checkmark-circle" size={12} color={GRANITE_GOLD} />
            <Text className="text-xs text-earthGreen ml-1" style={{ fontFamily: "SourceSans3_400Regular" }}>{packingProgress}</Text>
          </Pressable>
        )}

        {weatherInfo && (
          <Pressable
            onPress={() => onWeatherPress?.(trip)}
            className="px-2 py-1 rounded-full bg-sierraSky/20 border border-sierraSky flex-row items-center active:opacity-70"
          >
            <Ionicons name="partly-sunny" size={12} color={TEXT_SECONDARY} />
            <Text className="text-xs text-secondary ml-1" style={{ fontFamily: "SourceSans3_400Regular" }}>
              {Math.round(weatherInfo.high)}°
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}
