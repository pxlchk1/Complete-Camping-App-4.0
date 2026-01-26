/**
 * Tips List Screen
 * Uses tipsService for Firestore queries
 * 
 * Connect-only actions: Edit/Delete for owners, Remove for admins/mods
 */

import React, { useState, useEffect } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator, TextInput, Alert } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { tipsService, TipPost } from "../../services/firestore/tipsService";
import { deleteTip } from "../../services/connectDeletionService";
import { tipVotesService } from "../../services/firestore/tipVotesService";
import { auth } from "../../config/firebase";
import AccountRequiredModal from "../../components/AccountRequiredModal";
import OnboardingModal from "../../components/OnboardingModal";
import { useScreenOnboarding } from "../../hooks/useScreenOnboarding";
import { requireAccount } from "../../utils/gating";
import { shouldShowInFeed } from "../../services/moderationService";
import { isAdmin, isModerator, canModerateContent, getUser } from "../../services/userService";
import { useCurrentUser } from "../../state/userStore";
import { User } from "../../types/user";
import { ContentActionsAffordance } from "../../components/contentActions";
import { RootStackNavigationProp } from "../../navigation/types";
import CommunitySectionHeader from "../../components/CommunitySectionHeader";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../../constants/colors";


type SortOption = "newest" | "my";

interface TipWithVotes extends TipPost {
  voteScore: number;
  userVote: "up" | "down" | null;
}

export default function TipsListScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const currentAuthUser = auth.currentUser;
  const currentUser = useCurrentUser();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Onboarding modal
  const { showModal, currentTooltip, dismissModal, openModal } = useScreenOnboarding("Tips");

  // Connect-only actions: Permission checks for content actions
  const canModerate = currentUser ? canModerateContent(currentUser as User) : false;
  const roleLabel = currentUser 
    ? isAdmin(currentUser as User) 
      ? "ADMIN" as const
      : isModerator(currentUser as User) 
        ? "MOD" as const 
        : null 
    : null;

  const [tips, setTips] = useState<TipWithVotes[]>([]);
  const [authorHandles, setAuthorHandles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");

  const loadTips = async () => {
    try {
      setLoading(true);
      setError(null);

      let allTips: TipPost[];

      if (sortBy === "my" && currentAuthUser) {
        // Filter tips by current user
        const allTipsData = await tipsService.getTips();
        allTips = allTipsData.filter(tip => tip.userId === currentAuthUser.uid);
      } else {
        allTips = await tipsService.getTips();
      }

      // Fetch votes for each tip
      const tipsWithVotes: TipWithVotes[] = await Promise.all(
        allTips
          // Filter out hidden content (unless user is author)
          .filter(tip => shouldShowInFeed(tip, currentAuthUser?.uid))
          .map(async (tip) => {
          let voteScore = 0;
          let userVote: "up" | "down" | null = null;
          try {
            const summary = await tipVotesService.getVoteSummary(tip.id);
            voteScore = summary.score;
            if (currentAuthUser) {
              const vote = await tipVotesService.getUserVote(tip.id);
              userVote = vote?.voteType || null;
            }
          } catch (e) {
            // fallback to upvotes if error
            voteScore = tip.upvotes || 0;
          }
          return { ...tip, voteScore, userVote };
        })
      );
      setTips(tipsWithVotes);

      // Batch fetch author handles for tips with missing/Anonymous userName
      const authorIdsToFetch = [...new Set(
        tipsWithVotes
          .filter(tip => !tip.userName || tip.userName === 'Anonymous')
          .map(tip => tip.userId || tip.authorId)
          .filter(Boolean) as string[]
      )];

      if (authorIdsToFetch.length > 0) {
        const handleMap: Record<string, string> = {};
        await Promise.all(
          authorIdsToFetch.map(async (authorId) => {
            try {
              const author = await getUser(authorId);
              if (author) {
                handleMap[authorId] = author.handle || author.displayName || 'Anonymous';
              }
            } catch {
              // Silently ignore - will fallback to Anonymous
            }
          })
        );
        setAuthorHandles(prev => ({ ...prev, ...handleMap }));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load tips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTips();
  }, [sortBy]);

  useFocusEffect(
    React.useCallback(() => {
      loadTips();
    }, [sortBy])
  );

  const handleTipPress = (tipId: string) => {
    navigation.navigate("TipDetail", { tipId });
  };

  const handleCreateTip = () => {
    // Tips only require an account, not PRO
    const canProceed = requireAccount({
      openAccountModal: () => setShowLoginModal(true),
    });
    
    if (!canProceed) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("CreateTip");
  };

  const formatTimeAgo = (dateString: string | any) => {
    const now = new Date();
    const date = typeof dateString === "string" ? new Date(dateString) : dateString.toDate?.() || new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;

    return date.toLocaleDateString();
  };

  const filteredTips = searchQuery
    ? tips.filter(tip =>
        tip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tip.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tips;

  const handleVote = async (tipId: string, voteType: "up" | "down") => {
    // Voting requires an account (but NOT Pro)
    if (!requireAccount({
      openAccountModal: () => setShowLoginModal(true),
    })) {
      return;
    }
    
    try {
      await tipVotesService.vote(tipId, voteType);
      // Refresh just this tip's votes
      setTips((prev) =>
        prev.map((tip) =>
          tip.id === tipId
            ? { ...tip, userVote: voteType, voteScore: tip.voteScore + (voteType === "up" ? 1 : -1) }
            : tip
        )
      );
      // Optionally reload all votes for accuracy
      // await loadTips();
    } catch (e) {
      // TODO: show error toast
    }
  };

  const renderTip = ({ item }: { item: TipWithVotes }) => (
    <Pressable
      onPress={() => handleTipPress(item.id)}
      className="rounded-xl p-4 mb-3 border active:opacity-90"
      style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
    >
      {/* Connect-only actions: Card header with title and actions */}
      <View className="flex-row items-start justify-between mb-2">
        <Text
          className="text-lg flex-1 mr-2"
          style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
        >
          {item.title}
        </Text>
        <ContentActionsAffordance
          itemId={item.id}
          itemType="tip"
          createdByUserId={item.userId || item.authorId || ""}
          currentUserId={currentUser?.id}
          canModerate={canModerate}
          roleLabel={roleLabel}
          onRequestEdit={() => {
            // Navigate to edit screen (if implemented)
            navigation.navigate("TipDetail", { tipId: item.id });
          }}
          onRequestDelete={async () => {
            const result = await deleteTip(item.id);
            if (result.success) {
              setTips(prev => prev.filter(t => t.id !== item.id));
            } else {
              Alert.alert("Error", result.error?.message || "Failed to delete tip");
            }
          }}
          onRequestRemove={async () => {
            const result = await deleteTip(item.id);
            if (result.success) {
              setTips(prev => prev.filter(t => t.id !== item.id));
            } else {
              Alert.alert("Error", result.error?.message || "Failed to remove tip");
            }
          }}
          layout="cardHeader"
          iconSize={18}
        />
      </View>
      <Text
        className="mb-3"
        numberOfLines={2}
        style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
      >
        {item.content}
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
        <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 12, color: TEXT_MUTED }}>
          @{authorHandles[item.userId || item.authorId || ''] || item.userName || 'Anonymous'}
        </Text>
        <Text style={{ marginHorizontal: 6, opacity: 0.7, color: TEXT_MUTED }}>•</Text>
        <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: TEXT_MUTED }}>
          {formatTimeAgo(item.createdAt)}
        </Text>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-parchment">
        <ActivityIndicator size="large" color={DEEP_FOREST} />
        <Text
          className="mt-4"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
        >
          Loading tips...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-parchment px-5">
        <Ionicons name="alert-circle-outline" size={64} color={EARTH_GREEN} />
        <Text
          className="mt-4 text-center text-lg"
          style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
        >
          Failed to load tips
        </Text>
        <Text
          className="mt-2 text-center"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
        >
          {error}
        </Text>
        <Pressable
          onPress={() => loadTips()}
          className="mt-6 px-6 py-3 rounded-xl active:opacity-90"
          style={{ backgroundColor: DEEP_FOREST }}
        >
          <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-parchment">
      {/* Action Bar */}
      <CommunitySectionHeader
        title="Camping Tips"
        onAddPress={handleCreateTip}
        onInfoPress={openModal}
      />

      {/* Search and Filters */}
      <View className="px-5 py-3 border-b" style={{ borderColor: BORDER_SOFT }}>
        {/* Search */}
        <View className="flex-row items-center bg-white rounded-xl px-4 py-2 border mb-3" style={{ borderColor: BORDER_SOFT }}>
          <Ionicons name="search" size={18} color={TEXT_MUTED} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search tips"
            placeholderTextColor={TEXT_MUTED}
            className="flex-1 ml-2"
            style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_PRIMARY_STRONG }}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
            </Pressable>
          )}
        </View>

        {/* Filter Chips */}
        <View className="flex-row gap-2">
          {[
            { id: "newest" as SortOption, label: "Newest" },
            { id: "my" as SortOption, label: "My Tips" },
          ].map(option => (
            <Pressable
              key={option.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSortBy(option.id);
              }}
              className={`px-4 py-2 rounded-full ${
                sortBy === option.id ? "bg-forest" : "bg-white border"
              }`}
              style={sortBy !== option.id ? { borderColor: BORDER_SOFT } : undefined}
            >
              <Text
                className="text-sm"
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  color: sortBy === option.id ? PARCHMENT : TEXT_PRIMARY_STRONG
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* List */}
      {filteredTips.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="bulb-outline" size={64} color={GRANITE_GOLD} />
          <Text
            className="mt-4 text-xl text-center"
            style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
          >
            No tips yet
          </Text>
          <Text
            className="mt-2 text-center"
            style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
          >
            Be the first to share a helpful camping tip!
          </Text>
          <Pressable
            onPress={handleCreateTip}
            className="mt-6 px-6 py-3 rounded-xl active:opacity-90"
            style={{ backgroundColor: DEEP_FOREST }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}>
              Share Your First Tip
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredTips}
          renderItem={renderTip}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        />
      )}

      <AccountRequiredModal
        visible={showLoginModal}
        onCreateAccount={() => {
          setShowLoginModal(false);
          navigation.navigate("Auth");
        }}
        onMaybeLater={() => setShowLoginModal(false)}
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
