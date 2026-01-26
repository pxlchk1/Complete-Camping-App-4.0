import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TextInput,
  Keyboard,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useLocationStore } from "../state/locationStore";
import { usePlanTabStore } from "../state/planTabStore";
import { requirePro } from "../utils/gating";
import AccountRequiredModal from "../components/AccountRequiredModal";
import { RootStackParamList } from "../navigation/types";
import { useTrips, useTripsStore } from "../state/tripsStore";
import { fetchWeather, WeatherData } from "../api/weather-service";
import { WeatherDestination } from "../types/camping";
import { colors, spacing, radius, fonts, fontSizes } from "../theme/theme";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_SECONDARY,
  PARCHMENT,
} from "../constants/colors";

interface WeatherScreenProps {
  onTabChange?: (tab: "trips" | "parks" | "weather") => void;
}

type LocationLike = {
  name: string;
  latitude: number;
  longitude: number;
  state?: string;
};

type TripLike = {
  id: string;
  name: string;
  startDate: string | number | Date;
  endDate: string | number | Date;
  locationName?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
};

const hasState = (loc: LocationLike): loc is LocationLike & { state: string } =>
  typeof loc.state === "string" && loc.state.trim().length > 0;

const getWeatherIcon = (condition: string): keyof typeof Ionicons.glyphMap => {
  const lower = (condition || "").toLowerCase();
  if (lower.includes("rain")) return "rainy";
  if (lower.includes("cloud")) return "cloudy";
  if (lower.includes("sun") || lower.includes("clear")) return "sunny";
  if (lower.includes("snow")) return "snow";
  if (lower.includes("thunder")) return "thunderstorm";
  if (lower.includes("wind")) return "cloudy";
  return "partly-sunny";
};

const formatTripRange = (startDate: string | number | Date, endDate: string | number | Date) => {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = new Date(startDate).toLocaleDateString("en-US", opts);
  const end = new Date(endDate).toLocaleDateString("en-US", opts);
  return `${start} - ${end}`;
};

type WeatherScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function WeatherScreen({ onTabChange }: WeatherScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<WeatherScreenNavigationProp>();

  const { selectedLocation, userLocation, setUserLocation, setSelectedLocation } = useLocationStore();
  const weatherPickerTripId = usePlanTabStore((s) => s.weatherPickerTripId);
  const setWeatherPickerTripId = usePlanTabStore((s) => s.setWeatherPickerTripId);
  const setActivePlanTab = usePlanTabStore((s) => s.setActiveTab);
  const tripsRaw = useTrips() as unknown as TripLike[];
  const trips = tripsRaw || [];

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddToTripModal, setShowAddToTripModal] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationPermission, setLocationPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const { updateTrip } = useTripsStore();

  // Prevent out-of-order weather responses from overwriting newer results.
  const requestIdRef = useRef(0);

  // On unmount, bump the request id so any in-flight work becomes stale immediately.
  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[PLAN_TRACE] WeatherScreen mounted");
    }
  }, []);

  // Helper: Get trip status (same logic as MyTripsScreen)
  const getStatus = (startISO: string | number | Date, endISO: string | number | Date): "In Progress" | "Upcoming" | "Completed" => {
    const today = new Date();
    const start = new Date(startISO);
    const end = new Date(endISO);
    if (today > end) return "Completed";
    if (today < start) return "Upcoming";
    return "In Progress";
  };

  // Helper: Check if trip has valid location (new tripDestination or legacy coordinates)
  const tripHasLocation = (trip: TripLike): boolean => {
    // Check new tripDestination first
    if ((trip as any).tripDestination?.lat && (trip as any).tripDestination?.lng) {
      return true;
    }
    // Fall back to legacy coordinates
    return !!(trip.coordinates?.latitude && trip.coordinates?.longitude);
  };

  // Helper: Get location from trip (new tripDestination or legacy coordinates)
  const getTripLocation = (trip: TripLike): { name: string; latitude: number; longitude: number } | null => {
    // Check new tripDestination first
    const tripDest = (trip as any).tripDestination;
    if (tripDest?.lat && tripDest?.lng) {
      return {
        name: tripDest.name || trip.locationName || trip.name,
        latitude: tripDest.lat,
        longitude: tripDest.lng,
      };
    }
    // Fall back to legacy coordinates
    if (trip.coordinates?.latitude && trip.coordinates?.longitude) {
      return {
        name: trip.locationName || trip.name,
        latitude: trip.coordinates.latitude,
        longitude: trip.coordinates.longitude,
      };
    }
    return null;
  };

  // Find trip in progress (highest priority for weather)
  const tripInProgress = useMemo(() => {
    return trips.find((trip) => {
      const status = getStatus(trip.startDate, trip.endDate);
      return status === "In Progress" && tripHasLocation(trip);
    });
  }, [trips]);

  // Filter upcoming trips with location (secondary priority)
  const upcomingTripsWithLocation = useMemo(() => {
    const now = new Date();
    return trips.filter((trip) => {
      const startDate = new Date(trip.startDate);
      const hasLocation = tripHasLocation(trip);
      // Upcoming: not started yet, not the in-progress trip
      return hasLocation && startDate > now && (!tripInProgress || trip.id !== tripInProgress.id);
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [trips, tripInProgress]);

  const location: LocationLike | null = useMemo(() => {
    // PRIORITY 1: Trip in progress - always show weather for current trip destination
    if (tripInProgress) {
      const tripLoc = getTripLocation(tripInProgress);
      if (tripLoc) return tripLoc;
    }

    // PRIORITY 2: Soonest upcoming trip with location
    if (upcomingTripsWithLocation.length > 0) {
      const soonestTrip = upcomingTripsWithLocation[0];
      const tripLoc = getTripLocation(soonestTrip);
      if (tripLoc) return tripLoc;
    }

    // PRIORITY 3: User-selected location (from search or park selection)
    if (selectedLocation) return selectedLocation as unknown as LocationLike;

    // PRIORITY 4: User's current device location
    if (userLocation) {
      return {
        name: "Your Location",
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      };
    }

    return null;
  }, [tripInProgress, upcomingTripsWithLocation, selectedLocation, userLocation]);

  const fetchWeatherData = useCallback(async (lat: number, lon: number) => {
    const currentRequestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchWeather(lat, lon);

      // Ignore stale responses
      if (currentRequestId !== requestIdRef.current) return;

      setWeatherData(data);
    } catch (err: unknown) {
      if (currentRequestId !== requestIdRef.current) return;

      // eslint-disable-next-line no-console
      console.error("Error fetching weather:", err);
      setError("Failed to load weather data. Please try again.");
      setWeatherData(null);
    } finally {
      if (currentRequestId !== requestIdRef.current) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!location) return;
    fetchWeatherData(location.latitude, location.longitude);
  }, [fetchWeatherData, location?.latitude, location?.longitude]);

  const handleUseMyLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationPermission("denied");
        setError("Location permission denied. Please enable location in your device settings.");
        return;
      }

      setLocationPermission("granted");

      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get city/state
      let locationName = "Your Location";
      try {
        const reverseResults = await Location.reverseGeocodeAsync({
          latitude: locationResult.coords.latitude,
          longitude: locationResult.coords.longitude,
        });
        if (reverseResults.length > 0) {
          const place = reverseResults[0];
          const city = place.city || place.subregion || place.district || "";
          const state = place.region || "";
          if (city && state) {
            locationName = `${city}, ${state}`;
          } else if (city) {
            locationName = city;
          } else if (state) {
            locationName = state;
          }
        }
      } catch (geocodeErr) {
        // eslint-disable-next-line no-console
        console.warn("Reverse geocode failed, using default name:", geocodeErr);
      }

      setSelectedLocation({
        name: locationName,
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
      } as unknown as any);

      // Clear userLocation since we're now using selectedLocation with proper name
      setUserLocation(null as any);
      setShowLocationPicker(false);

      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("User location obtained:", locationResult.coords, "Name:", locationName);
      }
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("Error getting location:", err);
      setError("Failed to get your location. Please try again.");
    } finally {
      setIsLoadingLocation(false);
    }
  }, [setUserLocation]);

  const handleSearchLocation = useCallback(async () => {
    const query = searchQuery.trim();

    if (!query) {
      setError("Please enter a city and state");
      return;
    }

    Keyboard.dismiss();
    setIsSearchingLocation(true);
    setError(null);

    try {
      const results = await Location.geocodeAsync(query);

      if (!results.length) {
        setError("Location not found. Please try a different search.");
        return;
      }

      const result = results[0];

      setSelectedLocation({
        name: query,
        latitude: result.latitude,
        longitude: result.longitude,
      } as unknown as any);

      setSearchQuery("");
      setShowLocationPicker(false);

      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("Location found:", result);
      }
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("Error searching location:", err);
      setError("Failed to find location. Please try again.");
    } finally {
      setIsSearchingLocation(false);
    }
  }, [searchQuery, setSelectedLocation]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F4EBD0" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Location Display - Inline row */}
        {location && !showLocationPicker && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: spacing.md,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodyRegular,
                fontSize: fontSizes.md,
                color: DEEP_FOREST,
              }}
            >
              {location.name}
            </Text>
            <Pressable
              onPress={() => setShowLocationPicker(true)}
              style={{
                marginLeft: spacing.sm,
                paddingVertical: 2,
                paddingHorizontal: spacing.xs,
              }}
              accessibilityRole="button"
              accessibilityLabel="Change location"
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: fontSizes.sm,
                  color: DEEP_FOREST,
                }}
              >
                Change
              </Text>
            </Pressable>
          </View>
        )}

        {/* No Location - Inline empty state */}
        {!location && !showLocationPicker && !isLoading && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: spacing.md,
            }}
          >
            <Ionicons name="location-outline" size={18} color={TEXT_SECONDARY} />
            <Text
              style={{
                fontFamily: fonts.bodyRegular,
                fontSize: fontSizes.md,
                color: TEXT_SECONDARY,
                marginLeft: spacing.xs,
              }}
            >
              {locationPermission === "denied" ? "Location unavailable" : "Location off"}
            </Text>
            <Pressable
              onPress={handleUseMyLocation}
              disabled={isLoadingLocation}
              style={{
                marginLeft: spacing.sm,
                paddingVertical: 4,
                paddingHorizontal: 10,
                borderRadius: radius.sm,
                borderWidth: 1,
                borderColor: BORDER_SOFT,
                backgroundColor: CARD_BACKGROUND_LIGHT,
              }}
              accessibilityRole="button"
              accessibilityLabel={locationPermission === "denied" ? "Try again" : "Enable location"}
            >
              {isLoadingLocation ? (
                <ActivityIndicator size="small" color={DEEP_FOREST} />
              ) : (
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: fontSizes.sm,
                    color: DEEP_FOREST,
                  }}
                >
                  {locationPermission === "denied" ? "Try again" : "Enable"}
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {/* No Location State / Location Picker */}
        {((!location && !isLoading) || showLocationPicker) && (
          <View
            style={{
              backgroundColor: CARD_BACKGROUND_LIGHT,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: BORDER_SOFT,
              padding: spacing.xl,
              alignItems: "center",
            }}
          >
            {/* Cancel button when changing location */}
            {showLocationPicker && location && (
              <Pressable
                onPress={() => {
                  setShowLocationPicker(false);
                  setSearchQuery("");
                }}
                style={{
                  alignSelf: "flex-end",
                  marginBottom: spacing.sm,
                }}
                accessibilityRole="button"
                accessibilityLabel="Cancel location change"
              >
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: fontSizes.sm,
                    color: DEEP_FOREST,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
            )}
            
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: `${DEEP_FOREST}15`,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: spacing.sm,
              }}
            >
              <Ionicons name="location-outline" size={30} color={DEEP_FOREST} />
            </View>

            <Text
              style={{
                fontFamily: fonts.displayRegular,
                fontSize: fontSizes.md,
                color: DEEP_FOREST,
                marginBottom: spacing.xs,
              }}
            >
              No location selected
            </Text>

            <Text
              style={{
                fontFamily: fonts.bodyRegular,
                fontSize: fontSizes.sm,
                color: EARTH_GREEN,
                textAlign: "center",
                marginBottom: spacing.md,
              }}
            >
              Select a park, search for a city, or use your location to see weather forecasts.
            </Text>

            {/* City/State Search */}
            <View style={{ width: "100%", marginBottom: spacing.md }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.parchment,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                  paddingHorizontal: spacing.sm,
                }}
              >
                <Ionicons name="search" size={18} color={EARTH_GREEN} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="City, State (e.g., San Francisco, CA)"
                  placeholderTextColor={EARTH_GREEN}
                  style={{
                    flex: 1,
                    fontFamily: fonts.bodyRegular,
                    fontSize: fontSizes.sm,
                    color: DEEP_FOREST,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.sm,
                  }}
                  returnKeyType="search"
                  onSubmitEditing={handleSearchLocation}
                />
                {searchQuery.length > 0 && (
                  <Pressable
                    onPress={() => setSearchQuery("")}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                  >
                    <Ionicons name="close-circle" size={18} color={EARTH_GREEN} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Stacked Buttons */}
            <View style={{ width: "100%", gap: spacing.sm }}>
              <Pressable
                onPress={handleSearchLocation}
                disabled={isSearchingLocation || !searchQuery.trim()}
                style={{
                  backgroundColor: DEEP_FOREST,
                  borderRadius: radius.md,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.lg,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isSearchingLocation || !searchQuery.trim() ? 0.6 : 1,
                }}
              >
                {isSearchingLocation ? (
                  <ActivityIndicator size="small" color={colors.parchment} />
                ) : (
                  <Ionicons name="search" size={18} color={colors.parchment} style={{ marginRight: spacing.xs }} />
                )}
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: fontSizes.sm,
                    color: colors.parchment,
                    marginLeft: isSearchingLocation ? spacing.xs : 0,
                  }}
                >
                  {isSearchingLocation ? "Searching..." : "Search location"}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleUseMyLocation}
                disabled={isLoadingLocation}
                style={{
                  backgroundColor: colors.parchment,
                  borderRadius: radius.md,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.lg,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                  opacity: isLoadingLocation ? 0.6 : 1,
                }}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color={DEEP_FOREST} />
                ) : (
                  <Ionicons name="navigate" size={18} color={DEEP_FOREST} style={{ marginRight: spacing.xs }} />
                )}
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: fontSizes.sm,
                    color: DEEP_FOREST,
                    marginLeft: isLoadingLocation ? spacing.xs : 0,
                  }}
                >
                  {isLoadingLocation ? "Getting location..." : "Use my location"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActivePlanTab("parks")}
                style={{
                  backgroundColor: colors.parchment,
                  borderRadius: radius.md,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.lg,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: fontSizes.sm,
                    color: DEEP_FOREST,
                  }}
                >
                  Browse parks
                </Text>
              </Pressable>
            </View>

            {/* Trips with Locations */}
            {trips.filter((t) => t.coordinates?.latitude && t.coordinates?.longitude).length > 0 && (
              <View style={{ width: "100%", marginTop: spacing.lg }}>
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: fontSizes.xs,
                    color: EARTH_GREEN,
                    marginBottom: spacing.sm,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Or select from your trips
                </Text>
                {trips
                  .filter((t) => t.coordinates?.latitude && t.coordinates?.longitude)
                  .slice(0, 5)
                  .map((trip) => (
                    <Pressable
                      key={trip.id}
                      onPress={() => {
                        if (trip.coordinates) {
                          setSelectedLocation({
                            name: trip.locationName || trip.name,
                            latitude: trip.coordinates.latitude,
                            longitude: trip.coordinates.longitude,
                          });
                          setShowLocationPicker(false);
                        }
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.sm,
                        borderRadius: radius.sm,
                        marginBottom: spacing.xs,
                        backgroundColor: colors.parchment,
                        borderWidth: 1,
                        borderColor: BORDER_SOFT,
                      }}
                    >
                      <Ionicons name="calendar-outline" size={18} color={DEEP_FOREST} />
                      <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: fonts.bodySemibold,
                            fontSize: fontSizes.sm,
                            color: DEEP_FOREST,
                          }}
                          numberOfLines={1}
                        >
                          {trip.name}
                        </Text>
                        {trip.locationName && (
                          <Text
                            style={{
                              fontFamily: fonts.bodyRegular,
                              fontSize: fontSizes.xs,
                              color: TEXT_SECONDARY,
                            }}
                            numberOfLines={1}
                          >
                            {trip.locationName}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={EARTH_GREEN} />
                    </Pressable>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
            <ActivityIndicator size="large" color={DEEP_FOREST} />
            <Text
              style={{
                fontFamily: fonts.bodyRegular,
                fontSize: fontSizes.sm,
                color: EARTH_GREEN,
                marginTop: spacing.sm,
              }}
            >
              Loading weather...
            </Text>
          </View>
        )}

        {/* Error State */}
        {error && (
          <View
            style={{
              backgroundColor: "#FEE2E2",
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
              borderWidth: 1,
              borderColor: "#FCA5A5",
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodyRegular,
                fontSize: fontSizes.sm,
                color: "#991B1B",
              }}
            >
              {error}
            </Text>
          </View>
        )}

        {/* Current Weather */}
        {weatherData && !isLoading && (
          <>
            <View
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.md,
                alignItems: "center",
                borderWidth: 1,
                borderColor: BORDER_SOFT,
              }}
            >
              {/* Icon and Temperature Row */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Ionicons name={getWeatherIcon(weatherData.current.condition)} size={40} color={DEEP_FOREST} />
                <Text
                  style={{
                    fontFamily: fonts.displayBold,
                    fontSize: 32,
                    color: DEEP_FOREST,
                  }}
                >
                  {Math.round(weatherData.current.temp)}°
                </Text>
              </View>

              <Text
                style={{
                  fontFamily: fonts.displayRegular,
                  fontSize: fontSizes.md,
                  color: TEXT_SECONDARY,
                  marginTop: spacing.xs,
                }}
              >
                {weatherData.current.condition}
              </Text>

              {/* Weather Details */}
              <View
                style={{
                  flexDirection: "row",
                  marginTop: spacing.sm,
                  gap: spacing.lg,
                }}
              >
                <View style={{ alignItems: "center" }}>
                  <Ionicons name="water-outline" size={18} color={TEXT_SECONDARY} />
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: fontSizes.xs,
                      color: DEEP_FOREST,
                      marginTop: spacing.xxs,
                    }}
                  >
                    {weatherData.current.humidity}%
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.bodyRegular,
                      fontSize: fontSizes.xs,
                      color: TEXT_SECONDARY,
                    }}
                  >
                    Humidity
                  </Text>
                </View>

                <View style={{ alignItems: "center" }}>
                  <Ionicons name="speedometer-outline" size={18} color={TEXT_SECONDARY} />
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: fontSizes.xs,
                      color: DEEP_FOREST,
                      marginTop: spacing.xxs,
                    }}
                  >
                    {weatherData.current.windSpeed} mph
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.bodyRegular,
                      fontSize: fontSizes.xs,
                      color: TEXT_SECONDARY,
                    }}
                  >
                    Wind
                  </Text>
                </View>

                <View style={{ alignItems: "center" }}>
                  <Ionicons name="thermometer-outline" size={18} color={TEXT_SECONDARY} />
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: fontSizes.xs,
                      color: DEEP_FOREST,
                      marginTop: spacing.xxs,
                    }}
                  >
                    {Math.round(weatherData.current.feelsLike)}°
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.bodyRegular,
                      fontSize: fontSizes.xs,
                      color: TEXT_SECONDARY,
                    }}
                  >
                    Feels Like
                  </Text>
                </View>
              </View>
            </View>

            {/* Add to Trip Button - or No Trips Message */}
            {location && trips.length > 0 && (
              <Pressable
                onPress={() => setShowAddToTripModal(true)}
                style={{
                  backgroundColor: DEEP_FOREST,
                  borderRadius: 10,
                  paddingVertical: 14,
                  paddingHorizontal: spacing.lg,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: spacing.md,
                }}
              >
                <Ionicons name="add-circle" size={20} color={colors.parchment} style={{ marginRight: spacing.xs }} />
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: 15,
                    color: colors.parchment,
                  }}
                >
                  Add to trip
                </Text>
              </Pressable>
            )}

            {/* No Trips Planned Message */}
            {location && trips.length === 0 && (
              <View
                style={{
                  alignItems: "center",
                  marginBottom: spacing.md,
                  paddingVertical: spacing.sm,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodyRegular,
                    fontSize: fontSizes.sm,
                    color: TEXT_SECONDARY,
                    marginBottom: spacing.xs,
                  }}
                >
                  No trips planned right now.
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.bodyRegular,
                    fontSize: fontSizes.sm,
                    color: TEXT_SECONDARY,
                    marginBottom: spacing.sm,
                  }}
                >
                  Your current outlook is... Campy ⛺
                </Text>
                <Pressable
                  onPress={() => {
                    const canProceed = requirePro({
                      openAccountModal: () => setShowAccountModal(true),
                      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "weather_trip", variant }),
                    });
                    if (canProceed) {
                      setActivePlanTab("trips");
                    }
                  }}
                  style={{
                    backgroundColor: DEEP_FOREST,
                    borderRadius: 10,
                    paddingVertical: 14,
                    paddingHorizontal: spacing.lg,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="compass" size={20} color={colors.parchment} style={{ marginRight: spacing.xs }} />
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 15,
                      color: colors.parchment,
                    }}
                  >
                    Plan a New Trip
                  </Text>
                </Pressable>
              </View>
            )}

            {/* 5-day forecast */}
            <Text
              style={{
                fontFamily: fonts.displaySemibold,
                fontSize: fontSizes.md,
                color: DEEP_FOREST,
                marginBottom: spacing.sm,
              }}
            >
              5-day forecast
            </Text>

            {weatherData.forecast.map((day, index) => (
              <View
                key={`${day.day}-${index}`}
                style={{
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: fonts.displayRegular,
                      fontSize: fontSizes.sm,
                      color: DEEP_FOREST,
                    }}
                  >
                    {day.day}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.bodyRegular,
                      fontSize: fontSizes.xs,
                      color: TEXT_SECONDARY,
                    }}
                  >
                    {day.condition}
                  </Text>
                </View>

                <View style={{ alignItems: "center", marginRight: spacing.md }}>
                  <Ionicons name={getWeatherIcon(day.condition)} size={32} color={DEEP_FOREST} />
                  {day.precipitation > 0 && (
                    <Text
                      style={{
                        fontFamily: fonts.bodyRegular,
                        fontSize: fontSizes.xs,
                        color: TEXT_SECONDARY,
                        marginTop: 2,
                      }}
                    >
                      {day.precipitation}%
                    </Text>
                  )}
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: fontSizes.md,
                      color: DEEP_FOREST,
                    }}
                  >
                    {Math.round(day.high)}°
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.bodyRegular,
                      fontSize: fontSizes.sm,
                      color: TEXT_SECONDARY,
                    }}
                  >
                    {Math.round(day.low)}°
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Add to Trip Modal */}
      <Modal
        visible={showAddToTripModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddToTripModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setShowAddToTripModal(false)}
        >
          <Pressable
            style={{
              backgroundColor: PARCHMENT,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: spacing.lg,
              maxHeight: "70%",
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: spacing.md,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.displayBold,
                  fontSize: fontSizes.lg,
                  color: DEEP_FOREST,
                }}
              >
                Add to Trip
              </Text>

              <Pressable
                onPress={() => setShowAddToTripModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={18} color={DEEP_FOREST} />
              </Pressable>
            </View>

            {/* Location Info */}
            {location && (
              <View
                style={{
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.md,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="location" size={18} color={TEXT_SECONDARY} />
                  <Text
                    style={{
                      fontFamily: fonts.displayRegular,
                      fontSize: fontSizes.sm,
                      color: DEEP_FOREST,
                      marginLeft: spacing.xs,
                    }}
                  >
                    {location.name}
                  </Text>
                </View>
              </View>
            )}

            {/* Trips List */}
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {trips.length === 0 ? (
                <View
                  style={{
                    padding: spacing.xl,
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="calendar-outline" size={48} color={EARTH_GREEN} />
                  <Text
                    style={{
                      fontFamily: fonts.displayRegular,
                      fontSize: fontSizes.sm,
                      color: EARTH_GREEN,
                      textAlign: "center",
                      marginTop: spacing.sm,
                    }}
                  >
                    No trips yet. Create a trip first to add this location.
                  </Text>
                </View>
              ) : (
                trips.map((trip) => (
                  <Pressable
                    key={trip.id}
                    onPress={async () => {
                      if (!location) return;

                      // Build the weatherDestination object
                      const weatherDestination: WeatherDestination = {
                        source: "manual",
                        label: location.name,
                        lat: location.latitude,
                        lon: location.longitude,
                        updatedAt: new Date().toISOString(),
                      };

                      // Build weather data to save (if available)
                      const weatherToSave = weatherData ? {
                        forecast: weatherData.forecast,
                        lastUpdated: new Date().toISOString(),
                      } : undefined;

                      try {
                        await updateTrip(trip.id, { 
                          weatherDestination,
                          ...(weatherToSave && { weather: weatherToSave }),
                        });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      } catch (err) {
                        if (__DEV__) {
                          // eslint-disable-next-line no-console
                          console.error("Failed to save weather destination:", err);
                        }
                        setToastMessage("Failed to add weather location. Please try again.");
                        setTimeout(() => setToastMessage(null), 3000);
                        setShowAddToTripModal(false);
                        return;
                      }

                      setShowAddToTripModal(false);
                      
                      // If we came from TripDetail, navigate back to that trip
                      if (weatherPickerTripId && trip.id === weatherPickerTripId) {
                        setWeatherPickerTripId(null);
                        navigation.navigate("TripDetail", { tripId: trip.id });
                      } else if (weatherPickerTripId) {
                        // User chose a different trip - still clear context and go to that trip's details
                        setWeatherPickerTripId(null);
                        navigation.navigate("TripDetail", { tripId: trip.id });
                      } else {
                        // No trip context - just show toast
                        setToastMessage(`Weather location added to "${trip.name}"`);
                        setTimeout(() => setToastMessage(null), 3000);
                      }
                    }}
                    style={{
                      backgroundColor: CARD_BACKGROUND_LIGHT,
                      borderRadius: radius.md,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                      borderWidth: 1,
                      borderColor: BORDER_SOFT,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.displaySemibold,
                        fontSize: fontSizes.sm,
                        color: DEEP_FOREST,
                        marginBottom: spacing.xxs,
                      }}
                    >
                      {trip.name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.bodyRegular,
                        fontSize: fontSizes.xs,
                        color: TEXT_SECONDARY,
                      }}
                    >
                      {formatTripRange(trip.startDate, trip.endDate)}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Toast notification */}
      {toastMessage && (
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 100,
            left: spacing.lg,
            right: spacing.lg,
            backgroundColor: DEEP_FOREST,
            borderRadius: radius.md,
            padding: spacing.md,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Ionicons
            name={toastMessage.includes("Failed") ? "alert-circle" : "checkmark-circle"}
            size={20}
            color={toastMessage.includes("Failed") ? "#EF4444" : EARTH_GREEN}
            style={{ marginRight: spacing.sm }}
          />
          <Text
            style={{
              flex: 1,
              fontFamily: fonts.bodyRegular,
              fontSize: fontSizes.sm,
              color: PARCHMENT,
            }}
          >
            {toastMessage}
          </Text>
          <Pressable onPress={() => setToastMessage(null)} hitSlop={8}>
            <Ionicons name="close" size={18} color={PARCHMENT} />
          </Pressable>
        </View>
      )}

      {/* Account Required Modal */}
      <AccountRequiredModal
        visible={showAccountModal}
        onMaybeLater={() => setShowAccountModal(false)}
        onCreateAccount={() => {
          setShowAccountModal(false);
          navigation.navigate("Auth" as never);
        }}
      />
    </View>
  );
}
