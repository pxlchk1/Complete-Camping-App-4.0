/**
 * Question Detail Screen
 * Shows question with all answers and allows posting new answers
 * 
 * Connect-only actions: Edit/Delete for owners, Remove for admins/mods
 */

import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ModalHeader from "../../components/ModalHeader";
import VotePill from "../../components/VotePill";
import AccountRequiredModal from "../../components/AccountRequiredModal";
import { ContentActionsAffordance } from "../../components/contentActions";
import { requireEmailVerification } from "../../utils/authHelper";
import * as Haptics from "expo-haptics";
import {
  getQuestionById,
  getAnswers,
  createAnswer,
  upvoteAnswer,
  incrementQuestionViews,
} from "../../services/questionsService";
import { deleteQuestion } from "../../services/connectDeletionService";
import { getUser, isAdmin, isModerator, canModerateContent } from "../../services/userService";
import { Question, Answer } from "../../types/community";
import { User } from "../../types/user";
import { useCurrentUser } from "../../state/userStore";
import { RootStackScreenProps } from "../../navigation/types";
import {
  DEEP_FOREST,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  EARTH_GREEN,
} from "../../constants/colors";
import HandleLink from "../../components/HandleLink";

type RouteParams = RootStackScreenProps<"QuestionDetail">;

export default function QuestionDetailScreen() {
  const route = useRoute<RouteParams["route"]>();
  const navigation = useNavigation<RouteParams["navigation"]>();
  const { questionId } = route.params;
  const currentUser = useCurrentUser();
  const scrollViewRef = useRef<ScrollView>(null);

  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [showAccountRequired, setShowAccountRequired] = useState(false);

  // Permission checks for content actions
  const canModerate = currentUser ? canModerateContent(currentUser as User) : false;
  const roleLabel = currentUser 
    ? isAdmin(currentUser as User) 
      ? "ADMIN" as const
      : isModerator(currentUser as User) 
        ? "MOD" as const 
        : null 
    : null;

  // Scroll to input when focused so keyboard doesn't cover it
  const handleInputFocus = () => {
    // Delay to allow KeyboardAvoidingView to adjust first
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  // Content action handlers
  const handleDeleteQuestion = async () => {
    Alert.alert(
      "Delete Question",
      "Are you sure you want to delete this question? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await deleteQuestion(questionId);
            if (result.success) {
              Alert.alert("Success", "Question deleted successfully");
              navigation.goBack();
            } else {
              console.error("[QuestionDetail] Delete failed:", result.error);
              Alert.alert(
                "Error",
                result.error?.message || "Failed to delete question"
              );
            }
          },
        },
      ]
    );
  };

  const handleRemoveQuestion = async () => {
    Alert.alert(
      "Remove Question",
      "Are you sure you want to remove this question? This moderation action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const result = await deleteQuestion(questionId);
            if (result.success) {
              Alert.alert("Success", "Question removed successfully");
              navigation.goBack();
            } else {
              console.error("[QuestionDetail] Remove failed:", result.error);
              Alert.alert(
                "Error",
                result.error?.message || "Failed to remove question"
              );
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadQuestionData();
  }, [questionId]);

  const loadQuestionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [questionData, answersData] = await Promise.all([
        getQuestionById(questionId),
        getAnswers(questionId),
      ]);

      if (!questionData) {
        setError("Question not found");
        return;
      }

      setQuestion(questionData);
      setAnswers(answersData);

      // Increment view count (optional - may fail for non-authenticated users)
      try {
        await incrementQuestionViews(questionId);
      } catch (viewErr) {
        // Silently ignore - view count increment is not critical
        console.log("[QuestionDetail] Could not increment views:", viewErr);
      }

      // Load author info (optional - may fail for non-authenticated users)
      try {
        const author = await getUser(questionData.authorId);
        if (author) {
          setAuthorName(author.displayName || author.handle);
        }
      } catch (authorErr) {
        // Silently ignore - author name is not critical for viewing
        console.log("[QuestionDetail] Could not load author:", authorErr);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load question");
    } finally {
      setLoading(false);
    }
  };

  const handleUpvoteAnswer = async (answerId: string) => {
    if (!currentUser) {
      Alert.alert(
        "You need to be logged in to do that",
        "",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Log in / Sign up",
            onPress: () => navigation.navigate("Account"),
          },
        ]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await upvoteAnswer(answerId);
      setAnswers(prev =>
        prev.map(a => (a.id === answerId ? { ...a, upvoteCount: a.upvoteCount + 1 } : a))
      );
    } catch (err) {
      // Silently fail
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentUser) {
      Alert.alert(
        "You need to be logged in to do that",
        "",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Log in / Sign up",
            onPress: () => navigation.navigate("Account"),
          },
        ]
      );
      return;
    }

    // Require email verification for posting answers
    const isVerified = await requireEmailVerification("answer questions");
    if (!isVerified) return;
    
    if (!answerText.trim() || submitting) return;

    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const answerId = await createAnswer({
        questionId,
        body: answerText.trim(),
        authorId: currentUser.id,
        authorHandle: currentUser.handle || currentUser.displayName || "Anonymous",
      });

      // Reload answers
      const updatedAnswers = await getAnswers(questionId);
      setAnswers(updatedAnswers);
      setAnswerText("");
    } catch (err: any) {
      setError("Failed to submit answer");
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-parchment">
        <ActivityIndicator size="large" color={DEEP_FOREST} />
        <Text className="mt-4" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
          Loading question...
        </Text>
      </View>
    );
  }

  if (error || !question) {
    return (
      <View className="flex-1 bg-parchment">
        <ModalHeader title="Question" showTitle />
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="alert-circle-outline" size={64} color={EARTH_GREEN} />
          <Text className="mt-4 text-center text-lg" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
            {error || "Question not found"}
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            className="mt-6 px-6 py-3 rounded-xl active:opacity-90"
            style={{ backgroundColor: DEEP_FOREST }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-parchment">
      <ModalHeader title="Question" showTitle />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1" 
          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Question Card */}
          <View className="mx-5 mt-5 rounded-xl p-5 border" style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}>
            {/* Header with actions */}
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-1">
                {question.hasAcceptedAnswer && (
                  <View className="flex-row items-center mb-2 px-3 py-2 bg-green-100 rounded-lg self-start">
                    <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                    <Text className="ml-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: "#16a34a" }}>
                      Answered
                    </Text>
                  </View>
                )}
              </View>
              <ContentActionsAffordance
                itemId={questionId}
                itemType="question"
                createdByUserId={question.authorId}
                currentUserId={currentUser?.id}
                canModerate={canModerate}
                roleLabel={roleLabel}
                onRequestDelete={handleDeleteQuestion}
                onRequestRemove={handleRemoveQuestion}
                layout="cardHeader"
              />
            </View>

            <Text className="text-2xl mb-3" style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}>
              {question.title}
            </Text>

            <Text className="mb-4 leading-6" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
              {question.body}
            </Text>

            {question.tags && question.tags.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mb-4">
                {question.tags.map((tag, idx) => (
                  <View key={idx} className="px-3 py-1 rounded-full bg-blue-100">
                    <Text className="text-xs" style={{ fontFamily: "SourceSans3_600SemiBold", color: "#1e40af" }}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View className="flex-row items-center justify-between pt-4 border-t" style={{ borderColor: BORDER_SOFT }}>
              <View>
                <View className="flex-row items-center">
                  <Text className="text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
                    Asked by{" "}
                  </Text>
                  {question.authorId && question.authorHandle ? (
                    <HandleLink 
                      handle={question.authorHandle}
                      userId={question.authorId}
                      style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12 }}
                    />
                  ) : question.authorId ? (
                    <Pressable onPress={() => navigation.navigate("MyCampsite", { userId: question.authorId })}>
                      <Text className="text-xs" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST, textDecorationLine: "underline" }}>
                        {question.authorHandle ? `@${question.authorHandle}` : (authorName || "Anonymous")}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text className="text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
                      {question.authorHandle ? `@${question.authorHandle}` : "Anonymous"}
                    </Text>
                  )}
                </View>
                <Text className="text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
                  {formatTimeAgo(question.createdAt)}
                </Text>
              </View>

              <VotePill
                collectionPath="questions"
                itemId={questionId}
                initialScore={question.score || (question.upvotes || 0) - (question.downvotes || 0)}
                onRequireAccount={() => setShowAccountRequired(true)}
              />
            </View>
          </View>

          {/* Answers Section */}
          <View className="mx-5 mt-6">
            <Text className="text-xl mb-4" style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}>
              {answers.length} {answers.length === 1 ? "Answer" : "Answers"}
            </Text>

            {answers.length === 0 ? (
              <View className="rounded-xl p-6 items-center border" style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}>
                <Ionicons name="chatbubbles-outline" size={48} color={TEXT_MUTED} />
                <Text className="mt-3 text-center" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
                  No answers yet. Be the first to help!
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {answers.map((answer) => (
                  <View
                    key={answer.id}
                    className="rounded-xl p-4 border"
                    style={{ backgroundColor: answer.isAccepted ? "#f0fdf4" : CARD_BACKGROUND_LIGHT, borderColor: answer.isAccepted ? "#16a34a" : BORDER_SOFT }}
                  >
                    {/* Answer header with actions */}
                    <View className="flex-row items-start justify-between mb-2">
                      {answer.isAccepted && (
                        <View className="flex-row items-center">
                          <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                          <Text className="ml-1 text-xs" style={{ fontFamily: "SourceSans3_600SemiBold", color: "#16a34a" }}>
                            Accepted Answer
                          </Text>
                        </View>
                      )}
                      <View className="flex-1" />
                      <ContentActionsAffordance
                        itemId={answer.id}
                        itemType="answer"
                        createdByUserId={answer.authorId}
                        currentUserId={currentUser?.id}
                        canModerate={canModerate}
                        roleLabel={roleLabel}
                        onRequestDelete={async () => {
                          setAnswers(prev => prev.filter(a => a.id !== answer.id));
                        }}
                        onRequestRemove={async () => {
                          setAnswers(prev => prev.filter(a => a.id !== answer.id));
                        }}
                        layout="commentRow"
                        iconSize={16}
                      />
                    </View>

                    <Text className="mb-3 leading-6" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
                      {answer.body}
                    </Text>

                    <View className="flex-row items-center justify-between pt-3 border-t" style={{ borderColor: BORDER_SOFT }}>
                      <View className="flex-row items-center">
                        {answer.authorId && answer.authorHandle ? (
                          <HandleLink 
                            handle={answer.authorHandle}
                            userId={answer.authorId}
                            style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12 }}
                          />
                        ) : answer.authorId ? (
                          <Pressable onPress={() => navigation.navigate("MyCampsite", { userId: answer.authorId })}>
                            <Text className="text-xs" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST, textDecorationLine: "underline" }}>
                              {answer.authorHandle ? `@${answer.authorHandle}` : "Anonymous"}
                            </Text>
                          </Pressable>
                        ) : (
                          <Text className="text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
                            {answer.authorHandle ? `@${answer.authorHandle}` : "Anonymous"}
                          </Text>
                        )}
                        <Text className="text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
                          {" "}• {formatTimeAgo(answer.createdAt)}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => handleUpvoteAnswer(answer.id)}
                        className="flex-row items-center px-2 py-1 rounded-lg active:opacity-70"
                      >
                        <Ionicons name="arrow-up-circle-outline" size={18} color={TEXT_MUTED} />
                        <Text className="ml-1 text-xs" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
                          {answer.upvoteCount}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Answer Input */}
          {currentUser && (
            <View className="mx-5 mt-6 mb-5">
              <Text className="text-lg mb-3" style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}>
                Your Answer
              </Text>
              <View className="rounded-xl border" style={{ backgroundColor: "white", borderColor: BORDER_SOFT }}>
                <TextInput
                  value={answerText}
                  onChangeText={setAnswerText}
                  onFocus={handleInputFocus}
                  placeholder="Share your knowledge and help others..."
                  placeholderTextColor={TEXT_MUTED}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  className="p-4"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_PRIMARY_STRONG, minHeight: 120 }}
                />
                <View className="flex-row justify-end p-3 border-t" style={{ borderColor: BORDER_SOFT }}>
                  <Pressable
                    onPress={handleSubmitAnswer}
                    disabled={!answerText.trim() || submitting}
                    className="px-6 py-3 rounded-xl active:opacity-90"
                    style={{
                      backgroundColor: answerText.trim() && !submitting ? DEEP_FOREST : "#d1d5db",
                    }}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
                        Post answer
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <AccountRequiredModal
        visible={showAccountRequired}
        onCreateAccount={() => {
          setShowAccountRequired(false);
          navigation.navigate("Auth");
        }}
        onMaybeLater={() => setShowAccountRequired(false)}
      />
    </View>
  );
}
