/**
 * Campground Contacts & Trip Participants Types
 * For managing camping contacts and trip people
 */

import { Timestamp } from "firebase/firestore";

export type ParticipantRole = "host" | "co_host" | "guest" | "kid" | "pet" | "other";

export interface CampgroundContact {
  id: string;
  ownerId: string;
  contactUserId?: string | null;
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactNote?: string | null;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface TripParticipant {
  id: string;
  campgroundContactId: string;
  role: ParticipantRole;
  createdAt: Timestamp | string;
}

export interface CreateContactData {
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  contactNote?: string;
}

export interface UpdateContactData {
  contactName?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactNote?: string | null;
}

export interface ParticipantWithRole {
  contactId: string;
  role: ParticipantRole;
}

// ============================================
// CAMPGROUND INVITE TYPES
// ============================================

export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";
export type InviteSendMethod = "email" | "text" | "copy";

export interface CampgroundInvite {
  id: string;
  inviterUid: string;
  inviterName: string;
  inviteeEmail?: string | null;
  inviteePhone?: string | null;
  campgroundId: string;
  token: string;
  status: InviteStatus;
  createdAt: Timestamp | string;
  expiresAt: Timestamp | string;
  lastSentAt?: Timestamp | string | null;
  lastSendMethod?: InviteSendMethod | null;
  lastSendError?: string | null;
  acceptedAt?: Timestamp | string | null;
  acceptedUid?: string | null;
}

export interface CreateInviteData {
  inviteeEmail?: string;
  inviteePhone?: string;
  inviterName: string;
  campgroundId: string;
}

export interface CreateInviteResult {
  success: boolean;
  inviteId: string;
  token: string;
  inviteLink: string;
}

export interface SendInviteEmailResult {
  success: boolean;
  message: string;
}

export interface RedeemInviteResult {
  success: boolean;
  message: string;
  inviterName: string;
  contactId: string;
}
