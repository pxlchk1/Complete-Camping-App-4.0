/**
 * ErrorModal
 * 
 * Simple error display modal with customizable title and message.
 * Logs the error message to console for debugging.
 */

import React, { useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  DEEP_FOREST,
  PARCHMENT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  BORDER_SOFT,
} from "../constants/colors";

interface ErrorModalProps {
  visible: boolean;
  title: string;
  message: string;
  onDismiss: () => void;
}

const { width } = Dimensions.get("window");

export default function ErrorModal({
  visible,
  title,
  message,
  onDismiss,
}: ErrorModalProps) {
  // Log error to console when shown
  useEffect(() => {
    if (visible) {
      console.error(`[ErrorModal] ${title}: ${message}`);
    }
  }, [visible, title, message]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={48} color="#DC2626" />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Dismiss Button */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={onDismiss}
          >
            <Text style={styles.buttonText}>Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    width: width - 48,
    maxWidth: 340,
    borderRadius: 16,
    backgroundColor: PARCHMENT,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontFamily: "Raleway_700Bold",
    fontSize: 20,
    color: TEXT_PRIMARY_STRONG,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: DEEP_FOREST,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 16,
    color: PARCHMENT,
  },
});
