/**
 * Firebase Cloud Functions for Complete Camping App
 * Uses SendGrid for email delivery with Firebase Secrets
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";
import { defineSecret } from "firebase-functions/params";
import * as crypto from "crypto";

// Initialize Firebase Admin
admin.initializeApp();

// Define secrets (set via: firebase functions:secrets:set SENDGRID_API_KEY)
const sendgridApiKey = defineSecret("SENDGRID_API_KEY");
const sendgridFromEmail = defineSecret("SENDGRID_FROM_EMAIL");

// ============================================
// CAMPGROUND INVITE TYPES
// ============================================

interface CampgroundInvite {
  inviterUid: string;
  inviterName: string;
  inviteeEmail?: string;
  inviteePhone?: string;
  campgroundId: string;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  createdAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
  expiresAt: admin.firestore.Timestamp;
  lastSentAt?: admin.firestore.FieldValue | admin.firestore.Timestamp;
  lastSendMethod?: "email" | "text" | "copy";
  lastSendError?: string;
  acceptedAt?: admin.firestore.FieldValue | admin.firestore.Timestamp;
  acceptedUid?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a cryptographically secure random token
 */
function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// App Links Configuration - Update when app is published
const DEEP_LINK_DOMAIN = "tentandlantern.com";
const INVITE_LINK_BASE = `https://${DEEP_LINK_DOMAIN}/join`;

/**
 * Get invite link URL
 */
function getInviteLink(token: string): string {
  return `${INVITE_LINK_BASE}?token=${token}`;
}

/**
 * Extract first name from full name
 */
function getFirstName(fullName: string): string {
  if (!fullName || fullName.trim() === "") return "A friend";
  const firstName = fullName.trim().split(/\s+/)[0];
  return firstName || "A friend";
}

// ============================================
// CREATE INVITE FUNCTION
// ============================================

/**
 * Create a new campground invite
 * Returns the inviteId and token for the client to use
 */
export const createCampgroundInvite = functions.https.onCall(
  async (
    data: {
      inviteeEmail?: string;
      inviteePhone?: string;
      inviterName: string;
      campgroundId: string;
    },
    context
  ) => {
    // Require auth
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to create invites"
      );
    }

    const { inviteeEmail, inviteePhone, inviterName, campgroundId } = data;

    // Validate - need at least email or phone
    if (!inviteeEmail && !inviteePhone) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Must provide either email or phone number"
      );
    }

    if (!inviterName || !campgroundId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: inviterName, campgroundId"
      );
    }

    try {
      const db = admin.firestore();
      const token = generateInviteToken();
      const expiresAt = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
      );

      const inviteData: CampgroundInvite = {
        inviterUid: context.auth.uid,
        inviterName,
        campgroundId,
        token,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
      };

      if (inviteeEmail) {
        inviteData.inviteeEmail = inviteeEmail.toLowerCase();
      }
      if (inviteePhone) {
        inviteData.inviteePhone = inviteePhone;
      }

      const docRef = await db.collection("campgroundInvites").add(inviteData);

      functions.logger.info("Created campground invite", {
        inviteId: docRef.id,
        inviterUid: context.auth.uid,
        campgroundId,
      });

      return {
        success: true,
        inviteId: docRef.id,
        token,
        inviteLink: getInviteLink(token),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("Error creating invite", { error: errorMessage });
      throw new functions.https.HttpsError(
        "internal",
        "Failed to create invite"
      );
    }
  }
);

// ============================================
// SEND INVITE EMAIL FUNCTION (SENDGRID)
// ============================================

/**
 * Send campground invitation email via SendGrid
 * Requires SENDGRID_API_KEY and SENDGRID_FROM_EMAIL secrets
 */
export const sendCampgroundInviteEmail = functions
  .runWith({ secrets: [sendgridApiKey, sendgridFromEmail] })
  .https.onCall(async (data: { inviteId: string }, context) => {
    // Require auth
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to send invites"
      );
    }

    const { inviteId } = data;

    if (!inviteId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "inviteId is required"
      );
    }

    try {
      const db = admin.firestore();
      const inviteRef = db.collection("campgroundInvites").doc(inviteId);
      const inviteDoc = await inviteRef.get();

      if (!inviteDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Invite not found");
      }

      const invite = inviteDoc.data() as CampgroundInvite;

      // Validate invite
      if (invite.status !== "pending") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Invite is ${invite.status}, not pending`
        );
      }

      if (invite.inviterUid !== context.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You can only send your own invites"
        );
      }

      if (!invite.inviteeEmail) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Invite has no email address"
        );
      }

      // Check expiration
      const now = admin.firestore.Timestamp.now();
      if (invite.expiresAt.toMillis() < now.toMillis()) {
        await inviteRef.update({ status: "expired" });
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Invite has expired"
        );
      }

      // Initialize SendGrid with secret
      sgMail.setApiKey(sendgridApiKey.value());

      const inviteLink = getInviteLink(invite.token);

      // Get the inviter's current display name from their profile
      const inviterProfileDoc = await db.collection("profiles").doc(invite.inviterUid).get();
      const inviterProfile = inviterProfileDoc.exists ? inviterProfileDoc.data() : null;
      const inviterDisplayName = inviterProfile?.displayName || invite.inviterName || "A friend";

      // Send email using SendGrid dynamic template
      // Template ID: d-a00eabe7198844468abf694b6cbea063 (My Campground Invite)
      const msg = {
        to: invite.inviteeEmail,
        from: sendgridFromEmail.value(),
        templateId: "d-a00eabe7198844468abf694b6cbea063",
        dynamicTemplateData: {
          // Use first name only for invite message
          inviterName: getFirstName(inviterDisplayName),
          inviteLink: inviteLink,
          year: new Date().getFullYear(),
        },
      };

      await sgMail.send(msg);

      // Update invite doc
      await inviteRef.update({
        lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSendMethod: "email",
        lastSendError: admin.firestore.FieldValue.delete(),
      });

      functions.logger.info("Sent campground invite email", {
        inviteId,
        to: invite.inviteeEmail,
      });

      return { success: true, message: "Email sent successfully" };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("Error sending invite email", { inviteId, error: errorMessage });

      // Update invite with error
      try {
        const db = admin.firestore();
        await db.collection("campgroundInvites").doc(inviteId).update({
          lastSendError: errorMessage,
        });
      } catch {
        // Ignore update error
      }

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to send invite email"
      );
    }
  });

// ============================================
// REDEEM INVITE FUNCTION
// ============================================

/**
 * Redeem a campground invite by token
 * Adds the user to the inviter's campground contacts
 */
export const redeemCampgroundInvite = functions.https.onCall(
  async (data: { token: string }, context) => {
    // Require auth
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to redeem invites"
      );
    }

    const { token } = data;

    if (!token) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "token is required"
      );
    }

    try {
      const db = admin.firestore();

      // Find invite by token
      const invitesSnapshot = await db
        .collection("campgroundInvites")
        .where("token", "==", token)
        .where("status", "==", "pending")
        .limit(1)
        .get();

      if (invitesSnapshot.empty) {
        throw new functions.https.HttpsError(
          "not-found",
          "Invalid or expired invite"
        );
      }

      const inviteDoc = invitesSnapshot.docs[0];
      const invite = inviteDoc.data() as CampgroundInvite;

      // Check expiration
      const now = admin.firestore.Timestamp.now();
      if (invite.expiresAt.toMillis() < now.toMillis()) {
        await inviteDoc.ref.update({ status: "expired" });
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Invite has expired"
        );
      }

      // Prevent self-invite
      if (invite.inviterUid === context.auth.uid) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Cannot accept your own invite"
        );
      }

      // Get current user's info
      const userDoc = await db.collection("users").doc(context.auth.uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      const userName = userData?.displayName || userData?.handle || "Camper";
      const userEmail = userData?.email || context.auth.token?.email || "";

      // Add to inviter's campground contacts
      const contactData = {
        ownerId: invite.inviterUid,
        contactUserId: context.auth.uid,
        contactName: userName,
        contactEmail: userEmail,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        addedVia: "invite",
        inviteId: inviteDoc.id,
      };

      const contactRef = await db.collection("campgroundContacts").add(contactData);

      // Also add the inviter to the accepter's contacts (bidirectional)
      const inviterDoc = await db.collection("users").doc(invite.inviterUid).get();
      const inviterData = inviterDoc.exists ? inviterDoc.data() : {};
      const inviterEmail = inviterData?.email || "";

      await db.collection("campgroundContacts").add({
        ownerId: context.auth.uid,
        contactUserId: invite.inviterUid,
        contactName: invite.inviterName,
        contactEmail: inviterEmail,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        addedVia: "invite-accepted",
        inviteId: inviteDoc.id,
      });

      // Mark invite as accepted
      await inviteDoc.ref.update({
        status: "accepted",
        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        acceptedUid: context.auth.uid,
      });

      functions.logger.info("Redeemed campground invite", {
        inviteId: inviteDoc.id,
        acceptedBy: context.auth.uid,
        inviterUid: invite.inviterUid,
      });

      return {
        success: true,
        message: `You've joined ${getFirstName(invite.inviterName)}'s campground!`,
        inviterName: getFirstName(invite.inviterName),
        contactId: contactRef.id,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("Error redeeming invite", { token: token.slice(0, 8) + "...", error: errorMessage });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to redeem invite"
      );
    }
  }
);

// ============================================
// AUTO-ACCEPT INVITES ON USER CREATION
// ============================================

/**
 * Check and accept pending invitations when user signs up
 * Triggered on user creation
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  functions.logger.info("onUserCreated triggered", {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  });

  if (!user.email) {
    functions.logger.warn("User created without email, skipping invite check", { uid: user.uid });
    return;
  }

  const email = user.email.toLowerCase();

  try {
    const db = admin.firestore();

    functions.logger.info("Checking for pending invites", { email });

    // Check for pending invitations by email
    const invitesSnapshot = await db
      .collection("campgroundInvites")
      .where("inviteeEmail", "==", email)
      .where("status", "==", "pending")
      .get();

    functions.logger.info("Invite query completed", {
      email,
      invitesFound: invitesSnapshot.size,
    });

    if (invitesSnapshot.empty) {
      // Also log what invites exist for debugging
      const allInvitesSnapshot = await db
        .collection("campgroundInvites")
        .where("status", "==", "pending")
        .limit(5)
        .get();
      
      functions.logger.info("No pending invites found for new user", {
        email,
        totalPendingInvites: allInvitesSnapshot.size,
        sampleInviteEmails: allInvitesSnapshot.docs.map(d => d.data().inviteeEmail),
      });
      return;
    }

    const batch = db.batch();
    let processedCount = 0;
    let expiredCount = 0;

    for (const inviteDoc of invitesSnapshot.docs) {
      const invite = inviteDoc.data() as CampgroundInvite;

      functions.logger.info("Processing invite", {
        inviteId: inviteDoc.id,
        inviteeEmail: invite.inviteeEmail,
        inviterUid: invite.inviterUid,
        inviterName: invite.inviterName,
        expiresAt: invite.expiresAt?.toDate?.() || invite.expiresAt,
      });

      // Check if expired
      const now = admin.firestore.Timestamp.now();
      if (invite.expiresAt && invite.expiresAt.toMillis() < now.toMillis()) {
        functions.logger.info("Invite expired, marking as expired", { inviteId: inviteDoc.id });
        batch.update(inviteDoc.ref, { status: "expired" });
        expiredCount++;
        continue;
      }

      // Add to inviter's campground contacts
      const contactRef = db.collection("campgroundContacts").doc();
      const contactData = {
        ownerId: invite.inviterUid,
        contactUserId: user.uid,
        contactName: user.displayName || email.split("@")[0],
        contactEmail: email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        addedVia: "invite-auto",
        inviteId: inviteDoc.id,
      };
      batch.set(contactRef, contactData);

      functions.logger.info("Creating contact for inviter", {
        contactId: contactRef.id,
        ...contactData,
      });

      // Also add inviter to new user's contacts
      const reverseContactRef = db.collection("campgroundContacts").doc();
      const reverseContactData = {
        ownerId: user.uid,
        contactUserId: invite.inviterUid,
        contactName: invite.inviterName,
        contactEmail: "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        addedVia: "invite-auto-accepted",
        inviteId: inviteDoc.id,
      };
      batch.set(reverseContactRef, reverseContactData);

      functions.logger.info("Creating reverse contact for new user", {
        contactId: reverseContactRef.id,
        ...reverseContactData,
      });

      // Mark invite as accepted
      batch.update(inviteDoc.ref, {
        status: "accepted",
        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        acceptedUid: user.uid,
      });

      processedCount++;

      functions.logger.info("Auto-accepted invite for new user", {
        email,
        inviteId: inviteDoc.id,
        inviterUid: invite.inviterUid,
      });
    }

    await batch.commit();

    functions.logger.info("Invite processing complete", {
      email,
      processedCount,
      expiredCount,
    });
  } catch (error) {
    functions.logger.error("Error processing invites on user creation", {
      email,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Don't throw - we don't want to block user creation
  }
});

// ============================================
// CHECK PENDING INVITES ON LOGIN
// ============================================

/**
 * Check and accept pending invitations for an existing user
 * Called after user logs in to catch invites sent to existing users
 */
export const checkPendingInvitesOnLogin = functions.https.onCall(
  async (_data: unknown, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to check invites"
      );
    }

    const userId = context.auth.uid;
    const email = context.auth.token.email?.toLowerCase();

    if (!email) {
      functions.logger.info("User has no email, skipping invite check", { userId });
      return { processed: 0, message: "No email associated with account" };
    }

    functions.logger.info("checkPendingInvitesOnLogin called", { userId, email });

    try {
      const db = admin.firestore();

      // Check for pending invitations by email
      const invitesSnapshot = await db
        .collection("campgroundInvites")
        .where("inviteeEmail", "==", email)
        .where("status", "==", "pending")
        .get();

      if (invitesSnapshot.empty) {
        functions.logger.info("No pending invites found on login", { email });
        return { processed: 0, message: "No pending invites" };
      }

      functions.logger.info("Found pending invites on login", {
        email,
        count: invitesSnapshot.size,
      });

      // Get user info for contact creation
      const userRecord = await admin.auth().getUser(userId);
      const userName = userRecord.displayName || email.split("@")[0];

      const batch = db.batch();
      let processedCount = 0;
      let expiredCount = 0;
      const inviterNames: string[] = [];

      for (const inviteDoc of invitesSnapshot.docs) {
        const invite = inviteDoc.data() as CampgroundInvite;

        // Check if expired
        const now = admin.firestore.Timestamp.now();
        if (invite.expiresAt && invite.expiresAt.toMillis() < now.toMillis()) {
          functions.logger.info("Invite expired, marking as expired", { inviteId: inviteDoc.id });
          batch.update(inviteDoc.ref, { status: "expired" });
          expiredCount++;
          continue;
        }

        // Check if this contact relationship already exists (to avoid duplicates)
        const existingContact = await db
          .collection("campgroundContacts")
          .where("ownerId", "==", invite.inviterUid)
          .where("contactUserId", "==", userId)
          .limit(1)
          .get();

        if (!existingContact.empty) {
          functions.logger.info("Contact already exists, marking invite as accepted", {
            inviteId: inviteDoc.id,
            inviterUid: invite.inviterUid,
          });
          batch.update(inviteDoc.ref, {
            status: "accepted",
            acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
            acceptedUid: userId,
          });
          continue;
        }

        // Add to inviter's campground contacts
        const contactRef = db.collection("campgroundContacts").doc();
        batch.set(contactRef, {
          ownerId: invite.inviterUid,
          contactUserId: userId,
          contactName: userName,
          contactEmail: email,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          addedVia: "invite-login",
          inviteId: inviteDoc.id,
        });

        // Also add inviter to user's contacts
        const reverseContactRef = db.collection("campgroundContacts").doc();
        batch.set(reverseContactRef, {
          ownerId: userId,
          contactUserId: invite.inviterUid,
          contactName: invite.inviterName,
          contactEmail: "",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          addedVia: "invite-login-accepted",
          inviteId: inviteDoc.id,
        });

        // Mark invite as accepted
        batch.update(inviteDoc.ref, {
          status: "accepted",
          acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
          acceptedUid: userId,
        });

        processedCount++;
        inviterNames.push(getFirstName(invite.inviterName));

        functions.logger.info("Accepted invite on login", {
          email,
          inviteId: inviteDoc.id,
          inviterUid: invite.inviterUid,
        });
      }

      await batch.commit();

      functions.logger.info("Login invite processing complete", {
        email,
        processedCount,
        expiredCount,
      });

      if (processedCount === 0) {
        return { processed: 0, message: "No new invites to process" };
      }

      const message = processedCount === 1
        ? `You've joined ${inviterNames[0]}'s campground!`
        : `You've joined ${processedCount} campgrounds!`;

      return {
        processed: processedCount,
        expired: expiredCount,
        message,
        inviterNames,
      };
    } catch (error) {
      functions.logger.error("Error checking pending invites on login", {
        userId,
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new functions.https.HttpsError(
        "internal",
        "Failed to check pending invites"
      );
    }
  }
);

// ============================================
// DELETE PHOTO FUNCTION
// ============================================

/**
 * Delete a photo (story) - both Firestore doc and Storage file
 * Can be called by owner OR admin
 */
export const deletePhotoSecure = functions.https.onCall(
  async (data: { photoId: string }, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to delete photos"
      );
    }

    const { photoId } = data;
    const callerId = context.auth.uid;

    if (!photoId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "photoId is required"
      );
    }

    try {
      const db = admin.firestore();
      const storage = admin.storage();

      // Get the photo document
      const photoRef = db.collection("stories").doc(photoId);
      const photoDoc = await photoRef.get();

      if (!photoDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Photo not found");
      }

      const photoData = photoDoc.data()!;
      const ownerId =
        photoData.ownerUid || photoData.userId || photoData.authorId;

      // Check if caller is owner
      const isOwner = ownerId === callerId;

      // Check if caller is admin
      const callerDoc = await db.collection("users").doc(callerId).get();
      const callerData = callerDoc.exists ? callerDoc.data() : null;
      const isAdmin =
        callerData &&
        (callerData.isAdmin === true ||
          callerData.role === "admin" ||
          callerData.role === "administrator");

      if (!isOwner && !isAdmin) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You can only delete your own photos or must be an admin"
        );
      }

      // Step 1: Delete from Storage
      const storagePath = photoData.storagePath;
      if (storagePath) {
        try {
          const bucket = storage.bucket();
          await bucket.file(storagePath).delete();
          functions.logger.info("Deleted from Storage", { storagePath });
        } catch (storageError: unknown) {
          const errorMessage = storageError instanceof Error ? storageError.message : "Unknown error";
          // Log but continue - file may already be deleted
          functions.logger.warn("Storage delete error (continuing)", {
            storagePath,
            error: errorMessage,
          });
        }
      } else {
        // Try fallback paths
        const patterns = [
          `stories/${ownerId}/${photoId}`,
          `stories/${ownerId}/${photoId}.jpg`,
        ];

        for (const pattern of patterns) {
          try {
            const bucket = storage.bucket();
            await bucket.file(pattern).delete();
            functions.logger.info("Deleted from Storage (fallback)", {
              pattern,
            });
            break;
          } catch {
            // Try next pattern
          }
        }
      }

      // Step 2: Delete votes for this photo
      const votesSnapshot = await db
        .collection("storyVotes")
        .where("photoId", "==", photoId)
        .get();

      const batch = db.batch();
      votesSnapshot.docs.forEach((voteDoc) => {
        batch.delete(voteDoc.ref);
      });

      // Also check photoVotes collection
      const photoVotesSnapshot = await db
        .collection("photoVotes")
        .where("photoId", "==", photoId)
        .get();

      photoVotesSnapshot.docs.forEach((voteDoc) => {
        batch.delete(voteDoc.ref);
      });

      // Step 3: Delete the photo document
      batch.delete(photoRef);
      await batch.commit();

      functions.logger.info("Successfully deleted photo", {
        photoId,
        deletedBy: callerId,
        isAdmin,
      });

      return { success: true, photoId };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("Error deleting photo", {
        photoId,
        error: errorMessage,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to delete photo. Please try again."
      );
    }
  }
);

// ============================================
// NOTIFICATION CAMPAIGN TYPES
// ============================================

interface NotificationQueueItem {
  userId: string;
  type: string;
  sendAt: admin.firestore.Timestamp;
  payload: {
    title: string;
    body: string;
    deepLink: string;
    actionKey?: string;
    tripId?: string;
  };
  status: "pending" | "sent" | "suppressed" | "failed";
  suppressionReason?: string;
  createdAt: admin.firestore.FieldValue;
  sentAt?: admin.firestore.FieldValue;
  metadata?: Record<string, any>;
}

interface UserOnboarding {
  startedAt?: admin.firestore.Timestamp;
  lastActiveAt?: admin.firestore.Timestamp;
  lastPushAt?: admin.firestore.Timestamp;
  pushesThisWeek: number;
  weekStartedAt?: admin.firestore.Timestamp;
  lastNudgeKey?: string;
  completedActions: Record<string, boolean>;
  counters: {
    gearItemsCount?: number;
    tripsCount?: number;
    savedPlacesCount?: number;
  };
  campaignCompleted?: boolean;
  campaignCompletedReason?: string;
  campaignCompletedAt?: admin.firestore.Timestamp;
}

// Notification config constants
const NOTIFICATION_CONFIG = {
  quietHoursStart: 19, // 7 PM
  quietHoursEnd: 10, // 10 AM
  preferredSendHour: 11, // 11 AM
  maxPushesPerWeek: 2,
  recentActivitySuppressionHours: 12,
  coreActionsToComplete: 2,
  campaignDurationDays: 30,
  inactivityThresholdDays: 30,
};

// Onboarding schedule
const ONBOARDING_SCHEDULE = [
  { day: 1, type: "onboarding_day_1", title: "Welcome to Complete Camping App", body: "Want a 30-second win? Start a trip and we'll build your plan from it.", deepLink: "cta://plan/new", suppressIfCompleted: "createdTrip" },
  { day: 3, type: "onboarding_day_3", title: "Your packing list is ready", body: "Pick your camping style and season. We'll prefill the basics.", deepLink: "cta://packinglist/start", suppressIfCompleted: "generatedPackingList" },
  { day: 5, type: "onboarding_day_5", title: "Save your next spot", body: "Favorite a campground or park so it's one tap next time.", deepLink: "cta://parks", suppressIfCompleted: "savedPlace" },
  { day: 7, type: "onboarding_day_7", title: "Make packing faster", body: "Add 5 gear items. Next time, packing is basically done.", deepLink: "cta://gearcloset", suppressIfCompleted: "added5GearItems" },
  { day: 9, type: "onboarding_day_9", title: "Planning soon?", body: "Add dates and a location so everything stays in one place.", deepLink: "cta://plan", suppressIfCompleted: "createdTrip" },
  { day: 11, type: "onboarding_day_11", title: "Fewer 'did we forget it?' moments", body: "Use the category checklist for a quick scan.", deepLink: "cta://packinglist/categories", suppressIfCompleted: "generatedPackingList" },
  { day: 14, type: "onboarding_day_14", title: "Quick weather check", body: "Add a forecast to your trip so it's easy to find later.", deepLink: "cta://weather", suppressIfCompleted: "addedWeatherToTrip" },
  { day: 16, type: "onboarding_day_16", title: "Make it feel like yours", body: "Set your favorite camping style and we'll tailor your home screen.", deepLink: "cta://profile/edit", suppressIfCompleted: "favoriteCampingStyleSet" },
  { day: 18, type: "onboarding_day_18", title: "Save your best list", body: "'My winter car camping list' then reuse it forever.", deepLink: "cta://packinglist/save-template", suppressIfCompleted: "savedCustomPackingList" },
  { day: 21, type: "onboarding_day_21", title: "Camping with friends?", body: "Invite a campground buddy so plans and photos stay together.", deepLink: "cta://campground/invite", suppressIfCompleted: "invitedBuddy" },
  { day: 23, type: "onboarding_day_23", title: "One quick win today", body: "Save a place you want to camp this year.", deepLink: "cta://parks", suppressIfCompleted: "savedPlace" },
  { day: 26, type: "onboarding_day_26", title: "Meal planning, simplified", body: "Add one dinner, then tap suggestions for breakfast, lunch, and snack.", deepLink: "cta://meals", suppressIfCompleted: "addedMealPlan" },
  { day: 30, type: "onboarding_day_30", title: "Got a camping win?", body: "Drop one tip or question and help the community grow.", deepLink: "cta://community" },
];

const CORE_ACTIONS = ["createdTrip", "generatedPackingList", "added5GearItems", "savedPlace", "addedWeatherToTrip", "invitedBuddy"];

// ============================================
// DAILY NOTIFICATION PROCESSOR
// ============================================

/**
 * Scheduled function that runs daily to process onboarding notifications
 * Runs at 11 AM UTC (adjust for user timezones in production)
 */
export const processOnboardingNotifications = functions.pubsub
  .schedule("0 11 * * *") // Every day at 11 AM UTC
  .timeZone("America/New_York")
  .onRun(async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    functions.logger.info("Starting daily onboarding notification processor");

    try {
      // Get all users with active onboarding campaigns
      const usersSnapshot = await db
        .collection("users")
        .where("onboarding.campaignCompleted", "!=", true)
        .limit(500) // Process in batches
        .get();

      let processed = 0;
      let queued = 0;
      let suppressed = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const onboarding = userData.onboarding as UserOnboarding | undefined;

        if (!onboarding?.startedAt) continue;

        // Calculate onboarding day
        const startedAt = onboarding.startedAt.toMillis();
        const daysSinceStart = Math.floor((now.toMillis() - startedAt) / (1000 * 60 * 60 * 24));
        const currentDay = daysSinceStart + 1;

        // Check if campaign should end (day 30)
        if (currentDay > NOTIFICATION_CONFIG.campaignDurationDays) {
          await userDoc.ref.update({
            "onboarding.campaignCompleted": true,
            "onboarding.campaignCompletedReason": "day_30",
            "onboarding.campaignCompletedAt": admin.firestore.FieldValue.serverTimestamp(),
          });
          continue;
        }

        // Check suppression conditions
        const suppressionReason = await checkSuppression(userId, onboarding, userData);
        if (suppressionReason) {
          suppressed++;
          functions.logger.debug(`Suppressed notification for ${userId}: ${suppressionReason}`);
          continue;
        }

        // Find appropriate message for current day
        const message = findMessageForUser(currentDay, onboarding);
        if (!message) continue;

        // Queue the notification
        await queueNotification(db, userId, message);
        queued++;
        processed++;
      }

      // Process the notification queue
      await sendQueuedNotifications(db);

      functions.logger.info("Daily onboarding processor complete", {
        processed,
        queued,
        suppressed,
      });

      return null;
    } catch (error) {
      functions.logger.error("Error in onboarding processor", { error });
      throw error;
    }
  });

/**
 * Check if notifications should be suppressed for this user
 */
async function checkSuppression(
  userId: string,
  onboarding: UserOnboarding,
  userData: any
): Promise<string | null> {
  // Check if notifications are disabled
  if (userData.notificationsEnabled === false) {
    return "notifications_disabled";
  }

  // Check for recent activity (within 12 hours)
  if (onboarding.lastActiveAt) {
    const hoursSinceActive =
      (Date.now() - onboarding.lastActiveAt.toMillis()) / (1000 * 60 * 60);
    if (hoursSinceActive < NOTIFICATION_CONFIG.recentActivitySuppressionHours) {
      return "recently_active";
    }
  }

  // Check weekly frequency cap
  const pushesThisWeek = onboarding.pushesThisWeek || 0;
  if (pushesThisWeek >= NOTIFICATION_CONFIG.maxPushesPerWeek) {
    // Check if we should reset the week counter
    if (onboarding.weekStartedAt) {
      const daysSinceWeekStart =
        (Date.now() - onboarding.weekStartedAt.toMillis()) / (1000 * 60 * 60 * 24);
      if (daysSinceWeekStart < 7) {
        return "frequency_cap";
      }
      // Reset will happen in queueNotification
    } else {
      return "frequency_cap";
    }
  }

  // Check if campaign is already completed (2 core actions)
  const completedCoreCount = CORE_ACTIONS.filter(
    (action) => onboarding.completedActions?.[action] === true
  ).length;
  if (completedCoreCount >= NOTIFICATION_CONFIG.coreActionsToComplete) {
    return "campaign_completed";
  }

  return null;
}

/**
 * Find the appropriate message for the user's current day
 */
function findMessageForUser(
  currentDay: number,
  onboarding: UserOnboarding
): typeof ONBOARDING_SCHEDULE[0] | null {
  // Find messages for today that haven't been suppressed by completion
  const todayMessages = ONBOARDING_SCHEDULE.filter((msg) => {
    if (msg.day !== currentDay) return false;

    // Check if action is already completed
    if (msg.suppressIfCompleted && onboarding.completedActions?.[msg.suppressIfCompleted]) {
      return false;
    }

    return true;
  });

  return todayMessages.length > 0 ? todayMessages[0] : null;
}

/**
 * Queue a notification for sending
 */
async function queueNotification(
  db: admin.firestore.Firestore,
  userId: string,
  message: typeof ONBOARDING_SCHEDULE[0]
): Promise<void> {
  const queueItem: NotificationQueueItem = {
    userId,
    type: message.type,
    sendAt: admin.firestore.Timestamp.now(),
    payload: {
      title: message.title,
      body: message.body,
      deepLink: message.deepLink,
    },
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("notificationQueue").add(queueItem);
}

/**
 * Send all pending notifications in the queue
 */
async function sendQueuedNotifications(db: admin.firestore.Firestore): Promise<void> {
  const now = admin.firestore.Timestamp.now();

  const pendingSnapshot = await db
    .collection("notificationQueue")
    .where("status", "==", "pending")
    .where("sendAt", "<=", now)
    .limit(100)
    .get();

  for (const doc of pendingSnapshot.docs) {
    const notification = doc.data() as NotificationQueueItem;

    try {
      // Get user's push tokens
      const tokensSnapshot = await db
        .collection("pushTokens")
        .where("userId", "==", notification.userId)
        .get();

      if (tokensSnapshot.empty) {
        // No push token, mark as suppressed (in-app only)
        await doc.ref.update({
          status: "suppressed",
          suppressionReason: "no_push_token",
        });
        continue;
      }

      // Send push notification
      const tokens = tokensSnapshot.docs.map((t) => t.data().token);
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: notification.payload.title,
          body: notification.payload.body,
        },
        data: {
          deepLink: notification.payload.deepLink,
          type: notification.type,
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      await admin.messaging().sendEachForMulticast(message);

      // Update notification as sent
      await doc.ref.update({
        status: "sent",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update user's push tracking
      await db.collection("users").doc(notification.userId).update({
        "onboarding.lastPushAt": admin.firestore.FieldValue.serverTimestamp(),
        "onboarding.pushesThisWeek": admin.firestore.FieldValue.increment(1),
        "onboarding.lastNudgeKey": notification.type,
      });

      functions.logger.info("Sent push notification", {
        userId: notification.userId,
        type: notification.type,
      });
    } catch (error) {
      functions.logger.error("Error sending notification", {
        notificationId: doc.id,
        error,
      });

      await doc.ref.update({
        status: "failed",
        suppressionReason: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
}

// ============================================
// TRIP EVENT TRIGGERS
// ============================================

/**
 * When a trip is created, schedule reminder notifications
 */
export const onTripCreated = functions.firestore
  .document("trips/{tripId}")
  .onCreate(async (snap, context) => {
    const tripId = context.params.tripId;
    const trip = snap.data();
    const userId = trip.userId;

    if (!userId) return;

    const db = admin.firestore();

    // Update onboarding counters
    await db.collection("users").doc(userId).update({
      "onboarding.counters.tripsCount": admin.firestore.FieldValue.increment(1),
      "onboarding.completedActions.createdTrip": true,
      "onboarding.lastActiveAt": admin.firestore.FieldValue.serverTimestamp(),
    });

    // Schedule "no packing list" reminder for 24h later
    if (!trip.hasPackingList) {
      const sendAt = admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);

      await db.collection("notificationQueue").add({
        userId,
        type: "trip_no_packing_list_24h",
        sendAt,
        payload: {
          title: "Want me to build your packing list?",
          body: "Tap once and tweak it for your trip.",
          deepLink: `cta://packinglist/from-trip?tripId=${tripId}`,
          tripId,
        },
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: { tripId },
      });
    }

    // Schedule trip reminders if startDate exists
    if (trip.startDate) {
      const startDate = trip.startDate.toDate ? trip.startDate.toDate() : new Date(trip.startDate);
      const now = Date.now();

      // 3 days before
      const threeDaysBefore = startDate.getTime() - 3 * 24 * 60 * 60 * 1000;
      if (threeDaysBefore > now) {
        await db.collection("notificationQueue").add({
          userId,
          type: "trip_starts_3_days",
          sendAt: admin.firestore.Timestamp.fromMillis(threeDaysBefore),
          payload: {
            title: "Trip coming up",
            body: "Quick packing scan and weather in one place.",
            deepLink: `cta://trip/${tripId}`,
            tripId,
          },
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: { tripId },
        });
      }

      // 1 day before
      const oneDayBefore = startDate.getTime() - 24 * 60 * 60 * 1000;
      if (oneDayBefore > now) {
        await db.collection("notificationQueue").add({
          userId,
          type: "trip_starts_tomorrow",
          sendAt: admin.firestore.Timestamp.fromMillis(oneDayBefore),
          payload: {
            title: "Tomorrow's the day",
            body: "Open your packing list for a final 2-minute check.",
            deepLink: `cta://trip/${tripId}/packing`,
            tripId,
          },
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: { tripId },
        });
      }
    }

    functions.logger.info("Processed trip creation", { tripId, userId });
  });

/**
 * When a trip is updated, check for packing list and cancel obsolete notifications
 */
export const onTripUpdated = functions.firestore
  .document("trips/{tripId}")
  .onUpdate(async (change, context) => {
    const tripId = context.params.tripId;
    const before = change.before.data();
    const after = change.after.data();

    const db = admin.firestore();

    // If packing list was added, suppress the "no packing list" notification
    if (!before.hasPackingList && after.hasPackingList) {
      const pendingNotifications = await db
        .collection("notificationQueue")
        .where("metadata.tripId", "==", tripId)
        .where("type", "==", "trip_no_packing_list_24h")
        .where("status", "==", "pending")
        .get();

      for (const doc of pendingNotifications.docs) {
        await doc.ref.update({
          status: "suppressed",
          suppressionReason: "action_already_completed",
        });
      }
    }

    // If trip is cancelled, suppress all trip notifications
    if (after.status === "cancelled" && before.status !== "cancelled") {
      const pendingNotifications = await db
        .collection("notificationQueue")
        .where("metadata.tripId", "==", tripId)
        .where("status", "==", "pending")
        .get();

      for (const doc of pendingNotifications.docs) {
        await doc.ref.update({
          status: "suppressed",
          suppressionReason: "trip_cancelled",
        });
      }
    }
  });

// ============================================
// WEEKLY RESET FUNCTION
// ============================================

/**
 * Reset weekly push counters every Monday
 */
export const resetWeeklyPushCounters = functions.pubsub
  .schedule("0 0 * * 1") // Every Monday at midnight
  .timeZone("America/New_York")
  .onRun(async () => {
    const db = admin.firestore();

    const usersSnapshot = await db
      .collection("users")
      .where("onboarding.pushesThisWeek", ">", 0)
      .get();

    const batch = db.batch();
    let count = 0;

    for (const doc of usersSnapshot.docs) {
      batch.update(doc.ref, {
        "onboarding.pushesThisWeek": 0,
        "onboarding.weekStartedAt": admin.firestore.FieldValue.serverTimestamp(),
      });
      count++;

      // Firestore batch limit is 500
      if (count >= 500) {
        await batch.commit();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    functions.logger.info("Reset weekly push counters", { usersReset: usersSnapshot.size });
    return null;
  });

// ============================================
// INACTIVE USER RE-ENGAGEMENT
// ============================================

/**
 * Check for inactive users and send re-engagement notifications
 * Runs weekly on Wednesdays
 */
export const processInactiveUsers = functions.pubsub
  .schedule("0 11 * * 3") // Every Wednesday at 11 AM
  .timeZone("America/New_York")
  .onRun(async () => {
    const db = admin.firestore();
    const inactivityThreshold = admin.firestore.Timestamp.fromMillis(
      Date.now() - NOTIFICATION_CONFIG.inactivityThresholdDays * 24 * 60 * 60 * 1000
    );

    const inactiveUsersSnapshot = await db
      .collection("users")
      .where("onboarding.lastActiveAt", "<", inactivityThreshold)
      .where("notificationsEnabled", "==", true)
      .limit(100)
      .get();

    let queued = 0;

    for (const userDoc of inactiveUsersSnapshot.docs) {
      const userId = userDoc.id;

      // Check if we already sent this notification recently
      const recentNudge = await db
        .collection("notificationQueue")
        .where("userId", "==", userId)
        .where("type", "==", "inactive_30_days")
        .where("createdAt", ">", admin.firestore.Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .limit(1)
        .get();

      if (!recentNudge.empty) continue;

      await db.collection("notificationQueue").add({
        userId,
        type: "inactive_30_days",
        sendAt: admin.firestore.Timestamp.now(),
        payload: {
          title: "Your sleeping bag is bored",
          body: "It's been too long since you treated yourself to a camping trip. Let's start a plan.",
          deepLink: "cta://plan/new",
        },
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      queued++;
    }

    // Process the queue
    await sendQueuedNotifications(db);

    functions.logger.info("Processed inactive users", { queued });
    return null;
  });

// ============================================
// EMAIL QUEUE PROCESSOR
// ============================================

interface EmailQueueItem {
  userId: string;
  type: string;
  templateId: string;
  templateData: Record<string, any>;
  toEmail: string;
  priority: "high" | "normal" | "low";
  sendAt?: admin.firestore.Timestamp;
  status: "pending" | "sent" | "suppressed" | "failed";
  suppressionReason?: string;
  createdAt: admin.firestore.FieldValue;
  sentAt?: admin.firestore.FieldValue;
  attempts: number;
  lastAttemptAt?: admin.firestore.FieldValue;
  error?: string;
}

/**
 * Process email queue
 * Runs every 15 minutes to send pending emails
 * Respects frequency caps and unsubscribe status
 */
export const processEmailQueue = functions
  .runWith({ secrets: [sendgridApiKey, sendgridFromEmail] })
  .pubsub.schedule("*/15 * * * *") // Every 15 minutes
  .timeZone("America/New_York")
  .onRun(async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    functions.logger.info("Starting email queue processor");

    try {
      // Get pending emails ready to send
      const pendingSnapshot = await db
        .collection("emailQueue")
        .where("status", "==", "pending")
        .where("sendAt", "<=", now)
        .orderBy("sendAt")
        .orderBy("priority")
        .limit(50)
        .get();

      let sent = 0;
      let suppressed = 0;
      let failed = 0;

      for (const doc of pendingSnapshot.docs) {
        const queueItem = doc.data() as EmailQueueItem;

        try {
          // Check unsubscribe status
          const emailSubDoc = await db.collection("emailSubscribers").doc(queueItem.userId).get();
          if (emailSubDoc.exists) {
            const emailData = emailSubDoc.data();
            
            // Check transactional vs marketing
            const isTransactional = queueItem.priority === "high";
            if (!isTransactional && (emailData?.unsubscribed || emailData?.marketingUnsubscribed)) {
              await doc.ref.update({
                status: "suppressed",
                suppressionReason: "unsubscribed",
              });
              suppressed++;
              continue;
            }

            // Check if bounced
            if (emailData?.bounced) {
              await doc.ref.update({
                status: "suppressed",
                suppressionReason: "bounced",
              });
              suppressed++;
              continue;
            }
          }

          // Check user's email frequency cap (skip for transactional)
          if (queueItem.priority !== "high") {
            const userDoc = await db.collection("users").doc(queueItem.userId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              const emailsThisWeek = userData?.onboarding?.emailsThisWeek || 0;
              
              // Max 2 marketing emails per week
              if (emailsThisWeek >= 2) {
                await doc.ref.update({
                  status: "suppressed",
                  suppressionReason: "weekly_cap_reached",
                });
                suppressed++;
                continue;
              }
            }
          }

          // Send the email
          sgMail.setApiKey(sendgridApiKey.value());

          const msg = {
            to: queueItem.toEmail,
            from: sendgridFromEmail.value(),
            templateId: queueItem.templateId,
            dynamicTemplateData: {
              ...queueItem.templateData,
              year: new Date().getFullYear(),
            },
          };

          await sgMail.send(msg);

          // Update queue item
          await doc.ref.update({
            status: "sent",
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            attempts: (queueItem.attempts || 0) + 1,
            lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Update user's email tracking (for non-transactional)
          if (queueItem.priority !== "high") {
            await db.collection("users").doc(queueItem.userId).update({
              "onboarding.lastEmailAt": admin.firestore.FieldValue.serverTimestamp(),
              "onboarding.emailsThisWeek": admin.firestore.FieldValue.increment(1),
            });
          }

          sent++;
          functions.logger.info("Sent queued email", {
            userId: queueItem.userId,
            type: queueItem.type,
          });
        } catch (error) {
          const attempts = (queueItem.attempts || 0) + 1;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";

          // If too many attempts, mark as failed
          if (attempts >= 3) {
            await doc.ref.update({
              status: "failed",
              error: errorMessage,
              attempts,
              lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            failed++;
          } else {
            // Retry later
            await doc.ref.update({
              attempts,
              lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
              sendAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 60 * 1000), // Retry in 30 mins
            });
          }

          functions.logger.error("Error sending queued email", {
            queueItemId: doc.id,
            error: errorMessage,
            attempts,
          });
        }
      }

      functions.logger.info("Email queue processor complete", { sent, suppressed, failed });
      return null;
    } catch (error) {
      functions.logger.error("Error in email queue processor", { error });
      throw error;
    }
  });

/**
 * Helper: Queue an email for sending
 * Exported for use by other modules (e.g., triggers)
 */
export async function queueEmail(
  db: admin.firestore.Firestore,
  params: {
    userId: string;
    type: string;
    templateId: string;
    templateData: Record<string, any>;
    toEmail: string;
    priority?: "high" | "normal" | "low";
    sendAt?: Date;
  }
): Promise<string> {
  const queueItem: EmailQueueItem = {
    userId: params.userId,
    type: params.type,
    templateId: params.templateId,
    templateData: params.templateData,
    toEmail: params.toEmail,
    priority: params.priority || "normal",
    sendAt: params.sendAt
      ? admin.firestore.Timestamp.fromDate(params.sendAt)
      : admin.firestore.Timestamp.now(),
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    attempts: 0,
  };

  const docRef = await db.collection("emailQueue").add(queueItem);
  return docRef.id;
}

// ============================================
// DRIP EMAIL CAMPAIGN
// ============================================

// Drip email content for each day
const DRIP_EMAIL_CONTENT: Record<string, {
  headline: string;
  body: string;
  ctaText: string;
  ctaLink: string;
  preheader: string;
  tip1?: string;
  tip2?: string;
  tip3?: string;
}> = {
  welcome: {
    headline: "Welcome to The Complete Camping App! 🏕️",
    body: "You're all set to plan your next camping adventure. Let's get started with your first trip.",
    ctaText: "Start Your First Trip",
    ctaLink: "https://tentandlantern.com/app/plan/new",
    preheader: "Your next trip gets easier from here. Start a plan, build a packing list, and save places you love.",
  },
  day_4: {
    headline: "Ready to pack smarter?",
    body: "Generate a packing list in 30 seconds. Pick your camping style and season, and we'll handle the rest.",
    ctaText: "Build Your Packing List",
    ctaLink: "https://tentandlantern.com/app/packinglist/start",
    preheader: "Never forget your headlamp again. Smart packing lists built for your trip.",
    tip1: "💡 Pro tip: Save your list as a template for future trips",
  },
  day_7: {
    headline: "Your gear closet is waiting",
    body: "Add your favorite gear once, and it's ready for every trip. No more second-guessing what you own.",
    ctaText: "Add Your Gear",
    ctaLink: "https://tentandlantern.com/app/gearcloset",
    preheader: "Build your digital gear closet and pack smarter every time.",
    tip1: "🎒 Start with your tent, sleeping bag, and favorite camp chair",
    tip2: "⭐ Mark items as favorites to find them quickly",
  },
  day_14: {
    headline: "Save spots you'll love",
    body: "Found a campground you want to remember? Save it so it's one tap away when you're ready to book.",
    ctaText: "Explore Parks",
    ctaLink: "https://tentandlantern.com/app/parks",
    preheader: "Discover and save campgrounds for your next adventure.",
    tip1: "❤️ Heart your favorite parks to find them later",
    tip2: "📍 Add custom notes about the best sites",
  },
  day_21: {
    headline: "Camping is better together",
    body: "Invite your camping crew to share trips, packing lists, and photos all in one place.",
    ctaText: "Invite a Buddy",
    ctaLink: "https://tentandlantern.com/app/campground/invite",
    preheader: "Share the adventure with friends and family.",
    tip1: "👥 Everyone can add items to shared packing lists",
    tip2: "📸 Trip photos stay together in one album",
  },
  inactive_30_days: {
    headline: "Your sleeping bag is bored 😴",
    body: "It's been too long since you treated yourself to a camping trip. Let's start a plan.",
    ctaText: "Start a New Plan",
    ctaLink: "https://tentandlantern.com/app/plan/new",
    preheader: "It's been too long since you treated yourself to a camping trip. Let's start a plan.",
  },
};

// Drip schedule: day number -> email type
const DRIP_SCHEDULE: Record<number, string> = {
  1: "welcome",
  4: "day_4",
  7: "day_7",
  14: "day_14",
  21: "day_21",
};

/**
 * Process drip email campaign
 * Runs daily at 10 AM to send appropriate drip emails
 */
export const processDripEmails = functions
  .runWith({ secrets: [sendgridApiKey, sendgridFromEmail] })
  .pubsub.schedule("0 10 * * *") // Every day at 10 AM UTC
  .timeZone("America/New_York")
  .onRun(async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    functions.logger.info("Starting drip email processor");

    try {
      // Get all users who haven't completed onboarding campaign
      const usersSnapshot = await db
        .collection("users")
        .where("onboarding.campaignCompleted", "!=", true)
        .where("emailMarketingEnabled", "!=", false)
        .limit(500)
        .get();

      let sent = 0;
      let skipped = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const onboarding = userData.onboarding;

        // Skip if no onboarding data or no email
        if (!onboarding?.startedAt || !userData.email) {
          skipped++;
          continue;
        }

        // Check if marketing emails are enabled
        if (userData.emailMarketingEnabled === false) {
          skipped++;
          continue;
        }

        // Check emailSubscribers for unsubscribe
        const emailSubDoc = await db.collection("emailSubscribers").doc(userId).get();
        if (emailSubDoc.exists) {
          const emailData = emailSubDoc.data();
          if (emailData?.unsubscribed || emailData?.marketingUnsubscribed) {
            skipped++;
            continue;
          }
        }

        // Check email frequency cap (max 2 per week)
        const emailsThisWeek = onboarding.emailsThisWeek || 0;
        if (emailsThisWeek >= 2) {
          skipped++;
          continue;
        }

        // Calculate onboarding day
        const startedAt = onboarding.startedAt.toMillis();
        const daysSinceStart = Math.floor((now.toMillis() - startedAt) / (1000 * 60 * 60 * 24));
        const currentDay = daysSinceStart + 1;

        // Check if there's a drip email for today
        const emailType = DRIP_SCHEDULE[currentDay];
        if (!emailType) {
          continue;
        }

        // Check if we already sent this email today
        if (onboarding.lastEmailType === emailType) {
          skipped++;
          continue;
        }

        // Get email content
        const content = DRIP_EMAIL_CONTENT[emailType];
        if (!content) {
          continue;
        }

        // Extract first name from displayName
        const firstName = userData.displayName?.split(" ")[0] || undefined;

        // Send the drip email
        try {
          sgMail.setApiKey(sendgridApiKey.value());

          const msg = {
            to: userData.email,
            from: sendgridFromEmail.value(),
            templateId: "d-33e554033ea641fdb7288ce884923c33", // Drip template
            dynamicTemplateData: {
              firstName,
              headline: content.headline,
              body: content.body,
              ctaText: content.ctaText,
              ctaLink: content.ctaLink,
              preheader: content.preheader,
              year: new Date().getFullYear(),
              tip1: content.tip1,
              tip2: content.tip2,
              tip3: content.tip3,
            },
          };

          await sgMail.send(msg);

          // Update user's email tracking
          await userDoc.ref.update({
            "onboarding.lastEmailAt": admin.firestore.FieldValue.serverTimestamp(),
            "onboarding.emailsThisWeek": admin.firestore.FieldValue.increment(1),
            "onboarding.lastEmailType": emailType,
          });

          sent++;
          functions.logger.info("Sent drip email", {
            userId,
            emailType,
            day: currentDay,
          });
        } catch (emailError) {
          functions.logger.error("Error sending drip email", {
            userId,
            emailType,
            error: emailError instanceof Error ? emailError.message : "Unknown error",
          });
        }
      }

      functions.logger.info("Drip email processor complete", { sent, skipped });
      return null;
    } catch (error) {
      functions.logger.error("Error in drip email processor", { error });
      throw error;
    }
  });

/**
 * Reset weekly email counters every Monday
 */
export const resetWeeklyEmailCounters = functions.pubsub
  .schedule("0 0 * * 1") // Every Monday at midnight
  .timeZone("America/New_York")
  .onRun(async () => {
    const db = admin.firestore();

    const usersSnapshot = await db
      .collection("users")
      .where("onboarding.emailsThisWeek", ">", 0)
      .get();

    const batch = db.batch();
    let count = 0;

    for (const doc of usersSnapshot.docs) {
      batch.update(doc.ref, {
        "onboarding.emailsThisWeek": 0,
        "onboarding.emailWeekStartedAt": admin.firestore.FieldValue.serverTimestamp(),
      });
      count++;

      if (count >= 500) {
        await batch.commit();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    functions.logger.info("Reset weekly email counters", { usersReset: usersSnapshot.size });
    return null;
  });

/**
 * Send 30-day inactive re-engagement email
 * Runs weekly on Wednesdays
 */
export const sendInactiveReengagementEmail = functions
  .runWith({ secrets: [sendgridApiKey, sendgridFromEmail] })
  .pubsub.schedule("0 10 * * 3") // Every Wednesday at 10 AM
  .timeZone("America/New_York")
  .onRun(async () => {
    const db = admin.firestore();
    const inactivityThreshold = admin.firestore.Timestamp.fromMillis(
      Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days
    );
    const reengagementSuppressionThreshold = admin.firestore.Timestamp.fromMillis(
      Date.now() - 30 * 24 * 60 * 60 * 1000 // Don't send again for 30 days
    );

    functions.logger.info("Starting inactive re-engagement email processor");

    try {
      const inactiveUsersSnapshot = await db
        .collection("users")
        .where("onboarding.lastActiveAt", "<", inactivityThreshold)
        .where("emailMarketingEnabled", "!=", false)
        .limit(100)
        .get();

      let sent = 0;
      let skipped = 0;

      for (const userDoc of inactiveUsersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const onboarding = userData.onboarding;

        // Skip if no email
        if (!userData.email) {
          skipped++;
          continue;
        }

        // Check if marketing emails are enabled
        if (userData.emailMarketingEnabled === false) {
          skipped++;
          continue;
        }

        // Check emailSubscribers for unsubscribe
        const emailSubDoc = await db.collection("emailSubscribers").doc(userId).get();
        if (emailSubDoc.exists) {
          const emailData = emailSubDoc.data();
          if (emailData?.unsubscribed || emailData?.marketingUnsubscribed) {
            skipped++;
            continue;
          }
        }

        // Check if we already sent re-engagement email recently
        if (onboarding?.lastReengageAt) {
          const lastReengageAt = onboarding.lastReengageAt.toMillis();
          if (lastReengageAt > reengagementSuppressionThreshold.toMillis()) {
            skipped++;
            continue;
          }
        }

        // Get email content
        const content = DRIP_EMAIL_CONTENT["inactive_30_days"];
        const firstName = userData.displayName?.split(" ")[0] || undefined;

        try {
          sgMail.setApiKey(sendgridApiKey.value());

          const msg = {
            to: userData.email,
            from: sendgridFromEmail.value(),
            templateId: "d-33e554033ea641fdb7288ce884923c33", // Drip template
            dynamicTemplateData: {
              firstName,
              headline: content.headline,
              body: content.body,
              ctaText: content.ctaText,
              ctaLink: content.ctaLink,
              preheader: content.preheader,
              year: new Date().getFullYear(),
            },
          };

          await sgMail.send(msg);

          // Update user's re-engagement tracking
          await userDoc.ref.update({
            "onboarding.lastReengageAt": admin.firestore.FieldValue.serverTimestamp(),
            "onboarding.lastEmailAt": admin.firestore.FieldValue.serverTimestamp(),
          });

          sent++;
          functions.logger.info("Sent re-engagement email", { userId });
        } catch (emailError) {
          functions.logger.error("Error sending re-engagement email", {
            userId,
            error: emailError instanceof Error ? emailError.message : "Unknown error",
          });
        }
      }

      functions.logger.info("Inactive re-engagement email processor complete", { sent, skipped });
      return null;
    } catch (error) {
      functions.logger.error("Error in re-engagement email processor", { error });
      throw error;
    }
  });

// ============================================
// SENDGRID WEBHOOK FOR UNSUBSCRIBES
// ============================================

/**
 * Handle SendGrid webhook events (unsubscribes, bounces, etc.)
 */
export const handleSendGridWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const db = admin.firestore();
  const events = req.body;

  if (!Array.isArray(events)) {
    res.status(400).send("Invalid payload");
    return;
  }

  functions.logger.info("Received SendGrid webhook", { eventCount: events.length });

  for (const event of events) {
    try {
      const email = event.email?.toLowerCase();
      if (!email) continue;

      // Handle unsubscribe events
      if (event.event === "unsubscribe" || event.event === "group_unsubscribe") {
        // Find user by email
        const usersSnapshot = await db
          .collection("users")
          .where("email", "==", email)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          const userId = userDoc.id;

          // Update user preferences
          await userDoc.ref.update({
            emailMarketingEnabled: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Update emailSubscribers document
          await db.collection("emailSubscribers").doc(userId).set({
            email,
            userId,
            unsubscribed: true,
            marketingUnsubscribed: true,
            unsubscribedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: "sendgrid-webhook",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });

          functions.logger.info("Processed unsubscribe", { email, userId });
        }
      }

      // Handle bounce events
      if (event.event === "bounce" || event.event === "dropped") {
        const usersSnapshot = await db
          .collection("users")
          .where("email", "==", email)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          const userId = userDoc.id;

          // Mark email as bounced
          await db.collection("emailSubscribers").doc(userId).set({
            email,
            userId,
            bounced: true,
            bounceType: event.event,
            bouncedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });

          functions.logger.info("Processed bounce", { email, userId, type: event.event });
        }
      }
    } catch (error) {
      functions.logger.error("Error processing webhook event", {
        event: event.event,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  res.status(200).send("OK");
});

// ============================================
// ADMIN: UPDATE PROFILE STATS AND BADGES
// ============================================

/**
 * Admin function to update a user's profile stats and add merit badges
 * Only callable by admins (checks isAdministrator flag in profiles)
 */
export const adminUpdateProfile = functions.https.onCall(
  async (
    data: {
      targetUserId: string;
      stats?: {
        tripsCount?: number;
        tipsCount?: number;
        gearReviewsCount?: number;
        questionsCount?: number;
        photosCount?: number;
      };
      addBadge?: {
        id: string;
        name: string;
        icon: string;
        color: string;
      };
    },
    context
  ) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }

    const callerUid = context.auth.uid;
    const db = admin.firestore();

    // Check if caller is an administrator (check multiple fields like Firestore rules do)
    const callerProfile = await db.collection("profiles").doc(callerUid).get();
    const profileData = callerProfile.data();
    const isAdminUser = callerProfile.exists && (
      profileData?.isAdministrator === true ||
      profileData?.isAdmin === true ||
      profileData?.role === "admin" ||
      profileData?.role === "administrator" ||
      profileData?.membershipTier === "isAdmin"
    );
    
    if (!isAdminUser) {
      functions.logger.warn("Admin check failed for user", {
        callerUid,
        profileExists: callerProfile.exists,
        profileData: profileData ? {
          isAdministrator: profileData.isAdministrator,
          isAdmin: profileData.isAdmin,
          role: profileData.role,
          membershipTier: profileData.membershipTier,
        } : null,
      });
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only administrators can update profiles"
      );
    }

    const { targetUserId, stats, addBadge } = data;

    if (!targetUserId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Target user ID is required"
      );
    }

    const profileRef = db.collection("profiles").doc(targetUserId);
    const profileSnap = await profileRef.get();

    if (!profileSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Target profile not found"
      );
    }

    const currentData = profileSnap.data() || {};
    const updateData: Record<string, unknown> = {};

    // Update stats if provided
    if (stats) {
      updateData.stats = {
        ...(currentData.stats || {}),
        ...stats,
      };
    }

    // Add or update badge if provided
    if (addBadge) {
      const currentBadges = currentData.meritBadges || [];
      // Find existing badge index
      const existingIndex = currentBadges.findIndex(
        (b: { id: string }) => b.id === addBadge.id
      );
      
      if (existingIndex >= 0) {
        // Update existing badge (keep earnedAt, update other fields)
        const updatedBadges = [...currentBadges];
        updatedBadges[existingIndex] = {
          ...currentBadges[existingIndex],
          ...addBadge,
        };
        updateData.meritBadges = updatedBadges;
      } else {
        // Add new badge
        updateData.meritBadges = [
          ...currentBadges,
          {
            ...addBadge,
            earnedAt: new Date().toISOString(),
          },
        ];
      }
    }

    if (Object.keys(updateData).length > 0) {
      await profileRef.update(updateData);
      functions.logger.info("Profile updated by admin", {
        adminUid: callerUid,
        targetUserId,
        updates: Object.keys(updateData),
      });
    }

    return { success: true, updated: Object.keys(updateData) };
  }
);

