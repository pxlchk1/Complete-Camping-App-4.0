/**
 * Packing List Create Screen
 * Swipeable screen for creating new packing lists
 * Collects: name, trip type, season, and templates
 * 
 * Season Priority (when linked to a trip):
 * 1. User override (packingSeasonOverride)
 * 2. Winter camping flag or campingStyle
 * 3. Trip start date month
 * 4. Default to summer
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  BORDER_SOFT,
} from "../constants/colors";
import {
  PACKING_TEMPLATES,
  TRIP_TYPE_OPTIONS,
  SEASON_OPTIONS,
} from "../constants/packingTemplatesV2";
import {
  usePackingStore,
  TripType,
  Season,
  PackingTemplateKey,
} from "../state/packingStore";
import { RootStackParamList } from "../navigation/types";
import { getSeasonInfo, WINTER_NUDGE_TEXT, type SeasonSource } from "../utils/packingSeasonUtils";
import { useUpdateTrip } from "../state/tripsStore";
import { auth } from "../config/firebase";
import { getUserGear } from "../services/gearClosetService";
import { GearItem } from "../types/gear";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "PackingListCreate">;

export default function PackingListCreateScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { createPackingList } = usePackingStore();
  const updateTrip = useUpdateTrip();
  
  // Get trip context from route params (if navigating from a trip)
  const tripId = route.params?.tripId;
  const tripName = route.params?.tripName;
  const tripStartDate = route.params?.tripStartDate;
  const tripEndDate = route.params?.tripEndDate;
  const tripCampingStyle = route.params?.tripCampingStyle;
  const tripWinterCamping = route.params?.tripWinterCamping;
  const tripPackingSeasonOverride = route.params?.tripPackingSeasonOverride;

  // Calculate trip type from dates
  const calculatedTripType = useMemo((): TripType => {
    if (!tripStartDate || !tripEndDate) return "weekend"; // default
    
    const start = new Date(tripStartDate);
    const end = new Date(tripEndDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Map days to trip type
    if (diffDays === 0) return "day-hike";
    if (diffDays === 1) return "one-night";
    if (diffDays <= 3) return "weekend";
    return "multi-day";
  }, [tripStartDate, tripEndDate]);

  // Build a partial trip object for season detection
  const tripContext = useMemo(() => tripId ? {
    startDate: tripStartDate,
    campingStyle: tripCampingStyle,
    winterCamping: tripWinterCamping,
    packingSeasonOverride: tripPackingSeasonOverride,
  } : null, [tripId, tripStartDate, tripCampingStyle, tripWinterCamping, tripPackingSeasonOverride]);

  // Compute initial season based on trip context
  const initialSeasonInfo = useMemo(() => {
    if (tripContext) {
      return getSeasonInfo(tripContext as any);
    }
    return { season: "summer" as Season, source: "default" as SeasonSource };
  }, [tripContext]);

  // Season change sheet state
  const [showSeasonSheet, setShowSeasonSheet] = useState(false);
  
  // Track if user has overridden season in this session
  const [userOverrideSeason, setUserOverrideSeason] = useState<Season | null>(null);

  // Gear Closet integration state
  const [includeGearCloset, setIncludeGearCloset] = useState(true);
  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [gearLoading, setGearLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Load user's gear closet items
  useEffect(() => {
    const loadGear = async () => {
      const user = auth.currentUser;
      if (!user) return;
      
      setGearLoading(true);
      try {
        const gear = await getUserGear(user.uid);
        setGearItems(gear);
      } catch (error) {
        console.error("Error loading gear closet:", error);
      } finally {
        setGearLoading(false);
      }
    };
    
    loadGear();
  }, []);

  // Form state - pre-fill with trip name if available
  const [listName, setListName] = useState(tripName ? `${tripName} Packing List` : "");
  // Trip type: use calculated value from trip dates if available, otherwise allow user selection
  const [tripType, setTripType] = useState<TripType>(tripId ? calculatedTripType : "weekend");
  
  // Season: use user override if set, otherwise use computed initial season
  const season = userOverrideSeason ?? initialSeasonInfo.season;
  const seasonSource: SeasonSource = userOverrideSeason ? "override" : initialSeasonInfo.source;
  
  const [selectedTemplates, setSelectedTemplates] = useState<Set<PackingTemplateKey>>(
    new Set(["essential"])
  );

  // Handle season change from the sheet
  const handleSeasonChange = useCallback((newSeason: Season) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUserOverrideSeason(newSeason);
    setShowSeasonSheet(false);
    
    // Persist the override to the trip if we have a tripId
    if (tripId) {
      updateTrip(tripId, { packingSeasonOverride: newSeason });
    }
  }, [tripId, updateTrip]);

  // Reset to auto-detected season
  const handleResetToAuto = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUserOverrideSeason(null);
    setShowSeasonSheet(false);
    
    // Clear the override from the trip
    if (tripId) {
      updateTrip(tripId, { packingSeasonOverride: undefined });
    }
  }, [tripId, updateTrip]);

  // Get helper text based on season source
  const getSeasonHelperText = () => {
    switch (seasonSource) {
      case "override":
        return "You picked this season for this trip.";
      case "winterCamping":
        return "Based on Winter Camping.";
      case "dates":
        return "Based on your trip dates.";
      default:
        return null;
    }
  };

  // Get season label with source indicator
  const getSeasonLabel = () => {
    const seasonName = season.charAt(0).toUpperCase() + season.slice(1);
    if (seasonSource === "override") {
      return `${seasonName} (Chosen)`;
    }
    if (tripContext && (seasonSource === "dates" || seasonSource === "winterCamping")) {
      return `${seasonName} (Auto)`;
    }
    return seasonName;
  };

  const handleToggleTemplate = (key: PackingTemplateKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleCreate = useCallback(() => {
    if (!listName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const templateKeys = Array.from(selectedTemplates);
    
    // Pass gear items if toggle is on
    const gearToInclude = includeGearCloset ? gearItems : undefined;
    const listId = createPackingList(listName.trim(), tripType, season, templateKeys, tripId, false, gearToInclude);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsCreating(false);

    // Navigate to the editor
    navigation.replace("PackingListEditor" as any, { listId });
  }, [listName, tripType, season, selectedTemplates, tripId, createPackingList, navigation, includeGearCloset, gearItems]);

  const canCreate = listName.trim().length > 0 && !isCreating;

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
              New Packing List
            </Text>

            <View style={{ width: 36 }} />
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* List Name */}
          <View className="px-4 pt-5">
            <Text
              className="text-xs mb-2"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: EARTH_GREEN }}
            >
              LIST NAME
            </Text>
            <TextInput
              value={listName}
              onChangeText={setListName}
              placeholder="e.g., Yosemite Weekend Trip"
              placeholderTextColor="#999"
              className="bg-white rounded-xl px-4 py-3"
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 16,
                color: DEEP_FOREST,
                borderWidth: 1,
                borderColor: BORDER_SOFT,
              }}
            />
          </View>

          {/* Trip Type - only show when NOT linked to a trip (standalone packing list) */}
          {!tripId && (
            <View className="px-4 pt-5">
              <Text
                className="text-xs mb-3"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: EARTH_GREEN }}
              >
                TRIP TYPE
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {TRIP_TYPE_OPTIONS.map((option) => {
                  const isSelected = tripType === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setTripType(option.value as TripType);
                      }}
                      className="flex-row items-center px-4 py-2 rounded-full border"
                      style={{
                        backgroundColor: isSelected ? DEEP_FOREST : "#FFFFFF",
                        borderColor: isSelected ? DEEP_FOREST : BORDER_SOFT,
                      }}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={16}
                        color={isSelected ? PARCHMENT : DEEP_FOREST}
                      />
                      <Text
                        className="ml-2"
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 14,
                          color: isSelected ? PARCHMENT : DEEP_FOREST,
                        }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Season */}
          <View className="px-4 pt-5">
            <Text
              className="text-xs mb-3"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: EARTH_GREEN }}
            >
              SEASON
            </Text>
            
            {/* If linked to a trip, show smart season row with change button */}
            {tripContext ? (
              <View>
                <View
                  className="bg-white rounded-xl p-4 flex-row items-center justify-between"
                  style={{ borderWidth: 1, borderColor: BORDER_SOFT }}
                >
                  <View className="flex-row items-center flex-1">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: DEEP_FOREST }}
                    >
                      <Ionicons
                        name={SEASON_OPTIONS.find(o => o.value === season)?.icon as any ?? "sunny"}
                        size={20}
                        color={PARCHMENT}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-base"
                        style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
                      >
                        {getSeasonLabel()}
                      </Text>
                      {getSeasonHelperText() && (
                        <Text
                          className="text-xs mt-0.5"
                          style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                        >
                          {getSeasonHelperText()}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowSeasonSheet(true);
                    }}
                    className="px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: "#F4F2EC" }}
                  >
                    <Text
                      style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 13, color: DEEP_FOREST }}
                    >
                      Change
                    </Text>
                  </Pressable>
                </View>
                
                {/* Winter nudge message */}
                {season === "winter" && (
                  <View
                    className="flex-row items-start mt-3 p-3 rounded-xl"
                    style={{ backgroundColor: "#E8F4F8" }}
                  >
                    <Ionicons name="snow-outline" size={18} color={DEEP_FOREST} style={{ marginTop: 1 }} />
                    <Text
                      className="ml-2 flex-1"
                      style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: DEEP_FOREST }}
                    >
                      {WINTER_NUDGE_TEXT}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              /* No trip context - show manual season selection buttons */
              <View className="flex-row" style={{ gap: 8 }}>
                {SEASON_OPTIONS.map((option) => {
                  const isSelected = season === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setUserOverrideSeason(option.value as Season);
                      }}
                      className="flex-1 items-center py-3 rounded-xl border"
                      style={{
                        backgroundColor: isSelected ? DEEP_FOREST : "#FFFFFF",
                        borderColor: isSelected ? DEEP_FOREST : BORDER_SOFT,
                      }}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={24}
                        color={isSelected ? PARCHMENT : DEEP_FOREST}
                      />
                      <Text
                        className="mt-1"
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 13,
                          color: isSelected ? PARCHMENT : DEEP_FOREST,
                        }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Templates */}
          <View className="px-4 pt-5">
            <Text
              className="text-xs mb-1"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: EARTH_GREEN }}
            >
              CHOOSE YOUR PACKING CATEGORIES
            </Text>
            <Text
              className="text-xs mb-3"
              style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
            >
              Pick what applies — we'll build your list and you can edit anything
            </Text>

            <View style={{ gap: 10 }}>
              {PACKING_TEMPLATES.map((template) => {
                const isSelected = selectedTemplates.has(template.key);
                return (
                  <Pressable
                    key={template.key}
                    onPress={() => handleToggleTemplate(template.key)}
                    className="flex-row items-center bg-white rounded-xl p-4"
                    style={{
                      borderWidth: 2,
                      borderColor: isSelected ? DEEP_FOREST : BORDER_SOFT,
                    }}
                  >
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{
                        backgroundColor: isSelected ? DEEP_FOREST : "#F4F2EC",
                      }}
                    >
                      <Ionicons
                        name={template.icon as any}
                        size={20}
                        color={isSelected ? PARCHMENT : DEEP_FOREST}
                      />
                    </View>

                    <View className="flex-1">
                      <Text
                        className="text-base"
                        style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
                      >
                        {template.name}
                      </Text>
                      <Text
                        className="text-xs"
                        style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                      >
                        {template.items.length} items • {template.description}
                      </Text>
                    </View>

                    <View
                      className="w-6 h-6 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: isSelected ? DEEP_FOREST : "#F4F2EC",
                        borderWidth: isSelected ? 0 : 2,
                        borderColor: BORDER_SOFT,
                      }}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color={PARCHMENT} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Gear Closet Toggle */}
          {auth.currentUser && (
            <View className="px-4 pt-5">
              <View
                className="bg-white rounded-xl p-4 flex-row items-center justify-between"
                style={{ borderWidth: 1, borderColor: BORDER_SOFT }}
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: includeGearCloset ? DEEP_FOREST : "#F4F2EC" }}
                  >
                    <Ionicons
                      name="briefcase-outline"
                      size={20}
                      color={includeGearCloset ? PARCHMENT : DEEP_FOREST}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-base"
                      style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
                    >
                      Include my Gear Closet
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                    >
                      {gearLoading ? (
                        "Loading gear..."
                      ) : gearItems.length > 0 ? (
                        `${gearItems.length} items from your gear collection`
                      ) : (
                        "No gear items yet"
                      )}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={includeGearCloset}
                  onValueChange={(value) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIncludeGearCloset(value);
                  }}
                  trackColor={{ false: "#E6E1D6", true: DEEP_FOREST }}
                  thumbColor={PARCHMENT}
                  disabled={gearItems.length === 0}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Create Button */}
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: PARCHMENT }}>
        <View className="px-4 py-3" style={{ borderTopWidth: 1, borderColor: BORDER_SOFT }}>
          <Pressable
            onPress={handleCreate}
            disabled={!canCreate}
            className="py-4 rounded-xl items-center"
            style={{
              backgroundColor: canCreate ? DEEP_FOREST : "#E6E1D6",
            }}
          >
            <Text
              style={{
                fontFamily: "SourceSans3_700Bold",
                fontSize: 16,
                color: canCreate ? PARCHMENT : "#999",
              }}
            >
              Create Packing List
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Season Change Sheet Modal */}
      <Modal
        visible={showSeasonSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSeasonSheet(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setShowSeasonSheet(false)}
        >
          <Pressable onPress={() => {}}>
            <View
              className="bg-parchment rounded-t-3xl"
              style={{ paddingBottom: Platform.OS === "ios" ? 34 : 20 }}
            >
              {/* Sheet Handle */}
              <View className="items-center py-3">
                <View className="w-10 h-1 rounded-full bg-gray-300" />
              </View>

              {/* Sheet Header */}
              <View className="px-5 pb-3">
                <Text
                  style={{ fontFamily: "Raleway_700Bold", fontSize: 18, color: DEEP_FOREST }}
                >
                  Change Season
                </Text>
                <Text
                  className="mt-1"
                  style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: EARTH_GREEN }}
                >
                  This will override the auto-detected season for this trip
                </Text>
              </View>

              {/* Season Options */}
              <View className="px-4 pb-3" style={{ gap: 8 }}>
                {SEASON_OPTIONS.map((option) => {
                  const isSelected = season === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => handleSeasonChange(option.value as Season)}
                      className="flex-row items-center bg-white rounded-xl p-4"
                      style={{
                        borderWidth: 2,
                        borderColor: isSelected ? DEEP_FOREST : BORDER_SOFT,
                      }}
                    >
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: isSelected ? DEEP_FOREST : "#F4F2EC" }}
                      >
                        <Ionicons
                          name={option.icon as any}
                          size={20}
                          color={isSelected ? PARCHMENT : DEEP_FOREST}
                        />
                      </View>
                      <Text
                        className="flex-1"
                        style={{ fontFamily: "Raleway_700Bold", fontSize: 16, color: DEEP_FOREST }}
                      >
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={DEEP_FOREST} />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Reset to Auto button (only if user has overridden) */}
              {userOverrideSeason !== null && (
                <View className="px-4 pb-2">
                  <Pressable
                    onPress={handleResetToAuto}
                    className="py-3 rounded-xl items-center"
                    style={{ backgroundColor: "#F4F2EC" }}
                  >
                    <Text
                      style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: EARTH_GREEN }}
                    >
                      Reset to Auto
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Cancel Button */}
              <View className="px-4">
                <Pressable
                  onPress={() => setShowSeasonSheet(false)}
                  className="py-3 rounded-xl items-center"
                >
                  <Text
                    style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: EARTH_GREEN }}
                  >
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
