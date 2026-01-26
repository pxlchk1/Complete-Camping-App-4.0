/**
 * Admin Content Moderation Screen
 * Review content that has been flagged (3+ downvotes) or reported
 * Admins can approve (unhide) or remove content
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { db, auth } from "../config/firebase";
import { collection, query, where, getDocs, doc, deleteDoc, limit } from "firebase/firestore";
import ModalHeader from "../components/ModalHeader";
import { useToast } from "../components/ToastManager";
import { moderatorApprove } from "../services/moderationService";
import {
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  EARTH_GREEN,
  DEEP_FOREST,
} from "../constants/colors";

// Content types and their Firestore collections
const CONTENT_COLLECTIONS = [
  { type: "tip", collection: "tips", label: "Tips" },
  { type: "question", collection: "questions", label: "Questions" },
  { type: "feedback", collection: "feedbackPosts", label: "Feedback" },
  { type: "review", collection: "gearReviews", label: "Gear Reviews" },
  { type: "photo", collection: "stories", label: "Photos" },
  { type: "photoPost", collection: "photoPosts", label: "Photo Posts" },
];

interface FlaggedContent {
  id: string;
  type: string;
  collection: string;
  title: string;
  preview: string;
  authorId: string;
  hiddenReason?: string;
  hiddenAt?: any;
  createdAt?: any;
  parentId?: string; // For comments, the parent post ID
}

export default function AdminContentScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ visible: boolean; item: FlaggedContent | null; action: "approve" | "remove" }>({
    visible: false,
    item: null,
    action: "approve",
  });
  const { showSuccess, showError } = useToast();
  const currentUserId = auth.currentUser?.uid;

  const loadFlaggedContent = useCallback(async () => {
    try {
      const allFlagged: FlaggedContent[] = [];

      // Query each content collection for items needing review
      for (const { type, collection: collName } of CONTENT_COLLECTIONS) {
        try {
          const collRef = collection(db, collName);
          const q = query(
            collRef,
            where("needsReview", "==", true),
            limit(20)
          );

          const snapshot = await getDocs(q);
          
          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            allFlagged.push({
              id: docSnap.id,
              type,
              collection: collName,
              title: getContentTitle(data, type),
              preview: getContentPreview(data, type),
              authorId: data.authorId || data.userId || data.ownerUid || "Unknown",
              hiddenReason: data.hiddenReason,
              hiddenAt: data.hiddenAt,
              createdAt: data.createdAt,
            });
          });
        } catch (collError: any) {
          // Skip collections that don't have the needsReview field or have index issues
          console.log(`[AdminContent] Skipping ${collName}:`, collError?.message?.slice(0, 50));
        }
      }

      // Also query for flagged comments in photoPosts
      try {
        const photoPostsRef = collection(db, "photoPosts");
        const photoPostsSnapshot = await getDocs(query(photoPostsRef, limit(100)));
        
        for (const postDoc of photoPostsSnapshot.docs) {
          const commentsRef = collection(db, "photoPosts", postDoc.id, "comments");
          const flaggedCommentsQuery = query(
            commentsRef,
            where("needsReview", "==", true),
            limit(20)
          );
          
          try {
            const commentsSnapshot = await getDocs(flaggedCommentsQuery);
            commentsSnapshot.docs.forEach((commentDoc) => {
              const data = commentDoc.data();
              allFlagged.push({
                id: commentDoc.id,
                type: "comment",
                collection: `photoPosts/${postDoc.id}/comments`,
                title: `Comment by @${data.userHandle || data.username || "Unknown"}`,
                preview: data.text?.slice(0, 100) || "",
                authorId: data.userId || "Unknown",
                hiddenReason: data.hiddenReason,
                hiddenAt: data.hiddenAt,
                createdAt: data.createdAt,
                parentId: postDoc.id,
              });
            });
          } catch (commentError) {
            // Skip if no index or other issue
          }
        }
      } catch (photoPostsError: any) {
        console.log(`[AdminContent] Error querying photo comments:`, photoPostsError?.message?.slice(0, 50));
      }

      // Sort by hiddenAt (most recent first)
      allFlagged.sort((a, b) => {
        const aTime = a.hiddenAt?.toMillis?.() || 0;
        const bTime = b.hiddenAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setFlaggedContent(allFlagged);
    } catch (error: any) {
      console.error("[AdminContent] Error loading flagged content:", error);
      setFlaggedContent([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFlaggedContent();
  }, [loadFlaggedContent]);

  // Extract title from content data
  const getContentTitle = (data: any, type: string): string => {
    switch (type) {
      case "tip":
        return data.title || "Untitled Tip";
      case "question":
        return data.title || data.question || "Untitled Question";
      case "feedback":
        return data.title || "Untitled Feedback";
      case "review":
        return data.productName || data.title || "Untitled Review";
      case "photo":
      case "photoPost":
        return data.caption?.slice(0, 50) || "Photo";
      case "comment":
        return `Comment by @${data.userHandle || data.username || "Unknown"}`;
      default:
        return "Content";
    }
  };

  // Extract preview text from content data
  const getContentPreview = (data: any, type: string): string => {
    switch (type) {
      case "tip":
        return data.content?.slice(0, 100) || "";
      case "question":
        return data.body?.slice(0, 100) || data.details?.slice(0, 100) || "";
      case "feedback":
        return data.body?.slice(0, 100) || data.description?.slice(0, 100) || "";
      case "review":
        return data.review?.slice(0, 100) || data.content?.slice(0, 100) || "";
      case "photo":
      case "photoPost":
        return data.caption || "";
      case "comment":
        return data.text?.slice(0, 100) || "";
      default:
        return "";
    }
  };

  const getReasonLabel = (reason?: string): string => {
    switch (reason) {
      case "AUTO_DOWNVOTE_THRESHOLD":
        return "3+ downvotes";
      case "REPORTED":
        return "Reported by user";
      case "MANUAL_MODERATOR":
        return "Hidden by moderator";
      default:
        return reason || "Flagged";
    }
  };

  const getTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case "tip":
        return "bulb-outline";
      case "question":
        return "help-circle-outline";
      case "feedback":
        return "chatbubble-ellipses-outline";
      case "review":
        return "star-outline";
      case "photo":
      case "photoPost":
        return "image-outline";
      case "comment":
        return "chatbubble-outline";
      default:
        return "document-outline";
    }
  };

  const handleApprove = async (item: FlaggedContent) => {
    if (!currentUserId) return;
    
    setActionLoading(item.id);
    setConfirmModal({ visible: false, item: null, action: "approve" });

    try {
      await moderatorApprove(item.collection, item.id, currentUserId, "Approved by admin");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFlaggedContent((prev) => prev.filter((c) => c.id !== item.id));
      showSuccess("Content approved and visible again");
    } catch (error: any) {
      console.error("[AdminContent] Error approving:", error);
      showError("Failed to approve content");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (item: FlaggedContent) => {
    if (!currentUserId) return;
    
    setActionLoading(item.id);
    setConfirmModal({ visible: false, item: null, action: "remove" });

    try {
      // Delete the content document
      await deleteDoc(doc(db, item.collection, item.id));
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFlaggedContent((prev) => prev.filter((c) => c.id !== item.id));
      showSuccess("Content removed");
    } catch (error: any) {
      console.error("[AdminContent] Error removing:", error);
      showError("Failed to remove content");
    } finally {
      setActionLoading(null);
    }
  };

  const showConfirmModal = (item: FlaggedContent, action: "approve" | "remove") => {
    setConfirmModal({ visible: true, item, action });
  };

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <ModalHeader title="Content Moderation" showTitle />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
          <Text className="mt-4" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
            Loading flagged content...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader title="Content Moderation" showTitle />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadFlaggedContent();
            }}
            tintColor={DEEP_FOREST}
          />
        }
      >
        <View className="px-5 pt-5 pb-8">
          {flaggedContent.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Ionicons name="checkmark-circle" size={64} color={EARTH_GREEN} />
              <Text
                className="mt-4 text-center"
                style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 18, color: TEXT_PRIMARY_STRONG }}
              >
                No Content to Review
              </Text>
              <Text
                className="mt-2 text-center px-8"
                style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY }}
              >
                There is no content needing moderation at this time. Content with 3+ downvotes or reports will appear here.
              </Text>
            </View>
          ) : (
            <>
              <Text
                className="mb-4"
                style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY }}
              >
                {flaggedContent.length} item{flaggedContent.length !== 1 ? "s" : ""} need{flaggedContent.length === 1 ? "s" : ""} review
              </Text>
              
              {flaggedContent.map((item) => {
                const isLoading = actionLoading === item.id;
                
                return (
                  <View
                    key={`${item.collection}-${item.id}`}
                    className="mb-4 p-4 rounded-xl border"
                    style={{ 
                      backgroundColor: CARD_BACKGROUND_LIGHT, 
                      borderColor: BORDER_SOFT,
                      opacity: isLoading ? 0.6 : 1,
                    }}
                  >
                    {/* Header with type icon and reason */}
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <View 
                          className="w-8 h-8 rounded-full items-center justify-center mr-2"
                          style={{ backgroundColor: "#FFF3E0" }}
                        >
                          <Ionicons name={getTypeIcon(item.type)} size={16} color="#FF6F00" />
                        </View>
                        <Text
                          className="text-xs uppercase tracking-wide"
                          style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_SECONDARY }}
                        >
                          {item.type}
                        </Text>
                      </View>
                      <View className="px-2 py-1 rounded-full" style={{ backgroundColor: "#FFEBEE" }}>
                        <Text
                          className="text-xs"
                          style={{ fontFamily: "SourceSans3_600SemiBold", color: "#C62828" }}
                        >
                          {getReasonLabel(item.hiddenReason)}
                        </Text>
                      </View>
                    </View>

                    {/* Title */}
                    <Text
                      className="text-base mb-1"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>

                    {/* Preview */}
                    {item.preview ? (
                      <Text
                        className="text-sm mb-3"
                        style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                        numberOfLines={2}
                      >
                        {item.preview}...
                      </Text>
                    ) : null}

                    {/* Author ID */}
                    <Text
                      className="text-xs mb-3"
                      style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                    >
                      Author: {item.authorId.slice(0, 12)}...
                    </Text>

                    {/* Action buttons */}
                    <View className="flex-row gap-3">
                      <Pressable
                        onPress={() => showConfirmModal(item, "approve")}
                        disabled={isLoading}
                        className="flex-1 p-3 rounded-xl items-center flex-row justify-center active:opacity-70"
                        style={{ backgroundColor: EARTH_GREEN }}
                      >
                        {isLoading ? (
                          <ActivityIndicator size="small" color={PARCHMENT} />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={18} color={PARCHMENT} />
                            <Text
                              className="ml-1"
                              style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: PARCHMENT }}
                            >
                              Approve
                            </Text>
                          </>
                        )}
                      </Pressable>
                      
                      <Pressable
                        onPress={() => showConfirmModal(item, "remove")}
                        disabled={isLoading}
                        className="flex-1 p-3 rounded-xl items-center flex-row justify-center active:opacity-70"
                        style={{ backgroundColor: "#D32F2F" }}
                      >
                        <Ionicons name="trash-outline" size={18} color={PARCHMENT} />
                        <Text
                          className="ml-1"
                          style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: PARCHMENT }}
                        >
                          Remove
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal({ visible: false, item: null, action: "approve" })}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View 
            className="w-full max-w-sm rounded-2xl p-5 border"
            style={{ backgroundColor: PARCHMENT, borderColor: BORDER_SOFT }}
          >
            <View className="flex-row items-center mb-4">
              <View 
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: confirmModal.action === "approve" ? "#E8F5E9" : "#FFEBEE" }}
              >
                <Ionicons 
                  name={confirmModal.action === "approve" ? "checkmark-circle" : "warning"} 
                  size={22} 
                  color={confirmModal.action === "approve" ? EARTH_GREEN : "#D32F2F"} 
                />
              </View>
              <Text className="text-lg font-semibold flex-1" style={{ fontFamily: "Raleway_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
                {confirmModal.action === "approve" ? "Approve this content?" : "Remove this content?"}
              </Text>
            </View>

            {confirmModal.item && (
              <View className="mb-4 p-3 rounded-xl" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
                <Text className="text-sm" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }} numberOfLines={2}>
                  {confirmModal.item.title}
                </Text>
                <Text className="text-xs mt-1" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
                  Type: {confirmModal.item.type}
                </Text>
              </View>
            )}

            <Text className="mb-5" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
              {confirmModal.action === "approve" 
                ? "This will make the content visible to all users again."
                : "This will permanently delete the content. This can't be undone."}
            </Text>

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setConfirmModal({ visible: false, item: null, action: "approve" })}
                className="flex-1 p-3 rounded-xl items-center border active:opacity-70"
                style={{ borderColor: BORDER_SOFT }}
              >
                <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: TEXT_PRIMARY_STRONG }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (confirmModal.item) {
                    if (confirmModal.action === "approve") {
                      handleApprove(confirmModal.item);
                    } else {
                      handleRemove(confirmModal.item);
                    }
                  }
                }}
                className="flex-1 p-3 rounded-xl items-center active:opacity-70"
                style={{ backgroundColor: confirmModal.action === "approve" ? EARTH_GREEN : "#D32F2F" }}
              >
                <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: PARCHMENT }}>
                  {confirmModal.action === "approve" ? "Approve" : "Remove"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
