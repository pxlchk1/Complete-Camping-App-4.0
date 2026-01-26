/**
 * Admin Award Subscriptions Screen
 * Allows admin to grant premium subscriptions to users
 */

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { auth, db } from "../config/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import ModalHeader from "../components/ModalHeader";
import {
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  EARTH_GREEN,
  DEEP_FOREST,
} from "../constants/colors";

const SUBSCRIPTION_DURATIONS = [
  { id: "1_month", label: "1 Month", months: 1 },
  { id: "3_months", label: "3 Months", months: 3 },
  { id: "6_months", label: "6 Months", months: 6 },
  { id: "1_year", label: "1 Year", months: 12 },
  { id: "lifetime", label: "Lifetime", months: null },
];

export default function AdminSubscriptionsScreen() {
  const [email, setEmail] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAwardSubscription = async () => {
    if (!email.trim() || !selectedDuration) {
      Alert.alert("Missing Information", "Please enter an email and select a duration");
      return;
    }

    try {
      setLoading(true);

      // Find user by email
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert("User Not Found", "No user found with that email address");
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userId = userDoc.id;
      const duration = SUBSCRIPTION_DURATIONS.find(d => d.id === selectedDuration);

      if (!duration) return;

      // Calculate expiration date
      let expiresAt = null;
      if (duration.months !== null) {
        const now = new Date();
        now.setMonth(now.getMonth() + duration.months);
        expiresAt = now.toISOString();
      }

      // Update user document
      await updateDoc(doc(db, "users", userId), {
        membershipTier: "subscribed",
        subscriptionProvider: "admin_granted",
        subscriptionStatus: "active",
        subscriptionUpdatedAt: serverTimestamp(),
        subscriptionExpiresAt: expiresAt,
        grantedBy: auth.currentUser?.email || "admin",
        grantedAt: serverTimestamp(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Success",
        `${duration.label} premium subscription awarded to ${email}`,
        [
          {
            text: "OK",
            onPress: () => {
              setEmail("");
              setSelectedDuration("");
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Error awarding subscription:", error);
      Alert.alert("Error", error.message || "Failed to award subscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader title="Award Subscriptions" showTitle />

      <ScrollView className="flex-1">
        <View className="px-5 pt-5 pb-8">
          {/* Info Card */}
          <View
            className="mb-6 p-4 rounded-xl border"
            style={{ backgroundColor: "#E3F2FD", borderColor: "#2196F3" }}
          >
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#2196F3" style={{ marginRight: 8, marginTop: 2 }} />
              <Text
                className="flex-1 text-sm"
                style={{ fontFamily: "SourceSans3_400Regular", color: "#1565C0" }}
              >
                Award premium subscriptions to users by entering their email address and selecting a duration.
              </Text>
            </View>
          </View>

          {/* User Email Input */}
          <View className="mb-6">
            <Text
              className="mb-2"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              User Email *
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="user@example.com"
              placeholderTextColor={TEXT_MUTED}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              className="px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderColor: BORDER_SOFT,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
              }}
            />
          </View>

          {/* Duration Selection */}
          <View className="mb-6">
            <Text
              className="mb-3"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              Subscription Duration *
            </Text>

            {SUBSCRIPTION_DURATIONS.map((duration) => (
              <Pressable
                key={duration.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDuration(duration.id);
                }}
                className="mb-2 p-4 rounded-xl border active:opacity-70"
                style={{
                  backgroundColor: selectedDuration === duration.id ? DEEP_FOREST : CARD_BACKGROUND_LIGHT,
                  borderColor: selectedDuration === duration.id ? DEEP_FOREST : BORDER_SOFT,
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons
                      name={selectedDuration === duration.id ? "radio-button-on" : "radio-button-off"}
                      size={24}
                      color={selectedDuration === duration.id ? PARCHMENT : TEXT_SECONDARY}
                      style={{ marginRight: 12 }}
                    />
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 16,
                        color: selectedDuration === duration.id ? PARCHMENT : TEXT_PRIMARY_STRONG,
                      }}
                    >
                      {duration.label}
                    </Text>
                  </View>
                  {duration.months === null && (
                    <View
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: "#FFD700" }}
                    >
                      <Text
                        className="text-xs"
                        style={{ fontFamily: "SourceSans3_600SemiBold", color: "#000" }}
                      >
                        UNLIMITED
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </View>

          {/* Award Button */}
          <Pressable
            onPress={handleAwardSubscription}
            disabled={loading || !email.trim() || !selectedDuration}
            className="p-4 rounded-xl items-center active:opacity-70"
            style={{
              backgroundColor: (!email.trim() || !selectedDuration) ? "#CCCCCC" : DEEP_FOREST,
            }}
          >
            {loading ? (
              <ActivityIndicator color={PARCHMENT} />
            ) : (
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 16,
                  color: PARCHMENT,
                }}
              >
                Award Subscription
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
