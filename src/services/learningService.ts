/**
 * Learning Service
 * Firebase-backed service for learning content and progress tracking
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import {
  LearningTrack,
  LearningModule,
  ModuleProgress,
  UserLearningProgress,
  TrackWithModules,
  ModuleWithProgress,
  BadgeId,
  LEARNING_BADGES,
  QuizQuestion,
} from "../types/learning";

// Collection references
const TRACKS_COLLECTION = "learningTracks";
const MODULES_COLLECTION = "learningModules";
const PROGRESS_COLLECTION = "learningProgress"; // Subcollection under users

// ============================================
// TRACK FETCHING
// ============================================

/**
 * Get all active learning tracks
 */
export async function getLearningTracks(): Promise<LearningTrack[]> {
  try {
    const tracksRef = collection(db, TRACKS_COLLECTION);
    // Simple query without compound index requirement
    const snapshot = await getDocs(tracksRef);
    
    // Filter and sort in memory
    const tracks = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LearningTrack[];
    
    return tracks
      .filter((t) => t.isActive !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error("[LearningService] Error fetching tracks:", error);
    return [];
  }
}

/**
 * Get a specific track by ID
 */
export async function getTrackById(trackId: string): Promise<LearningTrack | null> {
  try {
    const trackRef = doc(db, TRACKS_COLLECTION, trackId);
    const trackDoc = await getDoc(trackRef);
    
    if (!trackDoc.exists()) return null;
    
    return {
      id: trackDoc.id,
      ...trackDoc.data(),
    } as LearningTrack;
  } catch (error) {
    console.error("[LearningService] Error fetching track:", error);
    return null;
  }
}

// ============================================
// MODULE FETCHING
// ============================================

/**
 * Get all modules for a track
 */
export async function getModulesByTrack(trackId: string): Promise<LearningModule[]> {
  try {
    const modulesRef = collection(db, MODULES_COLLECTION);
    // Simple query - filter by trackId only, sort in memory
    const q = query(
      modulesRef,
      where("trackId", "==", trackId)
    );
    
    const snapshot = await getDocs(q);
    const modules = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as LearningModule[];
    
    return modules
      .filter((m) => m.isActive !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error("[LearningService] Error fetching modules:", error);
    return [];
  }
}

/**
 * Get a specific module by ID
 */
export async function getModuleById(moduleId: string): Promise<LearningModule | null> {
  try {
    const moduleRef = doc(db, MODULES_COLLECTION, moduleId);
    const moduleDoc = await getDoc(moduleRef);
    
    if (!moduleDoc.exists()) return null;
    
    return {
      id: moduleDoc.id,
      ...moduleDoc.data(),
    } as LearningModule;
  } catch (error) {
    console.error("[LearningService] Error fetching module:", error);
    return null;
  }
}

// ============================================
// USER PROGRESS
// ============================================

/**
 * Get user's learning progress
 */
export async function getUserLearningProgress(): Promise<UserLearningProgress | null> {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    const progressRef = doc(db, "users", user.uid, PROGRESS_COLLECTION, "summary");
    const progressDoc = await getDoc(progressRef);
    
    if (!progressDoc.exists()) {
      // Return default progress
      return {
        totalModulesCompleted: 0,
        totalQuizzesPassed: 0,
        earnedBadges: [],
        moduleProgress: {},
        trackProgress: {},
        updatedAt: Timestamp.now(),
      };
    }
    
    return progressDoc.data() as UserLearningProgress;
  } catch (error) {
    console.error("[LearningService] Error fetching user progress:", error);
    return null;
  }
}

/**
 * Get progress for a specific module
 */
export async function getModuleProgress(moduleId: string): Promise<ModuleProgress | null> {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    const progress = await getUserLearningProgress();
    return progress?.moduleProgress[moduleId] || null;
  } catch (error) {
    console.error("[LearningService] Error fetching module progress:", error);
    return null;
  }
}

/**
 * Mark module as read (user scrolled to bottom)
 */
export async function markModuleAsRead(moduleId: string, trackId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const progressRef = doc(db, "users", user.uid, PROGRESS_COLLECTION, "summary");
    const currentProgress = await getUserLearningProgress();
    
    const existingModuleProgress = currentProgress?.moduleProgress[moduleId];
    
    const updatedModuleProgress: ModuleProgress = {
      moduleId,
      trackId,
      readProgress: 100,
      hasRead: true,
      quizAttempts: existingModuleProgress?.quizAttempts || 0,
      bestScore: existingModuleProgress?.bestScore || 0,
      passed: existingModuleProgress?.passed || false,
      startedAt: existingModuleProgress?.startedAt || Timestamp.now(),
    };
    
    await setDoc(progressRef, {
      moduleProgress: {
        ...currentProgress?.moduleProgress,
        [moduleId]: updatedModuleProgress,
      },
      updatedAt: Timestamp.now(),
    }, { merge: true });
    
  } catch (error) {
    console.error("[LearningService] Error marking module as read:", error);
  }
}

/**
 * Submit quiz answers and check for badge
 */
export async function submitQuizAnswers(
  moduleId: string,
  trackId: string,
  answers: number[],
  questions: QuizQuestion[]
): Promise<{ score: number; passed: boolean; badgeEarned?: BadgeId }> {
  const user = auth.currentUser;
  if (!user) {
    return { score: 0, passed: false };
  }
  
  // Calculate score - normalize types to handle Firestore string/number mismatches
  let correctCount = 0;
  questions.forEach((q, index) => {
    const userAnswer = Number(answers[index]);
    const correctAnswer = Number(q.correctAnswerIndex);
    if (!isNaN(userAnswer) && !isNaN(correctAnswer) && userAnswer === correctAnswer) {
      correctCount++;
    }
  });
  
  const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const passed = score === 100;
  
  try {
    const progressRef = doc(db, "users", user.uid, PROGRESS_COLLECTION, "summary");
    const currentProgress = await getUserLearningProgress();
    
    const existingModuleProgress = currentProgress?.moduleProgress[moduleId];
    const previousBestScore = existingModuleProgress?.bestScore || 0;
    const wasPreviouslyPassed = existingModuleProgress?.passed || false;
    
    const updatedModuleProgress: ModuleProgress = {
      moduleId,
      trackId,
      readProgress: 100,
      hasRead: true,
      quizAttempts: (existingModuleProgress?.quizAttempts || 0) + 1,
      bestScore: Math.max(score, previousBestScore),
      lastAttemptAt: Timestamp.now(),
      passed: passed || wasPreviouslyPassed,
      startedAt: existingModuleProgress?.startedAt || Timestamp.now(),
      completedAt: passed ? Timestamp.now() : existingModuleProgress?.completedAt,
    };
    
    // Calculate new completion count
    const newModuleProgress = {
      ...currentProgress?.moduleProgress,
      [moduleId]: updatedModuleProgress,
    };
    
    const completedCount = Object.values(newModuleProgress).filter(
      (p) => (p as ModuleProgress).passed
    ).length;
    
    // Check if badge should be awarded
    let badgeEarned: BadgeId | undefined;
    const earnedBadges = [...(currentProgress?.earnedBadges || [])];
    
    if (passed && !wasPreviouslyPassed) {
      // Check for track completion
      badgeEarned = await checkAndAwardBadge(trackId, newModuleProgress, earnedBadges);
    }
    
    await setDoc(progressRef, {
      moduleProgress: newModuleProgress,
      totalModulesCompleted: completedCount,
      totalQuizzesPassed: completedCount,
      earnedBadges: badgeEarned && !earnedBadges.includes(badgeEarned) 
        ? [...earnedBadges, badgeEarned]
        : earnedBadges,
      updatedAt: Timestamp.now(),
    }, { merge: true });
    
    // Sync badge to profile's meritBadges array for display on My Campsite
    if (badgeEarned && !earnedBadges.includes(badgeEarned)) {
      await syncBadgeToProfile(user.uid, badgeEarned);
    }
    
    return { score, passed, badgeEarned };
  } catch (error) {
    console.error("[LearningService] Error submitting quiz:", error);
    return { score, passed: false };
  }
}

/**
 * Check if a badge should be awarded
 */
async function checkAndAwardBadge(
  trackId: string,
  moduleProgress: Record<string, ModuleProgress>,
  currentBadges: BadgeId[]
): Promise<BadgeId | undefined> {
  try {
    // Get all modules for this track
    const modules = await getModulesByTrack(trackId);
    if (modules.length === 0) return undefined;
    
    // Check if all modules are passed
    const allPassed = modules.every((m) => {
      const progress = moduleProgress[m.id];
      return progress?.passed === true;
    });
    
    if (!allPassed) return undefined;
    
    // Get the badge for this track
    const track = await getTrackById(trackId);
    if (!track) return undefined;
    
    const badgeId = track.badgeId;
    
    // Don't award if already earned
    if (currentBadges.includes(badgeId)) return undefined;
    
    return badgeId;
  } catch (error) {
    console.error("[LearningService] Error checking badge:", error);
    return undefined;
  }
}

/**
 * Sync a badge to the user's profile meritBadges array
 * This ensures badges appear on My Campsite
 */
async function syncBadgeToProfile(userId: string, badgeId: BadgeId): Promise<void> {
  try {
    const badgeDetails = LEARNING_BADGES[badgeId];
    if (!badgeDetails) {
      console.error("[LearningService] Unknown badge ID:", badgeId);
      return;
    }

    const profileRef = doc(db, "profiles", userId);
    const profileSnap = await getDoc(profileRef);
    
    if (!profileSnap.exists()) {
      console.error("[LearningService] Profile not found for user:", userId);
      return;
    }
    
    const currentBadges = profileSnap.data()?.meritBadges || [];
    
    // Check if badge already exists in profile
    const alreadyHasBadge = currentBadges.some((b: any) => b.id === badgeId);
    if (alreadyHasBadge) {
      console.log("[LearningService] Badge already in profile:", badgeId);
      return;
    }
    
    // Create merit badge object matching MyCampsiteScreen expectations
    const meritBadge = {
      id: badgeId,
      name: badgeDetails.name,
      icon: badgeDetails.icon,
      color: badgeDetails.color,
      earnedAt: Timestamp.now(),
    };
    
    await updateDoc(profileRef, {
      meritBadges: [...currentBadges, meritBadge],
    });
    
    console.log("[LearningService] Badge synced to profile:", badgeId);
  } catch (error) {
    console.error("[LearningService] Error syncing badge to profile:", error);
    // Don't throw - badge is still earned in learningProgress, just not displayed
  }
}

/**
 * Get user's earned badges
 */
export async function getEarnedBadges(): Promise<BadgeId[]> {
  const progress = await getUserLearningProgress();
  return progress?.earnedBadges || [];
}

/**
 * Check if user has a specific badge
 */
export async function hasBadge(badgeId: BadgeId): Promise<boolean> {
  const badges = await getEarnedBadges();
  return badges.includes(badgeId);
}

// ============================================
// COMBINED DATA FETCHING
// ============================================

/**
 * Get all tracks with their modules and user progress
 */
export async function getTracksWithProgress(): Promise<TrackWithModules[]> {
  try {
    const [tracks, userProgress] = await Promise.all([
      getLearningTracks(),
      getUserLearningProgress(),
    ]);
    
    const result: TrackWithModules[] = [];
    
    for (const track of tracks) {
      const modules = await getModulesByTrack(track.id);
      
      // Calculate progress
      let completedModules = 0;
      modules.forEach((m) => {
        if (userProgress?.moduleProgress[m.id]?.passed) {
          completedModules++;
        }
      });
      
      const progressPercent = modules.length > 0 
        ? Math.round((completedModules / modules.length) * 100)
        : 0;
      
      const hasBadge = (userProgress?.earnedBadges || []).includes(track.badgeId);
      
      result.push({
        ...track,
        modules,
        userProgress: progressPercent,
        isCompleted: progressPercent === 100,
        hasBadge,
      });
    }
    
    return result;
  } catch (error) {
    console.error("[LearningService] Error fetching tracks with progress:", error);
    return [];
  }
}

/**
 * Get a module with user progress
 */
export async function getModuleWithProgress(moduleId: string): Promise<ModuleWithProgress | null> {
  try {
    const [module, progress] = await Promise.all([
      getModuleById(moduleId),
      getModuleProgress(moduleId),
    ]);
    
    if (!module) return null;
    
    return {
      ...module,
      progress: progress || undefined,
      isCompleted: progress?.passed || false,
      quizScore: progress?.bestScore,
    };
  } catch (error) {
    console.error("[LearningService] Error fetching module with progress:", error);
    return null;
  }
}

// ============================================
// BADGE HELPERS
// ============================================

/**
 * Get badge details by ID
 */
export function getBadgeDetails(badgeId: BadgeId) {
  return LEARNING_BADGES[badgeId];
}

/**
 * Get all badge definitions
 */
export function getAllBadges() {
  return Object.values(LEARNING_BADGES);
}
