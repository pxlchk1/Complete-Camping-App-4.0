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

type FeatureType = "packing" | "meals" | "photos";

interface PremiumFeatureModalProps {
  visible: boolean;
  featureType: FeatureType;
  onUpgrade: () => void;
  onDismiss: () => void;
}

const COPY: Record<FeatureType, { title: string; body: string }> = {
  packing: {
    title: "Premium feature",
    body: "Customizing packing lists is part of Premium. You can still use the checklist for this trip.",
  },
  meals: {
    title: "Premium feature",
    body: "Customizing meal plans is part of Premium. You can still use the grocery checklist for this trip.",
  },
  photos: {
    title: "Daily limit reached",
    body: "Free users can share one photo per day. Upgrade to Pro for unlimited photo posts.",
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
            {/* Primary: Go Premium */}
            <Pressable
              onPress={handleUpgrade}
              className="bg-forest rounded-xl px-4 py-3.5 items-center justify-center active:opacity-90"
            >
              <Text
                className="text-parchment font-semibold text-base"
                style={{ fontFamily: "SourceSans3_600SemiBold" }}
              >
                Go Premium
              </Text>
            </Pressable>

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
