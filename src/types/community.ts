/**
 * Community / Connect Firestore Types
 * Based on existing Firestore collections - DO NOT rename collections
 */

import { Timestamp } from "firebase/firestore";

// ==================== Tips ====================

export interface Tip {
  id: string;
  title: string;
  body: string;
  tags: string[];
  authorId: string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  upvoteCount: number;
  downvoteCount: number;
  score: number; // upvotes - downvotes
  commentCount: number;
  userVote?: "up" | "down" | null;
}

export interface TipComment {
  id: string;
  tipId: string;
  body: string;
  authorId: string;
  createdAt: Timestamp | string;
  upvoteCount?: number;
}

// ==================== Gear Reviews ====================

export type GearCategory =
  | "stove"
  | "tent"
  | "sleep"
  | "pack"
  | "clothing"
  | "lighting"
  | "misc"
  | "shelter"
  | "kitchen"
  | "water"
  | "safety";

export interface GearReview {
  id: string;
  gearName: string;
  brand?: string;
  category: GearCategory;
  rating: number; // 1-5
  summary: string; // Short one-line
  body: string; // Full review
  pros?: string;
  cons?: string;
  tags: string[];
  photoUrls?: string[]; // Up to 3 photos
  productUrl?: string; // Link to product
  authorId: string;
  authorHandle: string; // @handle of the author
  authorName?: string; // Display name of the author
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  upvoteCount: number;
  downvoteCount: number;
  score: number; // upvotes - downvotes
  commentCount: number;
  userVote?: "up" | "down" | null;
}

// ==================== Questions (Ask a Camper) ====================

export type QuestionStatus = "open" | "answered" | "closed";

export interface Question {
  id: string;
  title: string;
  body: string;
  content: string; // Alias for body (legacy support)
  tags: string[];
  authorId: string;
  authorHandle: string;
  authorName?: string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  status: QuestionStatus;
  answerCount: number;
  viewCount?: number;
  lastActivityAt: Timestamp | string;
  upvotes: number;
  downvotes: number;
  score: number; // upvotes - downvotes
  hasAcceptedAnswer: boolean;
  acceptedAnswerId?: string;
  userVote?: "up" | "down" | null;
}

export interface Answer {
  id: string;
  questionId: string;
  body: string;
  content: string; // Alias for body (legacy support)
  authorId: string;
  authorHandle: string;
  authorName?: string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  upvoteCount: number;
  downvoteCount: number;
  upvotes: number; // Alias for upvoteCount (legacy support)
  downvotes: number;
  score: number; // upvotes - downvotes
  isAccepted: boolean;
  userVote?: "up" | "down" | null;
}

export interface QAFilters {
  sortBy?: "new" | "unanswered" | "popular";
  category?: string;
}

// ==================== Stories (Photo Library) ====================

export interface Story {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  title?: string;
  caption: string;
  tags: string[];
  authorId: string;
  /** @deprecated Use authorId instead */
  userId?: string;
  authorHandle?: string;
  displayName?: string;
  createdAt: Timestamp | string;
  locationLabel?: string;
  locationName?: string;
  likeCount: number;
  commentCount: number;
  upvotes?: number;
  downvotes?: number;
}

export interface StoryComment {
  id: string;
  storyId: string;
  body: string;
  authorId: string;
  createdAt: Timestamp | string;
}

export interface StoryVote {
  id: string;
  storyId: string;
  voterId: string;
  value: 1 | -1; // Like or unlike
}

// ==================== Feedback ====================

export type FeedbackCategory = "feature" | "bug" | "improvement" | "question" | "other";
export type FeedbackStatus = "open" | "planned" | "in_progress" | "done" | "declined";

export interface FeedbackPost {
  id: string;
  title: string;
  body: string;
  category: FeedbackCategory;
  authorId: string;
  createdAt: Timestamp | string;
  status: FeedbackStatus;
  voteCount: number;
  upvoteCount: number;
  downvoteCount: number;
  score: number; // upvotes - downvotes
  commentCount: number;
  userVote?: "up" | "down" | null;
}

export interface FeedbackComment {
  id: string;
  feedbackId: string;
  body: string;
  authorId: string;
  createdAt: Timestamp | string;
}

// ==================== Content Reports ====================

export type ReportTargetType = "tip" | "gearReview" | "question" | "answer" | "story" | "comment" | "feedback";
export type ReportStatus = "open" | "resolved" | "dismissed";

export interface ContentReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  reporterId: string;
  createdAt: Timestamp | string;
  status: ReportStatus;
}

// ==================== Profiles ====================

export interface Profile {
  id: string; // Same as userId
  handle: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  createdAt: Timestamp | string;
}

// ==================== LEGACY TYPES (for migration reference) ====================

export interface CommunityTip {
  id: string;
  title: string;
  tipText: string;
  category: string;
  authorId: string;
  authorName: string;
  authorHandle?: string;
  createdAt: string;
  updatedAt: string;
  likes: number;
  views: number;
  photos?: string[];
  tags?: string[];
  isHelpful?: boolean;
}

export interface TipFormData {
  title: string;
  tipText: string;
  category: string;
  photos?: string[];
  tags?: string[];
}

export interface TipCategory {
  id: string;
  name: string;
  icon: string;
}

export type ImageCategory =
  | "camping"
  | "nature"
  | "gear"
  | "food"
  | "wildlife"
  | "people"
  | "trails"
  | "sunrise-sunset"
  | "tips"
  | "other";

export interface LibraryImage {
  id: string;
  title: string;
  description?: string;
  imageUri: string;
  authorId: string;
  authorHandle: string;
  authorName?: string;
  category: ImageCategory;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  score: number;
  views: number;
  isPrivate?: boolean;
  userVote?: "up" | "down" | null;
}

export interface Campsite {
  id: string;
  name: string;
  description: string;
  location: string;
  imageUri: string;
  authorId: string;
  authorHandle: string;
  createdAt: string;
  rating: number;
  tags: string[];
}
