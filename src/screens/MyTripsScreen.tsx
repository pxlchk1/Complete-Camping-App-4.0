import React, { useMemo, useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { useTrips, Trip, useDeleteTrip, useTripsStore } from "../state/tripsStore";
import { useUserStore } from "../state/userStore";
import { usePlanTabStore, PlanTab } from "../state/planTabStore";
import { usePackingStore } from "../state/packingStore";
import { useUserStatus } from "../utils/authHelper";
import { requirePro, requireAccount } from "../utils/gating";
import { useAuthStore } from "../state/authStore";
import { getTripsCreatedCount } from "../services/userActionTrackerService";
import TripCard from "../components/TripCard";
import CreateTripModal from "../components/CreateTripModal";
import ConfirmationModal from "../components/ConfirmationModal";
import AccountRequiredModal from "../components/AccountRequiredModal";
import { RootStackParamList } from "../navigation/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { DEEP_FOREST, EARTH_GREEN, GRANITE_GOLD, PARCHMENT, BORDER_SOFT, CARD_BACKGROUND_LIGHT } from "../constants/colors";
import * as Haptics from "expo-haptics";
import { format } from "date-fns";

type MyTripsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type MyTripsScreenRouteProp = RouteProp<{ MyTrips: { initialTab?: PlanTab } }, "MyTrips">;

function getStatus(startISO: string, endISO: string): "In Progress" | "Upcoming" | "Completed" {
  const today = new Date();
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (today > end) return "Completed";
  if (today < start) return "Upcoming";
  return "In Progress";
}

function formatDateRange(startISO: string, endISO: string): string {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const startStr = format(start, "MMM d");
  const endStr = format(end, "MMM d, yyyy");
  return `${startStr} – ${endStr}`;
}

export default function MyTripsScreen() {
  const nav = useNavigation<MyTripsScreenNavigationProp>();
  const route = useRoute<MyTripsScreenRouteProp>();
  const allTrips = useTrips();
  const loadTrips = useTripsStore((s) => s.loadTrips);
  const tripsLoading = useTripsStore((s) => s.loading);
  const tripsInitialized = useTripsStore((s) => s.initialized);
  const currentUser = useAuthStore((s) => s.user);
  const { isPro, isFree, isGuest } = useUserStatus();
  const insets = useSafeAreaInsets();

  // Load trips from Firebase when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (currentUser && !isGuest) {
        loadTrips();
      }
    }, [currentUser, isGuest, loadTrips])
  );

  // Handle route params for initialTab
  useEffect(() => {
    if (route.params?.initialTab) {
      setActivePlanTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  // Trips from Firebase are already filtered to user's owned and shared trips
  const trips = useMemo(() => {
    if (!currentUser) return [];
    return allTrips;
  }, [allTrips, currentUser]);

  // Plan section tab state - use shared store
  const setActivePlanTab = usePlanTabStore((s) => s.setActiveTab);

  const [showCreate, setShowCreate] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const hasUsedFreeTrip = useUserStore((s) => s.hasUsedFreeTrip);
  const setHasUsedFreeTrip = useUserStore((s) => s.setHasUsedFreeTrip);
  const [menuTrip, setMenuTrip] = useState<Trip | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Trip | null>(null);
  const deleteTrip = useDeleteTrip();

  // Combine all non-completed trips into upcoming, categorize past separately
  const { allUpcomingTrips, pastTrips } = useMemo(() => {
    const upcoming: Trip[] = [];
    const past: Trip[] = [];
    
    trips.forEach((t) => {
      const status = getStatus(t.startDate, t.endDate);
      if (status === "Completed") {
        past.push(t);
      } else {
        // Include planning, in progress, and upcoming
        upcoming.push(t);
      }
    });
    
    // Sort upcoming by start date (soonest first)
    upcoming.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    // Sort past by end date (most recent first)
    past.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    
    return { allUpcomingTrips: upcoming, pastTrips: past };
  }, [trips]);

  const onResume = (trip: Trip) => nav.navigate("TripDetail", { tripId: trip.id });
  const onMenu = (trip: Trip) => setMenuTrip(trip);

  /**
   * Handle create trip with proper gating (2026-01-24 fix)
   * 
   * Rules:
   * - First trip EVER (tripsCreatedCount === 0): requiresAccount=true, requiresPro=false
   *   → GUEST sees AccountRequiredModal, FREE/PRO can create
   * - Second+ trip EVER (tripsCreatedCount >= 1): requiresPro=true
   *   → GUEST or FREE sees PaywallModal, PRO can create
   * 
   * NOTE: Uses tripsCreatedCount from Firestore, NOT trips.length
   * This prevents users from deleting trips to bypass the paywall
   */
  const handleCreateTrip = async () => {
    // Check account first for all users
    const hasAccount = requireAccount({
      openAccountModal: () => setShowAccountModal(true),
    });
    if (!hasAccount) return;

    // Get total trips ever created from Firestore
    const tripsCreatedCount = currentUser ? await getTripsCreatedCount(currentUser.id) : 0;
    
    if (tripsCreatedCount >= 1) {
      // User has already used their free trip - requires Pro
      const canProceed = requirePro({
        openAccountModal: () => setShowAccountModal(true),
        openPaywallModal: (variant) => nav.navigate("Paywall", { triggerKey: "second_trip", variant }),
      });
      if (!canProceed) return;
    }
    
    setShowCreate(true);
  };

  const handleGuestLogin = () => {
    nav.navigate("Auth");
  };

  // Show empty state if there are no trips at all
  const showEmptyState = allUpcomingTrips.length === 0 && pastTrips.length === 0;

  const bottomSpacer = 50 + Math.max(insets.bottom, 18) + 12;

  // Safe haptic helper
  const safeHaptic = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  };

  // Navigate to packing list for a specific trip
  const handlePackingPress = (tripId: string) => {
    // Gate: Pro-only feature
    const canProceed = requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => nav.navigate("Paywall", { triggerKey: "packing_list", variant }),
    });
    if (!canProceed) return;

    safeHaptic();
    
    // Check if there's a local packing list for this trip
    const localLists = usePackingStore.getState().packingLists.filter(list => list.tripId === tripId);
    if (localLists.length > 0) {
      // Navigate to local packing list editor
      nav.navigate("PackingListEditor", { listId: localLists[0].id });
      return;
    }
    
    // Find the trip to get its data for season detection
    const trip = allUpcomingTrips.find(t => t.id === tripId) || pastTrips.find(t => t.id === tripId);
    
    // No local list yet - navigate to create one with trip context
    nav.navigate("PackingListCreate", { 
      tripId,
      tripName: trip?.name,
      tripStartDate: trip?.startDate,
      tripEndDate: trip?.endDate,
      tripCampingStyle: trip?.campingStyle,
      tripWinterCamping: trip?.winterCamping,
      tripPackingSeasonOverride: trip?.packingSeasonOverride,
    });
  };

  // Navigate to meals for a specific trip
  const handleMealsPress = (tripId: string) => {
    // Gate: Pro-only feature
    const canProceed = requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => nav.navigate("Paywall", { triggerKey: "meal_planner", variant }),
    });
    if (!canProceed) return;

    safeHaptic();
    nav.navigate("MealPlanning", { tripId });
  };

  // Navigate to standalone packing (drafts mode)
  const handleQuickPacking = () => {
    // Gate: Pro-only feature
    const canProceed = requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => nav.navigate("Paywall", { triggerKey: "packing_list", variant }),
    });
    if (!canProceed) return;

    safeHaptic();
    nav.navigate("PackingListCreate");
  };

  // Navigate to standalone meals (meal planner without trip context)
  const handleQuickMeals = () => {
    // Gate: Pro-only feature
    const canProceed = requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => nav.navigate("Paywall", { triggerKey: "meal_planner", variant }),
    });
    if (!canProceed) return;

    safeHaptic();
    // Navigate to meal planning - if user has an upcoming trip, use the first one
    // Otherwise, prompt them to create a trip first
    if (allUpcomingTrips.length > 0) {
      nav.navigate("MealPlanning", { tripId: allUpcomingTrips[0].id });
    } else {
      // No upcoming trip - prompt to create one
      handleCreateTrip();
    }
  };

  // Empty state - now uses consistent layout with header, button, and panel
  if (showEmptyState) {
    return (
      <View className="flex-1 bg-parchment">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomSpacer }}
          showsVerticalScrollIndicator={false}
        >
          {/* Full-width New Trip Button */}
          <View className="px-4 py-3">
            <Pressable
              onPress={isGuest ? handleGuestLogin : handleCreateTrip}
              className="w-full py-3.5 rounded-xl items-center justify-center active:opacity-90"
              style={{ backgroundColor: DEEP_FOREST }}
            >
              <Text
                className="text-base"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
              >
                {isGuest ? "Log In to Start" : "+ New Trip"}
              </Text>
            </Pressable>
          </View>

          {/* Empty State Panel */}
          <View
            className="flex-1 mx-4 rounded-xl items-center justify-center"
            style={{ backgroundColor: CARD_BACKGROUND_LIGHT, minHeight: 200 }}
          >
            <View className="w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: DEEP_FOREST + "15" }}>
              <Ionicons name="compass" size={32} color={DEEP_FOREST} />
            </View>
            <Text
              className="text-lg text-center mb-2 px-6"
              style={{ fontFamily: "Raleway_600SemiBold", color: DEEP_FOREST }}
            >
              {isGuest ? "Log in to start planning" : "No trips yet"}
            </Text>
            <Text
              className="text-sm text-center px-8"
              style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
            >
              {isGuest 
                ? "Create an account to plan trips, save parks, and organize your camping adventures." 
                : "Your sleeping bag is giving you side-eye."
              }
            </Text>
          </View>
        </ScrollView>

        {/* Modals */}
        <CreateTripModal
          visible={showCreate}
          onClose={() => setShowCreate(false)}
          onTripCreated={(tripId) => {
            if (isFree) setHasUsedFreeTrip(true);
            setShowCreate(false);
          }}
        />
        <AccountRequiredModal
          visible={showAccountModal}
          triggerKey="create_first_trip"
          onCreateAccount={() => {
            setShowAccountModal(false);
            nav.navigate("Auth");
          }}
          onMaybeLater={() => setShowAccountModal(false)}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-parchment">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: bottomSpacer }}
        showsVerticalScrollIndicator={false}
      >
        {/* Full-width New Trip Button */}
        <View className="px-4 py-3">
          <Pressable
            onPress={handleCreateTrip}
            className="flex-1 py-3.5 rounded-xl items-center justify-center active:opacity-90"
            style={{ backgroundColor: DEEP_FOREST }}
          >
            <Text
              className="text-base"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
            >
              + New trip
            </Text>
          </Pressable>
        </View>

        {/* Trips List Container with panel background */}
        <View
          className="flex-1 mx-4 rounded-xl overflow-hidden"
          style={{ backgroundColor: CARD_BACKGROUND_LIGHT, minHeight: 100 }}
        >
          {/* Upcoming Trips Section (includes active/in-progress and upcoming) */}
          {allUpcomingTrips.length > 0 && (
            <View>
              {/* Section Header */}
              <View
                style={{
                  backgroundColor: DEEP_FOREST,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Raleway_700Bold",
                    fontSize: 18,
                    color: PARCHMENT,
                  }}
                >
                  Your Trips
                </Text>
              </View>

              {/* Trip Cards */}
              <View className="p-4">
            
            {allUpcomingTrips.map((trip) => (
              <View
                key={trip.id}
                className="rounded-xl p-3 mb-2"
                style={{ backgroundColor: "#59625C" }}
              >
                <View className="flex-row items-start justify-between">
                  <Pressable 
                    onPress={() => onResume(trip)} 
                    className="flex-1 mr-2 active:opacity-70"
                  >
                    <Text
                      className="text-base"
                      style={{ fontFamily: "Raleway_700Bold", color: PARCHMENT }}
                      numberOfLines={1}
                    >
                      {trip.name}
                    </Text>
                    <Text
                      className="text-xs mt-0.5"
                      style={{ fontFamily: "SourceSans3_400Regular", color: "rgba(255,255,255,0.7)" }}
                      numberOfLines={1}
                    >
                      {formatDateRange(trip.startDate, trip.endDate)}
                      {trip.destination?.name ? ` • ${trip.destination.name}` : ""}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onMenu(trip)}
                    className="p-1.5 rounded-full active:opacity-80"
                    style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                  >
                    <Ionicons name="ellipsis-horizontal" size={16} color={PARCHMENT} />
                  </Pressable>
                </View>

                {/* View Trip Details CTA */}
                <Pressable
                  onPress={() => onResume(trip)}
                  className="mt-2 py-2 active:opacity-70"
                  accessibilityLabel="View trip details"
                >
                  <Text
                    style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: PARCHMENT }}
                  >
                    View trip details »
                  </Text>
                  <Text
                    className="mt-0.5"
                    style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: "rgba(255,255,255,0.6)" }}
                  >
                    Add destinations, itinerary links, and confirmations.
                  </Text>
                </Pressable>

                {/* Compact Packing & Meals Buttons */}
                <View className="flex-row mt-3" style={{ gap: 8 }}>
                  <Pressable
                    onPress={() => handlePackingPress(trip.id)}
                    className="flex-1 flex-row items-center justify-center py-2 rounded-lg active:opacity-90"
                    style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
                  >
                    <Ionicons name="bag" size={16} color={PARCHMENT} />
                    <Text
                      className="text-xs ml-1.5"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                    >
                      Packing
                    </Text>
                    {trip.packing && (
                      <Text
                        className="text-xs ml-1"
                        style={{ fontFamily: "SourceSans3_400Regular", color: "rgba(255,255,255,0.6)" }}
                      >
                        ({trip.packing.itemsChecked}/{trip.packing.totalItems})
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => handleMealsPress(trip.id)}
                    className="flex-1 flex-row items-center justify-center py-2 rounded-lg active:opacity-90"
                    style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
                  >
                    <Ionicons name="restaurant" size={16} color={PARCHMENT} />
                    <Text
                      className="text-xs ml-1.5"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                    >
                      Meals
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
              </View>
          </View>
          )}

          {/* Empty trips message when no upcoming trips but panel is shown */}
          {allUpcomingTrips.length === 0 && pastTrips.length === 0 && (
            <View className="p-6 items-center">
              <Text
                className="text-base text-center"
                style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
              >
                No trips yet. Tap the button above to start planning!
              </Text>
            </View>
          )}

          {/* Past Trips Section */}
          {pastTrips.length > 0 && (
            <View className="p-4 pt-2">
              <Text
                className="text-xs mb-3"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: EARTH_GREEN, letterSpacing: 0.5 }}
              >
                PAST
              </Text>
              {pastTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onResume={() => onResume(trip)}
                  onMenu={() => onMenu(trip)}
                  onPackingPress={() => handlePackingPress(trip.id)}
                  onWeatherPress={() => onResume(trip)}
                  onMealsPress={() => handleMealsPress(trip.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <CreateTripModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onTripCreated={(tripId) => {
          if (isFree) setHasUsedFreeTrip(true);
          setShowCreate(false);
        }}
      />

      {/* Account Required Modal */}
      <AccountRequiredModal
        visible={showAccountModal}
        triggerKey="create_first_trip"
        onCreateAccount={() => {
          setShowAccountModal(false);
          nav.navigate("Auth");
        }}
        onMaybeLater={() => setShowAccountModal(false)}
      />

      {/* Menu Modal */}
      <Modal
        visible={!!menuTrip}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuTrip(null)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setMenuTrip(null)}
          >
            <Pressable
              className="bg-parchment rounded-t-2xl p-6"
              onPress={(e) => e.stopPropagation()}
            >
              <Text className="text-xl font-bold mb-4" style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}>
                {menuTrip?.name}
              </Text>
              <Pressable
                onPress={() => {
                  setPendingDelete(menuTrip);
                  setMenuTrip(null);
                }}
                className="py-3 active:opacity-70"
              >
                <Text className="text-base text-red-600" style={{ fontFamily: "SourceSans3_400Regular" }}>Delete trip</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        <ConfirmationModal
          visible={!!pendingDelete}
          title="Delete trip?"
          message={`Are you sure you want to delete "${pendingDelete?.name}"? This cannot be undone.`}
          primary={{
            label: "Delete",
            onPress: () => {
              if (pendingDelete) deleteTrip(pendingDelete.id);
              setPendingDelete(null);
            },
          }}
          secondary={{
            label: "Cancel",
            onPress: () => setPendingDelete(null),
          }}
          onClose={() => setPendingDelete(null)}
        />
    </View>
  );
}
