import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { DEEP_FOREST, EARTH_GREEN, PARCHMENT, PARCHMENT_BORDER } from "../constants/colors";
import AboutModal from "./AboutModal";

export default function CustomBottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  useEffect(() => {
    // Function to update year at midnight CST
    const updateYear = () => {
      setCurrentYear(new Date().getFullYear());
    };

    // Calculate time until next midnight CST (UTC-6)
    const getTimeUntilNextMidnightCST = () => {
      const now = new Date();
      const cstOffset = -6 * 60; // CST is UTC-6
      const localOffset = now.getTimezoneOffset();
      const cstTime = new Date(now.getTime() + (localOffset + cstOffset) * 60000);

      const nextMidnightCST = new Date(cstTime);
      nextMidnightCST.setHours(24, 0, 0, 0);

      const timeUntilMidnight = nextMidnightCST.getTime() - cstTime.getTime();
      return timeUntilMidnight;
    };

    // Set initial timer
    const initialTimeout = setTimeout(() => {
      updateYear();
      // After first midnight, check daily
      const dailyInterval = setInterval(updateYear, 24 * 60 * 60 * 1000);
      return () => clearInterval(dailyInterval);
    }, getTimeUntilNextMidnightCST());

    return () => clearTimeout(initialTimeout);
  }, []);

  const getIconName = (routeName: string, focused: boolean): keyof typeof Ionicons.glyphMap => {
    switch (routeName) {
      case "Home":
        return focused ? "home" : "home-outline";
      case "Learn":
        return focused ? "book" : "book-outline";
      case "Plan":
        return focused ? "map" : "map-outline";
      case "Connect":
        return focused ? "people" : "people-outline";
      case "FirstAid":
        return "medical";
      default:
        return "home";
    }
  };

  const getLabel = (routeName: string): string => {
    switch (routeName) {
      case "Home":
        return "Home";
      case "Learn":
        return "Learn";
      case "Plan":
        return "Plan";
      case "Connect":
        return "Connect";
      case "FirstAid":
        return "First Aid";
      default:
        return routeName;
    }
  };

  return (
    <View>
      {/* Tab Bar */}
      <View className="flex-row bg-parchment border-t border-parchmentDark">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = async () => {
            // Trigger soft haptic feedback
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const color = isFocused ? DEEP_FOREST : EARTH_GREEN;
          const label = getLabel(route.name);

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              className="flex-1 items-center pt-3 pb-1 active:opacity-80"
            >
              <Ionicons
                name={getIconName(route.name, isFocused)}
                size={28}
                color={color}
              />
              <Text
                className="text-xs mt-1"
                style={{
                  color,
                  fontFamily: isFocused ? "SourceSans3_600SemiBold" : "SourceSans3_400Regular",
                  fontWeight: isFocused ? "600" : "500"
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Copyright Footer */}
      <View
        className="bg-parchment border-t border-parchmentDark items-center justify-center"
        style={{ paddingBottom: Math.max((insets.bottom || 12) / 2, 6), paddingTop: 8 }}
      >
        <View className="flex-row items-center">
          <Text className="text-earthGreen text-xs" style={{ fontFamily: "SourceSans3_400Regular" }}>
            ©{currentYear} Tent and Lantern, LLC •{" "}
          </Text>
          <Pressable
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAboutModalVisible(true);
            }}
            className="active:opacity-70"
          >
            <Text
              className="text-earthGreen text-xs underline"
              style={{ fontFamily: "SourceSans3_400Regular" }}
            >
              About
            </Text>
          </Pressable>
        </View>
      </View>

      {/* About Modal */}
      <AboutModal visible={aboutModalVisible} onClose={() => setAboutModalVisible(false)} />
    </View>
  );
}
