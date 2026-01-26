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
import { useTipStore, TIP_CATEGORIES } from "../state/tipStore";
import { useAuthStore } from "../state/authStore";
import { useToast } from "./ToastManager";
import { DEEP_FOREST, PARCHMENT } from "../constants/colors";

interface TipSubmissionModalProps {
  visible: boolean;
  onClose: () => void;
  onTipSubmitted?: (tipId: string) => void;
}

export default function TipSubmissionModal({
  visible,
  onClose,
  onTipSubmitted,
}: TipSubmissionModalProps) {
  const [title, setTitle] = useState("");
  const [tipText, setTipText] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addTip = useTipStore((state) => state.addTip);
  const user = useAuthStore((state) => state.user);
  const { showSuccess, showError } = useToast();

  const handleSubmit = async () => {
    if (!title.trim() || !tipText.trim() || !category) {
      showError("Please fill in all required fields");
      return;
    }

    if (!user) {
      showError("You must be signed in to submit a tip");
      return;
    }

    try {
      setSubmitting(true);

      const tagArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const tipId = await addTip(tipText.trim(), user.id);

      showSuccess("Tip submitted successfully!");

      // Reset form
      setTitle("");
      setTipText("");
      setCategory("");
      setTags("");

      onClose();
      onTipSubmitted?.(tipId);
    } catch (error) {
      showError("Failed to submit tip. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
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
              <Text style={{ fontFamily: "Raleway_700Bold", fontSize: 24, color: PARCHMENT, flex: 1, marginRight: 12 }}>Submit a tip</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Pressable
                  onPress={handleSubmit}
                  disabled={submitting || !title.trim() || !tipText.trim() || !category}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: submitting || !title.trim() || !tipText.trim() || !category
                      ? "rgba(255, 255, 255, 0.3)"
                      : "rgba(255, 255, 255, 0.15)",
                  }}
                >
                  <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
                    {submitting ? "Posting..." : "Post"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onClose}
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
            {/* Title */}
            <View className="mb-4">
              <Text className="text-base text-forest-800 mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                Title <Text className="text-red-600" style={{ fontFamily: "SourceSans3_600SemiBold" }}>*</Text>
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Give your tip a catchy title"
                placeholderTextColor="#9ca3af"
                className="bg-cream-50 rounded-xl px-4 py-3 text-base text-forest-800 border border-cream-200"
                style={{ fontFamily: "SourceSans3_400Regular" }}
                maxLength={100}
              />
              <Text className="text-xs text-stone-500 mt-1" style={{ fontFamily: "SourceSans3_400Regular" }}>{title.length}/100</Text>
            </View>

            {/* Category */}
            <View className="mb-4">
              <Text className="text-base text-forest-800 mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                Category <Text className="text-red-600" style={{ fontFamily: "SourceSans3_600SemiBold" }}>*</Text>
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {TIP_CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => setCategory(cat.id)}
                      className={`px-4 py-2 rounded-full border ${
                        category === cat.id
                          ? "bg-amber-600 border-amber-600"
                          : "bg-parchment border-cream-200"
                      }`}
                    >
                      <Text
                        className={
                          category === cat.id
                            ? "text-parchment"
                            : "text-forest-800"
                        }
                        style={{ fontFamily: category === cat.id ? "SourceSans3_600SemiBold" : "SourceSans3_400Regular" }}
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Tip Content */}
            <View className="mb-4">
              <Text className="text-base text-forest-800 mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                Your Tip <Text className="text-red-600" style={{ fontFamily: "SourceSans3_600SemiBold" }}>*</Text>
              </Text>
              <TextInput
                value={tipText}
                onChangeText={setTipText}
                placeholder="Share your camping wisdom..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                className="bg-cream-50 rounded-xl px-4 py-3 text-base text-forest-800 border border-cream-200"
                style={{ minHeight: 120, fontFamily: "SourceSans3_400Regular" }}
                maxLength={1000}
              />
              <Text className="text-xs text-stone-500 mt-1" style={{ fontFamily: "SourceSans3_400Regular" }}>{tipText.length}/1000</Text>
            </View>

            {/* Tags */}
            <View className="mb-6">
              <Text className="text-base text-forest-800 mb-2" style={{ fontFamily: "SourceSans3_600SemiBold" }}>
                Tags (Optional)
              </Text>
              <TextInput
                value={tags}
                onChangeText={setTags}
                placeholder="e.g. beginners, winter, safety (comma separated)"
                placeholderTextColor="#9ca3af"
                className="bg-cream-50 rounded-xl px-4 py-3 text-base text-forest-800 border border-cream-200"
                style={{ fontFamily: "SourceSans3_400Regular" }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
