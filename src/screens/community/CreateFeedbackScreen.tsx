/**
 * Create Feedback Screen
 * Allows users to submit feedback about the app
 */

import React, { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import KeyboardAwareScrollView from "../../components/KeyboardAwareScrollView";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ModalHeader from "../../components/ModalHeader";
import * as Haptics from "expo-haptics";
import { createFeedbackPost } from "../../services/feedbackService";
import { useCurrentUser } from "../../state/userStore";
import { requireEmailVerification } from "../../utils/authHelper";
import { RootStackNavigationProp } from "../../navigation/types";
import { FeedbackCategory } from "../../types/community";
import {
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../../constants/colors";

const CATEGORIES: { id: FeedbackCategory; label: string; description: string; icon: string }[] = [
  {
    id: "feature",
    label: "Feature Request",
    description: "Suggest a new feature",
    icon: "bulb-outline",
  },
  {
    id: "bug",
    label: "Bug Report",
    description: "Report an issue or bug",
    icon: "bug-outline",
  },
  {
    id: "improvement",
    label: "Improvement",
    description: "Suggest improvements",
    icon: "trending-up-outline",
  },
  {
    id: "question",
    label: "Question",
    description: "Ask a question",
    icon: "help-circle-outline",
  },
  {
    id: "other",
    label: "Other",
    description: "Something else",
    icon: "ellipsis-horizontal-outline",
  },
];

export default function CreateFeedbackScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const currentUser = useCurrentUser();

  const [category, setCategory] = useState<FeedbackCategory>("feature");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!currentUser || !title.trim() || !body.trim() || submitting) return;

    // Require email verification for posting content
    const isVerified = await requireEmailVerification("submit feedback");
    if (!isVerified) return;

    if (title.length < 10) {
      setError("Title must be at least 10 characters");
      return;
    }

    if (body.length < 20) {
      setError("Description must be at least 20 characters");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const postId = await createFeedbackPost({
        title: title.trim(),
        body: body.trim(),
        category,
        authorId: currentUser.id,
      });

      // Navigate to the feedback detail
      navigation.replace("FeedbackDetail", { postId });
    } catch (err: any) {
      setError(err.message || "Failed to submit feedback");
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-parchment">
      <ModalHeader
        title="Feedback"
        showTitle
        rightAction={{
          icon: "checkmark",
          onPress: handleSubmit
        }}
      />

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        enableOnAndroid
        extraScrollHeight={40}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
          {error && (
            <View className="rounded-xl p-4 mb-4 flex-row items-center bg-red-100 border border-red-300">
              <Ionicons name="alert-circle" size={20} color="#dc2626" />
              <Text className="ml-2 flex-1" style={{ fontFamily: "SourceSans3_400Regular", color: "#dc2626" }}>
                {error}
              </Text>
            </View>
          )}

          {/* Category Selection */}
          <View className="mb-5">
            <Text className="mb-3" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
              Feedback Type *
            </Text>
            <View className="space-y-2">
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCategory(cat.id);
                  }}
                  className={`rounded-xl p-4 border flex-row items-center active:opacity-90 ${
                    category === cat.id ? "bg-amber-100 border-amber-600" : "bg-white"
                  }`}
                  style={category !== cat.id ? { borderColor: BORDER_SOFT } : undefined}
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: category === cat.id ? "#f59e0b" : "#f3f4f6" }}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={22}
                      color={category === cat.id ? "white" : "#6b7280"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="mb-1"
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        color: category === cat.id ? "#92400e" : TEXT_PRIMARY_STRONG,
                      }}
                    >
                      {cat.label}
                    </Text>
                    <Text
                      className="text-xs"
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        color: category === cat.id ? "#92400e" : TEXT_SECONDARY,
                      }}
                    >
                      {cat.description}
                    </Text>
                  </View>
                  {category === cat.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#f59e0b" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Title Input */}
          <View className="mb-5">
            <Text className="mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
              Title *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Brief summary of your feedback"
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
              Description *
            </Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Provide more details about your feedback..."
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
              returnKeyType="done"
            />
            <Text className="mt-1 text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
              {body.length}/1500 • Minimum 20 characters
            </Text>
          </View>

          {/* Guidelines */}
          <View className="rounded-xl p-4 border" style={{ backgroundColor: "#eff6ff", borderColor: "#93c5fd" }}>
            <Text className="mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: "#1e40af" }}>
              Feedback Guidelines:
            </Text>
            <Text className="mb-1" style={{ fontFamily: "SourceSans3_400Regular", color: "#1e40af" }}>
              • Be specific and clear
            </Text>
            <Text className="mb-1" style={{ fontFamily: "SourceSans3_400Regular", color: "#1e40af" }}>
              • Provide context and examples
            </Text>
            <Text className="mb-1" style={{ fontFamily: "SourceSans3_400Regular", color: "#1e40af" }}>
              • Be respectful and constructive
            </Text>
            <Text style={{ fontFamily: "SourceSans3_400Regular", color: "#1e40af" }}>
              • Check if similar feedback already exists
            </Text>
          </View>
        {/* ...existing code... */}
      </KeyboardAwareScrollView>
    </View>
  );
}
