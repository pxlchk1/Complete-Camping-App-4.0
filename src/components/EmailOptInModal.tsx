/**
 * EmailOptInModal
 * 
 * Modal wrapper for EmailOptInCard.
 * Used for first-run or Home screen prompts to subscribe to email drip.
 */

import React from "react";
import { Modal, View, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import EmailOptInCard from "./EmailOptInCard";
import { PARCHMENT, TEXT_SECONDARY } from "../constants/colors";

interface EmailOptInModalProps {
  visible: boolean;
  onClose: () => void;
  onOptInComplete?: () => void;
}

export default function EmailOptInModal({
  visible,
  onClose,
  onOptInComplete,
}: EmailOptInModalProps) {
  const insets = useSafeAreaInsets();

  const handleOptInComplete = () => {
    onOptInComplete?.();
    onClose();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        style={{ backgroundColor: PARCHMENT }}
      >
        <View
          className="flex-1"
          style={{
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            backgroundColor: PARCHMENT,
          }}
        >
          {/* Close Button */}
          <View className="flex-row justify-end px-4 py-2">
            <Pressable
              onPress={handleDismiss}
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.05)" }}
            >
              <Ionicons name="close" size={20} color={TEXT_SECONDARY} />
            </Pressable>
          </View>

          {/* Content */}
          <View className="flex-1 justify-center px-4">
            <EmailOptInCard
              onOptInComplete={handleOptInComplete}
              onDismiss={handleDismiss}
              showDismiss={false}
              title="Get camping tips in your inbox"
              subtitle="Join thousands of campers getting weekly tips, trip ideas, and exclusive updates."
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
