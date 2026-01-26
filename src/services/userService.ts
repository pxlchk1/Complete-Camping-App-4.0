/**
 * Firebase User Service
 * Handles user profile, roles, memberships, and moderation
 */

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import firebaseApp from "../config/firebase";
import {
  User,
  UserRole,
  MembershipDuration,
  MembershipGrant,
  ContentModeration,
  AuditLog,
} from "../types/user";

const db = getFirestore(firebaseApp);

// ==================== User Profile ====================

export async function getUser(userId: string): Promise<User | null> {
  const userRef = doc(db, "profiles", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return { id: userSnap.id, ...userSnap.data() } as User;
}

export async function getUserByHandle(handle: string): Promise<User | null> {
  const usersRef = collection(db, "profiles");
  const q = query(usersRef, where("handle", "==", handle));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as User;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const usersRef = collection(db, "profiles");
  const q = query(usersRef, where("email", "==", email));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as User;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, "displayName" | "photoURL" | "handle">>
): Promise<void> {
  const userRef = doc(db, "profiles", userId);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

// ==================== Membership Management ====================

export async function grantMembership(
  adminId: string,
  targetUserId: string,
  duration: MembershipDuration
): Promise<void> {
  const userRef = doc(db, "profiles", targetUserId);

  let expiresAt: string | undefined;
  if (duration !== "lifetime") {
    const now = new Date();
    const months = {
      "1_month": 1,
      "3_months": 3,
      "6_months": 6,
      "1_year": 12,
      "lifetime": 0,
    }[duration];

    now.setMonth(now.getMonth() + months);
    expiresAt = now.toISOString();
  }

  // Update user membership
  await updateDoc(userRef, {
    membershipTier: "subscribed",
    membershipExpiresAt: expiresAt || null,
    updatedAt: new Date().toISOString(),
  });

  // Create membership grant record
  const grantsRef = collection(db, "membershipGrants");
  await addDoc(grantsRef, {
    userId: targetUserId,
    grantedBy: adminId,
    duration,
    grantedAt: new Date().toISOString(),
    expiresAt: expiresAt || null,
  });

  // Log the action
  await logAuditAction(
    adminId,
    "grant_membership",
    targetUserId,
    undefined,
    `Granted ${duration} membership`
  );
}

// ==================== User Banning ====================

export async function banUser(
  adminId: string,
  targetUserId: string,
  reason: string
): Promise<void> {
  const userRef = doc(db, "profiles", targetUserId);

  await updateDoc(userRef, {
    isBanned: true,
    bannedAt: new Date().toISOString(),
    bannedBy: adminId,
    banReason: reason,
    updatedAt: new Date().toISOString(),
  });

  await logAuditAction(
    adminId,
    "ban_user",
    targetUserId,
    undefined,
    `Banned user: ${reason}`
  );
}

export async function unbanUser(
  adminId: string,
  targetUserId: string
): Promise<void> {
  const userRef = doc(db, "profiles", targetUserId);

  await updateDoc(userRef, {
    isBanned: false,
    bannedAt: null,
    bannedBy: null,
    banReason: null,
    updatedAt: new Date().toISOString(),
  });

  await logAuditAction(
    adminId,
    "unban_user",
    targetUserId,
    undefined,
    "Unbanned user"
  );
}

// ==================== Content Moderation ====================

export async function hideContent(
  moderatorId: string,
  contentType: ContentModeration["contentType"],
  contentId: string,
  contentOwnerId: string,
  reason: string
): Promise<void> {
  const moderationRef = collection(db, "contentModeration");

  await addDoc(moderationRef, {
    contentType,
    contentId,
    userId: contentOwnerId,
    moderatedBy: moderatorId,
    moderatedAt: new Date().toISOString(),
    reason,
    isHidden: true,
    createdAt: new Date().toISOString(),
  });

  await logAuditAction(
    moderatorId,
    "hide_content",
    contentOwnerId,
    contentId,
    `Hidden ${contentType}: ${reason}`
  );
}

export async function unhideContent(
  moderatorId: string,
  moderationId: string
): Promise<void> {
  const moderationRef = doc(db, "contentModeration", moderationId);

  await updateDoc(moderationRef, {
    isHidden: false,
    moderatedAt: new Date().toISOString(),
    moderatedBy: moderatorId,
  });

  await logAuditAction(
    moderatorId,
    "unhide_content",
    undefined,
    moderationId,
    "Unhidden content"
  );
}

export async function getHiddenContentByUser(userId: string): Promise<ContentModeration[]> {
  const moderationRef = collection(db, "contentModeration");
  const q = query(
    moderationRef,
    where("userId", "==", userId),
    where("isHidden", "==", true)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ContentModeration[];
}

// ==================== Role Management ====================

export async function updateUserRole(
  adminId: string,
  targetUserId: string,
  newRole: UserRole
): Promise<void> {
  const userRef = doc(db, "profiles", targetUserId);

  await updateDoc(userRef, {
    role: newRole,
    updatedAt: new Date().toISOString(),
  });

  const action = newRole === "moderator" ? "promote_moderator" : "demote_moderator";
  await logAuditAction(
    adminId,
    action,
    targetUserId,
    undefined,
    `Changed role to ${newRole}`
  );
}

// ==================== Audit Logging ====================

export async function logAuditAction(
  performedBy: string,
  action: AuditLog["action"],
  targetUserId?: string,
  targetContentId?: string,
  details?: string
): Promise<void> {
  const auditRef = collection(db, "auditLogs");

  await addDoc(auditRef, {
    action,
    performedBy,
    targetUserId: targetUserId || null,
    targetContentId: targetContentId || null,
    details: details || "",
    timestamp: new Date().toISOString(),
  });
}

export async function getAuditLogs(limit: number = 50): Promise<AuditLog[]> {
  const auditRef = collection(db, "auditLogs");
  const snapshot = await getDocs(auditRef);

  const logs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as AuditLog[];

  // Sort by timestamp descending and limit
  return logs.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, limit);
}

// ==================== Email Subscribers ====================

export async function createEmailSubscriber(data: {
  userId: string;
  emailAddress: string;
  firstname: string;
  subscriptionStatus?: string;
}): Promise<void> {
  const subscriberRef = doc(db, "emailSubscribers", data.userId);
  
  await setDoc(subscriberRef, {
    emailAddress: data.emailAddress,
    firstname: data.firstname,
    subscribedAt: new Date().toISOString(),
    subscriptionStatus: data.subscriptionStatus || "subscribed",
  });
}

export async function updateEmailSubscriberStatus(
  userId: string,
  status: string
): Promise<void> {
  const subscriberRef = doc(db, "emailSubscribers", userId);
  await updateDoc(subscriberRef, {
    subscriptionStatus: status,
  });
}

export async function createUserProfile(data: {
  userId: string;
  email: string;
  displayName: string;
  handle: string;
}): Promise<void> {
  const userRef = doc(db, "profiles", data.userId);
  
  // Check if this is the admin account
  const isAdmin = data.email.toLowerCase() === "alana@tentandlantern.com" || 
                  data.handle.toLowerCase() === "tentandlantern";
  
  // Create profile
  await setDoc(userRef, {
    email: data.email,
    displayName: data.displayName,
    handle: data.handle,
    joinedAt: serverTimestamp(),
    membershipTier: isAdmin ? "isAdmin" : "freeMember",
    role: isAdmin ? "administrator" : "user",
    stats: {
      gearReviewsCount: 0,
      photosCount: 0,
      questionsCount: 0,
      tipsCount: 0,
      tripsCount: 0,
    },
    avatarUrl: null,
    backgroundUrl: null,
    bio: null,
    campingStyle: null,
    location: null,
  });

  // Extract first name from display name
  const firstname = data.displayName.split(' ')[0] || data.displayName;

  // Create email subscriber record
  await createEmailSubscriber({
    userId: data.userId,
    emailAddress: data.email,
    firstname,
    subscriptionStatus: "subscribed",
  });
}

// ==================== Permission Checks ====================

export function isAdmin(user: User): boolean {
  return user.membershipTier === "isAdmin" || 
         user.role === "administrator" ||
         (user.role as string) === "admin" ||
         user.email?.toLowerCase() === "alana@tentandlantern.com" ||
         user.handle?.toLowerCase() === "tentandlantern";
}

export function isModerator(user: User): boolean {
  return user.membershipTier === "isModerator";
}

export function hasProAccess(user: User): boolean {
  // Admin has full access
  if (isAdmin(user)) return true;
  
  // Check for paid membership tiers
  return user.membershipTier === "subscribed";
}

export function canModerateContent(user: User): boolean {
  return isAdmin(user) || isModerator(user) || user.role === "moderator" || user.role === "administrator";
}

export function canBanUsers(user: User): boolean {
  return isAdmin(user) || user.role === "administrator";
}

export function canGrantMemberships(user: User): boolean {
  return isAdmin(user) || user.role === "administrator";
}

export function canManageRoles(user: User): boolean {
  return isAdmin(user) || user.role === "administrator";
}
