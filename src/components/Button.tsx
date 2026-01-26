import React from "react";
import { Pressable, PressableProps, ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { hapticMedium } from "../utils/haptics";
import { colors, spacing, radius, textStyles, iconColors } from "../theme/theme";

export type ButtonVariant = "primary" | "secondary" | "text" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "style"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  children,
  loading = false,
  disabled = false,
  icon,
  iconPosition = "left",
  fullWidth = false,
  onPress,
  ...pressableProps
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = async (event: any) => {
    if (!isDisabled && onPress) {
      await hapticMedium();
      onPress(event);
    }
  };

  // Size-based padding
  const sizeStyles = {
    sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
    md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
    lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  // Variant-based styles (theme-based)
  const getVariantStyle = () => {
    switch (variant) {
      case "primary":
        return styles.buttonPrimary;
      case "secondary":
        return styles.buttonSecondary;
      case "text":
      case "ghost":
        return styles.buttonText;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case "primary":
        return textStyles.buttonPrimary;
      case "secondary":
      case "text":
      case "ghost":
        return textStyles.buttonSecondary;
    }
  };

  const getIconColor = () => {
    return variant === "primary" ? colors.parchment : colors.deepForest;
  };

  const getLoadingColor = () => {
    return variant === "primary" ? colors.parchment : colors.deepForest;
  };

  return (
    <Pressable
      {...pressableProps}
      onPress={handlePress}
      disabled={isDisabled}
      style={[
        styles.baseButton,
        getVariantStyle(),
        sizeStyles[size],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getLoadingColor()} />
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <View style={styles.iconLeft}>
              <Ionicons name={icon} size={iconSizes[size]} color={getIconColor()} />
            </View>
          )}
          <Text style={getTextStyle()}>{children}</Text>
          {icon && iconPosition === "right" && (
            <View style={styles.iconRight}>
              <Ionicons name={icon} size={iconSizes[size]} color={getIconColor()} />
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: {
    backgroundColor: colors.deepForest,
    borderRadius: radius.pill,
  },
  buttonSecondary: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.deepForest,
    backgroundColor: "transparent",
  },
  buttonText: {
    paddingVertical: spacing.xs,
    backgroundColor: "transparent",
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },
  iconLeft: {
    marginRight: spacing.xs,
  },
  iconRight: {
    marginLeft: spacing.xs,
  },
});
