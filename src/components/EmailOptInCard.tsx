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
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  EARTH_GREEN,
  DEEP_FOREST,
  DEEP_FOREST_PRESSED,
  PARCHMENT,
  PARCHMENT_SOFT,
  DISABLED_BG,
  DISABLED_TEXT,
} from "../constants/colors";
import { fonts, radius } from "../theme/theme";

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

      // Step 3: Call Cloud Function to add to SendGrid drip list
      // This is a best-effort enhancement — core subscription (Steps 1-2) already succeeded
      try {
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

        await sendgridSubscribeToDrip({
          email: normalizedEmail,
          firstName: trimmedFirstName,
          userId: user.uid,
          source: "app_optin",
        });
      } catch (dripErr) {
        // SendGrid drip enrollment failed but core subscription succeeded
        // Do not revert Firestore — user IS subscribed
        console.error("[EmailOptInCard] SendGrid drip enrollment failed (non-fatal):", dripErr);
      }

      // Core subscription succeeded regardless of drip enrollment
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onOptInComplete?.();
    } catch (err) {
      console.error("[EmailOptInCard] Error subscribing:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View>
      {/* Title + subtitle */}
      <Text
        style={{
          fontFamily: "Raleway_700Bold",
          fontSize: 21,
          color: TEXT_PRIMARY_STRONG,
          lineHeight: 27,
          marginBottom: 6,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 15,
          color: TEXT_SECONDARY,
          lineHeight: 22,
          marginBottom: 20,
        }}
      >
        {subtitle}
      </Text>

      {/* Email Input */}
      <View style={{ marginBottom: 14 }}>
        <Text
          style={{
            fontFamily: fonts.bodySemi,
            fontSize: 13,
            color: TEXT_SECONDARY,
            marginBottom: 5,
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
          style={{
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: email && !isEmailValid ? "#D32F2F" : BORDER_SOFT,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontFamily: fonts.body,
            color: TEXT_PRIMARY_STRONG,
            fontSize: 16,
          }}
        />
        {email && !isEmailValid && (
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 12,
              color: "#D32F2F",
              marginTop: 4,
            }}
          >
            Please enter a valid email address
          </Text>
        )}
      </View>

      {/* First Name Input (Optional) */}
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            fontFamily: fonts.bodySemi,
            fontSize: 13,
            color: TEXT_SECONDARY,
            marginBottom: 5,
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
          style={{
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: BORDER_SOFT,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontFamily: fonts.body,
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
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
        disabled={isSubmitting}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 1.5,
            backgroundColor: isChecked ? DEEP_FOREST : "#FFFFFF",
            borderColor: isChecked ? DEEP_FOREST : BORDER_SOFT,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 10,
            marginTop: 1,
          }}
        >
          {isChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.body,
            fontSize: 14,
            color: TEXT_PRIMARY_STRONG,
            lineHeight: 20,
          }}
        >
          Yes, email me tips and updates
        </Text>
      </Pressable>

      {/* Error Message */}
      {error && (
        <View
          style={{
            marginBottom: 14,
            padding: 10,
            borderRadius: 12,
            backgroundColor: "#FFEBEE",
          }}
        >
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: "#D32F2F",
            }}
          >
            {error}
          </Text>
        </View>
      )}

      {/* Submit Button */}
      <Pressable
        onPress={handleSubmit}
        disabled={!isFormValid || isSubmitting}
        style={({ pressed }) => ({
          backgroundColor: isFormValid
            ? pressed
              ? DEEP_FOREST_PRESSED
              : DEEP_FOREST
            : DISABLED_BG,
          paddingVertical: 15,
          borderRadius: radius.pill,
          alignItems: "center",
          justifyContent: "center",
          opacity: isSubmitting ? 0.7 : 1,
        })}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text
            style={{
              fontFamily: fonts.bodySemi,
              fontSize: 16,
              color: isFormValid ? "#FFFFFF" : DISABLED_TEXT,
            }}
          >
            Turn on emails
          </Text>
        )}
      </Pressable>

      {/* Unsubscribe Note */}
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 12,
          color: TEXT_MUTED,
          textAlign: "center",
          marginTop: 10,
        }}
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
          style={{
            marginTop: 8,
            paddingVertical: 10,
            alignItems: "center",
          }}
          disabled={isSubmitting}
        >
          <Text
            style={{
              fontFamily: fonts.bodySemi,
              fontSize: 14,
              color: EARTH_GREEN,
            }}
          >
            Not now
          </Text>
        </Pressable>
      )}
    </View>
  );
}
