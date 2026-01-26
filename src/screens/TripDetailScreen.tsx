import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTripsStore } from "../state/tripsStore";
import { usePlanTabStore } from "../state/planTabStore";
import { useLocationStore } from "../state/locationStore";
import { usePackingStore } from "../state/packingStore";
import { useUserStatus } from "../utils/authHelper";
import {
  getTripParticipants,
} from "../services/tripParticipantsService";
import { getCampgroundContactById } from "../services/campgroundContactsService";
import { BodyText } from "../components/Typography";
import EditTripModal from "../components/EditTripModal";
import DetailsCard, { DetailsLink } from "../components/DetailsCard";
import EditNotesModal from "../components/EditNotesModal";
import AddLinkModal from "../components/AddLinkModal";
import ItineraryLinksSection from "../components/ItineraryLinksSection";
import WeatherForecastSection from "../components/WeatherForecastSection";
import ItineraryPromptPanel from "../components/ItineraryPromptPanel";
import AddItineraryLinkModal from "../components/AddItineraryLinkModal";
import ParkDetailModal from "../components/ParkDetailModal";
import { CreateItineraryLinkData } from "../types/itinerary";
import { createItineraryLink } from "../services/itineraryLinksService";
import { Park } from "../types/camping";
import * as WebBrowser from "expo-web-browser";
import { v4 as uuidv4 } from "uuid";
import { updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../config/firebase";
import * as PackingV2 from "../services/packingListServiceV2";
import { RootStackParamList } from "../navigation/types";
import { format } from "date-fns";
import { requirePro } from "../utils/gating";
import AccountRequiredModal from "../components/AccountRequiredModal";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  PARCHMENT,
  PARCHMENT_BORDER,
  TEXT_SECONDARY,
} from "../constants/colors";

type TripDetailScreenRouteProp = RouteProp<RootStackParamList, "TripDetail">;
type TripDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "TripDetail"
>;

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

export default function TripDetailScreen() {
  const navigation = useNavigation<TripDetailScreenNavigationProp>();
  const route = useRoute<TripDetailScreenRouteProp>();
  const { tripId, showItineraryPrompt } = route.params;
  const { isGuest } = useUserStatus();

  // Select trip from trips array directly to ensure reactivity on updates
  const trips = useTripsStore((s) => s.trips);
  const trip = useMemo(() => trips.find((t) => t.id === tripId), [trips, tripId]);
  
  const setActivePlanTab = usePlanTabStore((s) => s.setActiveTab);
  const setDestinationPickerTripId = usePlanTabStore((s) => s.setDestinationPickerTripId);
  const setWeatherPickerTripId = usePlanTabStore((s) => s.setWeatherPickerTripId);
  const setSelectedLocation = useLocationStore((s) => s.setSelectedLocation);
  
  // Get all local packing lists and filter for this trip (avoids infinite loop from function selector)
  const allLocalPackingLists = usePackingStore((s) => s.packingLists);
  const localPackingLists = useMemo(
    () => allLocalPackingLists.filter((list) => list.tripId === tripId),
    [allLocalPackingLists, tripId]
  );

  // Itinerary prompt state (shown after trip creation for PRO users)
  const [showItineraryPromptPanel, setShowItineraryPromptPanel] = useState(showItineraryPrompt || false);
  const [showAddItineraryModal, setShowAddItineraryModal] = useState(false);

  // Packing list state
  const [hasPackingList, setHasPackingList] = useState(false);
  const [checkingPackingList, setCheckingPackingList] = useState(true);
  const [mealStats] = useState({ planned: 0, total: 0 });

  const [participants, setParticipants] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [showEditTripModal, setShowEditTripModal] = useState(false);

  // Details state
  const [showEditNotes, setShowEditNotes] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [detailsNotes, setDetailsNotes] = useState("");
  const [detailsLinks, setDetailsLinks] = useState<DetailsLink[]>([]);

  // Gating modal state
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Park detail modal state (for viewing destination)
  const [showParkDetail, setShowParkDetail] = useState(false);

  // Build Park object from trip destination for the modal (no Firestore query needed)
  const parkDataFromTrip: Park | null = useMemo(() => {
    const dest = trip?.tripDestination;
    if (!dest?.placeId || !dest?.name) return null;
    
    // Map parkType to filter value
    const filterMap: Record<string, "national_park" | "state_park" | "national_forest"> = {
      "National Park": "national_park",
      "State Park": "state_park",
      "National Forest": "national_forest",
    };
    
    return {
      id: dest.placeId,
      name: dest.name,
      filter: filterMap[dest.parkType || ""] || "state_park",
      address: dest.formattedAddress || dest.addressLine1 || "",
      state: dest.state || "",
      latitude: dest.lat || 0,
      longitude: dest.lng || 0,
      url: dest.url || "", // Reservation URL from TripDestination
    };
  }, [trip?.tripDestination]);

  const startDate = useMemo(() => (trip ? new Date(trip.startDate) : null), [trip]);
  const endDate = useMemo(() => (trip ? new Date(trip.endDate) : null), [trip]);

  const nights = useMemo(() => {
    if (!startDate || !endDate) return 1;
    return Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
  }, [startDate, endDate]);

  const totalMeals = useMemo(() => nights * 3, [nights]);

  const loadParticipants = useCallback(async () => {
    try {
      setLoadingParticipants(true);
      const participantsData = await getTripParticipants(tripId);

      const resolved = await Promise.all(
        participantsData.map(async (p) => {
          const contact = await getCampgroundContactById(p.campgroundContactId);
          return {
            id: p.id,
            name: contact?.contactName || "Unknown",
          };
        })
      );

      setParticipants(resolved);
    } catch (error) {
      console.error("Error loading participants:", error);
    } finally {
      setLoadingParticipants(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  useFocusEffect(
    useCallback(() => {
      loadParticipants();
    }, [loadParticipants])
  );

  // Check if packing list exists for this trip
  useFocusEffect(
    useCallback(() => {
      const checkPackingList = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId || !tripId) {
          setCheckingPackingList(false);
          return;
        }
        
        try {
          // Check if this trip has any packing items
          const hasItems = await PackingV2.hasTripPackingItems(userId, tripId);
          setHasPackingList(hasItems);
        } catch (err) {
          console.error("Error checking packing list:", err);
          setHasPackingList(false);
        } finally {
          setCheckingPackingList(false);
        }
      };
      
      checkPackingList();
    }, [tripId])
  );

  useEffect(() => {
    if (!trip) return;
    setDetailsNotes(trip.detailsNotes || "");
    setDetailsLinks((trip.detailsLinks || []) as DetailsLink[]);
  }, [trip]);

  const handleOpenPacking = useCallback(async () => {
    // Gate: Pro-only feature
    const canProceed = requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "packing_list", variant }),
    });
    if (!canProceed) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    
    if (!trip) return;
    
    // Check if there's a local packing list for this trip (created via PackingListCreate)
    if (localPackingLists.length > 0) {
      // Navigate to the local packing list editor
      navigation.navigate("PackingListEditor", { listId: localPackingLists[0].id });
      return;
    }
    
    // No local list yet - navigate to create one with trip context for season detection
    navigation.navigate("PackingListCreate", { 
      tripId: trip.id, 
      tripName: trip.name,
      tripStartDate: trip.startDate,
      tripEndDate: trip.endDate,
      tripCampingStyle: trip.campingStyle,
      tripWinterCamping: trip.winterCamping,
      tripPackingSeasonOverride: trip.packingSeasonOverride,
    });
  }, [navigation, trip, localPackingLists]);

  const handleOpenMeals = useCallback(async () => {
    // Gate: Pro-only feature
    const canProceed = requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "meal_planner", variant }),
    });
    if (!canProceed) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    if (trip) navigation.navigate("MealPlanning", { tripId: trip.id });
  }, [navigation, trip]);

  const handleOpenWeather = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    
    // Set trip context so Weather screen can navigate back after adding
    setWeatherPickerTripId(tripId);
    
    // Priority: 1) weatherDestination, 2) tripDestination, 3) destination
    if (trip?.weatherDestination) {
      // Already have weather location saved
      setSelectedLocation({
        name: trip.weatherDestination.label,
        latitude: trip.weatherDestination.lat,
        longitude: trip.weatherDestination.lon,
      });
    } else if (trip?.tripDestination && trip.tripDestination.lat && trip.tripDestination.lng) {
      // Pre-populate from destination
      setSelectedLocation({
        name: trip.tripDestination.name,
        latitude: trip.tripDestination.lat,
        longitude: trip.tripDestination.lng,
      });
    } else if (trip?.destination?.coordinates) {
      // Legacy destination with coordinates
      setSelectedLocation({
        name: trip.destination.name,
        latitude: trip.destination.coordinates.latitude,
        longitude: trip.destination.coordinates.longitude,
      });
    }
    
    setActivePlanTab("weather");
    navigation.goBack();
  }, [navigation, setActivePlanTab, trip, setSelectedLocation, setWeatherPickerTripId, tripId]);

  // Handler: Change weather location (go to weather without pre-population)
  const handleChangeWeather = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    
    // Clear selected location so user can pick fresh
    setSelectedLocation(null);
    setActivePlanTab("weather");
    navigation.goBack();
  }, [navigation, setActivePlanTab, setSelectedLocation]);

  // Handler: Open destination - view park detail if selected, or browse if not
  const handleOpenDestination = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    
    if (!trip) return;
    
    // Check if trip has a destination with a park ID
    const hasDestination = parkDataFromTrip !== null;
    
    if (hasDestination) {
      // Has a park selected - show the park detail modal directly (instant, no query)
      setShowParkDetail(true);
    } else {
      // No park selected - go to parks browser to select one
      setDestinationPickerTripId(tripId);
      setActivePlanTab("parks");
      navigation.goBack();
    }
  }, [navigation, setActivePlanTab, setDestinationPickerTripId, tripId, trip, parkDataFromTrip]);

  // Handler: Change destination (go to Parks tab)
  const handleChangeDestination = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    
    // Set trip context for destination picker flow
    setDestinationPickerTripId(tripId);
    
    // Navigate to Plan screen with Parks tab active
    setActivePlanTab("parks");
    navigation.goBack();
  }, [navigation, setActivePlanTab, setDestinationPickerTripId, tripId]);

  const handleAddPeople = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    // Gate: PRO required to share trip with campground (sender must be Pro)
    if (!requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "campground_sharing", variant }),
    })) {
      return;
    }
    if (trip) navigation.navigate("AddPeopleToTrip", { tripId: trip.id });
  }, [navigation, trip]);

  // Details handlers
  const handleEditNotes = useCallback(() => {
    // Gate: PRO required to edit trip notes
    if (!requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "trip_notes", variant }),
    })) {
      return;
    }
    setShowEditNotes(true);
  }, []);

  const handleSaveNotes = useCallback(
    async (newNotes: string) => {
      setDetailsNotes(newNotes);

      if (!trip) return;

      try {
        await updateDoc(doc(db, "trips", trip.id), {
          detailsNotes: newNotes,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Failed to save notes:", err);
        Alert.alert("Error", "Could not save notes.");
      }
    },
    [trip]
  );

  const handleAddLink = useCallback(() => {
    // Gate: PRO required to add links
    if (!requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "trip_links", variant }),
    })) {
      return;
    }
    setShowAddLink(true);
  }, []);

  const handleSaveLink = useCallback(
    async (title: string, rawUrl: string) => {
      const url = normalizeUrl(rawUrl);

      let source: DetailsLink["source"] = "other";
      if (url.includes("alltrails.com")) source = "alltrails";
      else if (url.includes("onxmaps.com") || url.includes("onxoffroad.app")) source = "onx";
      else if (url.includes("gaiagps.com")) source = "gaia";
      else if (url.includes("google.com/maps") || url.includes("maps.google.")) source = "google_maps";

      if (detailsLinks.some((l) => l.url === url)) {
        Alert.alert("Duplicate Link", "This link already exists.");
        return;
      }

      const newLink: DetailsLink = {
        id: uuidv4(),
        title: title.trim() || "Link",
        url,
        source,
      };

      const newLinks = [...detailsLinks, newLink];
      setDetailsLinks(newLinks);

      if (!trip) return;

      try {
        await updateDoc(doc(db, "trips", trip.id), {
          detailsLinks: newLinks,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Failed to save link:", err);
        Alert.alert("Error", "Could not save link.");
      }
    },
    [detailsLinks, trip]
  );

  const handleDeleteLink = useCallback(
    async (id: string) => {
      // Gate: PRO required to delete links
      if (!requirePro({
        openAccountModal: () => setShowAccountModal(true),
        openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "trip_links", variant }),
      })) {
        return;
      }

      const newLinks = detailsLinks.filter((l) => l.id !== id);
      setDetailsLinks(newLinks);

      if (!trip) return;

      try {
        await updateDoc(doc(db, "trips", trip.id), {
          detailsLinks: newLinks,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Failed to delete link:", err);
        Alert.alert("Error", "Could not delete link.");
      }
    },
    [detailsLinks, trip]
  );

  const handleOpenLink = useCallback(async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert("Could not open link");
    }
  }, []);

  // If trip disappears, leave the screen
  useEffect(() => {
    if (!trip) navigation.goBack();
  }, [trip, navigation]);

  if (!trip || !startDate || !endDate) return null;

  return (
    <SafeAreaView className="flex-1 bg-parchment" edges={["top"]} style={{ backgroundColor: DEEP_FOREST }}>
      {/* Header - Deep Forest background extending to top of screen */}
      <View className="px-5 pt-4 pb-4" style={{ backgroundColor: DEEP_FOREST }}>
        <View className="flex-row items-center justify-between mb-2">
          <Pressable
            onPress={() => navigation.goBack()}
            className="flex-row items-center active:opacity-70"
          >
            <Ionicons name="arrow-back" size={20} color={PARCHMENT} />
            <Text
              className="text-sm ml-1"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
            >
              Back
            </Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {
                // ignore
              }

              if (isGuest) {
                navigation.navigate("Auth" as any);
                return;
              }
              setShowEditTripModal(true);
            }}
            className="px-3 py-1.5 rounded-lg active:opacity-70 flex-row items-center"
            style={{ backgroundColor: "rgba(255,255,255,0.15)", gap: 6 }}
          >
            <Ionicons name="create-outline" size={16} color={PARCHMENT} />
            <Text
              className="text-sm"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
            >
              Edit Trip
            </Text>
          </Pressable>
        </View>

        <Text
          className="text-xl"
          style={{ fontFamily: "Raleway_600SemiBold", color: PARCHMENT }}
        >
          {trip.name}
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 bg-parchment" showsVerticalScrollIndicator={false}>
        {/* Trip Overview */}
        <View className="py-6">
          {/* Dates */}
          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="calendar" size={20} color={DEEP_FOREST} />
              <Text
                className="text-base ml-2"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
              >
                Dates
              </Text>
            </View>

            <BodyText>
              {format(startDate, "MMMM d, yyyy")} - {format(endDate, "MMMM d, yyyy")}
            </BodyText>

            <BodyText className="text-earthGreen">
              {nights} {nights === 1 ? "night" : "nights"}
            </BodyText>
          </View>



          {/* Party Size */}
          {trip.partySize ? (
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="people" size={20} color={DEEP_FOREST} />
                <Text
                  className="text-base ml-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                >
                  Party Size
                </Text>
              </View>
              <BodyText>{trip.partySize} people</BodyText>
            </View>
          ) : null}

          {/* People */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Ionicons name="people-outline" size={20} color={DEEP_FOREST} />
                <Text
                  className="text-base ml-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                >
                  People
                </Text>
              </View>

              <Pressable onPress={handleAddPeople} className="active:opacity-70">
                <Ionicons name="add-circle" size={24} color={EARTH_GREEN} />
              </Pressable>
            </View>

            {loadingParticipants ? (
              <ActivityIndicator size="small" color={EARTH_GREEN} />
            ) : participants.length === 0 ? (
              <Pressable onPress={handleAddPeople} className="active:opacity-70">
                <BodyText className="text-earthGreen">Add people from your campground</BodyText>
              </Pressable>
            ) : (
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {participants.map((person) => (
                  <View
                    key={person.id}
                    className="px-3 py-1.5 rounded-full border"
                    style={{ backgroundColor: PARCHMENT, borderColor: PARCHMENT_BORDER }}
                  >
                    <Text style={{ fontFamily: "SourceSans3_400Regular", color: DEEP_FOREST }}>
                      {person.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Camping Style */}
          {trip.campingStyle ? (
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="bonfire" size={20} color={DEEP_FOREST} />
                <Text
                  className="text-base ml-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                >
                  Camping Style
                </Text>
              </View>
              <BodyText className="capitalize">
                {trip.campingStyle.replace(/_/g, " ").toLowerCase()}
              </BodyText>
            </View>
          ) : null}

          {/* Notes */}
          {trip.notes ? (
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="document-text" size={20} color={DEEP_FOREST} />
                <Text
                  className="text-base ml-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                >
                  Notes
                </Text>
              </View>
              <BodyText>{trip.notes}</BodyText>
            </View>
          ) : null}
        </View>

        {/* Trip Planning shortcuts */}
        <View className="pb-6">
          {/* Destination */}
          <Pressable
            onPress={handleOpenDestination}
            className="bg-white rounded-xl p-4 mb-3 active:opacity-80"
            style={{ borderWidth: 1, borderColor: "#e7e5e4" }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: DEEP_FOREST }}
                >
                  <Ionicons name="location-outline" size={20} color={PARCHMENT} />
                </View>

                <View className="flex-1">
                  <Text
                    className="text-base mb-1"
                    style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                  >
                    Destination
                  </Text>

                  <Text
                    className="text-sm"
                    style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                    numberOfLines={1}
                  >
                    {trip.tripDestination?.name || trip.destination?.name || trip.locationName
                      ? trip.tripDestination?.name || trip.destination?.name || trip.locationName
                      : "Choose a park or campground"}
                  </Text>

                  {(trip.tripDestination?.name || trip.destination?.name || trip.locationName) && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleChangeDestination();
                      }}
                      className="mt-2 self-start active:opacity-70"
                      style={{ 
                        backgroundColor: "#f5f5f4", 
                        paddingHorizontal: 10, 
                        paddingVertical: 4, 
                        borderRadius: 12,
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text
                        style={{ 
                          fontFamily: "SourceSans3_400Regular", 
                          fontSize: 12,
                          color: TEXT_SECONDARY,
                        }}
                      >
                        change
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <View className="flex-row items-center">
                <Ionicons name="chevron-forward" size={20} color={EARTH_GREEN} />
              </View>
            </View>
          </Pressable>

          {/* Packing */}
          <Pressable
            onPress={handleOpenPacking}
            className="bg-white rounded-xl p-4 mb-3 active:opacity-80"
            style={{ borderWidth: 1, borderColor: "#e7e5e4" }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: DEEP_FOREST }}
                >
                  <Ionicons name="bag-outline" size={20} color={PARCHMENT} />
                </View>

                <View className="flex-1">
                  <Text
                    className="text-base mb-1"
                    style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                  >
                    Packing List
                  </Text>

                  {checkingPackingList ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator size="small" color={EARTH_GREEN} />
                      <Text
                        className="text-sm ml-2"
                        style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                      >
                        Loading...
                      </Text>
                    </View>
                  ) : (
                    <Text
                      className="text-sm"
                      style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                    >
                      {hasPackingList || localPackingLists.length > 0
                        ? "Get packed for your trip"
                        : "Build your packing list (We'll even help!)"}
                    </Text>
                  )}
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color={EARTH_GREEN} />
            </View>
          </Pressable>

          {/* Meals */}
          <Pressable
            onPress={handleOpenMeals}
            className="bg-white rounded-xl p-4 mb-3 active:opacity-80"
            style={{ borderWidth: 1, borderColor: "#e7e5e4" }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: DEEP_FOREST }}
                >
                  <Ionicons name="restaurant-outline" size={20} color={PARCHMENT} />
                </View>

                <View className="flex-1">
                  <Text
                    className="text-base mb-1"
                    style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                  >
                    Meal Planning
                  </Text>

                  <Text
                    className="text-sm"
                    style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                  >
                    {mealStats.planned === 0
                      ? "Plan meals for your trip"
                      : `${mealStats.planned} of ${totalMeals} meals planned`}
                  </Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color={EARTH_GREEN} />
            </View>
          </Pressable>

          {/* Weather Forecast */}
          <View className="mb-3">
            {trip.weather && trip.weather.forecast && trip.weather.forecast.length > 0 ? (
              <WeatherForecastSection
                forecast={trip.weather.forecast}
                locationName={trip.weatherDestination?.label || trip.destination?.name || "Unknown location"}
                lastUpdated={trip.weather.lastUpdated}
                onViewMore={handleOpenWeather}
                onChangeLocation={handleChangeWeather}
                tripStartDate={trip.startDate}
              />
            ) : (
              <Pressable
                onPress={handleOpenWeather}
                className="bg-white rounded-xl p-4 active:opacity-80"
                style={{ borderWidth: 1, borderColor: "#e7e5e4" }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: DEEP_FOREST }}
                    >
                      <Ionicons name="partly-sunny-outline" size={20} color={PARCHMENT} />
                    </View>

                    <View className="flex-1">
                      <Text
                        className="text-base mb-1"
                        style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                      >
                        Weather Forecast
                      </Text>

                      <Text
                        className="text-sm"
                        style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                        numberOfLines={1}
                      >
                        {trip.weatherDestination
                          ? `Check weather for ${trip.weatherDestination.label}`
                          : "Check weather for your location"}
                      </Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color={EARTH_GREEN} />
                </View>
              </Pressable>
            )}
          </View>

          {/* Itinerary Links */}
          <View className="mb-3">
            <ItineraryLinksSection
              tripId={tripId}
              tripStartDate={trip.startDate}
              tripEndDate={trip.endDate}
            />
          </View>

          {/* Notes Section */}
          <Pressable
            onPress={handleEditNotes}
            className="bg-white rounded-xl p-4 mb-3 active:opacity-80"
            style={{ borderWidth: 1, borderColor: "#e7e5e4" }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: DEEP_FOREST }}
                >
                  <Ionicons name="document-text-outline" size={20} color={PARCHMENT} />
                </View>
                <Text
                  className="text-base"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                >
                  Notes
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="create-outline" size={18} color={EARTH_GREEN} />
                <Text
                  className="ml-1 text-sm"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: EARTH_GREEN }}
                >
                  Edit
                </Text>
              </View>
            </View>
            
            {detailsNotes ? (
              <Text
                className="text-sm"
                style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, lineHeight: 20 }}
                numberOfLines={4}
              >
                {detailsNotes}
              </Text>
            ) : (
              <Text
                className="text-sm italic"
                style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
              >
                Add notes (day-by-day plans, reminders, permit info...)
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* Edit Notes Modal */}
      <EditNotesModal
        visible={showEditNotes}
        initialValue={detailsNotes}
        onSave={handleSaveNotes}
        onClose={() => setShowEditNotes(false)}
      />

      {/* Edit Trip Modal */}
      <EditTripModal
        visible={showEditTripModal}
        onClose={() => setShowEditTripModal(false)}
        tripId={tripId}
      />

      {/* Gating Modals */}
      <AccountRequiredModal
        visible={showAccountModal}
        onCreateAccount={() => {
          setShowAccountModal(false);
          navigation.navigate("Auth" as any);
        }}
        onMaybeLater={() => setShowAccountModal(false)}
      />

      {/* Itinerary Prompt Panel (shown after trip creation for PRO users) */}
      <ItineraryPromptPanel
        visible={showItineraryPromptPanel}
        onAddItinerary={() => {
          setShowItineraryPromptPanel(false);
          setShowAddItineraryModal(true);
        }}
        onDismiss={() => setShowItineraryPromptPanel(false)}
      />

      {/* Add Itinerary Link Modal */}
      {trip && (
        <AddItineraryLinkModal
          visible={showAddItineraryModal}
          onClose={() => setShowAddItineraryModal(false)}
          onSave={async (data) => {
            // Import and use the service to add the link
            const { createItineraryLink } = await import('../services/itineraryLinksService');
            await createItineraryLink(tripId, data);
          }}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate}
        />
      )}

      {/* Park Detail Modal (view-only, for viewing destination) */}
      <ParkDetailModal
        visible={showParkDetail && parkDataFromTrip !== null}
        park={parkDataFromTrip}
        onClose={() => setShowParkDetail(false)}
        onAddToTrip={() => {
          // Not used in view mode, but required by props
        }}
      />
    </SafeAreaView>
  );
}
