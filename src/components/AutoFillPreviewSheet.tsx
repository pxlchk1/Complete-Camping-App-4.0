/**
 * AutoFillPreviewSheet - Preview and confirm auto-fill suggestions
 * 
 * Per UX directive: Tap Auto-fill Day -> open AutoFillPreviewSheet.
 * Never write directly to day plan on tap. Requires confirm.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { SuggestibleMealCategory } from "../types/meal";
import {
  MealSuggestion,
  getAutoFillSuggestions,
  getQuickSuggestion,
  SuggestionContext,
} from "../services/mealSuggestionService";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  BORDER_SOFT,
  TEXT_SECONDARY,
} from "../constants/colors";

const MEAL_ORDER: SuggestibleMealCategory[] = ["breakfast", "lunch", "dinner", "snack"];

const CATEGORY_LABELS: Record<SuggestibleMealCategory, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

const CATEGORY_ICONS: Record<SuggestibleMealCategory, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny",
  lunch: "restaurant",
  dinner: "moon",
  snack: "ice-cream",
};

interface AutoFillPreviewSheetProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  dayIndex: number;
  tripContext?: SuggestionContext;
  existingMealIds: string[];
  onConfirm: (suggestions: Record<SuggestibleMealCategory, MealSuggestion | null>) => void;
  onBrowseRecipes: (mealType: SuggestibleMealCategory) => void;
}

export default function AutoFillPreviewSheet({
  visible,
  onClose,
  tripId,
  dayIndex,
  tripContext = {},
  existingMealIds,
  onConfirm,
  onBrowseRecipes,
}: AutoFillPreviewSheetProps) {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Record<SuggestibleMealCategory, MealSuggestion | null>>({
    breakfast: null,
    lunch: null,
    dinner: null,
    snack: null,
  });
  const [swappingCategory, setSwappingCategory] = useState<SuggestibleMealCategory | null>(null);

  // Load suggestions when sheet opens
  useEffect(() => {
    if (visible) {
      loadAllSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, tripContext]);

  const loadAllSuggestions = async () => {
    setLoading(true);
    try {
      const results = await getAutoFillSuggestions(tripContext, existingMealIds);
      setSuggestions(results);
    } catch (error) {
      console.error("[AutoFillPreviewSheet] Error loading suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async (category: SuggestibleMealCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSwappingCategory(category);

    try {
      // Get a new suggestion for this category only
      const currentSuggestionId = suggestions[category]?.recipeId;
      const excludeIds = [...existingMealIds];
      if (currentSuggestionId) {
        excludeIds.push(currentSuggestionId);
      }

      const newSuggestion = await getQuickSuggestion(category, tripContext, excludeIds);
      
      if (newSuggestion) {
        setSuggestions((prev) => ({
          ...prev,
          [category]: newSuggestion,
        }));
      }
    } catch (error) {
      console.error("[AutoFillPreviewSheet] Error swapping suggestion:", error);
    } finally {
      setSwappingCategory(null);
    }
  };

  const handleChooseRecipe = (category: SuggestibleMealCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBrowseRecipes(category);
    // Parent should handle navigation and returning with selected recipe
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(suggestions);
    // Parent should close sheet and show toast with Undo
  };

  const filledCount = Object.values(suggestions).filter(Boolean).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 justify-end">
          {/* Backdrop */}
          <Pressable
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onPress={onClose}
          />

          {/* Sheet Content */}
          <View
            className="rounded-t-3xl overflow-hidden"
            style={{ backgroundColor: PARCHMENT, maxHeight: "90%" }}
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
                      Auto-fill Day {dayIndex}
                    </Text>
                    <Text
                      className="mt-1"
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 14,
                        color: "rgba(255,255,255,0.7)",
                      }}
                    >
                      Review suggestions before applying
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

              {/* Content */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20, paddingTop: 16 }}
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
                      Generating suggestions...
                    </Text>
                  </View>
                ) : (
                  MEAL_ORDER.map((category) => {
                    const suggestion = suggestions[category];
                    const isSwapping = swappingCategory === category;

                    return (
                      <View
                        key={category}
                        className="mx-4 mb-3 bg-white rounded-xl border overflow-hidden"
                        style={{ borderColor: BORDER_SOFT }}
                      >
                        {/* Category Header */}
                        <View
                          className="flex-row items-center px-4 py-3 border-b"
                          style={{ borderColor: BORDER_SOFT, backgroundColor: "rgba(26, 76, 57, 0.03)" }}
                        >
                          <Ionicons
                            name={CATEGORY_ICONS[category]}
                            size={18}
                            color={DEEP_FOREST}
                          />
                          <Text
                            className="ml-2"
                            style={{
                              fontFamily: "Raleway_700Bold",
                              fontSize: 15,
                              color: DEEP_FOREST,
                            }}
                          >
                            {CATEGORY_LABELS[category]}
                          </Text>
                        </View>

                        {/* Suggestion Content */}
                        <View className="p-4">
                          {isSwapping ? (
                            <View className="items-center py-2">
                              <ActivityIndicator size="small" color={EARTH_GREEN} />
                            </View>
                          ) : suggestion ? (
                            <>
                              <Text
                                style={{
                                  fontFamily: "SourceSans3_600SemiBold",
                                  fontSize: 16,
                                  color: DEEP_FOREST,
                                }}
                              >
                                {suggestion.name}
                              </Text>

                              {/* Tags */}
                              {suggestion.tags && suggestion.tags.length > 0 && (
                                <View className="flex-row flex-wrap mt-2" style={{ gap: 6 }}>
                                  {suggestion.tags.slice(0, 3).map((tag, idx) => (
                                    <View
                                      key={idx}
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
                            </>
                          ) : (
                            <Text
                              style={{
                                fontFamily: "SourceSans3_400Regular",
                                fontSize: 14,
                                color: TEXT_SECONDARY,
                                fontStyle: "italic",
                              }}
                            >
                              No suggestion available
                            </Text>
                          )}

                          {/* Action Buttons */}
                          <View className="flex-row mt-3" style={{ gap: 10 }}>
                            {/* Swap Button */}
                            <Pressable
                              onPress={() => handleSwap(category)}
                              disabled={isSwapping}
                              className="flex-row items-center px-3 py-2 rounded-lg active:opacity-80"
                              style={{ backgroundColor: "rgba(26, 76, 57, 0.1)" }}
                            >
                              <Ionicons name="shuffle" size={14} color={EARTH_GREEN} />
                              <Text
                                className="ml-1.5"
                                style={{
                                  fontFamily: "SourceSans3_600SemiBold",
                                  fontSize: 12,
                                  color: EARTH_GREEN,
                                }}
                              >
                                Swap
                              </Text>
                            </Pressable>

                            {/* Choose Recipe Button */}
                            <Pressable
                              onPress={() => handleChooseRecipe(category)}
                              className="flex-row items-center px-3 py-2 rounded-lg active:opacity-80"
                              style={{ backgroundColor: "rgba(26, 76, 57, 0.1)" }}
                            >
                              <Ionicons name="book-outline" size={14} color={EARTH_GREEN} />
                              <Text
                                className="ml-1.5"
                                style={{
                                  fontFamily: "SourceSans3_600SemiBold",
                                  fontSize: 12,
                                  color: EARTH_GREEN,
                                }}
                              >
                                Choose recipe
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              {/* Footer Actions */}
              <View
                className="px-4 py-4 border-t"
                style={{ borderColor: BORDER_SOFT }}
              >
                <View className="flex-row" style={{ gap: 12 }}>
                  {/* Cancel */}
                  <Pressable
                    onPress={onClose}
                    className="flex-1 py-3 rounded-xl border items-center active:opacity-80"
                    style={{ borderColor: BORDER_SOFT, backgroundColor: "white" }}
                  >
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 15,
                        color: DEEP_FOREST,
                      }}
                    >
                      Cancel
                    </Text>
                  </Pressable>

                  {/* Confirm */}
                  <Pressable
                    onPress={handleConfirm}
                    disabled={loading || filledCount === 0}
                    className="flex-1 py-3 rounded-xl items-center active:opacity-90"
                    style={{
                      backgroundColor: loading || filledCount === 0 ? TEXT_SECONDARY : DEEP_FOREST,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 15,
                        color: PARCHMENT,
                      }}
                    >
                      Apply to Day {dayIndex}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
