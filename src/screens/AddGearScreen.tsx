/**
 * Add Gear Screen
 * Form to add a new item to My Gear Closet
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { auth } from "../config/firebase";
import { createGearItem, uploadGearImage } from "../services/gearClosetService";
import { GearCategory, GEAR_CATEGORIES } from "../types/gear";
import { RootStackNavigationProp } from "../navigation/types";
import ModalHeader from "../components/ModalHeader";
import { trackGearItemAdded } from "../services/analyticsService";
import { trackCoreAction } from "../services/userActionTrackerService";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../constants/colors";

export default function AddGearScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<GearCategory>("optional_extras");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your photos to add gear images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow camera access to take photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be signed in to add gear");
      return;
    }

    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter a name for this gear");
      return;
    }

    try {
      setSubmitting(true);

      // Create the gear item first
      const gearId = await createGearItem(user.uid, {
        name: name.trim(),
        category,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        weight: weight.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // Upload image if provided
      let imageUrl: string | undefined;
      if (imageUri) {
        try {
          imageUrl = await uploadGearImage(user.uid, gearId, imageUri);
          // Update gear item with image URL
          const { updateGearItem } = await import("../services/gearClosetService");
          await updateGearItem(gearId, { imageUrl });
        } catch (imageError) {
          console.error("Error uploading image:", imageError);
          // Don't fail the whole operation if image upload fails
        }
      }

      // Track analytics and core action
      trackGearItemAdded();
      trackCoreAction(user.uid, "gear_item_added");

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error: any) {
      console.error("Error adding gear:", error);
      Alert.alert("Error", error.message || "Failed to add gear");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader
        title="Add Gear"
        showTitle
        rightAction={{
          icon: "checkmark",
          onPress: handleSubmit,
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-5 pt-5">
          {/* Photo Picker */}
          <View className="mb-4 items-center">
            <Pressable
              onPress={() => {
                Alert.alert(
                  "Add Photo",
                  "Choose a photo for your gear",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Take Photo", onPress: handleTakePhoto },
                    { text: "Choose from Library", onPress: handlePickImage },
                  ]
                );
              }}
              className="w-32 h-32 rounded-xl items-center justify-center active:opacity-70"
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT, borderWidth: 1 }}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} className="w-full h-full rounded-xl" resizeMode="cover" />
              ) : (
                <View className="items-center">
                  <Ionicons name="camera-outline" size={32} color={TEXT_MUTED} />
                  <Text
                    className="mt-2 text-sm"
                    style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}
                  >
                    Add Photo
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Name Field */}
          <View className="mb-4">
            <Text
              className="mb-2"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              Gear Name *
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g., Tent, Sleeping Bag"
              placeholderTextColor={TEXT_MUTED}
              className="px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderColor: BORDER_SOFT,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
              }}
              autoFocus
            />
          </View>

          {/* Category Picker */}
          <View className="mb-4">
            <Text
              className="mb-2"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              Category *
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowCategoryPicker(!showCategoryPicker);
              }}
              className="px-4 py-3 rounded-xl border flex-row items-center justify-between"
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
            >
              <Text style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_PRIMARY_STRONG }}>
                {GEAR_CATEGORIES.find(c => c.value === category)?.label || "Select Category"}
              </Text>
              <Ionicons name="chevron-down" size={20} color={TEXT_SECONDARY} />
            </Pressable>

            {showCategoryPicker && (
              <View
                className="mt-2 rounded-xl border overflow-hidden"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
              >
                {GEAR_CATEGORIES.map(cat => (
                  <Pressable
                    key={cat.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCategory(cat.value);
                      setShowCategoryPicker(false);
                    }}
                    className="px-4 py-3 border-b active:opacity-70"
                    style={{ borderColor: BORDER_SOFT }}
                  >
                    <Text
                      style={{
                        fontFamily: category === cat.value ? "SourceSans3_600SemiBold" : "SourceSans3_400Regular",
                        color: category === cat.value ? EARTH_GREEN : TEXT_PRIMARY_STRONG,
                      }}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Brand Field */}
          <View className="mb-4">
            <Text
              className="mb-2"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              Brand
            </Text>
            <TextInput
              value={brand}
              onChangeText={setBrand}
              placeholder="e.g., REI, Patagonia"
              placeholderTextColor={TEXT_MUTED}
              className="px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderColor: BORDER_SOFT,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
              }}
            />
          </View>

          {/* Model Field */}
          <View className="mb-4">
            <Text
              className="mb-2"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              Model
            </Text>
            <TextInput
              value={model}
              onChangeText={setModel}
              placeholder="Model name or number"
              placeholderTextColor={TEXT_MUTED}
              className="px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderColor: BORDER_SOFT,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
              }}
            />
          </View>

          {/* Weight Field */}
          <View className="mb-4">
            <Text
              className="mb-2"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              Weight
            </Text>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g., 1.2 lb or 540 g"
              placeholderTextColor={TEXT_MUTED}
              className="px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderColor: BORDER_SOFT,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
              }}
            />
          </View>

          {/* Notes Field */}
          <View className="mb-4">
            <Text
              className="mb-2"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              Notes
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes about this gear..."
              placeholderTextColor={TEXT_MUTED}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderColor: BORDER_SOFT,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
                minHeight: 100,
              }}
            />
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={!name.trim() || submitting}
            className="mt-4 mb-8 py-3 rounded-lg active:opacity-90"
            style={{
              backgroundColor: name.trim() ? DEEP_FOREST : BORDER_SOFT,
            }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={PARCHMENT} />
            ) : (
              <Text
                className="text-center"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
              >
                Add Gear
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
