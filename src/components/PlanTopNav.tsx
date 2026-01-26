import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import * as Haptics from "expo-haptics";
import { colors, fonts } from "../theme/theme";
import { DEEP_FOREST } from "../constants/colors";

type PlanTopNavNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type NavItem = "trips" | "parks" | "weather";

interface PlanTopNavProps {
  activeTab: NavItem;
  onTabChange?: (tab: NavItem) => void;
}

export default function PlanTopNav({ activeTab, onTabChange }: PlanTopNavProps) {
  const navigation = useNavigation<PlanTopNavNavigationProp>();

  const handleTabPress = async (tab: NavItem) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const navItems: { id: NavItem; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { id: "trips", icon: "calendar", label: "Plan" },
    { id: "parks", icon: "earth", label: "Parks" },
    { id: "weather", icon: "cloud", label: "Weather" },
  ];

  return (
    <View className="bg-parchment border-b border-cream-200">
      <View className="flex-row px-2">
        {navItems.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => handleTabPress(tab.id)}
            className={`flex-1 py-3 items-center border-b-2 ${
              activeTab === tab.id ? "border-amber-600" : "border-transparent"
            }`}
          >
            <View className="items-center justify-center">
              <Ionicons
                name={tab.icon}
                size={18}
                color={activeTab === tab.id ? DEEP_FOREST : "#696969"}
              />
              <Text
                className={`text-xs mt-0.5 text-center ${
                  activeTab === tab.id ? "text-forest-800" : "text-stone-600"
                }`}
                style={{ fontFamily: fonts.bodySemibold }}
              >
                {tab.label}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
