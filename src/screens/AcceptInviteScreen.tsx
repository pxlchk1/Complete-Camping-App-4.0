/**
 * Accept Invite Screen
 * Allows users to accept a campground invitation via deep link token
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../config/firebase";
import { redeemCampgroundInvite } from "../services/campgroundInviteService";
import { useUserStatus } from "../utils/authHelper";
import AccountRequiredModal from "../components/AccountRequiredModal";
import { RootStackParamList, RootStackNavigationProp } from "../navigation/types";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  RUST,
} from "../constants/colors";

type AcceptInviteRouteProp = RouteProp<RootStackParamList, "AcceptInvite">;

type InviteState = "loading" | "ready" | "accepting" | "success" | "error";

export default function AcceptInviteScreen() {
  const route = useRoute<AcceptInviteRouteProp>();
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isGuest } = useUserStatus();

  const { token } = route.params;

  const [state, setState] = useState<InviteState>("loading");
  const [inviterName, setInviterName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);

  useEffect(() => {
    // If user is guest, prompt to sign in
    if (isGuest) {
      setShowAccountModal(true);
      setState("ready");
    } else {
      // Token is ready to be redeemed
      setState("ready");
    }
  }, [isGuest, token]);

  const handleAcceptInvite = async () => {
    if (!token) {
      setErrorMessage("Invalid invite link");
      setState("error");
      return;
    }

    if (!auth.currentUser) {
      setShowAccountModal(true);
      return;
    }

    try {
      setState("accepting");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await redeemCampgroundInvite(token);

      if (result.success) {
        setInviterName(result.inviterName);
        setState("success");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setErrorMessage("Failed to accept invite");
        setState("error");
      }
    } catch (error: any) {
      console.error("Error accepting invite:", error);
      setErrorMessage(error.message || "Failed to accept invite");
      setState("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleGoToCampground = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs", params: { screen: "Profile" } }],
    });
    // Navigate to My Campground
    setTimeout(() => {
      navigation.navigate("MyCampground");
    }, 100);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const handleAccountModalClose = () => {
    setShowAccountModal(false);
  };

  const handleAuthSuccess = () => {
    setShowAccountModal(false);
    // After auth, try accepting the invite
    handleAcceptInvite();
  };

  // Loading state
  if (state === "loading") {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: PARCHMENT, paddingTop: insets.top }}
      >
        <ActivityIndicator size="large" color={DEEP_FOREST} />
        <Text
          className="mt-4"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
        >
          Loading invitation...
        </Text>
      </View>
    );
  }

  // Success state
  if (state === "success") {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: PARCHMENT, paddingTop: insets.top }}
      >
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: EARTH_GREEN + "20" }}
        >
          <Ionicons name="checkmark-circle" size={64} color={EARTH_GREEN} />
        </View>

        <Text
          className="text-2xl text-center mb-3"
          style={{ fontFamily: "SourceSans3_700Bold", color: TEXT_PRIMARY_STRONG }}
        >
          {"You're In! 🏕️"}
        </Text>

        <Text
          className="text-center mb-8"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, fontSize: 16 }}
        >
          {`You've joined ${inviterName}'s campground. You can now coordinate camping trips together!`}
        </Text>

        <Pressable
          onPress={handleGoToCampground}
          className="w-full py-4 rounded-xl active:opacity-90"
          style={{ backgroundColor: DEEP_FOREST }}
        >
          <Text
            className="text-center"
            style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT, fontSize: 16 }}
          >
            Go to My Campground
          </Text>
        </Pressable>
      </View>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: PARCHMENT, paddingTop: insets.top }}
      >
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: RUST + "20" }}
        >
          <Ionicons name="alert-circle" size={64} color={RUST} />
        </View>

        <Text
          className="text-2xl text-center mb-3"
          style={{ fontFamily: "SourceSans3_700Bold", color: TEXT_PRIMARY_STRONG }}
        >
          {"Couldn't Accept Invite"}
        </Text>

        <Text
          className="text-center mb-8"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, fontSize: 16 }}
        >
          {errorMessage || "This invite may have expired or already been used."}
        </Text>

        <Pressable
          onPress={handleClose}
          className="w-full py-4 rounded-xl active:opacity-90"
          style={{ backgroundColor: DEEP_FOREST }}
        >
          <Text
            className="text-center"
            style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT, fontSize: 16 }}
          >
            Close
          </Text>
        </Pressable>
      </View>
    );
  }

  // Ready state - show accept button
  return (
    <View
      className="flex-1 px-8"
      style={{ backgroundColor: PARCHMENT, paddingTop: insets.top }}
    >
      {/* Close button */}
      <Pressable
        onPress={handleClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full items-center justify-center active:opacity-70"
        style={{ backgroundColor: CARD_BACKGROUND_LIGHT, marginTop: insets.top }}
      >
        <Ionicons name="close" size={24} color={TEXT_PRIMARY_STRONG} />
      </Pressable>

      <View className="flex-1 items-center justify-center">
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: EARTH_GREEN + "20" }}
        >
          <Ionicons name="people" size={48} color={EARTH_GREEN} />
        </View>

        <Text
          className="text-2xl text-center mb-3"
          style={{ fontFamily: "SourceSans3_700Bold", color: TEXT_PRIMARY_STRONG }}
        >
          {"You're Invited! 🏕️"}
        </Text>

        <Text
          className="text-center mb-2"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, fontSize: 16 }}
        >
          Someone has invited you to join their campground on The Complete Camping App!
        </Text>

        <Text
          className="text-center mb-8"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED, fontSize: 14 }}
        >
          Join to coordinate camping trips, share packing lists, and plan adventures together.
        </Text>

        {/* Accept Button */}
        <Pressable
          onPress={handleAcceptInvite}
          disabled={state === "accepting"}
          className="w-full py-4 rounded-xl active:opacity-90"
          style={{ backgroundColor: DEEP_FOREST }}
        >
          {state === "accepting" ? (
            <ActivityIndicator size="small" color={PARCHMENT} />
          ) : (
            <Text
              className="text-center"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT, fontSize: 16 }}
            >
              Join Campground
            </Text>
          )}
        </Pressable>

        {/* Decline Link */}
        <Pressable
          onPress={handleClose}
          className="mt-4 py-2 active:opacity-70"
        >
          <Text
            className="text-center"
            style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_SECONDARY }}
          >
            Not Now
          </Text>
        </Pressable>
      </View>

      {/* Account Required Modal */}
      <AccountRequiredModal
        visible={showAccountModal}
        onCreateAccount={handleAuthSuccess}
        onMaybeLater={handleAccountModalClose}
      />
    </View>
  );
}
