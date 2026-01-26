/**
 * Meal Slot Bottom Sheet
 * Bottom sheet for adding/editing a meal slot with:
 * - Quick Suggest section (3 tappable suggestions)
 * - Choose Recipe section (search + filter)
 * - Custom Meal section
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { MealLibraryItem, SuggestibleMealCategory } from "../types/meal";
import { MealType, mealCategoryToMealType } from "../constants/mealTypes";
import { libraryItemMatchesMealType } from "../utils/recipeMealTypeUtils";
import { MealSuggestion, getSuggestionsForCategory, SuggestionContext } from "../services/mealSuggestionService";
import { getMealLibrary } from "../services/mealsService";
import { useMealStore } from "../state/mealStore";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  CARD_BACKGROUND_LIGHT,
  GRANITE_GOLD,
} from "../constants/colors";

const CATEGORY_LABELS: Record<SuggestibleMealCategory, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const CATEGORY_ICONS: Record<SuggestibleMealCategory, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny",
  lunch: "restaurant",
  dinner: "moon",
  snack: "ice-cream",
};

const FILTER_CHIPS = [
  { key: "all", label: "All" },
  { key: "noCook", label: "No-cook" },
  { key: "campStove", label: "Stove" },
  { key: "campfire", label: "Campfire" },
  { key: "quick", label: "Quick" },
  { key: "vegetarian", label: "Vegetarian" },
  { key: "one-pot", label: "One-pot" },
];

interface MealSlotSheetProps {
  visible: boolean;
  onClose: () => void;
  category: SuggestibleMealCategory;
  dayIndex: number;
  context?: SuggestionContext;
  initialTab?: "suggest" | "recipes" | "custom";
  onSelectRecipe: (recipe: MealLibraryItem) => void;
  onSelectSuggestion: (suggestion: MealSuggestion) => void;
  onAddCustomMeal: (name: string, ingredients?: string[], notes?: string, saveToLibrary?: boolean) => void;
}

export default function MealSlotSheet({
  visible,
  onClose,
  category,
  dayIndex,
  context = {},
  initialTab = "suggest",
  onSelectRecipe,
  onSelectSuggestion,
  onAddCustomMeal,
}: MealSlotSheetProps) {
  // State
  const [activeSection, setActiveSection] = useState<"suggest" | "recipes" | "custom">("suggest");
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [recipes, setRecipes] = useState<MealLibraryItem[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  
  // Show all recipes toggle - when off, filter to current meal slot category
  const [showAllRecipes, setShowAllRecipes] = useState(false);

  // Custom meal form
  const [customName, setCustomName] = useState("");
  const [customIngredients, setCustomIngredients] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [saveToLibrary, setSaveToLibrary] = useState(true);

  // Load suggestions when sheet opens
  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const results = await getSuggestionsForCategory(category, context, 3);
        setSuggestions(results);
      } catch {
        console.log("[MealSlotSheet] Error loading suggestions");
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    if (visible) {
      fetchSuggestions();
      setActiveSection(initialTab);
      setSearchQuery("");
      setSelectedFilter("all");
      setShowAllRecipes(false); // Reset to filtered by meal slot
      resetCustomForm();
      // If opening to recipes tab, load them
      if (initialTab === "recipes") {
        loadRecipes();
      }
    }
  }, [visible, category, context, initialTab]);

  const loadSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const results = await getSuggestionsForCategory(category, context, 3);
      setSuggestions(results);
    } catch {
      console.log("[MealSlotSheet] Error loading suggestions, retrying");
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const loadRecipes = async () => {
    if (recipes.length > 0) return; // Already loaded

    setLoadingRecipes(true);
    try {
      // Load ALL recipes - we'll filter client-side by mealTypes
      const libraryRecipes = await getMealLibrary();
      if (libraryRecipes.length > 0) {
        setRecipes(libraryRecipes);
      } else {
        // Fallback to local - get all recipes
        const state = useMealStore.getState();
        if (state.mealLibrary.length === 0) {
          state.initializeMealLibrary();
        }
        setRecipes(useMealStore.getState().mealLibrary);
      }
    } catch {
      console.log("[MealSlotSheet] Using local recipes");
      const state = useMealStore.getState();
      if (state.mealLibrary.length === 0) {
        state.initializeMealLibrary();
      }
      setRecipes(useMealStore.getState().mealLibrary);
    } finally {
      setLoadingRecipes(false);
    }
  };

  const resetCustomForm = () => {
    setCustomName("");
    setCustomIngredients("");
    setCustomNotes("");
    setSaveToLibrary(true);
  };

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    // Convert category to MealType for filtering
    const slotMealType: MealType = mealCategoryToMealType(category);
    
    return recipes.filter((recipe) => {
      // First, filter by meal type (unless "show all" is on)
      if (!showAllRecipes) {
        if (!libraryItemMatchesMealType(recipe, slotMealType)) {
          return false;
        }
      }
      
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = recipe.name.toLowerCase().includes(q);
        const matchesIngredient = recipe.ingredients?.some((i) => i.toLowerCase().includes(q));
        const matchesTag = recipe.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesIngredient && !matchesTag) return false;
      }

      // Prep type filter
      if (selectedFilter !== "all") {
        if (selectedFilter === "quick") {
          if (recipe.difficulty !== "easy") return false;
        } else if (selectedFilter === "vegetarian" || selectedFilter === "one-pot") {
          if (!recipe.tags?.includes(selectedFilter)) return false;
        } else {
          if (recipe.prepType !== selectedFilter) return false;
        }
      }

      return true;
    });
  }, [recipes, searchQuery, selectedFilter, showAllRecipes, category]);

  const handleSelectSuggestion = (suggestion: MealSuggestion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectSuggestion(suggestion);
    onClose();
  };

  const handleSelectRecipe = (recipe: MealLibraryItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectRecipe(recipe);
    onClose();
  };

  const handleSaveCustomMeal = () => {
    if (!customName.trim()) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const ingredients = customIngredients
      .split("\n")
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    onAddCustomMeal(
      customName.trim(),
      ingredients.length > 0 ? ingredients : undefined,
      customNotes.trim() || undefined,
      saveToLibrary
    );
    onClose();
  };

  const switchToRecipes = () => {
    setActiveSection("recipes");
    loadRecipes();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        {/* Backdrop */}
        <Pressable
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={onClose}
        />

        {/* Content */}
        <View
          className="rounded-t-3xl overflow-hidden"
          style={{ backgroundColor: PARCHMENT, height: "92%" }}
        >
            <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
              {/* Header */}
              <View
                className="px-5 pt-6 pb-4"
                style={{ backgroundColor: DEEP_FOREST }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <Ionicons
                      name={CATEGORY_ICONS[category]}
                      size={24}
                      color={PARCHMENT}
                    />
                    <Text
                      className="ml-3"
                      style={{
                        fontFamily: "Raleway_700Bold",
                        fontSize: 22,
                        color: PARCHMENT,
                      }}
                    >
                      Add {CATEGORY_LABELS[category]}
                    </Text>
                  </View>
                  <Pressable
                    onPress={onClose}
                    className="w-9 h-9 rounded-full items-center justify-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                  >
                    <Ionicons name="close" size={20} color={PARCHMENT} />
                  </Pressable>
                </View>
                <Text
                  className="mt-1"
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  Day {dayIndex}
                </Text>
              </View>

              {/* Section Tabs */}
              <View
                className="flex-row px-4 py-3 border-b"
                style={{ borderColor: BORDER_SOFT }}
              >
                {[
                  { key: "suggest", label: "Suggestions", icon: "sparkles" },
                  { key: "recipes", label: "Recipes", icon: "book-outline" },
                  { key: "custom", label: "Custom", icon: "create-outline" },
                ].map((tab) => (
                  <Pressable
                    key={tab.key}
                    onPress={() => {
                      setActiveSection(tab.key as any);
                      if (tab.key === "recipes") loadRecipes();
                    }}
                    className="flex-1 flex-row items-center justify-center py-2 rounded-lg mx-1"
                    style={{
                      backgroundColor:
                        activeSection === tab.key ? DEEP_FOREST : "transparent",
                    }}
                  >
                    <Ionicons
                      name={tab.icon as any}
                      size={16}
                      color={activeSection === tab.key ? PARCHMENT : TEXT_SECONDARY}
                    />
                    <Text
                      className="ml-1.5"
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 13,
                        color: activeSection === tab.key ? PARCHMENT : TEXT_SECONDARY,
                      }}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Content */}
              <ScrollView
                style={{ flex: 1, minHeight: 300 }}
                contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* SUGGESTIONS SECTION */}
                {activeSection === "suggest" && (
                  <View className="px-5 pt-4">
                    <Text
                      className="mb-3"
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 13,
                        color: TEXT_SECONDARY,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Quick suggestions
                    </Text>

                    {loadingSuggestions ? (
                      <View className="py-8 items-center">
                        <ActivityIndicator size="small" color={DEEP_FOREST} />
                      </View>
                    ) : suggestions.length === 0 ? (
                      <View className="py-8 items-center">
                        <Text
                          style={{
                            fontFamily: "SourceSans3_400Regular",
                            fontSize: 14,
                            color: TEXT_SECONDARY,
                          }}
                        >
                          No suggestions available
                        </Text>
                      </View>
                    ) : (
                      suggestions.map((suggestion, index) => (
                        <Pressable
                          key={suggestion.id}
                          onPress={() => handleSelectSuggestion(suggestion)}
                          className="bg-white rounded-xl p-4 mb-3 border active:opacity-90"
                          style={{ borderColor: BORDER_SOFT }}
                        >
                          <View className="flex-row items-start">
                            <View
                              className="w-8 h-8 rounded-full items-center justify-center mr-3"
                              style={{
                                backgroundColor:
                                  suggestion.type === "recipe"
                                    ? "rgba(26, 76, 57, 0.1)"
                                    : "rgba(196, 164, 132, 0.3)",
                              }}
                            >
                              <Ionicons
                                name={suggestion.type === "recipe" ? "book" : "bulb"}
                                size={16}
                                color={suggestion.type === "recipe" ? EARTH_GREEN : GRANITE_GOLD}
                              />
                            </View>
                            <View className="flex-1">
                              <Text
                                style={{
                                  fontFamily: "SourceSans3_600SemiBold",
                                  fontSize: 16,
                                  color: TEXT_PRIMARY_STRONG,
                                }}
                              >
                                {suggestion.name}
                              </Text>
                              {suggestion.description && (
                                <Text
                                  className="mt-1"
                                  style={{
                                    fontFamily: "SourceSans3_400Regular",
                                    fontSize: 13,
                                    color: TEXT_SECONDARY,
                                  }}
                                  numberOfLines={2}
                                >
                                  {suggestion.description}
                                </Text>
                              )}
                              <View className="flex-row items-center mt-2">
                                <View
                                  className="px-2 py-0.5 rounded-full mr-2"
                                  style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
                                >
                                  <Text
                                    style={{
                                      fontFamily: "SourceSans3_400Regular",
                                      fontSize: 11,
                                      color: TEXT_SECONDARY,
                                    }}
                                  >
                                    {suggestion.type === "recipe" ? "Recipe" : "Idea"}
                                  </Text>
                                </View>
                                <Text
                                  style={{
                                    fontFamily: "SourceSans3_400Regular",
                                    fontSize: 11,
                                    color: TEXT_SECONDARY,
                                  }}
                                >
                                  {suggestion.prepType === "noCook"
                                    ? "No cook"
                                    : suggestion.prepType === "campStove"
                                    ? "Camp stove"
                                    : suggestion.prepType === "campfire"
                                    ? "Campfire"
                                    : "Cold"}
                                </Text>
                              </View>
                            </View>
                            <Ionicons
                              name="add-circle"
                              size={24}
                              color={EARTH_GREEN}
                            />
                          </View>
                        </Pressable>
                      ))
                    )}

                    {/* Refresh suggestions */}
                    <Pressable
                      onPress={loadSuggestions}
                      className="flex-row items-center justify-center py-3 mt-2"
                    >
                      <Ionicons name="refresh" size={16} color={EARTH_GREEN} />
                      <Text
                        className="ml-2"
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 14,
                          color: EARTH_GREEN,
                        }}
                      >
                        Get new suggestions
                      </Text>
                    </Pressable>

                    {/* Browse all recipes link */}
                    <Pressable
                      onPress={switchToRecipes}
                      className="mt-4 py-3 rounded-xl border items-center"
                      style={{ borderColor: BORDER_SOFT }}
                    >
                      <Text
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 14,
                          color: DEEP_FOREST,
                        }}
                      >
                        Browse all recipes →
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* RECIPES SECTION */}
                {activeSection === "recipes" && (
                  <View className="px-5 pt-4">
                    {/* Search */}
                    <View
                      className="flex-row items-center px-3 py-2.5 rounded-xl mb-3"
                      style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
                    >
                      <Ionicons name="search" size={18} color={TEXT_SECONDARY} />
                      <TextInput
                        className="flex-1 ml-2"
                        placeholder="Search recipes..."
                        placeholderTextColor={TEXT_SECONDARY}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={{
                          fontFamily: "SourceSans3_400Regular",
                          fontSize: 15,
                          color: TEXT_PRIMARY_STRONG,
                        }}
                      />
                      {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery("")}>
                          <Ionicons name="close-circle" size={18} color={TEXT_SECONDARY} />
                        </Pressable>
                      )}
                    </View>

                    {/* Filter chips */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
                    >
                      {FILTER_CHIPS.map((chip) => (
                        <Pressable
                          key={chip.key}
                          onPress={() => setSelectedFilter(chip.key)}
                          className="px-3 py-1.5 rounded-full"
                          style={{
                            backgroundColor:
                              selectedFilter === chip.key ? DEEP_FOREST : CARD_BACKGROUND_LIGHT,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "SourceSans3_600SemiBold",
                              fontSize: 12,
                              color: selectedFilter === chip.key ? PARCHMENT : TEXT_SECONDARY,
                            }}
                          >
                            {chip.label}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>

                    {/* Show all recipes toggle */}
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowAllRecipes(!showAllRecipes);
                      }}
                      className="flex-row items-center mb-3"
                    >
                      <View
                        className="w-5 h-5 rounded border mr-2 items-center justify-center"
                        style={{
                          backgroundColor: showAllRecipes ? DEEP_FOREST : "transparent",
                          borderColor: showAllRecipes ? DEEP_FOREST : TEXT_SECONDARY,
                        }}
                      >
                        {showAllRecipes && (
                          <Ionicons name="checkmark" size={14} color={PARCHMENT} />
                        )}
                      </View>
                      <Text
                        style={{
                          fontFamily: "SourceSans3_400Regular",
                          fontSize: 13,
                          color: TEXT_SECONDARY,
                        }}
                      >
                        Show all recipes (not just {CATEGORY_LABELS[category].toLowerCase()})
                      </Text>
                    </Pressable>

                    {/* Recipe list */}
                    {loadingRecipes ? (
                      <View className="py-8 items-center">
                        <ActivityIndicator size="small" color={DEEP_FOREST} />
                      </View>
                    ) : filteredRecipes.length === 0 ? (
                      <View className="py-8 items-center">
                        <Ionicons name="search-outline" size={40} color={TEXT_SECONDARY} />
                        <Text
                          className="mt-3"
                          style={{
                            fontFamily: "SourceSans3_400Regular",
                            fontSize: 14,
                            color: TEXT_SECONDARY,
                          }}
                        >
                          No recipes found
                        </Text>
                      </View>
                    ) : (
                      filteredRecipes.map((recipe) => (
                        <Pressable
                          key={recipe.id}
                          onPress={() => handleSelectRecipe(recipe)}
                          className="bg-white rounded-xl p-4 mb-3 border active:opacity-90"
                          style={{ borderColor: BORDER_SOFT }}
                        >
                          <View className="flex-row items-center justify-between">
                            <View className="flex-1 mr-3">
                              <Text
                                style={{
                                  fontFamily: "SourceSans3_600SemiBold",
                                  fontSize: 15,
                                  color: TEXT_PRIMARY_STRONG,
                                }}
                              >
                                {recipe.name}
                              </Text>
                              <View className="flex-row items-center mt-1 flex-wrap">
                                <Text
                                  style={{
                                    fontFamily: "SourceSans3_400Regular",
                                    fontSize: 12,
                                    color: TEXT_SECONDARY,
                                  }}
                                >
                                  {recipe.prepType === "noCook"
                                    ? "No cook"
                                    : recipe.prepType === "campStove"
                                    ? "Camp stove"
                                    : recipe.prepType === "campfire"
                                    ? "Campfire"
                                    : "Cold"}
                                </Text>
                                {recipe.difficulty && (
                                  <>
                                    <Text
                                      style={{
                                        fontFamily: "SourceSans3_400Regular",
                                        fontSize: 12,
                                        color: TEXT_SECONDARY,
                                      }}
                                    >
                                      {" • "}
                                    </Text>
                                    <Text
                                      style={{
                                        fontFamily: "SourceSans3_400Regular",
                                        fontSize: 12,
                                        color: TEXT_SECONDARY,
                                      }}
                                    >
                                      {recipe.difficulty === "easy" ? "Easy" : "Moderate"}
                                    </Text>
                                  </>
                                )}
                              </View>
                            </View>
                            <Ionicons name="add-circle" size={24} color={EARTH_GREEN} />
                          </View>
                        </Pressable>
                      ))
                    )}
                  </View>
                )}

                {/* CUSTOM MEAL SECTION */}
                {activeSection === "custom" && (
                  <View className="px-5 pt-4">
                    <Text
                      className="mb-3"
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 13,
                        color: TEXT_SECONDARY,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Create your own meal
                    </Text>

                    {/* Meal name */}
                    <View className="mb-4">
                      <Text
                        className="mb-1.5"
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 14,
                          color: TEXT_PRIMARY_STRONG,
                        }}
                      >
                        Meal name *
                      </Text>
                      <TextInput
                        className="bg-white rounded-xl px-4 py-3 border"
                        style={{
                          borderColor: BORDER_SOFT,
                          fontFamily: "SourceSans3_400Regular",
                          fontSize: 15,
                          color: TEXT_PRIMARY_STRONG,
                        }}
                        placeholder="e.g., Campfire nachos"
                        placeholderTextColor={TEXT_SECONDARY}
                        value={customName}
                        onChangeText={setCustomName}
                      />
                    </View>

                    {/* Ingredients */}
                    <View className="mb-4">
                      <Text
                        className="mb-1.5"
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 14,
                          color: TEXT_PRIMARY_STRONG,
                        }}
                      >
                        Ingredients (one per line)
                      </Text>
                      <TextInput
                        className="bg-white rounded-xl px-4 py-3 border"
                        style={{
                          borderColor: BORDER_SOFT,
                          fontFamily: "SourceSans3_400Regular",
                          fontSize: 15,
                          color: TEXT_PRIMARY_STRONG,
                          minHeight: 100,
                          textAlignVertical: "top",
                        }}
                        placeholder="Tortilla chips&#10;Cheese&#10;Beans&#10;Salsa"
                        placeholderTextColor={TEXT_SECONDARY}
                        value={customIngredients}
                        onChangeText={setCustomIngredients}
                        multiline
                      />
                    </View>

                    {/* Notes */}
                    <View className="mb-6">
                      <Text
                        className="mb-1.5"
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 14,
                          color: TEXT_PRIMARY_STRONG,
                        }}
                      >
                        Notes (optional)
                      </Text>
                      <TextInput
                        className="bg-white rounded-xl px-4 py-3 border"
                        style={{
                          borderColor: BORDER_SOFT,
                          fontFamily: "SourceSans3_400Regular",
                          fontSize: 15,
                          color: TEXT_PRIMARY_STRONG,
                          minHeight: 80,
                          textAlignVertical: "top",
                        }}
                        placeholder="Cooking instructions or tips..."
                        placeholderTextColor={TEXT_SECONDARY}
                        value={customNotes}
                        onChangeText={setCustomNotes}
                        multiline
                      />
                    </View>

                    {/* Save to My Recipes checkbox */}
                    <Pressable
                      onPress={() => setSaveToLibrary(!saveToLibrary)}
                      className="flex-row items-center py-3 active:opacity-80"
                    >
                      <View
                        className="w-6 h-6 rounded-md border-2 items-center justify-center mr-3"
                        style={{
                          borderColor: saveToLibrary ? DEEP_FOREST : BORDER_SOFT,
                          backgroundColor: saveToLibrary ? DEEP_FOREST : "transparent",
                        }}
                      >
                        {saveToLibrary && (
                          <Ionicons name="checkmark" size={16} color={PARCHMENT} />
                        )}
                      </View>
                      <Text
                        style={{
                          fontFamily: "SourceSans3_400Regular",
                          fontSize: 15,
                          color: TEXT_PRIMARY_STRONG,
                        }}
                      >
                        Save to My Recipes for future use
                      </Text>
                    </Pressable>

                    {/* Save button */}
                    <Pressable
                      onPress={handleSaveCustomMeal}
                      disabled={!customName.trim()}
                      className="py-4 rounded-xl items-center active:opacity-90"
                      style={{
                        backgroundColor: customName.trim() ? DEEP_FOREST : CARD_BACKGROUND_LIGHT,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 16,
                          color: customName.trim() ? PARCHMENT : TEXT_SECONDARY,
                        }}
                      >
                        Add to Meal Plan
                      </Text>
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
    </Modal>
  );
}
