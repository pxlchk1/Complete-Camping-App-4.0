/**
 * Edit Camper Screen
 * Edit existing contact in My Campground
 */

import React, { useState, useEffect } from "react";
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
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import {
  getCampgroundContactById,
  updateCampgroundContact,
  deleteCampgroundContact,
} from "../services/campgroundContactsService";
import { CampgroundContact } from "../types/campground";
import { RootStackParamList, RootStackNavigationProp } from "../navigation/types";
import ModalHeader from "../components/ModalHeader";
import {
  DEEP_FOREST,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../constants/colors";

export default function EditCamperScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, "EditCamper">>();
  const { contactId } = route.params;

  const [contact, setContact] = useState<CampgroundContact | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadContact();
  }, [contactId]);

  const loadContact = async () => {
    try {
      const contactData = await getCampgroundContactById(contactId);
      if (!contactData) {
        Alert.alert("Error", "Contact not found");
        navigation.goBack();
        return;
      }

      setContact(contactData);
      setDisplayName(contactData.contactName);
      setEmail(contactData.contactEmail || "");
      setPhone(contactData.contactPhone || "");
      setNotes(contactData.contactNote || "");
    } catch (error: any) {
      console.error("Error loading contact:", error);
      Alert.alert("Error", "Failed to load contact");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      Alert.alert("Name Required", "Please enter a name for this contact");
      return;
    }

    try {
      setSubmitting(true);
      await updateCampgroundContact(contactId, {
        contactName: displayName.trim(),
        contactEmail: email.trim() || null,
        contactPhone: phone.trim() || null,
        contactNote: notes.trim() || null,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error: any) {
      console.error("Error updating contact:", error);
      Alert.alert("Error", error.message || "Failed to update contact");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Contact",
      `Are you sure you want to remove ${displayName} from your campground?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCampgroundContact(contactId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", "Failed to delete contact");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <ModalHeader title="Edit Camper" showTitle />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
          <Text className="mt-4" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
            Loading contact...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader
        title="Edit Camper"
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

          {/* Update Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={!displayName.trim() || submitting}
            className="mt-4 mb-3 py-3 rounded-lg active:opacity-90"
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
                Update Camper
              </Text>
            )}
          </Pressable>

          {/* Delete Button */}
          <Pressable
            onPress={handleDelete}
            className="mb-8 py-3 rounded-lg border active:opacity-70"
            style={{ borderColor: "#dc2626" }}
          >
            <Text
              className="text-center"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: "#dc2626" }}
            >
              Delete Contact
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
