/**
 * Modal Header Component
 * Dark forest green header that extends beyond safe zone
 * Used for all modal and detail screens
 */

import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEEP_FOREST, PARCHMENT } from "../constants/colors";

interface ModalHeaderProps {
  title?: string;
  showTitle?: boolean;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
  onBack?: () => void;
  onInfoPress?: () => void;
}

export default function ModalHeader({
  title,
  showTitle = false,
  rightAction,
  onBack,
  onInfoPress,
}: ModalHeaderProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View
      style={{
        backgroundColor: DEEP_FOREST,
        paddingTop: insets.top,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 14,
        }}
      >
        {/* Back Button */}
        <Pressable
          onPress={handleBack}
          style={{ padding: 4 }}
          className="active:opacity-70"
        >
          <Ionicons name="arrow-back" size={24} color={PARCHMENT} />
        </Pressable>

        {/* Title with optional info button */}
        {showTitle && title && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{
                fontFamily: "Raleway_700Bold",
                fontSize: 16,
                color: PARCHMENT,
              }}
            >
              {title}
            </Text>
            {onInfoPress && (
              <Pressable onPress={onInfoPress} style={{ padding: 2 }} accessibilityLabel="Info">
                <Ionicons name="information-circle-outline" size={20} color={PARCHMENT} />
              </Pressable>
            )}
          </View>
        )}

        {/* Right Action (optional) */}
        {rightAction ? (
          <Pressable
            onPress={rightAction.onPress}
            style={{ padding: 4 }}
            className="active:opacity-70"
          >
            <Ionicons name={rightAction.icon} size={24} color={PARCHMENT} />
          </Pressable>
        ) : (
          <View style={{ width: 32 }} />
        )}
      </View>
    </View>
  );
}
