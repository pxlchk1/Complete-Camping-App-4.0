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
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import firebaseApp, { auth, storage } from "../config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
    const meritBadge = {
      id: badge.id,
      name: badge.name,
      icon: badge.iconAssetKey,
      color: badge.borderColorKey,
      earnedAt: serverTimestamp(),
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
    // Camp Setup & Shelter
    {
      name: "Tent Master",
      categoryId: "setup",
      borderColorKey: "forest",
      iconAssetKey: "home-outline",
      earnType: "WITNESS_REQUIRED",
      description: "Set up your tent like a pro - properly staked, rain fly secured, and ready for any weather.",
      requirements: [
        "Set up tent with all stakes properly secured",
        "Attach and tension rain fly correctly",
        "Position tent on appropriate ground (no rocks, slopes)",
        "Have a fellow camper verify your setup",
      ],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: "Shelter Builder",
      categoryId: "setup",
      borderColorKey: "amber",
      iconAssetKey: "construct-outline",
      earnType: "PHOTO_REQUIRED",
      description: "Build an emergency shelter using natural materials.",
      requirements: [
        "Construct a debris hut or lean-to shelter",
        "Use only natural materials (branches, leaves, etc.)",
        "Shelter must be large enough for one person",
        "Take a photo of your completed shelter",
      ],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 2,
    },
    // Fire & Warmth
    {
      name: "Fire Starter",
      categoryId: "fire",
      borderColorKey: "rust",
      iconAssetKey: "flame-outline",
      earnType: "WITNESS_REQUIRED",
      description: "Successfully start a campfire using proper techniques.",
      requirements: [
        "Prepare a proper fire pit or use designated ring",
        "Gather appropriate tinder, kindling, and fuel",
        "Start fire without matches (flint, bow drill, etc.)",
        "Have a fellow camper witness your fire starting",
      ],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 3,
    },
    {
      name: "Leave No Trace Fire",
      categoryId: "fire",
      borderColorKey: "sage",
      iconAssetKey: "leaf-outline",
      earnType: "SELF",
      description: "Properly extinguish and clean up a campfire.",
      requirements: [
        "Drown fire with water until hissing stops",
        "Stir ashes and drown again",
        "Feel ashes to ensure they are cold",
        "Scatter cold ashes or replace fire ring",
      ],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 4,
    },
    // Cooking & Camp Kitchen
    {
      name: "Camp Chef",
      categoryId: "kitchen",
      borderColorKey: "amber",
      iconAssetKey: "restaurant-outline",
      earnType: "PHOTO_REQUIRED",
      description: "Prepare a complete meal at camp using your camp stove or fire.",
      requirements: [
        "Plan and prepare a full meal (protein, carb, veggie)",
        "Use proper food safety practices",
        "Cook over campfire or camp stove",
        "Take a photo of your completed meal",
      ],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 5,
    },
    {
      name: "Dutch Oven Master",
      categoryId: "kitchen",
      borderColorKey: "rust",
      iconAssetKey: "flame-outline",
      earnType: "WITNESS_REQUIRED",
      description: "Cook a dish using a Dutch oven over coals.",
      requirements: [
        "Properly season or maintain Dutch oven",
        "Prepare coals for top and bottom heat",
        "Cook a complete dish (stew, bread, cobbler, etc.)",
        "Have a fellow camper taste and verify",
      ],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 6,
    },
    // Comfort & Sleep
    {
      name: "Sleep System Pro",
      categoryId: "sleep",
      borderColorKey: "teal",
      iconAssetKey: "moon-outline",
      earnType: "SELF",
      description: "Set up a complete sleep system for a comfortable night outdoors.",
      requirements: [
        "Choose appropriate sleeping bag for temperature",
        "Set up sleeping pad properly",
        "Use pillow or stuff sack for head support",
        "Position gear for easy access at night",
      ],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 7,
    },
    // Navigation & Skills
    {
      name: "Map Reader",
      categoryId: "nav",
      borderColorKey: "sky",
      iconAssetKey: "map-outline",
      earnType: "SELF",
      description: "Navigate using a topographic map and compass.",
      requirements: [
        "Orient map using compass",
        "Identify terrain features on map",
        "Plot a route to a destination",
        "Navigate to the destination without GPS",
      ],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 8,
    },
    {
      name: "Knot Master",
      categoryId: "nav",
      borderColorKey: "slate",
      iconAssetKey: "link-outline",
      earnType: "WITNESS_REQUIRED",
      description: "Demonstrate proficiency in essential camping knots.",
      requirements: [
        "Tie a Bowline knot",
        "Tie a Taut-Line Hitch",
        "Tie a Clove Hitch",
        "Have a fellow camper verify each knot",
      ],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 9,
    },
    // Safety & Readiness
    {
      name: "First Aid Ready",
      categoryId: "safety",
      borderColorKey: "crimson",
      iconAssetKey: "medkit-outline",
      earnType: "SELF",
      description: "Assemble and organize a complete camping first aid kit.",
      requirements: [
        "Include bandages, antiseptic, and medications",
        "Add emergency blanket and whistle",
        "Include any personal medications",
        "Know how to use each item in the kit",
      ],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 10,
    },
    {
      name: "Weather Watcher",
      categoryId: "safety",
      borderColorKey: "sky",
      iconAssetKey: "cloud-outline",
      earnType: "SELF",
      description: "Monitor weather conditions and prepare camp appropriately.",
      requirements: [
        "Check weather forecast before trip",
        "Identify signs of changing weather",
        "Secure camp for incoming weather",
        "Know when to seek shelter",
      ],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 11,
    },
    // Nature Nerd
    {
      name: "Wildlife Observer",
      categoryId: "nature",
      borderColorKey: "forest",
      iconAssetKey: "eye-outline",
      earnType: "PHOTO_REQUIRED",
      description: "Observe and photograph wildlife in their natural habitat.",
      requirements: [
        "Spot wildlife from a safe distance",
        "Do not disturb or approach animals",
        "Take a photo of wild animal(s)",
        "Note the species and behavior observed",
      ],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 12,
    },
    {
      name: "Star Gazer",
      categoryId: "nature",
      borderColorKey: "violet",
      iconAssetKey: "star-outline",
      earnType: "SELF",
      description: "Identify constellations and celestial objects in the night sky.",
      requirements: [
        "Identify the Big Dipper and North Star",
        "Find at least 3 other constellations",
        "Use a star map or app to verify",
        "Best done on a clear, moonless night",
      ],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 13,
    },
    {
      name: "Plant Identifier",
      categoryId: "nature",
      borderColorKey: "sage",
      iconAssetKey: "leaf-outline",
      earnType: "PHOTO_REQUIRED",
      description: "Identify and photograph native plants at your campsite.",
      requirements: [
        "Identify at least 5 native plants",
        "Know which plants to avoid (poison ivy, etc.)",
        "Take photos of each plant identified",
        "Note interesting facts about each",
      ],
      isLimitedEdition: false,
      isActive: true,
      sortOrder: 14,
    },
    // Seasonal (Summer example)
    {
      name: "Summer Solstice Camper",
      categoryId: "seasonal",
      borderColorKey: "gold",
      iconAssetKey: "sunny-outline",
      earnType: "SELF",
      description: "Camp during the summer solstice and experience the longest day of the year.",
      requirements: [
        "Camp on or near June 20-21",
        "Watch the sunrise or sunset",
        "Enjoy the extended daylight hours",
        "Reflect on the changing seasons",
      ],
      seasonWindow: {
        seasonId: "summer",
        startsAt: new Date("2025-06-15"),
        endsAt: new Date("2025-06-25"),
      },
      isLimitedEdition: true,
      limitedYear: 2025,
      isActive: true,
      sortOrder: 15,
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
