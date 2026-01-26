import React from "react";
import { View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DEEP_FOREST, EARTH_GREEN, GRANITE_GOLD, RIVER_ROCK, SIERRA_SKY, PARCHMENT, PARCHMENT_BORDER } from "../constants/colors";

interface AvatarProps {
  uri?: string | null;
  size?: "small" | "medium" | "large";
  className?: string;
}

const SIZES = {
  small: 32,
  medium: 48,
  large: 64,
};

export default function Avatar({ uri, size = "medium", className }: AvatarProps) {
  const dimension = SIZES[size];

  return (
    <View
      className={className}
      style={{
        width: dimension,
        height: dimension,
        borderRadius: dimension / 2,
        backgroundColor: "#e8ebe9",
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: dimension, height: dimension }}
          resizeMode="cover"
        />
      ) : (
        <Ionicons name="person" size={dimension * 0.6} color={DEEP_FOREST} />
      )}
    </View>
  );
}
