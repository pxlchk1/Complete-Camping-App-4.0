/**
 * Learning Track Badge Image Registry
 *
 * Single source of truth for all learning track badge images.
 * Maps BadgeId to the corresponding PNG asset.
 *
 * @note These are LEARNING TRACK badges, NOT merit badges.
 * Do not connect to merit badge claims, photo uploads, or witnesses.
 *
 * Static require() calls for Metro bundler compatibility.
 */

import { ImageSourcePropType } from "react-native";
import { BadgeId } from "../../../types/learning";

/**
 * Static mapping of learning track badge images
 */
export const learningTrackBadgeImages: Record<BadgeId, ImageSourcePropType> = {
  "leave-no-trace": require("./learning-track/learning-track-leave-no-trace.png"),
  "weekend-camper": require("./learning-track/learning-track-weekend-camper.png"),
  "trail-leader": require("./learning-track/learning-track-trail-master.png"),
  "backcountry-guide": require("./learning-track/learning-track-backcountry-guide.png"),
};

/**
 * Get the image source for a learning track badge
 * @param badgeId - The learning track badge ID
 * @returns The image source for the badge, or undefined if not found
 */
export function getLearningTrackBadgeImage(badgeId: BadgeId): ImageSourcePropType | undefined {
  return learningTrackBadgeImages[badgeId];
}

/**
 * Check if a badge ID is a learning track badge
 * @param badgeId - Badge ID to check
 * @returns true if this is a learning track badge
 */
export function isLearningTrackBadge(badgeId: string): badgeId is BadgeId {
  return badgeId in learningTrackBadgeImages;
}

/**
 * All learning track badge IDs
 */
export const LEARNING_TRACK_BADGE_IDS: BadgeId[] = [
  "leave-no-trace",
  "weekend-camper",
  "trail-leader",
  "backcountry-guide",
];
