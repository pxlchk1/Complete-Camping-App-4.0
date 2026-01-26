/**
 * VoteButtons Component
 * Reddit-style upvote/downvote buttons
 */

import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface VoteButtonsProps {
  score: number;
  userVote?: "up" | "down" | null;
  onVote: (voteType: "up" | "down") => void;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
  layout?: "horizontal" | "vertical";
}

export default function VoteButtons({
  score,
  userVote,
  onVote,
  disabled = false,
  size = "medium",
  layout = "horizontal",
}: VoteButtonsProps) {
  const iconSize = size === "small" ? 18 : size === "large" ? 24 : 20;
  const textSize = size === "small" ? "text-xs" : size === "large" ? "text-base" : "text-sm";

  const handleVote = (voteType: "up" | "down") => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onVote(voteType);
    }
  };

  if (layout === "vertical") {
    return (
      <View className="items-center">
        <Pressable
          onPress={() => handleVote("up")}
          disabled={disabled}
          className={`p-1 ${disabled ? "opacity-50" : "active:opacity-70"}`}
        >
          <Ionicons
            name={userVote === "up" ? "arrow-up" : "arrow-up-outline"}
            size={iconSize}
            color={userVote === "up" ? "#16a34a" : "#6b7280"}
          />
        </Pressable>

        <Text
          className={`${textSize} font-semibold my-1 ${score > 0 ? "text-green-600" : score < 0 ? "text-red-600" : "text-gray-600"}`}
          style={{ fontFamily: "SourceSans3_600SemiBold" }}
        >
          {score}
        </Text>

        <Pressable
          onPress={() => handleVote("down")}
          disabled={disabled}
          className={`p-1 ${disabled ? "opacity-50" : "active:opacity-70"}`}
        >
          <Ionicons
            name={userVote === "down" ? "arrow-down" : "arrow-down-outline"}
            size={iconSize}
            color={userVote === "down" ? "#dc2626" : "#6b7280"}
          />
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-row items-center">
      <Pressable
        onPress={() => handleVote("up")}
        disabled={disabled}
        className={`mr-2 ${disabled ? "opacity-50" : "active:opacity-70"}`}
      >
        <Ionicons
          name={userVote === "up" ? "arrow-up" : "arrow-up-outline"}
          size={iconSize}
          color={userVote === "up" ? "#16a34a" : "#6b7280"}
        />
      </Pressable>

      <Text
        className={`${textSize} font-semibold ${score > 0 ? "text-green-600" : score < 0 ? "text-red-600" : "text-gray-600"}`}
        style={{ fontFamily: "SourceSans3_600SemiBold", minWidth: size === "small" ? 24 : 32, textAlign: "center" }}
      >
        {score}
      </Text>

      <Pressable
        onPress={() => handleVote("down")}
        disabled={disabled}
        className={`ml-2 ${disabled ? "opacity-50" : "active:opacity-70"}`}
      >
        <Ionicons
          name={userVote === "down" ? "arrow-down" : "arrow-down-outline"}
          size={iconSize}
          color={userVote === "down" ? "#dc2626" : "#6b7280"}
        />
      </Pressable>
    </View>
  );
}
