/**
 * Upsell Modal Component
 * Dismissible soft upsell modal for trial prompts
 * 
 * Used for:
 * - Completion celebration (after first trip complete)
 * - Packing list intent (first generate attempt with >=5 gear)
 * - Invite/share intent (first share attempt)
 */

import React from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  TEXT_SECONDARY,
} from "../constants/colors";

interface UpsellModalProps {
  visible: boolean;
  title: string;
  body: string;
  primaryCtaText: string;
  secondaryCtaText: string;
  finePrint: string;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
  onDismiss: () => void;
}

export default function UpsellModal({
  visible,
  title,
  body,
  primaryCtaText,
  secondaryCtaText,
  finePrint,
  onPrimaryPress,
  onSecondaryPress,
  onDismiss,
}: UpsellModalProps) {
  
  const handlePrimaryPress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onPrimaryPress();
  };

  const handleSecondaryPress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onSecondaryPress();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <Pressable 
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.content}>
            {/* Title */}
            <Text style={styles.title}>{title}</Text>
            
            {/* Body */}
            <Text style={styles.body}>{body}</Text>
            
            {/* Primary CTA */}
            <Pressable
              style={styles.primaryButton}
              onPress={handlePrimaryPress}
            >
              <Text style={styles.primaryButtonText}>{primaryCtaText}</Text>
            </Pressable>
            
            {/* Secondary CTA */}
            <Pressable
              style={styles.secondaryButton}
              onPress={handleSecondaryPress}
            >
              <Text style={styles.secondaryButtonText}>{secondaryCtaText}</Text>
            </Pressable>
            
            {/* Fine Print */}
            <Text style={styles.finePrint}>{finePrint}</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContainer: {
    width: "85%",
    maxWidth: 340,
    backgroundColor: PARCHMENT,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    padding: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontFamily: "SourceSans3_700Bold",
    color: DEEP_FOREST,
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    fontFamily: "SourceSans3_400Regular",
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: DEEP_FOREST,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 17,
    fontFamily: "SourceSans3_600SemiBold",
    color: PARCHMENT,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: "SourceSans3_500Medium",
    color: EARTH_GREEN,
  },
  finePrint: {
    fontSize: 13,
    fontFamily: "SourceSans3_400Regular",
    color: TEXT_SECONDARY,
    textAlign: "center",
    opacity: 0.8,
  },
});
