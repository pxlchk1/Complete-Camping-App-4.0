/**
 * Deep Link Handler
 * Handles incoming deep links for campground invitations
 */

import * as Linking from "expo-linking";
import { db, auth } from "../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export interface InvitationData {
  recipientEmail: string;
  recipientName: string;
  inviterId: string;
  inviterName: string;
  status: "pending" | "accepted" | "expired";
  createdAt: any;
  expiresAt: any;
}

/**
 * Parse invitation token from deep link URL
 */
export function parseInvitationLink(url: string): string | null {
  const parsed = Linking.parse(url);
  
  // Handle tentlantern://invite/{token}
  if (parsed.hostname === "invite" && parsed.path) {
    return parsed.path.replace(/^\//, "");
  }
  
  // Handle https://tentlantern.app/invite/{token}
  if (parsed.path?.startsWith("/invite/")) {
    return parsed.path.replace("/invite/", "");
  }
  
  return null;
}

/**
 * Parse campground invite token from deep link URL
 * Handles the new invite format: https://tentandlantern.com/join?token=<token>
 */
export function parseCampgroundInviteToken(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    
    // Handle https://tentandlantern.com/join?token=<token>
    if (parsed.path === "/join" || parsed.path === "join") {
      return parsed.queryParams?.token as string || null;
    }
    
    // Handle tentlantern://join?token=<token>
    if (parsed.hostname === "join") {
      return parsed.queryParams?.token as string || null;
    }
    
    return null;
  } catch (error) {
    console.error("[DeepLink] Error parsing invite token:", error);
    return null;
  }
}

/**
 * Get invitation data from Firestore
 */
export async function getInvitationData(
  invitationToken: string
): Promise<InvitationData | null> {
  try {
    const invitationRef = doc(db, "campgroundInvitations", invitationToken);
    const invitationSnap = await getDoc(invitationRef);

    if (!invitationSnap.exists()) {
      console.log("[DeepLink] Invitation not found:", invitationToken);
      return null;
    }

    const data = invitationSnap.data() as InvitationData;

    // Check if expired
    const now = new Date();
    const expiresAt = data.expiresAt?.toDate();
    if (expiresAt && now > expiresAt) {
      return { ...data, status: "expired" };
    }

    return data;
  } catch (error) {
    console.error("[DeepLink] Error fetching invitation:", error);
    return null;
  }
}

/**
 * Accept invitation (for already signed-in users)
 */
export async function acceptInvitation(
  invitationToken: string
): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error("Must be signed in to accept invitation");
    }

    const invitationData = await getInvitationData(invitationToken);
    if (!invitationData) {
      throw new Error("Invitation not found");
    }

    if (invitationData.status === "expired") {
      throw new Error("This invitation has expired");
    }

    if (invitationData.status === "accepted") {
      // Already accepted, just return true
      return true;
    }

    // Verify email matches
    if (invitationData.recipientEmail.toLowerCase() !== user.email.toLowerCase()) {
      throw new Error(
        `This invitation was sent to ${invitationData.recipientEmail}. Please sign in with that email address.`
      );
    }

    // Add user to inviter's campground contacts
    const { createCampgroundContact } = await import("./campgroundContactsService");
    await createCampgroundContact(invitationData.inviterId, {
      contactName: invitationData.recipientName,
      contactEmail: user.email,
      contactNote: `Added via invitation on ${new Date().toLocaleDateString()}`,
    });

    // Mark invitation as accepted
    const invitationRef = doc(db, "campgroundInvitations", invitationToken);
    await updateDoc(invitationRef, {
      status: "accepted",
      acceptedAt: new Date(),
      acceptedByUserId: user.uid,
    });

    console.log("[DeepLink] Invitation accepted:", invitationToken);
    return true;
  } catch (error) {
    console.error("[DeepLink] Error accepting invitation:", error);
    throw error;
  }
}
