/**
 * HandleLink Component
 * 
 * A clickable @handle that navigates to the user's My Campsite profile.
 * Use this anywhere a user's handle is displayed in the Connect section.
 */

import React from "react";
import { Text, Pressable, StyleProp, TextStyle } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { DEEP_FOREST } from "../constants/colors";

interface HandleLinkProps {
  /** The user's handle (without @ prefix) */
  handle: string;
  /** The user's ID for navigation */
  userId: string;
  /** Optional text to show before the handle (e.g., "by ") */
  prefix?: string;
  /** Optional text to show after the handle */
  suffix?: string;
  /** Custom text style */
  style?: StyleProp<TextStyle>;
  /** Font family for the handle */
  fontFamily?: string;
  /** Font size */
  fontSize?: number;
  /** Text color for the handle (will be slightly different to indicate it's clickable) */
  color?: string;
  /** Whether to show the @ prefix */
  showAtSymbol?: boolean;
}

export default function HandleLink({
  handle,
  userId,
  prefix,
  suffix,
  style,
  fontFamily = "SourceSans3_600SemiBold",
  fontSize = 13,
  color = DEEP_FOREST,
  showAtSymbol = true,
}: HandleLinkProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Normalize handle - remove any existing @ prefix
  const normalizedHandle = handle?.replace(/^@+/, "") || "";

  const handlePress = () => {
    if (userId) {
      navigation.navigate("MyCampsite", { userId });
    }
  };

  if (!normalizedHandle) {
    return null;
  }

  return (
    <Pressable onPress={handlePress} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
      <Text style={[{ fontFamily, fontSize, color }, style]}>
        {prefix}
        <Text style={{ textDecorationLine: "underline" }}>
          {showAtSymbol ? "@" : ""}{normalizedHandle}
        </Text>
        {suffix}
      </Text>
    </Pressable>
  );
}

/**
 * Inline version of HandleLink that can be used within a Text component
 * Note: This version doesn't support navigation on its own - wrap in Pressable if needed
 */
export function HandleText({
  handle,
  showAtSymbol = true,
  style,
}: {
  handle: string;
  showAtSymbol?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const normalizedHandle = handle?.replace(/^@+/, "") || "";
  
  return (
    <Text style={[{ textDecorationLine: "underline" }, style]}>
      {showAtSymbol ? "@" : ""}{normalizedHandle}
    </Text>
  );
}
