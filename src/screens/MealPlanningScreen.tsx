/**
 * Meal Planning Screen - Plan meals for a specific trip
 * Day-by-day meal planning with breakfast, lunch, dinner, and snacks
 * 
 * UX Directive: User chooses. App never "slot machines" a meal into a field without consent.
 * - Suggest opens SuggestionPickerSheet (user must tap Add/Replace)
 * - Auto-fill opens AutoFillPreviewSheet (user must confirm)
 * - Plan/Recipes toggle for browsing
 */

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTripsStore } from "../state/tripsStore";
import { useMealLibrary, useMealStore } from "../state/mealStore";
import AccountButton from "../components/AccountButton";
import { RootStackParamList } from "../navigation/types";
import { Meal, MealCategory, MealLibraryItem, PrepType, SuggestibleMealCategory } from "../types/meal";
import * as MealService from "../services/mealsService";
import * as LocalMealService from "../services/localMealService";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  PARCHMENT,
  BORDER_SOFT,
  TEXT_SECONDARY,
  CARD_BACKGROUND_LIGHT,
} from "../constants/colors";
import { requirePro } from "../utils/gating";
import AccountRequiredModal from "../components/AccountRequiredModal";
import InfoButton from "../components/InfoButton";
import OnboardingModal from "../components/OnboardingModal";
import { useScreenOnboarding } from "../hooks/useScreenOnboarding";
import MealSlotSheet from "../components/MealSlotSheet";
import SuggestionPickerSheet from "../components/SuggestionPickerSheet";
import AutoFillPreviewSheet from "../components/AutoFillPreviewSheet";
import {
  MealSuggestion,
  getQuickSuggestion,
  getAutoFillSuggestions,
  SuggestionContext,
} from "../services/mealSuggestionService";
import { getMealLibrary } from "../services/mealsService";

type MealPlanningScreenRouteProp = RouteProp<RootStackParamList, "MealPlanning">;
type MealPlanningScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "MealPlanning"
>;

const MEAL_CATEGORIES: {
  key: MealCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "breakfast", label: "Breakfast", icon: "sunny" },
  { key: "lunch", label: "Lunch", icon: "restaurant" },
  { key: "dinner", label: "Dinner", icon: "moon" },
  { key: "snack", label: "Snacks", icon: "ice-cream" },
  { key: "beverages", label: "Beverages", icon: "water" },
];

// Default beverages to auto-populate (alphabetized)
const DEFAULT_BEVERAGES = [
  "Adult Beverages",
  "Coffee",
  "Drinking Water",
  "Hot Chocolate",
  "Juice",
  "Milk",
  "Soda",
  "Tea",
];

type ViewMode = "plan" | "recipes";

export default function MealPlanningScreen() {
  const navigation = useNavigation<MealPlanningScreenNavigationProp>();
  const route = useRoute<MealPlanningScreenRouteProp>();
  const { tripId } = route.params;

  const trip = useTripsStore((s) => s.getTripById(tripId));
  const mealLibrary = useMealLibrary();
  const userId = "demo_user_1"; // TODO: Get from auth

  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [useLocalStorage, setUseLocalStorage] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SuggestibleMealCategory>("breakfast");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCustomMealForm, setShowCustomMealForm] = useState(false);

  // Custom meal form state
  const [customMealName, setCustomMealName] = useState("");
  const [customMealIngredients, setCustomMealIngredients] = useState("");
  const [customMealInstructions, setCustomMealInstructions] = useState("");

  // MealSlotSheet state
  const [showMealSheet, setShowMealSheet] = useState(false);
  const [mealSheetInitialTab, setMealSheetInitialTab] = useState<"suggest" | "recipes" | "custom">("suggest");
  const [autoFilling, setAutoFilling] = useState(false);

  // NEW: View toggle state (Plan vs Recipes)
  const [viewMode, setViewMode] = useState<ViewMode>("plan");
  const [activeMealContext, setActiveMealContext] = useState<MealCategory | null>(null);

  // NEW: SuggestionPickerSheet state
  const [showSuggestionPicker, setShowSuggestionPicker] = useState(false);
  
  // NEW: AutoFillPreviewSheet state
  const [showAutoFillPreview, setShowAutoFillPreview] = useState(false);

  // NEW: Toast/Undo state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<(() => void) | null>(null);
  const [lastAddedMealIds, setLastAddedMealIds] = useState<string[]>([]);

  // NEW: Recipes view state
  const [allRecipes, setAllRecipes] = useState<MealLibraryItem[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipeFilter, setRecipeFilter] = useState<MealCategory | "all">("all");
  const [recipeSearch, setRecipeSearch] = useState("");

  // Beverages checklist state - tracks which beverages are selected per day
  // Key format: "day_beverageName" e.g., "1_Coffee"
  const [selectedBeverages, setSelectedBeverages] = useState<Set<string>>(new Set());

  // Gating modal state
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Onboarding modal
  const { showModal, currentTooltip, dismissModal, openModal } = useScreenOnboarding("MealPlanning");

  // Calculate number of days
  const tripDays = trip
    ? Math.ceil(
        (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 1;

  // Build suggestion context from trip
  const suggestionContext: SuggestionContext = {
    tripType: trip?.tripType || "camping",
    partySize: trip?.numCampers || 2,
    hasCampfire: true, // Could be derived from campsite info
    hasStove: true,    // Could be derived from gear list
  };

  // Load meals for trip
  const loadMeals = useCallback(async () => {
    if (!trip) return;

    setLoading(true);
    try {
      if (!useLocalStorage) {
        try {
          const tripMeals = await MealService.getTripMeals(userId, tripId);
          setMeals(tripMeals);
          return;
        } catch (fbError: any) {
          if (
            fbError?.code === "permission-denied" ||
            fbError?.message?.toLowerCase?.().includes("permission")
          ) {
            console.log("Using local storage for meals");
          }
          setUseLocalStorage(true);
        }
      }

      const tripMeals = await LocalMealService.getTripMeals(tripId);
      setMeals(tripMeals);
    } catch (error) {
      console.error("Failed to load meals:", error);
      setMeals([]);
    } finally {
      setLoading(false);
    }
  }, [tripId, trip, userId, useLocalStorage]);

  useEffect(() => {
    loadMeals();
  }, [loadMeals]);

  const handleAddMealFromLibrary = async (libraryMeal: MealLibraryItem) => {
    // Gate: PRO required to add meals
    if (!requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "meal_planning_add", variant }),
    })) {
      return;
    }

    try {
      const mealData = {
        name: libraryMeal.name,
        category: selectedCategory,
        dayIndex: selectedDay,
        sourceType: "library" as const,
        libraryId: libraryMeal.id,
        prepType: libraryMeal.prepType,
        ingredients: libraryMeal.ingredients,
        notes: libraryMeal.instructions || undefined,
      };

      if (useLocalStorage) {
        await LocalMealService.addMeal(tripId, mealData);
      } else {
        try {
          await MealService.addMeal(userId, tripId, mealData);
        } catch (fbError: any) {
          if (
            fbError?.code === "permission-denied" ||
            fbError?.message?.toLowerCase?.().includes("permission")
          ) {
            setUseLocalStorage(true);
            await LocalMealService.addMeal(tripId, mealData);
          } else {
            throw fbError;
          }
        }
      }

      await loadMeals();
      setShowAddMeal(false);
      setSearchQuery("");

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // ignore haptics failures
      }
    } catch (error) {
      console.error("Failed to add meal:", error);
    }
  };

  const handleAddCustomMeal = async () => {
    if (!customMealName.trim()) return;

    // Gate: PRO required to add custom meals
    if (!requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "meal_planning_custom", variant }),
    })) {
      return;
    }

    try {
      const ingredients = customMealIngredients
        .split("\n")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      const mealData = {
        name: customMealName.trim(),
        category: selectedCategory,
        dayIndex: selectedDay,
        sourceType: "custom" as const,
        prepType: "noCook" as PrepType,
        ingredients: ingredients.length > 0 ? ingredients : undefined,
        notes: customMealInstructions.trim() || undefined,
      };

      if (useLocalStorage) {
        await LocalMealService.addMeal(tripId, mealData);
      } else {
        try {
          await MealService.addMeal(userId, tripId, mealData);
        } catch (fbError: any) {
          if (
            fbError?.code === "permission-denied" ||
            fbError?.message?.toLowerCase?.().includes("permission")
          ) {
            setUseLocalStorage(true);
            await LocalMealService.addMeal(tripId, mealData);
          } else {
            throw fbError;
          }
        }
      }

      await loadMeals();

      // Reset form and close
      setCustomMealName("");
      setCustomMealIngredients("");
      setCustomMealInstructions("");
      setShowCustomMealForm(false);
      setShowAddMeal(false);

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // ignore haptics failures
      }
    } catch (error) {
      console.error("Failed to add custom meal:", error);
    }
  };

  const handleDeleteMeal = async (meal: Meal) => {
    // Gate: PRO required to delete meals
    if (!requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "meal_planning_delete", variant }),
    })) {
      return;
    }

    try {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // ignore haptics failures
      }

      if (useLocalStorage) {
        await LocalMealService.deleteMeal(tripId, meal.id);
      } else {
        try {
          await MealService.deleteMeal(userId, tripId, meal.id);
        } catch (fbError: any) {
          if (
            fbError?.code === "permission-denied" ||
            fbError?.message?.toLowerCase?.().includes("permission")
          ) {
            setUseLocalStorage(true);
            await LocalMealService.deleteMeal(tripId, meal.id);
          } else {
            throw fbError;
          }
        }
      }

      await loadMeals();

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // ignore haptics failures
      }
    } catch (error) {
      console.error("Failed to delete meal:", error);
    }
  };

  // Handler: Open MealSlotSheet for a category with specific tab
  const handleOpenMealSheet = (category: SuggestibleMealCategory, tab: "suggest" | "recipes" | "custom" = "suggest") => {
    // Gate: PRO required for suggestions
    if (tab === "suggest") {
      if (!requirePro({
        openAccountModal: () => setShowAccountModal(true),
        openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "meal_suggestions", variant }),
      })) {
        return;
      }
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(category);
    setMealSheetInitialTab(tab);
    setShowMealSheet(true);
  };

  // Legacy: Handler kept for backwards compatibility
  const handleOpenSuggestionPicker = (category: SuggestibleMealCategory) => {
    handleOpenMealSheet(category, "suggest");
  };

  // NEW: Handler: Add suggestion from picker (user explicitly chose)
  const handleAddSuggestionFromPicker = async (suggestion: MealSuggestion) => {
    try {
      await addMealFromSuggestion(suggestion);
      setShowSuggestionPicker(false);
      showToast(`Added to ${MEAL_CATEGORIES.find(c => c.key === suggestion.category)?.label || 'meal'}`);
    } catch (error) {
      console.error("Failed to add suggestion:", error);
    }
  };

  // NEW: Handler: Replace existing meal with suggestion
  const handleReplaceSuggestionFromPicker = async (suggestion: MealSuggestion) => {
    try {
      // Delete existing meals in this category for this day
      const existingMeals = dayMeals.filter(m => m.category === selectedCategory);
      for (const meal of existingMeals) {
        if (useLocalStorage) {
          await LocalMealService.deleteMeal(tripId, meal.id);
        } else {
          await MealService.deleteMeal(userId, tripId, meal.id);
        }
      }
      
      // Add the new suggestion
      await addMealFromSuggestion(suggestion);
      setShowSuggestionPicker(false);
      showToast(`Replaced ${MEAL_CATEGORIES.find(c => c.key === suggestion.category)?.label || 'meal'}`);
      
      // Store for undo
      setLastAddedMealIds(existingMeals.map(m => m.id));
    } catch (error) {
      console.error("Failed to replace with suggestion:", error);
    }
  };

  // NEW: Handler: Browse recipes from suggestion picker
  const handleBrowseRecipesFromPicker = () => {
    setShowSuggestionPicker(false);
    setViewMode("recipes");
    setActiveMealContext(selectedCategory);
    setRecipeFilter(selectedCategory);
    loadAllRecipes();
  };

  // NEW: Show toast with optional undo
  const showToast = (message: string, undoFn?: () => void) => {
    setToastMessage(message);
    setUndoAction(undoFn ? () => undoFn : null);
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setToastMessage(null);
      setUndoAction(null);
    }, 4000);
  };

  // NEW: Load all recipes for Recipes view
  const loadAllRecipes = async () => {
    if (allRecipes.length > 0) return; // Already loaded
    
    setRecipesLoading(true);
    try {
      // Try to load from Firebase first
      const breakfastRecipes = await getMealLibrary("breakfast");
      const lunchRecipes = await getMealLibrary("lunch");
      const dinnerRecipes = await getMealLibrary("dinner");
      const snackRecipes = await getMealLibrary("snack");
      
      const combined = [...breakfastRecipes, ...lunchRecipes, ...dinnerRecipes, ...snackRecipes];
      
      if (combined.length > 0) {
        setAllRecipes(combined);
      } else {
        // Fallback to local meal library
        const state = useMealStore.getState();
        if (state.mealLibrary.length === 0) {
          state.initializeMealLibrary();
        }
        setAllRecipes(useMealStore.getState().mealLibrary);
      }
    } catch (error) {
      console.log("[MealPlanning] Using local recipes");
      const state = useMealStore.getState();
      if (state.mealLibrary.length === 0) {
        state.initializeMealLibrary();
      }
      setAllRecipes(useMealStore.getState().mealLibrary);
    } finally {
      setRecipesLoading(false);
    }
  };

  // Handler: Add meal from suggestion
  const addMealFromSuggestion = async (suggestion: MealSuggestion) => {
    try {
      const mealData = {
        name: suggestion.name,
        category: suggestion.category,
        dayIndex: selectedDay,
        sourceType: suggestion.type === "recipe" ? ("library" as const) : ("custom" as const),
        libraryId: suggestion.recipeId || undefined,
        prepType: suggestion.prepType,
        ingredients: suggestion.ingredients,
        notes: suggestion.description || undefined,
      };

      if (useLocalStorage) {
        await LocalMealService.addMeal(tripId, mealData);
      } else {
        try {
          await MealService.addMeal(userId, tripId, mealData);
        } catch (fbError: any) {
          if (
            fbError?.code === "permission-denied" ||
            fbError?.message?.toLowerCase?.().includes("permission")
          ) {
            setUseLocalStorage(true);
            await LocalMealService.addMeal(tripId, mealData);
          } else {
            throw fbError;
          }
        }
      }

      await loadMeals();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to add meal from suggestion:", error);
    }
  };

  // Handler: MealSlotSheet recipe selection
  const handleSelectRecipe = async (recipe: MealLibraryItem) => {
    // Gate: PRO required
    if (!requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "meal_planning_recipe", variant }),
    })) {
      return;
    }

    await handleAddMealFromLibrary(recipe);
  };

  // Handler: MealSlotSheet suggestion selection
  const handleSelectSuggestion = async (suggestion: MealSuggestion) => {
    // Gate: PRO required
    if (!requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "meal_suggestion", variant }),
    })) {
      return;
    }

    await addMealFromSuggestion(suggestion);
  };

  // Handler: MealSlotSheet custom meal
  const handleSheetCustomMeal = async (name: string, ingredients?: string[], notes?: string, saveToLibrary?: boolean) => {
    // Gate: PRO required
    if (!requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "meal_planning_custom", variant }),
    })) {
      return;
    }

    try {
      const mealData = {
        name,
        category: selectedCategory,
        dayIndex: selectedDay,
        sourceType: "custom" as const,
        prepType: "noCook" as PrepType,
        ingredients: ingredients || undefined,
        notes: notes || undefined,
      };

      if (useLocalStorage) {
        await LocalMealService.addMeal(tripId, mealData);
      } else {
        try {
          await MealService.addMeal(userId, tripId, mealData);
        } catch (fbError: any) {
          if (
            fbError?.code === "permission-denied" ||
            fbError?.message?.toLowerCase?.().includes("permission")
          ) {
            setUseLocalStorage(true);
            await LocalMealService.addMeal(tripId, mealData);
          } else {
            throw fbError;
          }
        }
      }

      // Save to user's recipe library if requested
      if (saveToLibrary && userId && !useLocalStorage) {
        try {
          await MealService.saveToUserMeals(userId, {
            name,
            category: selectedCategory,
            prepType: "noCook" as PrepType,
            ingredients: ingredients || [],
            instructions: notes,
          });
        } catch (libraryError) {
          console.error("Failed to save to user library:", libraryError);
          // Don't fail the whole operation if library save fails
        }
      }

      await loadMeals();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to add custom meal from sheet:", error);
    }
  };

  // NEW: Handler: Open AutoFillPreviewSheet (replaces direct auto-fill)
  const handleOpenAutoFillPreview = () => {
    // Gate: PRO required
    if (!requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "meal_autofill", variant }),
    })) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAutoFillPreview(true);
  };

  // Handler: Toggle beverage checkbox for a day
  const handleToggleBeverage = async (beverage: string) => {
    const key = `${selectedDay}_${beverage}`;
    setSelectedBeverages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore haptics failures
    }
  };

  // NEW: Handler: Confirm auto-fill from preview
  const handleConfirmAutoFill = async (suggestions: Record<SuggestibleMealCategory, MealSuggestion | null>) => {
    try {
      setAutoFilling(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const addedMealIds: string[] = [];

      // Add all confirmed suggestions
      for (const [category, suggestion] of Object.entries(suggestions)) {
        if (!suggestion) continue;
        
        // Only fill empty slots
        const existingMeals = dayMeals.filter((m) => m.category === category);
        if (existingMeals.length === 0) {
          const mealData = {
            name: suggestion.name,
            category: suggestion.category,
            dayIndex: selectedDay,
            sourceType: suggestion.type === "recipe" ? ("library" as const) : ("custom" as const),
            libraryId: suggestion.recipeId || undefined,
            prepType: suggestion.prepType,
            ingredients: suggestion.ingredients,
            notes: suggestion.description || undefined,
          };

          if (useLocalStorage) {
            const id = await LocalMealService.addMeal(tripId, mealData);
            if (id) addedMealIds.push(id);
          } else {
            try {
              const id = await MealService.addMeal(userId, tripId, mealData);
              if (id) addedMealIds.push(id);
            } catch (fbError: any) {
              if (
                fbError?.code === "permission-denied" ||
                fbError?.message?.toLowerCase?.().includes("permission")
              ) {
                setUseLocalStorage(true);
                const id = await LocalMealService.addMeal(tripId, mealData);
                if (id) addedMealIds.push(id);
              } else {
                throw fbError;
              }
            }
          }
        }
      }

      await loadMeals();
      setShowAutoFillPreview(false);
      setLastAddedMealIds(addedMealIds);
      
      // Show toast with undo
      showToast(`Day ${selectedDay} filled`, async () => {
        // Undo: delete all added meals
        for (const mealId of addedMealIds) {
          if (useLocalStorage) {
            await LocalMealService.deleteMeal(tripId, mealId);
          } else {
            await MealService.deleteMeal(userId, tripId, mealId);
          }
        }
        await loadMeals();
        showToast("Auto-fill undone");
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to auto-fill day:", error);
    } finally {
      setAutoFilling(false);
    }
  };

  // NEW: Handler: Browse recipes from auto-fill preview
  const handleBrowseRecipesFromAutoFill = (mealType: MealCategory) => {
    setShowAutoFillPreview(false);
    setViewMode("recipes");
    setActiveMealContext(mealType);
    setRecipeFilter(mealType);
    loadAllRecipes();
  };

  // NEW: Handler: Add recipe from Recipes view
  const handleAddRecipeToMeal = async (recipe: MealLibraryItem) => {
    // Gate: PRO required
    if (!requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "meal_planning_recipe", variant }),
    })) {
      return;
    }

    try {
      const targetCategory = activeMealContext || recipe.category;
      
      const mealData = {
        name: recipe.name,
        category: targetCategory,
        dayIndex: selectedDay,
        sourceType: "library" as const,
        libraryId: recipe.id,
        prepType: recipe.prepType,
        ingredients: recipe.ingredients,
        notes: recipe.instructions || undefined,
      };

      if (useLocalStorage) {
        await LocalMealService.addMeal(tripId, mealData);
      } else {
        try {
          await MealService.addMeal(userId, tripId, mealData);
        } catch (fbError: any) {
          if (
            fbError?.code === "permission-denied" ||
            fbError?.message?.toLowerCase?.().includes("permission")
          ) {
            setUseLocalStorage(true);
            await LocalMealService.addMeal(tripId, mealData);
          } else {
            throw fbError;
          }
        }
      }

      await loadMeals();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Return to plan view
      setViewMode("plan");
      setActiveMealContext(null);
      showToast(`Added to ${MEAL_CATEGORIES.find(c => c.key === targetCategory)?.label || 'meal'}`);
    } catch (error) {
      console.error("Failed to add recipe to meal:", error);
    }
  };

  if (!trip) {
    return null;
  }

  // Filter meals for current day
  const dayMeals = meals.filter((m) => m.dayIndex === selectedDay);

  // Filter library meals for modal
  const filteredLibrary = mealLibrary.filter((meal) => {
    if (meal.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const ingredients = (meal.ingredients || []) as string[];
      return (
        meal.name.toLowerCase().includes(q) ||
        ingredients.some((ing) => ing.toLowerCase().includes(q)) ||
        meal.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // NEW: Filter recipes for Recipes view
  const filteredRecipes = useMemo(() => {
    return allRecipes.filter((recipe) => {
      // Category filter
      if (recipeFilter !== "all" && recipe.category !== recipeFilter) return false;
      
      // Search filter
      if (recipeSearch.trim()) {
        const q = recipeSearch.toLowerCase();
        const matchesName = recipe.name.toLowerCase().includes(q);
        const matchesIngredient = recipe.ingredients?.some((i) => i.toLowerCase().includes(q));
        const matchesTag = recipe.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesIngredient && !matchesTag) return false;
      }
      
      return true;
    });
  }, [allRecipes, recipeFilter, recipeSearch]);

  return (
    <SafeAreaView className="flex-1 bg-parchment" edges={["top"]}>
      {/* Info button for onboarding */}
      <View style={{ position: "absolute", top: 18, right: 56, zIndex: 10 }}>
        <InfoButton onPress={openModal} color={DEEP_FOREST} size={22} />
      </View>
      
      {/* Header */}
      <View className="px-5 pt-4 pb-3 border-b border-stone-200">
        <View className="flex-row items-center mb-2 justify-between">
          <View className="flex-row items-center flex-1">
            <Pressable onPress={() => navigation.goBack()} className="mr-2 active:opacity-70">
              <Ionicons name="arrow-back" size={24} color={DEEP_FOREST} />
            </Pressable>
            <Text
              className="text-xl font-bold flex-1"
              style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
            >
              Meal Planning
            </Text>
          </View>
          <AccountButton />
        </View>
        <Text className="text-sm" style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}>
          For: {trip.name}
        </Text>

        {/* Trip Duration */}
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={16} color={EARTH_GREEN} />
            <Text className="ml-2 text-sm" style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}>
              {tripDays} {tripDays === 1 ? "day" : "days"}
            </Text>
          </View>

          {/* NEW: Plan/Recipes Toggle */}
          <View className="flex-row rounded-lg overflow-hidden border" style={{ borderColor: BORDER_SOFT }}>
            <Pressable
              onPress={() => setViewMode("plan")}
              className="px-4 py-1.5"
              style={{ backgroundColor: viewMode === "plan" ? DEEP_FOREST : "white" }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 13,
                  color: viewMode === "plan" ? PARCHMENT : EARTH_GREEN,
                }}
              >
                Plan
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setViewMode("recipes");
                loadAllRecipes();
              }}
              className="px-4 py-1.5"
              style={{ backgroundColor: viewMode === "recipes" ? DEEP_FOREST : "white" }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 13,
                  color: viewMode === "recipes" ? PARCHMENT : EARTH_GREEN,
                }}
              >
                Recipes
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Day Selector */}
      <View className="px-5 py-3 border-b border-stone-200">
        <Text className="text-xs mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: EARTH_GREEN }}>
          SELECT DAY
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {Array.from({ length: tripDays }, (_, i) => i + 1).map((day) => (
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
          ))}
        </ScrollView>
      </View>

      {/* PLAN VIEW */}
      {viewMode === "plan" && (
        <>
          {/* Meals List */}
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={DEEP_FOREST} />
            </View>
          ) : (
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
              {MEAL_CATEGORIES.map((category) => {
                const categoryMeals = dayMeals.filter((m) => m.category === category.key);

                // Special rendering for Beverages category
                if (category.key === "beverages") {
                  return (
                    <View key={category.key} className="px-5 mt-4">
                      {/* Category Header */}
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <Ionicons name={category.icon} size={20} color={DEEP_FOREST} />
                          <Text
                            className="ml-2 text-base"
                            style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
                          >
                            {category.label}
                          </Text>
                        </View>
                      </View>

                      {/* Beverages Checklist */}
                      <View className="bg-white rounded-xl p-4 mb-2 border border-stone-200">
                        <Text className="mb-3" style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: EARTH_GREEN }}>
                          Check beverages needed for Day {selectedDay}
                        </Text>
                        <View style={{ gap: 8 }}>
                          {DEFAULT_BEVERAGES.map((beverage) => {
                            const key = `${selectedDay}_${beverage}`;
                            const isSelected = selectedBeverages.has(key);
                            return (
                              <Pressable
                                key={beverage}
                                onPress={() => handleToggleBeverage(beverage)}
                                className="flex-row items-center py-2 active:opacity-70"
                              >
                                <View
                                  className={`w-6 h-6 rounded-md border-2 items-center justify-center mr-3 ${
                                    isSelected ? "bg-forest border-forest" : "bg-white border-stone-400"
                                  }`}
                                >
                                  {isSelected && (
                                    <Ionicons name="checkmark" size={16} color={PARCHMENT} />
                                  )}
                                </View>
                                <Text
                                  style={{
                                    fontFamily: "SourceSans3_400Regular",
                                    fontSize: 15,
                                    color: isSelected ? DEEP_FOREST : EARTH_GREEN,
                                  }}
                                >
                                  {beverage}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  );
                }

                return (
                  <View key={category.key} className="px-5 mt-4">
                    {/* Category Header */}
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <Ionicons name={category.icon} size={20} color={DEEP_FOREST} />
                        <Text
                          className="ml-2 text-base"
                          style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
                        >
                          {category.label}
                        </Text>
                      </View>
                    </View>

                    {/* Meals */}
                    {categoryMeals.length === 0 ? (
                      <View className="bg-white rounded-xl p-4 mb-2 border border-stone-200">
                        <Text className="text-center mb-3" style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}>
                          No {category.label.toLowerCase()} planned
                        </Text>
                        {/* Action buttons for empty slot */}
                        <View className="flex-row justify-center flex-wrap" style={{ gap: 8 }}>
                          <Pressable
                            onPress={() => handleOpenMealSheet(category.key as SuggestibleMealCategory, "suggest")}
                            className="flex-row items-center px-3 py-2 rounded-lg active:opacity-80"
                            style={{ backgroundColor: "rgba(26, 76, 57, 0.1)" }}
                          >
                            <Ionicons name="sparkles" size={14} color={EARTH_GREEN} />
                            <Text
                              className="ml-1.5"
                              style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 13, color: EARTH_GREEN }}
                            >
                              Suggest
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleOpenMealSheet(category.key as SuggestibleMealCategory, "recipes")}
                            className="flex-row items-center px-3 py-2 rounded-lg active:opacity-80"
                            style={{ backgroundColor: DEEP_FOREST }}
                          >
                            <Ionicons name="book-outline" size={14} color={PARCHMENT} />
                            <Text
                              className="ml-1.5"
                              style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 13, color: PARCHMENT }}
                            >
                              Recipes
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleOpenMealSheet(category.key as SuggestibleMealCategory, "custom")}
                            className="flex-row items-center px-3 py-2 rounded-lg active:opacity-80"
                            style={{ backgroundColor: "rgba(26, 76, 57, 0.1)" }}
                          >
                            <Ionicons name="create-outline" size={14} color={EARTH_GREEN} />
                            <Text
                              className="ml-1.5"
                              style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 13, color: EARTH_GREEN }}
                            >
                              Custom
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <>
                        {categoryMeals.map((meal) => (
                          <View
                            key={meal.id}
                            className="bg-white rounded-xl p-4 mb-2 border border-stone-200"
                          >
                            <View className="flex-row items-start justify-between">
                              <View className="flex-1">
                                <Text
                                  className="text-base mb-1"
                                  style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
                                >
                                  {meal.name}
                                </Text>
                                {meal.notes ? (
                                  <Text
                                    className="text-sm"
                                    style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                                    numberOfLines={2}
                                  >
                                    {meal.notes}
                                  </Text>
                                ) : null}
                              </View>
                              <Pressable onPress={() => handleDeleteMeal(meal)} className="ml-2 p-2 active:opacity-70">
                                <Ionicons name="trash-outline" size={20} color="#dc2626" />
                              </Pressable>
                            </View>
                            
                            {/* Footer actions for filled slot */}
                            <View className="flex-row mt-3 pt-3 border-t flex-wrap" style={{ borderColor: BORDER_SOFT, gap: 8 }}>
                              <Pressable
                                onPress={() => handleOpenMealSheet(category.key as SuggestibleMealCategory, "suggest")}
                                className="flex-row items-center px-3 py-1.5 rounded-lg active:opacity-80"
                                style={{ backgroundColor: "rgba(26, 76, 57, 0.1)" }}
                              >
                                <Ionicons name="sparkles" size={12} color={EARTH_GREEN} />
                                <Text
                                  className="ml-1"
                                  style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 12, color: EARTH_GREEN }}
                                >
                                  Suggest
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => handleOpenMealSheet(category.key as SuggestibleMealCategory, "recipes")}
                                className="flex-row items-center px-3 py-1.5 rounded-lg active:opacity-80"
                                style={{ backgroundColor: "rgba(26, 76, 57, 0.1)" }}
                              >
                                <Ionicons name="book-outline" size={12} color={EARTH_GREEN} />
                                <Text
                                  className="ml-1"
                                  style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 12, color: EARTH_GREEN }}
                                >
                                  Recipes
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => handleOpenMealSheet(category.key as SuggestibleMealCategory, "custom")}
                                className="flex-row items-center px-3 py-1.5 rounded-lg active:opacity-80"
                                style={{ backgroundColor: "rgba(26, 76, 57, 0.1)" }}
                              >
                                <Ionicons name="create-outline" size={12} color={EARTH_GREEN} />
                                <Text
                                  className="ml-1"
                                  style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 12, color: EARTH_GREEN }}
                                >
                                  Custom
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        ))}
                        {/* Add another button (show for snacks always, hide for others if meal exists) */}
                        {(category.key === "snack" || categoryMeals.length === 0) && (
                          <Pressable
                            onPress={() => handleOpenMealSheet(category.key as SuggestibleMealCategory)}
                            className="flex-row items-center justify-center py-2 mb-2 rounded-lg border border-dashed active:opacity-70"
                            style={{ borderColor: BORDER_SOFT }}
                          >
                            <Ionicons name="add" size={16} color={TEXT_SECONDARY} />
                            <Text
                              className="ml-1"
                              style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_SECONDARY }}
                            >
                              Add another
                            </Text>
                          </Pressable>
                        )}
                      </>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </>
      )}

      {/* RECIPES VIEW */}
      {viewMode === "recipes" && (
        <View className="flex-1">
          {/* Recipes Header */}
          <View className="px-5 py-3 border-b" style={{ borderColor: BORDER_SOFT }}>
            {activeMealContext && (
              <Text
                className="mb-2"
                style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: DEEP_FOREST }}
              >
                Adding to: {MEAL_CATEGORIES.find(c => c.key === activeMealContext)?.label}
              </Text>
            )}
            
            {/* Search bar */}
            <View className="flex-row items-center bg-white rounded-xl px-4 py-2.5 border" style={{ borderColor: BORDER_SOFT }}>
              <Ionicons name="search" size={18} color={EARTH_GREEN} />
              <TextInput
                className="flex-1 ml-2"
                style={{ fontFamily: "SourceSans3_400Regular", fontSize: 15, color: DEEP_FOREST }}
                placeholder="Search recipes..."
                placeholderTextColor={TEXT_SECONDARY}
                value={recipeSearch}
                onChangeText={setRecipeSearch}
              />
              {recipeSearch.length > 0 && (
                <Pressable onPress={() => setRecipeSearch("")}>
                  <Ionicons name="close-circle" size={18} color={EARTH_GREEN} />
                </Pressable>
              )}
            </View>

            {/* Category filter pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerStyle={{ gap: 8 }}
            >
              <Pressable
                onPress={() => setRecipeFilter("all")}
                className="px-3 py-1.5 rounded-full"
                style={{ backgroundColor: recipeFilter === "all" ? DEEP_FOREST : "rgba(26, 76, 57, 0.1)" }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 12,
                    color: recipeFilter === "all" ? PARCHMENT : EARTH_GREEN,
                  }}
                >
                  All
                </Text>
              </Pressable>
              {MEAL_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.key}
                  onPress={() => setRecipeFilter(cat.key)}
                  className="px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: recipeFilter === cat.key ? DEEP_FOREST : "rgba(26, 76, 57, 0.1)" }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 12,
                      color: recipeFilter === cat.key ? PARCHMENT : EARTH_GREEN,
                    }}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Recipe List */}
          {recipesLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={DEEP_FOREST} />
            </View>
          ) : (
            <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }}>
              {filteredRecipes.length === 0 ? (
                <View className="items-center justify-center py-12">
                  <Ionicons name="restaurant-outline" size={48} color={TEXT_SECONDARY} />
                  <Text
                    className="mt-3"
                    style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: DEEP_FOREST }}
                  >
                    No recipes found
                  </Text>
                  <Text
                    className="mt-1 text-center"
                    style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY }}
                  >
                    Try a different search or filter
                  </Text>
                </View>
              ) : (
                filteredRecipes.map((recipe) => (
                  <View
                    key={recipe.id}
                    className="bg-white rounded-xl p-4 mb-3 border"
                    style={{ borderColor: BORDER_SOFT }}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <Text
                          style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: DEEP_FOREST }}
                        >
                          {recipe.name}
                        </Text>
                        
                        {/* Tags */}
                        {recipe.tags && recipe.tags.length > 0 && (
                          <View className="flex-row flex-wrap mt-2" style={{ gap: 6 }}>
                            {recipe.tags.slice(0, 4).map((tag, idx) => (
                              <View
                                key={idx}
                                className="px-2 py-0.5 rounded"
                                style={{ backgroundColor: "rgba(26, 76, 57, 0.08)" }}
                              >
                                <Text
                                  style={{ fontFamily: "SourceSans3_400Regular", fontSize: 11, color: EARTH_GREEN }}
                                >
                                  {tag}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>

                      {/* Add to Meal Button */}
                      <Pressable
                        onPress={() => handleAddRecipeToMeal(recipe)}
                        className="ml-3 px-4 py-2 rounded-lg active:opacity-90"
                        style={{ backgroundColor: DEEP_FOREST }}
                      >
                        <Text
                          style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 13, color: PARCHMENT }}
                        >
                          {activeMealContext 
                            ? `Add to ${MEAL_CATEGORIES.find(c => c.key === activeMealContext)?.label}` 
                            : "Add"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* Add Meal Modal */}
      <Modal visible={showAddMeal} animationType="fade" transparent={true} onRequestClose={() => setShowAddMeal(false)}>
        <View className="flex-1 bg-black/50">
          <SafeAreaView className="flex-1" edges={["bottom"]}>
            <View className="flex-1 mt-20">
              <View className="flex-1 bg-parchment rounded-t-2xl">
                {/* Modal Header - Deep Forest Green background */}
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
                      Add {MEAL_CATEGORIES.find((c) => c.key === selectedCategory)?.label}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setShowAddMeal(false);
                        setShowCustomMealForm(false);
                        setSearchQuery("");
                      }}
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

                {/* Search */}
                {!showCustomMealForm && (
                  <View className="px-5 pt-3 pb-2">
                    <View className="flex-row items-center bg-white rounded-xl px-4 py-3 border border-stone-200">
                      <Ionicons name="search" size={20} color={EARTH_GREEN} />
                      <TextInput
                        className="flex-1 ml-2 text-forest"
                        style={{ fontFamily: "SourceSans3_400Regular", fontSize: 16 }}
                        placeholder="Search meals..."
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
                  </View>
                )}

                {/* Create Custom Meal Button */}
                {!showCustomMealForm && (
                  <View className="px-5 pb-3">
                    <Pressable
                      onPress={async () => {
                        try {
                          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch {
                          // ignore haptics failures
                        }
                        setShowCustomMealForm(true);
                      }}
                      className="rounded-xl py-3 flex-row items-center justify-center active:opacity-90"
                      style={{ backgroundColor: GRANITE_GOLD }}
                    >
                      <Ionicons name="create-outline" size={20} color={PARCHMENT} />
                      <Text className="ml-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
                        Create Custom Meal
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* Meal Library List */}
                <ScrollView className="flex-1 px-5">
                  {!showCustomMealForm &&
                    filteredLibrary.map((meal) => (
                      <Pressable
                        key={meal.id}
                        onPress={() => handleAddMealFromLibrary(meal)}
                        className="bg-white rounded-xl p-4 mb-3 border border-stone-200 active:bg-stone-50"
                      >
                        <Text className="text-base mb-1" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}>
                          {meal.name}
                        </Text>
                        {meal.tags && meal.tags.length > 0 && (
                          <View className="flex-row flex-wrap gap-1 mt-2">
                            {meal.tags.slice(0, 3).map((tag, index) => (
                              <View key={index} className="px-2 py-0.5 rounded bg-stone-100">
                                <Text className="text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}>
                                  {tag}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </Pressable>
                    ))}

                  {!showCustomMealForm && filteredLibrary.length === 0 && (
                    <View className="items-center justify-center py-12">
                      <Ionicons name="search-outline" size={48} color={EARTH_GREEN} />
                      <Text className="text-center mt-4" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}>
                        No meals found
                      </Text>
                    </View>
                  )}

                  {/* Custom Meal Form */}
                  {showCustomMealForm && (
                    <View className="pb-6">
                      <View className="mb-4">
                        <Text className="text-sm mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}>
                          Meal Name *
                        </Text>
                        <TextInput
                          value={customMealName}
                          onChangeText={setCustomMealName}
                          placeholder="Enter meal name"
                          className="bg-white border border-stone-200 rounded-xl px-4 py-3"
                          style={{ fontFamily: "SourceSans3_400Regular", color: DEEP_FOREST }}
                          placeholderTextColor="#999"
                        />
                      </View>

                      <View className="mb-4">
                        <Text className="text-sm mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}>
                          Ingredients (optional)
                        </Text>
                        <Text className="text-xs mb-2" style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}>
                          One ingredient per line
                        </Text>
                        <TextInput
                          value={customMealIngredients}
                          onChangeText={setCustomMealIngredients}
                          placeholder={"Example:\nBread\nPeanut butter\nJelly"}
                          multiline
                          numberOfLines={4}
                          className="bg-white border border-stone-200 rounded-xl px-4 py-3"
                          style={{
                            fontFamily: "SourceSans3_400Regular",
                            color: DEEP_FOREST,
                            textAlignVertical: "top",
                          }}
                          placeholderTextColor="#999"
                        />
                      </View>

                      <View className="mb-6">
                        <Text className="text-sm mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}>
                          Instructions (optional)
                        </Text>
                        <TextInput
                          value={customMealInstructions}
                          onChangeText={setCustomMealInstructions}
                          placeholder="Enter preparation instructions"
                          multiline
                          numberOfLines={3}
                          className="bg-white border border-stone-200 rounded-xl px-4 py-3"
                          style={{
                            fontFamily: "SourceSans3_400Regular",
                            color: DEEP_FOREST,
                            textAlignVertical: "top",
                          }}
                          placeholderTextColor="#999"
                        />
                      </View>

                      <View className="flex-row" style={{ gap: 12 }}>
                        <Pressable
                          onPress={() => {
                            setShowCustomMealForm(false);
                            setCustomMealName("");
                            setCustomMealIngredients("");
                            setCustomMealInstructions("");
                          }}
                          className="flex-1 border border-stone-300 rounded-xl py-3 active:opacity-70"
                        >
                          <Text className="text-center" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}>
                            Cancel
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={handleAddCustomMeal}
                          disabled={!customMealName.trim()}
                          className={`flex-1 rounded-xl py-3 ${customMealName.trim() ? "active:opacity-90" : "opacity-50"}`}
                          style={{ backgroundColor: DEEP_FOREST }}
                        >
                          <Text className="text-center" style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
                            Add Meal
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </SafeAreaView>
        </View>
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

      {/* MealSlotSheet */}
      <MealSlotSheet
        visible={showMealSheet}
        onClose={() => setShowMealSheet(false)}
        category={selectedCategory}
        dayIndex={selectedDay}
        context={suggestionContext}
        initialTab={mealSheetInitialTab}
        onSelectRecipe={handleSelectRecipe}
        onSelectSuggestion={handleSelectSuggestion}
        onAddCustomMeal={handleSheetCustomMeal}
      />

      {/* NEW: SuggestionPickerSheet */}
      <SuggestionPickerSheet
        visible={showSuggestionPicker}
        onClose={() => setShowSuggestionPicker(false)}
        tripId={tripId}
        dayIndex={selectedDay}
        mealType={selectedCategory}
        existingEntryCount={dayMeals.filter(m => m.category === selectedCategory).length}
        tripContext={suggestionContext}
        onAddSuggestion={handleAddSuggestionFromPicker}
        onReplaceSuggestion={handleReplaceSuggestionFromPicker}
        onBrowseRecipes={handleBrowseRecipesFromPicker}
      />

      {/* NEW: AutoFillPreviewSheet */}
      <AutoFillPreviewSheet
        visible={showAutoFillPreview}
        onClose={() => setShowAutoFillPreview(false)}
        tripId={tripId}
        dayIndex={selectedDay}
        tripContext={suggestionContext}
        existingMealIds={dayMeals.map(m => m.libraryId).filter(Boolean) as string[]}
        onConfirm={handleConfirmAutoFill}
        onBrowseRecipes={handleBrowseRecipesFromAutoFill}
      />

      {/* Sticky Bottom Action Bar - Only show in Plan view */}
      {viewMode === "plan" && (
        <View
          className="absolute bottom-0 left-0 right-0 border-t"
          style={{
            backgroundColor: PARCHMENT,
            borderColor: BORDER_SOFT,
            paddingBottom: 34, // Safe area for home indicator
          }}
        >
          <View className="px-4 py-3">
            {/* Shopping List */}
            <Pressable
              onPress={() => navigation.navigate("ShoppingList", { tripId })}
              className="flex-row items-center justify-center py-3 rounded-xl active:opacity-90"
              style={{ backgroundColor: DEEP_FOREST }}
            >
              <Ionicons name="cart-outline" size={18} color={PARCHMENT} />
              <Text
                className="ml-2"
                style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: PARCHMENT }}
              >
                Shopping List
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* NEW: Toast with Undo */}
      {toastMessage && (
        <View
          className="absolute bottom-24 left-4 right-4 flex-row items-center justify-between px-4 py-3 rounded-xl"
          style={{ backgroundColor: DEEP_FOREST }}
        >
          <Text
            style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: PARCHMENT }}
          >
            {toastMessage}
          </Text>
          {undoAction && (
            <Pressable
              onPress={() => {
                undoAction();
                setToastMessage(null);
                setUndoAction(null);
              }}
              className="ml-3 px-3 py-1 rounded-lg active:opacity-80"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              <Text
                style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 13, color: PARCHMENT }}
              >
                Undo
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Onboarding Modal */}
      <OnboardingModal
        visible={showModal}
        tooltip={currentTooltip}
        onDismiss={dismissModal}
      />
    </SafeAreaView>
  );
}
