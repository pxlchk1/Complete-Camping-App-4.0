/**
 * Add People to Trip Modal
 * Multi-select contacts from My Campground
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { auth } from "../config/firebase";
import { getCampgroundContacts } from "../services/campgroundContactsService";
import { addTripParticipantsWithRoles } from "../services/tripParticipantsService";
import { CampgroundContact } from "../types/campground";
import { RootStackParamList, RootStackNavigationProp } from "../navigation/types";
import { useTripsStore } from "../state/tripsStore";
import ModalHeader from "../components/ModalHeader";
import { requirePro } from "../utils/gating";
import AccountRequiredModal from "../components/AccountRequiredModal";
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

export default function AddPeopleToTripScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, "AddPeopleToTrip">>();
  const { tripId } = route.params;

  const trip = useTripsStore((s) => s.getTripById(tripId));

  const [contacts, setContacts] = useState<CampgroundContact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Gating modal state
  const [showAccountModal, setShowAccountModal] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  // Reload contacts when screen comes back into focus (e.g., after adding new person)
  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [])
  );

  const loadContacts = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be signed in");
      navigation.goBack();
      return;
    }

    try {
      const contactsData = await getCampgroundContacts(user.uid);
      setContacts(contactsData);
    } catch (error: any) {
      console.error("Error loading contacts:", error);
      Alert.alert("Error", "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const toggleContact = (contactId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (selectedContactIds.size === 0) {
      Alert.alert("No Selection", "Please select at least one person to add");
      return;
    }

    // Gate: PRO required to add people to trips
    if (!requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "trip_add_people", variant }),
    })) {
      return;
    }

    try {
      setSubmitting(true);
      // Add all selected contacts as "guest" role
      const participantsWithRoles = Array.from(selectedContactIds).map(contactId => ({
        contactId,
        role: "guest" as const,
      }));

      const tripStartDate = trip?.startDate ? new Date(trip.startDate) : new Date();
      await addTripParticipantsWithRoles(tripId, participantsWithRoles, tripStartDate);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error: any) {
      console.error("Error adding participants:", error);
      Alert.alert("Error", error.message || "Failed to add people to trip");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNewPerson = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to AddCamper screen to add a new person to campground
    navigation.navigate("AddCamper" as any);
  };

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <ModalHeader title="Add People" showTitle />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
          <Text className="mt-4" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
            Loading contacts...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader
        title="Add People"
        showTitle
        rightAction={{
          icon: "add",
          onPress: handleAddNewPerson,
        }}
      />

      <ScrollView className="flex-1 px-5 pt-5">
        {contacts.length === 0 ? (
          <View className="py-12 items-center">
            <Ionicons name="people-outline" size={64} color={BORDER_SOFT} />
            <Text
              className="mt-4 text-center mb-4"
              style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}
            >
              No contacts in your campground yet. Add people to your campground first.
            </Text>
            <Pressable
              onPress={() => {
                navigation.goBack();
                navigation.navigate("MyCampground");
              }}
              className="px-6 py-3 rounded-xl active:opacity-90"
              style={{ backgroundColor: DEEP_FOREST }}
            >
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
                Go to My Campground
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text
              className="mb-4"
              style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
            >
              Select people from your campground to add to this trip
            </Text>

            {contacts.map(contact => {
              const isSelected = selectedContactIds.has(contact.id);
              return (
                <Pressable
                  key={contact.id}
                  onPress={() => toggleContact(contact.id)}
                  className="mb-3 p-4 rounded-xl border active:opacity-70"
                  style={{
                    backgroundColor: isSelected ? EARTH_GREEN : CARD_BACKGROUND_LIGHT,
                    borderColor: isSelected ? EARTH_GREEN : BORDER_SOFT,
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 mr-3">
                      <View className="flex-row items-center">
                        <Text
                          className="text-lg"
                          style={{
                            fontFamily: "SourceSans3_600SemiBold",
                            color: isSelected ? PARCHMENT : TEXT_PRIMARY_STRONG,
                          }}
                        >
                          {contact.contactName}
                        </Text>
                      </View>

                      {contact.contactEmail && (
                        <Text
                          className="mt-1"
                          style={{
                            fontFamily: "SourceSans3_400Regular",
                            color: isSelected ? PARCHMENT : TEXT_SECONDARY,
                          }}
                        >
                          {contact.contactEmail}
                        </Text>
                      )}
                    </View>

                    <View
                      className="w-6 h-6 rounded border-2 items-center justify-center"
                      style={{
                        borderColor: isSelected ? PARCHMENT : BORDER_SOFT,
                        backgroundColor: isSelected ? PARCHMENT : "transparent",
                      }}
                    >
                      {isSelected && <Ionicons name="checkmark" size={16} color={EARTH_GREEN} />}
                    </View>
                  </View>
                </Pressable>
              );
            })}

            <Pressable
              onPress={handleSubmit}
              disabled={selectedContactIds.size === 0 || submitting}
              className="mt-4 mb-8 py-3 rounded-lg active:opacity-90"
              style={{
                backgroundColor: selectedContactIds.size > 0 ? DEEP_FOREST : BORDER_SOFT,
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={PARCHMENT} />
              ) : (
                <Text
                  className="text-center"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                >
                  {selectedContactIds.size > 0 
                    ? `Add ${selectedContactIds.size} ${selectedContactIds.size === 1 ? "person" : "people"} to trip`
                    : "Select people to add"}
                </Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Gating Modals */}
      <AccountRequiredModal
        visible={showAccountModal}
        onCreateAccount={() => {
          setShowAccountModal(false);
          navigation.navigate("Auth" as any);
        }}
        onMaybeLater={() => setShowAccountModal(false)}
      />
    </View>
  );
}
