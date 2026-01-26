// User and account types for Firebase

export type UserRole = "user" | "moderator" | "administrator";

export type MembershipTier = "freeMember" | "subscribed" | "isAdmin" | "isModerator";

export type MembershipDuration = "1_month" | "3_months" | "6_months" | "1_year" | "lifetime";

export interface User {
  id: string;
  email: string;
  handle: string;
  displayName: string;
  photoURL?: string;
  coverPhotoURL?: string; // Background photo for profile
  about?: string; // User bio/about section
  favoriteCampingStyle?: string; // Favorite camping style
  favoriteGear?: Record<string, string>; // Object with gear category as key, details as value
  role: UserRole;
  membershipTier: MembershipTier;
  membershipExpiresAt?: string; // ISO string, undefined for lifetime or free
  isProfileContentPublic?: boolean; // Whether profile content (below header) is visible to others. Default true.
  /** Whether user is subscribed to email newsletter */
  emailSubscribed?: boolean;
  /** Whether user has enabled push notifications */
  notificationsEnabled?: boolean;
  isBanned: boolean;
  bannedAt?: string;
  bannedBy?: string; // Admin user ID
  banReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentModeration {
  id: string;
  contentType: "photo" | "comment" | "post" | "question" | "review";
  contentId: string;
  userId: string; // Content creator
  moderatedBy: string; // Moderator/Admin user ID
  moderatedAt: string;
  reason: string;
  isHidden: boolean;
  createdAt: string;
}

export interface MembershipGrant {
  id: string;
  userId: string;
  grantedBy: string; // Admin user ID
  duration: MembershipDuration;
  grantedAt: string;
  expiresAt?: string; // undefined for lifetime
}

export interface AuditLog {
  id: string;
  action: "ban_user" | "unban_user" | "hide_content" | "unhide_content" | "grant_membership" | "revoke_membership" | "promote_moderator" | "demote_moderator";
  performedBy: string; // User ID
  targetUserId?: string;
  targetContentId?: string;
  details: string;
  timestamp: string;
}
