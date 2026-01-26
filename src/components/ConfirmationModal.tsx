import React from "react";
import { Modal, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { DEEP_FOREST, EARTH_GREEN, GRANITE_GOLD, RIVER_ROCK, SIERRA_SKY, PARCHMENT, PARCHMENT_BORDER } from "../constants/colors";

interface ActionConfig {
  label: string;
  onPress: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  testID?: string;
}

interface ConfirmationModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  primary: ActionConfig;
  secondary: ActionConfig;
  onClose: () => void;
}

export default function ConfirmationModal({
  visible,
  title = "Added to your trip",
  message = "What would you like to do next?",
  primary,
  secondary,
  onClose,
}: ConfirmationModalProps) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 items-center justify-end px-4 pb-6" pointerEvents="auto">
        <View className="w-full max-w-md bg-parchment rounded-3xl p-5 shadow-lg border border-parchmentDark">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-full bg-[#f0f9f4] items-center justify-center mr-3">
                <Ionicons name="checkmark" size={20} color={DEEP_FOREST} />
              </View>
              <Text className="text-lg font-semibold text-[#16492f]" style={{ fontFamily: "Raleway_600SemiBold" }} numberOfLines={1}>
                {title}
              </Text>
            </View>
            <Pressable onPress={onClose} className="rounded-full p-1.5 bg-parchment active:bg-gray-200">
              <Ionicons name="close" size={18} color="#2f2f2f" />
            </Pressable>
          </View>

          {message ? (
            <Text className="text-earthGreen mb-4" style={{ fontFamily: "SourceSans3_400Regular" }}>{message}</Text>
          ) : null}

          {/* Actions */}
          <View className="space-y-3">
            <Pressable
              testID={primary.testID}
              accessibilityRole="button"
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  primary.onPress();
                } catch (error) {
                  // Silently handle errors
                }
              }}
              className="bg-forest rounded-2xl px-4 py-3 items-center justify-center active:bg-forest"
            >
              <View className="flex-row items-center">
                {primary.iconName ? (
                  <Ionicons name={primary.iconName} size={18} color={PARCHMENT} />
                ) : null}
                <Text className="text-parchment font-semibold text-base ml-1" style={{ fontFamily: "SourceSans3_600SemiBold" }}>{primary.label}</Text>
              </View>
            </Pressable>

            <Pressable
              testID={secondary.testID}
              accessibilityRole="button"
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  secondary.onPress();
                } catch (error) {
                  // Silently handle errors
                }
              }}
              className="bg-parchment rounded-2xl px-4 py-3 items-center justify-center border border-parchmentDark active:bg-[#f0f9f4]"
            >
              <View className="flex-row items-center">
                {secondary.iconName ? (
                  <Ionicons name={secondary.iconName} size={18} color={DEEP_FOREST} />
                ) : null}
                <Text className="text-forest font-semibold text-base ml-1" style={{ fontFamily: "SourceSans3_600SemiBold" }}>{secondary.label}</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
