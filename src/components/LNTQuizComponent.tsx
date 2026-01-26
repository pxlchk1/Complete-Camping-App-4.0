/**
 * LNT Quiz Screen
 *
 * Advanced quiz component for the Leave No Trace module featuring:
 * - Multiple question types (single, multi, tf, scenario)
 * - Randomized questions from question bank
 * - Explanations after each answer
 * - Pass/fail with 80% threshold
 * - Review missed questions
 * - Completion badge reward
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, ScrollView, Pressable, Alert, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import {
  LNTQuestion,
  LNT_PRINCIPLES,
  LNT_QUIZ_CONFIG,
  generateLNTQuiz,
  calculateQuizResult,
  QuizResult,
} from "../data/lntQuestionBank";
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
} from "../constants/colors";

interface LNTQuizProps {
  onComplete: (passed: boolean, result: QuizResult) => void;
  onBack: () => void;
}

export default function LNTQuizComponent({ onComplete, onBack }: LNTQuizProps) {
  const insets = useSafeAreaInsets();

  // Quiz state
  const [questions, setQuestions] = useState<LNTQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState(0);

  // Generate questions on mount
  useEffect(() => {
    const generatedQuestions = generateLNTQuiz();
    setQuestions(generatedQuestions);
  }, []);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Check if current question is answered
  const currentAnswers = useMemo(() => {
    return currentQuestion ? answers[currentQuestion.id] || [] : [];
  }, [currentQuestion, answers]);
  const isAnswered = currentAnswers.length > 0;

  // Check if answer is correct
  const isCorrect = useMemo(() => {
    if (!currentQuestion || !isAnswered) return false;
    const correctIds = currentQuestion.correctChoiceIds;
    return (
      currentAnswers.length === correctIds.length &&
      currentAnswers.every((a) => correctIds.includes(a))
    );
  }, [currentQuestion, currentAnswers, isAnswered]);

  // Handle answer selection
  const handleSelectAnswer = useCallback(
    (choiceId: string) => {
      if (!currentQuestion || showExplanation) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const questionId = currentQuestion.id;
      const currentSelections = answers[questionId] || [];

      if (currentQuestion.type === "multi") {
        // Multi-select: toggle selection
        if (currentSelections.includes(choiceId)) {
          setAnswers({
            ...answers,
            [questionId]: currentSelections.filter((id) => id !== choiceId),
          });
        } else {
          setAnswers({
            ...answers,
            [questionId]: [...currentSelections, choiceId],
          });
        }
      } else {
        // Single select, tf, scenario: replace selection
        setAnswers({
          ...answers,
          [questionId]: [choiceId],
        });
      }
    },
    [currentQuestion, answers, showExplanation]
  );

  // Handle submit answer (show explanation)
  const handleSubmitAnswer = useCallback(() => {
    if (!isAnswered) {
      Alert.alert("Select an Answer", "Please select an answer before continuing.");
      return;
    }

    Haptics.notificationAsync(
      isCorrect
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );
    setShowExplanation(true);
  }, [isAnswered, isCorrect]);

  // Handle next question
  const handleNextQuestion = useCallback(() => {
    if (isLastQuestion) {
      // Calculate final result
      const result = calculateQuizResult(questions, answers);
      setQuizResult(result);
      setQuizComplete(true);

      Haptics.notificationAsync(
        result.passed
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowExplanation(false);
    }
  }, [isLastQuestion, questions, answers, currentQuestionIndex]);

  // Handle review missed questions
  const handleStartReview = useCallback(() => {
    if (quizResult && quizResult.missedQuestions.length > 0) {
      setReviewQuestionIndex(0);
      setShowReviewModal(true);
    }
  }, [quizResult]);

  const handleNextReviewQuestion = useCallback(() => {
    if (quizResult && reviewQuestionIndex < quizResult.missedQuestions.length - 1) {
      setReviewQuestionIndex(reviewQuestionIndex + 1);
    } else {
      setShowReviewModal(false);
    }
  }, [quizResult, reviewQuestionIndex]);

  // Handle finish quiz
  const handleFinish = useCallback(() => {
    if (quizResult) {
      onComplete(quizResult.passed, quizResult);
    }
  }, [quizResult, onComplete]);

  // Get question type label
  const getQuestionTypeLabel = (type: string): string => {
    switch (type) {
      case "multi":
        return "Select all that apply";
      case "tf":
        return "True or False";
      case "scenario":
        return "Scenario";
      default:
        return "Choose one";
    }
  };

  // Get principle title
  const getPrincipleTitle = (principleId: string): string => {
    const principle = LNT_PRINCIPLES[principleId as keyof typeof LNT_PRINCIPLES];
    return principle ? `Principle ${principle.number}: ${principle.title}` : "";
  };

  // Render choice button
  const renderChoiceButton = (
    question: LNTQuestion,
    choice: { id: string; text: string },
    selectedIds: string[],
    showResult: boolean,
    disabled: boolean
  ) => {
    const isSelected = selectedIds.includes(choice.id);
    const isCorrectChoice = question.correctChoiceIds.includes(choice.id);
    const isMulti = question.type === "multi";

    let backgroundColor = "rgba(255, 255, 255, 0.5)";
    let borderColor = BORDER_SOFT;
    let iconName: keyof typeof Ionicons.glyphMap | null = null;
    let iconColor = EARTH_GREEN;

    if (showResult) {
      if (isCorrectChoice) {
        backgroundColor = "#f0fdf4";
        borderColor = "#86efac";
        if (isSelected) {
          iconName = "checkmark-circle";
          iconColor = "#16a34a";
        }
      } else if (isSelected && !isCorrectChoice) {
        backgroundColor = "#fef2f2";
        borderColor = "#fca5a5";
        iconName = "close-circle";
        iconColor = "#dc2626";
      }
    } else if (isSelected) {
      backgroundColor = "#eff6ff";
      borderColor = "#93c5fd";
    }

    return (
      <Pressable
        key={choice.id}
        onPress={() => !disabled && handleSelectAnswer(choice.id)}
        disabled={disabled}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 14,
          marginBottom: 10,
          backgroundColor,
          borderRadius: 10,
          borderWidth: 2,
          borderColor,
        }}
      >
        {/* Checkbox/Radio indicator */}
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: isMulti ? 4 : 12,
            borderWidth: 2,
            borderColor: isSelected ? GRANITE_GOLD : BORDER_SOFT,
            backgroundColor: isSelected ? GRANITE_GOLD : "transparent",
            marginRight: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isSelected && (
            <Ionicons
              name={isMulti ? "checkmark" : "radio-button-on"}
              size={isMulti ? 16 : 12}
              color={PARCHMENT}
            />
          )}
        </View>

        {/* Choice text */}
        <Text
          style={{
            flex: 1,
            fontFamily: "SourceSans3_400Regular",
            fontSize: 16,
            color: TEXT_PRIMARY_STRONG,
            lineHeight: 22,
          }}
        >
          {choice.text}
        </Text>

        {/* Result icon */}
        {showResult && iconName && (
          <Ionicons name={iconName} size={24} color={iconColor} style={{ marginLeft: 8 }} />
        )}
      </Pressable>
    );
  };

  // Loading state
  if (questions.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: PARCHMENT_BACKGROUND,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: "SourceSans3_400Regular",
            fontSize: 16,
            color: TEXT_SECONDARY,
          }}
        >
          Loading quiz...
        </Text>
      </View>
    );
  }

  // Quiz complete state
  if (quizComplete && quizResult) {
    return (
      <View style={{ flex: 1, backgroundColor: PARCHMENT_BACKGROUND }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: quizResult.passed ? DEEP_FOREST : "#991B1B",
            paddingTop: insets.top + 12,
            paddingBottom: 20,
            paddingHorizontal: 20,
            alignItems: "center",
          }}
        >
          <Ionicons
            name={quizResult.passed ? "checkmark-circle" : "close-circle"}
            size={64}
            color={PARCHMENT}
          />
          <Text
            style={{
              fontFamily: "Raleway_700Bold",
              fontSize: 28,
              color: PARCHMENT,
              marginTop: 12,
            }}
          >
            {quizResult.passed ? "Congratulations!" : "Not Quite"}
          </Text>
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 16,
              color: PARCHMENT,
              opacity: 0.9,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            {quizResult.passed
              ? "You passed the Leave No Trace assessment!"
              : `You scored ${quizResult.percentCorrect}%. You need ${LNT_QUIZ_CONFIG.passPercent}% to pass.`}
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        >
          {/* Score card */}
          <View
            style={{
              backgroundColor: CARD_BACKGROUND_LIGHT,
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: BORDER_SOFT,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Raleway_700Bold",
                fontSize: 48,
                color: quizResult.passed ? DEEP_FOREST : "#991B1B",
              }}
            >
              {quizResult.percentCorrect}%
            </Text>
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 16,
                color: TEXT_SECONDARY,
                marginTop: 8,
              }}
            >
              {quizResult.score} of {quizResult.totalQuestions} correct
            </Text>
          </View>

          {/* Badge earned (if passed) */}
          {quizResult.passed && (
            <View
              style={{
                backgroundColor: "#fef3c7",
                borderRadius: 12,
                padding: 20,
                marginBottom: 20,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: GRANITE_GOLD,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16,
                }}
              >
                <Ionicons name="medal" size={32} color={PARCHMENT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 18,
                    color: TEXT_PRIMARY_STRONG,
                  }}
                >
                  Badge Earned: Leave No Trace Ready
                </Text>
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 14,
                    color: TEXT_SECONDARY,
                    marginTop: 4,
                  }}
                >
                  You&apos;re prepared to protect the outdoors!
                </Text>
              </View>
            </View>
          )}

          {/* Missed questions section */}
          {quizResult.missedQuestions.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 18,
                  color: TEXT_PRIMARY_STRONG,
                  marginBottom: 12,
                }}
              >
                Areas to Review
              </Text>

              {/* Show missed principles */}
              {quizResult.missedPrinciples.map((principleId) => {
                const principle =
                  LNT_PRINCIPLES[principleId as keyof typeof LNT_PRINCIPLES];
                if (!principle) return null;
                return (
                  <View
                    key={principleId}
                    style={{
                      backgroundColor: "#fef2f2",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="alert-circle"
                      size={20}
                      color="#991B1B"
                      style={{ marginRight: 12 }}
                    />
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 14,
                        color: "#991B1B",
                        flex: 1,
                      }}
                    >
                      Principle {principle.number}: {principle.title}
                    </Text>
                  </View>
                );
              })}

              {/* Review button */}
              <Pressable
                onPress={handleStartReview}
                style={{
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderRadius: 10,
                  padding: 14,
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 15,
                    color: DEEP_FOREST,
                  }}
                >
                  Review Missed Questions ({quizResult.missedQuestions.length})
                </Text>
              </Pressable>
            </View>
          )}

          {/* LNT Summary Card (if passed) */}
          {quizResult.passed && (
            <View
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderRadius: 12,
                padding: 20,
                borderWidth: 1,
                borderColor: BORDER_SOFT,
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 18,
                  color: TEXT_PRIMARY_STRONG,
                  marginBottom: 16,
                }}
              >
                The 7 Principles Summary
              </Text>

              {Object.values(LNT_PRINCIPLES).map((principle) => (
                <View
                  key={principle.id}
                  style={{
                    flexDirection: "row",
                    marginBottom: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: DEEP_FOREST,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 12,
                        color: PARCHMENT,
                      }}
                    >
                      {principle.number}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 14,
                        color: TEXT_PRIMARY_STRONG,
                      }}
                    >
                      {principle.title}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 13,
                        color: TEXT_SECONDARY,
                        marginTop: 2,
                      }}
                    >
                      {principle.summary}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Bottom buttons */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: PARCHMENT,
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: insets.bottom + 16,
            borderTopWidth: 1,
            borderTopColor: BORDER_SOFT,
            flexDirection: "row",
            gap: 12,
          }}
        >
          {!quizResult.passed && (
            <Pressable
              onPress={onBack}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: DEEP_FOREST,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 15,
                  color: DEEP_FOREST,
                }}
              >
                Review Content
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleFinish}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 10,
              backgroundColor: DEEP_FOREST,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 15,
                color: PARCHMENT,
              }}
            >
              {quizResult.passed ? "Complete Module" : "Try Again Later"}
            </Text>
          </Pressable>
        </View>

        {/* Review Modal */}
        <Modal
          visible={showReviewModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowReviewModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: PARCHMENT_BACKGROUND }}>
            {/* Modal Header */}
            <View
              style={{
                backgroundColor: DEEP_FOREST,
                paddingTop: insets.top + 12,
                paddingBottom: 12,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Pressable onPress={() => setShowReviewModal(false)} style={{ marginRight: 12 }}>
                <Ionicons name="close" size={24} color={PARCHMENT} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Raleway_700Bold",
                    fontSize: 16,
                    color: PARCHMENT,
                  }}
                >
                  Review Missed Questions
                </Text>
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 13,
                    color: PARCHMENT,
                    opacity: 0.8,
                    marginTop: 2,
                  }}
                >
                  {reviewQuestionIndex + 1} of {quizResult?.missedQuestions.length || 0}
                </Text>
              </View>
            </View>

            {/* Review Content */}
            {quizResult && quizResult.missedQuestions[reviewQuestionIndex] && (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
              >
                {(() => {
                  const reviewQuestion = quizResult.missedQuestions[reviewQuestionIndex];
                  const userAnswers = answers[reviewQuestion.id] || [];
                  return (
                    <>
                      {/* Principle tag */}
                      <View
                        style={{
                          backgroundColor: "#fef3c7",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 6,
                          alignSelf: "flex-start",
                          marginBottom: 16,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "SourceSans3_600SemiBold",
                            fontSize: 12,
                            color: "#92400e",
                          }}
                        >
                          {getPrincipleTitle(reviewQuestion.principleId)}
                        </Text>
                      </View>

                      {/* Question */}
                      <Text
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 18,
                          color: TEXT_PRIMARY_STRONG,
                          marginBottom: 20,
                          lineHeight: 26,
                        }}
                      >
                        {reviewQuestion.prompt}
                      </Text>

                      {/* Choices */}
                      {reviewQuestion.choices.map((choice) =>
                        renderChoiceButton(reviewQuestion, choice, userAnswers, true, true)
                      )}

                      {/* Explanation */}
                      <View
                        style={{
                          backgroundColor: "#f0fdf4",
                          borderRadius: 10,
                          padding: 16,
                          marginTop: 16,
                          borderLeftWidth: 4,
                          borderLeftColor: "#16a34a",
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "SourceSans3_600SemiBold",
                            fontSize: 14,
                            color: "#16a34a",
                            marginBottom: 8,
                          }}
                        >
                          Correct Answer
                        </Text>
                        <Text
                          style={{
                            fontFamily: "SourceSans3_400Regular",
                            fontSize: 15,
                            color: TEXT_PRIMARY_STRONG,
                            lineHeight: 22,
                          }}
                        >
                          {reviewQuestion.explanation}
                        </Text>
                      </View>
                    </>
                  );
                })()}
              </ScrollView>
            )}

            {/* Review Navigation */}
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: PARCHMENT,
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: insets.bottom + 16,
                borderTopWidth: 1,
                borderTopColor: BORDER_SOFT,
              }}
            >
              <Pressable
                onPress={handleNextReviewQuestion}
                style={{
                  paddingVertical: 14,
                  borderRadius: 10,
                  backgroundColor: DEEP_FOREST,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 15,
                    color: PARCHMENT,
                  }}
                >
                  {reviewQuestionIndex < (quizResult?.missedQuestions.length || 0) - 1
                    ? "Next Question"
                    : "Done Reviewing"}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Active quiz state
  return (
    <View style={{ flex: 1, backgroundColor: PARCHMENT_BACKGROUND }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: DEEP_FOREST,
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Pressable onPress={onBack} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={PARCHMENT} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "Raleway_700Bold",
              fontSize: 16,
              color: PARCHMENT,
            }}
            numberOfLines={1}
          >
            Leave No Trace Assessment
          </Text>
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 13,
              color: PARCHMENT,
              opacity: 0.8,
              marginTop: 2,
            }}
          >
            Question {currentQuestionIndex + 1} of {questions.length}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={{ height: 4, backgroundColor: "#d1d5db" }}>
        <View
          style={{
            height: 4,
            backgroundColor: GRANITE_GOLD,
            width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
          }}
        />
      </View>

      {/* Question Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
      >
        {currentQuestion && (
          <>
            {/* Question type badge */}
            <View
              style={{
                flexDirection: "row",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <View
                style={{
                  backgroundColor: "#fef3c7",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 12,
                    color: "#92400e",
                  }}
                >
                  {getQuestionTypeLabel(currentQuestion.type)}
                </Text>
              </View>
              {currentQuestion.type === "scenario" && (
                <View
                  style={{
                    backgroundColor: "#f0f9ff",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 12,
                      color: "#0369a1",
                    }}
                  >
                    Real-world Decision
                  </Text>
                </View>
              )}
            </View>

            {/* Question prompt */}
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 20,
                color: TEXT_PRIMARY_STRONG,
                marginBottom: 24,
                lineHeight: 28,
              }}
            >
              {currentQuestion.prompt}
            </Text>

            {/* Choices */}
            {currentQuestion.choices.map((choice) =>
              renderChoiceButton(
                currentQuestion,
                choice,
                currentAnswers,
                showExplanation,
                showExplanation
              )
            )}

            {/* Explanation (after submit) */}
            {showExplanation && (
              <View
                style={{
                  backgroundColor: isCorrect ? "#f0fdf4" : "#fef2f2",
                  borderRadius: 10,
                  padding: 16,
                  marginTop: 16,
                  borderLeftWidth: 4,
                  borderLeftColor: isCorrect ? "#16a34a" : "#dc2626",
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
                >
                  <Ionicons
                    name={isCorrect ? "checkmark-circle" : "information-circle"}
                    size={20}
                    color={isCorrect ? "#16a34a" : "#dc2626"}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 15,
                      color: isCorrect ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {isCorrect ? "Correct!" : "Not quite right"}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 15,
                    color: TEXT_PRIMARY_STRONG,
                    lineHeight: 22,
                  }}
                >
                  {currentQuestion.explanation}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: PARCHMENT,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          borderTopWidth: 1,
          borderTopColor: BORDER_SOFT,
        }}
      >
        <Pressable
          onPress={showExplanation ? handleNextQuestion : handleSubmitAnswer}
          disabled={!isAnswered && !showExplanation}
          style={{
            paddingVertical: 14,
            borderRadius: 10,
            backgroundColor: isAnswered || showExplanation ? DEEP_FOREST : BORDER_SOFT,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              fontSize: 15,
              color: isAnswered || showExplanation ? PARCHMENT : TEXT_SECONDARY,
            }}
          >
            {showExplanation
              ? isLastQuestion
                ? "See Results"
                : "Next Question"
              : "Check Answer"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
