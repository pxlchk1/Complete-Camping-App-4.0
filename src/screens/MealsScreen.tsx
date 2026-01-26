import React, { useEffect, useState } from "react";
/**
 * Meals Screen - Toggle between two views
 * 1. Meal Planner - Plan meals for active trips
 * 2. Meal Ideas - Browse and add recipes to trips
 */

import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AddCustomMealModal from "../components/AddCustomMealModal";
import FireflyLoader from "../components/common/FireflyLoader";
import EmptyState from "../components/EmptyState";
import { DEEP_FOREST, EARTH_GREEN, PARCHMENT } from "../constants/colors";
import { useTrips } from "../state/tripsStore";
import { useAuthStore } from "../state/authStore";
import { RootStackParamList } from "../navigation/types";
import { MealCategory, PrepType, MealLibraryItem } from "../types/meal";
import { MealType, MEAL_TYPES } from "../constants/mealTypes";
import { libraryItemMatchesMealType } from "../utils/recipeMealTypeUtils";
import * as Haptics from "expo-haptics";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import * as LocalMealService from "../services/localMealService";
import { requirePro } from "../utils/gating";
import AccountRequiredModal from "../components/AccountRequiredModal";

type PlanTab = "trips" | "parks" | "weather" | "packing" | "meals";
type MealsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type MealsView = "planner" | "recipes";

interface MealsScreenProps {
  onTabChange: (tab: PlanTab) => void;
}

const CATEGORY_LABELS: Record<MealCategory, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
  beverages: "Beverages",
};

const PREP_TYPE_LABELS: Record<PrepType, string> = {
  noCook: "No cook",
  cold: "Cold",
  campStove: "Camp stove",
  campfire: "Campfire",
};

export default function MealsScreen({ onTabChange }: MealsScreenProps) {
  console.log("[PLAN_TRACE] Enter MealsScreen");

  useEffect(() => {
    console.log("[PLAN_TRACE] MealsScreen mounted");
  }, []);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<MealsScreenNavigationProp>();
  const allTrips = useTrips();
  const currentUser = useAuthStore((s) => s.user);

  // Filter trips to only show those for the current logged-in user
  const trips = currentUser ? allTrips.filter((t) => t.userId === currentUser.id) : [];

  // Debug: Log trips from store
  console.log(`[MealsScreen] Total trips in store: ${allTrips.length}, User trips: ${trips.length}`, trips.map(t => ({ id: t.id, name: t.name, start: t.startDate, end: t.endDate })));

  // Toggle state
  const [activeView, setActiveView] = useState<MealsView>("planner");

  // State for Firebase recipes
  const [recipes, setRecipes] = useState<MealLibraryItem[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>(["All"]);
  
  // Meal type filter for recipes view (breakfast/lunch/dinner/snacks)
  const [selectedMealTypeFilter, setSelectedMealTypeFilter] = useState<MealType | "all">("all");

  // Add to trip modal
  const [showAddToTrip, setShowAddToTrip] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<MealLibraryItem | null>(null);
  const [selectedTripForAdd, setSelectedTripForAdd] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealCategory>("breakfast");
  const [selectedDay, setSelectedDay] = useState(1);

  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Add custom meal modal
  const [showAddCustomMeal, setShowAddCustomMeal] = useState(false);

  // Gating modal state
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Filter to active trips only (upcoming or in progress - not completed)
  const activeTrips = trips.filter((trip) => {
    const now = new Date();
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    // Set end to end of day to include trips ending today
    end.setHours(23, 59, 59, 999);
    
    // Debug logging
    console.log(`[MealsScreen] Trip "${trip.name}": start=${start.toISOString()}, end=${end.toISOString()}, now=${now.toISOString()}, isActive=${now <= end}`);
    
    return now <= end;
  });

  // Load recipes from Firebase
  useEffect(() => {
    if (activeView === "recipes") {
      loadRecipesFromFirebase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  const loadRecipesFromFirebase = async () => {
    setLoadingRecipes(true);
    try {
      const recipesRef = collection(db, "mealLibrary");
      const q = query(recipesRef, orderBy("name"));
      const snapshot = await getDocs(q);

      const firebaseRecipes = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as MealLibraryItem[];

      if (firebaseRecipes.length > 0) {
        setRecipes(firebaseRecipes);
      } else {
        loadLocalRecipes();
      }
    } catch (error: any) {
      console.log("Firebase unavailable, using local recipes");
      loadLocalRecipes();
    } finally {
      setLoadingRecipes(false);
    }
  };

  const loadLocalRecipes = () => {
    // Kept as-is from existing codebase
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useMealStore } = require("../state/mealStore");
    const state = useMealStore.getState();

    if (state.mealLibrary.length === 0) {
      state.initializeMealLibrary();
    }

    const updatedState = useMealStore.getState();
    setRecipes(updatedState.mealLibrary);
  };

  // Filter recipes
  const filteredRecipes = recipes.filter((recipe) => {
    // First, apply meal type filter
    if (!libraryItemMatchesMealType(recipe, selectedMealTypeFilter)) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        recipe.name.toLowerCase().includes(q) ||
        recipe.ingredients?.some((ing) => ing.toLowerCase().includes(q)) ||
        recipe.tags?.some((tag) => tag.toLowerCase().includes(q));

      if (!matchesSearch) return false;
    }

    if (!selectedFilters.includes("All")) {
      // Only apply prep type filters (not category, since we have dedicated meal type filter)
      const prepTypeMatch = selectedFilters.some(
        (f) => f.toLowerCase() === PREP_TYPE_LABELS[recipe.prepType].toLowerCase()
      );

      if (!prepTypeMatch) return false;
    }

    return true;
  });

  const handleToggle = async (view: MealsView) => {
    if (view === activeView) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // ignore haptics failures
    }
    setActiveView(view);
  };

  const handleFilterChipPress = async (filter: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore haptics failures
    }

    if (filter === "All") {
      setSelectedFilters(["All"]);
    } else {
      const newFilters = selectedFilters.includes(filter)
        ? selectedFilters.filter((f) => f !== filter)
        : [...selectedFilters.filter((f) => f !== "All"), filter];

      setSelectedFilters(newFilters.length === 0 ? ["All"] : newFilters);
    }
  };

  const handleAddToTripPress = async (recipe: MealLibraryItem) => {
    // Gate: PRO required to add meals to trips
    if (!requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "meals_add_to_trip", variant }),
    })) {
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // ignore haptics failures
    }
    setSelectedRecipe(recipe);
    setSelectedTripForAdd(activeTrips.length > 0 ? activeTrips[0].id : null);
    setSelectedMealType(recipe.category);
    setSelectedDay(1);
    setShowAddToTrip(true);
  };

  const handleConfirmAddToTrip = async () => {
    if (!selectedRecipe || !selectedTripForAdd) return;

    try {
      const mealData = {
        name: selectedRecipe.name,
        category: selectedMealType,
        dayIndex: selectedDay,
        sourceType: "library" as const,
        libraryId: selectedRecipe.id,
        prepType: selectedRecipe.prepType,
        ingredients: selectedRecipe.ingredients,
        notes: selectedRecipe.instructions || undefined,
      };

      await LocalMealService.addMeal(selectedTripForAdd, mealData);

      const trip = trips.find((t) => t.id === selectedTripForAdd);
      const tripName = trip?.name || "trip";
      const dayText = `Day ${selectedDay}`;
      const mealTypeText = CATEGORY_LABELS[selectedMealType];

      setToastMessage(`Added to ${tripName} · ${mealTypeText}, ${dayText}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      setShowAddToTrip(false);

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // ignore haptics failures
      }
    } catch (error) {
      console.error("Failed to add meal to trip:", error);
    }
  };

  const handleSaveCustomMeal = async (mealData: {
    name: string;
    category: MealCategory;
    prepType: PrepType;
    difficulty: any;
    ingredients: string[];
    instructions?: string;
    tags?: string[];
  }) => {
    // Gate: PRO required to add custom meals
    if (!requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "meals_custom", variant }),
    })) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useMealStore } = require("../state/mealStore");
    const addCustomMeal = useMealStore.getState().addCustomMeal;

    addCustomMeal(mealData);

    // Reload recipes to include the new custom meal
    loadLocalRecipes();

    // Show toast
    setToastMessage(`Added "${mealData.name}" to your recipe library`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore haptics failures
    }
  };

  const filterOptions = [
    "All",
    "Breakfast",
    "Lunch",
    "Dinner",
    "Snacks",
    "No cook",
    "Camp stove",
    "Campfire",
  ];

  const renderRecipeCard = ({ item }: { item: MealLibraryItem }) => {
    const prepTypeLabel = PREP_TYPE_LABELS[item.prepType];
    const categoryLabel = CATEGORY_LABELS[item.category];

    return (
      <View className="bg-white rounded-xl p-4 mb-3 border border-stone-200 shadow-sm">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-base mb-1" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}>
              {item.name}
            </Text>

            <Text className="text-sm mb-2" style={{ fontFamily: "SourceSans3_400Regular", color: "#5a5a5a" }}>
              {categoryLabel} • {prepTypeLabel} • {item.difficulty === "easy" ? "Easy" : "Moderate"}
            </Text>

            {item.tags && item.tags.length > 0 && (
              <View className="flex-row flex-wrap gap-1.5">
                {item.tags.slice(0, 2).map((tag, index) => (
                  <View key={index} className="px-2 py-0.5 rounded bg-stone-100">
                    <Text className="text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: "#5a5a5a" }}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View className="items-end">
            <Pressable
              onPress={() => activeTrips.length > 0 && handleAddToTripPress(item)}
              disabled={activeTrips.length === 0}
              className={`rounded-lg px-3 py-2 ${activeTrips.length === 0 ? "bg-stone-300" : "bg-forest active:opacity-80"}`}
              style={{ minWidth: 100 }}
            >
              <View className="flex-row items-center justify-center">
                <Text
                  className={`text-sm mr-1 ${activeTrips.length === 0 ? "text-stone-500" : "text-white"}`}
                  style={{ fontFamily: "SourceSans3_600SemiBold" }}
                >
                  Add to trip
                </Text>
                <Ionicons name="chevron-forward" size={14} color={activeTrips.length === 0 ? "#78716c" : "white"} />
              </View>
            </Pressable>

            {activeTrips.length === 0 && (
              <Text className="text-xs mt-1 text-center" style={{ fontFamily: "SourceSans3_400Regular", color: "#999", maxWidth: 100 }}>
                Create a trip first
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const bottomSpacer = 50 + Math.max(insets.bottom, 18) + 12;

  return (
    <View className="flex-1 bg-parchment">
      {/* Toggle */}
      <View className="px-4 pt-4 pb-3">
        <View className="flex-row rounded-xl p-1" style={{ backgroundColor: '#D9CDAF' }}>
          <Pressable
            onPress={() => handleToggle("planner")}
            className={`flex-1 py-2 rounded-lg ${activeView === "planner" ? "bg-forest" : "bg-transparent"}`}
          >
            <Text
              className={`text-center text-sm ${activeView === "planner" ? "text-white" : "text-forest"}`}
              style={{ fontFamily: "SourceSans3_600SemiBold" }}
            >
              Trip meals
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleToggle("recipes")}
            className={`flex-1 py-2 rounded-lg ${activeView === "recipes" ? "bg-forest" : "bg-transparent"}`}
          >
            <Text
              className={`text-center text-sm ${activeView === "recipes" ? "text-white" : "text-forest"}`}
              style={{ fontFamily: "SourceSans3_600SemiBold" }}
            >
              Meal ideas
            </Text>
          </Pressable>
        </View>
      </View>

      {/* VIEW 1: Meal Planner */}
      {activeView === "planner" &&
        (activeTrips.length === 0 ? (
          <View style={{ flex: 1, backgroundColor: "#F4EBD0" }}>
            <EmptyState
              iconName="calendar"
              title="No Active Trips"
              message="Your camp stove is so cold."
              ctaLabel="Plan a New Trip"
              onPress={() => {
                const canProceed = requirePro({
                  openAccountModal: () => setShowAccountModal(true),
                  openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "create_trip", variant }),
                });
                if (!canProceed) return;
                navigation.navigate("CreateTrip");
              }}
            />
          </View>
        ) : (
          <View className="flex-1">
            <View className="px-4 pb-3">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="calendar" size={24} color={DEEP_FOREST} />
                  <Text className="ml-2 text-lg" style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}>
                    Plan trip meals
                  </Text>
                </View>
                <View className="bg-forest rounded-full px-3 py-1">
                  <Text className="text-xs text-white" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                    {activeTrips.length} {activeTrips.length === 1 ? "trip" : "trips"}
                  </Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {activeTrips.map((trip) => (
                  <Pressable
                    key={trip.id}
                    onPress={() => navigation.navigate("MealPlanning", { tripId: trip.id })}
                    className="bg-parchment rounded-2xl p-4 border border-parchmentDark active:opacity-90"
                    style={{ width: 220 }}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Ionicons name="restaurant" size={20} color={EARTH_GREEN} />
                      <Ionicons name="arrow-forward-circle" size={24} color={EARTH_GREEN} />
                    </View>
                    <Text
                      className="text-base mb-1"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                      numberOfLines={1}
                    >
                      {trip.name}
                    </Text>
                    <Text className="text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: "#5a5a5a" }}>
                      {new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
                      {new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Helpful info section */}
            {activeTrips.length > 0 && (
              <View className="px-4 pt-4">
                <View className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <View className="flex-row items-start">
                    <Ionicons
                      name="bulb-outline"
                      size={20}
                      color="#d97706"
                      style={{ marginTop: 2, marginRight: 8 }}
                    />
                    <View className="flex-1">
                      <Text className="text-sm mb-1" style={{ fontFamily: "SourceSans3_600SemiBold", color: "#92400e" }}>
                        Tip: Build your meal plan
                      </Text>
                      <Text className="text-sm" style={{ fontFamily: "SourceSans3_400Regular", color: "#78350f" }}>
                        Tap a trip to plan breakfast, lunch, dinner, and snacks for each day. Or browse Meal ideas to add
                        meals directly.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        ))}

      {/* VIEW 2: Meal Ideas */}
      {activeView === "recipes" && (
        <View className="flex-1">
          <View className="px-4 pb-3">
            <View className="mb-2 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-lg mb-1" style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}>
                  Camp Recipe Library
                </Text>
                <Text className="text-sm" style={{ fontFamily: "SourceSans3_400Regular", color: "#5a5a5a" }}>
                  Simple meals you can add to any trip.
                </Text>
              </View>
              <Pressable
                onPress={async () => {
                  try {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } catch {
                    // ignore haptics failures
                  }
                  // Gate: PRO required to add custom meals
                  if (!requirePro({
                    openAccountModal: () => setShowAccountModal(true),
                    openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "meals_custom", variant }),
                  })) {
                    return;
                  }
                  setShowAddCustomMeal(true);
                }}
                className="ml-3 bg-forest rounded-full p-2 active:opacity-80"
              >
                <Ionicons name="add" size={24} color={PARCHMENT} />
              </Pressable>
            </View>

            {/* Meal Type Segmented Control */}
            <View className="flex-row mb-3 rounded-xl overflow-hidden border border-stone-200">
              <Pressable
                onPress={async () => {
                  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  setSelectedMealTypeFilter("all");
                }}
                className="flex-1 py-2.5 items-center"
                style={{ backgroundColor: selectedMealTypeFilter === "all" ? DEEP_FOREST : "#FFFFFF" }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 13,
                    color: selectedMealTypeFilter === "all" ? PARCHMENT : DEEP_FOREST,
                  }}
                >
                  All
                </Text>
              </Pressable>
              {MEAL_TYPES.map((mt) => (
                <Pressable
                  key={mt.key}
                  onPress={async () => {
                    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setSelectedMealTypeFilter(mt.key);
                  }}
                  className="flex-1 py-2.5 items-center border-l border-stone-200"
                  style={{ backgroundColor: selectedMealTypeFilter === mt.key ? DEEP_FOREST : "#FFFFFF" }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 13,
                      color: selectedMealTypeFilter === mt.key ? PARCHMENT : DEEP_FOREST,
                    }}
                  >
                    {mt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Search */}
            <View className="flex-row items-center bg-white rounded-xl px-4 py-3 border border-stone-200 mb-3">
              <Ionicons name="search" size={20} color={EARTH_GREEN} />
              <TextInput
                className="flex-1 ml-2"
                style={{ fontFamily: "SourceSans3_400Regular", fontSize: 16, color: DEEP_FOREST }}
                placeholder="Search recipes"
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color={EARTH_GREEN} />
                </Pressable>
              )}
            </View>

            {/* Prep Type Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[
                "All",
                "No cook",
                "Camp stove",
                "Campfire",
              ].map((filter) => {
                const isSelected = selectedFilters.includes(filter);
                return (
                  <Pressable
                    key={filter}
                    onPress={() => handleFilterChipPress(filter)}
                    className={`px-4 py-2 rounded-full border ${
                      isSelected ? "bg-forest border-forest" : "bg-white border-stone-300"
                    }`}
                  >
                    <Text
                      className={isSelected ? "text-white" : "text-forest"}
                      style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14 }}
                    >
                      {filter}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Recipe List */}
          {loadingRecipes ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={DEEP_FOREST} />
              <Text className="mt-4" style={{ fontFamily: "SourceSans3_400Regular", color: "#5a5a5a" }}>
                Loading recipes...
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredRecipes}
              renderItem={renderRecipeCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: bottomSpacer }}
              ListEmptyComponent={
                <View className="items-center justify-center py-12">
                  <Ionicons name="book-outline" size={48} color={EARTH_GREEN} />
                  <Text className="text-center mt-4 mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}>
                    No recipes yet
                  </Text>
                  <Text className="text-center mb-4 px-8" style={{ fontFamily: "SourceSans3_400Regular", color: "#5a5a5a" }}>
                    You can start by adding your favorite camp meals. They will show up here for future trips.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* Add to Trip Modal */}
      <Modal visible={showAddToTrip} animationType="fade" transparent={true} onRequestClose={() => setShowAddToTrip(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <SafeAreaView className="bg-parchment rounded-t-2xl" edges={["bottom"]}>
            {/* Header - Deep Forest Green background */}
            <View
              style={{
                paddingTop: 30,
                paddingHorizontal: 20,
                paddingBottom: 20,
                backgroundColor: DEEP_FOREST,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: "Raleway_700Bold", fontSize: 24, color: PARCHMENT, flex: 1, marginRight: 12 }}>
                  Add to trip
                </Text>
                <Pressable
                  onPress={() => setShowAddToTrip(false)}
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

            <View className="p-6">
              {selectedRecipe && (
                <View className="mb-4">
                  <Text className="text-base" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}>
                    {selectedRecipe.name}
                  </Text>
                </View>
              )}

              {/* Select Trip */}
              {activeTrips.length > 1 && (
                <View className="mb-4">
                  <Text className="text-sm mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}>
                    Select Trip
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {activeTrips.map((trip) => (
                      <Pressable
                        key={trip.id}
                        onPress={() => setSelectedTripForAdd(trip.id)}
                        className={`px-4 py-2 rounded-xl border ${
                          selectedTripForAdd === trip.id ? "bg-forest border-forest" : "bg-parchment border-parchmentDark"
                        }`}
                      >
                        <Text
                          className={selectedTripForAdd === trip.id ? "text-white" : "text-forest"}
                          style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14 }}
                        >
                          {trip.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Select Meal Type */}
              <View className="mb-4">
                <Text className="text-sm mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}>
                  Meal Type
                </Text>
                <View className="flex-row gap-2">
                  {(Object.keys(CATEGORY_LABELS) as MealCategory[]).map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setSelectedMealType(cat)}
                      className={`flex-1 px-3 py-2 rounded-xl border ${
                        selectedMealType === cat ? "bg-forest border-forest" : "bg-parchment border-parchmentDark"
                      }`}
                    >
                      <Text
                        className={`text-center text-xs ${selectedMealType === cat ? "text-white" : "text-forest"}`}
                        style={{ fontFamily: "SourceSans3_600SemiBold" }}
                      >
                        {CATEGORY_LABELS[cat]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Select Day */}
              {selectedTripForAdd && (
                <View className="mb-6">
                  <Text className="text-sm mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}>
                    Day
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {(() => {
                      const trip = trips.find((t) => t.id === selectedTripForAdd);
                      const tripDays = trip
                        ? Math.ceil(
                            (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
                              (1000 * 60 * 60 * 24)
                          ) + 1
                        : 1;

                      return Array.from({ length: tripDays }, (_, i) => i + 1).map((day) => (
                        <Pressable
                          key={day}
                          onPress={() => setSelectedDay(day)}
                          className={`px-4 py-2 rounded-xl border ${
                            selectedDay === day ? "bg-forest border-forest" : "bg-white border-stone-300"
                          }`}
                        >
                          <Text
                            className={selectedDay === day ? "text-white" : "text-forest"}
                            style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14 }}
                          >
                            Day {day}
                          </Text>
                        </Pressable>
                      ));
                    })()}
                  </ScrollView>
                </View>
              )}

              {/* Confirm Button */}
              <Pressable onPress={handleConfirmAddToTrip} className="bg-forest rounded-xl py-3 items-center active:opacity-90">
                <Text className="text-white text-base" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                  Add to trip
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Add Custom Meal Modal */}
      <AddCustomMealModal visible={showAddCustomMeal} onClose={() => setShowAddCustomMeal(false)} onSave={handleSaveCustomMeal} />

      {/* Toast Notification */}
      {showToast && (
        <View className="absolute bottom-20 left-4 right-4 bg-forest rounded-xl px-4 py-3 flex-row items-center shadow-lg" style={{ elevation: 5 }}>
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <Text className="text-white ml-2 flex-1" style={{ fontFamily: "SourceSans3_400Regular" }}>
            {toastMessage}
          </Text>
        </View>
      )}

      {loadingRecipes && activeView === "recipes" && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1000, pointerEvents: 'none' }}>
          <FireflyLoader />
        </View>
      )}

      {/* Gating Modals */}
      <AccountRequiredModal
        visible={showAccountModal}
        onCreateAccount={() => {
          setShowAccountModal(false);
          navigation.navigate("Auth" as any);
        }}
        onMaybeLater={() => setShowAccountModal(false)}
      />
    </View>
  );
}
