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
 * - "Go to My Campsite" tap matches the account icon behavior exactly:
 *   logged-in → MyCampsite, logged-out → Auth.
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
    // Match AccountButton behavior exactly:
    // logged-in → MyCampsite, logged-out → Auth
    const user = auth.currentUser;
    if (!user) {
      navigation.navigate("Auth");
    } else {
      navigation.navigate("MyCampsite");
    }
  }, [dismiss, navigation]);

  // Don't render anything until loaded, or if not visible
  if (!loaded || !visible) return null;

  return (
    <View
      style={{
        backgroundColor: PARCHMENT,
        borderWidth: 1,
        borderColor: BORDER_SOFT,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
      }}
    >
      {/* Arrow pointing toward top-right account icon */}
      <View
        style={{
          position: "absolute",
          top: -8,
          right: 28,
          width: 0,
          height: 0,
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderBottomWidth: 8,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: BORDER_SOFT,
        }}
      />
      {/* Inner arrow (fills the triangle with PARCHMENT) */}
      <View
        style={{
          position: "absolute",
          top: -6,
          right: 29,
          width: 0,
          height: 0,
          borderLeftWidth: 7,
          borderRightWidth: 7,
          borderBottomWidth: 7,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: PARCHMENT,
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
            backgroundColor: EARTH_GREEN + "18",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
            flexShrink: 0,
          }}
        >
          <Ionicons name="person-circle-outline" size={22} color={EARTH_GREEN} />
        </View>

        {/* Text */}
        <View style={{ flex: 1, paddingRight: 4 }}>
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
          style={{ padding: 4, marginLeft: 4, marginTop: -2 }}
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
