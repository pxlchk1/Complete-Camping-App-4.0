/**
 * EmailOptInModal
 *
 * Modal wrapper for EmailOptInCard.
 * Used for first-run or Home screen prompts to subscribe to email drip.
 */

import React from "react";
import {
  Modal,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import EmailOptInCard from "./EmailOptInCard";
import {
  PARCHMENT,
  PARCHMENT_SOFT,
  EARTH_GREEN,
  GRANITE_GOLD,
} from "../constants/colors";
import { fonts, shadows, radius } from "../theme/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(26, 47, 28, 0.82)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
        }}
        onPress={handleDismiss}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: Math.min(SCREEN_WIDTH * 0.90, 400),
              maxHeight: SCREEN_HEIGHT * 0.78,
              backgroundColor: PARCHMENT,
              borderRadius: 24,
              overflow: "hidden",
              ...shadows.modal,
            }}
          >
            {/* ── Header row ── */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingTop: 22,
                paddingBottom: 2,
                paddingHorizontal: 22,
              }}
            >
              {/* Icon badge */}
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: PARCHMENT_SOFT,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="mail-outline" size={20} color={GRANITE_GOLD} />
              </View>

              {/* Eyebrow label */}
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 13,
                  color: EARTH_GREEN,
                  letterSpacing: 0.3,
                  flex: 1,
                }}
              >
                Camper tip
              </Text>

              {/* Close */}
              <Pressable
                onPress={handleDismiss}
                hitSlop={14}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: PARCHMENT_SOFT,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="close" size={16} color={EARTH_GREEN} />
              </Pressable>
            </View>

            {/* ── Content (scrollable for small screens / keyboard) ── */}
            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 22,
                paddingTop: 14,
                paddingBottom: 22,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <EmailOptInCard
                onOptInComplete={handleOptInComplete}
                onDismiss={handleDismiss}
                showDismiss={false}
                title="Get camping tips in your inbox"
                subtitle="Join thousands of campers getting weekly tips, trip ideas, and exclusive updates."
              />
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
