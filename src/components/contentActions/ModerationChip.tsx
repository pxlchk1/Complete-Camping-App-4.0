/**
 * ModerationChip Component
 * 
 * A small red outline pill shown to admins/moderators on content they don't own.
 * Tapping opens moderation actions for quick content management.
 */

import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";

export type ModerationRoleLabel = "ADMIN" | "MOD";

export interface ModerationChipProps {
  /** Whether to show the chip */
  visible: boolean;
  /** Label to display: ADMIN or MOD */
  label: ModerationRoleLabel;
  /** Callback when chip is pressed */
  onPress: () => void;
  /** Whether chip is disabled/loading */
  disabled?: boolean;
  /** Size variant */
  size?: "small" | "medium";
}

export function ModerationChip({
  visible,
  label,
  onPress,
  disabled = false,
  size = "small",
}: ModerationChipProps) {
  if (!visible) return null;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const sizeStyles = size === "small" ? styles.small : styles.medium;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        styles.chip,
        sizeStyles,
        disabled && styles.disabled,
      ]}
      accessibilityLabel={`${label} moderation actions`}
      accessibilityRole="button"
    >
      <Text style={[styles.label, size === "small" ? styles.labelSmall : styles.labelMedium]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: "#DC2626",
    borderRadius: 12,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  medium: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: {
    fontFamily: "SourceSans3_700Bold",
    color: "#DC2626",
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: 9,
  },
  labelMedium: {
    fontSize: 10,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default ModerationChip;
