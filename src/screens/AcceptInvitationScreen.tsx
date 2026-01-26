/**
 * Accept Invitation Screen
 * Handles campground invitation acceptance via deep link
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { auth } from "../config/firebase";
import {
  getInvitationData,
  acceptInvitation,
  InvitationData,
} from "../services/deepLinkService";
import { RootStackParamList } from "../navigation/types";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../constants/colors";

type AcceptInvitationRouteProp = RouteProp<RootStackParamList, "AcceptInvitation">;

export default function AcceptInvitationScreen() {
  const navigation = useNavigation();
  const route = useRoute<AcceptInvitationRouteProp>();
  const { invitationToken } = route.params;

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvitation();
  }, []);

  const loadInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getInvitationData(invitationToken);

      if (!data) {
        setError("This invitation link is invalid or has been removed.");
        return;
      }

      if (data.status === "expired") {
        setError("This invitation has expired. Please ask for a new invitation.");
        return;
      }

      if (data.status === "accepted") {
        setError("This invitation has already been accepted.");
        return;
      }

      setInvitation(data);
    } catch (err: any) {
      console.error("Error loading invitation:", err);
      setError("Failed to load invitation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    const user = auth.currentUser;

    if (!user) {
      // Redirect to sign up with invitation token
      Alert.alert(
        "Sign In Required",
        "Please sign in or create an account to accept this invitation.",
        [
          {
            text: "Sign In",
            onPress: () => {
              navigation.navigate("Auth" as any, { invitationToken });
            },
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }

    if (!invitation) return;

    // Check if email matches
    if (user.email?.toLowerCase() !== invitation.recipientEmail.toLowerCase()) {
      Alert.alert(
        "Wrong Account",
        `This invitation was sent to ${invitation.recipientEmail}. Please sign out and sign in with that email address.`,
        [{ text: "OK" }]
      );
      return;
    }

    try {
      setAccepting(true);
      await acceptInvitation(invitationToken);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        "Welcome to the Campground! 🏕️",
        `You've successfully joined ${invitation.inviterName}'s campground. You'll now be included in their camping trips.`,
        [
          {
            text: "View My Campground",
            onPress: () => {
              navigation.navigate("MyCampground" as any);
            },
          },
        ]
      );
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      Alert.alert("Error", err.message || "Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={EARTH_GREEN} />
          <Text
            className="mt-4"
            style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
          >
            Loading invitation...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !invitation) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle" size={64} color={TEXT_MUTED} />
          <Text
            className="text-xl mt-4 mb-2 text-center"
            style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
          >
            Invitation Not Available
          </Text>
          <Text
            className="text-center mb-6"
            style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
          >
            {error}
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            className="px-6 py-3 rounded-xl active:opacity-70"
            style={{ backgroundColor: DEEP_FOREST }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <View className="flex-1 px-6 pt-8">
        {/* Header */}
        <View className="items-center mb-8">
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
          >
            <Ionicons name="mail-open" size={48} color={EARTH_GREEN} />
          </View>
          <Text
            className="text-3xl text-center"
            style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
          >
            You're Invited!
          </Text>
        </View>

        {/* Invitation Details */}
        <View
          className="p-6 rounded-xl mb-6"
          style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
        >
          <Text
            className="text-lg mb-4 text-center"
            style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
          >
            {invitation.inviterName} wants you to join their campground
          </Text>

          <View className="space-y-3">
            <View className="flex-row items-center">
              <Ionicons name="person" size={20} color={EARTH_GREEN} />
              <Text
                className="ml-3"
                style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
              >
                Invited as: {invitation.recipientName}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="mail" size={20} color={EARTH_GREEN} />
              <Text
                className="ml-3"
                style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
              >
                {invitation.recipientEmail}
              </Text>
            </View>
          </View>
        </View>

        {/* Benefits */}
        <View className="mb-6">
          <Text
            className="text-base mb-3"
            style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
          >
            By joining their campground, you'll:
          </Text>
          <View className="space-y-2">
            <View className="flex-row items-start">
              <Ionicons name="checkmark-circle" size={20} color={EARTH_GREEN} />
              <Text
                className="ml-2 flex-1"
                style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
              >
                Be included in their camping trip plans
              </Text>
            </View>
            <View className="flex-row items-start">
              <Ionicons name="checkmark-circle" size={20} color={EARTH_GREEN} />
              <Text
                className="ml-2 flex-1"
                style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
              >
                Share packing lists and meal plans
              </Text>
            </View>
            <View className="flex-row items-start">
              <Ionicons name="checkmark-circle" size={20} color={EARTH_GREEN} />
              <Text
                className="ml-2 flex-1"
                style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
              >
                Coordinate gear and supplies together
              </Text>
            </View>
          </View>
        </View>

        {/* Accept Button */}
        <Pressable
          onPress={handleAccept}
          disabled={accepting}
          className="py-3 rounded-lg items-center active:opacity-70 mb-4"
          style={{ backgroundColor: EARTH_GREEN }}
        >
          {accepting ? (
            <ActivityIndicator color={PARCHMENT} />
          ) : (
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 15, color: PARCHMENT }}>
              Accept Invitation
            </Text>
          )}
        </Pressable>

        {/* Decline Button */}
        <Pressable
          onPress={() => navigation.goBack()}
          className="py-3 items-center active:opacity-70"
        >
          <Text style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
            Not Now
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
