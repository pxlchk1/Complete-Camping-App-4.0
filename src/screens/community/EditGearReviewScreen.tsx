/**
 * Edit Gear Review Screen
 * Allows users to edit their existing gear reviews
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { RootStackNavigationProp } from "../../navigation/types";
import * as Haptics from "expo-haptics";

import { auth } from "../../config/firebase";
import { getGearReviewById, updateGearReview } from "../../services/gearReviewsService";
import {
  BORDER_SOFT,
  CARD_BACKGROUND_LIGHT,
  DEEP_FOREST,
  PARCHMENT,
  TEXT_MUTED,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
} from "../../constants/colors";
import type { GearCategory } from "../../types/community";

const CATEGORIES: readonly {
  key: GearCategory;
  label: string;
  description: string;
}[] = [
  { key: "tent", label: "Tent", description: "Shelters & accessories" },
  { key: "sleep", label: "Sleep System", description: "Bags, pads, quilts" },
  { key: "kitchen", label: "Cooking", description: "Stoves, cookware, food" },
  { key: "pack", label: "Backpack", description: "Packs & storage" },
  { key: "lighting", label: "Lighting", description: "Headlamps, lanterns" },
  { key: "clothing", label: "Clothing", description: "Layers, footwear" },
  { key: "misc", label: "Other", description: "Anything else" },
];

const clampInt = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Math.trunc(n)));
const MAX_PHOTOS = 3;

type RouteParams = {
  reviewId: string;
};

export default function EditGearReviewScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<any>();
  const reviewId = (route?.params as RouteParams)?.reviewId;

  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<GearCategory>("tent");
  const [gearName, setGearName] = useState("");
  const [brand, setBrand] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load existing review data
  useEffect(() => {
    async function loadReview() {
      if (!reviewId) {
        Alert.alert("Error", "No review ID provided");
        navigation.goBack();
        return;
      }

      try {
        setLoading(true);
        const review = await getGearReviewById(reviewId);
        if (!review) {
          Alert.alert("Error", "Review not found");
          navigation.goBack();
          return;
        }

        // Check if current user owns this review
        if (review.authorId !== auth.currentUser?.uid) {
          Alert.alert("Error", "You can only edit your own reviews");
          navigation.goBack();
          return;
        }

        setCategory((review.category as GearCategory) || "tent");
        setGearName(review.gearName || "");
        setBrand(review.brand || "");
        setRating(review.rating || 0);
        setSummary(review.summary || "");
        setBody(review.body || "");
        setProductUrl(review.productUrl || "");
        setExistingPhotos(review.photoUrls || []);
        setTags(review.tags || []);
      } catch (error) {
        console.error("[EditGearReview] Load failed:", error);
        Alert.alert("Error", "Failed to load review");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    }

    loadReview();
  }, [reviewId, navigation]);

  const allPhotos = useMemo(() => [...existingPhotos, ...newPhotos], [existingPhotos, newPhotos]);

  const isFormValid = useMemo(
    () => Boolean(gearName.trim() && rating > 0 && summary.trim() && body.trim()),
    [gearName, rating, summary, body]
  );

  const canSubmit = useMemo(() => {
    return !submitting && isFormValid;
  }, [submitting, isFormValid]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    navigation.goBack();
  }, [navigation]);

  const setStarRating = useCallback((value: number) => {
    const next = clampInt(value, 0, 5);
    setRating(next);
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const normalizeTag = (raw: string) =>
    raw
      .trim()
      .replace(/\s+/g, " ")
      .replace(/^[#]+/, "")
      .slice(0, 24);

  const handleAddTag = useCallback(() => {
    const next = normalizeTag(tagsInput);
    if (!next) return;

    setTags((prev) => {
      const exists = prev.some((t) => t.toLowerCase() === next.toLowerCase());
      if (exists) return prev;
      if (prev.length >= 8) return prev;
      return [...prev, next];
    });

    setTagsInput("");
    Haptics.selectionAsync().catch(() => {});
  }, [tagsInput]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
    Haptics.selectionAsync().catch(() => {});
  }, []);

  // Photo picker and upload
  const pickPhoto = useCallback(async () => {
    if (allPhotos.length >= MAX_PHOTOS) {
      Alert.alert("Limit reached", `You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your photo library to add images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setNewPhotos((prev) => [...prev, result.assets[0].uri]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {
      Alert.alert("Error", "Failed to pick image");
    }
  }, [allPhotos.length]);

  const removePhoto = useCallback((index: number) => {
    // If the index is within existing photos, remove from there
    if (index < existingPhotos.length) {
      setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
    } else {
      // Otherwise remove from new photos
      const newIndex = index - existingPhotos.length;
      setNewPhotos((prev) => prev.filter((_, i) => i !== newIndex));
    }
    Haptics.selectionAsync().catch(() => {});
  }, [existingPhotos.length]);

  const uploadPhotosToStorage = async (localUris: string[], userId: string): Promise<string[]> => {
    const storage = getStorage();
    const uploadedUrls: string[] = [];
    
    for (const uri of localUris) {
      const photoId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const storagePath = `gearReviews/${userId}/${photoId}.jpg`;
      const storageRef = ref(storage, storagePath);
      const response = await fetch(uri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      uploadedUrls.push(downloadURL);
    }
    
    return uploadedUrls;
  };

  const onSubmit = useCallback(async () => {
    if (!canSubmit || !reviewId) return;

    const user = auth.currentUser;
    if (!user?.uid) {
      Alert.alert("Sign in required", "Please sign in to edit this review.");
      return;
    }

    const trimmedGearName = gearName.trim();
    const trimmedSummary = summary.trim();
    const trimmedBody = body.trim();
    const trimmedBrand = brand.trim();

    if (!trimmedGearName || !trimmedSummary || !trimmedBody || rating <= 0) {
      Alert.alert("Missing info", "Please fill out all required fields and select a rating.");
      return;
    }

    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      // Upload new photos if any
      let uploadedNewPhotoUrls: string[] = [];
      if (newPhotos.length > 0) {
        setUploadingPhotos(true);
        try {
          uploadedNewPhotoUrls = await uploadPhotosToStorage(newPhotos, user.uid);
        } catch (uploadError: any) {
          console.error("[EditGearReview] Photo upload failed:", uploadError);
          setUploadingPhotos(false);
          const errorMessage = uploadError?.code === "storage/unauthorized" 
            ? "You don't have permission to upload photos. Please sign out and sign back in."
            : uploadError?.code === "storage/quota-exceeded"
            ? "Storage quota exceeded. Please try a smaller image."
            : "Failed to upload photo. Please check your connection and try again.";
          Alert.alert("Photo Upload Failed", errorMessage);
          setSubmitting(false);
          return;
        } finally {
          setUploadingPhotos(false);
        }
      }

      // Combine existing photos with newly uploaded
      const finalPhotoUrls = [...existingPhotos, ...uploadedNewPhotoUrls];

      await updateGearReview(reviewId, {
        category,
        gearName: trimmedGearName,
        brand: trimmedBrand || null,
        rating: clampInt(rating, 1, 5),
        summary: trimmedSummary,
        body: trimmedBody,
        tags,
        photoUrls: finalPhotoUrls.length > 0 ? finalPhotoUrls : [],
        productUrl: productUrl.trim() || null,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert("Updated!", "Your gear review has been updated.");
      navigation.goBack();
    } catch (e: any) {
      console.error("[EditGearReview] submit failed:", e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const errorMessage = e?.code === "permission-denied"
        ? "You don't have permission to update this review."
        : e?.message || "Please try again in a moment.";
      Alert.alert("Couldn't update", errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    reviewId,
    gearName,
    brand,
    rating,
    summary,
    body,
    tags,
    category,
    existingPhotos,
    newPhotos,
    productUrl,
    navigation,
  ]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: PARCHMENT }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={DEEP_FOREST} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PARCHMENT }} edges={["top"]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: BORDER_SOFT,
            backgroundColor: PARCHMENT,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        }}
      >
        <Pressable onPress={handleClose} hitSlop={10} style={{ padding: 6 }}>
          <Ionicons name="close" size={26} color={DEEP_FOREST} />
        </Pressable>

        <Text style={{ fontFamily: "Raleway_700Bold", fontSize: 16, color: TEXT_PRIMARY_STRONG }}>
          Edit Gear Review
        </Text>

        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: canSubmit ? DEEP_FOREST : BORDER_SOFT,
            opacity: submitting ? 0.85 : 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          {submitting ? <ActivityIndicator color={PARCHMENT} /> : null}
          <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
            {submitting ? (uploadingPhotos ? "Uploading…" : "Saving…") : "Save"}
          </Text>
        </Pressable>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 18, paddingBottom: 100 }} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Category */}
        <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG, marginBottom: 10 }}>
          Category
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 12 }}>
          {CATEGORIES.map((c) => {
            const active = c.key === category;
            return (
              <Pressable
                key={c.key}
                onPress={() => {
                  setCategory(c.key);
                  Haptics.selectionAsync().catch(() => {});
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: active ? DEEP_FOREST : CARD_BACKGROUND_LIGHT,
                  borderWidth: 1,
                  borderColor: active ? DEEP_FOREST : BORDER_SOFT,
                  minWidth: 150,
                }}
              >
                <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: active ? PARCHMENT : TEXT_PRIMARY_STRONG }}>
                  {c.label}
                </Text>
                <Text style={{ marginTop: 2, fontFamily: "SourceSans3_400Regular", color: active ? PARCHMENT : TEXT_SECONDARY, fontSize: 12 }}>
                  {c.description}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Gear name */}
        <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG, marginTop: 8, marginBottom: 8 }}>
          Gear name <Text style={{ color: "#dc2626" }}>*</Text>
        </Text>
        <TextInput
          value={gearName}
          onChangeText={setGearName}
          placeholder="e.g., Big Agnes Copper Spur HV UL2"
          placeholderTextColor={TEXT_MUTED}
          style={{
            backgroundColor: CARD_BACKGROUND_LIGHT,
            borderWidth: 1,
            borderColor: BORDER_SOFT,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontFamily: "SourceSans3_400Regular",
            color: TEXT_PRIMARY_STRONG,
          }}
          maxLength={80}
          returnKeyType="next"
        />

        {/* Brand */}
        <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG, marginTop: 14, marginBottom: 8 }}>
          Brand (optional)
        </Text>
        <TextInput
          value={brand}
          onChangeText={setBrand}
          placeholder="e.g., Big Agnes"
          placeholderTextColor={TEXT_MUTED}
          style={{
            backgroundColor: CARD_BACKGROUND_LIGHT,
            borderWidth: 1,
            borderColor: BORDER_SOFT,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontFamily: "SourceSans3_400Regular",
            color: TEXT_PRIMARY_STRONG,
          }}
          maxLength={40}
          returnKeyType="next"
        />

        {/* Rating */}
        <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG, marginTop: 14, marginBottom: 8 }}>
          Rating <Text style={{ color: "#dc2626" }}>*</Text>
        </Text>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 6 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Pressable key={i} onPress={() => setStarRating(i)} hitSlop={8}>
              <Ionicons name={rating >= i ? "star" : "star-outline"} size={30} color={rating >= i ? "#d4a017" : TEXT_MUTED} />
            </Pressable>
          ))}
          <Text style={{ marginLeft: 6, fontFamily: "SourceSans3_600SemiBold", color: TEXT_SECONDARY }}>
            {rating > 0 ? `${rating}/5` : "Select"}
          </Text>
        </View>

        {/* Summary */}
        <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG, marginTop: 10, marginBottom: 8 }}>
          Summary <Text style={{ color: "#dc2626" }}>*</Text>
        </Text>
        <TextInput
          value={summary}
          onChangeText={setSummary}
          placeholder="One sentence takeaway"
          placeholderTextColor={TEXT_MUTED}
          style={{
            backgroundColor: CARD_BACKGROUND_LIGHT,
            borderWidth: 1,
            borderColor: BORDER_SOFT,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontFamily: "SourceSans3_400Regular",
            color: TEXT_PRIMARY_STRONG,
          }}
          maxLength={140}
        />

        {/* Body */}
        <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG, marginTop: 14, marginBottom: 8 }}>
          Full review <Text style={{ color: "#dc2626" }}>*</Text>
        </Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="What did you like/dislike? Conditions used? Who is it for?"
          placeholderTextColor={TEXT_MUTED}
          multiline
          textAlignVertical="top"
          style={{
            backgroundColor: CARD_BACKGROUND_LIGHT,
            borderWidth: 1,
            borderColor: BORDER_SOFT,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontFamily: "SourceSans3_400Regular",
            color: TEXT_PRIMARY_STRONG,
            minHeight: 140,
          }}
          maxLength={2000}
        />

        {/* Photos */}
        <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG, marginTop: 14, marginBottom: 8 }}>
          Photos (optional, up to {MAX_PHOTOS})
        </Text>
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          {allPhotos.map((uri, index) => (
            <View key={index} style={{ position: "relative" }}>
              <Image
                source={{ uri }}
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                }}
              />
              <Pressable
                onPress={() => removePhoto(index)}
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  backgroundColor: PARCHMENT,
                  borderRadius: 999,
                }}
              >
                <Ionicons name="close-circle" size={24} color={TEXT_MUTED} />
              </Pressable>
            </View>
          ))}
          {allPhotos.length < MAX_PHOTOS && (
            <Pressable
              onPress={pickPhoto}
              style={{
                width: 90,
                height: 90,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: BORDER_SOFT,
                borderStyle: "dashed",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: CARD_BACKGROUND_LIGHT,
              }}
            >
              <Ionicons name="camera-outline" size={28} color={TEXT_MUTED} />
              <Text style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED, fontSize: 11, marginTop: 4 }}>Add</Text>
            </Pressable>
          )}
        </View>

        {/* Product Link */}
        <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG, marginTop: 14, marginBottom: 8 }}>
          Product link (optional)
        </Text>
        <TextInput
          value={productUrl}
          onChangeText={setProductUrl}
          placeholder="https://..."
          placeholderTextColor={TEXT_MUTED}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={{
            backgroundColor: CARD_BACKGROUND_LIGHT,
            borderWidth: 1,
            borderColor: BORDER_SOFT,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontFamily: "SourceSans3_400Regular",
            color: TEXT_PRIMARY_STRONG,
          }}
          maxLength={500}
        />

        {/* Tags */}
        <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG, marginTop: 14, marginBottom: 8 }}>
          Tags (optional)
        </Text>

        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <TextInput
            value={tagsInput}
            onChangeText={setTagsInput}
            placeholder="Add a tag (e.g., ultralight)"
            placeholderTextColor={TEXT_MUTED}
            style={{
              flex: 1,
              backgroundColor: CARD_BACKGROUND_LIGHT,
              borderWidth: 1,
              borderColor: BORDER_SOFT,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: "SourceSans3_400Regular",
              color: TEXT_PRIMARY_STRONG,
            }}
            maxLength={24}
            onSubmitEditing={handleAddTag}
            returnKeyType="done"
          />
          <Pressable
            onPress={handleAddTag}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 14,
              backgroundColor: DEEP_FOREST,
            }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>Add</Text>
          </Pressable>
        </View>

        {tags.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {tags.map((t) => (
              <Pressable
                key={t}
                onPress={() => handleRemoveTag(t)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                }}
              >
                <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>#{t}</Text>
                <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={{ marginTop: 10, fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED, fontSize: 12 }}>
          Tip: tap a tag to remove it.
        </Text>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
