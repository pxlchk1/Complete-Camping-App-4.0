import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { RootStackNavigationProp } from "../../navigation/types";
import { createQuestion } from "../../api/qa-service";
import { useAuthStore } from "../../state/authStore";
import { requireEmailVerification } from "../../utils/authHelper";
import { useToast } from "../../components/ToastManager";
import { DEEP_FOREST, PARCHMENT } from "../../constants/colors";

export default function AskQuestionModal() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { user } = useAuthStore();
  const { showSuccess, showError } = useToast();

  const [question, setQuestion] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!question.trim()) {
      showError("Please enter a question");
      return;
    }

    if (!user) {
      navigation.goBack();
      return;
    }

    // Require email verification for posting questions
    const isVerified = await requireEmailVerification("ask questions");
    if (!isVerified) return;

    try {
      setSubmitting(true);

      await createQuestion(
        question.trim(),
        details.trim(),
        user.id
      );

      showSuccess("Question posted successfully!");

      // Close the modal
      navigation.goBack();
    } catch {
      showError("Failed to post question. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={true}
      animationType="fade"
      presentationStyle="pageSheet"
      onRequestClose={() => navigation.goBack()}
    >
      <SafeAreaView className="flex-1 bg-parchment" edges={["bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          {/* Header - Deep Forest Green background */}
          <View
            style={{
              paddingTop: 30,
              paddingHorizontal: 20,
              paddingBottom: 20,
              backgroundColor: DEEP_FOREST,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: "Raleway_700Bold", fontSize: 24, color: PARCHMENT, flex: 1, marginRight: 12 }}>Ask a Question</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Pressable
                  onPress={onSubmit}
                  disabled={submitting || !question.trim()}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: submitting || !question.trim()
                      ? "rgba(255, 255, 255, 0.3)"
                      : "rgba(255, 255, 255, 0.15)",
                  }}
                >
                  <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
                    {submitting ? "Posting..." : "Post"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => navigation.goBack()}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={20} color={PARCHMENT} />
                </Pressable>
              </View>
            </View>
          </View>

          <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
            {/* Question */}
            <View className="mb-4">
              <Text className="text-base text-forest-800 mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                Question <Text className="text-red-600" style={{ fontFamily: "SourceSans3_600SemiBold" }}>*</Text>
              </Text>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="What do you want to know?"
                placeholderTextColor="#9ca3af"
                className="bg-cream-50 rounded-xl px-4 py-3 text-base text-forest-800 border border-cream-200"
                style={{ fontFamily: "SourceSans3_400Regular" }}
                maxLength={200}
              />
            </View>

            {/* Details */}
            <View className="mb-4">
              <Text className="text-base text-forest-800 mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                Details (Optional)
              </Text>
              <TextInput
                value={details}
                onChangeText={setDetails}
                placeholder="Provide more context about your question..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                className="bg-cream-50 rounded-xl px-4 py-3 text-base text-forest-800 border border-cream-200"
                style={{ minHeight: 120, fontFamily: "SourceSans3_400Regular" }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
