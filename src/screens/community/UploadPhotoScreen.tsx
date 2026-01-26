/**
 * Upload Photo Screen
 * Allows users to upload camping photos with captions and tags
 */

import React, { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Keyboard, TouchableWithoutFeedback } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ModalHeader from "../../components/ModalHeader";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, collection, addDoc, updateDoc, serverTimestamp, doc } from "firebase/firestore";
import { useCurrentUser } from "../../state/userStore";
import { RootStackNavigationProp } from "../../navigation/types";
import { requireEmailVerification } from "../../utils/authHelper";
import { recordPhotoUpload, canUploadPhotoToday } from "../../services/photoLimitService";
import {
  DEEP_FOREST,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../../constants/colors";

const SUGGESTED_TAGS = ["camping", "backpacking", "nature", "gear", "trails", "wildlife", "sunset", "tent", "campfire", "mountains"];

export default function UploadPhotoScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const currentUser = useCurrentUser();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your photo library to upload images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err: any) {
      setError("Failed to pick image");
    }
  };

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

  const uploadImageToStorage = async (uri: string, photoId: string): Promise<{ downloadURL: string, storagePath: string }> => {
    const storage = getStorage();
    const userId = currentUser?.id || "anonymous";
    const storagePath = `connectPhotos/${userId}/${photoId}.jpg`;
    const storageRef = ref(storage, storagePath);
    const response = await fetch(uri);
    const blob = await response.blob();
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    return { downloadURL, storagePath };
  };

  const handleSubmit = async () => {
    if (!currentUser || !imageUri || !caption.trim() || uploading) return;

    // Require email verification for posting content
    const isVerified = await requireEmailVerification("upload photos");
    if (!isVerified) return;

    if (caption.length < 10) {
      setError("Caption must be at least 10 characters");
      return;
    }

    // Double-check photo limit before upload (belt and suspenders)
    const limitCheck = await canUploadPhotoToday();
    if (!limitCheck.canUpload) {
      setError(limitCheck.message || "You've reached your daily photo limit.");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const db = getFirestore();
      // Create Firestore doc first to get the photoId
      const docRef = await addDoc(collection(db, "connectPhotos"), {
        imageUrl: "", // Placeholder, will update after upload
        storagePath: "",
        caption: caption.trim(),
        tags,
        userId: currentUser.id,
        displayName: currentUser.displayName || "Anonymous User",
        userHandle: currentUser.handle,
        locationName: locationLabel.trim() || null,
        createdAt: serverTimestamp(),
        // Moderation fields
        upvotes: 0,
        downvotes: 0,
        isHidden: false,
        needsReview: false,
      });
      const photoId = docRef.id;
      // Upload image to Firebase Storage
      const { downloadURL, storagePath } = await uploadImageToStorage(imageUri, photoId);
      // Update Firestore doc with real imageUrl and storagePath
      await updateDoc(doc(db, "connectPhotos", photoId), {
        imageUrl: downloadURL,
        storagePath,
      });

      // Record the photo upload for daily limit tracking
      await recordPhotoUpload();

      // Navigate to the photo detail
      navigation.replace("PhotoDetail", { photoId });
    } catch (err: any) {
      setError(err.message || "Failed to upload photo");
      setUploading(false);
    }
  };

  const isValid = imageUri && caption.trim().length >= 10;

  return (
    <View className="flex-1 bg-parchment">
      <ModalHeader
        title="Upload Photo"
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          {error && (
            <View className="rounded-xl p-4 mb-4 flex-row items-center bg-red-100 border border-red-300">
              <Ionicons name="alert-circle" size={20} color="#dc2626" />
              <Text className="ml-2 flex-1" style={{ fontFamily: "SourceSans3_400Regular", color: "#dc2626" }}>
                {error}
              </Text>
            </View>
          )}

          {uploading && (
            <View className="rounded-xl p-4 mb-4 flex-row items-center bg-blue-100 border border-blue-300">
              <ActivityIndicator size="small" color="#1e40af" />
              <Text className="ml-2 flex-1" style={{ fontFamily: "SourceSans3_400Regular", color: "#1e40af" }}>
                Uploading photo to Firebase Storage...
              </Text>
            </View>
          )}

          {/* Image Picker */}
          <Pressable
            onPress={pickImage}
            className="rounded-xl mb-5 overflow-hidden border active:opacity-90"
            style={{
              backgroundColor: CARD_BACKGROUND_LIGHT,
              borderColor: BORDER_SOFT,
              aspectRatio: 4 / 3,
            }}
          >
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="camera" size={48} color={TEXT_MUTED} />
                <Text className="mt-3" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
                  Tap to select photo
                </Text>
              </View>
            )}
          </Pressable>

          {/* Caption Input */}
          <View className="mb-5">
            <Text className="mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
              Caption *
            </Text>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Describe this camping moment..."
              placeholderTextColor={TEXT_MUTED}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={Keyboard.dismiss}
              className="rounded-xl border px-4 py-3"
              style={{
                backgroundColor: "white",
                borderColor: BORDER_SOFT,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
                minHeight: 100,
              }}
              maxLength={500}
            />
            <Text className="mt-1 text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
              {caption.length}/500 • Minimum 10 characters
            </Text>
          </View>

          {/* Location Input */}
          <View className="mb-5">
            <Text className="mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
              Location (optional)
            </Text>
            <TextInput
              value={locationLabel}
              onChangeText={setLocationLabel}
              placeholder="Where was this photo taken?"
              placeholderTextColor={TEXT_MUTED}
              returnKeyType="done"
              blurOnSubmit={true}
              className="rounded-xl border px-4 py-3"
              style={{
                backgroundColor: "white",
                borderColor: BORDER_SOFT,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
              }}
              maxLength={100}
            />
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
                    className="flex-row items-center px-3 py-2 rounded-full bg-green-500"
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
              {SUGGESTED_TAGS.filter(tag => !tags.includes(tag)).map((tag) => (
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
        </ScrollView>        </TouchableWithoutFeedback>      </KeyboardAvoidingView>
    </View>
  );
}
