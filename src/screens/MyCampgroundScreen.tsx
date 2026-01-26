// src/screens/MyCampgroundScreen.tsx
/**
 * My Campground Screen
 * Manages user's camping contacts with invite functionality
 * Includes a "What is this?" explainer modal with a Pro upgrade CTA
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../config/firebase";
import {
  getCampgroundContacts,
  deleteCampgroundContact,
} from "../services/campgroundContactsService";
import { CampgroundContact } from "../types/campground";
import { RootStackNavigationProp } from "../navigation/types";
import ModalHeader from "../components/ModalHeader";
import InviteOptionsSheet from "../components/InviteOptionsSheet";
import OnboardingModal from "../components/OnboardingModal";
import { useScreenOnboarding } from "../hooks/useScreenOnboarding";
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

export default function MyCampgroundScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();

  const [contacts, setContacts] = useState<CampgroundContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite sheet state
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [selectedContact, setSelectedContact] =
    useState<CampgroundContact | null>(null);

  // "What is this?" modal state
  const [showWhatIsThis, setShowWhatIsThis] = useState(false);

  // Onboarding modal
  const { showModal, currentTooltip, dismissModal, openModal } = useScreenOnboarding("MyCampground");

  const loadContacts = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setError("Please sign in to view your campground");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      const contactsData = await getCampgroundContacts(user.uid);
      setContacts(contactsData);
    } catch (err: any) {
      console.error("Error loading contacts:", err);
      setError(err?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Reload contacts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadContacts();
      return () => {};
    }, [loadContacts])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadContacts();
  };

  const handleAddCamper = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("AddCamper");
  };

  const handleContactPress = (contact: CampgroundContact) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("EditCamper", { contactId: contact.id });
  };

  const handleDeleteContact = (contact: CampgroundContact) => {
    Alert.alert(
      "Delete Contact",
      `Are you sure you want to remove ${contact.contactName} from your campground?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCampgroundContact(contact.id);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              await loadContacts();
            } catch (err) {
              console.error("Delete contact failed:", err);
              Alert.alert("Error", "Failed to delete contact");
            }
          },
        },
      ]
    );
  };

  const handleInviteContact = (contact: CampgroundContact) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedContact(contact);
    setShowInviteSheet(true);
  };

  const handleInviteSheetClose = () => {
    setShowInviteSheet(false);
    setSelectedContact(null);
  };

  const handleOpenWhatIsThis = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowWhatIsThis(true);
  };

  const handleCloseWhatIsThis = () => {
    setShowWhatIsThis(false);
  };

  const handleUpgradeToPro = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowWhatIsThis(false);

    // Wire this to your app's Paywall entry point.
    // Choose the correct route name for your project and remove the cast if your types support it.
    navigation.navigate("Paywall" as any, {
      triggerKey: "my_campground_info",
    });
  };

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <ModalHeader title="My Campground" showTitle />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
          <Text
            className="mt-4"
            style={{
              fontFamily: "SourceSans3_400Regular",
              color: TEXT_SECONDARY,
            }}
          >
            Loading contacts...
          </Text>
        </View>
      </View>
    );
  }

  if (error && !auth.currentUser) {
    return (
      <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <ModalHeader title="My Campground" showTitle />
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="people-outline" size={64} color={EARTH_GREEN} />
          <Text
            className="mt-4 text-center text-lg"
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              color: TEXT_PRIMARY_STRONG,
            }}
          >
            Sign in to view your campground
          </Text>
          <Pressable
            onPress={() => navigation.navigate("Auth")}
            className="mt-6 px-6 py-3 rounded-xl active:opacity-90"
            style={{ backgroundColor: DEEP_FOREST }}
          >
            <Text
              style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
            >
              Sign In
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader title="My Campground" showTitle onInfoPress={openModal} />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={DEEP_FOREST}
          />
        }
      >
        {/* Header */}
        <View className="px-5 pt-6 pb-4">
          <View className="flex-row items-baseline justify-between">
            <View className="flex-1 pr-3">
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  color: TEXT_SECONDARY,
                }}
              >
                The people you camp with
              </Text>
            </View>

            <Pressable onPress={handleOpenWhatIsThis} className="active:opacity-70">
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  color: EARTH_GREEN,
                  textDecorationLine: "underline",
                }}
              >
                What is this?
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Add Camper Button */}
        <View className="px-5 pb-4">
          <Pressable
            onPress={handleAddCamper}
            className="flex-row items-center justify-center py-3 rounded-xl active:opacity-90"
            style={{ backgroundColor: DEEP_FOREST }}
          >
            <Ionicons name="person-add" size={20} color={PARCHMENT} />
            <Text
              className="ml-2"
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                color: PARCHMENT,
              }}
            >
              Add Camper
            </Text>
          </Pressable>
        </View>

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <View className="py-12 px-5 items-center">
            <Ionicons name="people-outline" size={64} color={BORDER_SOFT} />
            <Text
              className="mt-4 text-center"
              style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}
            >
              No contacts yet. Add the people you camp with to organize your trips
              together.
            </Text>
          </View>
        ) : (
          <View className="px-5 pb-5">
            {contacts.map((contact) => (
              <View
                key={contact.id}
                className="mb-3 p-4 rounded-xl border"
                style={{
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderColor: BORDER_SOFT,
                }}
              >
                <Pressable
                  onPress={() => handleContactPress(contact)}
                  onLongPress={() => handleDeleteContact(contact)}
                  className="active:opacity-70"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text
                          className="text-lg"
                          style={{
                            fontFamily: "SourceSans3_600SemiBold",
                            color: TEXT_PRIMARY_STRONG,
                          }}
                        >
                          {contact.contactName}
                        </Text>
                      </View>

                      {contact.contactEmail ? (
                        <Text
                          className="mt-1"
                          style={{
                            fontFamily: "SourceSans3_400Regular",
                            color: TEXT_SECONDARY,
                          }}
                        >
                          {contact.contactEmail}
                        </Text>
                      ) : null}

                      {contact.contactNote ? (
                        <Text
                          className="mt-2 text-sm"
                          style={{
                            fontFamily: "SourceSans3_400Regular",
                            color: TEXT_MUTED,
                          }}
                        >
                          {contact.contactNote}
                        </Text>
                      ) : null}
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={TEXT_MUTED}
                    />
                  </View>
                </Pressable>

                {/* Invite Button */}
                <Pressable
                  onPress={() => handleInviteContact(contact)}
                  className="flex-row items-center justify-center mt-3 py-2 rounded-lg active:opacity-80"
                  style={{
                    backgroundColor: `${EARTH_GREEN}20`,
                    borderColor: EARTH_GREEN,
                    borderWidth: 1,
                  }}
                >
                  <Ionicons name="paper-plane" size={16} color={EARTH_GREEN} />
                  <Text
                    className="ml-2"
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      color: EARTH_GREEN,
                      fontSize: 14,
                    }}
                  >
                    Send Invite
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Invite Options Sheet */}
      {selectedContact ? (
        <InviteOptionsSheet
          visible={showInviteSheet}
          onClose={handleInviteSheetClose}
          contact={selectedContact}
        />
      ) : null}

      {/* What is this? Modal */}
      <Modal
        visible={showWhatIsThis}
        transparent
        animationType="fade"
        onRequestClose={handleCloseWhatIsThis}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}>
          {/* Backdrop: tap outside to close */}
          <Pressable style={{ flex: 1 }} onPress={handleCloseWhatIsThis} />

          {/* Card */}
          <View
            className="mx-5 rounded-2xl p-5"
            style={{
              backgroundColor: PARCHMENT,
              marginBottom: insets.bottom + 20,
              borderColor: BORDER_SOFT,
              borderWidth: 1,
            }}
          >
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                color: TEXT_PRIMARY_STRONG,
                fontSize: 18,
              }}
            >
              What is My Campground?
            </Text>

            <Text
              className="mt-3"
              style={{
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_SECONDARY,
                lineHeight: 20,
              }}
            >
              My Campground is your private list of the people you actually camp
              with. Add friends, family, and trip buddies so you are not hunting
              through texts later.
            </Text>

            <View className="mt-4">
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  color: TEXT_SECONDARY,
                  lineHeight: 20,
                }}
              >
                • Keep everyone in one place (names, notes, emails).
              </Text>
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  color: TEXT_SECONDARY,
                  lineHeight: 20,
                  marginTop: 10,
                }}
              >
                • Send an invite when you are ready to plan together.
              </Text>
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  color: TEXT_SECONDARY,
                  lineHeight: 20,
                  marginTop: 10,
                }}
              >
                • Make planning faster because you start with your people.
              </Text>
            </View>

            <View
              className="mt-4 p-4 rounded-xl"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderColor: BORDER_SOFT,
                borderWidth: 1,
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  color: TEXT_PRIMARY_STRONG,
                }}
              >
                Want the full experience?
              </Text>
              <Text
                className="mt-2"
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  color: TEXT_SECONDARY,
                  lineHeight: 20,
                }}
              >
                Pro is where this really shines, especially if you camp with the
                same people often.
              </Text>
            </View>

            <View className="mt-5">
              <Pressable
                onPress={handleUpgradeToPro}
                className="py-3 rounded-xl items-center active:opacity-90"
                style={{ backgroundColor: DEEP_FOREST }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    color: PARCHMENT,
                  }}
                >
                  Upgrade to Pro
                </Text>
              </Pressable>

              <Pressable
                onPress={handleCloseWhatIsThis}
                className="py-3 rounded-xl items-center active:opacity-70 mt-3"
                style={{ borderColor: BORDER_SOFT, borderWidth: 1 }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    color: TEXT_SECONDARY,
                  }}
                >
                  Not Now
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={{ height: 12 }} />
        </View>
      </Modal>

      {/* Onboarding Modal */}
      <OnboardingModal
        visible={showModal}
        tooltip={currentTooltip}
        onDismiss={dismissModal}
      />
    </View>
  );
}
