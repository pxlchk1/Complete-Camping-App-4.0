/**
 * Admin Communications Screen
 * Draft push notifications, home screen modals, and emails
 * UI only - no backend calls or persistence
 */

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

type ChannelTab = "push" | "modal" | "email";

interface DraftState {
  campaignName: string;
  mainHeading: string;
  body: string;
  ctaLabel: string;
  ctaLink: string;
}

const EMPTY_DRAFT: DraftState = {
  campaignName: "",
  mainHeading: "",
  body: "",
  ctaLabel: "",
  ctaLink: "",
};

export default function AdminCommunicationsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState<ChannelTab>("push");
  
  // Each tab has its own draft state
  const [pushDraft, setPushDraft] = useState<DraftState>({ ...EMPTY_DRAFT });
  const [modalDraft, setModalDraft] = useState<DraftState>({ ...EMPTY_DRAFT });
  const [emailDraft, setEmailDraft] = useState<DraftState>({ ...EMPTY_DRAFT });

  const getCurrentDraft = (): DraftState => {
    switch (activeTab) {
      case "push": return pushDraft;
      case "modal": return modalDraft;
      case "email": return emailDraft;
      default: return pushDraft;
    }
  };

  const updateCurrentDraft = (field: keyof DraftState, value: string) => {
    switch (activeTab) {
      case "push":
        setPushDraft((prev: DraftState) => ({ ...prev, [field]: value }));
        break;
      case "modal":
        setModalDraft((prev: DraftState) => ({ ...prev, [field]: value }));
        break;
      case "email":
        setEmailDraft((prev: DraftState) => ({ ...prev, [field]: value }));
        break;
    }
  };

  const draft = getCurrentDraft();

  const tabs: { key: ChannelTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "push", label: "Push", icon: "notifications" },
    { key: "modal", label: "Modal", icon: "browsers" },
    { key: "email", label: "Email", icon: "mail" },
  ];

  const handleTabPress = (tab: ChannelTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const getPlaceholders = (): { heading: string; body: string; ctaLabel: string; ctaLink: string } => {
    switch (activeTab) {
      case "push":
        return {
          heading: "New Feature: Trip Sharing!",
          body: "You can now invite friends to your camping trips...",
          ctaLabel: "Open App",
          ctaLink: "tentandlantern://trips",
        };
      case "modal":
        return {
          heading: "Welcome to Winter Camping Season!",
          body: "Check out our new winter gear guides and tips...",
          ctaLabel: "Learn More",
          ctaLink: "tentandlantern://learn",
        };
      case "email":
        return {
          heading: "Your Weekly Camping Digest",
          body: "Here's what's new in the Tent & Lantern community...",
          ctaLabel: "Read More",
          ctaLink: "https://tentandlantern.com/blog",
        };
      default:
        return {
          heading: "New Feature: Trip Sharing!",
          body: "You can now invite friends to your camping trips...",
          ctaLabel: "Open App",
          ctaLink: "tentandlantern://trips",
        };
    }
  };

  const placeholders = getPlaceholders();

  return (
    <View style={{ flex: 1, backgroundColor: PARCHMENT }}>
      <ModalHeader title="Communications" showTitle />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Text
            style={{ 
              fontFamily: "SourceSans3_400Regular", 
              color: TEXT_SECONDARY,
              fontSize: 14,
              marginBottom: 16,
            }}
          >
            Push, Modal & Email
          </Text>

          {/* Tab Selector */}
          <View 
            style={{ 
              flexDirection: "row", 
              backgroundColor: CARD_BACKGROUND_LIGHT, 
              borderRadius: 12, 
              padding: 4,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: BORDER_SOFT,
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => handleTabPress(tab.key)}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                    backgroundColor: isActive ? DEEP_FOREST : "transparent",
                  }}
                >
                  <Ionicons 
                    name={tab.icon} 
                    size={16} 
                    color={isActive ? "#FFFFFF" : TEXT_SECONDARY} 
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      fontFamily: isActive ? "SourceSans3_600SemiBold" : "SourceSans3_400Regular",
                      fontSize: 14,
                      color: isActive ? "#FFFFFF" : TEXT_SECONDARY,
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Form Fields */}
          <View style={{ gap: 16 }}>
            {/* Campaign Name */}
            <View>
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 14,
                  color: TEXT_PRIMARY_STRONG,
                  marginBottom: 6,
                }}
              >
                Campaign Name <Text style={{ color: TEXT_MUTED }}>(internal)</Text>
              </Text>
              <TextInput
                value={draft.campaignName}
                onChangeText={(text: string) => updateCurrentDraft("campaignName", text)}
                placeholder="e.g., Feb 2026 Feature Launch"
                placeholderTextColor={TEXT_MUTED}
                style={{
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                  borderRadius: 8,
                  padding: 12,
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 16,
                  color: TEXT_PRIMARY_STRONG,
                }}
              />
            </View>

            {/* Main Heading */}
            <View>
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 14,
                  color: TEXT_PRIMARY_STRONG,
                  marginBottom: 6,
                }}
              >
                Main Heading
              </Text>
              <TextInput
                value={draft.mainHeading}
                onChangeText={(text: string) => updateCurrentDraft("mainHeading", text)}
                placeholder={placeholders.heading}
                placeholderTextColor={TEXT_MUTED}
                style={{
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                  borderRadius: 8,
                  padding: 12,
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 16,
                  color: TEXT_PRIMARY_STRONG,
                }}
              />
            </View>

            {/* Body */}
            <View>
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 14,
                  color: TEXT_PRIMARY_STRONG,
                  marginBottom: 6,
                }}
              >
                Body
              </Text>
              <TextInput
                value={draft.body}
                onChangeText={(text: string) => updateCurrentDraft("body", text)}
                placeholder={placeholders.body}
                placeholderTextColor={TEXT_MUTED}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                  borderRadius: 8,
                  padding: 12,
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 16,
                  color: TEXT_PRIMARY_STRONG,
                  minHeight: 100,
                }}
              />
            </View>

            {/* CTA Label */}
            <View>
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 14,
                  color: TEXT_PRIMARY_STRONG,
                  marginBottom: 6,
                }}
              >
                CTA Button Label
              </Text>
              <TextInput
                value={draft.ctaLabel}
                onChangeText={(text: string) => updateCurrentDraft("ctaLabel", text)}
                placeholder={placeholders.ctaLabel}
                placeholderTextColor={TEXT_MUTED}
                style={{
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                  borderRadius: 8,
                  padding: 12,
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 16,
                  color: TEXT_PRIMARY_STRONG,
                }}
              />
            </View>

            {/* CTA Link */}
            <View>
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 14,
                  color: TEXT_PRIMARY_STRONG,
                  marginBottom: 6,
                }}
              >
                CTA Link / Deep Link
              </Text>
              <TextInput
                value={draft.ctaLink}
                onChangeText={(text: string) => updateCurrentDraft("ctaLink", text)}
                placeholder={placeholders.ctaLink}
                placeholderTextColor={TEXT_MUTED}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={{
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                  borderRadius: 8,
                  padding: 12,
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 16,
                  color: TEXT_PRIMARY_STRONG,
                }}
              />
            </View>
          </View>

          {/* Preview Section */}
          <View style={{ marginTop: 32 }}>
            <Text
              style={{
                fontFamily: "Raleway_700Bold",
                fontSize: 18,
                color: TEXT_PRIMARY_STRONG,
                marginBottom: 12,
              }}
            >
              Preview
            </Text>

            <View
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderWidth: 1,
                borderColor: BORDER_SOFT,
                borderRadius: 12,
                padding: 16,
              }}
            >
              {activeTab === "push" && (
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        backgroundColor: DEEP_FOREST,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 8,
                      }}
                    >
                      <Ionicons name="bonfire" size={14} color="#FFFFFF" />
                    </View>
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 12,
                        color: TEXT_SECONDARY,
                      }}
                    >
                      TENT & LANTERN
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 16,
                      color: TEXT_PRIMARY_STRONG,
                      marginBottom: 4,
                    }}
                  >
                    {draft.mainHeading || placeholders.heading}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 14,
                      color: TEXT_SECONDARY,
                    }}
                    numberOfLines={2}
                  >
                    {draft.body || placeholders.body}
                  </Text>
                </View>
              )}

              {activeTab === "modal" && (
                <View style={{ alignItems: "center", paddingVertical: 8 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: EARTH_GREEN + "20",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons name="megaphone" size={24} color={EARTH_GREEN} />
                  </View>
                  <Text
                    style={{
                      fontFamily: "Raleway_700Bold",
                      fontSize: 18,
                      color: TEXT_PRIMARY_STRONG,
                      textAlign: "center",
                      marginBottom: 8,
                    }}
                  >
                    {draft.mainHeading || placeholders.heading}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 14,
                      color: TEXT_SECONDARY,
                      textAlign: "center",
                      marginBottom: 16,
                    }}
                  >
                    {draft.body || placeholders.body}
                  </Text>
                  <View
                    style={{
                      backgroundColor: DEEP_FOREST,
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 14,
                        color: "#FFFFFF",
                      }}
                    >
                      {draft.ctaLabel || placeholders.ctaLabel}
                    </Text>
                  </View>
                </View>
              )}

              {activeTab === "email" && (
                <View>
                  <View
                    style={{
                      backgroundColor: DEEP_FOREST,
                      padding: 16,
                      marginHorizontal: -16,
                      marginTop: -16,
                      borderTopLeftRadius: 11,
                      borderTopRightRadius: 11,
                      marginBottom: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Raleway_700Bold",
                        fontSize: 16,
                        color: "#FFFFFF",
                        textAlign: "center",
                      }}
                    >
                      Tent & Lantern
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_700Bold",
                      fontSize: 20,
                      color: TEXT_PRIMARY_STRONG,
                      marginBottom: 12,
                    }}
                  >
                    {draft.mainHeading || placeholders.heading}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 14,
                      color: TEXT_SECONDARY,
                      marginBottom: 16,
                      lineHeight: 20,
                    }}
                  >
                    {draft.body || placeholders.body}
                  </Text>
                  <View
                    style={{
                      backgroundColor: EARTH_GREEN,
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 6,
                      alignSelf: "flex-start",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 14,
                        color: "#FFFFFF",
                      }}
                    >
                      {draft.ctaLabel || placeholders.ctaLabel}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Draft Status */}
          <View 
            style={{ 
              marginTop: 24, 
              flexDirection: "row", 
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="document-text-outline" size={16} color={TEXT_MUTED} />
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 12,
                color: TEXT_MUTED,
                marginLeft: 6,
              }}
            >
              Draft only • Not saved
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
