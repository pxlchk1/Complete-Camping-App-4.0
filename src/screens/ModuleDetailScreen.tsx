/**
 * ModuleDetailScreen (Redesigned)
 * 
 * Displays learning content as a single long scroll with:
 * - Markdown-rendered content
 * - Quiz at the bottom
 * - 100% quiz score = badge earned
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import Markdown from "react-native-markdown-display";

import { RootStackParamList } from "../navigation/types";
import {
  getModuleWithProgress,
  markModuleAsRead,
  submitQuizAnswers,
  getBadgeDetails,
} from "../services/learningService";
import {
  ModuleWithProgress,
  QuizQuestion,
  BadgeId,
  LEARNING_BADGES,
} from "../types/learning";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  PARCHMENT,
  PARCHMENT_BACKGROUND,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../constants/colors";

type ModuleDetailRouteProp = RouteProp<RootStackParamList, "ModuleDetail">;
type ModuleDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, "ModuleDetail">;

// Markdown styles
const markdownStyles = {
  body: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 16,
    lineHeight: 26,
    color: TEXT_PRIMARY_STRONG,
  },
  heading1: {
    fontFamily: "SourceSans3_700Bold",
    fontSize: 28,
    color: DEEP_FOREST,
    marginTop: 24,
    marginBottom: 16,
    lineHeight: 34,
  },
  heading2: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 22,
    color: DEEP_FOREST,
    marginTop: 28,
    marginBottom: 12,
    lineHeight: 28,
  },
  heading3: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 18,
    color: TEXT_PRIMARY_STRONG,
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 16,
  },
  strong: {
    fontFamily: "SourceSans3_600SemiBold",
  },
  blockquote: {
    backgroundColor: CARD_BACKGROUND_LIGHT,
    borderLeftWidth: 4,
    borderLeftColor: GRANITE_GOLD,
    paddingLeft: 16,
    paddingVertical: 12,
    marginVertical: 16,
    borderRadius: 8,
  },
  bullet_list: {
    marginBottom: 16,
  },
  ordered_list: {
    marginBottom: 16,
  },
  list_item: {
    marginBottom: 8,
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
  },
  bullet_list_content: {
    flex: 1,
    flexShrink: 1,
  },
  ordered_list_content: {
    flex: 1,
    flexShrink: 1,
  },
  hr: {
    backgroundColor: BORDER_SOFT,
    height: 1,
    marginVertical: 24,
  },
  code_inline: {
    fontFamily: "monospace",
    backgroundColor: CARD_BACKGROUND_LIGHT,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
  },
};

export default function ModuleDetailScreen() {
  const navigation = useNavigation<ModuleDetailNavigationProp>();
  const route = useRoute<ModuleDetailRouteProp>();
  const { moduleId } = route.params;

  const [module, setModule] = useState<ModuleWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [badgeEarned, setBadgeEarned] = useState<BadgeId | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  
  // Scroll tracking
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const insets = useSafeAreaInsets();

  // Load module
  useEffect(() => {
    loadModule();
  }, [moduleId]);

  const loadModule = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const moduleData = await getModuleWithProgress(moduleId);
      
      if (!moduleData) {
        setError("Module not found");
        return;
      }
      
      setModule(moduleData);
      
      // If already completed, show quiz section
      if (moduleData.isCompleted) {
        setShowQuiz(true);
        setHasScrolledToBottom(true);
      }
    } catch (err) {
      console.error("[ModuleDetail] Error loading module:", err);
      setError("Failed to load module");
    } finally {
      setLoading(false);
    }
  };

  // Handle scroll to detect reaching bottom
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (hasScrolledToBottom) return;
    
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
    
    if (isAtBottom && module && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
      markModuleAsRead(module.id, module.trackId);
    }
  }, [hasScrolledToBottom, module]);

  // Handle quiz answer selection
  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    if (quizSubmitted) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuizAnswers((prev) => ({
      ...prev,
      [questionId]: answerIndex,
    }));
  };

  // Submit quiz
  const handleSubmitQuiz = async () => {
    if (!module) return;
    
    // Check all questions answered
    const allAnswered = module.quiz.every((q) => quizAnswers[q.id] !== undefined);
    if (!allAnswered) {
      Alert.alert("Complete the Quiz", "Please answer all questions before submitting.");
      return;
    }
    
    try {
      setSubmittingQuiz(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Convert answers to array format
      const answers = module.quiz.map((q) => quizAnswers[q.id]);
      
      const result = await submitQuizAnswers(
        module.id,
        module.trackId,
        answers,
        module.quiz
      );
      
      setQuizScore(result.score);
      setQuizSubmitted(true);
      
      if (result.passed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (result.badgeEarned) {
          setBadgeEarned(result.badgeEarned);
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (err) {
      console.error("[ModuleDetail] Error submitting quiz:", err);
      Alert.alert("Error", "Failed to submit quiz. Please try again.");
    } finally {
      setSubmittingQuiz(false);
    }
  };

  // Retry quiz
  const handleRetryQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setBadgeEarned(null);
  };

  // Start quiz button (shown when scrolled to bottom)
  const handleStartQuiz = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowQuiz(true);
    
    // Scroll to quiz section
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Loading state
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: PARCHMENT_BACKGROUND, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={DEEP_FOREST} />
        <Text style={{ marginTop: 16, fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
          Loading module...
        </Text>
      </View>
    );
  }

  // Error state
  if (error || !module) {
    return (
      <View style={{ flex: 1, backgroundColor: PARCHMENT_BACKGROUND, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
        <Ionicons name="alert-circle-outline" size={48} color={TEXT_MUTED} />
        <Text style={{ marginTop: 16, fontFamily: "SourceSans3_600SemiBold", fontSize: 18, color: TEXT_PRIMARY_STRONG }}>
          {error || "Module not found"}
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: DEEP_FOREST, borderRadius: 10 }}
        >
          <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 15, color: PARCHMENT }}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  const allQuestionsAnswered = module.quiz.every((q) => quizAnswers[q.id] !== undefined);

  return (
    <View style={{ flex: 1, backgroundColor: PARCHMENT_BACKGROUND }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 16,
          paddingHorizontal: 16,
          backgroundColor: DEEP_FOREST,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ padding: 8, marginLeft: -8 }}
          >
            <Ionicons name="arrow-back" size={24} color={PARCHMENT} />
          </Pressable>
          
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 18,
                color: PARCHMENT,
              }}
              numberOfLines={1}
            >
              {module.title}
            </Text>
            <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
              {module.estimatedMinutes} min read
            </Text>
          </View>
          
          {/* Progress indicator */}
          {module.isCompleted && (
            <View style={{ backgroundColor: EARTH_GREEN, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 12, color: PARCHMENT }}>
                ✓ Complete
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 40 + insets.bottom,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        {/* Main Content */}
        <Markdown style={markdownStyles}>
          {module.content}
        </Markdown>

        {/* Read Complete Banner (shows when scrolled to bottom) */}
        {hasScrolledToBottom && !showQuiz && (
          <View
            style={{
              marginTop: 32,
              padding: 20,
              backgroundColor: CARD_BACKGROUND_LIGHT,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: BORDER_SOFT,
              alignItems: "center",
            }}
          >
            <Ionicons name="checkmark-circle" size={48} color={EARTH_GREEN} />
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 18,
                color: TEXT_PRIMARY_STRONG,
                marginTop: 12,
                textAlign: "center",
              }}
            >
              Ready for the Quiz?
            </Text>
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 14,
                color: TEXT_SECONDARY,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              Score 100% to earn your badge
            </Text>
            
            <Pressable
              onPress={handleStartQuiz}
              style={{
                marginTop: 20,
                paddingVertical: 14,
                paddingHorizontal: 32,
                backgroundColor: DEEP_FOREST,
                borderRadius: 12,
              }}
            >
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: PARCHMENT }}>
                Take the Quiz
              </Text>
            </Pressable>
          </View>
        )}

        {/* Quiz Section */}
        {showQuiz && (
          <View style={{ marginTop: 32 }}>
            {/* Quiz Header */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: GRANITE_GOLD, justifyContent: "center", alignItems: "center" }}>
                <Ionicons name="help" size={24} color={PARCHMENT} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 20, color: DEEP_FOREST }}>
                  Knowledge Check
                </Text>
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY }}>
                  {module.quiz.length} questions • Score 100% to pass
                </Text>
              </View>
            </View>

            {/* Questions */}
            {module.quiz.map((question, qIndex) => {
              const selectedAnswer = quizAnswers[question.id];
              // Normalize types to handle Firestore string/number mismatches
              const correctIdx = Number(question.correctAnswerIndex);
              const isCorrect = quizSubmitted && selectedAnswer === correctIdx;
              const isWrong = quizSubmitted && selectedAnswer !== undefined && selectedAnswer !== correctIdx;

              return (
                <View
                  key={question.id}
                  style={{
                    marginBottom: 24,
                    padding: 20,
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: quizSubmitted
                      ? isCorrect
                        ? EARTH_GREEN
                        : isWrong
                        ? "#EF4444"
                        : BORDER_SOFT
                      : BORDER_SOFT,
                  }}
                >
                  <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: TEXT_PRIMARY_STRONG, marginBottom: 16 }}>
                    {qIndex + 1}. {question.question}
                  </Text>

                  {/* Options */}
                  {question.options.map((option, oIndex) => {
                    const isSelected = selectedAnswer === oIndex;
                    const isCorrectOption = oIndex === correctIdx;
                    const showAsCorrect = quizSubmitted && isCorrectOption;
                    const showAsWrong = quizSubmitted && isSelected && !isCorrectOption;

                    let bgColor = "rgba(255,255,255,0.7)";
                    let borderColor = BORDER_SOFT;
                    let textColor = TEXT_PRIMARY_STRONG;

                    if (isSelected && !quizSubmitted) {
                      bgColor = "rgba(42, 83, 55, 0.1)";
                      borderColor = DEEP_FOREST;
                    } else if (showAsCorrect) {
                      bgColor = "rgba(34, 197, 94, 0.15)";
                      borderColor = EARTH_GREEN;
                      textColor = EARTH_GREEN;
                    } else if (showAsWrong) {
                      bgColor = "rgba(239, 68, 68, 0.1)";
                      borderColor = "#EF4444";
                      textColor = "#EF4444";
                    }

                    return (
                      <Pressable
                        key={oIndex}
                        onPress={() => handleAnswerSelect(question.id, oIndex)}
                        disabled={quizSubmitted}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 14,
                          marginBottom: 10,
                          backgroundColor: bgColor,
                          borderRadius: 10,
                          borderWidth: 1.5,
                          borderColor,
                        }}
                      >
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            borderWidth: 2,
                            borderColor: isSelected ? borderColor : BORDER_SOFT,
                            backgroundColor: isSelected ? borderColor : "transparent",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 12,
                          }}
                        >
                          {isSelected && <Ionicons name="checkmark" size={14} color={PARCHMENT} />}
                        </View>
                        <Text
                          style={{
                            flex: 1,
                            fontFamily: isSelected ? "SourceSans3_600SemiBold" : "SourceSans3_400Regular",
                            fontSize: 15,
                            color: textColor,
                          }}
                        >
                          {option}
                        </Text>
                        
                        {/* Show correct/wrong icons after submission */}
                        {showAsCorrect && <Ionicons name="checkmark-circle" size={22} color={EARTH_GREEN} />}
                        {showAsWrong && <Ionicons name="close-circle" size={22} color="#EF4444" />}
                      </Pressable>
                    );
                  })}

                  {/* Explanation (shown after submission) */}
                  {quizSubmitted && question.explanation && (
                    <View style={{ marginTop: 12, padding: 12, backgroundColor: "rgba(255,255,255,0.5)", borderRadius: 8 }}>
                      <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY, fontStyle: "italic" }}>
                        💡 {question.explanation}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Submit Button or Results */}
            {!quizSubmitted ? (
              <Pressable
                onPress={handleSubmitQuiz}
                disabled={!allQuestionsAnswered || submittingQuiz}
                style={{
                  marginTop: 8,
                  paddingVertical: 16,
                  backgroundColor: allQuestionsAnswered ? DEEP_FOREST : TEXT_MUTED,
                  borderRadius: 12,
                  alignItems: "center",
                  opacity: submittingQuiz ? 0.7 : 1,
                }}
              >
                {submittingQuiz ? (
                  <ActivityIndicator color={PARCHMENT} />
                ) : (
                  <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: PARCHMENT }}>
                    Submit Answers
                  </Text>
                )}
              </Pressable>
            ) : (
              <View style={{ marginTop: 8 }}>
                {/* Score Card */}
                <View
                  style={{
                    padding: 24,
                    backgroundColor: quizScore === 100 ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                    borderRadius: 16,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontFamily: "SourceSans3_700Bold", fontSize: 48, color: quizScore === 100 ? EARTH_GREEN : "#EF4444" }}>
                    {quizScore}%
                  </Text>
                  <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 18, color: TEXT_PRIMARY_STRONG, marginTop: 8 }}>
                    {quizScore === 100 ? "Perfect Score! 🎉" : "Keep Learning"}
                  </Text>
                  
                  {quizScore === 100 ? (
                    <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY, textAlign: "center", marginTop: 8 }}>
                      {badgeEarned
                        ? `You earned the "${LEARNING_BADGES[badgeEarned]?.name}" badge!`
                        : "Great job! You've mastered this content."}
                    </Text>
                  ) : (
                    <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY, textAlign: "center", marginTop: 8 }}>
                      Review the content and try again. You need 100% to earn your badge.
                    </Text>
                  )}
                </View>

                {/* Badge Display (if earned) */}
                {badgeEarned && (
                  <View
                    style={{
                      marginTop: 20,
                      padding: 20,
                      backgroundColor: CARD_BACKGROUND_LIGHT,
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: LEARNING_BADGES[badgeEarned]?.color || GRANITE_GOLD,
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: LEARNING_BADGES[badgeEarned]?.color || GRANITE_GOLD,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons
                        name={(LEARNING_BADGES[badgeEarned]?.icon || "ribbon") as any}
                        size={32}
                        color={PARCHMENT}
                      />
                    </View>
                    <Text style={{ fontFamily: "SourceSans3_700Bold", fontSize: 20, color: TEXT_PRIMARY_STRONG, marginTop: 12 }}>
                      {LEARNING_BADGES[badgeEarned]?.name}
                    </Text>
                    <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY, textAlign: "center", marginTop: 8 }}>
                      {LEARNING_BADGES[badgeEarned]?.description}
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                  {quizScore !== 100 && (
                    <Pressable
                      onPress={handleRetryQuiz}
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        backgroundColor: DEEP_FOREST,
                        borderRadius: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 15, color: PARCHMENT }}>
                        Try Again
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => navigation.goBack()}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      backgroundColor: quizScore === 100 ? DEEP_FOREST : CARD_BACKGROUND_LIGHT,
                      borderRadius: 12,
                      alignItems: "center",
                      borderWidth: quizScore === 100 ? 0 : 1,
                      borderColor: BORDER_SOFT,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 15,
                        color: quizScore === 100 ? PARCHMENT : TEXT_PRIMARY_STRONG,
                      }}
                    >
                      {quizScore === 100 ? "Continue" : "Review Content"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
