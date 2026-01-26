/**
 * Packing List Generate Screen V2
 * Template selection and customization for generating packing lists
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";
import {
  PackingTemplate,
  TripType,
  Season,
  AmenityFlags,
  TRIP_TYPES,
  SEASONS,
} from "../types/packingV2";
import {
  generatePackingList,
  getUserTemplates,
  getTripsWithPackingLists,
  copyPackingListFromTrip,
} from "../services/packingServiceV2";
import { PACKING_TEMPLATES, getRecommendedTemplates } from "../data/packingTemplates";
import { useTrips } from "../state/tripsStore";
import { useAuth } from "../context/AuthContext";
import { trackPackingListGenerated } from "../services/analyticsService";
import { trackCoreAction } from "../services/userActionTrackerService";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  GRANITE_GOLD,
  CARD_BACKGROUND_LIGHT,
  FOREST_BG,
} from "../constants/colors";

type PackingListGenerateRouteProp = RouteProp<RootStackParamList, "PackingListGenerate">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Trip type labels
const TRIP_TYPE_LABELS: Record<TripType, string> = {
  backpacking: "Backpacking",
  "car-camping": "Car Camping",
  "hammock-camping": "Hammock",
  "rv-camping": "RV/Glamping",
  "dispersed-camping": "Dispersed",
  "family-camping": "Family",
  winter: "Winter",
  bikepacking: "Bikepacking",
  kayaking: "Kayaking",
};

// Season labels
const SEASON_LABELS: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
  "3-season": "3-Season",
};

// Amenity labels
const AMENITY_LABELS: Record<keyof AmenityFlags, { label: string; icon: string }> = {
  hasWater: { label: "Water available", icon: "water-outline" },
  hasElectricity: { label: "Electricity", icon: "flash-outline" },
  hasShowers: { label: "Showers", icon: "water-outline" },
  hasToilets: { label: "Restrooms", icon: "home-outline" },
  hasCampStore: { label: "Camp store", icon: "storefront-outline" },
  hasFirePit: { label: "Fire pit", icon: "flame-outline" },
  hasBearBox: { label: "Bear box", icon: "cube-outline" },
};

export default function PackingListGenerateScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PackingListGenerateRouteProp>();
  const { tripId } = route.params;
  const { user } = useAuth();
  const trips = useTrips();

  const trip = useMemo(() => trips.find((t) => t.id === tripId), [trips, tripId]);

  // State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [tripType, setTripType] = useState<TripType>("car-camping");
  const [season, setSeason] = useState<Season>("summer");
  const [nights, setNights] = useState(2);
  const [partySize, setPartySize] = useState(2);
  const [amenities, setAmenities] = useState<AmenityFlags>({
    hasWater: true,
    hasElectricity: false,
    hasShowers: false,
    hasToilets: true,
    hasCampStore: false,
    hasFirePit: true,
    hasBearBox: false,
  });
  const [userTemplates, setUserTemplates] = useState<PackingTemplate[]>([]);
  const [pastTripsWithLists, setPastTripsWithLists] = useState<Array<{ tripId: string; itemCount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copying, setCopying] = useState(false);

  // Load user templates and past trips
  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;
      try {
        const [templates, pastTrips] = await Promise.all([
          getUserTemplates(user.id),
          getTripsWithPackingLists(user.id, tripId),
        ]);
        setUserTemplates(templates);
        setPastTripsWithLists(pastTrips);
      } catch (error) {
        console.error("[PackingListGenerate] Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user?.id, tripId]);

  // Auto-select recommended template based on trip type and season
  useEffect(() => {
    const recommended = getRecommendedTemplates(tripType, season);
    if (recommended.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(recommended[0].id);
    }
  }, [tripType, season]);

  // Get all available templates
  const allTemplates = useMemo(() => {
    return [...userTemplates, ...PACKING_TEMPLATES];
  }, [userTemplates]);

  // Selected template
  const selectedTemplate = useMemo(
    () => allTemplates.find((t) => t.id === selectedTemplateId),
    [allTemplates, selectedTemplateId]
  );

  // Recommended templates
  const recommendedTemplates = useMemo(
    () => getRecommendedTemplates(tripType, season),
    [tripType, season]
  );

  // Toggle amenity
  const toggleAmenity = (key: keyof AmenityFlags) => {
    Haptics.selectionAsync();
    setAmenities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Adjust nights
  const adjustNights = (delta: number) => {
    const newNights = Math.max(1, Math.min(30, nights + delta));
    setNights(newNights);
    Haptics.selectionAsync();
  };

  // Adjust party size
  const adjustPartySize = (delta: number) => {
    const newSize = Math.max(1, Math.min(20, partySize + delta));
    setPartySize(newSize);
    Haptics.selectionAsync();
  };

  // Copy from previous trip
  const handleCopyFromTrip = async (sourceTripId: string) => {
    if (!user?.id) return;

    const sourceTrip = trips.find((t) => t.id === sourceTripId);
    const tripName = sourceTrip?.name || "previous trip";

    Alert.alert(
      "Copy Packing List",
      `Copy all items from "${tripName}" to this trip?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Copy",
          onPress: async () => {
            setCopying(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
              const { copiedCount, linkedCount } = await copyPackingListFromTrip(
                user.id,
                sourceTripId,
                tripId
              );

              // Track analytics
              trackPackingListGenerated(tripId);
              trackCoreAction(user.id, "packing_list_generated");

              // Show success and navigate
              Alert.alert(
                "List Copied!",
                `${copiedCount} items copied${linkedCount > 0 ? `, ${linkedCount} linked to your gear closet` : ""}`,
                [
                  {
                    text: "View List",
                    onPress: () => navigation.replace("PackingList", { tripId }),
                  },
                ]
              );
            } catch (error) {
              console.error("[PackingListGenerate] Error copying list:", error);
              Alert.alert("Error", "Failed to copy packing list. Please try again.");
            } finally {
              setCopying(false);
            }
          },
        },
      ]
    );
  };

  // Generate list
  const handleGenerate = async () => {
    if (!user?.id || !selectedTemplate) return;

    setGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await generatePackingList(
        user.id,
        tripId,
        selectedTemplate,
        {
          tripType,
          season,
          nights,
          partySize,
          amenities,
        }
      );

      // Track analytics and core action
      trackPackingListGenerated(tripId);
      trackCoreAction(user.id, "packing_list_generated");

      // Navigate to the packing list
      navigation.replace("PackingList", { tripId });
    } catch (error) {
      console.error("[PackingListGenerate] Error generating list:", error);
      Alert.alert("Error", "Failed to generate packing list. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // Get past trip info for display
  const getPastTripInfo = (pastTripId: string) => {
    const pastTrip = trips.find((t) => t.id === pastTripId);
    return pastTrip;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <View className="flex-1 bg-parchment items-center justify-center">
        <ActivityIndicator size="large" color={DEEP_FOREST} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-parchment">
      {/* Header */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: DEEP_FOREST }}>
        <View
          style={{
            paddingTop: 8,
            paddingHorizontal: 20,
            paddingBottom: 16,
            backgroundColor: DEEP_FOREST,
          }}
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => navigation.goBack()}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              <Ionicons name="arrow-back" size={20} color={PARCHMENT} />
            </Pressable>

            <Text
              style={{
                fontFamily: "Raleway_700Bold",
                fontSize: 18,
                color: PARCHMENT,
              }}
            >
              Generate List
            </Text>

            <View style={{ width: 36 }} />
          </View>

          {trip && (
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 14,
                color: "rgba(255,255,255,0.7)",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              {trip.name}
            </Text>
          )}
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
        {/* Copy from Previous Trip */}
        {pastTripsWithLists.length > 0 && (
          <View className="mb-6">
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 13,
                color: TEXT_SECONDARY,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Copy from Previous Trip
            </Text>
            <View style={{ gap: 8 }}>
              {pastTripsWithLists.slice(0, 3).map(({ tripId: pastTripId, itemCount }) => {
                const pastTrip = getPastTripInfo(pastTripId);
                if (!pastTrip) return null;

                return (
                  <Pressable
                    key={pastTripId}
                    onPress={() => handleCopyFromTrip(pastTripId)}
                    disabled={copying}
                    className="flex-row items-center p-4 rounded-xl border"
                    style={{
                      borderColor: BORDER_SOFT,
                      backgroundColor: PARCHMENT,
                    }}
                  >
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
                    >
                      <Ionicons name="copy-outline" size={20} color={EARTH_GREEN} />
                    </View>
                    <View className="flex-1">
                      <Text
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 15,
                          color: DEEP_FOREST,
                        }}
                        numberOfLines={1}
                      >
                        {pastTrip.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "SourceSans3_400Regular",
                          fontSize: 12,
                          color: TEXT_SECONDARY,
                          marginTop: 2,
                        }}
                      >
                        {itemCount} items
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={EARTH_GREEN} />
                  </Pressable>
                );
              })}
            </View>

            {/* Divider */}
            <View className="flex-row items-center my-4">
              <View className="flex-1 h-px" style={{ backgroundColor: BORDER_SOFT }} />
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 12,
                  color: TEXT_SECONDARY,
                  marginHorizontal: 12,
                }}
              >
                or generate a new list
              </Text>
              <View className="flex-1 h-px" style={{ backgroundColor: BORDER_SOFT }} />
            </View>
          </View>
        )}

        {/* Trip Style */}
        <View className="mb-6">
          <Text
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              fontSize: 13,
              color: TEXT_SECONDARY,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Trip Style
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {TRIP_TYPES.map((type) => {
              const isSelected = tripType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => {
                    setTripType(type);
                    setSelectedTemplateId(null);
                    Haptics.selectionAsync();
                  }}
                  className={`px-4 py-2 rounded-full border ${
                    isSelected
                      ? "bg-forest border-forest"
                      : "bg-parchment border-parchmentDark"
                  }`}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 13,
                      color: isSelected ? PARCHMENT : DEEP_FOREST,
                    }}
                  >
                    {TRIP_TYPE_LABELS[type]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Season */}
        <View className="mb-6">
          <Text
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              fontSize: 13,
              color: TEXT_SECONDARY,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Season
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {SEASONS.map((s) => {
              const isSelected = season === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => {
                    setSeason(s);
                    setSelectedTemplateId(null);
                    Haptics.selectionAsync();
                  }}
                  className={`px-4 py-2 rounded-full border ${
                    isSelected
                      ? "bg-forest border-forest"
                      : "bg-parchment border-parchmentDark"
                  }`}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 13,
                      color: isSelected ? PARCHMENT : DEEP_FOREST,
                    }}
                  >
                    {SEASON_LABELS[s]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Nights & Party Size */}
        <View className="flex-row mb-6" style={{ gap: 16 }}>
          {/* Nights */}
          <View className="flex-1">
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 13,
                color: TEXT_SECONDARY,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Nights
            </Text>
            <View className="flex-row items-center justify-between p-3 rounded-xl border" style={{ borderColor: BORDER_SOFT }}>
              <Pressable
                onPress={() => adjustNights(-1)}
                className="w-8 h-8 rounded-lg items-center justify-center"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
              >
                <Ionicons name="remove" size={18} color={DEEP_FOREST} />
              </Pressable>
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 18,
                  color: DEEP_FOREST,
                }}
              >
                {nights}
              </Text>
              <Pressable
                onPress={() => adjustNights(1)}
                className="w-8 h-8 rounded-lg items-center justify-center"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
              >
                <Ionicons name="add" size={18} color={DEEP_FOREST} />
              </Pressable>
            </View>
          </View>

          {/* Party Size */}
          <View className="flex-1">
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 13,
                color: TEXT_SECONDARY,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Party Size
            </Text>
            <View className="flex-row items-center justify-between p-3 rounded-xl border" style={{ borderColor: BORDER_SOFT }}>
              <Pressable
                onPress={() => adjustPartySize(-1)}
                className="w-8 h-8 rounded-lg items-center justify-center"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
              >
                <Ionicons name="remove" size={18} color={DEEP_FOREST} />
              </Pressable>
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 18,
                  color: DEEP_FOREST,
                }}
              >
                {partySize}
              </Text>
              <Pressable
                onPress={() => adjustPartySize(1)}
                className="w-8 h-8 rounded-lg items-center justify-center"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
              >
                <Ionicons name="add" size={18} color={DEEP_FOREST} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Amenities */}
        <View className="mb-6">
          <Text
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              fontSize: 13,
              color: TEXT_SECONDARY,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Site Amenities
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {(Object.keys(AMENITY_LABELS) as (keyof AmenityFlags)[]).map((key) => {
              const { label, icon } = AMENITY_LABELS[key];
              const isSelected = amenities[key];
              return (
                <Pressable
                  key={key}
                  onPress={() => toggleAmenity(key)}
                  className={`flex-row items-center px-3 py-2 rounded-full border ${
                    isSelected
                      ? "bg-forest border-forest"
                      : "bg-parchment border-parchmentDark"
                  }`}
                >
                  <Ionicons
                    name={icon as any}
                    size={16}
                    color={isSelected ? PARCHMENT : EARTH_GREEN}
                  />
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 13,
                      color: isSelected ? PARCHMENT : DEEP_FOREST,
                      marginLeft: 6,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Template Selection */}
        <View className="mb-6">
          <Text
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              fontSize: 13,
              color: TEXT_SECONDARY,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Select Template
          </Text>

          {/* Recommended Templates */}
          {recommendedTemplates.length > 0 && (
            <View className="mb-4">
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 12,
                  color: EARTH_GREEN,
                  marginBottom: 6,
                }}
              >
                Recommended for {TRIP_TYPE_LABELS[tripType]} in {SEASON_LABELS[season]}
              </Text>
              <View style={{ gap: 8 }}>
                {recommendedTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplateId === template.id}
                    onSelect={() => {
                      setSelectedTemplateId(template.id);
                      Haptics.selectionAsync();
                    }}
                    isRecommended
                  />
                ))}
              </View>
            </View>
          )}

          {/* User Templates */}
          {userTemplates.length > 0 && (
            <View className="mb-4">
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 12,
                  color: TEXT_SECONDARY,
                  marginBottom: 6,
                }}
              >
                My Templates
              </Text>
              <View style={{ gap: 8 }}>
                {userTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplateId === template.id}
                    onSelect={() => {
                      setSelectedTemplateId(template.id);
                      Haptics.selectionAsync();
                    }}
                  />
                ))}
              </View>
            </View>
          )}

          {/* All Templates */}
          <View>
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 12,
                color: TEXT_SECONDARY,
                marginBottom: 6,
              }}
            >
              All Templates
            </Text>
            <View style={{ gap: 8 }}>
              {PACKING_TEMPLATES.filter(
                (t) => !recommendedTemplates.some((r) => r.id === t.id)
              ).map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplateId === template.id}
                  onSelect={() => {
                    setSelectedTemplateId(template.id);
                    Haptics.selectionAsync();
                  }}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Generate Button */}
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: PARCHMENT }}>
        <View
          className="px-4 py-4 border-t"
          style={{ borderColor: BORDER_SOFT }}
        >
          <Pressable
            onPress={handleGenerate}
            disabled={!selectedTemplate || generating}
            className="flex-row items-center justify-center py-4 rounded-xl"
            style={{
              backgroundColor: selectedTemplate ? DEEP_FOREST : CARD_BACKGROUND_LIGHT,
            }}
          >
            {generating ? (
              <ActivityIndicator size="small" color={PARCHMENT} />
            ) : (
              <>
                <Ionicons
                  name="sparkles"
                  size={22}
                  color={selectedTemplate ? PARCHMENT : TEXT_SECONDARY}
                />
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 16,
                    color: selectedTemplate ? PARCHMENT : TEXT_SECONDARY,
                    marginLeft: 10,
                  }}
                >
                  Generate Packing List
                </Text>
              </>
            )}
          </Pressable>

          {selectedTemplate && (
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 12,
                color: TEXT_SECONDARY,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              ~{selectedTemplate.items.length} items will be added based on your settings
            </Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

// ============================================================================
// TEMPLATE CARD
// ============================================================================

interface TemplateCardProps {
  template: PackingTemplate;
  isSelected: boolean;
  onSelect: () => void;
  isRecommended?: boolean;
}

function TemplateCard({ template, isSelected, onSelect, isRecommended }: TemplateCardProps) {
  return (
    <Pressable
      onPress={onSelect}
      className="flex-row items-center p-4 rounded-xl border"
      style={{
        borderColor: isSelected ? DEEP_FOREST : BORDER_SOFT,
        backgroundColor: isSelected ? "rgba(26, 76, 57, 0.08)" : PARCHMENT,
        borderWidth: isSelected ? 2 : 1,
      }}
    >
      {/* Radio */}
      <View
        className="w-5 h-5 rounded-full border-2 items-center justify-center mr-3"
        style={{
          borderColor: isSelected ? DEEP_FOREST : BORDER_SOFT,
        }}
      >
        {isSelected && (
          <View
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: DEEP_FOREST }}
          />
        )}
      </View>

      {/* Icon */}
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{
          backgroundColor: isRecommended ? FOREST_BG : CARD_BACKGROUND_LIGHT,
        }}
      >
        <Ionicons
          name={template.isSystem ? "cube-outline" : "document-text-outline"}
          size={20}
          color={isRecommended ? DEEP_FOREST : EARTH_GREEN}
        />
      </View>

      {/* Info */}
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              fontSize: 15,
              color: DEEP_FOREST,
            }}
            numberOfLines={1}
          >
            {template.name}
          </Text>
          {isRecommended && (
            <View
              className="ml-2 px-2 py-0.5 rounded-full"
              style={{ backgroundColor: GRANITE_GOLD }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 10,
                  color: PARCHMENT,
                }}
              >
                Recommended
              </Text>
            </View>
          )}
        </View>
        <Text
          style={{
            fontFamily: "SourceSans3_400Regular",
            fontSize: 12,
            color: TEXT_SECONDARY,
            marginTop: 2,
          }}
        >
          {template.items.length} items
          {template.description && ` • ${template.description}`}
        </Text>
      </View>
    </Pressable>
  );
}
