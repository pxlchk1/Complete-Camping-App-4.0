/**
 * Save Template Modal
 * Modal for saving a packing list as a reusable template
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { TripType, Season, TRIP_TYPES, SEASONS, TRIP_TYPE_LABELS, SEASON_LABELS } from "../types/packingV2";
import { saveAsTemplate } from "../services/packingServiceV2";
import { useAuth } from "../context/AuthContext";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  CARD_BACKGROUND_LIGHT,
} from "../constants/colors";

interface SaveTemplateModalProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  onSaved: () => void;
}

export default function SaveTemplateModal({
  visible,
  onClose,
  tripId,
  onSaved,
}: SaveTemplateModalProps) {
  const { user } = useAuth();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTripTypes, setSelectedTripTypes] = useState<Set<TripType>>(new Set());
  const [selectedSeasons, setSelectedSeasons] = useState<Set<Season>>(new Set());
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setName("");
      setDescription("");
      setSelectedTripTypes(new Set());
      setSelectedSeasons(new Set());
    }
  }, [visible]);

  // Toggle trip type
  const toggleTripType = (type: TripType) => {
    Haptics.selectionAsync();
    setSelectedTripTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Toggle season
  const toggleSeason = (season: Season) => {
    Haptics.selectionAsync();
    setSelectedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(season)) {
        next.delete(season);
      } else {
        next.add(season);
      }
      return next;
    });
  };

  // Handle save
  const handleSave = async () => {
    if (!user?.uid || !name.trim()) return;

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await saveAsTemplate(
        user.uid,
        tripId,
        name.trim(),
        description.trim() || undefined,
        Array.from(selectedTripTypes),
        Array.from(selectedSeasons)
      );

      onSaved();
    } catch (error) {
      console.error("[SaveTemplateModal] Error saving template:", error);
    } finally {
      setSaving(false);
    }
  };

  const canSave = name.trim().length > 0;

  // Use imported labels from packingV2
  const tripTypeLabels = TRIP_TYPE_LABELS;
  const seasonLabels = SEASON_LABELS;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-end">
          {/* Backdrop */}
          <Pressable
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onPress={onClose}
          />

          {/* Content */}
          <View
            className="rounded-t-3xl overflow-hidden"
            style={{ backgroundColor: PARCHMENT, maxHeight: "90%" }}
          >
            <SafeAreaView edges={["bottom"]}>
              {/* Header */}
              <View
                className="flex-row items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: BORDER_SOFT }}
              >
                <Pressable onPress={onClose} hitSlop={10}>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 16,
                      color: EARTH_GREEN,
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Text
                  style={{
                    fontFamily: "Raleway_700Bold",
                    fontSize: 17,
                    color: DEEP_FOREST,
                  }}
                >
                  Save as Template
                </Text>

                <Pressable
                  onPress={handleSave}
                  disabled={!canSave || saving}
                  hitSlop={10}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 16,
                      color: canSave ? DEEP_FOREST : TEXT_SECONDARY,
                    }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                className="px-5 py-4"
                keyboardShouldPersistTaps="handled"
              >
                {/* Template Name */}
                <View className="mb-5">
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 13,
                      color: TEXT_SECONDARY,
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Template Name
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g., My Summer Backpacking List"
                    placeholderTextColor={TEXT_SECONDARY}
                    className="px-4 py-3 rounded-xl border"
                    style={{
                      borderColor: BORDER_SOFT,
                      backgroundColor: CARD_BACKGROUND_LIGHT,
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 16,
                      color: TEXT_PRIMARY_STRONG,
                    }}
                    autoFocus
                  />
                </View>

                {/* Description */}
                <View className="mb-5">
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 13,
                      color: TEXT_SECONDARY,
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Description (Optional)
                  </Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="A brief description of this template..."
                    placeholderTextColor={TEXT_SECONDARY}
                    multiline
                    numberOfLines={3}
                    className="px-4 py-3 rounded-xl border"
                    style={{
                      borderColor: BORDER_SOFT,
                      backgroundColor: CARD_BACKGROUND_LIGHT,
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 16,
                      color: TEXT_PRIMARY_STRONG,
                      minHeight: 80,
                      textAlignVertical: "top",
                    }}
                  />
                </View>

                {/* Trip Types */}
                <View className="mb-5">
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 13,
                      color: TEXT_SECONDARY,
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Recommended For (Optional)
                  </Text>
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {TRIP_TYPES.map((type) => {
                      const isSelected = selectedTripTypes.has(type);
                      return (
                        <Pressable
                          key={type}
                          onPress={() => toggleTripType(type)}
                          className={`px-3 py-2 rounded-full border ${
                            isSelected
                              ? "bg-forest border-forest"
                              : "bg-parchment border-parchmentDark"
                          }`}
                        >
                          <Text
                            style={{
                              fontFamily: "SourceSans3_400Regular",
                              fontSize: 13,
                              color: isSelected ? PARCHMENT : DEEP_FOREST,
                            }}
                          >
                            {tripTypeLabels[type]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Seasons */}
                <View className="mb-5">
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 13,
                      color: TEXT_SECONDARY,
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Seasons (Optional)
                  </Text>
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {SEASONS.map((season) => {
                      const isSelected = selectedSeasons.has(season);
                      return (
                        <Pressable
                          key={season}
                          onPress={() => toggleSeason(season)}
                          className={`px-3 py-2 rounded-full border ${
                            isSelected
                              ? "bg-forest border-forest"
                              : "bg-parchment border-parchmentDark"
                          }`}
                        >
                          <Text
                            style={{
                              fontFamily: "SourceSans3_400Regular",
                              fontSize: 13,
                              color: isSelected ? PARCHMENT : DEEP_FOREST,
                            }}
                          >
                            {seasonLabels[season]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Info */}
                <View
                  className="flex-row items-start p-4 rounded-xl mb-4"
                  style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
                >
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color={EARTH_GREEN}
                    style={{ marginRight: 10, marginTop: 2 }}
                  />
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 13,
                      color: TEXT_SECONDARY,
                      flex: 1,
                      lineHeight: 18,
                    }}
                  >
                    Your template will include all items from this packing list. You can use it to
                    quickly generate lists for future trips.
                  </Text>
                </View>

                {/* Spacer for keyboard */}
                <View style={{ height: 20 }} />
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
