/**
 * Moderator Panel Component
 * Hide/unhide inappropriate content
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { hideContent, unhideContent } from "../services/userService";
import { ContentModeration } from "../types/user";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  SIERRA_SKY,
} from "../constants/colors";

interface ModeratorPanelProps {
  currentUserId: string;
}

export default function ModeratorPanel({ currentUserId }: ModeratorPanelProps) {
  const [contentType, setContentType] = useState<ContentModeration["contentType"]>("photo");
  const [contentId, setContentId] = useState("");
  const [contentOwnerId, setContentOwnerId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const contentTypes: ContentModeration["contentType"][] = [
    "photo",
    "comment",
    "post",
    "question",
    "review",
  ];

  const handleHideContent = async () => {
    if (!contentId.trim()) {
      Alert.alert("Error", "Please enter content ID");
      return;
    }

    if (!contentOwnerId.trim()) {
      Alert.alert("Error", "Please enter content owner user ID");
      return;
    }

    if (!reason.trim()) {
      Alert.alert("Error", "Please provide a reason for hiding");
      return;
    }

    setLoading(true);
    try {
      await hideContent(
        currentUserId,
        contentType,
        contentId.trim(),
        contentOwnerId.trim(),
        reason.trim()
      );

      Alert.alert("Success", `Hidden ${contentType} content`);
      setContentId("");
      setContentOwnerId("");
      setReason("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to hide content");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 px-5 py-6">
      <Text
        className="text-lg mb-2"
        style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
      >
        Content Moderation
      </Text>
      <Text
        className="mb-6"
        style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
      >
        Hide inappropriate or non-PG-13 content from the community
      </Text>

      {/* Content Type Selector */}
      <Text
        className="text-sm mb-2"
        style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
      >
        Content Type
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {contentTypes.map((type) => (
          <Pressable
            key={type}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setContentType(type);
            }}
            className={`px-3 py-2 rounded-xl ${
              contentType === type ? "bg-sierra" : "bg-white border border-stone-300"
            }`}
            style={contentType === type ? { backgroundColor: SIERRA_SKY } : {}}
          >
            <Text
              className="text-sm capitalize"
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                color: contentType === type ? PARCHMENT : DEEP_FOREST,
              }}
            >
              {type}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content ID */}
      <Text
        className="text-sm mb-2"
        style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
      >
        Content ID
      </Text>
      <TextInput
        value={contentId}
        onChangeText={setContentId}
        placeholder="Enter content ID"
        className="bg-white border border-stone-300 rounded-xl px-4 py-3 mb-4"
        style={{ fontFamily: "SourceSans3_400Regular", color: DEEP_FOREST }}
        placeholderTextColor="#999"
      />

      {/* Content Owner ID */}
      <Text
        className="text-sm mb-2"
        style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
      >
        Content Owner User ID
      </Text>
      <TextInput
        value={contentOwnerId}
        onChangeText={setContentOwnerId}
        placeholder="Enter user ID of content owner"
        className="bg-white border border-stone-300 rounded-xl px-4 py-3 mb-4"
        style={{ fontFamily: "SourceSans3_400Regular", color: DEEP_FOREST }}
        placeholderTextColor="#999"
      />

      {/* Reason */}
      <Text
        className="text-sm mb-2"
        style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
      >
        Reason for Hiding
      </Text>
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder="Explain why this content is being hidden"
        multiline
        numberOfLines={3}
        className="bg-white border border-stone-300 rounded-xl px-4 py-3 mb-4"
        style={{
          fontFamily: "SourceSans3_400Regular",
          color: DEEP_FOREST,
          textAlignVertical: "top",
        }}
        placeholderTextColor="#999"
      />

      {/* Hide Button */}
      <Pressable
        onPress={handleHideContent}
        disabled={loading}
        className={`bg-sierra rounded-xl py-3 items-center ${loading ? "opacity-50" : "active:opacity-90"}`}
        style={{ backgroundColor: SIERRA_SKY }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={PARCHMENT} />
        ) : (
          <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
            Hide Content
          </Text>
        )}
      </Pressable>

      {/* Info Box */}
      <View className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <View className="flex-row items-start">
          <Ionicons name="shield-checkmark" size={20} color={SIERRA_SKY} />
          <Text
            className="flex-1 ml-2 text-sm"
            style={{ fontFamily: "SourceSans3_400Regular", color: "#1e3a8a" }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold" }}>Moderator Powers:</Text>
            {"\n"}• Hide photos, comments, posts, questions, or reviews
            {"\n"}• Protect community from non-PG-13 content
            {"\n"}• Cannot delete accounts or ban users
            {"\n"}• All moderation actions are logged
          </Text>
        </View>
      </View>

      {/* Tips */}
      <View className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <View className="flex-row items-start">
          <Ionicons name="bulb" size={20} color="#d97706" />
          <Text
            className="flex-1 ml-2 text-sm"
            style={{ fontFamily: "SourceSans3_400Regular", color: "#92400e" }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold" }}>Tips:</Text>
            {"\n"}• Content IDs can usually be found in the URL or database
            {"\n"}• User IDs identify who posted the content
            {"\n"}• Be specific in your reason - it helps track patterns
            {"\n"}• Hidden content can be unhidden by admins if needed
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
