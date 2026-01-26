/**
 * Packing List Home Screen V2
 * Entry point for packing - shows trip selector, progress, and list generation options
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";
import { Trip } from "../types/camping";
import { PackingTemplate, calculateProgress } from "../types/packingV2";
import {
  getTripPackingList,
  getUserTemplates,
} from "../services/packingServiceV2";
import { PACKING_TEMPLATES } from "../data/packingTemplates";
import { useTrips } from "../state/tripsStore";
import { useAuth } from "../context/AuthContext";
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PackingListHomeScreenV2() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const trips = useTrips();

  // State
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [showTripPicker, setShowTripPicker] = useState(false);
  const [tripProgress, setTripProgress] = useState<{
    packed: number;
    total: number;
  } | null>(null);
  const [userTemplates, setUserTemplates] = useState<PackingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get upcoming trips (sorted by start date)
  const upcomingTrips = useMemo(() => {
    const now = new Date();
    return trips
      .filter((t) => {
        if (!t.startDate) return true;
        const startDate = typeof t.startDate === "string" 
          ? new Date(t.startDate) 
          : t.startDate.toDate?.() || new Date(t.startDate);
        return startDate >= now || !t.endDate;
      })
      .sort((a, b) => {
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        const aDate = typeof a.startDate === "string" ? new Date(a.startDate) : a.startDate.toDate?.() || new Date(a.startDate);
        const bDate = typeof b.startDate === "string" ? new Date(b.startDate) : b.startDate.toDate?.() || new Date(b.startDate);
        return aDate.getTime() - bDate.getTime();
      });
  }, [trips]);

  // Selected trip
  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId),
    [trips, selectedTripId]
  );

  // Auto-select first upcoming trip
  useEffect(() => {
    if (!selectedTripId && upcomingTrips.length > 0) {
      setSelectedTripId(upcomingTrips[0].id);
    }
  }, [upcomingTrips, selectedTripId]);

  // Load data
  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Load user templates
      const templates = await getUserTemplates(user.id);
      setUserTemplates(templates);

      // Load trip packing progress
      if (selectedTripId) {
        const packingList = await getTripPackingList(user.id, selectedTripId);
        if (packingList) {
          setTripProgress({
            packed: packingList.packedCount,
            total: packingList.totalCount,
          });
        } else {
          setTripProgress(null);
        }
      }
    } catch (error) {
      console.error("[PackingListHome] Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, selectedTripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Navigate to packing list
  const goToPackingList = () => {
    if (!selectedTripId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("PackingList", { tripId: selectedTripId });
  };

  // Navigate to generate screen
  const goToGenerate = () => {
    if (!selectedTripId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("PackingListGenerate", { tripId: selectedTripId });
  };

  // Format date
  const formatDate = (date: any): string => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date.toDate?.() || new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Progress percentage
  const progressPercent = tripProgress
    ? calculateProgress(tripProgress.packed, tripProgress.total)
    : 0;

  const hasList = tripProgress && tripProgress.total > 0;

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading && !trips.length) {
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
          <Text
            style={{
              fontFamily: "Raleway_700Bold",
              fontSize: 24,
              color: PARCHMENT,
            }}
          >
            Packing
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        {/* Trip Selector */}
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
            Select Trip
          </Text>

          {upcomingTrips.length === 0 ? (
            <View
              className="p-4 rounded-xl border"
              style={{
                borderColor: BORDER_SOFT,
                backgroundColor: CARD_BACKGROUND_LIGHT,
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 14,
                  color: TEXT_SECONDARY,
                  textAlign: "center",
                }}
              >
                No upcoming trips. Create a trip to start packing!
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowTripPicker(!showTripPicker)}
              className="flex-row items-center justify-between p-4 rounded-xl border"
              style={{
                borderColor: BORDER_SOFT,
                backgroundColor: PARCHMENT,
              }}
            >
              <View className="flex-row items-center flex-1">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: DEEP_FOREST }}
                >
                  <Ionicons name="calendar-outline" size={20} color={PARCHMENT} />
                </View>
                <View className="flex-1">
                  <Text
                    style={{
                      fontFamily: "Raleway_700Bold",
                      fontSize: 16,
                      color: DEEP_FOREST,
                    }}
                    numberOfLines={1}
                  >
                    {selectedTrip?.name || "Select a trip"}
                  </Text>
                  {selectedTrip?.startDate && (
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 13,
                        color: TEXT_SECONDARY,
                        marginTop: 2,
                      }}
                    >
                      {formatDate(selectedTrip.startDate)}
                      {selectedTrip.endDate && ` - ${formatDate(selectedTrip.endDate)}`}
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons
                name={showTripPicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={EARTH_GREEN}
              />
            </Pressable>
          )}

          {/* Trip Picker Dropdown */}
          {showTripPicker && upcomingTrips.length > 0 && (
            <View
              className="mt-2 rounded-xl border overflow-hidden"
              style={{
                borderColor: BORDER_SOFT,
                backgroundColor: PARCHMENT,
                maxHeight: 200,
              }}
            >
              <ScrollView nestedScrollEnabled>
                {upcomingTrips.map((trip) => (
                  <Pressable
                    key={trip.id}
                    onPress={() => {
                      setSelectedTripId(trip.id);
                      setShowTripPicker(false);
                      setTripProgress(null);
                      Haptics.selectionAsync();
                    }}
                    className="flex-row items-center px-4 py-3 border-b"
                    style={{
                      borderColor: BORDER_SOFT,
                      backgroundColor:
                        trip.id === selectedTripId
                          ? "rgba(26, 76, 57, 0.1)"
                          : "transparent",
                    }}
                  >
                    <View className="flex-1">
                      <Text
                        style={{
                          fontFamily:
                            trip.id === selectedTripId
                              ? "SourceSans3_600SemiBold"
                              : "SourceSans3_400Regular",
                          fontSize: 15,
                          color: DEEP_FOREST,
                        }}
                        numberOfLines={1}
                      >
                        {trip.name}
                      </Text>
                      {trip.startDate && (
                        <Text
                          style={{
                            fontFamily: "SourceSans3_400Regular",
                            fontSize: 12,
                            color: TEXT_SECONDARY,
                          }}
                        >
                          {formatDate(trip.startDate)}
                        </Text>
                      )}
                    </View>
                    {trip.id === selectedTripId && (
                      <Ionicons name="checkmark" size={20} color={DEEP_FOREST} />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Progress & Actions */}
        {selectedTripId && (
          <>
            {/* Progress Card */}
            {hasList && (
              <View
                className="mb-6 p-4 rounded-xl border"
                style={{
                  borderColor: BORDER_SOFT,
                  backgroundColor: PARCHMENT,
                }}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <Text
                    style={{
                      fontFamily: "Raleway_700Bold",
                      fontSize: 16,
                      color: DEEP_FOREST,
                    }}
                  >
                    Packing Progress
                  </Text>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 14,
                      color: progressPercent === 100 ? EARTH_GREEN : DEEP_FOREST,
                    }}
                  >
                    {progressPercent}%
                  </Text>
                </View>

                <View
                  className="h-3 rounded-full overflow-hidden mb-3"
                  style={{ backgroundColor: "#FFFFFF" }}
                >
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${progressPercent}%`,
                      backgroundColor:
                        progressPercent === 100 ? EARTH_GREEN : GRANITE_GOLD,
                    }}
                  />
                </View>

                <View className="flex-row items-center justify-between">
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 13,
                      color: TEXT_SECONDARY,
                    }}
                  >
                    {tripProgress!.packed} of {tripProgress!.total} items packed
                  </Text>

                  {progressPercent === 100 && (
                    <View className="flex-row items-center">
                      <Ionicons name="checkmark-circle" size={16} color={EARTH_GREEN} />
                      <Text
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 12,
                          color: EARTH_GREEN,
                          marginLeft: 4,
                        }}
                      >
                        Ready!
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View className="mb-6">
              {hasList ? (
                <Pressable
                  onPress={goToPackingList}
                  className="flex-row items-center justify-center py-4 rounded-xl"
                  style={{ backgroundColor: DEEP_FOREST }}
                >
                  <Ionicons name="checkbox-outline" size={22} color={PARCHMENT} />
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 16,
                      color: PARCHMENT,
                      marginLeft: 10,
                    }}
                  >
                    Continue Packing
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={goToGenerate}
                  className="flex-row items-center justify-center py-4 rounded-xl"
                  style={{ backgroundColor: DEEP_FOREST }}
                >
                  <Ionicons name="sparkles" size={22} color={PARCHMENT} />
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 16,
                      color: PARCHMENT,
                      marginLeft: 10,
                    }}
                  >
                    Generate Packing List
                  </Text>
                </Pressable>
              )}

              {hasList && (
                <Pressable
                  onPress={goToGenerate}
                  className="flex-row items-center justify-center py-3 rounded-xl border mt-3"
                  style={{ borderColor: DEEP_FOREST }}
                >
                  <Ionicons name="refresh" size={18} color={DEEP_FOREST} />
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 14,
                      color: DEEP_FOREST,
                      marginLeft: 8,
                    }}
                  >
                    Regenerate List
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        {/* Templates Section */}
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
            My Saved Templates
          </Text>

          {userTemplates.length === 0 ? (
            <View
              className="p-4 rounded-xl border"
              style={{
                borderColor: BORDER_SOFT,
                backgroundColor: CARD_BACKGROUND_LIGHT,
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 14,
                  color: TEXT_SECONDARY,
                  textAlign: "center",
                }}
              >
                No saved templates yet. Save a packing list as a template to reuse it!
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {userTemplates.slice(0, 3).map((template) => (
                <Pressable
                  key={template.id}
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
                    <Ionicons name="document-text-outline" size={20} color={EARTH_GREEN} />
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
                      {template.name}
                    </Text>
                    {template.description && (
                      <Text
                        style={{
                          fontFamily: "SourceSans3_400Regular",
                          fontSize: 12,
                          color: TEXT_SECONDARY,
                          marginTop: 2,
                        }}
                        numberOfLines={1}
                      >
                        {template.description}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={EARTH_GREEN} />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Suggested Templates */}
        <View>
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
            Suggested Templates
          </Text>

          <View style={{ gap: 8 }}>
            {PACKING_TEMPLATES.slice(0, 4).map((template) => (
              <Pressable
                key={template.id}
                className="flex-row items-center p-4 rounded-xl border"
                style={{
                  borderColor: BORDER_SOFT,
                  backgroundColor: PARCHMENT,
                }}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: FOREST_BG }}
                >
                  <Ionicons name="cube-outline" size={20} color={DEEP_FOREST} />
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
                    {template.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 12,
                      color: TEXT_SECONDARY,
                      marginTop: 2,
                    }}
                  >
                    {template.items.length} items
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={EARTH_GREEN} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
