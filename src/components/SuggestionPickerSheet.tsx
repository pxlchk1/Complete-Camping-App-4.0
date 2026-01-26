/**
 * SuggestionPickerSheet - Bottom sheet for meal suggestions
 * 
 * Per UX directive: User chooses. App never "slot machines" a meal into a field without consent.
 * Shows 8-12 suggestions, user must tap Add/Replace to commit.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { SuggestibleMealCategory } from "../types/meal";
import {
  MealSuggestion,
  getSuggestionsForCategory,
  SuggestionContext,
} from "../services/mealSuggestionService";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  BORDER_SOFT,
  TEXT_SECONDARY,
} from "../constants/colors";

const CATEGORY_LABELS: Record<SuggestibleMealCategory, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const FILTER_CHIPS = [
  { key: "all", label: "All" },
  { key: "quick", label: "Quick" },
  { key: "noCook", label: "No-cook" },
  { key: "one-pot", label: "One-pot" },
  { key: "kid-friendly", label: "Kid-friendly" },
  { key: "cold-weather", label: "Cold-weather" },
  { key: "vegetarian", label: "Vegetarian" },
];

interface SuggestionPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  dayIndex: number;
  mealType: SuggestibleMealCategory;
  existingEntryCount: number;
  tripContext?: SuggestionContext;
  onAddSuggestion: (suggestion: MealSuggestion) => void;
  onReplaceSuggestion: (suggestion: MealSuggestion) => void;
  onBrowseRecipes: () => void;
}

export default function SuggestionPickerSheet({
  visible,
  onClose,
  tripId,
  dayIndex,
  mealType,
  existingEntryCount,
  tripContext = {},
  onAddSuggestion,
  onReplaceSuggestion,
  onBrowseRecipes,
}: SuggestionPickerSheetProps) {
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");

  const hasExistingMeal = existingEntryCount > 0;
  const actionLabel = hasExistingMeal ? "Replace" : "Add";

  // Load suggestions when sheet opens
  useEffect(() => {
    if (visible) {
      loadSuggestions();
      setSelectedFilter("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mealType, tripContext]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      // Request 12 suggestions for variety
      const results = await getSuggestionsForCategory(mealType, tripContext, 12);
      setSuggestions(results);
    } catch (error) {
      console.error("[SuggestionPickerSheet] Error loading suggestions:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleShuffle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadSuggestions();
  };

  // Filter suggestions based on selected chip
  const filteredSuggestions = useMemo(() => {
    if (selectedFilter === "all") return suggestions;
    
    return suggestions.filter((suggestion) => {
      if (selectedFilter === "quick") {
        return suggestion.prepType === "noCook" || suggestion.tags?.includes("quick");
      }
      if (selectedFilter === "noCook") {
        return suggestion.prepType === "noCook";
      }
      if (selectedFilter === "one-pot") {
        return suggestion.tags?.includes("one-pot");
      }
      if (selectedFilter === "kid-friendly") {
        return suggestion.tags?.includes("kid-friendly");
      }
      if (selectedFilter === "cold-weather") {
        return suggestion.tags?.includes("cold-weather") || suggestion.tags?.includes("warming");
      }
      if (selectedFilter === "vegetarian") {
        return suggestion.tags?.includes("vegetarian");
      }
      return true;
    });
  }, [suggestions, selectedFilter]);

  const handleSelectSuggestion = (suggestion: MealSuggestion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (hasExistingMeal) {
      onReplaceSuggestion(suggestion);
    } else {
      onAddSuggestion(suggestion);
    }
    // Note: Parent should close sheet and show toast with Undo
  };

  const handleViewRecipe = (suggestion: MealSuggestion) => {
    // If suggestion is recipe-backed, could navigate to detail
    // For now, just select it
    handleSelectSuggestion(suggestion);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        {/* Backdrop */}
        <Pressable
          style={{ 
            position: "absolute", 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: "rgba(0,0,0,0.5)" 
          }}
          onPress={onClose}
        />

        {/* Sheet Content */}
        <View
          style={{ 
            backgroundColor: PARCHMENT, 
            height: "92%",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
          }}
        >
          <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
              {/* Header */}
              <View
                className="px-5 pt-6 pb-4"
                style={{ backgroundColor: DEEP_FOREST }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text
                      style={{
                        fontFamily: "Raleway_700Bold",
                        fontSize: 22,
                        color: PARCHMENT,
                      }}
                    >
                      {CATEGORY_LABELS[mealType]} ideas
                    </Text>
                    <Text
                      className="mt-1"
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 14,
                        color: "rgba(255,255,255,0.7)",
                      }}
                    >
                      Pick one to add, or browse recipes instead.
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
              </View>

              {/* Controls Row */}
              <View
                className="px-4 py-3 border-b"
                style={{ borderColor: BORDER_SOFT }}
              >
                <View className="flex-row items-center justify-between mb-3">
                  {/* Shuffle Button */}
                  <Pressable
                    onPress={handleShuffle}
                    className="flex-row items-center px-3 py-2 rounded-lg active:opacity-80"
                    style={{ backgroundColor: "rgba(26, 76, 57, 0.1)" }}
                  >
                    <Ionicons name="shuffle" size={16} color={EARTH_GREEN} />
                    <Text
                      className="ml-1.5"
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 13,
                        color: EARTH_GREEN,
                      }}
                    >
                      Shuffle
                    </Text>
                  </Pressable>

                  {/* Browse Recipes Link */}
                  <Pressable
                    onPress={onBrowseRecipes}
                    className="flex-row items-center px-3 py-2 rounded-lg active:opacity-80"
                  >
                    <Ionicons name="book-outline" size={16} color={EARTH_GREEN} />
                    <Text
                      className="ml-1.5"
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 13,
                        color: EARTH_GREEN,
                      }}
                    >
                      Browse recipes
                    </Text>
                  </Pressable>
                </View>

                {/* Filter Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {FILTER_CHIPS.map((chip) => (
                    <Pressable
                      key={chip.key}
                      onPress={() => setSelectedFilter(chip.key)}
                      className="px-3 py-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          selectedFilter === chip.key
                            ? DEEP_FOREST
                            : "rgba(26, 76, 57, 0.1)",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 12,
                          color:
                            selectedFilter === chip.key ? PARCHMENT : EARTH_GREEN,
                        }}
                      >
                        {chip.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Suggestions List */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 40, paddingTop: 8, flexGrow: 1 }}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                {loading ? (
                  <View className="py-12 items-center">
                    <ActivityIndicator size="large" color={DEEP_FOREST} />
                    <Text
                      className="mt-3"
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 14,
                        color: TEXT_SECONDARY,
                      }}
                    >
                      Loading suggestions...
                    </Text>
                  </View>
                ) : filteredSuggestions.length === 0 ? (
                  <View className="py-12 items-center px-6">
                    <Ionicons name="restaurant-outline" size={48} color={TEXT_SECONDARY} />
                    <Text
                      className="mt-3 text-center"
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 16,
                        color: DEEP_FOREST,
                      }}
                    >
                      No suggestions found
                    </Text>
                    <Text
                      className="mt-1 text-center"
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 14,
                        color: TEXT_SECONDARY,
                      }}
                    >
                      Try a different filter or browse recipes instead.
                    </Text>
                  </View>
                ) : (
                  filteredSuggestions.map((suggestion, index) => (
                    <View
                      key={`${suggestion.name}-${index}`}
                      className="mx-4 mb-2 bg-white rounded-xl p-4 border"
                      style={{ borderColor: BORDER_SOFT }}
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 mr-3">
                          {/* Title */}
                          <Text
                            style={{
                              fontFamily: "SourceSans3_600SemiBold",
                              fontSize: 16,
                              color: DEEP_FOREST,
                            }}
                          >
                            {suggestion.name}
                          </Text>

                          {/* Enhanced: Time & Complexity Row */}
                          {(suggestion.prepTime !== undefined || suggestion.complexity) && (
                            <View className="flex-row items-center mt-1.5" style={{ gap: 12 }}>
                              {suggestion.prepTime !== undefined && (
                                <View className="flex-row items-center">
                                  <Ionicons name="time-outline" size={12} color={TEXT_SECONDARY} />
                                  <Text
                                    className="ml-1"
                                    style={{
                                      fontFamily: "SourceSans3_400Regular",
                                      fontSize: 12,
                                      color: TEXT_SECONDARY,
                                    }}
                                  >
                                    {(suggestion.prepTime || 0) + (suggestion.cookTime || 0)} min
                                  </Text>
                                </View>
                              )}
                              {suggestion.complexity && (
                                <View className="flex-row items-center">
                                  <Ionicons 
                                    name={
                                      suggestion.complexity === "easy" ? "flash-outline" :
                                      suggestion.complexity === "moderate" ? "restaurant-outline" : "flame-outline"
                                    } 
                                    size={12} 
                                    color={TEXT_SECONDARY} 
                                  />
                                  <Text
                                    className="ml-1"
                                    style={{
                                      fontFamily: "SourceSans3_400Regular",
                                      fontSize: 12,
                                      color: TEXT_SECONDARY,
                                    }}
                                  >
                                    {suggestion.complexity === "easy" ? "Quick & Easy" :
                                     suggestion.complexity === "moderate" ? "Moderate" : "More Involved"}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}

                          {/* Tags (dietary & cooking method) */}
                          {suggestion.dietaryTags && suggestion.dietaryTags.length > 0 && (
                            <View className="flex-row flex-wrap mt-2" style={{ gap: 6 }}>
                              {suggestion.dietaryTags.map((tag, tagIdx) => (
                                <View
                                  key={tagIdx}
                                  className="px-2 py-0.5 rounded"
                                  style={{ backgroundColor: "rgba(26, 76, 57, 0.08)" }}
                                >
                                  <Text
                                    style={{
                                      fontFamily: "SourceSans3_400Regular",
                                      fontSize: 11,
                                      color: EARTH_GREEN,
                                    }}
                                  >
                                    {tag}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}

                          {/* Fallback: legacy tags if no dietaryTags */}
                          {(!suggestion.dietaryTags || suggestion.dietaryTags.length === 0) && 
                           suggestion.tags && suggestion.tags.length > 0 && (
                            <View className="flex-row flex-wrap mt-2" style={{ gap: 6 }}>
                              {suggestion.tags.slice(0, 3).map((tag, tagIdx) => (
                                <View
                                  key={tagIdx}
                                  className="px-2 py-0.5 rounded"
                                  style={{ backgroundColor: "rgba(26, 76, 57, 0.08)" }}
                                >
                                  <Text
                                    style={{
                                      fontFamily: "SourceSans3_400Regular",
                                      fontSize: 11,
                                      color: EARTH_GREEN,
                                    }}
                                  >
                                    {tag}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}

                          {/* Description (if available) */}
                          {suggestion.description && (
                            <Text
                              className="mt-2"
                              numberOfLines={2}
                              style={{
                                fontFamily: "SourceSans3_400Regular",
                                fontSize: 13,
                                color: TEXT_SECONDARY,
                              }}
                            >
                              {suggestion.description}
                            </Text>
                          )}

                          {/* Enhanced: Prep Ahead Tip */}
                          {suggestion.prepAhead && (
                            <View className="flex-row items-center mt-2 px-2 py-1 rounded" 
                                  style={{ backgroundColor: "rgba(139, 115, 85, 0.1)" }}>
                              <Ionicons name="bulb-outline" size={12} color="#8B7355" />
                              <Text
                                className="ml-1 flex-1"
                                numberOfLines={1}
                                style={{
                                  fontFamily: "SourceSans3_400Regular",
                                  fontSize: 11,
                                  color: "#8B7355",
                                }}
                              >
                                Prep tip: {suggestion.prepAhead}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Action Buttons */}
                        <View className="items-end" style={{ gap: 8 }}>
                          {/* Primary: Add or Replace */}
                          <Pressable
                            onPress={() => handleSelectSuggestion(suggestion)}
                            className="px-4 py-2 rounded-lg active:opacity-90"
                            style={{ backgroundColor: DEEP_FOREST }}
                          >
                            <Text
                              style={{
                                fontFamily: "SourceSans3_600SemiBold",
                                fontSize: 13,
                                color: PARCHMENT,
                              }}
                            >
                              {actionLabel}
                            </Text>
                          </Pressable>

                          {/* Secondary: View (if recipe-backed) */}
                          {suggestion.recipeId && (
                            <Pressable
                              onPress={() => handleViewRecipe(suggestion)}
                              className="px-3 py-1.5 rounded-lg active:opacity-80"
                              style={{ backgroundColor: "rgba(26, 76, 57, 0.1)" }}
                            >
                              <Text
                                style={{
                                  fontFamily: "SourceSans3_600SemiBold",
                                  fontSize: 12,
                                  color: EARTH_GREEN,
                                }}
                              >
                                View
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
    </Modal>
  );
}
