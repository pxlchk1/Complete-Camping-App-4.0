/**
 * Edit Gear Screen
 * Form to edit an existing item in My Gear Closet
 */

import React, { useState, useEffect, useCallback } from "react";
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
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { auth } from "../config/firebase";
import { getGearItemById, updateGearItem, uploadGearImage } from "../services/gearClosetService";
import { GearCategory, GEAR_CATEGORIES, GearItem } from "../types/gear";
import { RootStackNavigationProp, RootStackParamList } from "../navigation/types";
import ModalHeader from "../components/ModalHeader";
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

type EditGearRouteProp = RouteProp<RootStackParamList, "EditGear">;

export default function EditGearScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<EditGearRouteProp>();
  const { gearId } = route.params;

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<GearCategory>("optional_extras");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const loadGear = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be signed in to edit gear");
      navigation.goBack();
      return;
    }

    try {
      const gearData = await getGearItemById(gearId);
      if (gearData) {
        setName(gearData.name);
        setCategory(gearData.category);
        setBrand(gearData.brand || "");
        setModel(gearData.model || "");
        setWeight(gearData.weight || "");
        setNotes(gearData.notes || "");
        setExistingImageUrl(gearData.imageUrl || null);
      } else {
        Alert.alert("Error", "Gear item not found");
        navigation.goBack();
      }
    } catch (error: any) {
      console.error("Error loading gear:", error);
      Alert.alert("Error", error.message || "Failed to load gear");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [gearId, navigation]);

  useEffect(() => {
    loadGear();
  }, [loadGear]);

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

  const handleRemoveImage = () => {
    Alert.alert(
      "Remove Photo",
      "Are you sure you want to remove this photo?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setImageUri(null);
            setExistingImageUrl(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be signed in to edit gear");
      return;
    }

    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter a name for this gear");
      return;
    }

    try {
      setSubmitting(true);

      // Prepare update data
      const updateData: Partial<GearItem> = {
        name: name.trim(),
        category,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        weight: weight.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      // Handle image update
      if (imageUri) {
        // User selected a new image
        try {
          const imageUrl = await uploadGearImage(user.uid, gearId, imageUri);
          updateData.imageUrl = imageUrl;
        } catch (imageError) {
          console.error("Error uploading image:", imageError);
          Alert.alert("Warning", "Failed to upload image, but other changes will be saved.");
        }
      } else if (!existingImageUrl) {
        // User removed the image
        updateData.imageUrl = undefined;
      }
      // If existingImageUrl exists and no new imageUri, keep the existing image (don't update)

      // Update the gear item
      await updateGearItem(gearId, updateData);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error: any) {
      console.error("Error updating gear:", error);
      Alert.alert("Error", error.message || "Failed to update gear");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <ModalHeader title="Edit Gear" showTitle />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
          <Text className="mt-4" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
            Loading gear...
          </Text>
        </View>
      </View>
    );
  }

  const displayImageUri = imageUri || existingImageUrl;

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader
        title="Edit Gear"
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
                if (displayImageUri) {
                  Alert.alert(
                    "Photo Options",
                    "What would you like to do?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Change Photo", onPress: () => {
                        Alert.alert(
                          "Change Photo",
                          "How would you like to add a photo?",
                          [
                            { text: "Cancel", style: "cancel" },
                            { text: "Take Photo", onPress: handleTakePhoto },
                            { text: "Choose from Library", onPress: handlePickImage },
                          ]
                        );
                      }},
                      { text: "Remove Photo", style: "destructive", onPress: handleRemoveImage },
                    ]
                  );
                } else {
                  Alert.alert(
                    "Add Photo",
                    "Choose a photo for your gear",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Take Photo", onPress: handleTakePhoto },
                      { text: "Choose from Library", onPress: handlePickImage },
                    ]
                  );
                }
              }}
              className="w-32 h-32 rounded-xl items-center justify-center active:opacity-70"
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT, borderWidth: 1 }}
            >
              {displayImageUri ? (
                <>
                  <Image source={{ uri: displayImageUri }} className="w-full h-full rounded-xl" resizeMode="cover" />
                  <View className="absolute top-2 right-2 w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <Ionicons name="camera-outline" size={18} color={PARCHMENT} />
                  </View>
                </>
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
                Save Changes
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
