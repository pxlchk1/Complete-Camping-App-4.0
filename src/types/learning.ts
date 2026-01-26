/**
 * Learning Types
 * Firestore-backed learning content and progress types
 */

import { Timestamp } from "firebase/firestore";

// ============================================
// BADGE DEFINITIONS
// ============================================

export type BadgeId = 
  | "leave-no-trace"
  | "weekend-camper"
  | "trail-leader"
  | "backcountry-guide";

export interface LearningBadge {
  id: BadgeId;
  name: string;
  description: string;
  icon: string; // Ionicons name
  trackId: string; // Which track awards this badge
  color: string; // Badge accent color
}

export const LEARNING_BADGES: Record<BadgeId, LearningBadge> = {
  "leave-no-trace": {
    id: "leave-no-trace",
    name: "Leave No Trace",
    description: "Completed Leave No Trace training and passed the assessment with 100%",
    icon: "leaf",
    trackId: "leave-no-trace",
    color: "#4CAF50",
  },
  "weekend-camper": {
    id: "weekend-camper",
    name: "Weekend Camper",
    description: "Mastered the fundamentals of camping. You can plan a trip, set up camp, stay warm, and follow outdoor ethics.",
    icon: "bonfire",
    trackId: "novice",
    color: "#FF9800",
  },
  "trail-leader": {
    id: "trail-leader",
    name: "Trail Leader",
    description: "You can guide a group with confidence. You understand terrain, weather, safety, and navigation at a leader level.",
    icon: "trail-sign",
    trackId: "intermediate",
    color: "#2196F3",
  },
  "backcountry-guide": {
    id: "backcountry-guide",
    name: "Backcountry Guide",
    description: "You move comfortably in deep wilderness. Advanced navigation, weather, shelter, first aid, and decision making.",
    icon: "compass",
    trackId: "master",
    color: "#9C27B0",
  },
};

// ============================================
// LEARNING TRACK (COLLECTION: learningTracks)
// ============================================

export interface LearningTrack {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number; // Display order
  badgeId: BadgeId; // Badge awarded on 100% completion
  moduleIds: string[]; // Ordered list of module IDs in this track
  isActive: boolean; // Whether track is available
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// LEARNING MODULE (COLLECTION: learningModules)
// ============================================

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string; // Shown after answering
}

export interface LearningModule {
  id: string;
  trackId: string; // Which track this belongs to
  title: string;
  description: string;
  icon: string;
  order: number; // Order within track
  estimatedMinutes: number;
  
  // The main content - single long-form article
  content: string; // Markdown content for the module
  
  // Quiz at the end
  quiz: QuizQuestion[];
  
  // Metadata
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// USER PROGRESS (SUBCOLLECTION: users/{uid}/learningProgress)
// ============================================

export interface ModuleProgress {
  moduleId: string;
  trackId: string;
  
  // Reading progress (scroll position 0-100)
  readProgress: number;
  hasRead: boolean; // Scrolled to bottom at least once
  
  // Quiz results
  quizAttempts: number;
  bestScore: number; // 0-100
  lastAttemptAt?: Timestamp;
  passed: boolean; // Got 100%
  
  // Timestamps
  startedAt: Timestamp;
  completedAt?: Timestamp;
}

export interface UserLearningProgress {
  // Summary stats
  totalModulesCompleted: number;
  totalQuizzesPassed: number;
  
  // Earned badges
  earnedBadges: BadgeId[];
  
  // Progress by module (moduleId -> progress)
  moduleProgress: Record<string, ModuleProgress>;
  
  // Track completion percentage
  trackProgress: Record<string, number>; // trackId -> percentage (0-100)
  
  updatedAt: Timestamp;
}

// ============================================
// DISPLAY TYPES
// ============================================

export interface TrackWithModules extends LearningTrack {
  modules: LearningModule[];
  userProgress: number; // 0-100 completion percentage
  isCompleted: boolean;
  hasBadge: boolean;
}

export interface ModuleWithProgress extends LearningModule {
  progress?: ModuleProgress;
  isCompleted: boolean;
  quizScore?: number;
}
