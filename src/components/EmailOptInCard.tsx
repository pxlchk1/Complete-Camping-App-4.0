/**
 * EmailOptInCard
 * 
 * UI component for explicit email opt-in consent.
 * Collects email (prefilled if available) and first name (optional).
 * Requires checkbox consent before "Turn on emails" button is active.
 * 
 * On submit:
 * 1. Updates users/{uid} with emailSubscribed=true, emailSubscribedAt
 * 2. Upserts emailSubscribers/{uid} document
 * 3. Calls sendgridSubscribeToDrip Cloud Function to add to SendGrid
 * 
 * The SendGrid function adds the contact to "CCA Drip Entry" list,
 * which triggers the automated drip campaign.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { auth, db } from "../config/firebase";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable, getFunctions } from "firebase/functions";
import {
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  EARTH_GREEN,
  DEEP_FOREST,
} from "../constants/colors";

interface EmailOptInCardProps {
  /** Callback when opt-in completes successfully */
  onOptInComplete?: () => void;
  /** Callback when user dismisses the card (e.g., "Not now") */
  onDismiss?: () => void;
  /** Whether to show the dismiss button */
  showDismiss?: boolean;
  /** Custom title text */
  title?: string;
  /** Custom subtitle text */
  subtitle?: string;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailOptInCard({
  onOptInComplete,
  onDismiss,
  showDismiss = true,
  title = "Stay in the loop",
  subtitle = "Get camping tips, trip ideas, and app updates delivered to your inbox.",
}: EmailOptInCardProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill email and first name from current user
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      if (user.email) {
        setEmail(user.email);
      }
      if (user.displayName) {
        // Extract first name from display name
        const firstNameFromDisplay = user.displayName.split(" ")[0];
        if (firstNameFromDisplay) {
          setFirstName(firstNameFromDisplay);
        }
      }
    }
  }, []);

  // Check if form is valid
  const isEmailValid = EMAIL_REGEX.test(email.trim());
  const isFormValid = isEmailValid && isChecked;

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    const user = auth.currentUser;
    if (!user) {
      setError("You must be signed in to subscribe.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const normalizedEmail = email.trim().toLowerCase();
      const trimmedFirstName = firstName.trim();

      // Step 1: Update users/{uid} document
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        emailSubscribed: true,
        emailSubscribedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Step 2: Upsert emailSubscribers/{uid} document
      const subscriberRef = doc(db, "emailSubscribers", user.uid);
      await setDoc(
        subscriberRef,
        {
          email: normalizedEmail,
          userId: user.uid,
          unsubscribed: false,
          source: "app_optin",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Check if createdAt exists, if not add it
      await setDoc(
        subscriberRef,
        {
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Step 3: Call Cloud Function to add to SendGrid
      const functions = getFunctions();
      const sendgridSubscribeToDrip = httpsCallable<
        {
          email: string;
          firstName: string;
          userId: string;
          source: string;
        },
        { success: boolean; message: string; contactId?: string }
      >(functions, "sendgridSubscribeToDrip");

      const result = await sendgridSubscribeToDrip({
        email: normalizedEmail,
        firstName: trimmedFirstName,
        userId: user.uid,
        source: "app_optin",
      });

      if (result.data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onOptInComplete?.();
      } else {
        throw new Error(result.data.message || "Failed to subscribe");
      }
    } catch (err) {
      console.error("[EmailOptInCard] Error subscribing:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Revert Firestore changes on error
      try {
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
            emailSubscribed: false,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (revertErr) {
        console.error("[EmailOptInCard] Error reverting:", revertErr);
      }

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      className="rounded-2xl border p-4"
      style={{
        backgroundColor: CARD_BACKGROUND_LIGHT,
        borderColor: BORDER_SOFT,
      }}
    >
      {/* Header with icon */}
      <View className="flex-row items-center mb-3">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: EARTH_GREEN + "20" }}
        >
          <Ionicons name="mail" size={20} color={EARTH_GREEN} />
        </View>
        <View className="flex-1">
          <Text
            className="text-base"
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              color: TEXT_PRIMARY_STRONG,
            }}
          >
            {title}
          </Text>
          <Text
            className="text-sm"
            style={{
              fontFamily: "SourceSans3_400Regular",
              color: TEXT_SECONDARY,
            }}
          >
            {subtitle}
          </Text>
        </View>
      </View>

      {/* Email Input */}
      <View className="mb-3">
        <Text
          className="text-xs mb-1"
          style={{
            fontFamily: "SourceSans3_600SemiBold",
            color: TEXT_SECONDARY,
          }}
        >
          Email
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor={TEXT_MUTED}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isSubmitting}
          className="rounded-lg px-3 py-2 border"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: email && !isEmailValid ? "#D32F2F" : BORDER_SOFT,
            fontFamily: "SourceSans3_400Regular",
            color: TEXT_PRIMARY_STRONG,
            fontSize: 16,
          }}
        />
        {email && !isEmailValid && (
          <Text
            className="text-xs mt-1"
            style={{ fontFamily: "SourceSans3_400Regular", color: "#D32F2F" }}
          >
            Please enter a valid email address
          </Text>
        )}
      </View>

      {/* First Name Input (Optional) */}
      <View className="mb-3">
        <Text
          className="text-xs mb-1"
          style={{
            fontFamily: "SourceSans3_600SemiBold",
            color: TEXT_SECONDARY,
          }}
        >
          First name (optional)
        </Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
          placeholderTextColor={TEXT_MUTED}
          autoCapitalize="words"
          autoCorrect={false}
          editable={!isSubmitting}
          className="rounded-lg px-3 py-2 border"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: BORDER_SOFT,
            fontFamily: "SourceSans3_400Regular",
            color: TEXT_PRIMARY_STRONG,
            fontSize: 16,
          }}
        />
      </View>

      {/* Consent Checkbox */}
      <Pressable
        onPress={() => {
          if (!isSubmitting) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsChecked(!isChecked);
          }
        }}
        className="flex-row items-start mb-4"
        disabled={isSubmitting}
      >
        <View
          className="w-5 h-5 rounded border items-center justify-center mr-2 mt-0.5"
          style={{
            backgroundColor: isChecked ? EARTH_GREEN : "#FFFFFF",
            borderColor: isChecked ? EARTH_GREEN : BORDER_SOFT,
          }}
        >
          {isChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
        <Text
          className="flex-1 text-sm"
          style={{
            fontFamily: "SourceSans3_400Regular",
            color: TEXT_PRIMARY_STRONG,
          }}
        >
          Yes, email me tips and updates
        </Text>
      </Pressable>

      {/* Error Message */}
      {error && (
        <View className="mb-3 p-2 rounded-lg" style={{ backgroundColor: "#FFEBEE" }}>
          <Text
            className="text-sm"
            style={{ fontFamily: "SourceSans3_400Regular", color: "#D32F2F" }}
          >
            {error}
          </Text>
        </View>
      )}

      {/* Submit Button */}
      <Pressable
        onPress={handleSubmit}
        disabled={!isFormValid || isSubmitting}
        className="rounded-lg py-3 items-center active:opacity-80"
        style={{
          backgroundColor: isFormValid ? DEEP_FOREST : BORDER_SOFT,
          opacity: isSubmitting ? 0.7 : 1,
        }}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text
            className="text-base"
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              color: isFormValid ? "#FFFFFF" : TEXT_MUTED,
            }}
          >
            Turn on emails
          </Text>
        )}
      </Pressable>

      {/* Unsubscribe Note */}
      <Text
        className="text-xs text-center mt-2"
        style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}
      >
        Unsubscribe anytime.
      </Text>

      {/* Dismiss Button */}
      {showDismiss && onDismiss && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDismiss();
          }}
          className="mt-3 py-2 items-center"
          disabled={isSubmitting}
        >
          <Text
            className="text-sm"
            style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
          >
            Not now
          </Text>
        </Pressable>
      )}
    </View>
  );
}
