/**
 * Gear Detail Screen
 * Displays full gear item details with edit/delete actions
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { auth } from "../config/firebase";
import { getGearItemById, updateGearItem, deleteGearItem, deleteGearImages } from "../services/gearClosetService";
import { GearItem, GEAR_CATEGORIES } from "../types/gear";
import { RootStackNavigationProp, RootStackParamList } from "../navigation/types";
import ModalHeader from "../components/ModalHeader";
import TripPickerModal from "../components/TripPickerModal";
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

type GearDetailRouteProp = RouteProp<RootStackParamList, "GearDetail">;

export default function GearDetailScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<GearDetailRouteProp>();
  const { gearId } = route.params;

  const [gear, setGear] = useState<GearItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingFavorite, setUpdatingFavorite] = useState(false);
  const [showTripPicker, setShowTripPicker] = useState(false);

  useEffect(() => {
    loadGear();
  }, [gearId]);

  const loadGear = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError("Please sign in to view gear details");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const gearData = await getGearItemById(gearId);
      if (gearData) {
        setGear(gearData);
      } else {
        setError("Gear item not found");
      }
    } catch (err: any) {
      console.error("Error loading gear:", err);
      setError(err.message || "Failed to load gear");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!gear || updatingFavorite) return;

    try {
      setUpdatingFavorite(true);
      const newFavoriteStatus = !gear.isFavorite;

      await updateGearItem(gearId, { isFavorite: newFavoriteStatus });

      setGear({ ...gear, isFavorite: newFavoriteStatus });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error: any) {
      console.error("Error updating favorite:", error);
      Alert.alert("Error", "Failed to update favorite status");
    } finally {
      setUpdatingFavorite(false);
    }
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("EditGear", { gearId });
  };

  const handleDelete = () => {
    if (!gear) return;

    Alert.alert(
      "Delete Gear",
      `Are you sure you want to delete ${gear.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (!user) return;

              // Delete images from storage
              await deleteGearImages(user.uid, gearId);

              // Delete the gear document
              await deleteGearItem(gearId);

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              navigation.goBack();
            } catch (error: any) {
              console.error("Error deleting gear:", error);
              Alert.alert("Error", error.message || "Failed to delete gear");
            }
          },
        },
      ]
    );
  };

  const getCategoryLabel = (category: string): string => {
    const cat = GEAR_CATEGORIES.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      shelter: "#8B4513",
      sleep: "#4682B4",
      kitchen: "#DC143C",
      clothing: "#9370DB",
      bags: "#2E8B57",
      lighting: "#FFD700",
      misc: "#708090",
    };
    return colors[category] || "#708090";
  };

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <ModalHeader title="Gear Detail" showTitle />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
          <Text className="mt-4" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
            Loading gear...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !gear) {
    return (
      <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <ModalHeader title="Gear Detail" showTitle />
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="alert-circle-outline" size={64} color={TEXT_MUTED} />
          <Text
            className="mt-4 text-center"
            style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
          >
            {error || "Gear not found"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader
        title="Gear Detail"
        showTitle
        rightAction={{
          icon: "pencil",
          onPress: handleEdit,
        }}
      />

      <ScrollView className="flex-1">
        {/* Gear Image */}
        {gear.imageUrl && (
          <View className="w-full aspect-square" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
            <Image
              source={{ uri: gear.imageUrl }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
        )}

        <View className="px-5 pt-5">
          {/* Header with Name and Favorite */}
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1 pr-4">
              <Text
                className="text-3xl"
                style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
              >
                {gear.name}
              </Text>
              {(gear.brand || gear.model) && (
                <Text
                  className="mt-1 text-lg"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                >
                  {[gear.brand, gear.model].filter(Boolean).join(" ")}
                </Text>
              )}
            </View>

            {/* Favorite Star */}
            <Pressable
              onPress={handleToggleFavorite}
              disabled={updatingFavorite}
              className="p-2 active:opacity-70"
            >
              {updatingFavorite ? (
                <ActivityIndicator size="small" color={EARTH_GREEN} />
              ) : (
                <Ionicons
                  name={gear.isFavorite ? "star" : "star-outline"}
                  size={32}
                  color={gear.isFavorite ? "#FFD700" : TEXT_SECONDARY}
                />
              )}
            </Pressable>
          </View>

          {/* Category Badge */}
          <View className="flex-row mb-6">
            <View
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: getCategoryColor(gear.category) }}
            >
              <Text
                className="text-sm"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
              >
                {getCategoryLabel(gear.category)}
              </Text>
            </View>
          </View>

          {/* Details Section */}
          <View className="mb-6">
            {/* Weight */}
            {gear.weight && (
              <View className="mb-4">
                <Text
                  className="mb-1 text-sm"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_MUTED }}
                >
                  WEIGHT
                </Text>
                <Text
                  className="text-lg"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_PRIMARY_STRONG }}
                >
                  {gear.weight}
                </Text>
              </View>
            )}

            {/* Notes */}
            {gear.notes && (
              <View className="mb-4">
                <Text
                  className="mb-1 text-sm"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_MUTED }}
                >
                  NOTES
                </Text>
                <Text
                  className="text-base leading-6"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_PRIMARY_STRONG }}
                >
                  {gear.notes}
                </Text>
              </View>
            )}
          </View>

          {/* Add to Packing List Button */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowTripPicker(true);
            }}
            className="mb-4 py-3 rounded-lg flex-row items-center justify-center active:opacity-90"
            style={{ backgroundColor: EARTH_GREEN }}
          >
            <Ionicons name="cube-outline" size={18} color={PARCHMENT} style={{ marginRight: 8 }} />
            <Text
              style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
            >
              Add to Packing List
            </Text>
          </Pressable>

          {/* Edit Button */}
          <Pressable
            onPress={handleEdit}
            className="mb-4 py-3 rounded-lg active:opacity-90"
            style={{ backgroundColor: DEEP_FOREST }}
          >
            <Text
              className="text-center"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
            >
              Edit Gear
            </Text>
          </Pressable>

          {/* Delete Button */}
          <Pressable
            onPress={handleDelete}
            className="mb-8 py-3 rounded-lg border active:opacity-70"
            style={{ backgroundColor: PARCHMENT, borderColor: BORDER_SOFT }}
          >
            <Text
              className="text-center"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: "#DC143C" }}
            >
              Delete Item
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Trip Picker Modal */}
      <TripPickerModal
        visible={showTripPicker}
        onClose={() => setShowTripPicker(false)}
        gearItem={gear}
      />
    </View>
  );
}
