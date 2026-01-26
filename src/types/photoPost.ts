/**
 * Photo Post Types
 * Enhanced photo posts with post types, tags, and structured fields
 */

import { Timestamp } from "firebase/firestore";

// ==================== Post Types ====================

export type PhotoPostType =
  | "campsite-spotlight"
  | "conditions-report"
  | "setup-ideas"
  | "gear-in-real-life"
  | "camp-cooking"
  | "wildlife-nature"
  | "accessibility";

// Map legacy tip-or-fix posts to setup-ideas for display
export const mapLegacyPostType = (postType: string): PhotoPostType => {
  if (postType === "tip-or-fix") return "setup-ideas";
  return postType as PhotoPostType;
};

export const POST_TYPE_LABELS: Record<PhotoPostType, string> = {
  "campsite-spotlight": "Campsite Spotlight",
  "conditions-report": "Conditions Report",
  "setup-ideas": "Setup Ideas",
  "gear-in-real-life": "Gear in Real Life",
  "camp-cooking": "Camp Cooking",
  "wildlife-nature": "Wildlife & Nature",
  "accessibility": "Accessibility",
};

export const POST_TYPE_ICONS: Record<PhotoPostType, string> = {
  "campsite-spotlight": "location",
  "conditions-report": "cloudy-night",
  "setup-ideas": "construct",
  "gear-in-real-life": "backpack",
  "camp-cooking": "flame",
  "wildlife-nature": "leaf",
  "accessibility": "accessibility",
};

export const POST_TYPE_COLORS: Record<PhotoPostType, string> = {
  "campsite-spotlight": "#2563eb", // blue
  "conditions-report": "#7c3aed", // violet
  "setup-ideas": "#16a34a", // green
  "gear-in-real-life": "#ea580c", // orange
  "camp-cooking": "#dc2626", // red
  "wildlife-nature": "#059669", // emerald
  "accessibility": "#0891b2", // cyan
};

// ==================== Trip Styles ====================

export type TripStyle =
  | "car-camping"
  | "tent-camping"
  | "backpacking"
  | "hiking"
  | "rv-trailer"
  | "group-camping"
  | "solo-camping"
  | "family-camping"
  | "winter-camping";

export const TRIP_STYLE_LABELS: Record<TripStyle, string> = {
  "car-camping": "Car camping",
  "tent-camping": "Tent camping",
  "backpacking": "Backpacking",
  "hiking": "Hiking",
  "rv-trailer": "RV or trailer",
  "group-camping": "Group camping",
  "solo-camping": "Solo camping",
  "family-camping": "Family camping",
  "winter-camping": "Winter camping",
};

// ==================== Detail Tags ====================

export type DetailTag =
  | "shade"
  | "privacy"
  | "flat-ground"
  | "windy"
  | "bugs"
  | "mud"
  | "snow"
  | "rain"
  | "quiet"
  | "near-bathrooms"
  | "near-water"
  | "scenic-view"
  | "pet-friendly"
  | "kid-friendly"
  | "accessible";

export const DETAIL_TAG_LABELS: Record<DetailTag, string> = {
  "shade": "Shade",
  "privacy": "Privacy",
  "flat-ground": "Flat ground",
  "windy": "Windy",
  "bugs": "Bugs",
  "mud": "Mud",
  "snow": "Snow",
  "rain": "Rain",
  "quiet": "Quiet",
  "near-bathrooms": "Near bathrooms",
  "near-water": "Near water",
  "scenic-view": "Scenic view",
  "pet-friendly": "Pet friendly",
  "kid-friendly": "Kid friendly",
  "accessible": "Accessible",
};

// ==================== Caption Placeholder Templates ====================

export const CAPTION_TEMPLATES: Record<PhotoPostType, string> = {
  "campsite-spotlight": `Campground:
Campsite:
Best for:
Ground:
Shade:
Privacy:
Notes:`,
  "conditions-report": `Today it's:
What surprised me:
What I wish I packed:`,
  "gear-in-real-life": `Gear:
Worked great because:
Didn't work because:
One tip:`,
  "setup-ideas": `What you're looking at:
Why it works:
What I'd do differently:`,
  "camp-cooking": `What I made:
Stove setup:
Prep notes:
Would I make it again:`,
  "wildlife-nature": `What I spotted:
Where:
Tips for seeing this:`,
  "accessibility": `Terrain:
Path to site/bathroom:
Pad situation:
Notes for mobility needs:`,
};

// ==================== Photo Post Document ====================

export interface PhotoPost {
  id: string;
  userId: string;
  displayName?: string;
  userHandle?: string;
  photoUrls: string[];
  storagePaths?: string[];
  postType: PhotoPostType;
  caption: string;
  createdAt: Timestamp | string;
  updatedAt?: Timestamp | string;

  // Campground/Campsite (for Campsite Spotlight)
  campgroundId?: string;
  campgroundName?: string;
  parkId?: string;
  parkName?: string;
  campsiteNumber?: string;
  hideCampsiteNumber?: boolean; // Hide exact site from public

  // Tags
  tripStyle?: TripStyle;
  detailTags?: DetailTag[];

  // Engagement
  helpfulCount: number;
  voteCount?: number; // Reddit-style upvote/downvote score
  saveCount?: number;
  commentCount?: number;

  // Location (for "Near Me" filtering)
  location?: {
    latitude: number;
    longitude: number;
  };

  // Moderation
  isHidden?: boolean;
  needsReview?: boolean;

  // Legacy support - if migrated from old system
  legacyTags?: string[];
}

// ==================== Helpful Reaction ====================

export interface PhotoPostHelpful {
  userId: string;
  createdAt: Timestamp | string;
}

// ==================== Feed Filters ====================

export interface PhotoFeedFilters {
  postType?: PhotoPostType;
  tripStyle?: TripStyle;
  detailTags?: DetailTag[];
  campgroundId?: string;
  state?: string;
  nearLocation?: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
  sortBy: "newest" | "most-helpful" | "near-me";
}

// ==================== Quick Post Tile ====================

export interface QuickPostTile {
  postType: PhotoPostType;
  label: string;
  icon: string;
  color: string;
}

// Primary 4 categories for the 2x2 grid on Photos page
export const PRIMARY_PHOTO_TILES: QuickPostTile[] = [
  {
    postType: "campsite-spotlight",
    label: "Campsite Spotlight",
    icon: "location",
    color: POST_TYPE_COLORS["campsite-spotlight"],
  },
  {
    postType: "conditions-report",
    label: "Conditions Report",
    icon: "cloudy-night",
    color: POST_TYPE_COLORS["conditions-report"],
  },
  {
    postType: "setup-ideas",
    label: "Setup Ideas",
    icon: "construct",
    color: POST_TYPE_COLORS["setup-ideas"],
  },
  {
    postType: "gear-in-real-life",
    label: "Gear in Real Life",
    icon: "backpack",
    color: POST_TYPE_COLORS["gear-in-real-life"],
  },
];

// All available post types for the composer (excludes tip-or-fix)
export const QUICK_POST_TILES: QuickPostTile[] = [
  ...PRIMARY_PHOTO_TILES,
  {
    postType: "camp-cooking",
    label: "Camp Cooking",
    icon: "flame",
    color: POST_TYPE_COLORS["camp-cooking"],
  },
  {
    postType: "wildlife-nature",
    label: "Wildlife & Nature",
    icon: "leaf",
    color: POST_TYPE_COLORS["wildlife-nature"],
  },
  {
    postType: "accessibility",
    label: "Accessibility",
    icon: "accessibility",
    color: POST_TYPE_COLORS["accessibility"],
  },
];
