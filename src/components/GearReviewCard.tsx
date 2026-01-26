import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { GearReview } from "../types/gearReview";
import { DEEP_FOREST, EARTH_GREEN, GRANITE_GOLD, RIVER_ROCK, SIERRA_SKY, PARCHMENT, PARCHMENT_BORDER } from "../constants/colors";

interface GearReviewCardProps {
  review: GearReview;
  onPress: () => void;
}

export default function GearReviewCard({ review, onPress }: GearReviewCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    return date.toLocaleDateString();
  };

  const renderStars = (rating?: number) => {
    const validRating = rating ?? 0;
    return (
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= validRating ? "star" : star - 0.5 <= validRating ? "star-half" : "star-outline"}
            size={16}
            color={GRANITE_GOLD}
          />
        ))}
      </View>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      className="bg-parchment rounded-xl p-4 border border-cream-200 mb-3 active:opacity-70"
    >
      {/* Header */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-2">
          <Text className="text-base text-forest-800 mb-1" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
            {review.gearName}
          </Text>
          <Text className="text-sm text-stone-600" style={{ fontFamily: "SourceSans3_400Regular" }}>{review.manufacturer}</Text>
        </View>
        {review.overallRating != null && (
          <View className="items-end">
            {renderStars(review.overallRating)}
            <Text className="text-xs text-stone-500 mt-1" style={{ fontFamily: "SourceSans3_400Regular" }}>
              {review.overallRating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Review Title */}
      <Text className="text-sm text-forest-700 mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>{review.title}</Text>

      {/* Review Excerpt */}
      <Text className="text-sm text-stone-700 mb-3" numberOfLines={2} style={{ fontFamily: "SourceSans3_400Regular" }}>
        {review.reviewText}
      </Text>

      {/* Tags */}
      {review.activityTags && review.activityTags.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mb-3">
          {review.activityTags.slice(0, 3).map((tag) => (
            <View key={tag} className="bg-amber-100 rounded-full px-2 py-1">
              <Text className="text-xs text-amber-800" style={{ fontFamily: "SourceSans3_400Regular" }}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View className="flex-row items-center justify-between pt-3 border-t border-cream-200">
        <View className="flex-row items-center">
          <Text className="text-xs text-stone-600" style={{ fontFamily: "SourceSans3_400Regular" }}>
            by {review.authorHandle}
          </Text>
          <Text className="text-stone-400 mx-2" style={{ fontFamily: "SourceSans3_400Regular" }}>•</Text>
          <Text className="text-xs text-stone-500" style={{ fontFamily: "SourceSans3_400Regular" }}>{formatDate(review.createdAt)}</Text>
        </View>

        <View className="flex-row items-center">
          {review.verifiedPurchase && (
            <>
              <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
              <Text className="text-xs text-green-600 ml-1 mr-3" style={{ fontFamily: "SourceSans3_600SemiBold" }}>Verified</Text>
            </>
          )}
          <Ionicons name="thumbs-up-outline" size={14} color={EARTH_GREEN} />
          <Text className="text-xs text-stone-600 ml-1" style={{ fontFamily: "SourceSans3_400Regular" }}>{review.helpfulCount}</Text>
        </View>
      </View>
    </Pressable>
  );
}
