import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator, TextInput } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useImageLibraryStore } from "../../state/imageLibraryStore";
import { useAuthStore } from "../../state/authStore";
import { useToast } from "../../components/ToastManager";
import * as ImagePicker from "expo-image-picker";
import type { ImageCategory } from "../../types/community";
import { DEEP_FOREST, PARCHMENT, CARD_BACKGROUND_LIGHT, BORDER_SOFT, TEXT_PRIMARY_STRONG, TEXT_SECONDARY, TEXT_MUTED } from "../../constants/colors";
import { requireAccount } from "../../utils/gating";
import AccountRequiredModal from "../../components/AccountRequiredModal";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import HandleLink from "../../components/HandleLink";

// Component to handle individual photo rendering with error state
function PhotoCard({ item, onVote }: { item: any; onVote: (id: string, type: "up" | "down") => void }) {
  const [imageError, setImageError] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Don't render if image failed to load
  if (imageError) {
    return null;
  }

  return (
    <View className="w-1/2 p-2">
      <View className="rounded-xl overflow-hidden border" style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}>
        <Image
          source={{ uri: item.imageUri }}
          style={{ width: "100%", aspectRatio: 1, backgroundColor: "transparent" }}
          contentFit="cover"
          placeholder={null}
          transition={0}
          onError={() => setImageError(true)}
        />
        <View className="p-3">
          <Text className="text-sm mb-1" numberOfLines={1} style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
            {item.title}
          </Text>
          <View className="flex-row items-center mb-2">
            <Text className="text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>by </Text>
            {item.authorId && item.authorHandle ? (
              <HandleLink 
                handle={item.authorHandle} 
                userId={item.authorId}
                style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12 }}
              />
            ) : item.authorId ? (
              <Pressable onPress={() => navigation.navigate("MyCampsite", { userId: item.authorId })}>
                <Text className="text-xs" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST, textDecorationLine: "underline" }}>
                  {item.authorHandle ? `@${item.authorHandle}` : (item.authorName || "Anonymous")}
                </Text>
              </Pressable>
            ) : (
              <Text className="text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
                {item.authorHandle ? `@${item.authorHandle}` : "Anonymous"}
              </Text>
            )}
          </View>

          {/* Voting */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Pressable
                onPress={() => onVote(item.id, "up")}
                className="mr-2"
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={20}
                  color={item.userVote === "up" ? "#16a34a" : "#9ca3af"}
                />
              </Pressable>
              <Text className="text-sm" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>{item.score}</Text>
              <Pressable
                onPress={() => onVote(item.id, "down")}
                className="ml-2"
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={20}
                  color={item.userVote === "down" ? "#dc2626" : "#9ca3af"}
                />
              </Pressable>
            </View>
            <View className="bg-amber-100 rounded-full px-2 py-1">
              <Text className="text-xs text-amber-800" style={{ fontFamily: "SourceSans3_400Regular" }}>{item.category}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function PhotosTabContent() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthStore();
  const { showError, showSuccess } = useToast();
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Use individual selectors to prevent re-render loops
  const images = useImageLibraryStore((state) => state.images);
  const isLoading = useImageLibraryStore((state) => state.isLoading);
  const selectedCategory = useImageLibraryStore((state) => state.selectedCategory);
  const sortBy = useImageLibraryStore((state) => state.sortBy);
  const syncFromFirebase = useImageLibraryStore((state) => state.syncFromFirebase);
  const addImage = useImageLibraryStore((state) => state.addImage);
  const voteImage = useImageLibraryStore((state) => state.voteImage);
  const setSelectedCategory = useImageLibraryStore((state) => state.setSelectedCategory);

  // Filter and sort images in useMemo to prevent re-computation
  const filteredImages = useMemo(() => {
    let filtered = [...images];

    // Filter out items with score less than -5 (community moderation)
    filtered = filtered.filter((img) => img.score > -5);

    // Filter out items without valid image URIs (including placeholders)
    filtered = filtered.filter((img) => {
      if (!img.imageUri || img.imageUri.trim() === '') return false;
      // Filter out placeholder URLs
      if (img.imageUri.includes('placeholder.com')) return false;
      if (img.imageUri.includes('via.placeholder')) return false;
      return true;
    });

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((img) => img.category === selectedCategory);
    }

    // Filter by search
    if (localSearchQuery.trim()) {
      const searchLower = localSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (img) =>
          img.title.toLowerCase().includes(searchLower) ||
          img.description?.toLowerCase().includes(searchLower) ||
          img.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === "score") {
        return b.score - a.score;
      } else if (sortBy === "hot") {
        const aHours = (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60);
        const bHours = (Date.now() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60);
        const aHot = a.score / Math.max(aHours, 1);
        const bHot = b.score / Math.max(bHours, 1);
        return bHot - aHot;
      }
      return 0;
    });

    return filtered;
  }, [images, localSearchQuery, selectedCategory, sortBy]);

  useEffect(() => {
    if (user) {
      syncFromFirebase(user?.id);
    }
  }, [user]);

  const handleUploadPhoto = async () => {
    // Uploading photos requires an account
    if (!requireAccount({
      openAccountModal: () => setShowAccountModal(true),
    })) {
      return;
    }

    // User is guaranteed to exist after requireAccount check
    if (!user) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await addImage(
          asset.uri,
          "My Photo",
          "Camping memory",
          "camping" as ImageCategory,
          [],
          user.id,
          user.handle,
          user.displayName
        );
        showSuccess("Photo uploaded successfully!");
      }
    } catch (error) {
      showError("Failed to upload photo");
    }
  };

  const handleVote = async (imageId: string, voteType: "up" | "down") => {
    // Voting requires an account
    if (!requireAccount({
      openAccountModal: () => setShowAccountModal(true),
    })) {
      return;
    }

    // User is guaranteed to exist after requireAccount check
    if (!user) return;

    try {
      await voteImage(imageId, user.id, voteType);
    } catch (error) {
      showError("Failed to vote on photo");
    }
  };

  const categories: Array<{ id: ImageCategory | "all"; label: string }> = [
    { id: "all", label: "All" },
    { id: "camping", label: "Camping" },
    { id: "nature", label: "Nature" },
    { id: "gear", label: "Gear" },
    { id: "food", label: "Food" },
    { id: "wildlife", label: "Wildlife" },
    { id: "trails", label: "Trails" },
  ];

  return (
    <View className="flex-1 bg-cream-50">
      {/* Top Navigation Bar */}
      <View className="bg-forest" style={{ paddingVertical: 12 }}>
        <View className="flex-row items-center mb-3" style={{ paddingHorizontal: 16, minHeight: 44 }}>
          <Text className="text-xl font-bold text-parchment" style={{ fontFamily: "Raleway_700Bold" }}>
            Photo Library
          </Text>
          <View className="flex-1 ml-3 mr-3">
            <View className="flex-row items-center bg-parchment rounded-xl px-4 py-2">
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput
                value={localSearchQuery}
                onChangeText={setLocalSearchQuery}
                placeholder="search photos"
                placeholderTextColor="#9ca3af"
                className="flex-1 ml-2 text-forest-800 text-base"
                style={{ fontFamily: "SourceSans3_400Regular" }}
              />
              {localSearchQuery.length > 0 && (
                <Pressable onPress={() => setLocalSearchQuery("")}>
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </Pressable>
              )}
            </View>
          </View>
          <Pressable
            onPress={handleUploadPhoto}
            className="active:opacity-70"
          >
            <Ionicons name="add-circle" size={28} color={PARCHMENT} />
          </Pressable>
        </View>

        {/* Category Filter */}
        <View style={{ paddingHorizontal: 16 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedCategory(item.id)}
              className={`px-4 py-2 rounded-full mr-2 ${
                selectedCategory === item.id
                  ? "bg-amber-600"
                  : "bg-parchment border border-cream-200"
              }`}
            >
              <Text
                className={
                  selectedCategory === item.id
                    ? "text-parchment"
                    : "text-forest-800"
                }
                style={{ fontFamily: selectedCategory === item.id ? "SourceSans3_600SemiBold" : "SourceSans3_400Regular" }}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
        </View>
      </View>

      {/* Photos Grid */}
      {!user ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="lock-closed" size={64} color={DEEP_FOREST} />
          <Text className="mt-4 text-base text-center" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
            Sign in to view photos
          </Text>
          <Text className="mt-2 text-center" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
            Join the community to share and discover camping photos
          </Text>
          <Pressable
            onPress={() => {}}
            className="bg-forest-800 rounded-xl px-6 py-3 mt-6 active:opacity-70"
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>Sign In</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
          <Text className="mt-4" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>Loading photos...</Text>
        </View>
      ) : filteredImages.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="images-outline" size={64} color="#9ca3af" />
          <Text className="mt-4 text-center" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>No photos yet</Text>
          <Text className="mt-2 text-center" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
            Share your camping adventures with the community!
          </Text>
          <Pressable
            onPress={handleUploadPhoto}
            className="bg-forest-800 rounded-xl px-6 py-3 mt-6 active:bg-forest-900"
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>Upload Your First Photo</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredImages}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 8 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PhotoCard item={item} onVote={handleVote} />
          )}
        />
      )}

      {/* Gating Modal */}
      <AccountRequiredModal
        visible={showAccountModal}
        onCreateAccount={() => {
          setShowAccountModal(false);
          navigation.navigate("Auth");
        }}
        onMaybeLater={() => setShowAccountModal(false)}
      />
    </View>
  );
}
