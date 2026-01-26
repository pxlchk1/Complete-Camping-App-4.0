/**
 * Photos List Screen (Redesigned)
 * Content-first photo gallery with compact filter bar
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, Pressable, FlatList, Image, ActivityIndicator, Dimensions, ScrollView, Alert, LayoutAnimation, Platform, UIManager } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getPhotoPosts, getHelpfulStatuses, toggleHelpful, getUserVotes, vote, VoteDirection } from "../../services/photoPostsService";
import { getStories } from "../../services/storiesService";
import { Story } from "../../types/community";
import {
  PhotoPost,
  PhotoPostType,
  TripStyle,
  POST_TYPE_LABELS,
  POST_TYPE_COLORS,
  mapLegacyPostType,
} from "../../types/photoPost";
import { useCurrentUser } from "../../state/userStore";
import { RootStackNavigationProp } from "../../navigation/types";
import CommunitySectionHeader from "../../components/CommunitySectionHeader";
import AccountRequiredModal from "../../components/AccountRequiredModal";
import OnboardingModal from "../../components/OnboardingModal";
import { useScreenOnboarding } from "../../hooks/useScreenOnboarding";
import { requireAccount } from "../../utils/gating";
import { shouldShowInFeed } from "../../services/moderationService";
import { canUploadPhotoToday } from "../../services/photoLimitService";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../../constants/colors";
import { DocumentSnapshot } from "firebase/firestore";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");
const GRID_GAP = 8;
const GRID_PADDING = 12;
const ITEM_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP) / 2;

// Category chips - compact, text only
const CATEGORY_CHIPS: { key: PhotoPostType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "campsite-spotlight", label: "Campsites" },
  { key: "conditions-report", label: "Conditions" },
  { key: "setup-ideas", label: "Setups" },
  { key: "gear-in-real-life", label: "Gear" },
];

// Tag chips - collapsible row
const TAG_CHIPS: { key: string; label: string }[] = [
  { key: "camp-cooking", label: "Cooking" },
  { key: "wildlife-nature", label: "Wildlife" },
  { key: "accessibility", label: "Accessible" },
  { key: "car-camping", label: "Car Camping" },
  { key: "backpacking", label: "Backpacking" },
  { key: "winter-camping", label: "Winter" },
  { key: "family-camping", label: "Family" },
];

export default function PhotosListScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const currentUser = useCurrentUser();

  // Photo data
  const [photoPosts, setPhotoPosts] = useState<PhotoPost[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<PhotoPostType | "all">("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy] = useState<"newest" | "most-helpful">("newest");
  const [tagsExpanded, setTagsExpanded] = useState(false);
  
  // Pagination
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Helpful status tracking
  const [helpfulStatuses, setHelpfulStatuses] = useState<Record<string, boolean>>({});
  
  // Reddit-style vote tracking
  const [userVotes, setUserVotes] = useState<Record<string, VoteDirection>>({});

  // Gating modal state
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Onboarding modal
  const { showModal, currentTooltip, dismissModal, openModal } = useScreenOnboarding("Photos");

  // Check if any filter is active
  const hasActiveFilters = selectedCategory !== "all" || selectedTag !== null;

  const loadPhotoPosts = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setLoading(true);
        setPhotoPosts([]);
        setLastDoc(null);
        setHasMore(true);
      }

      setError(null);

      // Build filter for query
      let postType: PhotoPostType | undefined;
      let tripStyle: TripStyle | undefined;

      if (selectedCategory !== "all") {
        postType = selectedCategory;
      }

      // Check if selected tag is a trip style or post type
      if (selectedTag) {
        const tripStyles: TripStyle[] = ["car-camping", "backpacking", "winter-camping", "family-camping", "tent-camping", "rv-trailer", "group-camping", "solo-camping"];
        if (tripStyles.includes(selectedTag as TripStyle)) {
          tripStyle = selectedTag as TripStyle;
        } else {
          // It's a post type (like camp-cooking, wildlife-nature)
          postType = selectedTag as PhotoPostType;
        }
      }

      const result = await getPhotoPosts(
        { postType, tripStyle, sortBy },
        30,
        refresh ? undefined : lastDoc || undefined
      );

      // Filter out hidden content
      const visiblePosts = result.posts.filter(post => 
        !post.isHidden || post.userId === currentUser?.id
      );

      if (refresh) {
        setPhotoPosts(visiblePosts);
      } else {
        setPhotoPosts(prev => [...prev, ...visiblePosts]);
      }

      setLastDoc(result.lastDoc);
      setHasMore(result.posts.length === 30);

      // Load helpful statuses and vote statuses
      if (currentUser?.id && visiblePosts.length > 0) {
        const [statuses, votes] = await Promise.all([
          getHelpfulStatuses(visiblePosts.map(p => p.id), currentUser.id),
          getUserVotes(visiblePosts.map(p => p.id), currentUser.id),
        ]);
        setHelpfulStatuses(prev => ({ ...prev, ...statuses }));
        setUserVotes(prev => ({ ...prev, ...votes }));
      }
    } catch (err: any) {
      console.error("Error loading photo posts:", err);
      await loadLegacyStories(refresh);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedTag, sortBy, currentUser?.id]);

  // Legacy fallback
  const loadLegacyStories = async (refresh = false) => {
    try {
      const result = await getStories(undefined, undefined, 30, refresh ? undefined : lastDoc || undefined);
      const visibleStories = result.stories.filter(story => shouldShowInFeed(story, currentUser?.id));

      if (refresh) {
        setStories(visibleStories);
      } else {
        setStories(prev => [...prev, ...visibleStories]);
      }

      setLastDoc(result.lastDoc);
      setHasMore(result.stories.length === 30);
    } catch (err: any) {
      setError(err.message || "Failed to load photos");
    }
  };

  // Initial load
  useEffect(() => {
    loadPhotoPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedTag, sortBy]);

  useFocusEffect(
    useCallback(() => {
      loadPhotoPosts(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory, selectedTag, sortBy])
  );

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && lastDoc) {
      setLoadingMore(true);
      loadPhotoPosts(false);
    }
  };

  const handlePhotoPress = (postId: string) => {
    navigation.navigate("PhotoDetail", { storyId: postId });
  };

  const handleUploadPhoto = async () => {
    if (!requireAccount({ openAccountModal: () => setShowAccountModal(true) })) return;

    const limitCheck = await canUploadPhotoToday();
    if (!limitCheck.canUpload) {
      Alert.alert("Daily Limit Reached", limitCheck.message || "Try again tomorrow.", [
        { text: "Maybe Later", style: "cancel" },
        { text: "Upgrade", onPress: () => navigation.navigate("Paywall") },
      ]);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("PhotoComposer", {});
  };

  const handleToggleHelpful = async (postId: string) => {
    if (!currentUser?.id) {
      setShowAccountModal(true);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const wasHelpful = helpfulStatuses[postId];
    setHelpfulStatuses(prev => ({ ...prev, [postId]: !wasHelpful }));
    setPhotoPosts(prev => 
      prev.map(p => p.id === postId ? { ...p, helpfulCount: p.helpfulCount + (wasHelpful ? -1 : 1) } : p)
    );

    try {
      await toggleHelpful(postId, currentUser.id);
    } catch {
      setHelpfulStatuses(prev => ({ ...prev, [postId]: wasHelpful }));
      setPhotoPosts(prev => 
        prev.map(p => p.id === postId ? { ...p, helpfulCount: p.helpfulCount + (wasHelpful ? 1 : -1) } : p)
      );
    }
  };

  // Reddit-style vote handler
  const handleVote = async (postId: string, direction: "up" | "down") => {
    if (!currentUser?.id) {
      setShowAccountModal(true);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const currentVote = userVotes[postId];
    
    // Calculate optimistic update
    let delta = 0;
    let newVote: VoteDirection = direction;
    
    if (currentVote === null || currentVote === undefined) {
      delta = direction === "up" ? 1 : -1;
    } else if (currentVote === direction) {
      // Removing vote
      delta = direction === "up" ? -1 : 1;
      newVote = null;
    } else {
      // Switching vote
      delta = direction === "up" ? 2 : -2;
    }
    
    // Optimistic update
    setUserVotes(prev => ({ ...prev, [postId]: newVote }));
    setPhotoPosts(prev => 
      prev.map(p => p.id === postId ? { ...p, voteCount: (p.voteCount || 0) + delta } : p)
    );

    try {
      await vote(postId, currentUser.id, direction);
    } catch {
      // Rollback on error
      setUserVotes(prev => ({ ...prev, [postId]: currentVote }));
      setPhotoPosts(prev => 
        prev.map(p => p.id === postId ? { ...p, voteCount: (p.voteCount || 0) - delta } : p)
      );
    }
  };

  const handleCategoryPress = (key: PhotoPostType | "all") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(key);
    // Keep tags visible if a category is selected (not All)
    if (key !== "all" && !tagsExpanded) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTagsExpanded(true);
    }
  };

  const handleTagPress = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTag(selectedTag === key ? null : key);
  };

  const handleClearFilters = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory("all");
    setSelectedTag(null);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTagsExpanded(false);
  };

  const toggleTagsExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTagsExpanded(!tagsExpanded);
  };

  // Memoized feed data
  const feedData = useMemo(() => {
    return photoPosts.length > 0 ? photoPosts : stories;
  }, [photoPosts, stories]);

  // Compact filter bar header
  const renderHeader = () => (
    <View style={{ paddingBottom: 8 }}>
      {/* Helper line - minimal */}
      <View style={{ paddingHorizontal: GRID_PADDING, paddingTop: 4, paddingBottom: 8 }}>
        <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_MUTED }}>
          Pick a category, add tags, post.
        </Text>
      </View>

      {/* Category chips row */}
      <View style={{ marginBottom: 6 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: GRID_PADDING, gap: 6 }}
        >
          {CATEGORY_CHIPS.map((chip) => {
            const isActive = selectedCategory === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => handleCategoryPress(chip.key)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: isActive ? DEEP_FOREST : "transparent",
                  borderWidth: 1,
                  borderColor: isActive ? DEEP_FOREST : BORDER_SOFT,
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 13,
                    color: isActive ? PARCHMENT : TEXT_PRIMARY_STRONG,
                  }}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}

          {/* Tags toggle */}
          <Pressable
            onPress={toggleTagsExpanded}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: tagsExpanded || selectedTag ? DEEP_FOREST + "15" : "transparent",
              borderWidth: 1,
              borderColor: tagsExpanded || selectedTag ? DEEP_FOREST : BORDER_SOFT,
            }}
          >
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 13,
                color: tagsExpanded || selectedTag ? DEEP_FOREST : TEXT_SECONDARY,
              }}
            >
              Tags
            </Text>
            <Ionicons
              name={tagsExpanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={tagsExpanded || selectedTag ? DEEP_FOREST : TEXT_SECONDARY}
              style={{ marginLeft: 2 }}
            />
          </Pressable>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Pressable
              onPress={handleClearFilters}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 13,
                  color: EARTH_GREEN,
                }}
              >
                Clear
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

      {/* Tags row - collapsible */}
      {tagsExpanded && (
        <View style={{ marginBottom: 6 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: GRID_PADDING, gap: 6 }}
          >
            {TAG_CHIPS.map((chip) => {
              const isActive = selectedTag === chip.key;
              return (
                <Pressable
                  key={chip.key}
                  onPress={() => handleTagPress(chip.key)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 14,
                    backgroundColor: isActive ? EARTH_GREEN : "transparent",
                    borderWidth: 1,
                    borderColor: isActive ? EARTH_GREEN : BORDER_SOFT,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 12,
                      color: isActive ? PARCHMENT : TEXT_SECONDARY,
                    }}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );

  // Render photo grid item
  const renderPhotoItem = ({ item, index }: { item: PhotoPost | Story; index: number }) => {
    const isPhotoPost = "photoUrls" in item;
    const imageUrl = isPhotoPost ? (item as PhotoPost).photoUrls?.[0] : (item as Story).imageUrl;
    const caption = isPhotoPost ? (item as PhotoPost).caption : (item as Story).caption;
    const isHelpful = isPhotoPost ? helpfulStatuses[item.id] : false;
    const helpfulCount = isPhotoPost ? (item as PhotoPost).helpfulCount : 0;
    const currentVote = isPhotoPost ? userVotes[item.id] : null;
    const voteCount = isPhotoPost ? ((item as PhotoPost).voteCount || 0) : 0;

    return (
      <Pressable
        onPress={() => handlePhotoPress(item.id)}
        style={{
          width: ITEM_WIDTH,
          aspectRatio: 0.85,
          marginBottom: GRID_GAP,
          marginLeft: index % 2 === 0 ? GRID_PADDING : GRID_GAP / 2,
          marginRight: index % 2 === 1 ? GRID_PADDING : GRID_GAP / 2,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: CARD_BACKGROUND_LIGHT,
        }}
      >
        {imageUrl ? (
          <View style={{ flex: 1 }}>
            <Image
              source={{ uri: imageUrl }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
            {/* Bottom overlay */}
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: "rgba(0,0,0,0.65)",
                paddingHorizontal: 8,
                paddingVertical: 6,
              }}
            >
              {/* Caption preview */}
              {!!caption && (
                <Text
                  numberOfLines={2}
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    color: "#fff",
                    fontSize: 12,
                    lineHeight: 16,
                  }}
                >
                  {caption}
                </Text>
              )}
              
              {/* Post type badge + helpful */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                {isPhotoPost && (item as PhotoPost).postType && (
                  <View
                    style={{
                      backgroundColor: POST_TYPE_COLORS[mapLegacyPostType((item as PhotoPost).postType)] + "30",
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 10,
                        color: "#fff",
                      }}
                    >
                      {POST_TYPE_LABELS[mapLegacyPostType((item as PhotoPost).postType)]}
                    </Text>
                  </View>
                )}
                
                {isPhotoPost && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "rgba(255,255,255,0.15)",
                      borderRadius: 8,
                      paddingHorizontal: 2,
                    }}
                  >
                    {/* Upvote button */}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleVote(item.id, "up");
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons
                        name={currentVote === "up" ? "arrow-up" : "arrow-up-outline"}
                        size={14}
                        color={currentVote === "up" ? "#f97316" : "#fff"}
                      />
                    </Pressable>
                    
                    {/* Vote count */}
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 11,
                        color: currentVote === "up" ? "#f97316" : currentVote === "down" ? "#8b5cf6" : "#fff",
                        minWidth: 16,
                        textAlign: "center",
                      }}
                    >
                      {voteCount}
                    </Text>
                    
                    {/* Downvote button */}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleVote(item.id, "down");
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons
                        name={currentVote === "down" ? "arrow-down" : "arrow-down-outline"}
                        size={14}
                        color={currentVote === "down" ? "#8b5cf6" : "#fff"}
                      />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="image" size={28} color={TEXT_MUTED} />
          </View>
        )}
      </Pressable>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: PARCHMENT, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={DEEP_FOREST} />
        <Text style={{ marginTop: 12, fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
          Loading photos...
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: PARCHMENT }}>
        <CommunitySectionHeader title="Camping Photos" onAddPress={handleUploadPhoto} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
          <Ionicons name="alert-circle-outline" size={48} color={EARTH_GREEN} />
          <Text style={{ marginTop: 12, fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
            Failed to load photos
          </Text>
          <Pressable
            onPress={() => loadPhotoPosts(true)}
            style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: DEEP_FOREST }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: PARCHMENT }}>
      {/* Header */}
      <CommunitySectionHeader title="Camping Photos" onAddPress={handleUploadPhoto} onInfoPress={openModal} />

      {/* Photo Grid */}
      <FlatList
        data={feedData}
        renderItem={renderPhotoItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: 100 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={DEEP_FOREST} style={{ marginVertical: 20 }} /> : null}
        ListEmptyComponent={
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40, paddingHorizontal: 20 }}>
            <Ionicons name="images-outline" size={48} color={TEXT_MUTED} />
            <Text style={{ marginTop: 12, fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
              No photos yet
            </Text>
            <Text style={{ marginTop: 6, fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, textAlign: "center" }}>
              Be the first to share a camping moment!
            </Text>
          </View>
        }
      />

      {/* Account Required Modal */}
      <AccountRequiredModal
        visible={showAccountModal}
        onCreateAccount={() => {
          setShowAccountModal(false);
          navigation.navigate("Auth");
        }}
        onMaybeLater={() => setShowAccountModal(false)}
      />

      {/* Onboarding Modal */}
      <OnboardingModal
        visible={showModal}
        tooltip={currentTooltip}
        onDismiss={dismissModal}
      />
    </View>
  );
}
