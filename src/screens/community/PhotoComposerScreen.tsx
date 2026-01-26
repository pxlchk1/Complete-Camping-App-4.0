/**
 * Photo Composer Screen
 * Create photo posts with post types, structured fields, and tags
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ModalHeader from "../../components/ModalHeader";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useCurrentUser } from "../../state/userStore";
import { RootStackNavigationProp } from "../../navigation/types";
import { createPhotoPost } from "../../services/photoPostsService";
import { requireEmailVerification } from "../../utils/authHelper";
import { recordPhotoUpload, canUploadPhotoToday } from "../../services/photoLimitService";
import {
  PhotoPostType,
  TripStyle,
  DetailTag,
  CAPTION_TEMPLATES,
  TRIP_STYLE_LABELS,
  DETAIL_TAG_LABELS,
  QUICK_POST_TILES,
} from "../../types/photoPost";
import {
  DEEP_FOREST,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../../constants/colors";

type RouteParams = {
  postType?: PhotoPostType;
};

// Trip style options
const TRIP_STYLE_OPTIONS: TripStyle[] = [
  "car-camping",
  "tent-camping",
  "backpacking",
  "hiking",
  "rv-trailer",
  "group-camping",
  "solo-camping",
  "family-camping",
  "winter-camping",
];

// Detail tag options
const DETAIL_TAG_OPTIONS: DetailTag[] = [
  "shade",
  "privacy",
  "flat-ground",
  "windy",
  "bugs",
  "mud",
  "snow",
  "rain",
  "quiet",
  "near-bathrooms",
  "near-water",
  "scenic-view",
  "pet-friendly",
  "kid-friendly",
  "accessible",
];

export default function PhotoComposerScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute();
  const { postType: initialPostType } = (route.params || {}) as RouteParams;
  const currentUser = useCurrentUser();

  // Image state
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Post type (required)
  const [postType, setPostType] = useState<PhotoPostType | null>(initialPostType || null);

  // Caption
  const [caption, setCaption] = useState("");

  // Campsite Spotlight specific fields
  const [campgroundName, setCampgroundName] = useState("");
  const [campsiteNumber, setCampsiteNumber] = useState("");
  const [hideCampsiteNumber, setHideCampsiteNumber] = useState(false);

  // Tags
  const [tripStyle, setTripStyle] = useState<TripStyle | null>(null);
  const [detailTags, setDetailTags] = useState<DetailTag[]>([]);

  // UI state
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set caption template when post type changes
  useEffect(() => {
    if (postType) {
      // Only set template if caption is empty or is still a template
      const isTemplate = Object.values(CAPTION_TEMPLATES).some(t => caption === t || caption === "");
      if (isTemplate || !caption) {
        setCaption(CAPTION_TEMPLATES[postType] || "");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postType]);

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
    } catch {
      setError("Failed to pick image");
    }
  };

  const handleSelectPostType = (type: PhotoPostType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPostType(type);
    // Set caption template
    if (!caption || caption === CAPTION_TEMPLATES[postType || "campsite-spotlight"]) {
      setCaption(CAPTION_TEMPLATES[type]);
    }
  };

  const handleToggleTripStyle = (style: TripStyle) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTripStyle(tripStyle === style ? null : style);
  };

  const handleToggleDetailTag = (tag: DetailTag) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (detailTags.includes(tag)) {
      setDetailTags(detailTags.filter(t => t !== tag));
    } else if (detailTags.length < 3) {
      setDetailTags([...detailTags, tag]);
    }
  };

  const uploadImageToStorage = async (uri: string, photoId: string): Promise<{ downloadURL: string; storagePath: string }> => {
    const storage = getStorage();
    const userId = currentUser?.id || "anonymous";
    const storagePath = `photoPosts/${userId}/${photoId}.jpg`;
    const storageRef = ref(storage, storagePath);
    const response = await fetch(uri);
    const blob = await response.blob();
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    return { downloadURL, storagePath };
  };

  const handleSubmit = async () => {
    if (!currentUser || !imageUri || !postType || !caption.trim() || uploading) return;

    // Require email verification for posting content
    const isVerified = await requireEmailVerification("share photos");
    if (!isVerified) return;

    if (caption.length < 10) {
      setError("Caption must be at least 10 characters");
      return;
    }

    // Check photo limit
    const limitCheck = await canUploadPhotoToday();
    if (!limitCheck.canUpload) {
      setError(limitCheck.message || "You've reached your daily photo limit.");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      // Generate a temporary ID for storage path
      const tempId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Upload image first
      const { downloadURL, storagePath } = await uploadImageToStorage(imageUri, tempId);

      // Create photo post
      const postId = await createPhotoPost({
        userId: currentUser.id,
        displayName: currentUser.displayName || "Anonymous",
        userHandle: currentUser.handle,
        photoUrls: [downloadURL],
        storagePaths: [storagePath],
        postType,
        caption: caption.trim(),
        campgroundName: postType === "campsite-spotlight" && campgroundName.trim() ? campgroundName.trim() : undefined,
        campsiteNumber: postType === "campsite-spotlight" && campsiteNumber.trim() ? campsiteNumber.trim() : undefined,
        hideCampsiteNumber: postType === "campsite-spotlight" ? hideCampsiteNumber : undefined,
        tripStyle: tripStyle || undefined,
        detailTags: detailTags.length > 0 ? detailTags : undefined,
      });

      // Record the upload for daily limit tracking
      await recordPhotoUpload();

      // Navigate to the photo detail
      navigation.replace("PhotoDetail", { storyId: postId });
    } catch (err: any) {
      console.error("Error creating photo post:", err);
      setError(err.message || "Failed to upload photo");
      setUploading(false);
    }
  };

  const isValid = imageUri && postType && caption.trim().length >= 10;

  return (
    <View className="flex-1 bg-parchment">
      <ModalHeader
        title="Share a Photo"
        showTitle
        rightAction={isValid && !uploading ? {
          icon: "checkmark",
          onPress: handleSubmit,
        } : undefined}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
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
                  Uploading photo...
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

            {/* Post Type Selector */}
            <View className="mb-5">
              <Text className="mb-2" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
                Post Type *
              </Text>
              
              <View className="flex-row flex-wrap gap-2">
                {QUICK_POST_TILES.map((tile) => (
                  <Pressable
                    key={tile.postType}
                    onPress={() => handleSelectPostType(tile.postType)}
                    className="px-4 py-3 rounded-xl flex-row items-center"
                    style={{
                      backgroundColor: postType === tile.postType ? tile.color + "20" : CARD_BACKGROUND_LIGHT,
                      borderWidth: 1,
                      borderColor: postType === tile.postType ? tile.color : BORDER_SOFT,
                    }}
                  >
                    <Ionicons 
                      name={tile.icon as any} 
                      size={16} 
                      color={postType === tile.postType ? tile.color : TEXT_SECONDARY} 
                    />
                    <Text 
                      className="ml-2"
                      style={{ 
                        fontFamily: "SourceSans3_600SemiBold", 
                        color: postType === tile.postType ? tile.color : TEXT_PRIMARY_STRONG,
                        fontSize: 13,
                      }}
                    >
                      {tile.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Campsite Spotlight Fields */}
            {postType === "campsite-spotlight" && (
              <View className="mb-5 p-4 rounded-xl border" style={{ backgroundColor: "#2563eb10", borderColor: "#2563eb40" }}>
                <Text className="mb-3" style={{ fontFamily: "SourceSans3_600SemiBold", color: "#2563eb" }}>
                  📍 Campsite Details
                </Text>

                {/* Campground Name */}
                <View className="mb-4">
                  <Text className="mb-1 text-sm" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
                    Park or Campground
                  </Text>
                  <TextInput
                    value={campgroundName}
                    onChangeText={setCampgroundName}
                    placeholder="e.g., Yosemite Valley Campground"
                    placeholderTextColor={TEXT_MUTED}
                    returnKeyType="next"
                    className="rounded-xl border px-4 py-3"
                    style={{
                      backgroundColor: "white",
                      borderColor: BORDER_SOFT,
                      fontFamily: "SourceSans3_400Regular",
                      color: TEXT_PRIMARY_STRONG,
                    }}
                  />
                </View>

                {/* Campsite Number */}
                <View className="mb-3">
                  <Text className="mb-1 text-sm" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
                    Campsite Number (optional)
                  </Text>
                  <TextInput
                    value={campsiteNumber}
                    onChangeText={setCampsiteNumber}
                    placeholder="e.g., Site 42"
                    placeholderTextColor={TEXT_MUTED}
                    returnKeyType="done"
                    className="rounded-xl border px-4 py-3"
                    style={{
                      backgroundColor: "white",
                      borderColor: BORDER_SOFT,
                      fontFamily: "SourceSans3_400Regular",
                      color: TEXT_PRIMARY_STRONG,
                    }}
                  />
                  <Text className="mt-1 text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
                    This makes your photo useful later. Site numbers are gold.
                  </Text>
                </View>

                {/* Hide site number toggle */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setHideCampsiteNumber(!hideCampsiteNumber);
                  }}
                  className="flex-row items-center"
                >
                  <View 
                    className="w-5 h-5 rounded border items-center justify-center mr-2"
                    style={{ 
                      backgroundColor: hideCampsiteNumber ? DEEP_FOREST : "white",
                      borderColor: hideCampsiteNumber ? DEEP_FOREST : BORDER_SOFT,
                    }}
                  >
                    {hideCampsiteNumber && <Ionicons name="checkmark" size={14} color="white" />}
                  </View>
                  <Text className="text-sm" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
                    Hide exact site number from public
                  </Text>
                </Pressable>
              </View>
            )}

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
                numberOfLines={8}
                textAlignVertical="top"
                className="rounded-xl border px-4 py-3"
                style={{
                  backgroundColor: "white",
                  borderColor: BORDER_SOFT,
                  fontFamily: "SourceSans3_400Regular",
                  color: TEXT_PRIMARY_STRONG,
                  minHeight: 160,
                }}
                maxLength={1000}
              />
              <Text className="mt-1 text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
                {caption.length}/1000 • Minimum 10 characters
              </Text>
            </View>

            {/* Tag Selection */}
            <View className="mb-5">
              <Text className="mb-3" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
                Add Tags
              </Text>

              {/* Trip Style (single select) */}
              <Text className="mb-2 text-xs" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_SECONDARY }}>
                TRIP STYLE (pick one)
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {TRIP_STYLE_OPTIONS.map((style) => {
                  const isSelected = tripStyle === style;
                  return (
                    <Pressable
                      key={style}
                      onPress={() => handleToggleTripStyle(style)}
                      className="px-3 py-2 rounded-full"
                      style={{
                        backgroundColor: isSelected ? DEEP_FOREST : CARD_BACKGROUND_LIGHT,
                        borderWidth: 1,
                        borderColor: isSelected ? DEEP_FOREST : BORDER_SOFT,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          color: isSelected ? PARCHMENT : TEXT_PRIMARY_STRONG,
                          fontSize: 13,
                        }}
                      >
                        {TRIP_STYLE_LABELS[style]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Detail Tags (multi select, max 3) */}
              <Text className="mb-2 text-xs" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_SECONDARY }}>
                DETAILS (up to 3)
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {DETAIL_TAG_OPTIONS.map((tag) => {
                  const isSelected = detailTags.includes(tag);
                  const isDisabled = !isSelected && detailTags.length >= 3;
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => !isDisabled && handleToggleDetailTag(tag)}
                      disabled={isDisabled}
                      className="px-3 py-2 rounded-full"
                      style={{
                        backgroundColor: isSelected ? DEEP_FOREST : CARD_BACKGROUND_LIGHT,
                        borderWidth: 1,
                        borderColor: isSelected ? DEEP_FOREST : BORDER_SOFT,
                        opacity: isDisabled ? 0.5 : 1,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          color: isSelected ? PARCHMENT : TEXT_PRIMARY_STRONG,
                          fontSize: 13,
                        }}
                      >
                        {DETAIL_TAG_LABELS[tag]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {detailTags.length === 3 && (
                <Text className="mt-2 text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
                  Maximum of 3 detail tags selected
                </Text>
              )}
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={!isValid || uploading}
              className="py-4 rounded-xl items-center active:opacity-90 mb-8"
              style={{
                backgroundColor: isValid && !uploading ? DEEP_FOREST : "#d1d5db",
              }}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT, fontSize: 16 }}>
                  Post Photo
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}
