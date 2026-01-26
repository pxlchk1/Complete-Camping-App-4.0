/**
 * Create Tip Screen
 * Form for creating a new camping tip
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import ModalHeader from "../../components/ModalHeader";
import * as Haptics from "expo-haptics";
import { tipsService } from "../../services/firestore/tipsService";
import AccountRequiredModal from "../../components/AccountRequiredModal";
import { requireAccount } from "../../utils/gating";
import { requireEmailVerification } from "../../utils/authHelper";
import { RootStackNavigationProp } from "../../navigation/types";
import {
  DEEP_FOREST,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_MUTED,
} from "../../constants/colors";

const CATEGORIES = [
  "Packing",
  "Weather",
  "Cooking",
  "Safety",
  "Gear",
  "Setup",
  "Navigation",
  "Other"
];

export default function CreateTipScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Other");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Tips only require an account, not PRO (FREE users can submit tips)
    if (!requireAccount({
      openAccountModal: () => setShowLoginModal(true),
    })) {
      return;
    }

    // Require email verification for posting content
    const isVerified = await requireEmailVerification("share tips");
    if (!isVerified) return;

    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a title for your tip");
      return;
    }
    if (!content.trim()) {
      Alert.alert("Missing Content", "Please enter the tip content");
      return;
    }
    try {
      setSubmitting(true);
      await tipsService.createTip({
        title: title.trim(),
        content: content.trim(),
        category,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create tip");
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-parchment">
      <ModalHeader
        title="New Tip"
        showTitle
        rightAction={{
          icon: "checkmark",
          onPress: handleSubmit
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 p-5">
          {/* Title */}
          <View className="mb-4">
            <Text
              className="mb-2"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              Title *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Give your tip a clear title"
              placeholderTextColor={TEXT_MUTED}
              className="px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderColor: BORDER_SOFT,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
                fontSize: 16,
              }}
              maxLength={100}
            />
            <Text className="text-xs mt-1" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
              {title.length}/100
            </Text>
          </View>

          {/* Body */}
          <View className="mb-4">
            <Text
              className="mb-2"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              Tip Content *
            </Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Share your camping wisdom..."
              placeholderTextColor={TEXT_MUTED}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              className="px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderColor: BORDER_SOFT,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
                fontSize: 16,
                minHeight: 150,
              }}
              maxLength={500}
            />
            <Text className="text-xs mt-1" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
              {content.length}/500
            </Text>
          </View>

          {/* Category */}
          <View className="mb-4">
            <Text
              className="mb-2"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              Category
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <Pressable
                  key={cat}
                  onPress={() => {
                    setCategory(cat);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className={`px-4 py-2 rounded-full ${category === cat ? "bg-forest" : "bg-white border"}`}
                  style={category !== cat ? { borderColor: BORDER_SOFT } : undefined}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      color: category === cat ? PARCHMENT : TEXT_PRIMARY_STRONG
                    }}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting || !title.trim() || !content.trim()}
            className="py-3 rounded-lg items-center mt-6 active:opacity-90"
            style={{
              backgroundColor: title.trim() && content.trim() ? DEEP_FOREST : BORDER_SOFT,
            }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={PARCHMENT} />
            ) : (
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
                Share Tip
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
