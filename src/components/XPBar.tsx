import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DEEP_FOREST, EARTH_GREEN, GRANITE_GOLD, PARCHMENT, PARCHMENT_BORDER } from "../constants/colors";

interface XPBarProps {
  currentXP: number;
  level: number;
  nextLevelXP?: number;
}

export function XPBar({ currentXP, level, nextLevelXP }: XPBarProps) {
  const currentLevelXP = level * 100;
  const xpInCurrentLevel = currentXP - currentLevelXP;
  const xpNeededForNextLevel = nextLevelXP ? nextLevelXP - currentXP : 100;
  const progressPercentage = nextLevelXP
    ? Math.min((currentXP / nextLevelXP) * 100, 100)
    : (xpInCurrentLevel / 100) * 100;

  return (
    <View className="bg-parchment rounded-xl p-4 mb-4 border border-parchmentDark">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Ionicons name="star" size={20} color={GRANITE_GOLD} />
          <Text className="text-forest font-semibold ml-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>Level {level}</Text>
        </View>
        <Text className="text-earthGreen text-sm" style={{ fontFamily: "SourceSans3_400Regular" }}>{currentXP} XP</Text>
      </View>
      <View className="bg-parchmentDark/30 rounded-full h-3 mb-2">
        <View
          className="bg-granite h-3 rounded-full"
          style={{ width: `${progressPercentage}%` }}
        />
      </View>
      {nextLevelXP && (
        <Text className="text-earthGreen text-xs text-center" style={{ fontFamily: "SourceSans3_400Regular" }}>
          {xpNeededForNextLevel} XP to unlock next track
        </Text>
      )}
    </View>
  );
}
