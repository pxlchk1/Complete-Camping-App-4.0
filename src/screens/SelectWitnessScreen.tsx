/**
 * SelectWitnessScreen
 * 
 * Allows user to select a witness from their campground contacts
 * to request a stamp for a badge.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { auth } from "../config/firebase";
import { RootStackParamList } from "../navigation/types";
import { getCampgroundContacts } from "../services/campgroundContactsService";
import {
  getBadgeDefinition,
  createBadgeClaim,
  getClaimForBadge,
} from "../services/meritBadgesService";
import { CampgroundContact } from "../types/campground";
import { BadgeDefinition, BadgeClaim } from "../types/badges";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../constants/colors";
import ModalHeader from "../components/ModalHeader";

type SelectWitnessScreenRouteProp = RouteProp<RootStackParamList, "SelectWitness">;
type SelectWitnessScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SelectWitnessScreen() {
  const navigation = useNavigation<SelectWitnessScreenNavigationProp>();
  const route = useRoute<SelectWitnessScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { badgeId, photoUrl } = route.params;

  const [badge, setBadge] = useState<BadgeDefinition | null>(null);
  const [contacts, setContacts] = useState<CampgroundContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<CampgroundContact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [existingClaim, setExistingClaim] = useState<BadgeClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badgeId, userId]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredContacts(contacts);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredContacts(
        contacts.filter(
          (c) =>
            c.contactName.toLowerCase().includes(query) ||
            c.contactEmail?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, contacts]);

  const loadData = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const [badgeData, contactsData, claimData] = await Promise.all([
        getBadgeDefinition(badgeId),
        getCampgroundContacts(userId),
        getClaimForBadge(userId, badgeId),
      ]);

      setBadge(badgeData);
      
      // Only show contacts that have a linked user account (contactUserId)
      const linkedContacts = contactsData.filter((c) => c.contactUserId);
      setContacts(linkedContacts);
      setFilteredContacts(linkedContacts);
      setExistingClaim(claimData);

      // Pre-select if there's an existing claim
      if (claimData?.witnessUserId) {
        const existingContact = linkedContacts.find(
          (c) => c.contactUserId === claimData.witnessUserId
        );
        if (existingContact) {
          setSelectedContactId(existingContact.id);
        }
      }
    } catch (err) {
      console.error("[SelectWitness] Error loading data:", err);
      setError("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = (contactId: string) => {
    Haptics.selectionAsync();
    setSelectedContactId(contactId === selectedContactId ? null : contactId);
  };

  const handleSendRequest = async () => {
    if (!userId || !selectedContactId) return;

    const selectedContact = contacts.find((c) => c.id === selectedContactId);
    if (!selectedContact?.contactUserId) {
      setError("Selected contact does not have a linked account");
      return;
    }

    setSubmitting(true);

    try {
      // Create badge claim with witness and photo (if provided)
      await createBadgeClaim({
        badgeId,
        witnessUserId: selectedContact.contactUserId,
        photoUrl: photoUrl || undefined,
      });
      
      console.log("[SelectWitness] Claim created successfully:", {
        badgeId,
        witnessUserId: selectedContact.contactUserId,
        hasPhoto: !!photoUrl,
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (err: any) {
      console.error("[SelectWitness] Error creating claim:", {
        error: err.message,
        badgeId,
        witnessUserId: selectedContact.contactUserId,
      });
      setError("Failed to send stamp request");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <ModalHeader title="Select Witness" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: PARCHMENT }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ModalHeader title="Select Witness" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Badge Info */}
        {badge && (
          <View className="px-4 pt-4 pb-2">
            <Text
              className="text-xl font-bold mb-1"
              style={{ color: TEXT_PRIMARY_STRONG }}
            >
              {badge.name}
            </Text>
            <Text style={{ color: TEXT_SECONDARY }}>
              Select a camper from your campground to witness and stamp this badge.
            </Text>
          </View>
        )}

        {/* Pending Status */}
        {existingClaim?.status === "PENDING_STAMP" && (
          <View
            className="mx-4 mt-2 p-3 rounded-lg"
            style={{ backgroundColor: GRANITE_GOLD + "20" }}
          >
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={20} color={GRANITE_GOLD} />
              <Text className="ml-2 font-medium" style={{ color: GRANITE_GOLD }}>
                Stamp Request Pending
              </Text>
            </View>
            <Text className="mt-1 text-sm" style={{ color: TEXT_SECONDARY }}>
              You already have a pending request. You can change the witness below.
            </Text>
          </View>
        )}

        {/* Search */}
        <View className="px-4 pt-4">
          <View
            className="flex-row items-center px-3 py-2 rounded-lg"
            style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderWidth: 1, borderColor: BORDER_SOFT }}
          >
            <Ionicons name="search-outline" size={20} color={TEXT_MUTED} />
            <TextInput
              className="flex-1 ml-2 text-base"
              style={{ color: TEXT_PRIMARY_STRONG }}
              placeholder="Search contacts..."
              placeholderTextColor={TEXT_MUTED}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color={TEXT_MUTED} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Error */}
        {error && (
          <View className="mx-4 mt-4 p-3 rounded-lg" style={{ backgroundColor: "#FEE2E2" }}>
            <Text style={{ color: "#DC2626" }}>{error}</Text>
          </View>
        )}

        {/* No Linked Contacts */}
        {contacts.length === 0 && (
          <View className="mx-4 mt-6 p-6 rounded-xl items-center" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
            <Ionicons name="people-outline" size={48} color={TEXT_MUTED} />
            <Text className="text-center mt-4 text-lg font-medium" style={{ color: TEXT_PRIMARY_STRONG }}>
              No Linked Campers
            </Text>
            <Text className="text-center mt-2" style={{ color: TEXT_SECONDARY }}>
              To request a stamp, you need campers in your campground who have linked their accounts.
            </Text>
            <Pressable
              className="mt-4 px-4 py-2 rounded-lg"
              style={{ backgroundColor: EARTH_GREEN }}
              onPress={() => navigation.navigate("MyCampground")}
            >
              <Text className="font-medium" style={{ color: PARCHMENT }}>
                Go to My Campground
              </Text>
            </Pressable>
          </View>
        )}

        {/* Contacts List */}
        {filteredContacts.length > 0 && (
          <View className="px-4 pt-4">
            <Text className="text-sm font-medium mb-2" style={{ color: TEXT_MUTED }}>
              SELECT A WITNESS
            </Text>
            {filteredContacts.map((contact) => {
              const isSelected = selectedContactId === contact.id;
              
              return (
                <Pressable
                  key={contact.id}
                  className="flex-row items-center p-4 rounded-xl mb-2"
                  style={{
                    backgroundColor: isSelected ? EARTH_GREEN + "15" : CARD_BACKGROUND_LIGHT,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? EARTH_GREEN : BORDER_SOFT,
                  }}
                  onPress={() => handleSelectContact(contact.id)}
                >
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: isSelected ? EARTH_GREEN : DEEP_FOREST + "20" }}
                  >
                    <Ionicons
                      name={isSelected ? "checkmark" : "person"}
                      size={24}
                      color={isSelected ? PARCHMENT : DEEP_FOREST}
                    />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text
                      className="text-base font-medium"
                      style={{ color: TEXT_PRIMARY_STRONG }}
                    >
                      {contact.contactName}
                    </Text>
                    {contact.contactEmail && (
                      <Text className="text-sm" style={{ color: TEXT_SECONDARY }}>
                        {contact.contactEmail}
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={isSelected ? EARTH_GREEN : BORDER_SOFT}
                  />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* No Results */}
        {contacts.length > 0 && filteredContacts.length === 0 && (
          <View className="mx-4 mt-6 p-6 items-center">
            <Text style={{ color: TEXT_SECONDARY }}>
              No contacts match your search
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action */}
      {contacts.length > 0 && (
        <View
          className="absolute bottom-0 left-0 right-0 px-4 pt-3"
          style={{
            backgroundColor: PARCHMENT,
            paddingBottom: insets.bottom + 16,
            borderTopWidth: 1,
            borderTopColor: BORDER_SOFT,
          }}
        >
          <Pressable
            className="py-4 rounded-xl items-center"
            style={{
              backgroundColor: selectedContactId ? EARTH_GREEN : BORDER_SOFT,
            }}
            onPress={handleSendRequest}
            disabled={!selectedContactId || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={PARCHMENT} />
            ) : (
              <Text
                className="text-lg font-semibold"
                style={{ color: selectedContactId ? PARCHMENT : TEXT_MUTED }}
              >
                {existingClaim?.status === "PENDING_STAMP"
                  ? "Update Request"
                  : "Send Stamp Request"}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
