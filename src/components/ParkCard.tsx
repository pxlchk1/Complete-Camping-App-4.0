import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Park } from "../types/camping";
import { DEEP_FOREST, EARTH_GREEN, GRANITE_GOLD, TEXT_SECONDARY, PARCHMENT, PARCHMENT_BORDER } from "../constants/colors";

interface ParkCardProps {
  park: Park;
  onPress: (park: Park) => void;
}

const getTypeIcon = (filter: Park["filter"]): keyof typeof Ionicons.glyphMap => {
  switch (filter) {
    case "state_park":
      return "leaf";
    case "national_park":
      return "flag";
    case "national_forest":
      return "leaf-outline";
    default:
      return "location";
  }
};

const getTypeLabel = (filter: Park["filter"]) => {
  switch (filter) {
    case "state_park":
      return "State Park";
    case "national_park":
      return "National Park";
    case "national_forest":
      return "National Forest";
    default:
      return "Park";
  }
};

export default function ParkCard({ park, onPress }: ParkCardProps) {
  return (
    <Pressable
      onPress={() => onPress(park)}
      className="bg-parchment rounded-xl p-4 border border-parchmentDark active:opacity-95 mb-3"
    >
      {/* Header */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-3">
          <Text className="text-lg font-semibold text-forest mb-1" style={{ fontFamily: "Raleway_600SemiBold" }}>{park.name}</Text>
          <View className="flex-row items-center">
            <Ionicons name={getTypeIcon(park.filter)} size={16} color={TEXT_SECONDARY} />
            <Text className="text-riverRock text-sm font-medium ml-1" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
              {getTypeLabel(park.filter)}
            </Text>
          </View>
        </View>
      </View>

      {/* Location */}
      <View className="flex-row items-center mb-3">
        <Ionicons name="location-outline" size={16} color={EARTH_GREEN} />
        <Text className="text-earthGreen text-sm ml-1" style={{ fontFamily: "SourceSans3_400Regular" }}>
          {park.state}
        </Text>
      </View>

      {/* Address */}
      <Text className="text-earthGreen text-sm leading-5" style={{ fontFamily: "SourceSans3_400Regular" }} numberOfLines={2}>
        {park.address}
      </Text>
    </Pressable>
  );
}
