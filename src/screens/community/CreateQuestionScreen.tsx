/**
 * Create Question Screen
 * Allows users to ask new questions to the community
 */

import React, { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ModalHeader from "../../components/ModalHeader";
import * as Haptics from "expo-haptics";
import { createQuestion } from "../../services/questionsService";
import { useCurrentUser } from "../../state/userStore";
import AccountRequiredModal from "../../components/AccountRequiredModal";
import { requireAccount } from "../../utils/gating";
import { requireEmailVerification } from "../../utils/authHelper";
import { RootStackNavigationProp } from "../../navigation/types";
import {
  DEEP_FOREST,
  PARCHMENT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../../constants/colors";

const SUGGESTED_TAGS = [
  "camping", "backpacking", "hiking", "gear", "tent", "sleeping",
  "cooking", "fire", "weather", "safety", "wildlife", "water",
  "navigation", "first-aid", "clothing", "food", "permits", "trails"
];

export default function CreateQuestionScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const currentUser = useCurrentUser();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleTag = (tag: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else if (tags.length < 5) {
      setTags([...tags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    const tag = customTag.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 5) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTags([...tags, tag]);
      setCustomTag("");
    }
  };

  const handleSubmit = async () => {
    // Questions only require an account, not PRO (FREE users can ask questions)
    if (!requireAccount({
      openAccountModal: () => setShowLoginModal(true),
    })) {
      return;
    }

    // Require email verification for posting content
    const isVerified = await requireEmailVerification("ask questions");
    if (!isVerified) return;
    
    if (!currentUser || !title.trim() || !body.trim() || submitting) return;

    if (title.length < 10) {
      setError("Title must be at least 10 characters");
      return;
    }

    if (body.length < 20) {
      setError("Question details must be at least 20 characters");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const questionId = await createQuestion({
        title: title.trim(),
        body: body.trim(),
        tags,
        authorId: currentUser.id,
        authorHandle: currentUser.handle || currentUser.displayName || "Anonymous",
      });

      // Navigate to the question detail
      navigation.replace("QuestionDetail", { questionId });
    } catch (err: any) {
      setError(err.message || "Failed to post question");
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-parchment">
      <ModalHeader
        title="Ask Question"
        showTitle
        rightAction={{
          icon: "checkmark",
          onPress: handleSubmit
        }}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
          {error && (
            <View className="rounded-xl p-4 mb-4 flex-row items-center bg-red-100 border border-red-300">
              <Ionicons name="alert-circle" size={20} color="#dc2626" />
              <Text className="ml-2 flex-1" style={{ fontFamily: "SourceSans3_400Regular", color: "#dc2626" }}>
                {error}
              </Text>
            </View>
          )}

          {/* Guidelines */}
          <View className="rounded-xl p-4 mb-5 border" style={{ backgroundColor: "#eff6ff", borderColor: "#93c5fd" }}>
            <Text className="mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: "#1e40af" }}>
              Tips for a great question:
            </Text>
            <Text className="mb-1" style={{ fontFamily: "SourceSans3_400Regular", color: "#1e40af" }}>
              • Be specific and clear in your title
            </Text>
            <Text className="mb-1" style={{ fontFamily: "SourceSans3_400Regular", color: "#1e40af" }}>
              • Provide context and details in the body
            </Text>
            <Text style={{ fontFamily: "SourceSans3_400Regular", color: "#1e40af" }}>
              • Add relevant tags to help others find your question
            </Text>
          </View>

          {/* Title Input */}
          <View className="mb-5">
            <Text className="mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
              Question Title *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What's your camping question?"
              placeholderTextColor={TEXT_MUTED}
              className="rounded-xl border px-4 py-3"
              style={{
                backgroundColor: "white",
                borderColor: BORDER_SOFT,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
              }}
              maxLength={200}
            />
            <Text className="mt-1 text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
              {title.length}/200 • Minimum 10 characters
            </Text>
          </View>

          {/* Body Input */}
          <View className="mb-5">
            <Text className="mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
              Question Details *
            </Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Provide more context about your question..."
              placeholderTextColor={TEXT_MUTED}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              className="rounded-xl border px-4 py-3"
              style={{
                backgroundColor: "white",
                borderColor: BORDER_SOFT,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
                minHeight: 150,
              }}
              maxLength={1500}
            />
            <Text className="mt-1 text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
              {body.length}/1500 • Minimum 20 characters
            </Text>
          </View>

          {/* Tags Section */}
          <View className="mb-5">
            <Text className="mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
              Tags (up to 5)
            </Text>

            {/* Selected Tags */}
            {tags.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => handleToggleTag(tag)}
                    className="flex-row items-center px-3 py-2 rounded-full bg-blue-500"
                  >
                    <Text className="text-white mr-1" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                      {tag}
                    </Text>
                    <Ionicons name="close-circle" size={16} color="white" />
                  </Pressable>
                ))}
              </View>
            )}

            {/* Custom Tag Input */}
            <View className="flex-row items-center mb-3">
              <TextInput
                value={customTag}
                onChangeText={setCustomTag}
                placeholder="Add custom tag..."
                placeholderTextColor={TEXT_MUTED}
                className="flex-1 rounded-xl border px-4 py-2 mr-2"
                style={{
                  backgroundColor: "white",
                  borderColor: BORDER_SOFT,
                  fontFamily: "SourceSans3_400Regular",
                  color: TEXT_PRIMARY_STRONG,
                }}
                maxLength={20}
                onSubmitEditing={handleAddCustomTag}
                returnKeyType="done"
              />
              <Pressable
                onPress={handleAddCustomTag}
                disabled={!customTag.trim() || tags.length >= 5}
                className="px-4 py-2 rounded-xl"
                style={{
                  backgroundColor: customTag.trim() && tags.length < 5 ? DEEP_FOREST : "#d1d5db",
                }}
              >
                <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
                  Add
                </Text>
              </Pressable>
            </View>

            {/* Suggested Tags */}
            <Text className="mb-2 text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
              Suggested tags:
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {SUGGESTED_TAGS.filter(tag => !tags.includes(tag)).slice(0, 12).map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => handleToggleTag(tag)}
                  disabled={tags.length >= 5}
                  className="px-3 py-1 rounded-full border"
                  style={{
                    backgroundColor: "white",
                    borderColor: BORDER_SOFT,
                    opacity: tags.length >= 5 ? 0.5 : 1,
                  }}
                >
                  <Text className="text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
                    {tag}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Account Required Modal */}
      <AccountRequiredModal
        visible={showLoginModal}
        onCreateAccount={() => {
          setShowLoginModal(false);
          navigation.navigate("Auth");
        }}
        onMaybeLater={() => setShowLoginModal(false)}
      />
    </View>
  );
}
