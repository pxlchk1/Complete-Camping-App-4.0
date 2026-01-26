// Feedback system types

export type FeedbackCategory =
  | "feature_request"
  | "bug_report"
  | "improvement"
  | "question"
  | "other";

export type FeedbackStatus =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "closed";

export interface FeedbackPost {
  id: string;
  title: string;
  description?: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  authorId: string;
  authorHandle: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  karmaScore: number;
  commentCount: number;
  isAdminPost?: boolean;
}

export interface FeedbackComment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorHandle: string;
  authorName?: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  karmaScore: number;
  isAdminResponse?: boolean;
}

export interface FeedbackFilters {
  sortBy?: "hot" | "top" | "new";
  category?: FeedbackCategory;
  status?: FeedbackStatus;
}

export interface FeedbackVote {
  userId: string;
  postId: string;
  voteType: "up" | "down";
  createdAt: string;
}
