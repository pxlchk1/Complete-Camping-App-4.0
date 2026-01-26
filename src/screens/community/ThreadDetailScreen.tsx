import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import ModalHeader from "../../components/ModalHeader";
import type { RootStackParamList, RootStackNavigationProp } from "../../navigation/types";
import { getQuestionById, getAnswers, addAnswer, type Question, type Answer } from "../../api/qa-service";
import { useAuthStore } from "../../state/authStore";
import { requireEmailVerification } from "../../utils/authHelper";
import { useToast } from "../../components/ToastManager";
import { DEEP_FOREST, PARCHMENT } from "../../constants/colors";

export default function ThreadDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "ThreadDetail">>();
  const navigation = useNavigation<RootStackNavigationProp>();
  const { questionId } = route.params;

  const { user } = useAuthStore();
  const { showError, showSuccess } = useToast();

  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [fetchedQuestion, fetchedAnswers] = await Promise.all([
        getQuestionById(questionId),
        getAnswers(questionId),
      ]);
      setQuestion(fetchedQuestion);
      setAnswers(fetchedAnswers);
    } catch (error) {
      showError("Failed to load question");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [questionId]);

  const post = async () => {
    if (!text.trim()) return;

    if (!user) {
      return;
    }

    // Require email verification for posting answers
    const isVerified = await requireEmailVerification("post answers");
    if (!isVerified) return;

    try {
      setPosting(true);
      await addAnswer(text.trim(), user.id, questionId);
      setText("");
      await load();
      showSuccess("Answer posted!");
    } catch (error) {
      showError("Failed to post answer");
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-parchment">
        <ModalHeader title="Thread" showTitle />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
        </View>
      </View>
    );
  }

  if (!question) {
    return (
      <View className="flex-1 bg-parchment">
        <ModalHeader title="Thread" showTitle />
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={64} color="#9ca3af" />
          <Text className="text-forest-800" style={{ fontFamily: "SourceSans3_600SemiBold" }}>Question not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-parchment">
      <ModalHeader title="Thread" showTitle />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={100}
      >
        {/* Removed old header - now using ModalHeader */}
        <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
          {/* Question Card */}
          <View className="bg-cream-50 rounded-xl p-4 mb-6 border border-cream-200">
            <Text className="text-lg text-forest-800 mb-3" style={{ fontFamily: "Raleway_700Bold" }}>
              {question.question}
            </Text>

            {question.details && (
              <Text className="text-base text-stone-700 mb-3 leading-6" style={{ fontFamily: "SourceSans3_400Regular" }}>
                {question.details}
              </Text>
            )}

            {/* Footer */}
            <View className="flex-row items-center justify-between pt-3 border-t border-cream-200">
              <Text className="text-sm text-stone-600" style={{ fontFamily: "SourceSans3_400Regular" }}>
                by {question.userId}
              </Text>
              <Text className="text-sm text-stone-600" style={{ fontFamily: "SourceSans3_400Regular" }}>
                {question.createdAt?.toDate ? question.createdAt.toDate().toLocaleDateString() : ""}
              </Text>
            </View>
          </View>

          {/* Answers Section */}
          <View className="mb-6">
            <Text className="text-lg text-forest-800 mb-4" style={{ fontFamily: "Raleway_700Bold" }}>
              {answers.length} {answers.length === 1 ? "Answer" : "Answers"}
            </Text>

            {answers.length === 0 ? (
              <View className="bg-cream-50 rounded-xl p-6 items-center border border-cream-200">
                <Ionicons name="chatbubble-outline" size={48} color="#9ca3af" />
                <Text className="text-stone-600 mt-3" style={{ fontFamily: "SourceSans3_600SemiBold" }}>No answers yet</Text>
                <Text className="text-stone-500 text-sm mt-1" style={{ fontFamily: "SourceSans3_400Regular" }}>Be the first to help!</Text>
              </View>
            ) : (
              <View className="space-y-3">
                {answers.map((answer) => (
                  <View
                    key={answer.id}
                    className="rounded-xl p-4 border bg-parchment border-cream-200"
                  >
                    <Text className="text-base text-stone-800 mb-3 leading-6" style={{ fontFamily: "SourceSans3_400Regular" }}>
                      {answer.text}
                    </Text>

                    <View className="flex-row items-center justify-between pt-3 border-t border-stone-200">
                      <Text className="text-sm text-stone-600" style={{ fontFamily: "SourceSans3_400Regular" }}>
                        by {answer.userId}
                      </Text>
                      <Text className="text-sm text-stone-600" style={{ fontFamily: "SourceSans3_400Regular" }}>
                        {answer.createdAt?.toDate ? answer.createdAt.toDate().toLocaleDateString() : ""}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Answer Input */}
        <View className="px-6 py-4 border-t border-cream-200 bg-parchment">
          <View className="flex-row items-end">
            <View className="flex-1 mr-3">
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Write your answer..."
                placeholderTextColor="#9ca3af"
                multiline
                className="bg-cream-50 rounded-xl px-4 py-3 text-base text-forest-800 border border-cream-200"
                style={{ maxHeight: 100, fontFamily: "SourceSans3_400Regular" }}
              />
            </View>
            <Pressable
              onPress={post}
              disabled={!text.trim() || posting}
              className={`rounded-full p-3 ${
                !text.trim() || posting ? "bg-stone-300" : "bg-forest-800 active:bg-forest-900"
              }`}
            >
              <Ionicons name="send" size={20} color={PARCHMENT} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
