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
        from: {
          email: "noreply@tentandlantern.com",
          name: "Complete Camping App",
        },
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
// USER DELETION CLEANUP
// ============================================

/**
 * Normalize email for consistent lookups
 */
function normalizeEmailForIndex(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.toLowerCase().trim();
}

/**
 * Clean up Firestore documents when a user is deleted from Firebase Auth
 * 
 * This function:
 * 1. Deletes userEmailIndex/{normalizedEmail} ONLY if it belongs to this user
 * 2. Deletes users/{uid}
 * 3. Deletes profiles/{uid}
 * 4. Deletes emailSubscribers/{uid}
 * 5. Deletes pushTokens where userId == uid
 * 
 * SAFETY INVARIANT: userEmailIndex is only deleted if index.userId === deletedUid
 */
export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  const db = admin.firestore();
  
  // Track what we're doing for logging
  const cleanupLog: {
    uid: string;
    hadAuthEmail: boolean;
    hadUsersDocEmail: boolean;
    normalizedEmail: string | null;
    indexFound: boolean;
    indexUserId: string | null;
    indexAction: "deleted" | "skipped-mismatch" | "skipped-no-email" | "skipped-not-found";
    deletedDocs: string[];
    deletedPushTokensCount: number;
    errors: string[];
  } = {
    uid,
    hadAuthEmail: !!user.email,
    hadUsersDocEmail: false,
    normalizedEmail: null,
    indexFound: false,
    indexUserId: null,
    indexAction: "skipped-no-email",
    deletedDocs: [],
    deletedPushTokensCount: 0,
    errors: [],
  };

  functions.logger.info("onUserDeleted triggered", { uid, email: user.email });

  try {
    // Step 1: Determine normalizedEmail
    // First try from users/{uid} doc (more reliable), then from Auth record
    let normalizedEmail: string | null = null;
    
    try {
      const usersDoc = await db.collection("users").doc(uid).get();
      if (usersDoc.exists) {
        const userData = usersDoc.data();
        const emailFromDoc = userData?.email || userData?.normalizedEmail;
        if (emailFromDoc) {
          normalizedEmail = normalizeEmailForIndex(emailFromDoc);
          cleanupLog.hadUsersDocEmail = true;
        }
      }
    } catch (err) {
      cleanupLog.errors.push(`Failed to read users/${uid}: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // Fallback to Auth record email
    if (!normalizedEmail && user.email) {
      normalizedEmail = normalizeEmailForIndex(user.email);
    }
    
    cleanupLog.normalizedEmail = normalizedEmail;

    // Step 2: Handle userEmailIndex cleanup (CRITICAL SAFETY CHECK)
    if (normalizedEmail) {
      try {
        const indexRef = db.collection("userEmailIndex").doc(normalizedEmail);
        const indexDoc = await indexRef.get();
        
        if (indexDoc.exists) {
          cleanupLog.indexFound = true;
          const indexData = indexDoc.data();
          const indexUserId = indexData?.userId;
          cleanupLog.indexUserId = indexUserId || null;
          
          // SAFETY INVARIANT: Only delete if userId matches
          if (indexUserId === uid) {
            await indexRef.delete();
            cleanupLog.indexAction = "deleted";
            cleanupLog.deletedDocs.push(`userEmailIndex/${normalizedEmail}`);
            functions.logger.info("Deleted userEmailIndex", { normalizedEmail, uid });
          } else {
            // CRITICAL: Do NOT delete - belongs to different user
            cleanupLog.indexAction = "skipped-mismatch";
            functions.logger.warn("userEmailIndex belongs to different user, NOT deleting", {
              normalizedEmail,
              deletedUid: uid,
              indexUserId,
            });
          }
        } else {
          cleanupLog.indexAction = "skipped-not-found";
          functions.logger.info("userEmailIndex not found", { normalizedEmail });
        }
      } catch (err) {
        cleanupLog.errors.push(`Failed to process userEmailIndex: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      cleanupLog.indexAction = "skipped-no-email";
      functions.logger.info("No email available for userEmailIndex cleanup", { uid });
    }

    // Step 3: Delete UID-keyed documents (users, profiles, emailSubscribers)
    const uidKeyedDocs = [
      `users/${uid}`,
      `profiles/${uid}`,
      `emailSubscribers/${uid}`,
    ];

    for (const docPath of uidKeyedDocs) {
      try {
        const docRef = db.doc(docPath);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          await docRef.delete();
          cleanupLog.deletedDocs.push(docPath);
          functions.logger.info("Deleted document", { path: docPath });
        }
      } catch (err) {
        cleanupLog.errors.push(`Failed to delete ${docPath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Step 4: Delete pushTokens where userId == uid (query-based, chunked)
    try {
      const pushTokensQuery = db.collection("pushTokens").where("userId", "==", uid);
      let deletedTokens = 0;
      let hasMore = true;
      
      while (hasMore) {
        const snapshot = await pushTokensQuery.limit(450).get();
        
        if (snapshot.empty) {
          hasMore = false;
          break;
        }
        
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          deletedTokens++;
        });
        
        await batch.commit();
        
        // If we got less than 450, we're done
        if (snapshot.size < 450) {
          hasMore = false;
        }
      }
      
      cleanupLog.deletedPushTokensCount = deletedTokens;
      if (deletedTokens > 0) {
        functions.logger.info("Deleted pushTokens", { uid, count: deletedTokens });
      }
    } catch (err) {
      cleanupLog.errors.push(`Failed to delete pushTokens: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Final summary log
    functions.logger.info("onUserDeleted cleanup complete", cleanupLog);

  } catch (error) {
    // Top-level catch - should never throw to avoid blocking Auth deletion
    functions.logger.error("onUserDeleted encountered unexpected error", {
      uid,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
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

      // Filter out disabled tokens, prefer standalone over Expo Go, deduplicate by value
      const enabledDocs = tokensSnapshot.docs.filter((t) => t.data().disabled !== true);
      const standaloneDocs = enabledDocs.filter((t) => t.data().appOwnership !== "expo");
      const preferredDocs = standaloneDocs.length > 0 ? standaloneDocs : enabledDocs;
      const tokens = preferredDocs.map((t) => t.data().token);
      const expoTokens = [...new Set(
        tokens.filter((t: string) => t && t.startsWith("ExponentPushToken"))
      )];

      if (expoTokens.length === 0) {
        await doc.ref.update({
          status: "suppressed",
          suppressionReason: "no_expo_token",
        });
        continue;
      }

      const messages = expoTokens.map((token: string) => ({
        to: token,
        sound: "default" as const,
        title: notification.payload.title,
        body: notification.payload.body,
        data: {
          deepLink: notification.payload.deepLink || "",
          type: notification.type,
        },
      }));

      const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      const pushResult = await pushResponse.json();
      let anySuccess = false;
      if (pushResult.data) {
        for (const ticket of pushResult.data) {
          if (ticket.status === "ok") {
            anySuccess = true;
          } else {
            functions.logger.warn("Expo push ticket error", {
              notificationId: doc.id,
              ticket,
            });
          }
        }
      }

      if (!anySuccess) {
        await doc.ref.update({
          status: "failed",
          suppressionReason: "all_tickets_errored",
        });
        continue;
      }

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
            from: {
              email: "noreply@tentandlantern.com",
              name: "Complete Camping App",
            },
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
            from: {
              email: "noreply@tentandlantern.com",
              name: "Complete Camping App",
            },
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
            from: {
              email: "noreply@tentandlantern.com",
              name: "Complete Camping App",
            },
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

// ============================================
// ADMIN TEST PUSH - SEND IMMEDIATELY
// ============================================

/**
 * Send a test push notification immediately (admin only)
 * Sends to the admin's own device
 */
export const sendAdminTestPush = functions.https.onCall(
  async (
    data: {
      title: string;
      body: string;
      deepLink?: string;
      campaignName?: string;
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

    // Check if caller is an administrator
    const callerProfile = await db.collection("profiles").doc(callerUid).get();
    const profileData = callerProfile.data();
    const isAdminUser =
      callerProfile.exists &&
      (profileData?.isAdministrator === true ||
        profileData?.isAdmin === true ||
        profileData?.role === "admin" ||
        profileData?.role === "administrator" ||
        profileData?.membershipTier === "isAdmin");

    if (!isAdminUser) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only administrators can send test push notifications"
      );
    }

    // Validate input
    if (!data.title || !data.body) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: title and body are required"
      );
    }

    try {
      // Get admin's push tokens (only non-disabled)
      const tokensSnapshot = await db
        .collection("pushTokens")
        .where("userId", "==", callerUid)
        .get();

      if (tokensSnapshot.empty) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "No push token found for your device. Make sure notifications are enabled."
        );
      }

      // Filter out disabled tokens, extract token strings, and deduplicate
      const enabledDocs = tokensSnapshot.docs.filter((d) => d.data().disabled !== true);
      
      // Prefer standalone tokens over Expo Go tokens to avoid sending to the dev client
      const standaloneDocs = enabledDocs.filter((d) => d.data().appOwnership !== "expo");
      const preferredDocs = standaloneDocs.length > 0 ? standaloneDocs : enabledDocs;
      const tokens = preferredDocs.map((d) => d.data().token);
      let successCount = 0;
      let failureCount = 0;

      // Filter for Expo push tokens and deduplicate by value
      const expoTokens = [...new Set(
        tokens.filter((t: string) => t && t.startsWith("ExponentPushToken"))
      )];
      
      if (expoTokens.length === 0) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "No valid Expo push token found. Make sure notifications are enabled in the app."
        );
      }

      functions.logger.info("sendAdminTestPush: token summary", {
        totalDocs: tokensSnapshot.size,
        afterDisabledFilter: enabledDocs.length,
        standaloneDocs: standaloneDocs.length,
        uniqueExpoTokens: expoTokens.length,
      });

      // Send via Expo Push API
      const messages = expoTokens.map((token: string) => ({
        to: token,
        sound: "default" as const,
        title: data.title,
        body: data.body,
        data: {
          type: "admin_test",
          deepLink: data.deepLink || "",
          campaignName: data.campaignName || "",
          isTest: "true",
        },
      }));

      // Call Expo Push API
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      
      if (result.data) {
        for (const ticket of result.data) {
          if (ticket.status === "ok") {
            successCount++;
          } else {
            failureCount++;
            functions.logger.warn("Expo push ticket error", { ticket });
          }
        }
      }

      functions.logger.info("Admin test push sent via Expo", {
        adminUid: callerUid,
        title: data.title,
        successCount,
        failureCount,
      });

      return {
        success: successCount > 0,
        message: `Push sent to ${successCount} device(s)`,
        successCount,
        failureCount,
      };
    } catch (error) {
      // Re-throw HttpsError as-is so the client gets the real error code/message
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("Failed to send admin test push", {
        adminUid: callerUid,
        error: errorMessage,
      });
      throw new functions.https.HttpsError("internal", `Failed to send push: ${errorMessage}`);
    }
  }
);

// ============================================
// ADMIN TEST EMAIL - SEND IMMEDIATELY
// ============================================

/**
 * Send a test email immediately (admin only)
 * Uses the drip template for campaign emails
 */
export const sendAdminTestEmail = functions
  .runWith({ secrets: [sendgridApiKey, sendgridFromEmail] })
  .https.onCall(
    async (
      data: {
        toEmail: string;
        subjectLine?: string;
        templateData: {
          firstName?: string;
          headline: string;
          body: string;
          ctaText?: string;
          ctaLink?: string;
          preheader?: string;
          tip1?: string;
          tip2?: string;
          tip3?: string;
        };
        campaignName?: string;
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

      // Check if caller is an administrator
      const callerProfile = await db.collection("profiles").doc(callerUid).get();
      const profileData = callerProfile.data();
      const isAdminUser =
        callerProfile.exists &&
        (profileData?.isAdministrator === true ||
          profileData?.isAdmin === true ||
          profileData?.role === "admin" ||
          profileData?.role === "administrator" ||
          profileData?.membershipTier === "isAdmin");

      if (!isAdminUser) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only administrators can send test emails"
        );
      }

      // Validate input
      if (!data.toEmail || !data.templateData?.headline || !data.templateData?.body) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required fields: toEmail, headline, and body are required"
        );
      }

      try {
        sgMail.setApiKey(sendgridApiKey.value());

        const subjectLine = data.subjectLine || `🏕️ ${data.templateData.headline}`;

        // Normalize body: strip any <br> tags, fix double-escaped newlines
        const normalizeEmailBody = (input: string) => {
          if (!input) return '';
          return input
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/\\n/g, '\n');
        };

        const body = normalizeEmailBody(data.templateData.body);
        const includesBr = /<br\s*\/?>/i.test(body);
        functions.logger.info("sendAdminTestEmail body normalized", {
          first120: body.substring(0, 120),
          includesBr,
        });

        const msg = {
          to: data.toEmail,
          from: {
            email: "noreply@tentandlantern.com",
            name: "Complete Camping App",
          },
          subject: subjectLine,
          templateId: "d-184d34133fdb40f3b753592c223c0315", // Admin campaign template
          dynamicTemplateData: {
            subject: subjectLine, // For template to use via {{{subject}}}
            firstName: data.templateData.firstName || "Camper",
            headline: data.templateData.headline,
            body: body, // Plain text with \n intact, no <br> tags
            ctaText: data.templateData.ctaText || "Open App",
            ctaLink: data.templateData.ctaLink || "https://tentandlantern.com/app",
            preheader: data.templateData.preheader || data.templateData.body.substring(0, 100),
            year: new Date().getFullYear(),
            tip1: data.templateData.tip1,
            tip2: data.templateData.tip2,
            tip3: data.templateData.tip3,
          },
        };

        await sgMail.send(msg);

        // Log the test email
        await db.collection("adminTestEmails").add({
          to: data.toEmail,
          subjectLine: data.subjectLine,
          templateData: data.templateData,
          campaignName: data.campaignName,
          sentBy: callerUid,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "sent",
        });

        functions.logger.info("Admin test email sent", {
          adminUid: callerUid,
          to: data.toEmail,
          headline: data.templateData.headline,
        });

        return { success: true, message: `Test email sent to ${data.toEmail}` };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        functions.logger.error("Failed to send admin test email", {
          adminUid: callerUid,
          to: data.toEmail,
          error: errorMessage,
        });
        throw new functions.https.HttpsError("internal", `Failed to send email: ${errorMessage}`);
      }
    }
  );

/**
 * Publish email campaign to all eligible recipients (admin only)
 * Sends to all users with verified emails who have notifications enabled
 */
export const publishAdminEmail = functions
  .runWith({ secrets: [sendgridApiKey, sendgridFromEmail], timeoutSeconds: 300 })
  .https.onCall(
    async (
      data: {
        subjectLine?: string;
        templateData: {
          firstName?: string;
          headline: string;
          body: string;
          ctaText?: string;
          ctaLink?: string;
          preheader?: string;
          tip1?: string;
          tip2?: string;
          tip3?: string;
        };
        campaignName: string;
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

      // Check if caller is an administrator
      const callerProfile = await db.collection("profiles").doc(callerUid).get();
      const profileData = callerProfile.data();
      const isAdminUser =
        callerProfile.exists &&
        (profileData?.isAdministrator === true ||
          profileData?.isAdmin === true ||
          profileData?.role === "admin" ||
          profileData?.role === "administrator" ||
          profileData?.membershipTier === "isAdmin");

      if (!isAdminUser) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only administrators can publish email campaigns"
        );
      }

      // Validate input
      if (!data.campaignName || !data.templateData?.headline || !data.templateData?.body) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required fields: campaignName, headline, and body are required"
        );
      }

      // Idempotency check: has this campaign already been sent?
      const existingCampaign = await db
        .collection("adminEmailCampaigns")
        .where("campaignName", "==", data.campaignName)
        .where("status", "==", "sent")
        .limit(1)
        .get();

      if (!existingCampaign.empty) {
        functions.logger.warn("Campaign already sent, blocking duplicate", {
          campaignName: data.campaignName,
        });
        return {
          success: false,
          status: "already_sent",
          message: `Campaign "${data.campaignName}" has already been sent.`,
        };
      }

      try {
        sgMail.setApiKey(sendgridApiKey.value());

        // Get all users with email addresses
        const usersSnapshot = await db.collection("profiles").get();
        const totalUsersFound = usersSnapshot.size;

        // Filter to eligible recipients: has email, notifications not disabled
        const eligibleRecipients: Array<{ uid: string; email: string; firstName: string }> = [];

        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          const email = userData.email;
          // Skip if no email or if email notifications explicitly disabled
          if (email && userData.emailNotificationsDisabled !== true) {
            eligibleRecipients.push({
              uid: doc.id,
              email: email,
              firstName: userData.firstName || userData.displayName?.split(" ")[0] || "Camper",
            });
          }
        });

        const usersWithEmailCount = eligibleRecipients.length;
        const usersEligibleCount = eligibleRecipients.length;

        // Hard ceiling failsafe (1000 max)
        if (usersEligibleCount > 1000) {
          functions.logger.error("Recipient count exceeds hard ceiling", {
            usersEligibleCount,
            hardCeiling: 1000,
          });
          throw new functions.https.HttpsError(
            "failed-precondition",
            `Too many recipients (${usersEligibleCount}). Maximum allowed is 1000.`
          );
        }

        // Log masked sample of 5 recipients
        const maskedSample = eligibleRecipients.slice(0, 5).map((r) => {
          const [localPart, domain] = r.email.split("@");
          return `${localPart.substring(0, 3)}***@${domain}`;
        });

        functions.logger.info("publishAdminEmail starting", {
          campaignName: data.campaignName,
          totalUsersFound,
          usersWithEmailCount,
          usersEligibleCount,
          maskedSample,
        });

        // Normalize body
        const normalizeEmailBody = (input: string) => {
          if (!input) return "";
          return input.replace(/<br\s*\/?>/gi, "\n").replace(/\\n/g, "\n");
        };

        const body = normalizeEmailBody(data.templateData.body);
        const subjectLine = data.subjectLine || `🏕️ ${data.templateData.headline}`;

        // Send emails in batches of 100 (SendGrid recommends max 1000 personalizations per request)
        const BATCH_SIZE = 100;
        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < eligibleRecipients.length; i += BATCH_SIZE) {
          const batch = eligibleRecipients.slice(i, i + BATCH_SIZE);

          const personalizations = batch.map((recipient) => ({
            to: { email: recipient.email },
            dynamicTemplateData: {
              subject: subjectLine,
              firstName: recipient.firstName,
              headline: data.templateData.headline,
              body: body,
              ctaText: data.templateData.ctaText || "Open App",
              ctaLink: data.templateData.ctaLink || "https://tentandlantern.com/app",
              preheader: data.templateData.preheader || body.substring(0, 100),
              year: new Date().getFullYear(),
              tip1: data.templateData.tip1,
              tip2: data.templateData.tip2,
              tip3: data.templateData.tip3,
            },
          }));

          const msg = {
            from: {
              email: "noreply@tentandlantern.com",
              name: "Complete Camping App",
            },
            subject: subjectLine,
            templateId: "d-184d34133fdb40f3b753592c223c0315",
            personalizations,
          };

          try {
            await sgMail.send(msg);
            successCount += batch.length;
          } catch (batchError) {
            failCount += batch.length;
            const errorBody = batchError instanceof Error ? batchError.message : JSON.stringify(batchError);
            errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${errorBody}`);
            functions.logger.error("SendGrid batch error", {
              batchIndex: Math.floor(i / BATCH_SIZE),
              errorBody,
            });
          }
        }

        const recipientsAttemptedCount = eligibleRecipients.length;

        // Log campaign to Firestore
        await db.collection("adminEmailCampaigns").add({
          campaignName: data.campaignName,
          subjectLine,
          templateData: data.templateData,
          sentBy: callerUid,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "sent",
          totalUsersFound,
          usersWithEmailCount,
          usersEligibleCount,
          recipientsAttemptedCount,
          successCount,
          failCount,
          errors: errors.length > 0 ? errors : null,
        });

        functions.logger.info("publishAdminEmail completed", {
          campaignName: data.campaignName,
          totalUsersFound,
          usersWithEmailCount,
          usersEligibleCount,
          recipientsAttemptedCount,
          successCount,
          failCount,
        });

        return {
          success: true,
          status: "sent",
          recipientsAttemptedCount,
          usersEligibleCount,
          successCount,
          failCount,
          message: `Campaign sent to ${successCount} recipients${failCount > 0 ? ` (${failCount} failed)` : ""}.`,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        functions.logger.error("Failed to publish admin email campaign", {
          adminUid: callerUid,
          campaignName: data.campaignName,
          error: errorMessage,
        });
        throw new functions.https.HttpsError("internal", `Failed to publish campaign: ${errorMessage}`);
      }
    }
  );

/**
 * Publish push notification to all users with push tokens (admin only)
 */
export const publishAdminPush = functions
  .runWith({ timeoutSeconds: 300 })
  .https.onCall(
    async (
      data: {
        title: string;
        body: string;
        deepLink?: string;
        campaignName: string;
        ctaMode?: "url" | "subscription";
      },
      context
    ) => {
      if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
      }

      const callerUid = context.auth.uid;
      const db = admin.firestore();

      // Admin check
      const callerProfile = await db.collection("profiles").doc(callerUid).get();
      const profileData = callerProfile.data();
      const isAdminUser =
        callerProfile.exists &&
        (profileData?.isAdministrator === true ||
          profileData?.isAdmin === true ||
          profileData?.role === "admin" ||
          profileData?.role === "administrator" ||
          profileData?.membershipTier === "isAdmin");

      if (!isAdminUser) {
        throw new functions.https.HttpsError("permission-denied", "Only administrators can publish push notifications");
      }

      if (!data.title || !data.body || !data.campaignName) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields: title, body, and campaignName");
      }

      // Idempotency check
      const existingCampaign = await db
        .collection("adminPushCampaigns")
        .where("campaignName", "==", data.campaignName)
        .where("status", "==", "sent")
        .limit(1)
        .get();

      if (!existingCampaign.empty) {
        functions.logger.warn("Push campaign already sent", { campaignName: data.campaignName });
        return { success: false, status: "already_sent", message: `Campaign "${data.campaignName}" has already been sent.` };
      }

      try {
        // Get all active push tokens, prefer standalone over Expo Go
        const tokensSnapshot = await db.collection("pushTokens").where("disabled", "!=", true).get();
        const tokenCount = tokensSnapshot.size;

        // Hard ceiling
        if (tokenCount > 2000) {
          throw new functions.https.HttpsError("failed-precondition", `Too many recipients (${tokenCount}). Maximum is 2000.`);
        }

        // Group by userId and prefer standalone tokens per user
        const userTokenMap = new Map<string, { token: string; appOwnership?: string }>();
        tokensSnapshot.forEach((doc) => {
          const d = doc.data();
          if (!d.token || !d.token.startsWith("ExponentPushToken")) return;
          const existing = userTokenMap.get(d.userId);
          // Keep standalone over expo; first standalone wins
          if (!existing || (existing.appOwnership === "expo" && d.appOwnership !== "expo")) {
            userTokenMap.set(d.userId, { token: d.token, appOwnership: d.appOwnership || "standalone" });
          }
        });

        const tokens: { token: string; userId: string }[] = [];
        const seenTokens = new Set<string>();
        userTokenMap.forEach((val, userId) => {
          if (!seenTokens.has(val.token)) {
            seenTokens.add(val.token);
            tokens.push({ token: val.token, userId });
          }
        });

        // Log masked sample
        const maskedSample = tokens.slice(0, 5).map((t) => t.token.substring(0, 25) + "...");
        functions.logger.info("publishAdminPush starting", {
          campaignName: data.campaignName,
          tokenCount,
          expoTokenCount: tokens.length,
          maskedSample,
        });

        // Send in batches of 100 (Expo limit)
        const BATCH_SIZE = 100;
        let successCount = 0;
        let failureCount = 0;
        const sampleFailures: string[] = [];

        for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
          const batch = tokens.slice(i, i + BATCH_SIZE);
          const messages = batch.map((t) => ({
            to: t.token,
            sound: "default" as const,
            title: data.title,
            body: data.body,
            data: {
              type: "admin_broadcast",
              deepLink: data.ctaMode === "subscription" ? "paywall" : (data.deepLink || ""),
              campaignName: data.campaignName,
            },
          }));

          const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify(messages),
          });

          const result = await response.json();
          if (result.data) {
            for (let j = 0; j < result.data.length; j++) {
              const ticket = result.data[j];
              if (ticket.status === "ok") {
                successCount++;
              } else {
                failureCount++;
                if (sampleFailures.length < 3) {
                  sampleFailures.push(`Token ${batch[j].token.substring(0, 20)}...: ${ticket.message || ticket.details?.error || "unknown"}`);
                }
              }
            }
          }
        }

        // Log campaign
        await db.collection("adminPushCampaigns").add({
          campaignName: data.campaignName,
          title: data.title,
          body: data.body,
          deepLink: data.deepLink,
          ctaMode: data.ctaMode,
          sentBy: callerUid,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "sent",
          tokenCount,
          attemptedCount: tokens.length,
          successCount,
          failureCount,
          sampleFailures: sampleFailures.length > 0 ? sampleFailures : null,
        });

        functions.logger.info("publishAdminPush completed", {
          campaignName: data.campaignName,
          tokenCount,
          attemptedCount: tokens.length,
          successCount,
          failureCount,
          sampleFailures,
        });

        return {
          success: true,
          status: "sent",
          tokenCount,
          attemptedCount: tokens.length,
          successCount,
          failureCount,
          message: `Push sent to ${successCount} devices${failureCount > 0 ? ` (${failureCount} failed)` : ""}.`,
        };
      } catch (error) {
        // Re-throw HttpsError as-is so the client gets the real error code/message
        if (error instanceof functions.https.HttpsError) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        functions.logger.error("Failed to publish push campaign", { campaignName: data.campaignName, error: errorMessage });
        throw new functions.https.HttpsError("internal", `Failed to publish: ${errorMessage}`);
      }
    }
  );

/**
 * Publish announcement modal to all users (admin only)
 * Writes to announcements/active document
 */
export const publishAdminModal = functions.https.onCall(
  async (
    data: {
      campaignName: string;
      headline: string;
      body: string;
      microCopy?: string;
      ctaText?: string;
      ctaMode: "url" | "subscription" | "none";
      ctaLink?: string;
      preserveVersionId?: boolean;
    },
    context
  ) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }

    const callerUid = context.auth.uid;
    const db = admin.firestore();

    // Admin check
    const callerProfile = await db.collection("profiles").doc(callerUid).get();
    const profileData = callerProfile.data();
    const isAdminUser =
      callerProfile.exists &&
      (profileData?.isAdministrator === true ||
        profileData?.isAdmin === true ||
        profileData?.role === "admin" ||
        profileData?.role === "administrator" ||
        profileData?.membershipTier === "isAdmin");

    if (!isAdminUser) {
      throw new functions.https.HttpsError("permission-denied", "Only administrators can publish announcements");
    }

    if (!data.campaignName || !data.headline || !data.body) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required fields: campaignName, headline, and body");
    }

    try {
      // Determine versionId: reuse existing if preserveVersionId=true, otherwise generate new
      let versionId: string;
      if (data.preserveVersionId) {
        const existingDoc = await db.collection("announcements").doc("active").get();
        if (existingDoc.exists && existingDoc.data()?.versionId) {
          versionId = existingDoc.data()!.versionId;
          functions.logger.info("publishAdminModal: preserving existing versionId", { versionId });
        } else {
          versionId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          functions.logger.info("publishAdminModal: no existing versionId, generating new", { versionId });
        }
      } else {
        versionId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      }

      // Write to announcements/active
      await db.collection("announcements").doc("active").set({
        isActive: true,
        versionId,
        campaignName: data.campaignName,
        headline: data.headline,
        body: data.body,
        microCopy: data.microCopy || "",
        ctaText: data.ctaText || "OK",
        ctaMode: data.ctaMode,
        ctaLink: data.ctaLink || "",
        audience: "all",
        publishedBy: callerUid,
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info("publishAdminModal completed", {
        campaignName: data.campaignName,
        versionId,
        preservedVersionId: data.preserveVersionId || false,
        publishedBy: callerUid,
      });

      return {
        success: true,
        status: "published",
        versionId,
        message: `Announcement "${data.campaignName}" published to all users.`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("Failed to publish announcement", { campaignName: data.campaignName, error: errorMessage });
      throw new functions.https.HttpsError("internal", `Failed to publish: ${errorMessage}`);
    }
  }
);

// ============================================
// SENDGRID DRIP SUBSCRIPTION FUNCTION
// ============================================

/**
 * SendGrid Marketing Contacts List ID for CCA Drip Entry
 * Set via: firebase functions:secrets:set SENDGRID_DRIP_LIST_ID
 */
const sendgridDripListId = defineSecret("SENDGRID_DRIP_LIST_ID");

/**
 * Subscribe a user to the email drip campaign
 * 
 * This function:
 * 1. Validates the authenticated user matches the payload
 * 2. Upserts the contact in SendGrid Marketing Contacts
 * 3. Adds the contact to the "CCA Drip Entry" list
 * 4. Updates Firestore with subscription status
 * 
 * The SendGrid Automation triggers automatically when contact is added to the list.
 * 
 * Required secrets:
 * - SENDGRID_API_KEY: SendGrid API key with Marketing permissions
 * - SENDGRID_DRIP_LIST_ID: The list ID for "CCA Drip Entry"
 */
export const sendgridSubscribeToDrip = functions
  .runWith({ secrets: [sendgridApiKey, sendgridDripListId] })
  .https.onCall(
    async (
      data: {
        email: string;
        firstName: string;
        userId: string;
        source: string;
      },
      context
    ) => {
      // Require authentication
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Must be authenticated to subscribe"
        );
      }

      const { email, firstName, userId, source } = data;

      // Validate uid matches payload userId
      if (context.auth.uid !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User ID mismatch"
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email.trim())) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid email address"
        );
      }

      const normalizedEmail = email.trim().toLowerCase();
      const trimmedFirstName = firstName?.trim() || "";
      const db = admin.firestore();
      const listId = sendgridDripListId.value();

      if (!listId) {
        functions.logger.error("SENDGRID_DRIP_LIST_ID secret not set");
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Email subscription service not configured"
        );
      }

      try {
        functions.logger.info("sendgridSubscribeToDrip: Starting", {
          userId,
          email: normalizedEmail,
          source,
        });

        // Use SendGrid Marketing API to upsert contact and add to list
        const apiKey = sendgridApiKey.value();
        
        // Import SendGrid client dynamically to use Marketing API
        const client = require("@sendgrid/client");
        client.setApiKey(apiKey);

        // Upsert contact and add to list in one API call
        // Using PUT /marketing/contacts with list_ids
        const contactData = {
          list_ids: [listId],
          contacts: [
            {
              email: normalizedEmail,
              first_name: trimmedFirstName,
              custom_fields: {
                // Add any custom fields defined in SendGrid
              },
            },
          ],
        };

        const [response] = await client.request({
          url: "/v3/marketing/contacts",
          method: "PUT",
          body: contactData,
        });

        functions.logger.info("SendGrid Marketing API response", {
          statusCode: response.statusCode,
          body: response.body,
        });

        // Check for success (202 Accepted is the expected response)
        if (response.statusCode !== 202 && response.statusCode !== 200) {
          throw new Error(`SendGrid API returned status ${response.statusCode}`);
        }

        // Extract job_id from response (contacts are processed async)
        const jobId = response.body?.job_id;

        // Update Firestore with successful subscription
        const now = admin.firestore.FieldValue.serverTimestamp();

        // Update users/{uid}
        await db.collection("users").doc(userId).update({
          emailSubscribed: true,
          emailSubscribedAt: now,
          updatedAt: now,
        });

        // Upsert emailSubscribers/{uid}
        await db.collection("emailSubscribers").doc(userId).set(
          {
            email: normalizedEmail,
            userId,
            unsubscribed: false,
            source: source || "app_optin",
            updatedAt: now,
            sendgrid: {
              status: "subscribed",
              subscribedAt: now,
              listId: listId,
              jobId: jobId || null,
            },
          },
          { merge: true }
        );

        // Ensure createdAt exists
        const subscriberDoc = await db.collection("emailSubscribers").doc(userId).get();
        if (subscriberDoc.exists && !subscriberDoc.data()?.createdAt) {
          await db.collection("emailSubscribers").doc(userId).update({
            createdAt: now,
          });
        }

        functions.logger.info("sendgridSubscribeToDrip: Success", {
          userId,
          email: normalizedEmail,
          jobId,
        });

        return {
          success: true,
          message: "Successfully subscribed to email updates",
          jobId: jobId || undefined,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorDetails = error instanceof Error ? error.stack : String(error);
        
        functions.logger.error("sendgridSubscribeToDrip: Failed", {
          userId,
          email: normalizedEmail,
          error: errorMessage,
          details: errorDetails,
        });

        // Do NOT update Firestore as subscribed on error
        throw new functions.https.HttpsError(
          "internal",
          `Failed to subscribe: ${errorMessage}`
        );
      }
    }
  );

// ============================================
// ADMIN: BULK DELETE TEST ACCOUNTS (@alanawaters.com)
// ============================================

/**
 * Admin-only callable function to bulk delete test accounts.
 *
 * Server-side checks:
 *  1. Caller must be authenticated.
 *  2. Caller must be an administrator (Firestore profiles check).
 *  3. Every supplied UID is re-verified to have an @alanawaters.com email.
 *  4. An execution lock prevents concurrent runs.
 *
 * Deletion order per account:
 *  Firestore docs  ->  Storage assets  ->  Firebase Auth user
 * (Auth deletion triggers onUserDeleted which is idempotent.)
 */
export const adminBulkDeleteTestAccounts = functions
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .https.onCall(
    async (
      data: { uids: string[] },
      context
    ) => {
      // ---- 1. Auth check ----
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Must be authenticated"
        );
      }

      const callerUid = context.auth.uid;
      const db = admin.firestore();

      // ---- 2. Admin check ----
      const callerProfile = await db.collection("profiles").doc(callerUid).get();
      const profileData = callerProfile.data();
      const isAdminUser =
        callerProfile.exists &&
        (profileData?.isAdministrator === true ||
          profileData?.isAdmin === true ||
          profileData?.role === "admin" ||
          profileData?.role === "administrator" ||
          profileData?.membershipTier === "isAdmin");

      if (!isAdminUser) {
        functions.logger.warn("adminBulkDeleteTestAccounts: non-admin caller", {
          callerUid,
        });
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only administrators can perform bulk account deletion"
        );
      }

      // ---- 3. Validate input ----
      const { uids } = data;
      if (!Array.isArray(uids) || uids.length === 0) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Must provide a non-empty array of UIDs"
        );
      }
      if (uids.length > 200) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Cannot delete more than 200 accounts in a single request"
        );
      }

      // ---- 4. Execution lock ----
      const lockRef = db.collection("admin_cleanup_locks").doc("test_account_cleanup");
      const lockSnap = await lockRef.get();
      if (lockSnap.exists && lockSnap.data()?.active === true) {
        const startedAt = lockSnap.data()?.startedAt?.toDate?.();
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (startedAt && startedAt > fiveMinAgo) {
          throw new functions.https.HttpsError(
            "already-exists",
            "A cleanup operation is already in progress. Please wait."
          );
        }
        // Stale lock — proceed
      }

      await lockRef.set({
        active: true,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        adminId: callerUid,
      });

      const TARGET_DOMAIN = "@alanawaters.com";
      const results: {
        uid: string;
        email: string;
        status: "deleted" | "failed" | "skipped";
        error?: string;
      }[] = [];

      try {
        // ---- 5. Process each UID ----
        for (const uid of uids) {
          try {
            // 5a. Server-side domain verification via Firebase Auth
            let authUser: admin.auth.UserRecord;
            try {
              authUser = await admin.auth().getUser(uid);
            } catch (authErr: any) {
              if (authErr?.code === "auth/user-not-found") {
                // No auth record — still clean up Firestore docs
                await deleteFirestoreDocs(db, uid);
                results.push({
                  uid,
                  email: "unknown",
                  status: "deleted",
                  error: "Auth record not found; Firestore docs cleaned",
                });
                continue;
              }
              throw authErr;
            }

            const email = (authUser.email || "").toLowerCase();
            if (!email.endsWith(TARGET_DOMAIN)) {
              results.push({
                uid,
                email,
                status: "skipped",
                error: "Email does not match @alanawaters.com domain",
              });
              continue;
            }

            // 5b. Delete Firestore documents
            await deleteFirestoreDocs(db, uid);

            // 5c. Delete Storage avatars
            try {
              const bucket = admin.storage().bucket();
              const [files] = await bucket.getFiles({
                prefix: `avatars/${uid}/`,
              });
              if (files.length > 0) {
                await Promise.all(files.map((f) => f.delete()));
              }
            } catch (_storageErr) {
              // Non-fatal — avatar may not exist
            }

            // 5d. Delete Firebase Auth user (triggers onUserDeleted which is idempotent)
            await admin.auth().deleteUser(uid);

            results.push({ uid, email, status: "deleted" });
          } catch (perUserErr: any) {
            results.push({
              uid,
              email: "unknown",
              status: "failed",
              error:
                perUserErr instanceof Error
                  ? perUserErr.message
                  : String(perUserErr),
            });
          }
        }

        // ---- 6. Audit log ----
        const deleted = results.filter((r) => r.status === "deleted").length;
        const failed = results.filter((r) => r.status === "failed").length;
        const skipped = results.filter((r) => r.status === "skipped").length;

        await db.collection("admin_audit_logs").add({
          adminId: callerUid,
          action: "bulk_test_account_delete",
          domain: "alanawaters.com",
          deletedCount: deleted,
          failedCount: failed,
          skippedCount: skipped,
          affectedUids: uids,
          results,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.info("adminBulkDeleteTestAccounts complete", {
          callerUid,
          deleted,
          failed,
          skipped,
          total: uids.length,
        });

        return { summary: { deleted, failed, skipped }, results };
      } finally {
        // ---- 7. Release lock ----
        await lockRef.delete().catch(() => {});
      }
    }
  );

/**
 * Helper: delete all Firestore documents associated with a user UID.
 * Used by adminBulkDeleteTestAccounts.
 */
async function deleteFirestoreDocs(
  db: admin.firestore.Firestore,
  uid: string
): Promise<void> {
  // UID-keyed documents
  const uidKeyedPaths = [
    `users/${uid}`,
    `profiles/${uid}`,
    `emailSubscribers/${uid}`,
  ];

  for (const path of uidKeyedPaths) {
    try {
      const ref = db.doc(path);
      const snap = await ref.get();
      if (snap.exists) {
        await ref.delete();
      }
    } catch (_e) {
      // Non-fatal per doc
    }
  }

  // Query-based: pushTokens
  try {
    const pushTokensSnap = await db
      .collection("pushTokens")
      .where("userId", "==", uid)
      .get();
    if (!pushTokensSnap.empty) {
      const batch = db.batch();
      pushTokensSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (_e) {
    // Non-fatal
  }

  // Query-based: userEmailIndex (if email known from users doc)
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const email = userDoc.data()?.email;
      if (email) {
        const normalizedEmail = email.toLowerCase().trim();
        const indexRef = db.collection("userEmailIndex").doc(normalizedEmail);
        const indexSnap = await indexRef.get();
        if (indexSnap.exists && indexSnap.data()?.userId === uid) {
          await indexRef.delete();
        }
      }
    }
  } catch (_e) {
    // Non-fatal
  }
}
