/**
 * Questions List Screen (Ask a Camper)
 * Uses questionsService for Firestore queries
 * 
 * Connect-only actions: Edit/Delete for owners, Remove for admins/mods
 */

import React, { useState, useEffect } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator, TextInput, Alert } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getQuestions } from "../../services/questionsService";
import { deleteQuestion } from "../../services/connectDeletionService";
import { Question } from "../../types/community";
import { useCurrentUser } from "../../state/userStore";
import AccountRequiredModal from "../../components/AccountRequiredModal";
import OnboardingModal from "../../components/OnboardingModal";
import { useScreenOnboarding } from "../../hooks/useScreenOnboarding";
import { requireAccount } from "../../utils/gating";
import { shouldShowInFeed } from "../../services/moderationService";
import { isAdmin, isModerator, canModerateContent } from "../../services/userService";
import { User } from "../../types/user";
import { ContentActionsAffordance } from "../../components/contentActions";
import { RootStackNavigationProp } from "../../navigation/types";
import CommunitySectionHeader from "../../components/CommunitySectionHeader";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../../constants/colors";
import HandleLink from "../../components/HandleLink";
import { DocumentSnapshot } from "firebase/firestore";

type FilterOption = "all" | "unanswered" | "answered" | "popular";

export default function QuestionsListScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const currentUser = useCurrentUser();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Onboarding modal
  const { showModal, currentTooltip, dismissModal, openModal } = useScreenOnboarding("Ask");

  // Connect-only actions: Permission checks for content actions
  const canModerate = currentUser ? canModerateContent(currentUser as User) : false;
  const roleLabel = currentUser 
    ? isAdmin(currentUser as User) 
      ? "ADMIN" as const
      : isModerator(currentUser as User) 
        ? "MOD" as const 
        : null 
    : null;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadQuestions = async (refresh = false) => {
    try {
      if (refresh) {
        setLoading(true);
        setQuestions([]);
        setLastDoc(null);
        setHasMore(true);
      }

      setError(null);

      const result = await getQuestions(
        filterBy,
        undefined,
        20,
        refresh ? undefined : lastDoc || undefined
      );

      // Filter out hidden content (unless user is author)
      const visibleQuestions = result.questions.filter(q => 
        shouldShowInFeed(q, currentUser?.id)
      );

      if (refresh) {
        setQuestions(visibleQuestions);
      } else {
        setQuestions(prev => [...prev, ...visibleQuestions]);
      }

      setLastDoc(result.lastDoc);
      setHasMore(result.questions.length === 20);
    } catch (err: any) {
      setError(err.message || "Failed to load questions");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadQuestions(true);
  }, [filterBy]);

  useFocusEffect(
    React.useCallback(() => {
      loadQuestions(true);
    }, [filterBy])
  );

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && lastDoc) {
      setLoadingMore(true);
      loadQuestions(false);
    }
  };

  const handleQuestionPress = (questionId: string) => {
    navigation.navigate("QuestionDetail", { questionId });
  };

  const handleAskQuestion = () => {
    // Questions only require an account, not PRO
    const canProceed = requireAccount({
      openAccountModal: () => setShowLoginModal(true),
    });
    
    if (!canProceed) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("CreateQuestion");
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

  const filteredQuestions = searchQuery
    ? questions.filter(q =>
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.body.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : questions;

  const renderQuestion = ({ item }: { item: Question }) => (
    <Pressable
      onPress={() => handleQuestionPress(item.id)}
      className="rounded-xl p-4 mb-3 border active:opacity-90"
      style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
    >
      {/* Connect-only actions: Card header with title and actions */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-start flex-1 mr-2">
          <Text
            className="text-lg flex-1 mr-2"
            style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
          >
            {item.title}
          </Text>
          {item.hasAcceptedAnswer && (
            <View className="bg-green-100 rounded-full px-2 py-1">
              <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            </View>
          )}
        </View>
        <ContentActionsAffordance
          itemId={item.id}
          itemType="question"
          createdByUserId={item.authorId}
          currentUserId={currentUser?.id}
          canModerate={canModerate}
          roleLabel={roleLabel}
          onRequestEdit={() => {
            // Navigate to edit screen (if implemented)
            navigation.navigate("QuestionDetail", { questionId: item.id });
          }}
          onRequestDelete={async () => {
            const result = await deleteQuestion(item.id);
            if (result.success) {
              setQuestions(prev => prev.filter(q => q.id !== item.id));
            } else {
              Alert.alert("Error", result.error?.message || "Failed to delete question");
            }
          }}
          onRequestRemove={async () => {
            const result = await deleteQuestion(item.id);
            if (result.success) {
              setQuestions(prev => prev.filter(q => q.id !== item.id));
            } else {
              Alert.alert("Error", result.error?.message || "Failed to remove question");
            }
          }}
          layout="cardHeader"
          iconSize={18}
        />
      </View>

      <Text
        className="mb-3"
        numberOfLines={2}
        style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
      >
        {item.body}
      </Text>

      {item.tags && item.tags.length > 0 && (
        <View className="flex-row flex-wrap gap-1 mb-3">
          {item.tags.slice(0, 3).map((tag, idx) => (
            <View key={idx} className="px-2 py-1 rounded-full bg-blue-100">
              <Text
                className="text-xs"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: "#1e40af" }}
              >
                {tag}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1 }}>
          {item.authorId && item.authorHandle ? (
            <HandleLink 
              handle={item.authorHandle}
              userId={item.authorId}
              style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 12 }}
            />
          ) : item.authorId ? (
            <Pressable onPress={() => navigation.navigate("MyCampsite", { userId: item.authorId })}>
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 12, color: DEEP_FOREST, textDecorationLine: "underline" }}>
                {item.authorHandle ? `@${item.authorHandle}` : "Anonymous"}
              </Text>
            </Pressable>
          ) : (
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 12, color: TEXT_MUTED }}>
              {item.authorHandle ? `@${item.authorHandle}` : "Anonymous"}
            </Text>
          )}
          <Text style={{ marginHorizontal: 6, opacity: 0.7, color: TEXT_MUTED }}>•</Text>
          <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: TEXT_MUTED }}>
            {formatTimeAgo(item.createdAt)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="chatbubble-outline" size={16} color={TEXT_MUTED} />
          <Text style={{ marginLeft: 4, fontSize: 12, fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
            {item.answerCount} {item.answerCount === 1 ? "answer" : "answers"}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-parchment">
        <ActivityIndicator size="large" color={DEEP_FOREST} />
        <Text
          className="mt-4"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
        >
          Loading questions...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-parchment">
        <CommunitySectionHeader
          title="Ask a Camper"
          onAddPress={handleAskQuestion}
        />
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="alert-circle-outline" size={64} color={EARTH_GREEN} />
          <Text
            className="mt-4 text-center text-lg"
            style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
          >
            Failed to load questions
          </Text>
          <Text
            className="mt-2 text-center"
            style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
          >
            {error}
          </Text>
          <Pressable
            onPress={() => loadQuestions(true)}
            className="mt-6 px-6 py-3 rounded-xl active:opacity-90"
            style={{ backgroundColor: DEEP_FOREST }}
        >
          <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
            Retry
          </Text>
        </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-parchment">
      {/* Action Bar */}
      <CommunitySectionHeader
        title="Ask a Camper"
        onAddPress={handleAskQuestion}
        onInfoPress={openModal}
      />

      {/* Search and Filters */}
      <View className="px-5 py-3 border-b" style={{ borderColor: BORDER_SOFT }}>
        {/* Search */}
        <View className="flex-row items-center bg-white rounded-xl px-4 py-2 border mb-3" style={{ borderColor: BORDER_SOFT }}>
          <Ionicons name="search" size={18} color={TEXT_MUTED} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search questions"
            placeholderTextColor={TEXT_MUTED}
            className="flex-1 ml-2"
            style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_PRIMARY_STRONG }}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
            </Pressable>
          )}
        </View>

        {/* Filter Chips */}
        <View className="flex-row gap-2">
          {[
            { id: "all" as FilterOption, label: "All" },
            { id: "unanswered" as FilterOption, label: "Unanswered" },
            { id: "answered" as FilterOption, label: "Answered" },
            { id: "popular" as FilterOption, label: "Popular" },
          ].map(option => (
            <Pressable
              key={option.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilterBy(option.id);
              }}
              className={`px-4 py-2 rounded-full ${
                filterBy === option.id ? "bg-forest" : "bg-white border"
              }`}
              style={filterBy !== option.id ? { borderColor: BORDER_SOFT } : undefined}
            >
              <Text
                className="text-sm"
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  color: filterBy === option.id ? PARCHMENT : TEXT_PRIMARY_STRONG
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* List */}
      {filteredQuestions.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="help-circle-outline" size={64} color={GRANITE_GOLD} />
          <Text
            className="mt-4 text-xl text-center"
            style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
          >
            No questions yet
          </Text>
          <Text
            className="mt-2 text-center"
            style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
          >
            Be the first to ask the community!
          </Text>
          <Pressable
            onPress={handleAskQuestion}
            className="mt-6 px-6 py-3 rounded-xl active:opacity-90"
            style={{ backgroundColor: DEEP_FOREST }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
              Ask Your First Question
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredQuestions}
          renderItem={renderQuestion}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListFooterComponent={
            hasMore ? (
              <Pressable
                onPress={handleLoadMore}
                disabled={loadingMore}
                className="py-4 items-center"
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
