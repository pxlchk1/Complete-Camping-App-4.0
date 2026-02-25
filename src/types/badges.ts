/**
 * Merit Badges Type Definitions
 * 
 * Data model for the Merit Badges feature including:
 * - Badge definitions (static catalog)
 * - Badge claims (witness flow)
 * - User badges (earned collection)
 */

import { Timestamp } from "firebase/firestore";

// ============================================
// ENUMS
// ============================================

export type BadgeEarnType = "SELF" | "PHOTO_REQUIRED" | "WITNESS_REQUIRED";

export type BadgeClaimStatus = "DRAFT" | "PENDING_STAMP" | "APPROVED" | "NOT_THIS_TIME";

export type BadgeEarnedVia = "SELF" | "PHOTO" | "STAMP";

export type BadgeVisibility = "PRIVATE" | "PUBLIC";

export type BadgeCategoryId = 
  | "setup" 
  | "fire" 
  | "kitchen" 
  | "sleep" 
  | "nav" 
  | "safety" 
  | "nature" 
  | "seasonal";

export type SeasonId = "winter" | "spring" | "summer" | "fall";

// ============================================
// BADGE DEFINITIONS (Static Catalog)
// ============================================

export interface SeasonWindow {
  seasonId: SeasonId;
  startsAt: Timestamp | Date;
  endsAt: Timestamp | Date;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  categoryId: BadgeCategoryId;
  borderColorKey: string;
  iconAssetKey: string;
  earnType: BadgeEarnType;
  description: string;
  requirements: string[]; // 3-6 bullets for "How to Earn This"
  seasonWindow?: SeasonWindow;
  isLimitedEdition: boolean;
  limitedYear?: number;
  isActive: boolean;
  sortOrder: number;
}

// ============================================
// BADGE CLAIMS (Witness Flow)
// ============================================

export interface BadgeClaim {
  id: string;
  badgeId: string;
  claimantUserId: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  status: BadgeClaimStatus;
  witnessUserId: string;
  photoUrl?: string;
  caption?: string;
  approvedAt?: Timestamp | Date;
  decisionAt?: Timestamp | Date;
}

export interface CreateBadgeClaimData {
  badgeId: string;
  witnessUserId: string;
  photoUrl?: string;
  caption?: string;
}

export interface UpdateBadgeClaimData {
  photoUrl?: string;
  caption?: string;
}

// ============================================
// USER BADGES (Earned Collection)
// ============================================

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Timestamp | Date;
  earnedVia: BadgeEarnedVia;
  witnessUserId?: string;
  photoUrl?: string;
  caption?: string;
  visibility: BadgeVisibility;
}

export interface CreateUserBadgeData {
  badgeId: string;
  earnedVia: BadgeEarnedVia;
  witnessUserId?: string;
  photoUrl?: string;
  caption?: string;
  visibility?: BadgeVisibility;
}

// ============================================
// UI STATE TYPES
// ============================================

export type BadgeDisplayState = 
  | "locked" 
  | "not_started" 
  | "in_progress" 
  | "pending_stamp" 
  | "earned"
  | "seasonal_locked"
  | "seasonal_active";

export interface BadgeWithProgress extends BadgeDefinition {
  displayState: BadgeDisplayState;
  earnedBadge?: UserBadge;
  pendingClaim?: BadgeClaim;
  isSeasonallyAvailable: boolean;
}

export interface BadgeProgressStats {
  totalBadges: number;
  earnedBadges: number;
  percentComplete: number;
  coreEarned: number;
  coreTotal: number;
  seasonalEarned: number;
  seasonalTotal: number;
  limitedEarned: number;
}

export interface BadgeCategoryGroup {
  categoryId: BadgeCategoryId;
  categoryName: string;
  badges: BadgeWithProgress[];
}

// ============================================
// WITNESS REQUEST DISPLAY
// ============================================

export interface WitnessRequest {
  claim: BadgeClaim;
  badge: BadgeDefinition;
  claimantName: string;
  claimantAvatarUrl?: string;
}

// ============================================
// CATEGORY METADATA
// ============================================

export const BADGE_CATEGORIES: Record<BadgeCategoryId, { name: string; icon: string; sortOrder: number }> = {
  setup: { name: "Camp Setup & Shelter", icon: "home-outline", sortOrder: 1 },
  fire: { name: "Fire & Warmth", icon: "flame-outline", sortOrder: 2 },
  kitchen: { name: "Cooking & Camp Kitchen", icon: "restaurant-outline", sortOrder: 3 },
  sleep: { name: "Comfort & Sleep", icon: "moon-outline", sortOrder: 4 },
  nav: { name: "Navigation & Skills", icon: "compass-outline", sortOrder: 5 },
  safety: { name: "Safety & Readiness", icon: "medkit-outline", sortOrder: 6 },
  nature: { name: "Nature Nerd", icon: "leaf-outline", sortOrder: 7 },
  seasonal: { name: "Seasonal Collection", icon: "sunny-outline", sortOrder: 8 },
};

// ============================================
// BADGE COLOR PALETTE
// ============================================

export const BADGE_COLORS: Record<string, string> = {
  forest: "#2E7D32",
  amber: "#F59E0B",
  rust: "#B45309",
  sky: "#0EA5E9",
  sage: "#6B8E6B",
  slate: "#64748B",
  gold: "#D4A05A",
  crimson: "#DC2626",
  violet: "#7C3AED",
  teal: "#0D9488",
};
