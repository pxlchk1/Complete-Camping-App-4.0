/**
 * Gear Review Detail Screen
 * Shows full gear review with rating, pros, cons, and upvote
 *
 * Fixes:
 * - Wraps all hooks and returns inside a real component function
 * - Removes corrupted JSX that was pasted into a style object
 * - Implements basic Firestore fetch, upvote, and reporting so the screen can ship
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import VotePill from "../../components/VotePill";

import ModalHeader from "../../components/ModalHeader";
import AccountRequiredModal from "../../components/AccountRequiredModal";
import { ContentActionsAffordance } from "../../components/contentActions";
import { deleteGearReview } from "../../services/connectDeletionService";
import { isAdmin, isModerator, canModerateContent } from "../../services/userService";
import { User } from "../../types/user";
import { useCurrentUser } from "../../state/userStore";
import { auth, db } from "../../config/firebase";

/** Fallback theme values (safe if your constants are not available here). */
const DEEP_FOREST = "#1F3B2C";
// const PARCHMENT = "#F7F1E4";
const TEXT_PRIMARY_STRONG = "#3D2817";
const TEXT_SECONDARY = "#6B5A4A";
const TEXT_MUTED = "#9CA3AF";
const BORDER_SOFT = "#E5E7EB";

type GearReview = {
  id: string;
  gearName: string;
  brand?: string;
  category?: string;
  summary?: string;
  reviewText?: string;
  rating: number;
  pros?: string[];
  cons?: string[];
  tags?: string[];
  upvoteCount: number;
  upvotes?: number;
  downvotes?: number;
  createdAt?: any;
  authorId?: string;
  authorHandle?: string | null;
  displayName?: string | null;
  photoUrls?: string[];
  productUrl?: string | null;
};

type RouteParams = {
  reviewId?: string;
};

export default function GearReviewDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const reviewId = (route?.params as RouteParams | undefined)?.reviewId;

  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<GearReview | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const currentUser = useCurrentUser();

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
  const handleEditReview = () => {
    if (!reviewId) return;
    navigation.navigate("EditGearReview", { reviewId });
  };

  const handleDeleteReview = async () => {
    if (!reviewId) return;
    Alert.alert(
      "Delete Review",
      "Are you sure you want to delete this review? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await deleteGearReview(reviewId);
            if (result.success) {
              Alert.alert("Success", "Review deleted successfully");
              navigation.goBack();
            } else {
              console.error("[GearReviewDetail] Delete failed:", result.error);
              Alert.alert(
                "Error",
                result.error?.message || "Failed to delete review"
              );
            }
          },
        },
      ]
    );
  };

  const handleRemoveReview = async () => {
    if (!reviewId) return;
    Alert.alert(
      "Remove Review",
      "Are you sure you want to remove this review? This moderation action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const result = await deleteGearReview(reviewId);
            if (result.success) {
              Alert.alert("Success", "Review removed successfully");
              navigation.goBack();
            } else {
              console.error("[GearReviewDetail] Remove failed:", result.error);
              Alert.alert(
                "Error",
                result.error?.message || "Failed to remove review"
              );
            }
          },
        },
      ]
    );
  };

  const loadReview = useCallback(async () => {
    if (!reviewId) {
      setLoading(false);
      setReview(null);
      return;
    }
    try {
      setLoading(true);
      const ref = doc(db, "gearReviews", String(reviewId));
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setReview(null);
        return;
      }
      const data = snap.data() as any;
      const normalized: GearReview = {
        id: snap.id,
        gearName: data.gearName ?? "",
        brand: data.brand ?? "",
        category: data.category ?? "",
        summary: data.summary ?? "",
        reviewText: data.reviewText ?? data.fullReview ?? data.body ?? "",
        rating: typeof data.rating === "number" ? data.rating : 0,
        pros: Array.isArray(data.pros) ? data.pros : [],
        cons: Array.isArray(data.cons) ? data.cons : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        upvoteCount: typeof data.upvoteCount === "number" ? data.upvoteCount : 0,
        upvotes: data.upvotes || 0,
        downvotes: data.downvotes || 0,
        createdAt: data.createdAt,
        authorId: data.authorId,
        authorHandle: data.authorHandle ?? null,
        displayName: data.displayName ?? data.authorName ?? null,
        photoUrls: Array.isArray(data.photoUrls) ? data.photoUrls : [],
        productUrl: data.productUrl ?? null,
      };
      setReview(normalized);
    } catch {
      Alert.alert("Error", "Failed to load review");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [navigation, reviewId]);

  // Reload when screen comes into focus (e.g., returning from edit)
  useFocusEffect(
    useCallback(() => {
      loadReview();
    }, [loadReview])
  );

  const requireAuthOrShowModal = () => {
    const uid = auth?.currentUser?.uid;
    if (!uid) {
      setShowLoginModal(true);
      return false;
    }
    return true;
  };

  const handleReport = () => {
    if (!requireAuthOrShowModal()) return;
    if (!reviewId) return;

    Alert.alert("Report review", "Why are you reporting this review?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: async () => {
          try {
            const uid = auth?.currentUser?.uid;
            if (!uid) return;

            const reportRef = doc(db, "reports", `${String(reviewId)}_${Date.now()}`);
            await setDoc(reportRef, {
              targetType: "gearReview",
              targetId: String(reviewId),
              reason: "User reported inappropriate content",
              reporterId: uid,
              createdAt: serverTimestamp(),
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            Alert.alert("Success", "Thank you for your report");
          } catch {
            Alert.alert("Error", "Failed to submit report");
          }
        },
      },
    ]);
  };

  const renderStars = (rating: number) => {
    const stars: React.ReactElement[] = [];
    const safeRating = Math.max(0, Math.min(5, Math.round(rating)));
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= safeRating ? "star" : "star-outline"}
          size={20}
          color="#F59E0B"
        />
      );
    }
    return <View className="flex-row">{stars}</View>;
  };

  if (loading) {
    return (
      <View className="flex-1 bg-parchment">
        <ModalHeader title="Review" showTitle />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
        </View>
      </View>
    );
  }

  if (!review) {
    return (
      <View className="flex-1 bg-parchment">
        <ModalHeader title="Review" showTitle />
        <View className="flex-1 items-center justify-center px-6">
          <Text
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              color: TEXT_PRIMARY_STRONG,
              textAlign: "center",
            }}
          >
            Review not found.
          </Text>
        </View>

        <AccountRequiredModal
          visible={showLoginModal}
          onCreateAccount={() => {
            setShowLoginModal(false);
            navigation.navigate("Auth");
          }}
          onMaybeLater={() => setShowLoginModal(false)}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-parchment">
      <ModalHeader
        title="Review"
        showTitle
        rightAction={{ icon: "flag-outline", onPress: handleReport }}
      />

      <ScrollView className="flex-1 p-5">
        {/* Gear Name and Brand with Actions */}
        <View className="flex-row items-start justify-between mb-2">
          <Text
            className="text-2xl flex-1"
            style={{
              fontFamily: "Raleway_700Bold",
              color: TEXT_PRIMARY_STRONG,
            }}
          >
            {review.gearName}
          </Text>
          <ContentActionsAffordance
            itemId={reviewId || ""}
            itemType="review"
            createdByUserId={review.authorId || ""}
            currentUserId={currentUser?.id}
            canModerate={canModerate}
            roleLabel={roleLabel}
            onRequestEdit={handleEditReview}
            onRequestDelete={handleDeleteReview}
            onRequestRemove={handleRemoveReview}
            layout="cardHeader"
          />
        </View>

        {!!review.brand && (
          <Text
            className="text-lg mb-3"
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              color: TEXT_SECONDARY,
            }}
          >
            {review.brand}
          </Text>
        )}

        {/* Rating */}
        <View className="flex-row items-center mb-4">
          {renderStars(review.rating)}
          <Text
            className="ml-2"
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              color: TEXT_PRIMARY_STRONG,
            }}
          >
            {(review.rating ?? 0).toFixed(1)} / 5.0
          </Text>
        </View>

        {/* Category Badge */}
        {!!review.category && (
          <View className="mb-4">
            <View
              className="px-3 py-1 rounded-full self-start"
              style={{ backgroundColor: "#E0F2F1" }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  color: "#00695C",
                  textTransform: "capitalize",
                }}
              >
                {review.category}
              </Text>
            </View>
          </View>
        )}

        {/* Summary */}
        {!!review.summary && (
          <View
            className="mb-4 p-4 rounded-xl"
            style={{ backgroundColor: "#FEF3C7" }}
          >
            <Text
              className="text-base"
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                color: "#92400E",
                lineHeight: 22,
              }}
            >
              {review.summary}
            </Text>
          </View>
        )}

        {/* Photos */}
        {review.photoUrls && review.photoUrls.length > 0 && (
          <View className="mb-4">
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {review.photoUrls.map((url, index) => (
                <Image
                  key={index}
                  source={{ uri: url }}
                  style={{
                    width: 200,
                    height: 150,
                    borderRadius: 12,
                    backgroundColor: "#E5E7EB",
                  }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Product Link */}
        {!!review.productUrl && (
          <Pressable
            onPress={() => {
              if (review.productUrl) {
                // Normalize URL: add https:// if no scheme is present
                let urlToOpen = review.productUrl.trim();
                if (urlToOpen && !urlToOpen.match(/^https?:\/\//i)) {
                  urlToOpen = `https://${urlToOpen}`;
                }
                Linking.openURL(urlToOpen).catch((err) => {
                  console.error("[GearReviewDetail] Failed to open URL:", urlToOpen, err);
                  Alert.alert("Error", "Could not open link. Please check the URL is valid.");
                });
              }
            }}
            className="mb-4 flex-row items-center p-3 rounded-xl"
            style={{ backgroundColor: "#EFF6FF" }}
          >
            <Ionicons name="link-outline" size={18} color="#2563EB" />
            <Text
              className="ml-2 flex-1"
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                color: "#2563EB",
              }}
              numberOfLines={1}
            >
              View Product
            </Text>
            <Ionicons name="open-outline" size={16} color="#2563EB" />
          </Pressable>
        )}

        {/* Pros / Cons */}
        {(review.pros?.length || review.cons?.length) ? (
          <View className="mb-4">
            {!!review.pros?.length && (
              <View className="mb-3">
                <Text
                  className="text-lg mb-2"
                  style={{
                    fontFamily: "Raleway_700Bold",
                    color: TEXT_PRIMARY_STRONG,
                  }}
                >
                  Pros
                </Text>
                {(review.pros ?? []).map((p, idx) => (
                  <View key={`pro_${idx}`} className="flex-row mb-1">
                    <Text style={{ color: TEXT_PRIMARY_STRONG }}>• </Text>
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        color: TEXT_PRIMARY_STRONG,
                        lineHeight: 22,
                        flex: 1,
                      }}
                    >
                      {String(p)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {!!review.cons?.length && (
              <View>
                <Text
                  className="text-lg mb-2"
                  style={{
                    fontFamily: "Raleway_700Bold",
                    color: TEXT_PRIMARY_STRONG,
                  }}
                >
                  Cons
                </Text>
                {(review.cons ?? []).map((c, idx) => (
                  <View key={`con_${idx}`} className="flex-row mb-1">
                    <Text style={{ color: TEXT_PRIMARY_STRONG }}>• </Text>
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        color: TEXT_PRIMARY_STRONG,
                        lineHeight: 22,
                        flex: 1,
                      }}
                    >
                      {String(c)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* Full Review Body (only if present) */}
        {!!review.reviewText?.trim() && (
          <View className="mb-4">
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
                lineHeight: 22,
              }}
            >
              {review.reviewText}
            </Text>
          </View>
        )}

        {/* Tags - tappable capsules at the bottom */}
        {review.tags && review.tags.length > 0 && (
          <View className="mb-4">
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {review.tags.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate("GearReviewsListScreen", { filterByTag: tag });
                  }}
                  className="px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: "#F3F4F6" }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 13,
                      color: "#6B7280",
                    }}
                  >
                    {tag}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Author and Vote row */}
        <View className="flex-row items-center justify-between py-3 border-t" style={{ borderColor: BORDER_SOFT, marginBottom: 24 }}>
          {review.authorId && review.authorHandle ? (
            <Pressable onPress={() => navigation.navigate("MyCampsite", { userId: review.authorId })}>
              <Text className="text-sm" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST, textDecorationLine: "underline" }}>
                @{review.authorHandle}
              </Text>
            </Pressable>
          ) : review.authorId ? (
            <Pressable onPress={() => navigation.navigate("MyCampsite", { userId: review.authorId })}>
              <Text className="text-sm" style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST, textDecorationLine: "underline" }}>
                {review.displayName || "View Profile"}
              </Text>
            </Pressable>
          ) : (
            <Text className="text-sm" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}>
              Anonymous
            </Text>
          )}
          <VotePill
            collectionPath="gearReviews"
            itemId={reviewId!}
            initialScore={(review.upvotes || 0) - (review.downvotes || 0)}
            onRequireAccount={() => setShowLoginModal(true)}
          />
        </View>
      </ScrollView>

      <AccountRequiredModal
        visible={showLoginModal}
        onCreateAccount={() => {
          setShowLoginModal(false);
          navigation.navigate("Auth");
        }}
        onMaybeLater={() => setShowLoginModal(false)}
      />
    </View>
  );
}
