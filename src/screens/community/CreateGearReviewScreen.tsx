import React, { useCallback, useMemo, useState } from "react";
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
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { RootStackNavigationProp } from "../../navigation/types";
import * as Haptics from "expo-haptics";

import { auth } from "../../config/firebase";
import { createGearReview } from "../../services/gearReviewsService";
import { useCurrentUser } from "../../state/userStore";
import { requireEmailVerification } from "../../utils/authHelper";
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

export default function CreateGearReviewScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const currentUser = useCurrentUser();

  const [category, setCategory] = useState<GearCategory>("tent");
  const [gearName, setGearName] = useState("");
  const [brand, setBrand] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
    if (photos.length >= MAX_PHOTOS) {
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
        setPhotos((prev) => [...prev, result.assets[0].uri]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {
      Alert.alert("Error", "Failed to pick image");
    }
  }, [photos.length]);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    Haptics.selectionAsync().catch(() => {});
  }, []);

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
    if (!canSubmit) return;

    const user = auth.currentUser;
    if (!user?.uid) {
      Alert.alert("Sign in required", "Please sign in to post a gear review.");
      return;
    }

    // Require a handle to post reviews (no anonymous)
    const authorHandle = currentUser?.handle;
    if (!authorHandle) {
      Alert.alert(
        "Profile Required",
        "Please set up your profile with a @handle before posting a review."
      );
      return;
    }

    // Require email verification for posting content
    const isVerified = await requireEmailVerification("post gear reviews");
    if (!isVerified) return;

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

      // Upload photos if any
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        setUploadingPhotos(true);
        try {
          photoUrls = await uploadPhotosToStorage(photos, user.uid);
        } catch (uploadError: any) {
          console.error("[CreateGearReview] Photo upload failed:", uploadError);
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

      await createGearReview({
        authorId: user.uid,
        authorHandle,
        category,
        gearName: trimmedGearName,
        brand: trimmedBrand || undefined,
        rating: clampInt(rating, 1, 5),
        summary: trimmedSummary,
        body: trimmedBody,
        tags,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
        // Normalize URL: add https:// if no scheme is present
        productUrl: (() => {
          const trimmedUrl = productUrl.trim();
          if (!trimmedUrl) return undefined;
          if (trimmedUrl.match(/^https?:\/\//i)) return trimmedUrl;
          return `https://${trimmedUrl}`;
        })(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert("Posted!", "Your gear review has been posted.");
      navigation.goBack();
    } catch (e: any) {
      console.error("[CreateGearReview] submit failed:", e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const errorMessage = e?.code === "permission-denied"
        ? "You don't have permission to post reviews."
        : e?.message || "Please try again in a moment.";
      Alert.alert("Couldn't post", errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    currentUser?.handle,
    gearName,
    brand,
    rating,
    summary,
    body,
    tags,
    category,
    photos,
    productUrl,
    navigation,
  ]);

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
          New Gear Review
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
            {submitting ? (uploadingPhotos ? "Uploading…" : "Posting…") : "Post"}
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
          {photos.map((uri, index) => (
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
          {photos.length < MAX_PHOTOS && (
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
                <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>{t}</Text>
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
