/**
 * Email Service
 * Handles sending emails via Firebase Cloud Functions
 */

import { auth } from "../config/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

/**
 * Generate unique invitation token
 */
function generateInvitationToken(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Send campground invitation email via Cloud Function
 */
export async function sendCampgroundInvitation(
  recipientEmail: string,
  recipientName: string,
  inviterName: string
): Promise<{ success: boolean; invitationToken: string }> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Must be authenticated to send invitation");
    }

    const invitationToken = generateInvitationToken();

    // Call Firebase Cloud Function
    const functions = getFunctions();
    const sendInvitation = httpsCallable(functions, "sendCampgroundInvitation");

    const result = await sendInvitation({
      recipientEmail: recipientEmail.toLowerCase().trim(),
      recipientName: recipientName.trim(),
      inviterName: inviterName.trim(),
      inviterId: user.uid,
      invitationToken,
    });

    console.log("[EmailService] Invitation sent successfully", result.data);

    return {
      success: true,
      invitationToken,
    };
  } catch (error: any) {
    console.error("[EmailService] Error sending invitation:", error);
    
    // Provide user-friendly error message
    if (error.code === "functions/unauthenticated") {
      throw new Error("You must be signed in to send invitations");
    } else if (error.code === "functions/invalid-argument") {
      throw new Error("Please check that all information is correct");
    } else if (error.code === "functions/unavailable") {
      throw new Error("Unable to send invitation. Please check your internet connection");
    } else {
      throw new Error(error.message || "Failed to send invitation. Please try again");
    }
  }
}
