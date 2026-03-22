/**
 * Accept Invite Screen
 * Allows users to accept a campground invitation via deep link token.
 * Handles logged-in, logged-out, new-user, already-member, and invalid-invite flows.
 */

import React, { useState, useEffect, useRef } from "react";
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
  BORDER_SOFT,
  CARD_BACKGROUND_LIGHT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  RUST,
} from "../constants/colors";

type AcceptInviteRouteProp = RouteProp<RootStackParamList, "AcceptInvite">;

type InviteState = "loading" | "ready" | "accepting" | "success" | "already_member" | "invalid" | "error";

export default function AcceptInviteScreen() {
  const route = useRoute<AcceptInviteRouteProp>();
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isGuest } = useUserStatus();
  const acceptingRef = useRef(false);

  const { token } = route.params;

  const [state, setState] = useState<InviteState>("loading");
  const [inviterName, setInviterName] = useState<string | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    if (isGuest) {
      setShowAccountModal(true);
      setState("ready");
    } else {
      setState("ready");
    }
  }, [isGuest, token]);

  const handleAcceptInvite = async () => {
    if (!token) {
      setState("invalid");
      return;
    }

    if (!auth.currentUser) {
      setShowAccountModal(true);
      return;
    }

    // Prevent duplicate taps
    if (acceptingRef.current) return;
    acceptingRef.current = true;

    try {
      setState("accepting");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await redeemCampgroundInvite(token);

      if (result.success) {
        setInviterName(result.inviterName || null);
        setState("success");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setState("invalid");
      }
    } catch (error: any) {
      const msg: string = (error.message || "").toLowerCase();

      // "Invalid or expired invite" — token missing, expired, revoked, or already used
      // "Invite has expired" — explicit expiration
      // "not-found" — no matching pending invite
      // All of these mean the invite is unavailable. We cannot confirm
      // already-member status without a local membership lookup, so
      // default to the unavailable state for safety.
      if (
        msg.includes("invalid or expired") ||
        msg.includes("expired") ||
        msg.includes("not-found") ||
        msg.includes("already") ||
        msg.includes("revoked")
      ) {
        setState("invalid");
      } else {
        setState("error");
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      acceptingRef.current = false;
    }
  };

  const handleGoToCampground = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs", params: { screen: "Profile" } }],
    });
    setTimeout(() => {
      navigation.navigate("MyCampground");
    }, 100);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    }
  };

  const handleAccountModalClose = () => {
    setShowAccountModal(false);
  };

  const handleAuthSuccess = () => {
    setShowAccountModal(false);
    handleAcceptInvite();
  };

  // --- Loading state ---
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

  // --- Success state ---
  if (state === "success") {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: PARCHMENT, paddingTop: insets.top }}
      >
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: EARTH_GREEN + "20" }}
        >
          <Ionicons name="checkmark-circle" size={52} color={EARTH_GREEN} />
        </View>

        <Text
          className="text-2xl text-center mb-3"
          style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
        >
          Campground invite
        </Text>

        <Text
          className="text-center mb-10"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, fontSize: 16, lineHeight: 22 }}
        >
          {"You've joined the campground."}
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
            Open campground
          </Text>
        </Pressable>
      </View>
    );
  }

  // --- Already-member state ---
  if (state === "already_member") {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: PARCHMENT, paddingTop: insets.top }}
      >
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: EARTH_GREEN + "20" }}
        >
          <Ionicons name="people" size={44} color={EARTH_GREEN} />
        </View>

        <Text
          className="text-2xl text-center mb-3"
          style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
        >
          Campground invite
        </Text>

        <Text
          className="text-center mb-10"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, fontSize: 16, lineHeight: 22 }}
        >
          {"You're already part of this campground."}
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
            Open campground
          </Text>
        </Pressable>
      </View>
    );
  }

  // --- Invalid / expired invite state ---
  if (state === "invalid") {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: PARCHMENT, paddingTop: insets.top }}
      >
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: TEXT_MUTED + "20" }}
        >
          <Ionicons name="mail-unread-outline" size={44} color={TEXT_MUTED} />
        </View>

        <Text
          className="text-2xl text-center mb-3"
          style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
        >
          Campground invite
        </Text>

        <Text
          className="text-center mb-10"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, fontSize: 16, lineHeight: 22 }}
        >
          This invite is no longer available.
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
            Open campground
          </Text>
        </Pressable>

        <Pressable
          onPress={handleClose}
          className="mt-4 py-2 active:opacity-70"
        >
          <Text
            className="text-center"
            style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_SECONDARY }}
          >
            Go home
          </Text>
        </Pressable>
      </View>
    );
  }

  // --- Generic error state ---
  if (state === "error") {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: PARCHMENT, paddingTop: insets.top }}
      >
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: RUST + "20" }}
        >
          <Ionicons name="alert-circle" size={52} color={RUST} />
        </View>

        <Text
          className="text-2xl text-center mb-3"
          style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
        >
          Campground invite
        </Text>

        <Text
          className="text-center mb-10"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, fontSize: 16, lineHeight: 22 }}
        >
          Something went wrong. Please try again.
        </Text>

        <Pressable
          onPress={() => {
            setState("ready");
          }}
          className="w-full py-4 rounded-xl active:opacity-90"
          style={{ backgroundColor: DEEP_FOREST }}
        >
          <Text
            className="text-center"
            style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT, fontSize: 16 }}
          >
            Try again
          </Text>
        </Pressable>

        <Pressable
          onPress={handleClose}
          className="mt-4 py-2 active:opacity-70"
        >
          <Text
            className="text-center"
            style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_SECONDARY }}
          >
            Go home
          </Text>
        </Pressable>
      </View>
    );
  }

  // --- Ready state - show accept button ---
  return (
    <View
      className="flex-1 px-8"
      style={{ backgroundColor: PARCHMENT, paddingTop: insets.top }}
    >
      {/* Close button */}
      <Pressable
        onPress={handleClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full items-center justify-center active:opacity-70 z-10"
        style={{ backgroundColor: CARD_BACKGROUND_LIGHT, marginTop: insets.top }}
      >
        <Ionicons name="close" size={24} color={TEXT_PRIMARY_STRONG} />
      </Pressable>

      <View className="flex-1 items-center justify-center">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: EARTH_GREEN + "20" }}
        >
          <Ionicons name="people" size={44} color={EARTH_GREEN} />
        </View>

        <Text
          className="text-2xl text-center mb-3"
          style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
        >
          Campground invite
        </Text>

        <Text
          className="text-center mb-8"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, fontSize: 16, lineHeight: 22 }}
        >
          {"You've been invited to join a campground."}
        </Text>

        {isGuest && (
          <View
            className="w-full rounded-xl p-4 mb-6 flex-row items-center"
            style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderWidth: 1, borderColor: BORDER_SOFT }}
          >
            <Ionicons name="information-circle-outline" size={20} color={TEXT_SECONDARY} />
            <Text
              className="ml-3 flex-1"
              style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, fontSize: 14, lineHeight: 20 }}
            >
              Log in or create an account to accept this invite.
            </Text>
          </View>
        )}

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
              Accept invite
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
            Not now
          </Text>
        </Pressable>
      </View>

      {/* Account Required Modal */}
      <AccountRequiredModal
        visible={showAccountModal}
        onCreateAccount={handleAuthSuccess}
        onMaybeLater={handleAccountModalClose}
        triggerKey="my_campground_quick_action"
      />
    </View>
  );
}
