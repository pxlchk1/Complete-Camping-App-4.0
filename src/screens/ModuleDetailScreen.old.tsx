import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { useLearningStore, LearningStep } from "../state/learningStore";
import { RootStackParamList } from "../navigation/types";
import LNTQuizComponent from "../components/LNTQuizComponent";
import { QuizResult } from "../data/lntQuestionBank";
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

type ModuleDetailRouteProp = RouteProp<RootStackParamList, "ModuleDetail">;
type ModuleDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, "ModuleDetail">;

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export default function ModuleDetailScreen() {
  const navigation = useNavigation<ModuleDetailNavigationProp>();
  const route = useRoute<ModuleDetailRouteProp>();
  const { moduleId } = route.params;

  const { getModuleById, getModuleProgress, completeStep } = useLearningStore();
  const module = getModuleById(moduleId);
  const progress = getModuleProgress(moduleId);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<{ [key: string]: number }>({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [showLNTQuiz, setShowLNTQuiz] = useState(false);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Find the first incomplete step or start at the beginning
    if (module && progress) {
      const firstIncompleteIndex = module.steps.findIndex(
        (step) => progress.steps[step.id]?.status !== "completed"
      );
      if (firstIncompleteIndex !== -1) {
        setCurrentStepIndex(firstIncompleteIndex);
      }
    }
  }, [moduleId]);

  // Check if current step is the LNT dynamic quiz
  const isLNTDynamicQuiz = module?.steps[currentStepIndex]?.content === "DYNAMIC_LNT_QUIZ";

  // Handle LNT quiz completion
  const handleLNTQuizComplete = useCallback(
    (passed: boolean, result: QuizResult) => {
      if (passed && module) {
        // Mark the quiz step as complete
        completeStep(moduleId, module.steps[currentStepIndex].id);

        // Show success and go back
        Alert.alert(
          "Module Complete! 🎉",
          `You earned ${module.xpReward} XP and the "Leave No Trace Ready" badge!`,
          [{ text: "Continue", onPress: () => navigation.goBack() }]
        );
      } else {
        // Go back to review content
        setShowLNTQuiz(false);
        setCurrentStepIndex(0);
      }
    },
    [module, moduleId, currentStepIndex, completeStep, navigation]
  );

  // Handle back from LNT quiz
  const handleLNTQuizBack = useCallback(() => {
    setShowLNTQuiz(false);
    // Go back to the checklist step (before quiz)
    if (module && currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }, [module, currentStepIndex]);

  if (!module) {
    return (
      <View style={{ flex: 1, backgroundColor: PARCHMENT_BACKGROUND, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
        <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 18, color: TEXT_PRIMARY_STRONG, marginBottom: 8 }}>
          Module not found
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: DEEP_FOREST, borderRadius: 10 }}
        >
          <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 15, color: PARCHMENT }}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  const currentStep = module.steps[currentStepIndex];
  const isLastStep = currentStepIndex === module.steps.length - 1;
  const isStepCompleted = progress?.steps[currentStep.id]?.status === "completed";

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Mark current step as complete
    if (!isStepCompleted) {
      completeStep(moduleId, currentStep.id);
    }

    if (isLastStep) {
      // Module complete - show success and go back
      Alert.alert(
        "Module Complete! 🎉",
        `You earned ${module.xpReward} XP. Great work!`,
        [{ text: "Continue", onPress: () => navigation.goBack() }]
      );
    } else {
      setCurrentStepIndex(currentStepIndex + 1);
      setShowQuizResults(false);
    }
  };

  const handlePrevious = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setShowQuizResults(false);
    }
  };

  const handleQuizAnswer = (questionIndex: number, answerIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuizAnswers({
      ...quizAnswers,
      [questionIndex]: answerIndex,
    });
  };

  const checkQuizAnswers = () => {
    if (currentStep.type !== "quiz") return;

    try {
      const quizData = JSON.parse(currentStep.content);
      const questions: QuizQuestion[] = quizData.questions;

      const allAnswered = questions.every((_, index) => quizAnswers[index] !== undefined);
      if (!allAnswered) {
        Alert.alert("Complete the Quiz", "Please answer all questions before continuing.");
        return;
      }

      setShowQuizResults(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error checking quiz answers:", error);
    }
  };

  const renderQuizContent = () => {
    if (currentStep.type !== "quiz") return null;

    try {
      const quizData = JSON.parse(currentStep.content);
      const questions: QuizQuestion[] = quizData.questions;

      return (
        <View style={{ gap: 24 }}>
          {questions.map((question, qIndex) => {
            const selectedAnswer = quizAnswers[qIndex];
            const isCorrect = selectedAnswer === question.correctAnswer;

            return (
              <View key={qIndex} style={{ padding: 16, backgroundColor: CARD_BACKGROUND_LIGHT, borderRadius: 12, borderWidth: 1, borderColor: BORDER_SOFT }}>
                <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: TEXT_PRIMARY_STRONG, marginBottom: 12 }}>
                  Question {qIndex + 1}: {question.question}
                </Text>

                {question.options.map((option, oIndex) => {
                  const isSelected = selectedAnswer === oIndex;
                  const isCorrectOption = oIndex === question.correctAnswer;
                  const showResult = showQuizResults && isSelected;

                  let backgroundColor = "rgba(255, 255, 255, 0.5)";
                  let borderColor = BORDER_SOFT;
                  let iconName: keyof typeof Ionicons.glyphMap | null = null;
                  let iconColor = EARTH_GREEN;

                  if (showResult) {
                    if (isCorrect) {
                      backgroundColor = "#f0fdf4";
                      borderColor = "#86efac";
                      iconName = "checkmark-circle";
                      iconColor = "#16a34a";
                    } else {
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
                      key={oIndex}
                      onPress={() => !showQuizResults && handleQuizAnswer(qIndex, oIndex)}
                      disabled={showQuizResults}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 12,
                        marginBottom: 8,
                        backgroundColor,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor,
                      }}
                    >
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: isSelected ? GRANITE_GOLD : BORDER_SOFT,
                          backgroundColor: isSelected ? GRANITE_GOLD : "transparent",
                          marginRight: 12,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isSelected && (
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PARCHMENT }} />
                        )}
                      </View>
                      <Text style={{ flex: 1, fontFamily: "SourceSans3_400Regular", fontSize: 15, color: TEXT_PRIMARY_STRONG }}>
                        {option}
                      </Text>
                      {showResult && iconName && (
                        <Ionicons name={iconName} size={24} color={iconColor} style={{ marginLeft: 8 }} />
                      )}
                    </Pressable>
                  );
                })}

                {showQuizResults && !isCorrect && (
                  <View style={{ marginTop: 8, padding: 12, backgroundColor: "#fef2f2", borderRadius: 8 }}>
                    <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: "#dc2626" }}>
                      Correct answer: {question.options[question.correctAnswer]}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

          {!showQuizResults && (
            <Pressable
              onPress={checkQuizAnswers}
              style={{
                backgroundColor: DEEP_FOREST,
                padding: 16,
                borderRadius: 10,
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 15, color: PARCHMENT }}>
                Check Answers
              </Text>
            </Pressable>
          )}
        </View>
      );
    } catch (error) {
      console.error("Error parsing quiz content:", error);
      return (
        <Text style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
          Error loading quiz
        </Text>
      );
    }
  };

  // Show LNT Quiz component if in LNT quiz mode
  if (showLNTQuiz || isLNTDynamicQuiz) {
    return (
      <LNTQuizComponent
        onComplete={handleLNTQuizComplete}
        onBack={handleLNTQuizBack}
      />
    );
  }

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
        <Pressable onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={PARCHMENT} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Raleway_700Bold", fontSize: 16, color: PARCHMENT }} numberOfLines={1}>
            {module.title}
          </Text>
          <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: PARCHMENT, opacity: 0.8, marginTop: 2 }}>
            Step {currentStepIndex + 1} of {module.steps.length}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={{ height: 4, backgroundColor: "#d1d5db" }}>
        <View
          style={{
            height: 4,
            backgroundColor: GRANITE_GOLD,
            width: `${((currentStepIndex + 1) / module.steps.length) * 100}%`,
          }}
        />
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
      >
        {/* Step Title */}
        <Text style={{ fontFamily: "Raleway_700Bold", fontSize: 24, color: TEXT_PRIMARY_STRONG, marginBottom: 8 }}>
          {currentStep.title}
        </Text>

        {/* Step Type Badge */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: currentStep.type === "quiz" ? "#fef3c7" : "#f0f9f4",
              borderRadius: 6,
            }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 13, color: currentStep.type === "quiz" ? "#92400e" : DEEP_FOREST }}>
              {currentStep.type === "article" ? "Article" : currentStep.type === "quiz" ? "Quiz" : "Checklist"}
            </Text>
          </View>
          {currentStep.duration && (
            <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 12 }}>
              <Ionicons name="time-outline" size={16} color={EARTH_GREEN} />
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY, marginLeft: 4 }}>
                {currentStep.duration} min
              </Text>
            </View>
          )}
        </View>

        {/* Step Content */}
        {currentStep.type === "article" && (
          <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 16, color: TEXT_PRIMARY_STRONG, lineHeight: 26 }}>
            {currentStep.content}
          </Text>
        )}

        {currentStep.type === "quiz" && renderQuizContent()}
      </ScrollView>

      {/* Navigation Buttons */}
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
        {currentStepIndex > 0 && (
          <Pressable
            onPress={handlePrevious}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: DEEP_FOREST,
              alignItems: "center",
            }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 15, color: DEEP_FOREST }}>
              Previous
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleNext}
          disabled={currentStep.type === "quiz" && !showQuizResults}
          style={{
            flex: currentStepIndex === 0 ? 1 : 1,
            paddingVertical: 14,
            borderRadius: 10,
            backgroundColor: currentStep.type === "quiz" && !showQuizResults ? BORDER_SOFT : DEEP_FOREST,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              fontSize: 15,
              color: currentStep.type === "quiz" && !showQuizResults ? TEXT_SECONDARY : PARCHMENT,
            }}
          >
            {isLastStep ? "Complete Module" : "Next"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
