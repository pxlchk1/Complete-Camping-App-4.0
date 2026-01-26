/**
 * Gear Reviews List Screen
 * Shows list of gear reviews with category filtering
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { DocumentSnapshot } from "firebase/firestore";
import * as Haptics from "expo-haptics";
import { getGearReviews } from "../../services/gearReviewsService";
import { gearReviewVotesService } from "../../services/firestore/gearReviewVotesService";
import { GearReview, GearCategory } from "../../types/community";
import { RootStackNavigationProp, RootStackParamList } from "../../navigation/types";
import { useCurrentUser } from "../../state/userStore";
import AccountRequiredModal from "../../components/AccountRequiredModal";
import OnboardingModal from "../../components/OnboardingModal";
import { useScreenOnboarding } from "../../hooks/useScreenOnboarding";
import { requirePro } from "../../utils/gating";
import { shouldShowInFeed } from "../../services/moderationService";
import CommunitySectionHeader from "../../components/CommunitySectionHeader";
import {
  DEEP_FOREST,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../../constants/colors";

type CategoryFilter = "all" | GearCategory;

const CATEGORIES: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "shelter", label: "Shelter" },
  { value: "sleep", label: "Sleep" },
  { value: "kitchen", label: "Kitchen" },
  { value: "clothing", label: "Clothing" },
  { value: "lighting", label: "Lighting" },
  { value: "pack", label: "Packs" },
  { value: "water", label: "Water" },
  { value: "safety", label: "Safety" },
  { value: "misc", label: "Other" },
];

export default function GearReviewsListScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, "GearReviewsListScreen">>();
  const currentUser = useCurrentUser();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Onboarding modal
  const { showModal, currentTooltip, dismissModal, openModal } = useScreenOnboarding("Gear");

  // Tag filter from navigation params
  const [tagFilter, setTagFilter] = useState<string | null>(route.params?.filterByTag || null);

  const [reviews, setReviews] = useState<(GearReview & { voteScore: number; userVote: "up" | "down" | null })[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<(GearReview & { voteScore: number; userVote: "up" | "down" | null })[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const toDateString = (date: any): string => {
    if (typeof date === "string") return date;
    if (date?.toDate) return date.toDate().toISOString();
    return new Date().toISOString();
  };

  const formatTimeAgo = (dateString: string | any) => {
    const now = new Date();
    const date = typeof dateString === "string" ? new Date(dateString) : dateString.toDate?.() || new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    return date.toLocaleDateString();
  };

  const loadReviews = async (refresh = false) => {
    try {
      if (refresh) {
        setLoading(true);
        setReviews([]);
        setLastDoc(null);
        setHasMore(true);
        setError(null);
      }

      const result = await getGearReviews(
        category === "all" ? "all" : category,
        20,
        refresh ? undefined : lastDoc || undefined
      );

      // Filter out hidden content (unless user is author)
      const visibleReviews = result.reviews.filter(review => 
        shouldShowInFeed(review, currentUser?.id)
      );

      // Fetch votes for each review
      const reviewsWithVotes = await Promise.all(
        visibleReviews.map(async (review) => {
          let voteScore = 0;
          let userVote: "up" | "down" | null = null;
          try {
            const summary = await gearReviewVotesService.getVoteSummary(review.id);
            voteScore = summary.score;
            if (currentUser) {
              const vote = await gearReviewVotesService.getUserVote(review.id);
              userVote = vote?.voteType || null;
            }
          } catch {
            voteScore = review.upvoteCount || 0;
          }
          return { ...review, voteScore, userVote };
        })
      );

      if (refresh) {
        setReviews(reviewsWithVotes);
      } else {
        setReviews((prev) => [...prev, ...reviewsWithVotes]);
      }

      setLastDoc(result.lastDoc);
      setHasMore(result.reviews.length === 20);
    } catch (err: any) {
      setError(err.message || "Failed to load gear reviews");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && !loading && hasMore) {
      setLoadingMore(true);
      loadReviews(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadReviews(true);
  };

  const handleCategoryChange = (newCategory: CategoryFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategory(newCategory);
    setReviews([]);
    setLastDoc(null);
    setHasMore(true);
    setLoading(true);
  };

  useEffect(() => {
    loadReviews(true);
  }, [category]);

  // Refresh reviews when screen gains focus (e.g., after navigating back from detail/delete)
  useFocusEffect(
    useCallback(() => {
      // Update tag filter from route params when screen is focused
      const newTagFilter = route.params?.filterByTag || null;
      if (newTagFilter !== tagFilter) {
        setTagFilter(newTagFilter);
      }
      // Only refresh if we already have reviews loaded (skip initial mount)
      if (reviews.length > 0) {
        loadReviews(true);
      }
    }, [category, route.params?.filterByTag])
  );

  useEffect(() => {
    let filtered = reviews;

    // Apply tag filter if active
    if (tagFilter) {
      filtered = filtered.filter((r) =>
        r.tags?.some((t) => t.toLowerCase() === tagFilter.toLowerCase())
      );
    }

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.gearName.toLowerCase().includes(query) ||
          r.brand?.toLowerCase().includes(query) ||
          r.summary.toLowerCase().includes(query)
      );
    }

    setFilteredReviews(filtered);
  }, [searchQuery, reviews, tagFilter]);

  const renderReviewItem = ({ item }: { item: GearReview & { voteScore: number; userVote: "up" | "down" | null } }) => (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate("GearReviewDetail", { reviewId: item.id });
      }}
      className="mb-3 p-4 rounded-xl border active:opacity-90"
      style={{
        backgroundColor: CARD_BACKGROUND_LIGHT,
        borderColor: BORDER_SOFT,
      }}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <Text
            className="text-lg mb-1"
            style={{
              fontFamily: "Raleway_700Bold",
              color: TEXT_PRIMARY_STRONG,
            }}
            numberOfLines={1}
          >
            {item.gearName}
          </Text>
          {item.brand && (
            <Text
              className="text-sm mb-1"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_SECONDARY }}
            >
              {item.brand}
            </Text>
          )}
        </View>
        <View className="flex-row items-center">
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text
            className="ml-1"
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              color: TEXT_PRIMARY_STRONG,
            }}
          >
            {item.rating.toFixed(1)}
          </Text>
        </View>
      </View>

      <Text
        className="mb-2"
        style={{
          fontFamily: "SourceSans3_400Regular",
          color: TEXT_SECONDARY,
          lineHeight: 20,
        }}
        numberOfLines={2}
      >
        {item.summary}
      </Text>

      {item.tags && item.tags.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mb-2">
          {item.tags.slice(0, 3).map((tag) => (
            <Pressable
              key={tag}
              onPress={(e) => {
                e.stopPropagation();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTagFilter(tag);
              }}
              className="px-2 py-1 rounded-full active:opacity-70"
              style={{ backgroundColor: tagFilter === tag ? DEEP_FOREST : "#F3F4F6" }}
            >
              <Text
                className="text-xs"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: tagFilter === tag ? PARCHMENT : "#6B7280" }}
              >
                {tag}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 12, color: TEXT_MUTED }}>
          {item.authorName || "Anonymous"}
        </Text>
        <Text style={{ marginHorizontal: 6, opacity: 0.7, color: TEXT_MUTED }}>•</Text>
        <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: TEXT_MUTED }}>
          {formatTimeAgo(toDateString(item.createdAt))}
        </Text>
      </View>
    </Pressable>
  );

  const renderEmptyState = () => {
    if (loading) return null;

    return (
      <View className="flex-1 items-center justify-center px-6 py-12">
        <Ionicons name="bag-outline" size={64} color={TEXT_MUTED} />
        <Text
          className="text-lg mt-4 mb-2 text-center"
          style={{
            fontFamily: "Raleway_700Bold",
            color: TEXT_PRIMARY_STRONG,
          }}
        >
          No reviews yet
        </Text>
        <Text
          className="text-center mb-6"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
        >
          {searchQuery
            ? "No reviews match your search"
            : "Be the first to review camping gear"}
        </Text>
        {!searchQuery && (
          <Pressable
            onPress={() => {
              // Gear Reviews require PRO subscription
              const canProceed = requirePro({
                openAccountModal: () => setShowLoginModal(true),
                openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "gear_review_create", variant }),
              });
              if (!canProceed) return;
              
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate("CreateGearReview");
            }}
            className="px-6 py-3 rounded-xl active:opacity-90"
            style={{ backgroundColor: DEEP_FOREST }}
          >
            <Text
              style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
            >
              Write First Review
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  const renderErrorState = () => (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
      <Text
        className="text-lg mt-4 mb-2 text-center"
        style={{
          fontFamily: "Raleway_700Bold",
          color: TEXT_PRIMARY_STRONG,
        }}
      >
        Something Went Wrong
      </Text>
      <Text
        className="text-center mb-6"
        style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
      >
        {error}
      </Text>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setError(null);
          setLoading(true);
          loadReviews(true);
        }}
        className="px-6 py-3 rounded-xl active:opacity-90"
        style={{ backgroundColor: DEEP_FOREST }}
      >
        <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
          Retry
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View className="flex-1 bg-parchment">
      {/* Action Bar */}
      <CommunitySectionHeader
        title="Gear Reviews"
        onInfoPress={openModal}
        onAddPress={() => {
          // Gear Reviews require PRO subscription
          const canProceed = requirePro({
            openAccountModal: () => setShowLoginModal(true),
            openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "gear_review_create", variant }),
          });
          if (!canProceed) return;
          
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate("CreateGearReview");
        }}
      />

      {/* Search Bar */}
      <View className="px-5 py-3">
        <View className="flex-row items-center px-4 py-3 rounded-xl border" style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}>
          <Ionicons name="search" size={20} color={TEXT_MUTED} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search gear..."
            placeholderTextColor={TEXT_MUTED}
            className="flex-1 ml-2"
            style={{
              fontFamily: "SourceSans3_400Regular",
              color: TEXT_PRIMARY_STRONG,
              fontSize: 16,
            }}
          />
        </View>
      </View>

      {/* Category Filters */}
      <View className="px-5 pb-3">
        {/* Active Tag Filter Indicator */}
        {tagFilter && (
          <View className="flex-row items-center mb-3">
            <Text style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, marginRight: 8 }}>
              Filtered by tag:
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTagFilter(null);
                // Clear the route param as well
                navigation.setParams({ filterByTag: undefined });
              }}
              className="flex-row items-center px-3 py-1.5 rounded-full"
              style={{ backgroundColor: DEEP_FOREST }}
            >
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT, marginRight: 6 }}>
                {tagFilter}
              </Text>
              <Ionicons name="close-circle" size={16} color={PARCHMENT} />
            </Pressable>
          </View>
        )}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleCategoryChange(item.value)}
              className="mr-2 px-4 py-2 rounded-full active:opacity-70"
              style={{
                backgroundColor:
                  category === item.value ? DEEP_FOREST : CARD_BACKGROUND_LIGHT,
                borderWidth: 1,
                borderColor: category === item.value ? DEEP_FOREST : BORDER_SOFT,
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  color: category === item.value ? PARCHMENT : TEXT_PRIMARY_STRONG,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Content */}
      {error ? (
        renderErrorState()
      ) : loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
        </View>
      ) : (
        <FlatList
          data={filteredReviews}
          keyExtractor={(item) => item.id}
          renderItem={renderReviewItem}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={DEEP_FOREST}
            />
          }
          ListFooterComponent={
            hasMore && !searchQuery && filteredReviews.length > 0 ? (
              <Pressable
                onPress={handleLoadMore}
                disabled={loadingMore}
                className="py-3 px-6 rounded-xl items-center mt-2 active:opacity-90"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderWidth: 1, borderColor: BORDER_SOFT }}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={DEEP_FOREST} />
                ) : (
                  <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}>
                    Load More
                  </Text>
                )}
              </Pressable>
            ) : null
          }
        />
      )}
      <AccountRequiredModal
        visible={showLoginModal}
        onCreateAccount={() => {
          setShowLoginModal(false);
          navigation.navigate("Auth");
        }}
        onMaybeLater={() => setShowLoginModal(false)}
      />

      {/* Onboarding Modal */}
      <OnboardingModal
        visible={showModal}
        tooltip={currentTooltip}
        onDismiss={dismissModal}
      />
    </View>
  );
}
