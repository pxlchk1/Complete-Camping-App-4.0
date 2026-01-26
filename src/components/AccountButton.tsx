import React from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { DEEP_FOREST } from "../constants/colors";
import { auth } from "../config/firebase";

interface AccountButtonProps {
  color?: string;
  size?: number;
}

export default function AccountButton({ color = DEEP_FOREST, size = 28 }: AccountButtonProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handlePress = () => {
    // Check if user is logged in BEFORE navigating
    const user = auth.currentUser;

    if (!user) {
      // Not logged in - go straight to Auth screen
      navigation.navigate("Auth");
    } else {
      // Logged in - go to MyCampsite screen
      navigation.navigate("MyCampsite");
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      className="p-2 active:opacity-70"
    >
      <Ionicons name="person-circle-outline" size={size} color={color} />
    </Pressable>
  );
}
