/**
 * Premium Feature Modal
 * Shows when a free user attempts a locked customization action
 * 
 * Usage:
 * <PremiumFeatureModal
 *   visible={showPremiumModal}
 *   featureType="packing" // or "meals"
 *   onUpgrade={() => navigation.navigate("Paywall")}
 *   onDismiss={() => setShowPremiumModal(false)}
 * />
 */

import React from "react";
import { Modal, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { DEEP_FOREST } from "../constants/colors";

type FeatureType = "packing" | "meals" | "photos" | "customMeals";

interface PremiumFeatureModalProps {
  visible: boolean;
  featureType: FeatureType;
  onUpgrade: () => void;
  onDismiss: () => void;
}

const COPY: Record<FeatureType, { title: string; body: string; cta?: string }> = {
  packing: {
    title: "Go Pro",
    body: "Unlock the full camping toolkit with a 3-day free trial!",
  },
  meals: {
    title: "Go Pro",
    body: "Unlock the full camping toolkit with a 3-day free trial!",
  },
  photos: {
    title: "Go Pro",
    body: "Unlock unlimited photo posts with a 3-day free trial!",
  },
  customMeals: {
    title: "Custom meals require Pro",
    body: "You can still use meal ideas and grocery planning for this trip. Upgrade if you want to create and customize your own meals.",
    cta: "See plans",
  },
};

export default function PremiumFeatureModal({
  visible,
  featureType,
  onUpgrade,
  onDismiss,
}: PremiumFeatureModalProps) {
  const copy = COPY[featureType];

  const handleUpgrade = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onUpgrade();
  };

  const handleDismiss = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View className="flex-1 bg-black/50 items-center justify-center px-4">
        <View className="w-full max-w-sm bg-parchment rounded-2xl p-5 shadow-lg border border-parchmentDark">
          {/* Header */}
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 rounded-full bg-[#f0f9f4] items-center justify-center mr-3">
              <Ionicons name="diamond-outline" size={22} color={DEEP_FOREST} />
            </View>
            <Text
              className="text-lg font-semibold text-[#16492f] flex-1"
              style={{ fontFamily: "Raleway_600SemiBold" }}
            >
              {copy.title}
            </Text>
          </View>

          {/* Body */}
          <Text
            className="text-earthGreen mb-5 leading-5"
            style={{ fontFamily: "SourceSans3_400Regular", fontSize: 15 }}
          >
            {copy.body}
          </Text>

          {/* Actions */}
          <View className="space-y-3">
            {/* Primary CTA */}
            <Pressable
              onPress={handleUpgrade}
              className="bg-forest rounded-xl px-4 py-3.5 items-center justify-center active:opacity-90"
            >
              <Text
                className="text-parchment font-semibold text-base"
                style={{ fontFamily: "SourceSans3_600SemiBold" }}
              >
                {copy.cta || "Start 3-Day Free Trial"}
              </Text>
            </Pressable>

            {/* Trial fine print — hidden for custom-meal variant */}
            {featureType !== "customMeals" && (
              <Text
                className="text-earthGreen/70 text-center text-xs"
                style={{ fontFamily: "SourceSans3_400Regular" }}
              >
                After your free trial, your annual subscription begins. Cancel anytime.
              </Text>
            )}

            {/* Secondary: Not now */}
            <Pressable
              onPress={handleDismiss}
              className="px-4 py-3 items-center justify-center"
            >
              <Text
                className="text-earthGreen font-medium text-base"
                style={{ fontFamily: "SourceSans3_500Medium" }}
              >
                Not now
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
