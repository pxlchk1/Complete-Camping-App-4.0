// Gear review types

export type GearCategory =
  | "tents-shelters"
  | "sleep-systems"
  | "backpacks"
  | "cooking"
  | "clothing-footwear"
  | "lighting-power"
  | "safety"
  | "water"
  | "camp-comfort"
  | "navigation"
  | "other"
  | "all";

export type ActivityTag =
  | "backpacking"
  | "car-camping"
  | "winter-camping"
  | "bikepacking"
  | "kayaking"
  | "climbing";

export type AudienceTag = "beginner" | "intermediate" | "expert";

export type SortOption =
  | "newest"
  | "highest-rated"
  | "most-helpful"
  | "price-low"
  | "price-high";

export interface GearReview {
  id: string;
  gearName: string;
  manufacturer: string;
  category: GearCategory;
  overallRating: number;
  durabilityRating?: number;
  valueRating?: number;
  performanceRating?: number;
  title: string;
  reviewText: string;
  pros?: string[];
  cons?: string[];
  authorId: string;
  authorHandle: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
  helpfulCount: number;
  views: number;
  verifiedPurchase?: boolean;
  purchasePrice?: number;
  usageMonths?: number;
  activityTags?: ActivityTag[];
  audienceTag?: AudienceTag;
  photos?: string[];
  isHelpful?: boolean;
}

export interface GearReviewComment {
  id: string;
  reviewId: string;
  content: string;
  authorId: string;
  authorHandle: string;
  createdAt: string;
  upvotes: number;
}

export interface GearReviewFormData {
  gearName: string;
  manufacturer: string;
  category: GearCategory;
  overallRating: number;
  durabilityRating?: number;
  valueRating?: number;
  performanceRating?: number;
  title: string;
  reviewText: string;
  pros?: string[];
  cons?: string[];
  verifiedPurchase?: boolean;
  purchasePrice?: number;
  usageMonths?: number;
  activityTags?: ActivityTag[];
  audienceTag?: AudienceTag;
  photos?: string[];
}
