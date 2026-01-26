import React, { useRef, useEffect, useState, useCallback } from "react";
import { Modal, View, Text, Pressable, ScrollView, Linking, Platform, ActivityIndicator, Animated, Alert } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { doc, getDoc } from "firebase/firestore";
import { Park } from "../types/camping";
import { useTripsStore } from "../state/tripsStore";
import { useUserStatus } from "../utils/authHelper";
import { useSubscriptionStore } from "../state/subscriptionStore";
import { auth, db } from "../config/firebase";
import { 
  isParkFavorited, 
  addFavoritePark, 
  removeFavoritePark,
  getFavoritesCount,
  FREE_FAVORITES_LIMIT,
} from "../services/favoriteParksService";
import { getPaywallVariantAndTrack, type PaywallVariant } from "../services/proAttemptService";
import { DEEP_FOREST, PARCHMENT, BORDER_SOFT, RUST, GRANITE_GOLD, EARTH_GREEN } from "../constants/colors";

// Success green color for confirmation
const SUCCESS_GREEN = "#2E7D32";

interface ParkDetailModalProps {
  visible: boolean;
  park: Park | null;
  onClose: () => void;
  onAddToTrip: (park: Park, tripId?: string) => void;
  onRequireAccount?: (triggerKey?: string) => void;
  /** Called when user needs Pro to add more favorites (6th+). Receives variant for nudge paywall. */
  onRequirePro?: (triggerKey?: string, variant?: PaywallVariant) => void;
  /** When set, modal is opened from a trip context - show "Set as destination" instead of "Add to trip" */
  tripIdForDestination?: string;
  /** Called when user taps "Set as trip destination" - parent handles save + navigation */
  onSetAsDestination?: (park: Park, tripId: string) => void;
  /** Called when user taps "Check Weather" */
  onCheckWeather?: (park: Park) => void;
}

export default function ParkDetailModal({ 
  visible, 
  park, 
  onClose, 
  onAddToTrip, 
  onRequireAccount,
  onRequirePro,
  tripIdForDestination,
  onSetAsDestination,
  onCheckWeather,
}: ParkDetailModalProps) {
  const mapRef = useRef<MapView>(null);
  const navigation = useNavigation();
  const { isGuest } = useUserStatus();
  const isPro = useSubscriptionStore((s) => s.isPro);
  const trips = useTripsStore((s) => s.trips);
  
  // Favorites state
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Reservation URL state - fetched from Firebase if park.url is missing (legacy trips)
  const [reservationUrl, setReservationUrl] = useState<string | null>(null);

  // Add to trip confirmation state
  const [addedToTripId, setAddedToTripId] = useState<string | null>(null);
  const [addedToNewTrip, setAddedToNewTrip] = useState(false);
  const [destinationSet, setDestinationSet] = useState(false);
  const successScale = useRef(new Animated.Value(1)).current;

  // Get the most recent trip that is planning, upcoming, or active
  const activeTrip = trips.find((trip) =>
    trip.status === "planning" || trip.status === "upcoming" || trip.status === "active"
  );

  // Reset added state when modal closes or park changes
  useEffect(() => {
    if (!visible) {
      // Reset after modal closes
      setTimeout(() => {
        setAddedToTripId(null);
        setAddedToNewTrip(false);
        setDestinationSet(false);
        successScale.setValue(1);
      }, 300);
    }
  }, [visible]);

  // Check favorite status when modal opens
  useEffect(() => {
    if (visible && park) {
      checkFavoriteStatus();
      // Reset add state when opening for a new park
      setAddedToTripId(null);
      setAddedToNewTrip(false);
      setDestinationSet(false);
      setReservationUrl(null);
    }
  }, [visible, park]);

  // Fetch reservation URL from Firebase if park.url is missing (legacy trips without URL stored)
  useEffect(() => {
    const fetchReservationUrl = async () => {
      if (!visible || !park) return;
      
      // If park already has a URL, use it
      if (park.url) {
        setReservationUrl(park.url);
        return;
      }
      
      // No URL - try to fetch from parks collection using park.id
      if (!park.id) return;
      
      try {
        const parkDoc = await getDoc(doc(db, "parks", park.id));
        if (parkDoc.exists()) {
          const parkData = parkDoc.data();
          if (parkData?.url) {
            setReservationUrl(parkData.url);
          }
        }
      } catch (error) {
        console.warn("[ParkDetailModal] Failed to fetch reservation URL:", error);
      }
    };
    
    fetchReservationUrl();
  }, [visible, park]);

  // Handler for adding park to trip with confirmation
  const handleAddToTripWithConfirmation = useCallback((tripId?: string) => {
    if (isGuest) {
      onClose();
      navigation.navigate("Auth" as never);
      return;
    }
    
    if (!park) return;
    
    // Call the parent handler
    onAddToTrip(park, tripId);
    
    // Show success confirmation
    if (tripId) {
      setAddedToTripId(tripId);
    } else {
      setAddedToNewTrip(true);
    }
    
    // Haptic feedback - success notification
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Animate the button
    Animated.sequence([
      Animated.timing(successScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(successScale, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isGuest, park, onAddToTrip, onClose, navigation, successScale]);

  // Handler for setting park as trip destination (when opened from trip context)
  const handleSetAsDestination = useCallback(() => {
    if (isGuest) {
      onClose();
      navigation.navigate("Auth" as never);
      return;
    }
    
    if (!park || !tripIdForDestination || !onSetAsDestination) return;
    
    // Show success state
    setDestinationSet(true);
    
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Animate the button
    Animated.sequence([
      Animated.timing(successScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(successScale, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Call parent handler to save destination and navigate back
    onSetAsDestination(park, tripIdForDestination);
  }, [isGuest, park, tripIdForDestination, onSetAsDestination, onClose, navigation, successScale]);

  const checkFavoriteStatus = async () => {
    const user = auth.currentUser;
    if (!user || !park) {
      setIsFavorited(false);
      return;
    }
    
    try {
      const fav = await isParkFavorited(user.uid, park.id);
      setIsFavorited(fav);
    } catch (error) {
      console.error("[ParkDetail] Error checking favorite status:", error);
    }
  };

  const handleToggleFavorite = async () => {
    const user = auth.currentUser;
    
    // GUEST: Show AccountRequiredModal (saving favorites requires account)
    if (!user || isGuest) {
      if (onRequireAccount) {
        onRequireAccount("save_favorite");
      } else {
        onClose();
        navigation.navigate("Auth" as any);
      }
      return;
    }
    
    if (!park) return;
    
    try {
      setFavoriteLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (isFavorited) {
        // Removing favorite - always allowed
        await removeFavoritePark(user.uid, park.id);
        setIsFavorited(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Adding favorite - check limit for FREE users (first 5 free, 6+ requires Pro)
        if (!isPro) {
          const currentCount = await getFavoritesCount(user.uid);
          if (currentCount >= FREE_FAVORITES_LIMIT) {
            // FREE user at limit - track Pro attempt and show PaywallModal
            setFavoriteLoading(false);
            const isAuthenticated = !!user;
            const variant = await getPaywallVariantAndTrack(isAuthenticated, isPro);
            if (onRequirePro) {
              onRequirePro("favorites_limit", variant);
            } else {
              navigation.navigate("Paywall" as any, { triggerKey: "favorites_limit", variant });
            }
            return;
          }
        }
        
        await addFavoritePark(user.uid, park);
        setIsFavorited(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("[ParkDetail] Error toggling favorite:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Couldn't Update Favorite",
        "Please check your connection and try again.",
        [{ text: "OK" }]
      );
    } finally {
      setFavoriteLoading(false);
    }
  };

  useEffect(() => {
    if (park && mapRef.current) {
      // Zoom to park location when modal opens
      setTimeout(() => {
        mapRef.current?.animateToRegion({
          latitude: park.latitude,
          longitude: park.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }, 500);
      }, 300);
    }
  }, [park, visible]);

  if (!park) return null;

  const handleDriveThere = () => {
    const destination = encodeURIComponent(park.address);
    const url = Platform.select({
      ios: `maps://maps.apple.com/?daddr=${destination}`,
      android: `geo:0,0?q=${destination}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        // Fallback to web
        Linking.openURL(`https://maps.apple.com/?daddr=${destination}`);
      });
    }
  };

  const handleReserveSite = () => {
    // Use reservationUrl state which is set from park.url or fetched from Firebase
    if (reservationUrl) {
      Linking.openURL(reservationUrl);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: PARCHMENT }}>
        {/* Header - Deep Forest Green background */}
        <View
          style={{
            paddingTop: 30,
            paddingHorizontal: 20,
            paddingBottom: 20,
            backgroundColor: DEEP_FOREST,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text
              style={{
                fontFamily: "Raleway_700Bold",
                fontSize: 24,
                color: PARCHMENT,
                flex: 1,
                marginRight: 12,
              }}
            >
              {park.name}
            </Text>
            <Pressable
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={20} color={PARCHMENT} />
            </Pressable>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Address */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 4 }}>
              <Ionicons name="location" size={18} color={GRANITE_GOLD} style={{ marginTop: 2 }} />
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 15,
                  color: EARTH_GREEN,
                  marginLeft: 8,
                  flex: 1,
                }}
              >
                {park.address}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ width: "100%", marginBottom: 24, gap: 12 }}>
            {/* TRIP DESTINATION CONTEXT: Show "Set as trip destination" when opened from TripDetail */}
            {tripIdForDestination ? (
              <Animated.View style={{ transform: [{ scale: destinationSet ? successScale : 1 }] }}>
                <Pressable
                  onPress={handleSetAsDestination}
                  disabled={destinationSet}
                  style={{
                    backgroundColor: destinationSet ? SUCCESS_GREEN : DEEP_FOREST,
                    borderRadius: 16,
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    borderWidth: 0,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons 
                    name={destinationSet ? "checkmark-circle" : "location"} 
                    size={20} 
                    color={PARCHMENT} 
                  />
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 16,
                      color: PARCHMENT,
                      marginLeft: 8,
                    }}
                  >
                    {destinationSet ? "Destination set!" : "Set as trip destination"}
                  </Text>
                </Pressable>
              </Animated.View>
            ) : (
              /* GENERAL BROWSE CONTEXT: Show "Add to {TripName}" when there's an active trip */
              activeTrip && (
                <Animated.View style={{ transform: [{ scale: addedToTripId === activeTrip.id ? successScale : 1 }] }}>
                  <Pressable
                    onPress={() => handleAddToTripWithConfirmation(activeTrip.id)}
                    disabled={addedToTripId === activeTrip.id}
                    style={{
                      backgroundColor: addedToTripId === activeTrip.id ? SUCCESS_GREEN : PARCHMENT,
                      borderRadius: 16,
                      paddingVertical: 10,
                      paddingHorizontal: 20,
                      borderWidth: 1,
                      borderColor: addedToTripId === activeTrip.id ? SUCCESS_GREEN : BORDER_SOFT,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: addedToTripId === activeTrip.id ? 1 : 1,
                    }}
                  >
                    <Ionicons 
                      name={addedToTripId === activeTrip.id ? "checkmark-circle" : "add-circle"} 
                      size={20} 
                      color={addedToTripId === activeTrip.id ? PARCHMENT : DEEP_FOREST} 
                    />
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 16,
                        color: addedToTripId === activeTrip.id ? PARCHMENT : DEEP_FOREST,
                        marginLeft: 8,
                      }}
                    >
                      {addedToTripId === activeTrip.id ? `Added to ${activeTrip.name}!` : `Add to ${activeTrip.name}`}
                    </Text>
                  </Pressable>
                </Animated.View>
              )
            )}

            {/* Reserve a Site - only show if park has a reservation URL (from prop or fetched from Firebase) */}
            {reservationUrl ? (
              <Pressable
                onPress={handleReserveSite}
                style={{
                  backgroundColor: DEEP_FOREST,
                  borderRadius: 16,
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  borderWidth: 0,
                  marginTop: 4,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="calendar" size={20} color={PARCHMENT} />
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 16,
                    color: PARCHMENT,
                    marginLeft: 8,
                  }}
                >
                  Reserve a Site
                </Text>
              </Pressable>
            ) : null}

            {/* Bottom row of utility buttons */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%",
                marginTop: 8,
              }}
            >
              {/* Drive There */}
              <View style={{ width: "48%" }}>
                <Pressable
                  onPress={handleDriveThere}
                  style={{
                    backgroundColor: PARCHMENT,
                    borderRadius: 16,
                    paddingVertical: 9,
                    paddingHorizontal: 20,
                    borderWidth: 1,
                    borderColor: BORDER_SOFT,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="navigate" size={18} color={DEEP_FOREST} />
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 16,
                      color: DEEP_FOREST,
                      marginLeft: 8,
                    }}
                  >
                    Drive There
                  </Text>
                </Pressable>
              </View>

              {/* Add to Favorites */}
              <View style={{ width: "48%" }}>
                <Pressable
                  onPress={handleToggleFavorite}
                  disabled={favoriteLoading}
                  style={{
                    backgroundColor: isFavorited ? RUST : PARCHMENT,
                    borderRadius: 16,
                    paddingVertical: 9,
                    paddingHorizontal: 20,
                    borderWidth: 1,
                    borderColor: isFavorited ? RUST : BORDER_SOFT,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {favoriteLoading ? (
                    <ActivityIndicator size="small" color={isFavorited ? PARCHMENT : DEEP_FOREST} />
                  ) : (
                    <>
                      <Ionicons 
                        name={isFavorited ? "heart" : "heart-outline"} 
                        size={18} 
                        color={isFavorited ? PARCHMENT : RUST} 
                      />
                      <Text
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 16,
                          color: isFavorited ? PARCHMENT : DEEP_FOREST,
                          marginLeft: 8,
                        }}
                        numberOfLines={1}
                      >
                        {isFavorited ? "Favorited" : "Favorite"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>

          {/* Map */}
          <View
            style={{
              height: 300,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: BORDER_SOFT,
            }}
          >
            <MapView
              ref={mapRef}
              provider={PROVIDER_DEFAULT}
              style={{ flex: 1 }}
              initialRegion={{
                latitude: park.latitude,
                longitude: park.longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }}
            >
              <Marker
                coordinate={{
                  latitude: park.latitude,
                  longitude: park.longitude,
                }}
                pinColor={DEEP_FOREST}
              >
                <View style={{ alignItems: "center", justifyContent: "center" }}>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: DEEP_FOREST,
                      borderWidth: 3,
                      borderColor: PARCHMENT,
                    }}
                  />
                </View>
              </Marker>
            </MapView>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
