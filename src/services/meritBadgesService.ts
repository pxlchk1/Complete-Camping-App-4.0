/**
 * Merit Badges Service
 * 
 * Handles all badge-related Firestore operations:
 * - Badge definitions (read-only catalog)
 * - Badge claims (witness flow)
 * - User badges (earned collection)
 * - Progress tracking
 */

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import firebaseApp, { auth, storage } from "../config/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "firebase/storage";
import {
  BadgeDefinition,
  BadgeClaim,
  UserBadge,
  BadgeWithProgress,
  BadgeProgressStats,
  BadgeCategoryGroup,
  WitnessRequest,
  CreateBadgeClaimData,
  UpdateBadgeClaimData,
  CreateUserBadgeData,
  BadgeDisplayState,
  BadgeClaimStatus,
  BADGE_CATEGORIES,
  BadgeCategoryId,
} from "../types/badges";

const db = getFirestore(firebaseApp);

// ============================================
// BADGE DEFINITIONS (Read-Only Catalog)
// ============================================

/**
 * Get all active badge definitions
 */
export async function getAllBadgeDefinitions(): Promise<BadgeDefinition[]> {
  const badgesRef = collection(db, "badgeDefinitions");
  const q = query(badgesRef, where("isActive", "==", true), orderBy("sortOrder", "asc"));
  
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BadgeDefinition[];
  } catch (error: any) {
    // Fallback without orderBy if index missing
    if (error.code === "failed-precondition" || error.message?.includes("index")) {
      const simpleQuery = query(badgesRef, where("isActive", "==", true));
      const snapshot = await getDocs(simpleQuery);
      const badges = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BadgeDefinition[];
      return badges.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    throw error;
  }
}

/**
 * Get a single badge definition by ID
 */
export async function getBadgeDefinition(badgeId: string): Promise<BadgeDefinition | null> {
  const badgeRef = doc(db, "badgeDefinitions", badgeId);
  const badgeSnap = await getDoc(badgeRef);
  
  if (!badgeSnap.exists()) return null;
  
  return {
    id: badgeSnap.id,
    ...badgeSnap.data()
  } as BadgeDefinition;
}

// ============================================
// USER BADGES (Earned Collection)
// ============================================

/**
 * Get all earned badges for a user
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const userBadgesRef = collection(db, "userBadges");
  const q = query(userBadgesRef, where("userId", "==", userId), orderBy("earnedAt", "desc"));
  
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserBadge[];
  } catch (error: any) {
    if (error.code === "failed-precondition" || error.message?.includes("index")) {
      const simpleQuery = query(userBadgesRef, where("userId", "==", userId));
      const snapshot = await getDocs(simpleQuery);
      const badges = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserBadge[];
      return badges.sort((a, b) => {
        const timeA = a.earnedAt instanceof Timestamp ? a.earnedAt.toMillis() : new Date(a.earnedAt as any).getTime();
        const timeB = b.earnedAt instanceof Timestamp ? b.earnedAt.toMillis() : new Date(b.earnedAt as any).getTime();
        return timeB - timeA;
      });
    }
    throw error;
  }
}

/**
 * Check if user has already earned a specific badge
 */
export async function hasUserEarnedBadge(userId: string, badgeId: string): Promise<boolean> {
  const userBadgesRef = collection(db, "userBadges");
  const q = query(
    userBadgesRef,
    where("userId", "==", userId),
    where("badgeId", "==", badgeId)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Get a specific earned badge for a user
 */
export async function getUserBadge(userId: string, badgeId: string): Promise<UserBadge | null> {
  const userBadgesRef = collection(db, "userBadges");
  const q = query(
    userBadgesRef,
    where("userId", "==", userId),
    where("badgeId", "==", badgeId)
  );
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  
  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data()
  } as UserBadge;
}

/**
 * Create a new earned badge record (self-earned or photo-earned)
 */
export async function createUserBadge(data: CreateUserBadgeData): Promise<UserBadge> {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be signed in to earn a badge");
  
  // Prevent duplicates
  const alreadyEarned = await hasUserEarnedBadge(user.uid, data.badgeId);
  if (alreadyEarned) {
    throw new Error("Badge already earned");
  }
  
  const userBadgesRef = collection(db, "userBadges");
  const now = serverTimestamp();
  
  const badgeData = {
    userId: user.uid,
    badgeId: data.badgeId,
    earnedAt: now,
    earnedVia: data.earnedVia,
    witnessUserId: data.witnessUserId || null,
    photoUrl: data.photoUrl || null,
    caption: data.caption || null,
    visibility: data.visibility || "PUBLIC",
  };
  
  const docRef = await addDoc(userBadgesRef, badgeData);
  
  // Also sync to profile.meritBadges for display
  await syncBadgeToProfile(user.uid, data.badgeId);
  
  return {
    id: docRef.id,
    ...badgeData,
    earnedAt: new Date(),
  } as UserBadge;
}

/**
 * Update badge visibility or photo
 */
export async function updateUserBadge(
  badgeRecordId: string,
  updates: { visibility?: "PRIVATE" | "PUBLIC"; photoUrl?: string; caption?: string }
): Promise<void> {
  const badgeRef = doc(db, "userBadges", badgeRecordId);
  await updateDoc(badgeRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// BADGE CLAIMS (Witness Flow)
// ============================================

/**
 * Get pending claims where user is the claimant
 */
export async function getMyPendingClaims(userId: string): Promise<BadgeClaim[]> {
  const claimsRef = collection(db, "badgeClaims");
  const q = query(
    claimsRef,
    where("claimantUserId", "==", userId),
    where("status", "==", "PENDING_STAMP")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as BadgeClaim[];
}

/**
 * Get pending stamp requests where user is the witness
 */
export async function getWitnessRequests(witnessUserId: string): Promise<BadgeClaim[]> {
  const claimsRef = collection(db, "badgeClaims");
  const q = query(
    claimsRef,
    where("witnessUserId", "==", witnessUserId),
    where("status", "==", "PENDING_STAMP")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as BadgeClaim[];
}

/**
 * Get claim for a specific badge by current user
 */
export async function getClaimForBadge(userId: string, badgeId: string): Promise<BadgeClaim | null> {
  const claimsRef = collection(db, "badgeClaims");
  const q = query(
    claimsRef,
    where("claimantUserId", "==", userId),
    where("badgeId", "==", badgeId)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data()
  } as BadgeClaim;
}

/**
 * Create a badge claim (request stamp from witness)
 */
export async function createBadgeClaim(data: CreateBadgeClaimData): Promise<BadgeClaim> {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be signed in to request a stamp");
  
  // Prevent self-witness
  if (data.witnessUserId === user.uid) {
    throw new Error("Cannot witness your own badge");
  }
  
  // Check if badge already earned
  const alreadyEarned = await hasUserEarnedBadge(user.uid, data.badgeId);
  if (alreadyEarned) {
    throw new Error("Badge already earned");
  }
  
  // Check for existing pending claim
  const existingClaim = await getClaimForBadge(user.uid, data.badgeId);
  if (existingClaim && existingClaim.status === "PENDING_STAMP") {
    throw new Error("Already have a pending stamp request for this badge");
  }
  
  const claimsRef = collection(db, "badgeClaims");
  const now = serverTimestamp();
  
  const claimData = {
    badgeId: data.badgeId,
    claimantUserId: user.uid,
    createdAt: now,
    updatedAt: now,
    status: "PENDING_STAMP" as BadgeClaimStatus,
    witnessUserId: data.witnessUserId,
    photoUrl: data.photoUrl || null,
    caption: data.caption || null,
  };
  
  const docRef = await addDoc(claimsRef, claimData);
  
  return {
    id: docRef.id,
    ...claimData,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as BadgeClaim;
}

/**
 * Update a badge claim (add photo while pending)
 */
export async function updateBadgeClaim(
  claimId: string,
  updates: UpdateBadgeClaimData
): Promise<void> {
  const claimRef = doc(db, "badgeClaims", claimId);
  await updateDoc(claimRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Approve a badge claim (witness action)
 */
export async function approveBadgeClaim(claimId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be signed in to approve a stamp");
  
  const claimRef = doc(db, "badgeClaims", claimId);
  const claimSnap = await getDoc(claimRef);
  
  if (!claimSnap.exists()) {
    throw new Error("Claim not found");
  }
  
  const claim = claimSnap.data() as Omit<BadgeClaim, "id">;
  
  // Verify user is the witness
  if (claim.witnessUserId !== user.uid) {
    throw new Error("Only the witness can approve this claim");
  }
  
  // Verify claim is pending
  if (claim.status !== "PENDING_STAMP") {
    throw new Error("This claim is no longer pending");
  }
  
  // Check claimant hasn't already earned this badge
  const alreadyEarned = await hasUserEarnedBadge(claim.claimantUserId, claim.badgeId);
  if (alreadyEarned) {
    throw new Error("Claimant has already earned this badge");
  }
  
  const batch = writeBatch(db);
  const now = serverTimestamp();
  
  // Update claim status
  batch.update(claimRef, {
    status: "APPROVED",
    approvedAt: now,
    decisionAt: now,
    updatedAt: now,
  });
  
  // Create userBadge record
  const userBadgesRef = collection(db, "userBadges");
  const newBadgeRef = doc(userBadgesRef);
  batch.set(newBadgeRef, {
    userId: claim.claimantUserId,
    badgeId: claim.badgeId,
    earnedAt: now,
    earnedVia: "STAMP",
    witnessUserId: user.uid,
    photoUrl: claim.photoUrl || null,
    caption: claim.caption || null,
    visibility: "PUBLIC",
  });
  
  await batch.commit();
  
  // Sync to profile
  await syncBadgeToProfile(claim.claimantUserId, claim.badgeId);
}

/**
 * Decline a badge claim (witness action)
 */
export async function declineBadgeClaim(claimId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be signed in to decline a stamp");
  
  const claimRef = doc(db, "badgeClaims", claimId);
  const claimSnap = await getDoc(claimRef);
  
  if (!claimSnap.exists()) {
    throw new Error("Claim not found");
  }
  
  const claim = claimSnap.data() as Omit<BadgeClaim, "id">;
  
  // Verify user is the witness
  if (claim.witnessUserId !== user.uid) {
    throw new Error("Only the witness can decline this claim");
  }
  
  await updateDoc(claimRef, {
    status: "NOT_THIS_TIME",
    decisionAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// PROGRESS & AGGREGATION
// ============================================

/**
 * Get badges with progress state for display
 */
export async function getBadgesWithProgress(userId: string): Promise<BadgeWithProgress[]> {
  const [definitions, earnedBadges, pendingClaims] = await Promise.all([
    getAllBadgeDefinitions(),
    getUserBadges(userId),
    getMyPendingClaims(userId),
  ]);
  
  const earnedMap = new Map(earnedBadges.map(b => [b.badgeId, b]));
  const pendingMap = new Map(pendingClaims.map(c => [c.badgeId, c]));
  const now = new Date();
  
  return definitions.map(badge => {
    const earned = earnedMap.get(badge.id);
    const pending = pendingMap.get(badge.id);
    const isSeasonallyAvailable = checkSeasonalAvailability(badge, now);
    
    let displayState: BadgeDisplayState;
    
    if (earned) {
      displayState = "earned";
    } else if (pending) {
      displayState = "pending_stamp";
    } else if (badge.seasonWindow && !isSeasonallyAvailable) {
      displayState = "seasonal_locked";
    } else if (badge.seasonWindow && isSeasonallyAvailable) {
      displayState = "seasonal_active";
    } else {
      displayState = "not_started";
    }
    
    return {
      ...badge,
      displayState,
      earnedBadge: earned,
      pendingClaim: pending,
      isSeasonallyAvailable,
    };
  });
}

/**
 * Get badges grouped by category
 */
export async function getBadgesByCategory(userId: string): Promise<BadgeCategoryGroup[]> {
  const badgesWithProgress = await getBadgesWithProgress(userId);
  
  const groups: Map<BadgeCategoryId, BadgeWithProgress[]> = new Map();
  
  for (const badge of badgesWithProgress) {
    const categoryBadges = groups.get(badge.categoryId) || [];
    categoryBadges.push(badge);
    groups.set(badge.categoryId, categoryBadges);
  }
  
  // Convert to array and sort by category order
  const result: BadgeCategoryGroup[] = [];
  const sortedCategories = Object.entries(BADGE_CATEGORIES)
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder);
  
  for (const [categoryId, meta] of sortedCategories) {
    const badges = groups.get(categoryId as BadgeCategoryId) || [];
    if (badges.length > 0) {
      result.push({
        categoryId: categoryId as BadgeCategoryId,
        categoryName: meta.name,
        badges,
      });
    }
  }
  
  return result;
}

/**
 * Calculate progress statistics
 */
export async function getBadgeProgressStats(userId: string): Promise<BadgeProgressStats> {
  const badgesWithProgress = await getBadgesWithProgress(userId);
  
  const totalBadges = badgesWithProgress.length;
  const earnedBadges = badgesWithProgress.filter(b => b.displayState === "earned").length;
  
  const coreBadges = badgesWithProgress.filter(b => !b.seasonWindow);
  const coreEarned = coreBadges.filter(b => b.displayState === "earned").length;
  
  const seasonalBadges = badgesWithProgress.filter(b => b.seasonWindow && !b.isLimitedEdition);
  const seasonalEarned = seasonalBadges.filter(b => b.displayState === "earned").length;
  
  const limitedBadges = badgesWithProgress.filter(b => b.isLimitedEdition);
  const limitedEarned = limitedBadges.filter(b => b.displayState === "earned").length;
  
  return {
    totalBadges,
    earnedBadges,
    percentComplete: totalBadges > 0 ? Math.round((earnedBadges / totalBadges) * 100) : 0,
    coreEarned,
    coreTotal: coreBadges.length,
    seasonalEarned,
    seasonalTotal: seasonalBadges.length,
    limitedEarned,
  };
}

/**
 * Get witness requests with enriched data
 */
export async function getWitnessRequestsWithDetails(witnessUserId: string): Promise<WitnessRequest[]> {
  const claims = await getWitnessRequests(witnessUserId);
  
  if (claims.length === 0) return [];
  
  const results: WitnessRequest[] = [];
  
  for (const claim of claims) {
    const badge = await getBadgeDefinition(claim.badgeId);
    if (!badge) continue;
    
    // Get claimant profile
    const profileRef = doc(db, "profiles", claim.claimantUserId);
    const profileSnap = await getDoc(profileRef);
    const profileData = profileSnap.data();
    
    results.push({
      claim,
      badge,
      claimantName: profileData?.displayName || "Camper",
      claimantAvatarUrl: profileData?.avatarUrl,
    });
  }
  
  return results;
}

/**
 * Get count of pending witness requests
 */
export async function getWitnessRequestCount(witnessUserId: string): Promise<number> {
  const claimsRef = collection(db, "badgeClaims");
  const q = query(
    claimsRef,
    where("witnessUserId", "==", witnessUserId),
    where("status", "==", "PENDING_STAMP")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.size;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a seasonal badge is currently available
 */
function checkSeasonalAvailability(badge: BadgeDefinition, now: Date): boolean {
  if (!badge.seasonWindow) return true;
  
  const { startsAt, endsAt } = badge.seasonWindow;
  const start = startsAt instanceof Timestamp ? startsAt.toDate() : new Date(startsAt as any);
  const end = endsAt instanceof Timestamp ? endsAt.toDate() : new Date(endsAt as any);
  
  // For limited edition, also check the year
  if (badge.isLimitedEdition && badge.limitedYear) {
    const currentYear = now.getFullYear();
    if (currentYear !== badge.limitedYear) return false;
  }
  
  return now >= start && now <= end;
}

/**
 * Get the end date for the currently active seasonal window
 */
export async function getCurrentSeasonEndDate(): Promise<Date | null> {
  const definitions = await getAllBadgeDefinitions();
  const now = new Date();
  
  for (const badge of definitions) {
    if (badge.seasonWindow) {
      const { endsAt } = badge.seasonWindow;
      const end = endsAt instanceof Timestamp ? endsAt.toDate() : new Date(endsAt as any);
      const start = badge.seasonWindow.startsAt instanceof Timestamp 
        ? badge.seasonWindow.startsAt.toDate() 
        : new Date(badge.seasonWindow.startsAt as any);
      
      if (now >= start && now <= end) {
        return end;
      }
    }
  }
  
  return null;
}

/**
 * Sync earned badge to user's profile.meritBadges array
 */
async function syncBadgeToProfile(userId: string, badgeId: string): Promise<void> {
  try {
    const badge = await getBadgeDefinition(badgeId);
    if (!badge) return;
    
    const profileRef = doc(db, "profiles", userId);
    const profileSnap = await getDoc(profileRef);
    
    if (!profileSnap.exists()) return;
    
    const currentBadges = profileSnap.data()?.meritBadges || [];
    
    // Check if already synced
    if (currentBadges.some((b: any) => b.id === badgeId)) return;
    
    // Create merit badge object for profile display
    // Note: serverTimestamp() cannot be used inside arrays, use Date instead
    const meritBadge = {
      id: badge.id,
      name: badge.name,
      icon: badge.iconAssetKey,
      color: badge.borderColorKey,
      earnedAt: new Date(),
    };
    
    await updateDoc(profileRef, {
      meritBadges: [...currentBadges, meritBadge],
    });
  } catch (error) {
    console.error("[MeritBadges] Error syncing to profile:", error);
  }
}

/**
 * Upload a photo for a badge to Firebase Storage
 */
export async function uploadBadgePhoto(
  userId: string,
  badgeId: string,
  imageUri: string
): Promise<string> {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    const storagePath = `badgePhotos/${userId}/${badgeId}/${Date.now()}.jpg`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob);
    
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.error("[MeritBadges] Error uploading photo:", error);
    throw new Error("Failed to upload photo");
  }
}

/**
 * Delete all photos for a badge from Firebase Storage
 */
export async function deleteBadgePhoto(
  userId: string,
  badgeId: string
): Promise<void> {
  try {
    const folderRef = ref(storage, `badgePhotos/${userId}/${badgeId}`);
    const listResult = await listAll(folderRef);
    
    // Delete all files in the folder
    await Promise.all(
      listResult.items.map((itemRef) => deleteObject(itemRef))
    );
  } catch (error: any) {
    // Ignore if folder doesn't exist
    if (error.code !== "storage/object-not-found") {
      console.error("[MeritBadges] Error deleting photo:", error);
      throw new Error("Failed to delete photo");
    }
  }
}

/**
 * Get pending badge claims where the current user is the witness
 */
export async function getPendingClaimsForWitness(witnessUserId: string): Promise<BadgeClaim[]> {
  try {
    const claimsRef = collection(db, "badgeClaims");
    const q = query(
      claimsRef,
      where("witnessUserId", "==", witnessUserId),
      where("status", "==", "PENDING_STAMP"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as BadgeClaim[];
  } catch (error: any) {
    console.error("[MeritBadges] Error fetching witness claims:", error);
    
    // Fallback without orderBy if index missing
    if (error.code === "failed-precondition" || error.message?.includes("index")) {
      const claimsRef = collection(db, "badgeClaims");
      const q = query(
        claimsRef,
        where("witnessUserId", "==", witnessUserId),
        where("status", "==", "PENDING_STAMP")
      );
      const snapshot = await getDocs(q);
      const claims = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as BadgeClaim[];
      
      // Sort client-side
      return claims.sort((a, b) => {
        const createdAtA = a.createdAt as any;
        const createdAtB = b.createdAt as any;
        const timeA = createdAtA?.toMillis?.() || (createdAtA instanceof Date ? createdAtA.getTime() : 0);
        const timeB = createdAtB?.toMillis?.() || (createdAtB instanceof Date ? createdAtB.getTime() : 0);
        return timeB - timeA;
      });
    }
    
    throw error;
  }
}

/**
 * Deny a badge claim (witness action)
 */
export async function denyBadgeClaim(claimId: string, witnessUserId: string): Promise<void> {
  const claimRef = doc(db, "badgeClaims", claimId);
  const claimSnap = await getDoc(claimRef);

  if (!claimSnap.exists()) {
    throw new Error("Claim not found");
  }

  const claim = claimSnap.data() as BadgeClaim;

  // Verify the current user is the witness
  if (claim.witnessUserId !== witnessUserId) {
    throw new Error("Only the designated witness can deny this claim");
  }

  await updateDoc(claimRef, {
    status: "NOT_THIS_TIME",
    stampedAt: serverTimestamp(),
  });
}

// ============================================
// SEED DATA
// ============================================

/**
 * Seed badge definitions to Firestore
 * Only creates badges that don't already exist
 */
export async function seedBadgeDefinitions(): Promise<{ created: number; skipped: number }> {
  const SEED_BADGES: Omit<BadgeDefinition, "id">[] = [
    // ============================================
    // CAMP SETUP & SHELTER (9 badges)
    // ============================================
    {
      name: "Tent Master",
      categoryId: "setup",
      borderColorKey: "forest",
      iconAssetKey: "home-outline",
      imageKey: "camp_setup_and_shelter_1",
      earnType: "WITNESS_REQUIRED",
      description: "Set up your tent like a pro - properly staked, rain fly secured, and ready for any weather.",
      requirements: ["Set up tent with all stakes properly secured", "Attach and tension rain fly correctly", "Position tent on appropriate ground", "Have a fellow camper verify your setup"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: "Shelter Builder",
      categoryId: "setup",
      borderColorKey: "amber",
      iconAssetKey: "construct-outline",
      imageKey: "camp_setup_and_shelter_2",
      earnType: "PHOTO_REQUIRED",
      description: "Build an emergency shelter using natural materials.",
      requirements: ["Construct a debris hut or lean-to shelter", "Use only natural materials", "Shelter must fit one person", "Take a photo of your completed shelter"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 2,
    },
    {
      name: "Tarp Architect",
      categoryId: "setup",
      borderColorKey: "sky",
      iconAssetKey: "grid-outline",
      imageKey: "camp_setup_and_shelter_3",
      earnType: "PHOTO_REQUIRED",
      description: "Master the art of tarp setup for rain protection.",
      requirements: ["Set up a tarp with proper tension", "Create adequate rain runoff", "Secure all guy lines properly", "Take a photo of your tarp setup"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 3,
    },
    {
      name: "Campsite Organizer",
      categoryId: "setup",
      borderColorKey: "sage",
      iconAssetKey: "apps-outline",
      imageKey: "camp_setup_and_shelter_4",
      earnType: "SELF",
      description: "Create an efficient and organized campsite layout.",
      requirements: ["Designate cooking, sleeping, and gear areas", "Keep pathways clear", "Store food properly away from sleeping area", "Organize gear for easy access"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 4,
    },
    {
      name: "Hammock Pro",
      categoryId: "setup",
      borderColorKey: "teal",
      iconAssetKey: "bed-outline",
      imageKey: "camp_setup_and_shelter_5",
      earnType: "WITNESS_REQUIRED",
      description: "Set up a hammock camping system with proper insulation.",
      requirements: ["Hang hammock at correct height and angle", "Set up underquilt or pad", "Attach rain tarp properly", "Have a fellow camper verify setup"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 5,
    },
    {
      name: "Wind Strategist",
      categoryId: "setup",
      borderColorKey: "slate",
      iconAssetKey: "flag-outline",
      imageKey: "camp_setup_and_shelter_6",
      earnType: "SELF",
      description: "Position your camp strategically for wind protection.",
      requirements: ["Identify prevailing wind direction", "Use natural windbreaks", "Orient tent door away from wind", "Secure all loose items"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 6,
    },
    {
      name: "Leave No Trace Site",
      categoryId: "setup",
      borderColorKey: "forest",
      iconAssetKey: "leaf-outline",
      imageKey: "camp_setup_and_shelter_7",
      earnType: "PHOTO_REQUIRED",
      description: "Set up camp with minimal environmental impact.",
      requirements: ["Camp on durable surfaces", "Stay 200 feet from water sources", "Minimize campsite alterations", "Take before and after photos"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 7,
    },
    {
      name: "Bivy Expert",
      categoryId: "setup",
      borderColorKey: "rust",
      iconAssetKey: "body-outline",
      imageKey: "camp_setup_and_shelter_8",
      earnType: "SELF",
      description: "Master minimalist camping with a bivy sack.",
      requirements: ["Set up bivy on appropriate ground", "Manage condensation properly", "Keep gear organized in limited space", "Sleep comfortably through the night"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 8,
    },
    {
      name: "Group Camp Coordinator",
      categoryId: "setup",
      borderColorKey: "gold",
      iconAssetKey: "people-outline",
      imageKey: "camp_setup_and_shelter_9",
      earnType: "WITNESS_REQUIRED",
      description: "Organize and set up a group campsite efficiently.",
      requirements: ["Plan campsite layout for multiple tents", "Designate common areas", "Coordinate with all campers", "Have group verify successful setup"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 9,
    },

    // ============================================
    // FIRE & WARMTH (9 badges)
    // ============================================
    {
      name: "One Match Fire Starter",
      categoryId: "fire",
      borderColorKey: "rust",
      iconAssetKey: "flame-outline",
      imageKey: "fire_and_warmth_one_match_fire_starter",
      earnType: "WITNESS_REQUIRED",
      description: "Start a fire using only one match.",
      requirements: ["Prepare proper tinder bundle", "Arrange kindling correctly", "Light fire with single match", "Have a fellow camper witness"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 10,
    },
    {
      name: "Spark Rod Pro",
      categoryId: "fire",
      borderColorKey: "amber",
      iconAssetKey: "flash-outline",
      imageKey: "fire_and_warmth_spark_rod_pro",
      earnType: "WITNESS_REQUIRED",
      description: "Start a fire using a ferrocerium rod.",
      requirements: ["Use ferro rod to create sparks", "Catch sparks in tinder", "Build fire from spark", "Have a fellow camper witness"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 11,
    },
    {
      name: "Fire Lay Nerd",
      categoryId: "fire",
      borderColorKey: "gold",
      iconAssetKey: "layers-outline",
      imageKey: "fire_and_warmth_fire_lay_nerd",
      earnType: "PHOTO_REQUIRED",
      description: "Master different fire lay techniques.",
      requirements: ["Build a teepee fire lay", "Build a log cabin fire lay", "Build a lean-to fire lay", "Take photos of each"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 12,
    },
    {
      name: "Wet Wood Negotiator",
      categoryId: "fire",
      borderColorKey: "teal",
      iconAssetKey: "water-outline",
      imageKey: "fire_and_warmth_wet_wood_negotiator",
      earnType: "WITNESS_REQUIRED",
      description: "Successfully start a fire with damp wood.",
      requirements: ["Find or create dry tinder in wet conditions", "Process wet wood to find dry interior", "Build and maintain fire in rain", "Have a fellow camper witness"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 13,
    },
    {
      name: "Safe Fire Ring Builder",
      categoryId: "fire",
      borderColorKey: "slate",
      iconAssetKey: "ellipse-outline",
      imageKey: "fire_and_warmth_safe_fire_ring_builder",
      earnType: "PHOTO_REQUIRED",
      description: "Construct a proper fire ring or pit.",
      requirements: ["Clear area of flammable materials", "Build ring with appropriate stones", "Ensure proper size for fire", "Take photo of completed ring"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 14,
    },
    {
      name: "Extinguish It Like You Mean It",
      categoryId: "fire",
      borderColorKey: "sage",
      iconAssetKey: "hand-left-outline",
      imageKey: "fire_and_warmth_extinguish_it_like_you_mean_it",
      earnType: "SELF",
      description: "Properly extinguish a campfire completely.",
      requirements: ["Drown fire with water until hissing stops", "Stir ashes and drown again", "Feel ashes to ensure cold", "Scatter cold ashes or restore ring"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 15,
    },
    {
      name: "Perfect Coals Chef",
      categoryId: "fire",
      borderColorKey: "rust",
      iconAssetKey: "bonfire-outline",
      imageKey: "fire_and_warmth_perfect_coals_chef",
      earnType: "PHOTO_REQUIRED",
      description: "Create perfect cooking coals from a fire.",
      requirements: ["Build fire with hardwood", "Let fire burn to coals", "Maintain even coal bed", "Take photo of cooking setup"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 16,
    },
    {
      name: "Campfire Storyteller",
      categoryId: "fire",
      borderColorKey: "violet",
      iconAssetKey: "book-outline",
      imageKey: "fire_and_warmth_campfire_storyteller",
      earnType: "WITNESS_REQUIRED",
      description: "Share a story or lead a sing-along around the campfire.",
      requirements: ["Build and maintain a social fire", "Tell a story or lead activity", "Keep group entertained", "Have group verify participation"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 17,
    },
    {
      name: "Smokeless Fire Sorcerer",
      categoryId: "fire",
      borderColorKey: "sky",
      iconAssetKey: "cloud-outline",
      imageKey: "fire_and_warmth_smokeless_fire_sorcerer",
      earnType: "WITNESS_REQUIRED",
      description: "Build a Dakota fire hole or other smokeless fire.",
      requirements: ["Dig proper hole with air tunnel", "Build fire with minimal smoke", "Maintain efficient burn", "Have a fellow camper witness"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 18,
    },

    // ============================================
    // COOKING & CAMP KITCHEN (9 badges)
    // ============================================
    {
      name: "Camp Chef",
      categoryId: "kitchen",
      borderColorKey: "amber",
      iconAssetKey: "restaurant-outline",
      imageKey: "cooking_and_camp_kitchen_1",
      earnType: "PHOTO_REQUIRED",
      description: "Prepare a complete meal at camp.",
      requirements: ["Plan and prepare a full meal", "Use proper food safety", "Cook over fire or stove", "Take a photo of completed meal"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 19,
    },
    {
      name: "Dutch Oven Master",
      categoryId: "kitchen",
      borderColorKey: "rust",
      iconAssetKey: "flame-outline",
      imageKey: "cooking_and_camp_kitchen_2",
      earnType: "WITNESS_REQUIRED",
      description: "Cook a dish using a Dutch oven over coals.",
      requirements: ["Properly season Dutch oven", "Prepare coals for top and bottom heat", "Cook a complete dish", "Have a fellow camper taste and verify"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 20,
    },
    {
      name: "Backcountry Baker",
      categoryId: "kitchen",
      borderColorKey: "gold",
      iconAssetKey: "nutrition-outline",
      imageKey: "cooking_and_camp_kitchen_3",
      earnType: "PHOTO_REQUIRED",
      description: "Bake bread or pastries in the backcountry.",
      requirements: ["Prepare dough at camp", "Bake using camp method", "Achieve proper texture and doneness", "Take photo of baked goods"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 21,
    },
    {
      name: "One Pot Wonder",
      categoryId: "kitchen",
      borderColorKey: "teal",
      iconAssetKey: "cafe-outline",
      imageKey: "cooking_and_camp_kitchen_4",
      earnType: "SELF",
      description: "Create a delicious meal using only one pot.",
      requirements: ["Plan a complete one-pot meal", "Include protein, carbs, and vegetables", "Minimize cleanup", "Enjoy your creation"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 22,
    },
    {
      name: "Foil Packet Chef",
      categoryId: "kitchen",
      borderColorKey: "slate",
      iconAssetKey: "cube-outline",
      imageKey: "cooking_and_camp_kitchen_5",
      earnType: "PHOTO_REQUIRED",
      description: "Master the art of foil packet cooking.",
      requirements: ["Prepare ingredients for foil packets", "Wrap packets properly", "Cook over coals or grill", "Take photo of opened packets"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 23,
    },
    {
      name: "Camp Coffee Connoisseur",
      categoryId: "kitchen",
      borderColorKey: "forest",
      iconAssetKey: "cafe-outline",
      imageKey: "cooking_and_camp_kitchen_6",
      earnType: "SELF",
      description: "Brew excellent coffee using camp methods.",
      requirements: ["Use percolator, pour-over, or cowboy method", "Achieve proper extraction", "Serve hot coffee to fellow campers", "No instant coffee allowed"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 24,
    },
    {
      name: "Bear Canister Pro",
      categoryId: "kitchen",
      borderColorKey: "crimson",
      iconAssetKey: "lock-closed-outline",
      imageKey: "cooking_and_camp_kitchen_7",
      earnType: "SELF",
      description: "Properly store food in bear-resistant containers.",
      requirements: ["Pack bear canister efficiently", "Store at proper distance from camp", "Include all scented items", "Retrieve in morning successfully"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 25,
    },
    {
      name: "Leave No Crumbs",
      categoryId: "kitchen",
      borderColorKey: "sage",
      iconAssetKey: "sparkles-outline",
      imageKey: "cooking_and_camp_kitchen_8",
      earnType: "SELF",
      description: "Master camp kitchen cleanup and waste management.",
      requirements: ["Clean all dishes properly", "Strain and pack out food waste", "Leave cooking area spotless", "Properly dispose of grey water"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 26,
    },
    {
      name: "Trail Snack Artist",
      categoryId: "kitchen",
      borderColorKey: "violet",
      iconAssetKey: "fast-food-outline",
      imageKey: "cooking_and_camp_kitchen_9",
      earnType: "PHOTO_REQUIRED",
      description: "Create homemade trail snacks or energy foods.",
      requirements: ["Make trail mix, energy bars, or jerky", "Pack for trail portability", "Share with fellow hikers", "Take photo of your creations"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 27,
    },

    // ============================================
    // COMFORT & SLEEP (9 badges)
    // ============================================
    {
      name: "Sleep System Pro",
      categoryId: "sleep",
      borderColorKey: "teal",
      iconAssetKey: "moon-outline",
      imageKey: "comfort_and_sleep_1",
      earnType: "SELF",
      description: "Set up a complete sleep system for comfort.",
      requirements: ["Choose appropriate sleeping bag", "Set up sleeping pad properly", "Use pillow or stuff sack", "Position gear for night access"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 28,
    },
    {
      name: "Cold Weather Sleeper",
      categoryId: "sleep",
      borderColorKey: "sky",
      iconAssetKey: "snow-outline",
      imageKey: "comfort_and_sleep_2",
      earnType: "WITNESS_REQUIRED",
      description: "Successfully sleep through a cold night.",
      requirements: ["Use proper insulation rating", "Employ layering techniques", "Manage moisture properly", "Have fellow camper verify morning comfort"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 29,
    },
    {
      name: "Ground Sleeper",
      categoryId: "sleep",
      borderColorKey: "forest",
      iconAssetKey: "earth-outline",
      imageKey: "comfort_and_sleep_3",
      earnType: "SELF",
      description: "Sleep comfortably without a tent.",
      requirements: ["Sleep under stars or tarp", "Choose appropriate location", "Manage ground moisture", "Wake rested and dry"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 30,
    },
    {
      name: "Night Routine Master",
      categoryId: "sleep",
      borderColorKey: "violet",
      iconAssetKey: "time-outline",
      imageKey: "comfort_and_sleep_4",
      earnType: "SELF",
      description: "Establish an efficient camp night routine.",
      requirements: ["Complete camp chores before dark", "Prepare for morning needs", "Secure camp properly", "Be ready for bed efficiently"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 31,
    },
    {
      name: "Early Riser",
      categoryId: "sleep",
      borderColorKey: "amber",
      iconAssetKey: "sunny-outline",
      imageKey: "comfort_and_sleep_5",
      earnType: "PHOTO_REQUIRED",
      description: "Wake before sunrise and enjoy the morning.",
      requirements: ["Wake before dawn", "Watch the sunrise", "Prepare breakfast early", "Take photo of sunrise from camp"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 32,
    },
    {
      name: "Rain Sleeper",
      categoryId: "sleep",
      borderColorKey: "slate",
      iconAssetKey: "rainy-outline",
      imageKey: "comfort_and_sleep_6",
      earnType: "SELF",
      description: "Sleep through a rainy night and stay dry.",
      requirements: ["Set up proper rain protection", "Manage tent condensation", "Keep gear dry", "Wake up dry in the morning"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 33,
    },
    {
      name: "Ultralight Sleeper",
      categoryId: "sleep",
      borderColorKey: "sage",
      iconAssetKey: "scale-outline",
      imageKey: "comfort_and_sleep_7",
      earnType: "SELF",
      description: "Sleep comfortably with minimalist gear.",
      requirements: ["Use sub-3lb sleep system", "Maintain comfort through night", "Pack efficiently", "Complete full night of sleep"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 34,
    },
    {
      name: "Camp Comfort Engineer",
      categoryId: "sleep",
      borderColorKey: "gold",
      iconAssetKey: "construct-outline",
      imageKey: "comfort_and_sleep_8",
      earnType: "PHOTO_REQUIRED",
      description: "Create luxury comfort in a camp setting.",
      requirements: ["Set up comfortable seating area", "Create ambient lighting", "Organize relaxation space", "Take photo of comfort setup"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 35,
    },
    {
      name: "Siesta Champion",
      categoryId: "sleep",
      borderColorKey: "rust",
      iconAssetKey: "bed-outline",
      imageKey: "comfort_and_sleep_9",
      earnType: "SELF",
      description: "Master the art of the camp nap.",
      requirements: ["Find perfect nap spot", "Set up quick shade if needed", "Nap for at least 20 minutes", "Wake refreshed for afternoon activities"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 36,
    },

    // ============================================
    // NAVIGATION & SKILLS (9 badges)
    // ============================================
    {
      name: "Map Reader",
      categoryId: "nav",
      borderColorKey: "sky",
      iconAssetKey: "map-outline",
      imageKey: "navigation_and_skills_1",
      earnType: "SELF",
      description: "Navigate using a topographic map and compass.",
      requirements: ["Orient map using compass", "Identify terrain features", "Plot a route to destination", "Navigate without GPS"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 37,
    },
    {
      name: "Knot Master",
      categoryId: "nav",
      borderColorKey: "slate",
      iconAssetKey: "link-outline",
      imageKey: "navigation_and_skills_2",
      earnType: "WITNESS_REQUIRED",
      description: "Demonstrate proficiency in essential knots.",
      requirements: ["Tie a Bowline knot", "Tie a Taut-Line Hitch", "Tie a Clove Hitch", "Have a fellow camper verify each"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 38,
    },
    {
      name: "Trail Blazer",
      categoryId: "nav",
      borderColorKey: "forest",
      iconAssetKey: "footsteps-outline",
      imageKey: "navigation_and_skills_3",
      earnType: "SELF",
      description: "Navigate off-trail using natural navigation.",
      requirements: ["Use sun position for direction", "Read terrain for route finding", "Leave no trace of passage", "Reach destination successfully"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 39,
    },
    {
      name: "GPS Navigator",
      categoryId: "nav",
      borderColorKey: "teal",
      iconAssetKey: "location-outline",
      imageKey: "navigation_and_skills_4",
      earnType: "SELF",
      description: "Master GPS navigation for backcountry travel.",
      requirements: ["Mark waypoints accurately", "Follow GPS route", "Use GPS for emergency location", "Save battery efficiently"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 40,
    },
    {
      name: "Night Navigator",
      categoryId: "nav",
      borderColorKey: "violet",
      iconAssetKey: "moon-outline",
      imageKey: "navigation_and_skills_5",
      earnType: "WITNESS_REQUIRED",
      description: "Navigate safely in darkness.",
      requirements: ["Navigate using stars or compass at night", "Use headlamp effectively", "Maintain situational awareness", "Have fellow camper verify safe navigation"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 41,
    },
    {
      name: "River Crosser",
      categoryId: "nav",
      borderColorKey: "sky",
      iconAssetKey: "water-outline",
      imageKey: "navigation_and_skills_6",
      earnType: "WITNESS_REQUIRED",
      description: "Safely cross a stream or river.",
      requirements: ["Scout crossing location", "Use proper crossing technique", "Keep gear dry", "Have fellow camper witness safe crossing"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 42,
    },
    {
      name: "Pace Counter",
      categoryId: "nav",
      borderColorKey: "amber",
      iconAssetKey: "analytics-outline",
      imageKey: "navigation_and_skills_7",
      earnType: "SELF",
      description: "Use pace counting for distance estimation.",
      requirements: ["Calibrate your pace count", "Use pace beads or counter", "Estimate distance within 10%", "Navigate a measured course"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 43,
    },
    {
      name: "Terrain Associator",
      categoryId: "nav",
      borderColorKey: "rust",
      iconAssetKey: "layers-outline",
      imageKey: "navigation_and_skills_8",
      earnType: "SELF",
      description: "Match map features to real terrain.",
      requirements: ["Identify hills and valleys", "Locate on map using terrain", "Predict terrain from map", "Navigate using terrain association"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 44,
    },
    {
      name: "Emergency Signal Pro",
      categoryId: "nav",
      borderColorKey: "crimson",
      iconAssetKey: "warning-outline",
      imageKey: "navigation_and_skills_9",
      earnType: "SELF",
      description: "Know emergency signaling techniques.",
      requirements: ["Know whistle signal patterns", "Create ground-to-air signals", "Use mirror for signaling", "Understand international distress signals"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 45,
    },

    // ============================================
    // SAFETY & READINESS (9 badges)
    // ============================================
    {
      name: "First Aid Ready",
      categoryId: "safety",
      borderColorKey: "crimson",
      iconAssetKey: "medkit-outline",
      imageKey: "safety_and_readiness_1",
      earnType: "SELF",
      description: "Assemble a complete camping first aid kit.",
      requirements: ["Include bandages, antiseptic, medications", "Add emergency blanket and whistle", "Include personal medications", "Know how to use each item"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 46,
    },
    {
      name: "Weather Watcher",
      categoryId: "safety",
      borderColorKey: "sky",
      iconAssetKey: "cloud-outline",
      imageKey: "safety_and_readiness_2",
      earnType: "SELF",
      description: "Monitor and prepare for weather changes.",
      requirements: ["Check forecast before trip", "Identify signs of changing weather", "Secure camp for incoming weather", "Know when to seek shelter"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 47,
    },
    {
      name: "Water Purifier",
      categoryId: "safety",
      borderColorKey: "teal",
      iconAssetKey: "water-outline",
      imageKey: "safety_and_readiness_3",
      earnType: "WITNESS_REQUIRED",
      description: "Purify water using multiple methods.",
      requirements: ["Use a water filter", "Purify using chemical treatment", "Boil water for drinking", "Have fellow camper verify technique"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 48,
    },
    {
      name: "Wildlife Safety Pro",
      categoryId: "safety",
      borderColorKey: "amber",
      iconAssetKey: "paw-outline",
      imageKey: "safety_and_readiness_4",
      earnType: "SELF",
      description: "Know how to camp safely in wildlife areas.",
      requirements: ["Store food properly", "Know animal encounter protocols", "Make noise on trails", "Respect wildlife distances"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 49,
    },
    {
      name: "Lightning Aware",
      categoryId: "safety",
      borderColorKey: "violet",
      iconAssetKey: "flash-outline",
      imageKey: "safety_and_readiness_5",
      earnType: "SELF",
      description: "Know lightning safety protocols.",
      requirements: ["Count seconds after lightning", "Know safe shelter locations", "Understand lightning position", "Know when to descend from heights"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 50,
    },
    {
      name: "Hypothermia Preventer",
      categoryId: "safety",
      borderColorKey: "slate",
      iconAssetKey: "thermometer-outline",
      imageKey: "safety_and_readiness_6",
      earnType: "SELF",
      description: "Know how to prevent and treat hypothermia.",
      requirements: ["Recognize hypothermia signs", "Know layering principles", "Understand wet cold dangers", "Know warming techniques"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 51,
    },
    {
      name: "Leave Trip Plans",
      categoryId: "safety",
      borderColorKey: "forest",
      iconAssetKey: "document-text-outline",
      imageKey: "safety_and_readiness_7",
      earnType: "SELF",
      description: "Always leave detailed trip plans.",
      requirements: ["File trip plan with contact", "Include route and timeline", "Specify check-in times", "Include emergency contacts"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 52,
    },
    {
      name: "Ten Essentials Carrier",
      categoryId: "safety",
      borderColorKey: "gold",
      iconAssetKey: "bag-outline",
      imageKey: "safety_and_readiness_8",
      earnType: "PHOTO_REQUIRED",
      description: "Always carry the ten essentials.",
      requirements: ["Navigation tools", "Sun protection", "Insulation and shelter", "Take photo of your ten essentials"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 53,
    },
    {
      name: "Situational Awareness",
      categoryId: "safety",
      borderColorKey: "rust",
      iconAssetKey: "eye-outline",
      imageKey: "safety_and_readiness_9",
      earnType: "SELF",
      description: "Maintain awareness of your surroundings.",
      requirements: ["Scan for hazards regularly", "Note landmark positions", "Track weather changes", "Know your exit routes"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 54,
    },

    // ============================================
    // NATURE NERD (9 badges)
    // ============================================
    {
      name: "Wildlife Observer",
      categoryId: "nature",
      borderColorKey: "forest",
      iconAssetKey: "eye-outline",
      imageKey: "nature_nerd_1",
      earnType: "PHOTO_REQUIRED",
      description: "Observe and photograph wildlife.",
      requirements: ["Spot wildlife from safe distance", "Do not disturb animals", "Take a photo of wildlife", "Note species and behavior"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 55,
    },
    {
      name: "Star Gazer",
      categoryId: "nature",
      borderColorKey: "violet",
      iconAssetKey: "star-outline",
      imageKey: "nature_nerd_2",
      earnType: "SELF",
      description: "Identify constellations in the night sky.",
      requirements: ["Identify the Big Dipper and North Star", "Find at least 3 other constellations", "Use a star map to verify", "Best on clear moonless night"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 56,
    },
    {
      name: "Plant Identifier",
      categoryId: "nature",
      borderColorKey: "sage",
      iconAssetKey: "leaf-outline",
      imageKey: "nature_nerd_3",
      earnType: "PHOTO_REQUIRED",
      description: "Identify native plants at your campsite.",
      requirements: ["Identify at least 5 native plants", "Know plants to avoid", "Take photos of each plant", "Note interesting facts"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 57,
    },
    {
      name: "Bird Watcher",
      categoryId: "nature",
      borderColorKey: "sky",
      iconAssetKey: "egg-outline",
      imageKey: "nature_nerd_4",
      earnType: "SELF",
      description: "Identify birds by sight or sound.",
      requirements: ["Identify at least 5 bird species", "Note distinctive calls", "Observe nesting behavior", "Use a field guide"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 58,
    },
    {
      name: "Track Reader",
      categoryId: "nature",
      borderColorKey: "amber",
      iconAssetKey: "paw-outline",
      imageKey: "nature_nerd_5",
      earnType: "PHOTO_REQUIRED",
      description: "Identify animal tracks and signs.",
      requirements: ["Find and identify animal tracks", "Note scat or other signs", "Determine animal direction", "Take photos of tracks"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 59,
    },
    {
      name: "Weather Reader",
      categoryId: "nature",
      borderColorKey: "slate",
      iconAssetKey: "partly-sunny-outline",
      imageKey: "nature_nerd_6",
      earnType: "SELF",
      description: "Predict weather using natural signs.",
      requirements: ["Read cloud formations", "Note wind direction changes", "Observe animal behavior", "Successfully predict weather"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 60,
    },
    {
      name: "Leave No Trace Expert",
      categoryId: "nature",
      borderColorKey: "forest",
      iconAssetKey: "ribbon-outline",
      imageKey: "nature_nerd_7",
      earnType: "SELF",
      description: "Know and practice all 7 LNT principles.",
      requirements: ["Plan ahead and prepare", "Travel on durable surfaces", "Dispose of waste properly", "Leave what you find"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 61,
    },
    {
      name: "Geology Nerd",
      categoryId: "nature",
      borderColorKey: "rust",
      iconAssetKey: "diamond-outline",
      imageKey: "nature_nerd_8",
      earnType: "PHOTO_REQUIRED",
      description: "Identify rock types and geological features.",
      requirements: ["Identify igneous, sedimentary, metamorphic rocks", "Note geological formations", "Find interesting specimens", "Take photos of finds"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 62,
    },
    {
      name: "Sunrise/Sunset Chaser",
      categoryId: "nature",
      borderColorKey: "gold",
      iconAssetKey: "sunny-outline",
      imageKey: "nature_nerd_9",
      earnType: "PHOTO_REQUIRED",
      description: "Capture beautiful sunrise or sunset photos.",
      requirements: ["Find scenic viewpoint", "Arrive before golden hour", "Take stunning photos", "Share with fellow campers"],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 63,
    },
  ];

  let created = 0;
  let skipped = 0;

  const batch = writeBatch(db);
  const defsRef = collection(db, "badgeDefinitions");

  // Check existing badges
  const existingDocs = await getDocs(defsRef);
  const existingNames = new Set(existingDocs.docs.map((d) => d.data().name));

  for (const badge of SEED_BADGES) {
    if (existingNames.has(badge.name)) {
      skipped++;
      continue;
    }

    const newDocRef = doc(defsRef);
    batch.set(newDocRef, {
      ...badge,
      createdAt: serverTimestamp(),
    });
    created++;
  }

  if (created > 0) {
    await batch.commit();
  }

  return { created, skipped };
}
