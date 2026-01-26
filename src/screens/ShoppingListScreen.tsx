/**
 * Shopping List Screen - Aggregated ingredients from all trip meals
 * Enhanced with intelligent categorization and smart grouping
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useTripsStore } from "../state/tripsStore";
import AccountButton from "../components/AccountButton";
import { RootStackParamList } from "../navigation/types";
import { Meal } from "../types/meal";
import * as MealService from "../services/mealsService";
import * as LocalMealService from "../services/localMealService";
import { 
  ShoppingListItem, 
  IngredientCategory, 
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  MealIngredient,
} from "../types/meals";
import { ShoppingListParser } from "../utils/shoppingListParser";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  BORDER_SOFT,
  TEXT_SECONDARY,
} from "../constants/colors";

type ShoppingListScreenRouteProp = RouteProp<RootStackParamList, "ShoppingList">;
type ShoppingListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ShoppingList"
>;

// Category icons for visual enhancement
const CATEGORY_ICONS: Record<IngredientCategory, keyof typeof Ionicons.glyphMap> = {
  protein: "fish-outline",
  produce: "leaf-outline",
  dairy: "ice-cream-outline",
  grains: "pizza-outline",
  canned: "cube-outline",
  condiments: "flask-outline",
  spices: "flame-outline",
  snacks: "fast-food-outline",
  beverages: "water-outline",
};

interface IngredientItem {
  name: string;
  checked: boolean;
  mealNames: string[]; // Which meals use this ingredient
  category?: IngredientCategory;
  quantity?: string;
}

export default function ShoppingListScreen() {
  const navigation = useNavigation<ShoppingListScreenNavigationProp>();
  const route = useRoute<ShoppingListScreenRouteProp>();
  const { tripId } = route.params;

  const trip = useTripsStore((s) => s.getTripById(tripId));
  const userId = "demo_user_1"; // TODO: Get from auth

  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [useLocalStorage, setUseLocalStorage] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [showStaples, setShowStaples] = useState(true);
  const [viewMode, setViewMode] = useState<"category" | "list">("category");
  const [checkedStaples, setCheckedStaples] = useState<Set<string>>(new Set());

  // Calculate trip duration for staples calculation
  const tripDays = trip
    ? Math.ceil(
        (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 1;
  const numCampers = trip?.numCampers || 2;

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
          if (fbError?.code === "permission-denied" || fbError?.message?.includes("permission")) {
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

  // Aggregate ingredients from all meals with intelligent categorization
  useEffect(() => {
    if (meals.length === 0) {
      setIngredients([]);
      return;
    }

    const ingredientMap = new Map<string, { mealNames: Set<string>; category?: IngredientCategory }>();

    // Categorize ingredient based on common keywords
    const categorizeIngredient = (name: string): IngredientCategory => {
      const lower = name.toLowerCase();
      
      // Protein
      if (/beef|chicken|pork|fish|turkey|sausage|bacon|ham|eggs?|meat|jerky|salmon|shrimp|hot dog/i.test(lower)) {
        return "protein";
      }
      // Produce
      if (/lettuce|tomato|onion|pepper|carrot|potato|apple|orange|banana|berries|fruit|vegetable|zucchini|cucumber|grape|spinach/i.test(lower)) {
        return "produce";
      }
      // Dairy
      if (/milk|cheese|yogurt|butter|cream|mozzarella|cheddar|parmesan/i.test(lower)) {
        return "dairy";
      }
      // Grains
      if (/bread|bun|roll|pasta|rice|tortilla|oatmeal|cereal|pancake|granola|cracker|couscous/i.test(lower)) {
        return "grains";
      }
      // Canned
      if (/beans|soup|sauce|canned|tomatoes/i.test(lower)) {
        return "canned";
      }
      // Condiments
      if (/ketchup|mustard|mayo|salsa|dressing|syrup|honey|jam|oil|hummus|peanut butter|guacamole|relish/i.test(lower)) {
        return "condiments";
      }
      // Spices
      if (/salt|pepper|seasoning|spice|garlic|cinnamon|chili|taco|fajita|cumin/i.test(lower)) {
        return "spices";
      }
      // Beverages
      if (/coffee|tea|juice|soda|water|drink/i.test(lower)) {
        return "beverages";
      }
      // Default to snacks
      return "snacks";
    };

    meals.forEach((meal) => {
      if (meal.ingredients && meal.ingredients.length > 0) {
        meal.ingredients.forEach((ingredient) => {
          const normalizedIngredient = ingredient.toLowerCase().trim();
          const category = categorizeIngredient(normalizedIngredient);

          if (!ingredientMap.has(normalizedIngredient)) {
            ingredientMap.set(normalizedIngredient, {
              mealNames: new Set(),
              category,
            });
          }

          ingredientMap.get(normalizedIngredient)!.mealNames.add(meal.name);
        });
      }
    });

    // Convert to array and sort by category order, then alphabetically within category
    const ingredientsList: IngredientItem[] = Array.from(ingredientMap.entries())
      .map(([name, data]) => ({
        name,
        checked: false,
        mealNames: Array.from(data.mealNames),
        category: data.category,
      }))
      .sort((a, b) => {
        const categoryA = CATEGORY_ORDER.indexOf(a.category || "snacks");
        const categoryB = CATEGORY_ORDER.indexOf(b.category || "snacks");
        if (categoryA !== categoryB) return categoryA - categoryB;
        return a.name.localeCompare(b.name);
      });

    setIngredients(ingredientsList);
  }, [meals]);

  // Group ingredients by category for display
  const groupedIngredients = useMemo(() => {
    const groups = new Map<IngredientCategory, IngredientItem[]>();
    
    CATEGORY_ORDER.forEach((category) => {
      const categoryItems = ingredients.filter((i) => i.category === category);
      if (categoryItems.length > 0) {
        groups.set(category, categoryItems);
      }
    });
    
    return groups;
  }, [ingredients]);

  // Get suggested staples
  const suggestedStaples = useMemo(() => {
    if (!showStaples) return [];
    return ShoppingListParser.getSuggestedStaples(tripDays, numCampers).map((item) => ({
      ...item,
      mealNames: ["Essential"],
    }));
  }, [tripDays, numCampers, showStaples]);

  // Handle export/share
  const handleExport = async () => {
    const shoppingItems: ShoppingListItem[] = ingredients.map((item, idx) => ({
      id: `item-${idx}`,
      item: item.name,
      quantity: 1,
      unit: "item",
      category: item.category || "snacks",
      checked: item.checked,
      source: item.mealNames.join(", "),
    }));

    const formatted = ShoppingListParser.formatForExport(shoppingItems, true);
    
    try {
      await Share.share({
        message: formatted,
        title: `Shopping List for ${trip?.name || "Trip"}`,
      });
    } catch {
      // Fallback to clipboard
      await Clipboard.setStringAsync(formatted);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const toggleIngredient = async (index: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIngredients((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const toggleStaple = async (stapleName: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckedStaples((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stapleName)) {
        newSet.delete(stapleName);
      } else {
        newSet.add(stapleName);
      }
      return newSet;
    });
  };

  const checkedCount = ingredients.filter((i) => i.checked).length;
  const totalCount = ingredients.length;

  if (!trip) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-parchment" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 border-b border-parchmentDark">
        <View className="flex-row items-center mb-2 justify-between">
          <View className="flex-row items-center flex-1">
            <Pressable
              onPress={() => navigation.goBack()}
              className="mr-2 active:opacity-70"
            >
              <Ionicons name="arrow-back" size={24} color={DEEP_FOREST} />
            </Pressable>
            <Text
              className="text-xl font-bold flex-1"
              style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
            >
              Shopping List
            </Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {ingredients.length > 0 && (
              <Pressable
                onPress={handleExport}
                className="bg-forest rounded-full px-3 py-2 flex-row items-center active:opacity-90"
              >
                <Ionicons name="share-outline" size={16} color={PARCHMENT} />
                <Text className="text-white ml-1 text-sm" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                  Share
                </Text>
              </Pressable>
            )}
            <AccountButton />
          </View>
        </View>
        <Text
          className="text-sm mb-3"
          style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
        >
          For: {trip.name}
        </Text>

        {/* View Toggle */}
        {ingredients.length > 0 && (
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row rounded-lg overflow-hidden border" style={{ borderColor: BORDER_SOFT }}>
              <Pressable
                onPress={() => setViewMode("category")}
                className="px-3 py-1.5"
                style={{ backgroundColor: viewMode === "category" ? DEEP_FOREST : "white" }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 12,
                    color: viewMode === "category" ? PARCHMENT : EARTH_GREEN,
                  }}
                >
                  By Category
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setViewMode("list")}
                className="px-3 py-1.5"
                style={{ backgroundColor: viewMode === "list" ? DEEP_FOREST : "white" }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 12,
                    color: viewMode === "list" ? PARCHMENT : EARTH_GREEN,
                  }}
                >
                  All Items
                </Text>
              </Pressable>
            </View>

            {/* Staples Toggle */}
            <Pressable
              onPress={() => setShowStaples(!showStaples)}
              className="flex-row items-center"
            >
              <Ionicons
                name={showStaples ? "checkbox" : "square-outline"}
                size={18}
                color={EARTH_GREEN}
              />
              <Text
                className="ml-1.5"
                style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: EARTH_GREEN }}
              >
                Show staples
              </Text>
            </Pressable>
          </View>
        )}

        {/* Progress */}
        {totalCount > 0 && (
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <Text
                className="text-sm"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
              >
                Shopping Progress
              </Text>
              <Text
                className="text-sm"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
              >
                {checkedCount} / {totalCount}
              </Text>
            </View>
            <View className="h-2 bg-stone-200 rounded-full overflow-hidden">
              <View
                className="h-full bg-forest rounded-full"
                style={{
                  width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%`,
                }}
              />
            </View>
          </View>
        )}
      </View>

      {/* Shopping List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
        </View>
      ) : ingredients.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cart-outline" size={64} color={EARTH_GREEN} />
          <Text
            className="text-center mt-4 mb-2 text-lg"
            style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
          >
            No ingredients yet
          </Text>
          <Text
            className="text-center"
            style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
          >
            Add meals to your trip to generate a shopping list automatically
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-4">
          <Text
            className="text-xs mb-3"
            style={{ fontFamily: "SourceSans3_600SemiBold", color: EARTH_GREEN }}
          >
            {totalCount} {totalCount === 1 ? "INGREDIENT" : "INGREDIENTS"} NEEDED
          </Text>

          {viewMode === "category" ? (
            // Category-grouped view
            <>
              {Array.from(groupedIngredients.entries()).map(([category, items]) => (
                <View key={category} className="mb-4">
                  {/* Category Header */}
                  <View className="flex-row items-center mb-2 px-1">
                    <View 
                      className="w-8 h-8 rounded-full items-center justify-center mr-2"
                      style={{ backgroundColor: DEEP_FOREST + "15" }}
                    >
                      <Ionicons 
                        name={CATEGORY_ICONS[category]} 
                        size={16} 
                        color={DEEP_FOREST} 
                      />
                    </View>
                    <Text
                      className="text-sm flex-1"
                      style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
                    >
                      {CATEGORY_LABELS[category]}
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                    >
                      {items.filter(i => i.checked).length}/{items.length}
                    </Text>
                  </View>

                  {/* Category Items */}
                  {items.map((ingredient) => {
                    const originalIndex = ingredients.findIndex(i => i.name === ingredient.name);
                    return (
                      <Pressable
                        key={ingredient.name}
                        onPress={() => toggleIngredient(originalIndex)}
                        className={`flex-row items-start p-4 mb-2 rounded-xl border active:opacity-70 ${
                          ingredient.checked
                            ? "bg-stone-50 border-stone-300"
                            : "bg-white border-stone-200"
                        }`}
                      >
                        {/* Checkbox */}
                        <View className="mr-3 mt-0.5">
                          <View
                            className={`w-6 h-6 rounded-md border-2 items-center justify-center ${
                              ingredient.checked
                                ? "bg-forest border-forest"
                                : "bg-white border-stone-400"
                            }`}
                          >
                            {ingredient.checked && (
                              <Ionicons name="checkmark" size={16} color={PARCHMENT} />
                            )}
                          </View>
                        </View>

                        {/* Ingredient Info */}
                        <View className="flex-1">
                          <View className="flex-row items-center justify-between">
                            <Text
                              className={`text-base ${
                                ingredient.checked ? "line-through" : ""
                              }`}
                              style={{
                                fontFamily: "SourceSans3_600SemiBold",
                                color: ingredient.checked ? EARTH_GREEN : DEEP_FOREST,
                              }}
                            >
                              {ingredient.name.charAt(0).toUpperCase() + ingredient.name.slice(1)}
                            </Text>
                            {ingredient.quantity && Number(ingredient.quantity) > 1 && (
                              <Text
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{ 
                                  backgroundColor: DEEP_FOREST + "10",
                                  fontFamily: "SourceSans3_600SemiBold", 
                                  color: DEEP_FOREST 
                                }}
                              >
                                ×{ingredient.quantity}
                              </Text>
                            )}
                          </View>

                          {/* Show which meals use this ingredient */}
                          {ingredient.mealNames.length > 0 && (
                            <Text
                              className="text-xs mt-1"
                              style={{
                                fontFamily: "SourceSans3_400Regular",
                                color: EARTH_GREEN,
                              }}
                            >
                              For: {ingredient.mealNames.join(", ")}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}

              {/* Suggested Staples Section */}
              {showStaples && suggestedStaples.length > 0 && (
                <View className="mb-4">
                  <View className="flex-row items-center mb-2 px-1">
                    <View 
                      className="w-8 h-8 rounded-full items-center justify-center mr-2"
                      style={{ backgroundColor: "#8B7355" + "20" }}
                    >
                      <Ionicons name="star-outline" size={16} color="#8B7355" />
                    </View>
                    <Text
                      className="text-sm flex-1"
                      style={{ fontFamily: "Raleway_700Bold", color: "#8B7355" }}
                    >
                      Suggested Staples
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ fontFamily: "SourceSans3_400Regular", color: "#8B7355" }}
                    >
                      {checkedStaples.size}/{suggestedStaples.length}
                    </Text>
                  </View>
                  <Text
                    className="text-xs mb-2 px-1"
                    style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                  >
                    Common items for a {tripDays}-day trip with {numCampers} {numCampers === 1 ? "person" : "people"}
                  </Text>
                  {suggestedStaples.map((staple) => {
                    const isChecked = checkedStaples.has(staple.item);
                    return (
                      <Pressable
                        key={staple.item}
                        onPress={() => toggleStaple(staple.item)}
                        className={`flex-row items-center p-3 mb-2 rounded-xl border active:opacity-70 ${
                          isChecked
                            ? "bg-stone-50 border-stone-300"
                            : "bg-amber-50/50 border-amber-200"
                        }`}
                      >
                        {/* Checkbox */}
                        <View
                          className={`w-6 h-6 rounded-md border-2 items-center justify-center ${
                            isChecked
                              ? "bg-forest border-forest"
                              : "bg-white border-stone-400"
                          }`}
                        >
                          {isChecked && (
                            <Ionicons name="checkmark" size={16} color={PARCHMENT} />
                          )}
                        </View>
                        <Text
                          className={`ml-3 text-sm ${isChecked ? "line-through" : ""}`}
                          style={{ 
                            fontFamily: "SourceSans3_600SemiBold", 
                            color: isChecked ? EARTH_GREEN : "#8B7355" 
                          }}
                        >
                          {staple.item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            // Flat list view (original)
            <>
              {ingredients.map((ingredient, index) => (
                <Pressable
                  key={index}
                  onPress={() => toggleIngredient(index)}
                  className={`flex-row items-start p-4 mb-2 rounded-xl border active:opacity-70 ${
                    ingredient.checked
                      ? "bg-stone-50 border-stone-300"
                      : "bg-white border-stone-200"
                  }`}
                >
                  {/* Checkbox */}
                  <View className="mr-3 mt-0.5">
                    <View
                      className={`w-6 h-6 rounded-md border-2 items-center justify-center ${
                        ingredient.checked
                          ? "bg-forest border-forest"
                          : "bg-white border-stone-400"
                      }`}
                    >
                      {ingredient.checked && (
                        <Ionicons name="checkmark" size={16} color={PARCHMENT} />
                      )}
                    </View>
                  </View>

                  {/* Ingredient Info */}
                  <View className="flex-1">
                    <Text
                      className={`text-base mb-1 ${
                        ingredient.checked ? "line-through" : ""
                      }`}
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        color: ingredient.checked ? EARTH_GREEN : DEEP_FOREST,
                      }}
                    >
                      {ingredient.name.charAt(0).toUpperCase() + ingredient.name.slice(1)}
                    </Text>

                    {/* Show which meals use this ingredient */}
                    {ingredient.mealNames.length > 0 && (
                      <Text
                        className="text-xs"
                        style={{
                          fontFamily: "SourceSans3_400Regular",
                          color: EARTH_GREEN,
                        }}
                      >
                        For: {ingredient.mealNames.join(", ")}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </>
          )}

          {/* Bottom spacing */}
          <View className="h-8" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
