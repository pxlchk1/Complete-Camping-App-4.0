/**
 * Add Camper Screen
 * Form to add a new contact to My Campground
 * After adding, shows invite options sheet
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { auth } from "../config/firebase";
import { createCampgroundContact } from "../services/campgroundContactsService";
import { CampgroundContact } from "../types/campground";
import { RootStackNavigationProp } from "../navigation/types";
import ModalHeader from "../components/ModalHeader";
import InviteOptionsSheet from "../components/InviteOptionsSheet";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../constants/colors";

export default function AddCamperScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Invite sheet state
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [newContact, setNewContact] = useState<CampgroundContact | null>(null);

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be signed in to add a contact");
      return;
    }

    if (!displayName.trim()) {
      Alert.alert("Name Required", "Please enter a name for this contact");
      return;
    }

    try {
      setSubmitting(true);

      // Create the contact
      const contactId = await createCampgroundContact(user.uid, {
        contactName: displayName.trim(),
        contactEmail: email.trim() || undefined,
        contactPhone: phone.trim() || undefined,
        contactNote: notes.trim() || undefined,
      });

      // Create a contact object for the invite sheet
      const contact: CampgroundContact = {
        id: contactId,
        ownerId: user.uid,
        contactName: displayName.trim(),
        contactEmail: email.trim() || null,
        contactPhone: phone.trim() || null,
        contactNote: notes.trim() || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setNewContact(contact);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Show invite options sheet
      setShowInviteSheet(true);
    } catch (error: any) {
      console.error("Error adding contact:", error);
      Alert.alert("Error", error.message || "Failed to add contact");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInviteSheetClose = () => {
    setShowInviteSheet(false);
    navigation.goBack();
  };

  const isValidEmail = (emailStr: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader
        title="Add Camper"
        showTitle
        rightAction={{
          icon: "checkmark",
          onPress: handleSubmit,
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-5 pt-5">
          {/* Name Field */}
          <View className="mb-4">
            <Text
              className="mb-2"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              Name *
            </Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter name"
              placeholderTextColor={TEXT_MUTED}
              className="px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderColor: BORDER_SOFT,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
              }}
              autoFocus
            />
          </View>

          {/* Email Field */}
          <View className="mb-4">
            <Text
              className="mb-2"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor={TEXT_MUTED}
              keyboardType="email-address"
              autoCapitalize="none"
              className="px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderColor: BORDER_SOFT,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
              }}
            />
            <Text
              className="mt-1 text-xs"
              style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
            >
              Needed to send email invitations
            </Text>
          </View>

          {/* Phone Field */}
          <View className="mb-4">
            <Text
              className="mb-2"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              Phone
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 123-4567"
              placeholderTextColor={TEXT_MUTED}
              keyboardType="phone-pad"
              className="px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderColor: BORDER_SOFT,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
              }}
            />
          </View>

          {/* Notes Field */}
          <View className="mb-4">
            <Text
              className="mb-2"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              Notes
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes about this person..."
              placeholderTextColor={TEXT_MUTED}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderColor: BORDER_SOFT,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
                minHeight: 100,
              }}
            />
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={!displayName.trim() || submitting}
            className="mt-4 mb-8 py-3 rounded-lg active:opacity-90"
            style={{
              backgroundColor: displayName.trim() ? DEEP_FOREST : BORDER_SOFT,
            }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={PARCHMENT} />
            ) : (
              <Text
                className="text-center"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
              >
                Add Camper
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Invite Options Sheet */}
      {newContact && (
        <InviteOptionsSheet
          visible={showInviteSheet}
          onClose={handleInviteSheetClose}
          contact={newContact}
        />
      )}
    </View>
  );
}
