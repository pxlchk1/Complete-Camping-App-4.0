import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform, Modal, Pressable } from "react-native";
import { useToast } from "../components/ToastManager";
import { notifyError, notifyValidationError } from "../ui/notify";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTripsStore } from "../state/tripsStore";
import { Heading2, BodyText } from "../components/Typography";
import Button from "../components/Button";
import AccountButton from "../components/AccountButton";
import { RootStackParamList, PrefillLocation } from "../navigation/types";
import { CampingStyle, TripDestination } from "../types/camping";
import { requireAccount } from "../utils/gating";
import { isPremiumUser, setFreePremiumTripId, getFreePremiumTripId } from "../utils/entitlements";
import AccountRequiredModal from "../components/AccountRequiredModal";
import { DEEP_FOREST, EARTH_GREEN, GRANITE_GOLD, RIVER_ROCK, SIERRA_SKY, PARCHMENT, PARCHMENT_BORDER } from "../constants/colors";
import { trackTripCreated } from "../services/analyticsService";
import { trackCoreAction } from "../services/userActionTrackerService";
import { useAuthStore } from "../state/authStore";

type CreateTripScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "CreateTrip"
>;

type CreateTripScreenRouteProp = RouteProp<RootStackParamList, "CreateTrip">;

const CAMPING_STYLES: { value: CampingStyle; label: string }[] = [
  { value: "CAR_CAMPING", label: "Car camping" },
  { value: "BACKPACKING", label: "Backpacking" },
  { value: "RV", label: "RV camping" },
  { value: "HAMMOCK", label: "Hammock camping" },
  { value: "ROOFTOP_TENT", label: "Roof-top tent camping" },
  { value: "OVERLANDING", label: "Overlanding" },
  { value: "BOAT_CANOE", label: "Boat or canoe camping" },
  { value: "BIKEPACKING", label: "Bikepacking" },
  { value: "WINTER", label: "Winter camping" },
  { value: "DISPERSED", label: "Dispersed camping" },
];

export default function CreateTripScreen() {
  const navigation = useNavigation<CreateTripScreenNavigationProp>();
  const route = useRoute<CreateTripScreenRouteProp>();
  const addTrip = useTripsStore((s) => s.addTrip);
  const currentUser = useAuthStore((s) => s.user);

  // Get prefill location from navigation params
  const prefillLocation = route.params?.prefillLocation;

  const [tripName, setTripName] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000 * 2)); // 2 days later
  const [showStartDateModal, setShowStartDateModal] = useState(false);
  const [showEndDateModal, setShowEndDateModal] = useState(false);
  const [campingStyle, setCampingStyle] = useState<CampingStyle | undefined>();
  const [partySize, setPartySize] = useState("");

  // Destination state from prefill
  const [destination, setDestination] = useState<PrefillLocation | null>(prefillLocation || null);

  // Gating modal state
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Loading state for create button
  const [isCreating, setIsCreating] = useState(false);

  // Validation error state
  const [errors, setErrors] = useState<{ tripName?: string }>({});

  // Toast
  const toast = useToast();

  // Pre-populate trip name from destination if available
  useEffect(() => {
    if (prefillLocation && !tripName) {
      // Suggest a trip name based on destination
      setTripName(`Trip to ${prefillLocation.name}`);
    }
  }, [prefillLocation]);

  // Gate: Redirect free users who already have a trip
  useEffect(() => {
    const checkEntitlement = async () => {
      if (!isPremiumUser() && currentUser?.id) {
        const existingTripId = await getFreePremiumTripId(currentUser.id);
        if (existingTripId) {
          // Free user already has a trip - redirect to paywall
          navigation.replace("Paywall", { triggerKey: "second_trip" });
        }
      }
    };
    checkEntitlement();
  }, [currentUser?.id, navigation]);

  const handleClearDestination = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDestination(null);
  };

  const handleCreate = async () => {
    // Clear previous errors
    setErrors({});

    // Validate required fields
    if (!tripName.trim()) {
      setErrors({ tripName: "Trip name is required" });
      notifyValidationError(toast);
      return;
    }

    // Prevent double-tap
    if (isCreating) {
      return;
    }

    // Gate: Account required
    if (!requireAccount({
      openAccountModal: () => setShowAccountModal(true),
    })) {
      return;
    }

    // Gate: Free users can only create one trip
    if (!isPremiumUser() && currentUser?.id) {
      const freeTripId = await getFreePremiumTripId(currentUser.id);
      if (freeTripId) {
        // Free user already has a trip - show paywall
        navigation.navigate("Paywall", { triggerKey: "second_trip" });
        return;
      }
    }

    setIsCreating(true);

    try {
      // Build trip destination from prefill location if set
      const tripDestination: TripDestination | undefined = destination ? {
        sourceType: destination.placeType === "park" ? "parks" : "custom",
        placeId: destination.placeId,
        name: destination.name,
        addressLine1: destination.address,
        city: null, // Could be parsed from address if needed
        state: destination.state,
        lat: destination.lat,
        lng: destination.lng,
        formattedAddress: destination.address,
        parkType: destination.placeType === "park" ? "State Park" : null,
      } : undefined;

      const tripId = await addTrip({
        name: tripName.trim(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        campingStyle,
        partySize: partySize ? parseInt(partySize) : undefined,
        tripDestination,
        parkId: destination?.placeType === "park" && destination?.placeId ? destination.placeId : undefined,
      });

      // Set free premium trip ID for free users creating their first trip (guard against double-set)
      if (!isPremiumUser() && currentUser?.id) {
        const existingId = await getFreePremiumTripId(currentUser.id);
        if (!existingId) {
          await setFreePremiumTripId(currentUser.id, tripId);
        }
      }

      // Track analytics and core action
      trackTripCreated(tripId);
      if (currentUser?.id) {
        trackCoreAction(currentUser.id, "trip_created");
      }

      // Navigate to trip detail
      navigation.replace("TripDetail", { tripId });
    } catch (error) {
      console.error("[CreateTripScreen] Failed to create trip:", error);
      notifyError(toast, "Failed to create trip. Please try again.");
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: PARCHMENT }} edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3" style={{ borderBottomWidth: 1, borderBottomColor: PARCHMENT_BORDER }}>
          <View className="flex-row items-center justify-between">
            <Heading2>Plan New Trip</Heading2>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => navigation.goBack()}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: "#f0f9f4" }}
              >
                <Text style={{ fontFamily: "SourceSans3_400Regular", color: DEEP_FOREST, fontSize: 18 }}>✕</Text>
              </Pressable>
              <AccountButton />
            </View>
          </View>
        </View>

        <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Destination Chip - shown when prefilled from Favorites/Saved Places */}
          {destination && (
            <View className="mb-6">
              <Text className="mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST, fontSize: 16 }}>Destination</Text>
              <View 
                className="flex-row items-center justify-between p-4 rounded-xl border"
                style={{ backgroundColor: "#f0f9f4", borderColor: EARTH_GREEN }}
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons 
                    name={destination.placeType === "park" ? "leaf" : "location"} 
                    size={20} 
                    color={EARTH_GREEN} 
                  />
                  <View className="ml-3 flex-1">
                    <Text 
                      className="text-base"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                      numberOfLines={1}
                    >
                      {destination.name}
                    </Text>
                    {destination.subtitle && (
                      <Text 
                        className="text-sm"
                        style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                        numberOfLines={1}
                      >
                        {destination.subtitle}
                      </Text>
                    )}
                  </View>
                </View>
                <Pressable
                  onPress={handleClearDestination}
                  className="w-8 h-8 rounded-full items-center justify-center active:opacity-70"
                  style={{ backgroundColor: "rgba(0,0,0,0.1)" }}
                  accessibilityLabel="Clear destination"
                >
                  <Ionicons name="close" size={18} color={DEEP_FOREST} />
                </Pressable>
              </View>
            </View>
          )}

          {/* Trip Name */}
          <View className="mb-6">
            <Text className="mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST, fontSize: 16 }}>Trip Name</Text>
            <TextInput
              value={tripName}
              onChangeText={(text) => {
                setTripName(text);
                if (errors.tripName) setErrors({});
              }}
              placeholder="e.g., Yosemite Weekend"
              placeholderTextColor="#999"
              className="px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: PARCHMENT,
                borderColor: errors.tripName ? "#dc2626" : "#E6E1D6",
                fontFamily: "SourceSans3_400Regular",
                color: DEEP_FOREST,
                fontSize: 16,
              }}
            />
            {errors.tripName && (
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: "#dc2626", marginTop: 4 }}>
                {errors.tripName}
              </Text>
            )}
          </View>

          {/* Dates */}
          <View className="mb-6">
            <Text className="mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST, fontSize: 16 }}>Start Date</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowStartDateModal(true);
              }}
              className="px-4 py-3 rounded-xl border"
              style={{ backgroundColor: PARCHMENT, borderColor: PARCHMENT_BORDER }}
            >
              <Text style={{ fontFamily: "SourceSans3_400Regular", color: DEEP_FOREST, fontSize: 16 }}>
                {startDate.toLocaleDateString()}
              </Text>
            </Pressable>
          </View>

          <View className="mb-6">
            <Text className="mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST, fontSize: 16 }}>End Date</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowEndDateModal(true);
              }}
              className="px-4 py-3 rounded-xl border"
              style={{ backgroundColor: PARCHMENT, borderColor: PARCHMENT_BORDER }}
            >
              <Text style={{ fontFamily: "SourceSans3_400Regular", color: DEEP_FOREST, fontSize: 16 }}>
                {endDate.toLocaleDateString()}
              </Text>
            </Pressable>
          </View>

          {/* Camping Style */}
          <View className="mb-6">
            <Text className="mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST, fontSize: 16 }}>Camping Style</Text>
            <View className="flex-row flex-wrap gap-2">
              {CAMPING_STYLES.map((cs) => (
                <Pressable
                  key={cs.value}
                  onPress={() => setCampingStyle(cs.value)}
                  className="px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: campingStyle === cs.value ? "#485952" : "#f0f9f4",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_500Medium",
                      fontSize: 14,
                      color: campingStyle === cs.value ? PARCHMENT : "#485952",
                    }}
                  >
                    {cs.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Party Size */}
          <View className="mb-6">
            <Text className="mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST, fontSize: 16 }}>Party Size</Text>
            <TextInput
              value={partySize}
              onChangeText={setPartySize}
              placeholder="Number of people"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              className="px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: PARCHMENT,
                borderColor: PARCHMENT_BORDER,
                fontFamily: "SourceSans3_400Regular",
                color: DEEP_FOREST,
                fontSize: 16,
              }}
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View className="px-5 pb-5 pt-3" style={{ borderTopWidth: 1, borderTopColor: PARCHMENT_BORDER }}>
          <Button onPress={handleCreate} fullWidth icon="checkmark-circle" loading={isCreating} disabled={isCreating}>
            Create Trip
          </Button>
        </View>
      </KeyboardAvoidingView>

      {/* Start Date Modal */}
      <Modal
        visible={showStartDateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStartDateModal(false)}
      >
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={() => setShowStartDateModal(false)}
        >
          <Pressable
            className="rounded-t-2xl p-4"
            style={{ backgroundColor: PARCHMENT }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST, fontSize: 20 }}>
                Select Start Date
              </Text>
              <Pressable
                onPress={() => setShowStartDateModal(false)}
                className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
                style={{ backgroundColor: "#f0f9f4" }}
              >
                <Ionicons name="close" size={24} color={DEEP_FOREST} />
              </Pressable>
            </View>
            <DateTimePicker
              value={startDate}
              mode="date"
              display="inline"
              onChange={(event, date) => {
                if (date) {
                  setStartDate(date);
                  setShowStartDateModal(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              themeVariant="light"
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* End Date Modal */}
      <Modal
        visible={showEndDateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEndDateModal(false)}
      >
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={() => setShowEndDateModal(false)}
        >
          <Pressable
            className="rounded-t-2xl p-4"
            style={{ backgroundColor: PARCHMENT }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST, fontSize: 20 }}>
                Select End Date
              </Text>
              <Pressable
                onPress={() => setShowEndDateModal(false)}
                className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
                style={{ backgroundColor: "#f0f9f4" }}
              >
                <Ionicons name="close" size={24} color={DEEP_FOREST} />
              </Pressable>
            </View>
            <DateTimePicker
              value={endDate}
              mode="date"
              display="inline"
              onChange={(event, date) => {
                if (date) {
                  setEndDate(date);
                  setShowEndDateModal(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              themeVariant="light"
              minimumDate={startDate}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Gating Modals */}
      <AccountRequiredModal
        visible={showAccountModal}
        onCreateAccount={() => {
          setShowAccountModal(false);
          navigation.navigate("Auth" as any);
        }}
        onMaybeLater={() => setShowAccountModal(false)}
      />
    </SafeAreaView>
  );
}
