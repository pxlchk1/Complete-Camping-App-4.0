/**
 * Feedback Detail Screen
 * Shows feedback post with comments
 */

import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ModalHeader from "../../components/ModalHeader";
import VotePill from "../../components/VotePill";
import AccountRequiredModal from "../../components/AccountRequiredModal";
import { ContentActionsAffordance } from "../../components/contentActions";
import { useContentActions } from "../../hooks/useContentActions";
import { isAdmin, isModerator, canModerateContent } from "../../services/userService";
import { deleteFeedback } from "../../services/connectDeletionService";
import { User } from "../../types/user";
import { requireProForAction } from "../../utils/gating";
import { requireEmailVerification } from "../../utils/authHelper";
import * as Haptics from "expo-haptics";
import {
  getFeedbackPostById,
  getFeedbackComments,
  addFeedbackComment,
} from "../../services/feedbackService";
import { getUser } from "../../services/userService";
import { FeedbackPost, FeedbackComment } from "../../types/community";
import { useCurrentUser } from "../../state/userStore";
import { RootStackScreenProps } from "../../navigation/types";
import {
  DEEP_FOREST,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  EARTH_GREEN,
} from "../../constants/colors";

type RouteParams = RootStackScreenProps<"FeedbackDetail">;

export default function FeedbackDetailScreen() {
  const route = useRoute<RouteParams["route"]>();
  const navigation = useNavigation<RouteParams["navigation"]>();
  const { postId } = route.params;
  const currentUser = useCurrentUser();

  const [post, setPost] = useState<FeedbackPost | null>(null);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authorName, setAuthorName] = useState<string | null>(null);
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

  // Content action handlers for the post
  const handleDeletePost = async () => {
    Alert.alert(
      "Delete Feedback",
      "Are you sure you want to delete this feedback? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await deleteFeedback(postId);
            if (result.success) {
              Alert.alert("Success", "Feedback deleted successfully");
              navigation.goBack();
            } else {
              console.error("[FeedbackDetail] Delete failed:", result.error);
              Alert.alert(
                "Error",
                result.error?.message || "Failed to delete feedback"
              );
            }
          },
        },
      ]
    );
  };

  const handleRemovePost = async () => {
    Alert.alert(
      "Remove Feedback",
      "Are you sure you want to remove this feedback? This moderation action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const result = await deleteFeedback(postId);
            if (result.success) {
              Alert.alert("Success", "Feedback removed successfully");
              navigation.goBack();
            } else {
              console.error("[FeedbackDetail] Remove failed:", result.error);
              Alert.alert(
                "Error",
                result.error?.message || "Failed to remove feedback"
              );
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadPostData();
  }, [postId]);

  const loadPostData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [postData, commentsData] = await Promise.all([
        getFeedbackPostById(postId),
        getFeedbackComments(postId),
      ]);

      if (!postData) {
        setError("Post not found");
        return;
      }

      setPost(postData);
      setComments(commentsData);

      // Load author info (optional - may fail for non-authenticated users)
      try {
        const author = await getUser(postData.authorId);
        if (author) {
          setAuthorName(author.displayName || author.handle);
        }
      } catch (authorErr) {
        // Silently ignore - author name is not critical for viewing
        console.log("[FeedbackDetail] Could not load author:", authorErr);
      }
    } catch (err: any) {
      console.error("[FeedbackDetail] Error loading post:", err);
      // Safely extract error message, handling cases where message might be undefined
      const errorMessage = typeof err?.message === 'string' ? err.message : "Failed to load post";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    // Require email verification first
    const isVerified = await requireEmailVerification("comment on feedback");
    if (!isVerified) return;

    // Gate commenting behind Pro subscription
    requireProForAction(
      async () => {
        if (!currentUser || !commentText.trim() || submitting) return;

        try {
          setSubmitting(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          await addFeedbackComment({
            feedbackId: postId,
            body: commentText.trim(),
            authorId: currentUser.id,
          });

          // Reload comments
          const updatedComments = await getFeedbackComments(postId);
          setComments(updatedComments);
          setCommentText("");

          // Update post comment count
          if (post) {
            setPost({ ...post, commentCount: post.commentCount + 1 });
          }
        } catch (err: any) {
          setError("Failed to submit comment");
        } finally {
          setSubmitting(false);
        }
      },
      {
        openAccountModal: () => setShowAccountRequired(true),
        openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "feedback_comment", variant }),
      }
    );
  };

  const formatTimeAgo = (dateString: string | any) => {
    if (!dateString) return "";
    try {
      const now = new Date();
      const date = typeof dateString === "string" ? new Date(dateString) : dateString?.toDate?.() || new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

      if (diffInHours < 1) return "Just now";
      if (diffInHours < 24) return `${diffInHours}h ago`;

      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;

      const diffInWeeks = Math.floor(diffInDays / 7);
      if (diffInWeeks < 4) return `${diffInWeeks}w ago`;

      return date.toLocaleDateString();
    } catch (e) {
      return "";
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "open": return "#6b7280";
      case "planned": return "#3b82f6";
      case "in_progress": return "#f59e0b";
      case "done": return "#10b981";
      case "declined": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    switch (status) {
      case "open": return "Open";
      case "planned": return "Planned";
      case "in_progress": return "In Progress";
      case "done": return "Done";
      case "declined": return "Declined";
      default: return status || "Open";
    }
  };

  const getCategoryLabel = (category: string | undefined) => {
    switch (category) {
      case "feature": return "Feature Request";
      case "bug": return "Bug Report";
      case "improvement": return "Improvement";
      case "question": return "Question";
      case "other": return "Other";
      default: return category || "Other";
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-parchment">
        <ActivityIndicator size="large" color={DEEP_FOREST} />
        <Text className="mt-4" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
          Loading feedback...
        </Text>
      </View>
    );
  }

  if (error || !post) {
    return (
      <View className="flex-1 bg-parchment">
        <ModalHeader title="Feedback" showTitle />
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="alert-circle-outline" size={64} color={EARTH_GREEN} />
          <Text className="mt-4 text-center text-lg" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
            {error || "Post not found"}
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            className="mt-6 px-6 py-3 rounded-xl active:opacity-90"
            style={{ backgroundColor: DEEP_FOREST }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const statusColor = getStatusColor(post.status);
  const statusLabel = getStatusLabel(post.status);

  return (
    <View className="flex-1 bg-parchment">
      <ModalHeader title="Feedback" showTitle />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Post Card */}
          <View className="mx-5 mt-5 rounded-xl p-5 border" style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}>
            {/* Header with tags and actions */}
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-row flex-wrap gap-2 flex-1">
                <View className="px-3 py-1 rounded-full bg-amber-100">
                  <Text className="text-xs" style={{ fontFamily: "SourceSans3_600SemiBold", color: "#92400e" }}>
                    {getCategoryLabel(post.category)}
                  </Text>
                </View>
                <View className="px-3 py-1 rounded-md" style={{ backgroundColor: statusColor + "20" }}>
                  <Text className="text-xs" style={{ fontFamily: "SourceSans3_600SemiBold", color: statusColor }}>
                    {statusLabel}
                  </Text>
                </View>
              </View>
              <ContentActionsAffordance
                itemId={postId}
                itemType="feedback"
                createdByUserId={post.authorId}
                currentUserId={currentUser?.id}
                canModerate={canModerate}
                roleLabel={roleLabel}
                onRequestDelete={handleDeletePost}
                onRequestRemove={handleRemovePost}
                layout="cardHeader"
              />
            </View>

            <Text className="text-2xl mb-3" style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}>
              {post.title}
            </Text>

            <Text className="mb-4 leading-6" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
              {post.body}
            </Text>

            <View className="flex-row items-center justify-between pt-4 border-t" style={{ borderColor: BORDER_SOFT }}>
              <View>
                {post.authorId ? (
                  <Pressable onPress={() => navigation.navigate("MyCampsite", { userId: post.authorId })}>
                    <Text className="text-xs" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST, textDecorationLine: "underline" }}>
                      Posted by {authorName || "Anonymous"}
                    </Text>
                  </Pressable>
                ) : (
                  <Text className="text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
                    Posted by {authorName || "Anonymous"}
                  </Text>
                )}
                <Text className="text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
                  {formatTimeAgo(post.createdAt)}
                </Text>
              </View>

              <VotePill
                collectionPath="feedbackPosts"
                itemId={postId}
                initialScore={post.score || (post.upvoteCount || 0) - (post.downvoteCount || 0)}
                onRequireAccount={() => setShowAccountRequired(true)}
                onRequirePro={(variant) => navigation.navigate("Paywall", { triggerKey: "feedback_vote", variant })}
              />
            </View>
          </View>

          {/* Comments Section */}
          <View className="mx-5 mt-6">
            <Text className="text-xl mb-4" style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}>
              {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
            </Text>

            {comments.length === 0 ? (
              <View className="rounded-xl p-6 items-center border" style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}>
                <Ionicons name="chatbubbles-outline" size={48} color={TEXT_MUTED} />
                <Text className="mt-3 text-center" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
                  No comments yet. Share your thoughts!
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {comments.map((comment) => (
                  <View
                    key={comment.id}
                    className="rounded-xl p-4 border"
                    style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
                  >
                    <View className="flex-row items-start justify-between mb-2">
                      <Text className="flex-1 leading-6" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
                        {comment.body}
                      </Text>
                      <ContentActionsAffordance
                        itemId={comment.id}
                        itemType="comment"
                        createdByUserId={comment.authorId}
                        currentUserId={currentUser?.id}
                        canModerate={canModerate}
                        roleLabel={roleLabel}
                        onRequestDelete={async () => {
                          setComments(prev => prev.filter(c => c.id !== comment.id));
                        }}
                        onRequestRemove={async () => {
                          setComments(prev => prev.filter(c => c.id !== comment.id));
                        }}
                        layout="commentRow"
                        iconSize={16}
                      />
                    </View>

                    <Text className="text-xs" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
                      {formatTimeAgo(comment.createdAt)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Comment Input - Visible to everyone but gated behind Pro */}
          <View className="mx-5 mt-6 mb-5">
            <Text className="text-lg mb-3" style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}>
              Add comment
            </Text>
            <View className="rounded-xl border" style={{ backgroundColor: "white", borderColor: BORDER_SOFT }}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder={currentUser ? "Share your thoughts..." : "Upgrade to Pro to comment..."}
                placeholderTextColor={TEXT_MUTED}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="p-4"
                style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_PRIMARY_STRONG, minHeight: 100 }}
              />
              <View className="flex-row justify-end p-3 border-t" style={{ borderColor: BORDER_SOFT }}>
                <Pressable
                  onPress={handleSubmitComment}
                  disabled={!commentText.trim() || submitting}
                  className="px-6 py-3 rounded-xl active:opacity-90"
                  style={{
                    backgroundColor: commentText.trim() && !submitting ? DEEP_FOREST : "#d1d5db",
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
                      Post Comment
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AccountRequiredModal
        visible={showAccountRequired}
        onCreateAccount={() => {
          setShowAccountRequired(false);
          navigation.navigate("Auth");
        }}
        onMaybeLater={() => setShowAccountRequired(false)}
      />
    </View>
  );
}
