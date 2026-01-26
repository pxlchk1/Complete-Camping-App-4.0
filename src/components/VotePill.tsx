/**
 * VotePill Component
 * A compact, horizontal inline voting control for list cards and detail screens.
 * Handles its own Firestore state and optimistic updates.
 * 
 * Usage:
 * <VotePill
 *   collectionPath="feedback"
 *   itemId={item.id}
 *   initialScore={item.upvotes - item.downvotes}
 *   initialUserVote={item.userVote}
 *   onRequireAccount={() => setShowAccountRequired(true)}
 * />
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { genericVotesService } from "../services/firestore/genericVotesService";
import { useCurrentUser, useUserStore } from "../state/userStore";
import { useSubscriptionStore } from "../state/subscriptionStore";
import { getPaywallVariantAndTrack, type PaywallVariant } from "../services/proAttemptService";
import { TEXT_MUTED } from "../constants/colors";

interface VotePillProps {
  collectionPath: string;
  itemId: string;
  initialScore?: number;
  initialUserVote?: "up" | "down" | null;
  onRequireAccount: () => void;
  /** Optional: If provided, voting requires Pro subscription. Receives variant for nudge paywall. */
  onRequirePro?: (variant?: PaywallVariant) => void;
  size?: "small" | "medium";
}

export default function VotePill({
  collectionPath,
  itemId,
  initialScore = 0,
  initialUserVote = null,
  onRequireAccount,
  onRequirePro,
  size = "medium",
}: VotePillProps) {
  const currentUser = useCurrentUser();
  const isPro = useSubscriptionStore((s) => s.isPro);
  const isAdmin = useUserStore((s) => s.isAdministrator());
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(initialUserVote);
  const [isVoting, setIsVoting] = useState(false);
  const [hasFetchedVote, setHasFetchedVote] = useState(false);

  // Fetch user's existing vote on mount (if logged in)
  useEffect(() => {
    if (currentUser && itemId && !hasFetchedVote) {
      genericVotesService.getUserVote(collectionPath, itemId)
        .then((vote) => {
          if (vote) {
            setUserVote(vote.voteType);
          }
          setHasFetchedVote(true);
        })
        .catch(() => {
          setHasFetchedVote(true);
        });
    }
  }, [currentUser, itemId, collectionPath, hasFetchedVote]);

  // Update score if initialScore changes (e.g., from parent refresh)
  useEffect(() => {
    setScore(initialScore);
  }, [initialScore]);

  const handleVote = useCallback(async (voteType: "up" | "down") => {
    // Check if user is logged in
    if (!currentUser) {
      onRequireAccount();
      return;
    }

    // If Pro is required for this collection, check subscription (admins bypass)
    if (onRequirePro && !isPro && !isAdmin) {
      // Track Pro attempt and get variant for nudge paywall
      const variant = await getPaywallVariantAndTrack(!!currentUser, isPro);
      onRequirePro(variant);
      return;
    }

    if (isVoting) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic update
    const prevScore = score;
    const prevVote = userVote;

    let newScore = score;
    let newVote: "up" | "down" | null = voteType;

    // Remove previous vote effect
    if (prevVote === "up") newScore--;
    if (prevVote === "down") newScore++;

    // Apply new vote or toggle off
    if (prevVote === voteType) {
      newVote = null;
    } else {
      if (voteType === "up") newScore++;
      if (voteType === "down") newScore--;
    }

    setScore(newScore);
    setUserVote(newVote);
    setIsVoting(true);

    try {
      const result = await genericVotesService.vote(collectionPath, itemId, voteType);
      // Sync with server response
      setScore(result.newScore);
      setUserVote(result.newUserVote);
    } catch (err) {
      // Revert on error
      setScore(prevScore);
      setUserVote(prevVote);
      console.warn("Vote failed:", err);
    } finally {
      setIsVoting(false);
    }
  }, [currentUser, isPro, isAdmin, isVoting, score, userVote, collectionPath, itemId, onRequireAccount, onRequirePro]);

  const iconSize = size === "small" ? 14 : 16;
  const fontSize = size === "small" ? 11 : 13;
  const paddingH = size === "small" ? 6 : 8;
  const paddingV = size === "small" ? 2 : 4;
  const gap = size === "small" ? 2 : 4;

  const upColor = userVote === "up" ? "#16a34a" : TEXT_MUTED;
  const downColor = userVote === "down" ? "#dc2626" : TEXT_MUTED;
  const scoreColor = score > 0 ? "#16a34a" : score < 0 ? "#dc2626" : TEXT_MUTED;

  return (
    <View style={[styles.container, { paddingHorizontal: paddingH, paddingVertical: paddingV }]}>
      <Pressable
        onPress={() => handleVote("up")}
        disabled={isVoting}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          isVoting && styles.buttonDisabled,
        ]}
      >
        <Ionicons
          name={userVote === "up" ? "arrow-up" : "arrow-up-outline"}
          size={iconSize}
          color={upColor}
        />
      </Pressable>

      <Text
        style={[
          styles.score,
          { fontSize, color: scoreColor, marginHorizontal: gap },
        ]}
      >
        {score}
      </Text>

      <Pressable
        onPress={() => handleVote("down")}
        disabled={isVoting}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          isVoting && styles.buttonDisabled,
        ]}
      >
        <Ionicons
          name={userVote === "down" ? "arrow-down" : "arrow-down-outline"}
          size={iconSize}
          color={downColor}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 12,
  },
  button: {
    padding: 2,
  },
  buttonPressed: {
    opacity: 0.6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  score: {
    fontFamily: "SourceSans3_600SemiBold",
    minWidth: 20,
    textAlign: "center",
  },
});
