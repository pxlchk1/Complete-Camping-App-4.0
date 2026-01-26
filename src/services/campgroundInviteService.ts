/**
 * Campground Invite Service
 * Handles creating, sending, and redeeming campground invites
 * Uses Firebase Cloud Functions with SendGrid for email delivery
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import firebaseApp from "../config/firebase";
import {
  CampgroundInvite,
  CreateInviteData,
  CreateInviteResult,
  SendInviteEmailResult,
  RedeemInviteResult,
} from "../types/campground";

const functions = getFunctions(firebaseApp);
const db = getFirestore(firebaseApp);

// Cloud Function callable references
const createCampgroundInviteFunc = httpsCallable<CreateInviteData, CreateInviteResult>(
  functions,
  "createCampgroundInvite"
);
const sendCampgroundInviteEmailFunc = httpsCallable<{ inviteId: string }, SendInviteEmailResult>(
  functions,
  "sendCampgroundInviteEmail"
);
const redeemCampgroundInviteFunc = httpsCallable<{ token: string }, RedeemInviteResult>(
  functions,
  "redeemCampgroundInvite"
);

interface CheckPendingInvitesResult {
  processed: number;
  expired?: number;
  message: string;
  inviterNames?: string[];
}

const checkPendingInvitesOnLoginFunc = httpsCallable<Record<string, never>, CheckPendingInvitesResult>(
  functions,
  "checkPendingInvitesOnLogin"
);

/**
 * Create a new campground invite
 * This creates the invite record in Firestore via Cloud Function
 */
export async function createCampgroundInvite(
  data: CreateInviteData
): Promise<CreateInviteResult> {
  try {
    const result = await createCampgroundInviteFunc(data);
    return result.data;
  } catch (error: any) {
    console.error("Error creating campground invite:", error);
    throw new Error(error.message || "Failed to create invite");
  }
}

/**
 * Send invite email via Cloud Function (uses SendGrid)
 */
export async function sendCampgroundInviteEmail(
  inviteId: string
): Promise<SendInviteEmailResult> {
  try {
    const result = await sendCampgroundInviteEmailFunc({ inviteId });
    return result.data;
  } catch (error: any) {
    console.error("Error sending invite email:", error);
    // Firebase Functions errors have specific structure
    const errorMessage = error?.details || error?.message || "Failed to send invite email";
    throw new Error(errorMessage);
  }
}

/**
 * Redeem an invite by token
 * This adds the current user to the inviter's campground
 */
export async function redeemCampgroundInvite(
  token: string
): Promise<RedeemInviteResult> {
  try {
    const result = await redeemCampgroundInviteFunc({ token });
    return result.data;
  } catch (error: any) {
    console.error("Error redeeming invite:", error);
    throw new Error(error.message || "Failed to redeem invite");
  }
}

/**
 * Get an invite by ID (for display purposes)
 */
export async function getCampgroundInviteById(
  inviteId: string
): Promise<CampgroundInvite | null> {
  try {
    const inviteRef = doc(db, "campgroundInvites", inviteId);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      return null;
    }

    return {
      id: inviteSnap.id,
      ...inviteSnap.data(),
    } as CampgroundInvite;
  } catch (error: any) {
    console.error("Error getting invite:", error);
    throw new Error(error.message || "Failed to get invite");
  }
}

/**
 * Get all pending invites for the current user (as inviter)
 */
export async function getPendingInvitesByInviter(
  inviterUid: string
): Promise<CampgroundInvite[]> {
  try {
    const invitesRef = collection(db, "campgroundInvites");
    const q = query(
      invitesRef,
      where("inviterUid", "==", inviterUid),
      where("status", "==", "pending")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CampgroundInvite[];
  } catch (error: any) {
    console.error("Error getting pending invites:", error);
    return [];
  }
}

/**
 * Check if there's an existing pending invite for a specific email
 */
export async function findPendingInviteByEmail(
  inviterUid: string,
  email: string
): Promise<CampgroundInvite | null> {
  try {
    const invitesRef = collection(db, "campgroundInvites");
    const q = query(
      invitesRef,
      where("inviterUid", "==", inviterUid),
      where("inviteeEmail", "==", email.toLowerCase()),
      where("status", "==", "pending")
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as CampgroundInvite;
  } catch (error: any) {
    console.error("Error finding pending invite:", error);
    return null;
  }
}

/**
 * Generate invite link from token
 * Uses centralized app links config
 */
export function getInviteLink(token: string): string {
  // Import inline to avoid circular dependency
  const { getInviteLinkUrl } = require("../constants/appLinks");
  return getInviteLinkUrl(token);
}

/**
 * Extract first name from full name
 */
function getFirstName(fullName: string): string {
  if (!fullName || fullName.trim() === "") return "A friend";
  const firstName = fullName.trim().split(/\s+/)[0];
  return firstName || "A friend";
}

/**
 * Generate invite message for text/share
 * Uses first name only, App Store link, and short invite code
 * (Deep links to tentandlantern.com are not configured, so we use App Store)
 */
export function generateInviteMessage(inviterName: string, inviteToken: string): string {
  const firstName = getFirstName(inviterName);
  // Import inline to avoid circular dependency
  const { generateShareInviteMessage } = require("../constants/appLinks");
  return generateShareInviteMessage(firstName, inviteToken);
}

/**
 * Check for pending invites on user login
 * This handles the case where an invite was sent to an existing user
 * Returns info about any invites that were automatically accepted
 */
export async function checkPendingInvitesOnLogin(): Promise<CheckPendingInvitesResult> {
  try {
    const result = await checkPendingInvitesOnLoginFunc({});
    console.log("[CampgroundInvite] Check pending invites result:", result.data);
    return result.data;
  } catch (error: any) {
    console.error("[CampgroundInvite] Error checking pending invites:", error);
    // Don't throw - this is a non-critical background check
    return { processed: 0, message: "Failed to check invites" };
  }
}
