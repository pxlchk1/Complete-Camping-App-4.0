/**
 * ConnectHandleGate
 *
 * Wraps community Create screens. If the signed-in user still has a
 * system-generated placeholder handle (e.g. "camper" / "camper12345"),
 * the gate shows a prompt directing them to Edit Profile so they can
 * claim a unique @handle before posting. Once the Zustand store
 * reflects a real handle the gate auto-resolves (no remount needed).
 */

import React from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCurrentUser } from "../state/userStore";
import { isPlaceholderHandle } from "../utils/gating";
import {
  DEEP_FOREST,
  TEXT_SECONDARY,
  BORDER_SOFT,
} from "../constants/colors";

interface ConnectHandleGateProps {
  children: React.ReactNode;
}

export default function ConnectHandleGate({ children }: ConnectHandleGateProps) {
  const user = useCurrentUser();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // If logged-in user has a valid (non-placeholder) handle, render children
  if (user && !isPlaceholderHandle(user.handle)) {
    return <>{children}</>;
  }

  return (
    <View className="flex-1 bg-parchment" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-3"
        style={{ borderBottomWidth: 1, borderBottomColor: BORDER_SOFT }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={DEEP_FOREST} />
        </Pressable>
        <Text
          className="ml-2 text-lg"
          style={{ fontFamily: "Raleway_600SemiBold", color: DEEP_FOREST }}
        >
          Set Up Your Profile
        </Text>
      </View>

      {/* Body */}
      <View className="flex-1 items-center justify-center px-8">
        <View className="items-center mb-8">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: `${DEEP_FOREST}15` }}
          >
            <Ionicons name="person-circle-outline" size={48} color={DEEP_FOREST} />
          </View>

          <Text
            className="text-2xl text-center mb-3"
            style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
          >
            Create Your Handle
          </Text>

          <Text
            className="text-base text-center leading-6"
            style={{
              fontFamily: "SourceSans3_400Regular",
              color: TEXT_SECONDARY,
            }}
          >
            {"Before posting in the community, you need a unique @handle so other campers can recognize you."}
          </Text>
        </View>

        <Pressable
          className="w-full rounded-xl py-4 items-center mb-4"
          style={{ backgroundColor: DEEP_FOREST }}
          onPress={() => navigation.navigate("EditProfile")}
        >
          <Text
            className="text-base text-parchment"
            style={{ fontFamily: "SourceSans3_600SemiBold" }}
          >
            Set Up My Profile
          </Text>
        </Pressable>

        <Pressable className="py-3" onPress={() => navigation.goBack()}>
          <Text
            className="text-sm"
            style={{
              fontFamily: "SourceSans3_400Regular",
              color: TEXT_SECONDARY,
            }}
          >
            {"I'll do this later"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
