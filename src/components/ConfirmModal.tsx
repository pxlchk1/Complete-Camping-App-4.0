/**
 * ConfirmModal
 *
 * Two-button confirmation modal that replaces Alert.alert() for destructive
 * or important user confirmations. Matches existing ErrorModal styling.
 *
 * Usage:
 *   <ConfirmModal
 *     visible={showConfirm}
 *     title="Delete Item"
 *     message="This action cannot be undone."
 *     confirmLabel="Delete"
 *     cancelLabel="Cancel"
 *     destructive
 *     onConfirm={() => { doDelete(); setShowConfirm(false); }}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */

import React from "react";
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

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, the confirm button is styled red to indicate destruction. */
  destructive?: boolean;
  /** Optional icon name (Ionicons). Defaults to "alert-circle" for destructive, "help-circle" otherwise. */
  iconName?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel: () => void;
}

const { width } = Dimensions.get("window");

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  iconName,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const resolvedIcon = iconName ?? (destructive ? "alert-circle" : "help-circle");
  const iconColor = destructive ? "#DC2626" : DEEP_FOREST;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name={resolvedIcon} size={48} color={iconColor} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                destructive ? styles.destructiveButton : styles.confirmButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
            </Pressable>
          </View>
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
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: "transparent",
  },
  confirmButton: {
    backgroundColor: DEEP_FOREST,
  },
  destructiveButton: {
    backgroundColor: "#DC2626",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  cancelButtonText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 16,
    color: TEXT_PRIMARY_STRONG,
  },
  confirmButtonText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 16,
    color: PARCHMENT,
  },
});
