/**
 * Feedback List Screen
 * Shows app feedback posts from the community
 */

import React, { useState, useEffect } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator, TextInput } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { feedbackService, FeedbackPost } from "../../services/firestore/feedbackService";
import { feedbackVoteService } from "../../services/firestore/feedbackVoteService";
import { auth } from "../../config/firebase";
import AccountRequiredModal from "../../components/AccountRequiredModal";
import OnboardingModal from "../../components/OnboardingModal";
import { useScreenOnboarding } from "../../hooks/useScreenOnboarding";
import { requireProForAction } from "../../utils/gating";
import { shouldShowInFeed } from "../../services/moderationService";
import { RootStackNavigationProp } from "../../navigation/types";
import CommunitySectionHeader from "../../components/CommunitySectionHeader";
import { seedFeedbackIfEmpty } from "../../features/feedback/seedFeedback";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../../constants/colors";

type CategoryFilter = 'Feature Request' | 'Bug Report' | 'Improvement' | 'Question' | 'Other' | 'all';

export default function FeedbackListScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const currentUser = auth.currentUser;
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Onboarding modal
  const { showModal, currentTooltip, dismissModal, openModal } = useScreenOnboarding("Feedback");

  const [posts, setPosts] = useState<(FeedbackPost & { voteScore: number; userVote: "up" | "down" | null; commentCount?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");

  // Seed on mount
  useEffect(() => {
    console.log("[FeedbackList] Mounting feedback screen, running seed check.");
    seedFeedbackIfEmpty().catch(err => {
      console.error("[FeedbackList] Seed failed:", err);
    });
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const allPosts = await feedbackService.getFeedback();
      // Filter out hidden content (unless user is author)
      const visiblePosts = allPosts.filter(post => 
        shouldShowInFeed(post, currentUser?.uid)
      );
      // TODO: Replace with actual comment count fetch if available
      const postsWithVotes = await Promise.all(
        visiblePosts.map(async (post) => {
          let voteScore = post.karmaScore || 0;
          let userVote: "up" | "down" | null = null;
          try {
            const summary = await feedbackVoteService.getUserVote(post.id);
            if (summary) userVote = summary.value === 1 ? "up" : summary.value === -1 ? "down" : null;
          } catch {}
          // Placeholder: commentCount is not implemented, set to 0
          return { ...post, voteScore, userVote, commentCount: post.commentCount ?? 0 };
        })
      );
      const filtered = selectedCategory === "all"
        ? postsWithVotes
        : postsWithVotes.filter(post => post.category === selectedCategory);
      setPosts(filtered);
    } catch (err: any) {
      setError(err.message || "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [selectedCategory]);

  useFocusEffect(
    React.useCallback(() => {
      loadPosts();
    }, [selectedCategory])
  );

  const handlePostPress = (postId: string) => {
    navigation.navigate("FeedbackDetail", { postId });
  };
  
  const handleCreatePost = () => {
    // Feedback submission requires Pro
    requireProForAction(
      () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate("CreateFeedback");
      },
      {
        openAccountModal: () => setShowLoginModal(true),
        openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "feedback_create", variant }),
      }
    );
  };

  const handleUpvote = async (postId: string) => {
    // Voting requires Pro
    requireProForAction(
      async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
          await feedbackService.upvoteFeedback(postId);
          setPosts(prev =>
            prev.map(p => (p.id === postId ? { ...p, karmaScore: p.karmaScore + 1 } : p))
          );
        } catch (err) {
          // Silently fail
        }
      },
      {
        openAccountModal: () => setShowLoginModal(true),
        openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "feedback_vote", variant }),
      }
    );
  };

  const handleDownvote = async (postId: string) => {
    // Voting requires Pro
    requireProForAction(
      async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
          await feedbackService.adjustKarma(postId, -1);
          setPosts(prev =>
            prev.map(p => (p.id === postId ? { ...p, karmaScore: p.karmaScore - 1 } : p))
          );
        } catch (err) {
          // Silently fail
        }
      },
      {
        openAccountModal: () => setShowLoginModal(true),
        openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "feedback_vote", variant }),
      }
    );
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "Feature Request":
        return "Feature Request";
      case "Bug Report":
        return "Bug Report";
      case "Improvement":
        return "Improvement";
      case "Question":
        return "Question";
      case "Other":
        return "Other";
      default:
        return category;
    }
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

  const renderPost = ({ item }: { item: FeedbackPost & { voteScore: number; userVote: "up" | "down" | null; commentCount?: number } }) => {
    return (
      <Pressable
        onPress={() => handlePostPress(item.id)}
        className="rounded-xl p-4 mb-3 border active:opacity-90"
        style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
      >
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-row items-center gap-2 flex-1">
            <View className="px-3 py-1 rounded-full bg-amber-100">
              <Text className="text-xs" style={{ fontFamily: "SourceSans3_600SemiBold", color: "#92400e" }}>
                {getCategoryLabel(item.category)}
              </Text>
            </View>
          </View>
        </View>

        <Text
          className="text-lg mb-2"
          style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
        >
          {item.title}
        </Text>

        <Text
          className="mb-3"
          numberOfLines={2}
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
        >
          {item.description}
        </Text>

        {/* Footer: author, date, and comments count */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTopWidth: 1, borderColor: BORDER_SOFT }}>
          <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1 }}>
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 12, color: TEXT_MUTED }}>
              {item.authorName || "Anonymous"}
            </Text>
            <Text style={{ marginHorizontal: 6, opacity: 0.7, color: TEXT_MUTED }}>•</Text>
            <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: TEXT_MUTED }}>
              {formatTimeAgo(item.createdAt)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="chatbubble-outline" size={16} color={TEXT_MUTED} />
            <Text style={{ marginLeft: 4, fontSize: 12, fontFamily: "SourceSans3_600SemiBold", color: TEXT_MUTED }}>
              {item.commentCount ?? 0}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-parchment">
        <ActivityIndicator size="large" color={DEEP_FOREST} />
        <Text
          className="mt-4"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
        >
          Loading feedback...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-parchment px-5">
        <Ionicons name="alert-circle-outline" size={64} color={EARTH_GREEN} />
        <Text
          className="mt-4 text-center text-lg"
          style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
        >
          Failed to load feedback
        </Text>
        <Text
          className="mt-2 text-center"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
        >
          {error}
        </Text>
        <Pressable
          onPress={() => loadPosts()}
          className="mt-6 px-6 py-3 rounded-xl active:opacity-90"
          style={{ backgroundColor: DEEP_FOREST }}
        >
          <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-parchment">
      {/* Action Bar */}
      <CommunitySectionHeader
        title="App Feedback"
        onAddPress={handleCreatePost}
        onInfoPress={openModal}
      />

      {/* Category Filter */}
      <View className="px-5 py-3 border-b" style={{ borderColor: BORDER_SOFT }}>
        <View className="flex-row flex-wrap gap-2">
          {[
            { id: "all" as CategoryFilter, label: "All" },
            { id: "feature" as CategoryFilter, label: "Features" },
            { id: "bug" as CategoryFilter, label: "Bugs" },
            { id: "improvement" as CategoryFilter, label: "Improvements" },
            { id: "question" as CategoryFilter, label: "Questions" },
            { id: "other" as CategoryFilter, label: "Other" },
          ].map(option => (
            <Pressable
              key={option.label}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCategory(option.id);
              }}
              className={`px-3 py-1 rounded-full border ${
                selectedCategory === option.id ? "bg-amber-100 border-amber-600" : "bg-white"
              }`}
              style={selectedCategory !== option.id ? { borderColor: BORDER_SOFT } : undefined}
            >
              <Text
                className="text-xs"
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  color: selectedCategory === option.id ? "#92400e" : TEXT_SECONDARY
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* List */}
      {posts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <View className="items-center mb-8">
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: DEEP_FOREST + "15" }}
            >
              <Ionicons name="chatbubbles-outline" size={48} color={DEEP_FOREST} />
            </View>
            <Text
              className="text-2xl text-center mb-3"
              style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
            >
              Share Your Feedback
            </Text>
            <Text
              className="text-center text-base mb-6"
              style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, lineHeight: 24 }}
            >
              Help us improve! Share feature requests, report bugs, or suggest improvements.
            </Text>
          </View>

          {/* Feedback Categories Preview */}
          <View className="w-full mb-6">
            <View className="flex-row flex-wrap gap-3 justify-center">
              <View className="items-center" style={{ width: 100 }}>
                <View
                  className="w-14 h-14 rounded-full items-center justify-center mb-2"
                  style={{ backgroundColor: "#f59e0b15" }}
                >
                  <Ionicons name="bulb-outline" size={28} color="#f59e0b" />
                </View>
                <Text className="text-xs text-center" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_SECONDARY }}>
                  Features
                </Text>
              </View>
              <View className="items-center" style={{ width: 100 }}>
                <View
                  className="w-14 h-14 rounded-full items-center justify-center mb-2"
                  style={{ backgroundColor: "#ef444415" }}
                >
                  <Ionicons name="bug-outline" size={28} color="#ef4444" />
                </View>
                <Text className="text-xs text-center" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_SECONDARY }}>
                  Bugs
                </Text>
              </View>
              <View className="items-center" style={{ width: 100 }}>
                <View
                  className="w-14 h-14 rounded-full items-center justify-center mb-2"
                  style={{ backgroundColor: "#3b82f615" }}
                >
                  <Ionicons name="trending-up-outline" size={28} color="#3b82f6" />
                </View>
                <Text className="text-xs text-center" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_SECONDARY }}>
                  Improvements
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={handleCreatePost}
            className="px-6 py-3 rounded-lg active:opacity-90 flex-row items-center"
            style={{ backgroundColor: DEEP_FOREST }}
          >
            <Ionicons name="add-circle-outline" size={20} color={PARCHMENT} />
            <Text className="ml-2 text-sm" style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
              Submit Feedback
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
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

