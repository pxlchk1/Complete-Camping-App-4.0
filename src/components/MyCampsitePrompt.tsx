/**
 * MyCampsitePrompt
 *
 * A friendly, non-blocking inline card shown to brand new users on the Home
 * screen encouraging them to personalize their My Campsite profile.
 *
 * - Shows only for authenticated users who have NOT dismissed it.
 * - Tracks dismissal in AsyncStorage (durable across sessions).
 * - Also auto-dismisses when the user navigates to MyCampsite.
 * - Includes a small arrow pointing toward the top-right account icon.
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../config/firebase";
import {
  EARTH_GREEN,
  DEEP_FOREST,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
} from "../constants/colors";
import { RootStackParamList } from "../navigation/types";

const STORAGE_KEY = "@campsite_prompt_dismissed";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function MyCampsitePrompt() {
  const navigation = useNavigation<Nav>();
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // On mount, check AsyncStorage to decide visibility
  useEffect(() => {
    const checkDismissed = async () => {
      try {
        const dismissed = await AsyncStorage.getItem(STORAGE_KEY);
        if (!dismissed && auth.currentUser) {
          setVisible(true);
        }
      } catch {
        // Fail silently — don't show if storage is unavailable
      } finally {
        setLoaded(true);
      }
    };
    checkDismissed();
  }, []);

  // Auto-check on screen focus whether user has visited MyCampsite
  // (covers the case where they tapped the account icon directly)
  useFocusEffect(
    useCallback(() => {
      const recheck = async () => {
        try {
          const dismissed = await AsyncStorage.getItem(STORAGE_KEY);
          if (dismissed) setVisible(false);
        } catch {
          // no-op
        }
      };
      recheck();
    }, [])
  );

  const dismiss = useCallback(async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // no-op
    }
  }, []);

  const handleGoToCampsite = useCallback(async () => {
    await dismiss();
    navigation.navigate("MyCampsite");
  }, [dismiss, navigation]);

  // Don't render anything until loaded, or if not visible
  if (!loaded || !visible) return null;

  return (
    <View
      style={{
        backgroundColor: CARD_BACKGROUND_LIGHT,
        borderWidth: 1,
        borderColor: BORDER_SOFT,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}
    >
      {/* Arrow pointing toward top-right account icon */}
      <View
        style={{
          position: "absolute",
          top: -8,
          right: 24,
          width: 0,
          height: 0,
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderBottomWidth: 8,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: EARTH_GREEN,
        }}
      />

      {/* Content row */}
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {/* Icon */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#E8F5E9",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
            flexShrink: 0,
          }}
        >
          <Ionicons name="person-circle-outline" size={22} color={EARTH_GREEN} />
        </View>

        {/* Text */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              fontSize: 15,
              color: TEXT_PRIMARY_STRONG,
              marginBottom: 4,
            }}
          >
            {"Set up My Campsite"}
          </Text>
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 13,
              color: TEXT_SECONDARY,
              lineHeight: 19,
            }}
          >
            {"Take a minute to add your name, photo, and a few details so the app feels more like yours."}
          </Text>
        </View>

        {/* Dismiss button */}
        <Pressable
          onPress={dismiss}
          hitSlop={12}
          style={{ padding: 2, marginLeft: 4 }}
          accessibilityLabel="Dismiss campsite prompt"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={18} color={TEXT_SECONDARY} />
        </Pressable>
      </View>

      {/* CTA button */}
      <Pressable
        onPress={handleGoToCampsite}
        style={({ pressed }) => ({
          backgroundColor: DEEP_FOREST,
          borderRadius: 10,
          paddingVertical: 12,
          marginTop: 14,
          alignItems: "center",
          opacity: pressed ? 0.85 : 1,
        })}
        accessibilityLabel="Go to My Campsite"
        accessibilityRole="button"
      >
        <Text
          style={{
            fontFamily: "SourceSans3_600SemiBold",
            fontSize: 14,
            color: PARCHMENT,
          }}
        >
          Go to My Campsite
        </Text>
      </Pressable>
    </View>
  );
}
