/**
 * MealSuggestionBottomSheet
 * A bottom sheet component for browsing and selecting meal suggestions
 * Features organized sections: Favorites, Quick & Easy, Already Used, More Ideas
 */

import React, { useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  Animated, 
  Dimensions, 
  Modal 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { 
  MealSuggestion, 
  COMPLEXITY_ICONS,
  COOKING_METHOD_ICONS,
} from "../types/meals";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

interface FrequentMeal {
  name: string;
  count: number;
}

interface MealSuggestionBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  suggestions: MealSuggestion[];
  onSelectSuggestion: (suggestion: MealSuggestion) => void;
  mealType: "breakfast" | "lunch" | "dinner" | "snacks";
  usedMealIds?: Set<string>;
  frequentlyUsed?: FrequentMeal[];
}

export default function MealSuggestionBottomSheet({
  visible,
  onClose,
  suggestions,
  onSelectSuggestion,
  mealType,
  usedMealIds = new Set(),
  frequentlyUsed = [],
}: MealSuggestionBottomSheetProps) {
  const slideAnim = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: BOTTOM_SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  // Organize suggestions
  const frequentSuggestions = suggestions.filter(s => 
    frequentlyUsed.some(f => f.name.toLowerCase() === s.name.toLowerCase())
  );
  const usedThisTrip = suggestions.filter(s => usedMealIds.has(s.id));
  const quickMeals = suggestions.filter(s => 
    (s.prepTime + s.cookTime) <= 15 && !usedMealIds.has(s.id)
  );
  const otherSuggestions = suggestions.filter(s => 
    !usedMealIds.has(s.id) && 
    (s.prepTime + s.cookTime) > 15 &&
    !frequentlyUsed.some(f => f.name.toLowerCase() === s.name.toLowerCase())
  );

  const mealTypeLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <View className="flex-1">
        {/* Backdrop */}
        <Pressable 
          className="flex-1 bg-black/50"
          onPress={onClose}
        />

        {/* Bottom Sheet */}
        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
            height: BOTTOM_SHEET_HEIGHT,
          }}
          className="bg-white rounded-t-3xl shadow-2xl"
        >
          {/* Handle */}
          <View className="items-center pt-3 pb-2">
            <View className="w-12 h-1 bg-gray-300 rounded-full" />
          </View>

          {/* Header */}
          <View className="px-6 pb-4 border-b border-gray-200 flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-gray-800 capitalize">
                {mealTypeLabel} Ideas
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                {suggestions.length} options • Tap to use
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="bg-gray-100 rounded-full p-2"
            >
              <Ionicons name="close" size={24} color="#666" />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView 
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
          >
            {/* Frequently Used */}
            {frequentSuggestions.length > 0 && (
              <View className="mt-4">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="star" size={16} color="#D4AF37" />
                  <Text className="text-sm font-semibold text-gray-800 ml-2">
                    YOUR FAVORITES
                  </Text>
                </View>
                {frequentSuggestions.map(suggestion => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onSelect={onSelectSuggestion}
                    badge="⭐"
                  />
                ))}
              </View>
            )}

            {/* Quick Meals */}
            {quickMeals.length > 0 && (
              <View className="mt-4">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="flash" size={16} color="#D4AF37" />
                  <Text className="text-sm font-semibold text-gray-800 ml-2">
                    QUICK & EASY (15 min or less)
                  </Text>
                </View>
                {quickMeals.slice(0, 5).map(suggestion => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onSelect={onSelectSuggestion}
                    badge="⚡"
                  />
                ))}
              </View>
            )}

            {/* Used This Trip */}
            {usedThisTrip.length > 0 && (
              <View className="mt-4">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="checkmark-circle" size={16} color="#6B8E23" />
                  <Text className="text-sm font-semibold text-gray-500 ml-2">
                    ALREADY USED THIS TRIP
                  </Text>
                </View>
                {usedThisTrip.map(suggestion => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onSelect={onSelectSuggestion}
                    dimmed
                  />
                ))}
              </View>
            )}

            {/* All Other Suggestions */}
            {otherSuggestions.length > 0 && (
              <View className="mt-4 mb-6">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="restaurant" size={16} color="#D4AF37" />
                  <Text className="text-sm font-semibold text-gray-800 ml-2">
                    MORE IDEAS
                  </Text>
                </View>
                {otherSuggestions.map(suggestion => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onSelect={onSelectSuggestion}
                  />
                ))}
              </View>
            )}

            {/* Bottom padding */}
            <View className="h-8" />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface SuggestionCardProps {
  suggestion: MealSuggestion;
  onSelect: (suggestion: MealSuggestion) => void;
  badge?: string;
  dimmed?: boolean;
}

function SuggestionCard({ suggestion, onSelect, badge, dimmed }: SuggestionCardProps) {
  const totalTime = suggestion.prepTime + suggestion.cookTime;
  
  return (
    <Pressable
      onPress={() => onSelect(suggestion)}
      className={`bg-amber-50 rounded-xl p-4 mb-3 active:bg-amber-100 ${
        dimmed ? "opacity-50" : ""
      }`}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center">
            {badge && <Text className="mr-2">{badge}</Text>}
            <Text className="text-base font-semibold text-gray-800 flex-1">
              {suggestion.name}
            </Text>
          </View>
          {suggestion.description && (
            <Text className="text-sm text-gray-600 mt-1">
              {suggestion.description}
            </Text>
          )}
        </View>
        <Text className="text-lg">{COMPLEXITY_ICONS[suggestion.complexity]}</Text>
      </View>

      {/* Meta Info */}
      <View className="flex-row flex-wrap items-center gap-3">
        {/* Cooking Methods */}
        <View className="flex-row items-center">
          {suggestion.cookingMethods.slice(0, 2).map((method, idx) => (
            <Text key={idx} className="text-base mr-1">
              {COOKING_METHOD_ICONS[method]}
            </Text>
          ))}
        </View>

        {/* Time */}
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text className="text-xs text-gray-600 ml-1">
            {totalTime} min
          </Text>
        </View>

        {/* Storage */}
        {suggestion.storage !== "none" && (
          <View className="flex-row items-center">
            <Ionicons name="snow-outline" size={14} color="#666" />
            <Text className="text-xs text-gray-600 ml-1">
              Cooler
            </Text>
          </View>
        )}

        {/* Dietary Tags */}
        {suggestion.dietaryTags.length > 0 && (
          <View className="flex-row items-center">
            <Text className="text-xs text-amber-700">
              {suggestion.dietaryTags[0]}
            </Text>
          </View>
        )}
      </View>

      {/* Prep Ahead Tip */}
      {suggestion.prepAhead && (
        <View className="mt-2 bg-amber-100 rounded-lg p-2">
          <Text className="text-xs text-amber-800">
            💡 {suggestion.prepAhead}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
