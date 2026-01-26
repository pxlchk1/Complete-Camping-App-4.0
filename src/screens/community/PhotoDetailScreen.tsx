/**
 * Photo Detail Screen
 * Shows full-size photo with caption, tags, and Helpful reaction
 *
 * Supports both legacy stories and new photoPosts format
 */

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  Keyboard,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ModalHeader from "../../components/ModalHeader";
import VotePill from "../../components/VotePill";
import AccountRequiredModal from "../../components/AccountRequiredModal";
import EditPhotoPostModal from "../../components/EditPhotoPostModal";
import { ContentActionsAffordance } from "../../components/contentActions";
import { requireEmailVerification } from "../../utils/authHelper";
import { isAdmin, isModerator, canModerateContent, getUser } from "../../services/userService";
import { User } from "../../types/user";
import * as Haptics from "expo-haptics";
import { getStoryById } from "../../services/storiesService";
import { deletePhotoPost } from "../../services/connectDeletionService";
import { getPhotoPostById, toggleHelpful, checkIfHelpful, vote, getUserVote, VoteDirection, addPhotoComment, getPhotoComments, PhotoComment, voteOnPhotoComment } from "../../services/photoPostsService";
import { Story } from "../../types/community";
import {
  PhotoPost,
  POST_TYPE_LABELS,
  POST_TYPE_COLORS,
  TRIP_STYLE_LABELS,
  DETAIL_TAG_LABELS,
  mapLegacyPostType,
} from "../../types/photoPost";
import { useCurrentUser } from "../../state/userStore";
import {
  DEEP_FOREST,
  PARCHMENT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  EARTH_GREEN,
  CARD_BACKGROUND_LIGHT,
} from "../../constants/colors";
import HandleLink from "../../components/HandleLink";

const { width } = Dimensions.get("window");

type RouteParams = { storyId: string; photoId?: string };

export default function PhotoDetailScreen() {
  console.log("[PLAN_TRACE] Enter PhotoDetailScreen");

  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { storyId, photoId } = (route.params || {}) as RouteParams;
  const postId = storyId || photoId;

  const currentUser = useCurrentUser();
  const scrollViewRef = useRef<ScrollView>(null);
  const [showAccountRequired, setShowAccountRequired] = useState(false);

  // Permission checks for content actions
  const canModerate = currentUser ? canModerateContent(currentUser as User) : false;
  const roleLabel = currentUser 
    ? isAdmin(currentUser as User) 
      ? "ADMIN" as const
      : isModerator(currentUser as User) 
        ? "MOD" as const 
        : null 
    : null;

  // Content action handlers
  const handleDeletePhoto = async () => {
    Alert.alert(
      "Delete Photo",
      "Are you sure you want to delete this photo? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await deletePhotoPost(postId!);
            if (result.success) {
              Alert.alert("Success", "Photo deleted successfully");
              navigation.goBack();
            } else {
              console.error("[PhotoDetail] Delete failed:", result.error);
              Alert.alert(
                "Error",
                result.error?.message || "Failed to delete photo"
              );
            }
          },
        },
      ]
    );
  };

  const handleRemovePhoto = async () => {
    Alert.alert(
      "Remove Photo",
      "Are you sure you want to remove this photo? This moderation action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const result = await deletePhotoPost(postId!);
            if (result.success) {
              Alert.alert("Success", "Photo removed successfully");
              navigation.goBack();
            } else {
              console.error("[PhotoDetail] Remove failed:", result.error);
              Alert.alert(
                "Error",
                result.error?.message || "Failed to remove photo"
              );
            }
          },
        },
      ]
    );
  };

  // Edit handler - only for new format posts and owners
  const handleEditPhoto = () => {
    if (!isNewFormat || !photoPost) {
      Alert.alert("Cannot Edit", "This photo format doesn't support editing.");
      return;
    }
    setShowEditModal(true);
  };

  // Handle save from edit modal
  const handleEditSave = (updatedPost: PhotoPost) => {
    setPhotoPost(updatedPost);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Support both legacy Story and new PhotoPost
  const [photo, setPhoto] = useState<Story | null>(null);
  const [photoPost, setPhotoPost] = useState<PhotoPost | null>(null);
  const [isNewFormat, setIsNewFormat] = useState(false);
  const [authorHandle, setAuthorHandle] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helpful state (legacy)
  const [isHelpful, setIsHelpful] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(0);
  const [helpfulLoading, setHelpfulLoading] = useState(false);

  // Reddit-style voting state
  const [userVote, setUserVote] = useState<VoteDirection>(null);
  const [voteCount, setVoteCount] = useState(0);
  const [voteLoading, setVoteLoading] = useState(false);

  // Comments UI
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState<PhotoComment[]>([]);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (!postId) {
      setError("Missing photo id");
      setLoading(false);
      return;
    }
    loadPhotoData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const loadPhotoData = async () => {
    if (!postId) {
      setError("Missing photo id");
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      // Try new photoPosts collection first
      const newPost = await getPhotoPostById(postId);
      
      if (newPost) {
        setPhotoPost(newPost);
        setIsNewFormat(true);
        setHelpfulCount(newPost.helpfulCount || 0);
        setVoteCount(newPost.voteCount || 0);
        
        // Fetch author's handle if not stored on the photo
        if (!newPost.userHandle && newPost.userId) {
          try {
            const author = await getUser(newPost.userId);
            if (author?.handle) {
              setAuthorHandle(author.handle);
            }
          } catch (err) {
            console.log("Could not fetch author handle:", err);
          }
        }
        
        // Load comments with user's votes
        const postComments = await getPhotoComments(postId, currentUser?.id);
        setComments(postComments);
        
        // Check if user has voted or marked as helpful
        if (currentUser?.id) {
          const [helpful, existingVote] = await Promise.all([
            checkIfHelpful(postId, currentUser.id),
            getUserVote(postId, currentUser.id),
          ]);
          setUserVote(existingVote);
          setIsHelpful(helpful);
        }
      } else {
        // Fall back to legacy stories
        const story = await getStoryById(postId);

        if (!story) {
          setError("Photo not found");
          setPhoto(null);
          return;
        }

        // Fetch author's handle if not stored on the photo
        if (!story.authorHandle && story.authorId) {
          try {
            const author = await getUser(story.authorId);
            if (author?.handle) {
              setAuthorHandle(author.handle);
            }
          } catch (err) {
            console.log("Could not fetch author handle:", err);
          }
        }

        setPhoto(story);
        setIsNewFormat(false);
      }
    } catch (err: any) {
      console.error("Error loading photo:", err);
      setError(err?.message || "Failed to load photo");
      setPhoto(null);
      setPhotoPost(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHelpful = async () => {
    if (!currentUser?.id) {
      setShowAccountRequired(true);
      return;
    }
    if (helpfulLoading || !postId) return;

    setHelpfulLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic update
    const wasHelpful = isHelpful;
    setIsHelpful(!wasHelpful);
    setHelpfulCount((prev) => prev + (wasHelpful ? -1 : 1));

    try {
      await toggleHelpful(postId, currentUser.id);
    } catch (err) {
      // Revert on error
      setIsHelpful(wasHelpful);
      setHelpfulCount((prev) => prev + (wasHelpful ? 1 : -1));
    } finally {
      setHelpfulLoading(false);
    }
  };

  // Reddit-style vote handler
  const handleVote = async (direction: "up" | "down") => {
    if (!currentUser?.id) {
      setShowAccountRequired(true);
      return;
    }
    if (voteLoading || !postId) return;

    setVoteLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Calculate optimistic update
    const currentVote = userVote;
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
    setUserVote(newVote);
    setVoteCount((prev) => prev + delta);

    try {
      await vote(postId, currentUser.id, direction);
    } catch (err) {
      // Revert on error
      setUserVote(currentVote);
      setVoteCount((prev) => prev - delta);
    } finally {
      setVoteLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (submitting) return;
    if (!currentUser) {
      Alert.alert("Sign in required", "Please sign in to comment.");
      return;
    }

    // Require email verification for posting comments
    const isVerified = await requireEmailVerification("comment on photos");
    if (!isVerified) return;

    if (!commentText.trim()) return;
    if (!postId) return;

    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      await addPhotoComment({
        postId,
        text: commentText.trim(),
        userId: currentUser.id,
        username: currentUser.handle || currentUser.displayName || "Anonymous",
        userHandle: currentUser.handle,
      });
      
      setCommentText("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Reload comments with user votes
      const updatedComments = await getPhotoComments(postId, currentUser?.id);
      setComments(updatedComments);
      
      // Update comment count in photoPost
      if (photoPost) {
        setPhotoPost({ ...photoPost, commentCount: (photoPost.commentCount || 0) + 1 });
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      Alert.alert("Error", "Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Comment vote handler
  const handleCommentVote = async (commentId: string, direction: "up" | "down") => {
    if (!currentUser?.id) {
      setShowAccountRequired(true);
      return;
    }
    if (!postId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Find the current comment state
    const commentIndex = comments.findIndex((c) => c.id === commentId);
    if (commentIndex === -1) return;

    const comment = comments[commentIndex];
    const currentVote = comment.userVote;

    // Calculate optimistic update
    let upvoteDelta = 0;
    let downvoteDelta = 0;
    let newVote: "up" | "down" | null = direction;

    if (currentVote === null || currentVote === undefined) {
      if (direction === "up") upvoteDelta = 1;
      else downvoteDelta = 1;
    } else if (currentVote === direction) {
      // Removing vote
      if (direction === "up") upvoteDelta = -1;
      else downvoteDelta = -1;
      newVote = null;
    } else {
      // Switching vote
      if (direction === "up") {
        upvoteDelta = 1;
        downvoteDelta = -1;
      } else {
        upvoteDelta = -1;
        downvoteDelta = 1;
      }
    }

    // Optimistic update
    const updatedComments = [...comments];
    updatedComments[commentIndex] = {
      ...comment,
      userVote: newVote,
      upvotes: comment.upvotes + upvoteDelta,
      downvotes: comment.downvotes + downvoteDelta,
      score: comment.score + (upvoteDelta - downvoteDelta),
    };
    setComments(updatedComments);

    try {
      const result = await voteOnPhotoComment(postId, commentId, currentUser.id, direction);
      
      // Update with server response
      const finalComments = [...updatedComments];
      finalComments[commentIndex] = {
        ...finalComments[commentIndex],
        userVote: result.userVote,
        score: result.newScore,
      };
      setComments(finalComments);

      if (result.flaggedForReview) {
        // Optionally show a subtle notification that the comment is under review
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (err) {
      // Revert on error
      setComments(comments);
      console.error("Error voting on comment:", err);
    }
  };

  // Render tag chips for new format posts
  const renderPostTags = () => {
    if (!photoPost) return null;
    
    const chips: { label: string; color: string }[] = [];
    
    // Post type - map legacy tip-or-fix to setup-ideas
    if (photoPost.postType) {
      const mappedType = mapLegacyPostType(photoPost.postType);
      chips.push({
        label: POST_TYPE_LABELS[mappedType] || "Photo",
        color: POST_TYPE_COLORS[mappedType] || DEEP_FOREST,
      });
    }
    
    // Trip style
    if (photoPost.tripStyle) {
      chips.push({
        label: TRIP_STYLE_LABELS[photoPost.tripStyle],
        color: EARTH_GREEN,
      });
    }
    
    // Detail tags
    if (photoPost.detailTags) {
      photoPost.detailTags.forEach((tag) => {
        chips.push({
          label: DETAIL_TAG_LABELS[tag],
          color: TEXT_SECONDARY,
        });
      });
    }

    if (chips.length === 0) return null;

    return (
      <View className="flex-row flex-wrap gap-2 mb-4">
        {chips.map((chip, idx) => (
          <View
            key={idx}
            className="px-3 py-1.5 rounded-full"
            style={{ backgroundColor: chip.color + "20" }}
          >
            <Text
              className="text-sm"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: chip.color }}
            >
              {chip.label}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // Render location line for new format
  const renderLocationLine = () => {
    if (!photoPost?.campgroundName) return null;
    
    let locationText = photoPost.campgroundName;
    if (photoPost.campsiteNumber && !photoPost.hideCampsiteNumber) {
      locationText += ` • Site ${photoPost.campsiteNumber}`;
    }

    return (
      <View 
        className="flex-row items-center mb-3 px-4 py-3 rounded-xl"
        style={{ backgroundColor: "#2563eb10", borderWidth: 1, borderColor: "#2563eb40" }}
      >
        <Ionicons name="location" size={18} color="#2563eb" />
        <Text
          className="ml-2 flex-1"
          style={{ fontFamily: "SourceSans3_600SemiBold", color: "#2563eb" }}
        >
          {locationText}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-parchment">
        <ActivityIndicator size="large" color={DEEP_FOREST} />
        <Text
          className="mt-4"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
        >
          Loading photo...
        </Text>
      </View>
    );
  }

  if (error || (!photo && !photoPost)) {
    return (
      <View className="flex-1 bg-parchment">
        <ModalHeader title="Photo" showTitle />
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="alert-circle-outline" size={64} color={EARTH_GREEN} />
          <Text
            className="mt-4 text-center text-lg"
            style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
          >
            {error || "Photo not found"}
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            className="mt-6 px-6 py-3 rounded-xl active:opacity-90"
            style={{ backgroundColor: DEEP_FOREST }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Get display data from either format
  const imageUrl = isNewFormat 
    ? photoPost?.photoUrls?.[0] 
    : photo?.imageUrl;
  const caption = isNewFormat ? photoPost?.caption : photo?.caption;
  
  // Get the author's userId for profile navigation
  const authorUserId = isNewFormat ? photoPost?.userId : photo?.userId;
  
  // Get the raw handle (without @) for HandleLink
  const getRawHandle = () => {
    if (isNewFormat) {
      if (photoPost?.userHandle) return photoPost.userHandle;
      if (authorHandle) return authorHandle;
      return null;
    } else {
      if (photo?.authorHandle) return photo.authorHandle;
      if (authorHandle) return authorHandle;
      return null;
    }
  };
  const rawHandle = getRawHandle();
  
  // Get the author's display - prioritize stored handle, then fetched handle, then displayName
  const getAuthorDisplay = () => {
    if (rawHandle) return `@${rawHandle}`;
    if (isNewFormat) {
      return photoPost?.displayName || "Anonymous";
    } else {
      return photo?.displayName || "Anonymous";
    }
  };
  const displayName = getAuthorDisplay();
  const legacyTags = !isNewFormat && photo?.tags ? photo.tags : [];

  return (
    <View className="flex-1 bg-parchment">
      <ModalHeader title="Photo" showTitle />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1" 
          contentContainerStyle={{ paddingBottom: 24 }} 
          keyboardShouldPersistTaps="handled" 
          keyboardDismissMode="interactive"
        >
          {/* Photo */}
          <View style={{ backgroundColor: "#000" }}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={{ width, height: width, backgroundColor: "#111827" }}
                resizeMode="contain"
                onError={() => console.log("Image unavailable:", imageUrl)}
              />
            ) : (
              <View className="items-center justify-center bg-gray-100" style={{ width, height: width }}>
                <Ionicons name="image" size={48} color={TEXT_MUTED} />
                <Text style={{ color: TEXT_MUTED, fontFamily: "SourceSans3_400Regular" }}>
                  Image unavailable
                </Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View className="px-5 py-4">
            {/* Location line for new format */}
            {isNewFormat && renderLocationLine()}

            {/* Legacy location */}
            {!isNewFormat && photo?.locationName && (
              <View className="flex-row items-center mb-3">
                <Ionicons name="location" size={16} color={EARTH_GREEN} />
                <Text
                  className="ml-1"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  {photo.locationName}
                </Text>
              </View>
            )}

            {/* Tags for new format */}
            {isNewFormat && renderPostTags()}

            {/* Caption */}
            {!!caption && (
              <Text
                className="mb-4 leading-6"
                style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY, fontSize: 15 }}
              >
                {caption}
              </Text>
            )}

            {/* Legacy tags */}
            {legacyTags.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mb-4">
                {legacyTags.map((tag: string, idx: number) => (
                  <View key={`${tag}-${idx}`} className="px-3 py-1 rounded-full bg-green-100">
                    <Text
                      className="text-xs"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: "#166534" }}
                    >
                      #{tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Author and action row */}
            <View className="flex-row items-center justify-between py-3 border-t" style={{ borderColor: BORDER_SOFT }}>
              <View className="flex-row items-center flex-1">
                <Text className="text-sm" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
                  by{" "}
                </Text>
                {rawHandle && authorUserId ? (
                  <HandleLink 
                    handle={rawHandle} 
                    userId={authorUserId}
                    style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14 }}
                  />
                ) : authorUserId ? (
                  <Pressable onPress={() => navigation.navigate("MyCampsite", { userId: authorUserId })}>
                    <Text className="text-sm" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST, textDecorationLine: "underline" }}>
                      {displayName}
                    </Text>
                  </Pressable>
                ) : (
                  <Text className="text-sm" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
                    {displayName}
                  </Text>
                )}
              </View>
              
              {/* Content actions */}
              <ContentActionsAffordance
                itemId={postId || ""}
                itemType="photo"
                createdByUserId={isNewFormat ? (photoPost?.userId || "") : (photo?.userId || "")}
                currentUserId={currentUser?.id}
                canModerate={canModerate}
                roleLabel={roleLabel}
                onRequestEdit={isNewFormat ? handleEditPhoto : undefined}
                onRequestDelete={handleDeletePhoto}
                onRequestRemove={handleRemovePhoto}
                layout="cardHeader"
              />
              
              {isNewFormat ? (
                // Reddit-style voting for new format
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    borderWidth: 1,
                    borderColor: BORDER_SOFT,
                    borderRadius: 20,
                    paddingHorizontal: 4,
                  }}
                >
                  {/* Upvote button */}
                  <Pressable
                    onPress={() => handleVote("up")}
                    disabled={voteLoading}
                    style={{ padding: 8 }}
                  >
                    <Ionicons
                      name={userVote === "up" ? "arrow-up" : "arrow-up-outline"}
                      size={20}
                      color={userVote === "up" ? "#f97316" : TEXT_SECONDARY}
                    />
                  </Pressable>

                  {/* Vote count */}
                  <Text
                    style={{
                      fontFamily: "SourceSans3_700Bold",
                      fontSize: 15,
                      color: userVote === "up" ? "#f97316" : userVote === "down" ? "#8b5cf6" : TEXT_PRIMARY_STRONG,
                      minWidth: 24,
                      textAlign: "center",
                    }}
                  >
                    {voteCount}
                  </Text>

                  {/* Downvote button */}
                  <Pressable
                    onPress={() => handleVote("down")}
                    disabled={voteLoading}
                    style={{ padding: 8 }}
                  >
                    <Ionicons
                      name={userVote === "down" ? "arrow-down" : "arrow-down-outline"}
                      size={20}
                      color={userVote === "down" ? "#8b5cf6" : TEXT_SECONDARY}
                    />
                  </Pressable>
                </View>
              ) : (
                // Vote pill for legacy format
                <VotePill
                  collectionPath="stories"
                  itemId={postId || ""}
                  initialScore={(photo?.upvotes || 0) - (photo?.downvotes || 0)}
                  onRequireAccount={() => setShowAccountRequired(true)}
                />
              )}
            </View>
          </View>

          {/* Comments Section */}
          {isNewFormat && comments.length > 0 && (
            <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
              <Text
                style={{
                  fontFamily: "SourceSans3_700Bold",
                  fontSize: 16,
                  color: TEXT_PRIMARY_STRONG,
                  marginBottom: 12,
                }}
              >
                Comments ({comments.length})
              </Text>
              {comments
                .filter((comment) => !comment.isHidden || comment.userId === currentUser?.id)
                .map((comment) => (
                <View
                  key={comment.id}
                  style={{
                    backgroundColor: comment.isHidden ? "#fef3c7" : CARD_BACKGROUND_LIGHT,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: comment.isHidden ? "#fbbf24" : BORDER_SOFT,
                  }}
                >
                  {/* Hidden badge for author */}
                  {comment.isHidden && comment.userId === currentUser?.id && (
                    <View style={{ 
                      backgroundColor: "#fbbf24", 
                      borderRadius: 4, 
                      paddingHorizontal: 8, 
                      paddingVertical: 2, 
                      alignSelf: "flex-start",
                      marginBottom: 8,
                    }}>
                      <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 11, color: "#78350f" }}>
                        Hidden pending review
                      </Text>
                    </View>
                  )}
                  
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1 }}>
                      {comment.userId && (comment.userHandle || comment.username) ? (
                        <HandleLink
                          handle={comment.userHandle || comment.username}
                          userId={comment.userId}
                          style={{
                            fontFamily: "SourceSans3_600SemiBold",
                            fontSize: 13,
                          }}
                        />
                      ) : comment.userId ? (
                        <Pressable onPress={() => navigation.navigate("MyCampsite", { userId: comment.userId })}>
                          <Text
                            style={{
                              fontFamily: "SourceSans3_600SemiBold",
                              fontSize: 13,
                              color: DEEP_FOREST,
                              textDecorationLine: "underline",
                              marginBottom: 4,
                            }}
                          >
                            {comment.userHandle || comment.username || "Anonymous"}
                          </Text>
                        </Pressable>
                      ) : (
                        <Text
                          style={{
                            fontFamily: "SourceSans3_600SemiBold",
                            fontSize: 13,
                            color: DEEP_FOREST,
                            marginBottom: 4,
                          }}
                        >
                          {comment.userHandle || comment.username || "Anonymous"}
                        </Text>
                      )}
                      <Text
                        style={{
                          fontFamily: "SourceSans3_400Regular",
                          fontSize: 14,
                          color: TEXT_PRIMARY_STRONG,
                          lineHeight: 20,
                          marginTop: 4,
                        }}
                      >
                        {comment.text}
                      </Text>
                    </View>
                    
                    {/* Comment voting */}
                    <View style={{ 
                      flexDirection: "row", 
                      alignItems: "center", 
                      backgroundColor: PARCHMENT,
                      borderRadius: 16,
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                      borderWidth: 1,
                      borderColor: BORDER_SOFT,
                      marginLeft: 8,
                    }}>
                      <Pressable
                        onPress={() => handleCommentVote(comment.id, "up")}
                        style={{ padding: 4 }}
                      >
                        <Ionicons
                          name={comment.userVote === "up" ? "arrow-up" : "arrow-up-outline"}
                          size={16}
                          color={comment.userVote === "up" ? EARTH_GREEN : TEXT_SECONDARY}
                        />
                      </Pressable>
                      <Text
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 12,
                          color: TEXT_PRIMARY_STRONG,
                          minWidth: 20,
                          textAlign: "center",
                        }}
                      >
                        {comment.score}
                      </Text>
                      <Pressable
                        onPress={() => handleCommentVote(comment.id, "down")}
                        style={{ padding: 4 }}
                      >
                        <Ionicons
                          name={comment.userVote === "down" ? "arrow-down" : "arrow-down-outline"}
                          size={16}
                          color={comment.userVote === "down" ? "#dc2626" : TEXT_SECONDARY}
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Comment box */}
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: BORDER_SOFT,
              borderRadius: 16,
              overflow: "hidden",
              backgroundColor: "#fff",
            }}
          >
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Add a comment..."
              placeholderTextColor={TEXT_MUTED}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={Keyboard.dismiss}
              onFocus={() => {
                if (!currentUser) {
                  Keyboard.dismiss();
                  setShowAccountRequired(true);
                } else {
                  // Scroll to show comment box above keyboard
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }
              }}
              style={{
                padding: 16,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
                minHeight: 96,
              }}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", padding: 12, borderTopWidth: 1, borderColor: BORDER_SOFT }}>
              <Pressable
                onPress={handleSubmitComment}
                disabled={!commentText.trim() || submitting}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: commentText.trim() && !submitting ? DEEP_FOREST : "#d1d5db",
                }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>Post</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AccountRequiredModal
        visible={showAccountRequired}
        onCreateAccount={() => {
          setShowAccountRequired(false);
          navigation.navigate("Paywall");
        }}
        onMaybeLater={() => setShowAccountRequired(false)}
      />

      {/* Edit photo post modal */}
      <EditPhotoPostModal
        visible={showEditModal}
        photoPost={photoPost}
        onSave={handleEditSave}
        onClose={() => setShowEditModal(false)}
      />
    </View>
  );
}
