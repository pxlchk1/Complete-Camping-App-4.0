import React from "react";
import { View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AccountButton from "./AccountButton";
import { spacing } from "../theme/theme";

interface AccountButtonHeaderProps {
  color?: string;
  style?: ViewStyle;
}

/**
 * Consistently positioned AccountButton for screen headers
 * Uses the standard placement from WeatherScreen across the app
 */
export default function AccountButtonHeader({ color, style }: AccountButtonHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          position: "absolute",
          top: insets.top + 8,
          right: spacing.lg,
          zIndex: 10,
        },
        style,
      ]}
    >
      <AccountButton color={color} />
    </View>
  );
}
