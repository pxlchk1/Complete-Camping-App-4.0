/**
 * One-Time Cleanup Script: Remove Orphaned userEmailIndex Documents
 * 
 * This script identifies and optionally deletes userEmailIndex documents
 * where the referenced user no longer exists in:
 * - Firebase Auth
 * - Firestore users/{userId}
 * 
 * USAGE:
 *   DRY RUN (default, safe):
 *     npx ts-node scripts/cleanupOrphanedUserEmailIndex.ts
 * 
 *   ACTUAL DELETE (requires explicit flag):
 *     npx ts-node scripts/cleanupOrphanedUserEmailIndex.ts --commit
 * 
 * SAFETY:
 * - Default mode is DRY_RUN (no deletes)
 * - Must pass --commit to actually delete
 * - Paginates to avoid memory issues
 * - Batches deletes at 450 per batch (under Firestore 500 limit)
 * - Logs all candidates for review before deletion
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS or default)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

// Configuration
const BATCH_SIZE = 450; // Stay under Firestore 500 limit
const PAGE_SIZE = 500;  // Documents per query page
const MAX_CANDIDATES_TO_LOG = 20; // Log first N candidates for review

interface CleanupStats {
  scanned: number;
  orphanCandidates: number;
  deleted: number;
  kept: number;
  errors: number;
}

interface OrphanCandidate {
  email: string;
  userId: string;
  reason: "auth-missing" | "both-missing";
}

/**
 * Check if a Firebase Auth user exists
 */
async function authUserExists(userId: string): Promise<boolean> {
  try {
    await auth.getUser(userId);
    return true;
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    if (firebaseError.code === "auth/user-not-found") {
      return false;
    }
    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Check if a Firestore users/{userId} document exists
 */
async function usersDocExists(userId: string): Promise<boolean> {
  const doc = await db.collection("users").doc(userId).get();
  return doc.exists;
}

/**
 * Main cleanup function
 */
async function cleanupOrphanedUserEmailIndex(commitMode: boolean): Promise<void> {
  console.log("=".repeat(60));
  console.log("userEmailIndex Orphan Cleanup Script");
  console.log("=".repeat(60));
  console.log(`Mode: ${commitMode ? "COMMIT (will delete)" : "DRY RUN (no deletes)"}`);
  console.log("");

  const stats: CleanupStats = {
    scanned: 0,
    orphanCandidates: 0,
    deleted: 0,
    kept: 0,
    errors: 0,
  };

  const orphanCandidates: OrphanCandidate[] = [];
  let lastDocId: string | null = null;
  let hasMore = true;

  // Phase 1: Scan and identify orphans
  console.log("Phase 1: Scanning userEmailIndex documents...");
  console.log("");

  while (hasMore) {
    let query = db.collection("userEmailIndex")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(PAGE_SIZE);

    if (lastDocId) {
      query = query.startAfter(lastDocId);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    for (const doc of snapshot.docs) {
      stats.scanned++;
      const email = doc.id;
      const data = doc.data();
      const userId = data?.userId;

      if (!userId) {
        console.log(`  [WARN] No userId in userEmailIndex/${email}, skipping`);
        stats.errors++;
        continue;
      }

      try {
        // Check if users/{userId} exists
        const usersExists = await usersDocExists(userId);
        
        // Check if Auth user exists
        const authExists = await authUserExists(userId);

        if (!usersExists && !authExists) {
          // Both missing - definite orphan
          orphanCandidates.push({ email, userId, reason: "both-missing" });
          stats.orphanCandidates++;
        } else if (!authExists && usersExists) {
          // Auth missing but users doc exists - also an orphan (Auth is source of truth)
          orphanCandidates.push({ email, userId, reason: "auth-missing" });
          stats.orphanCandidates++;
        } else {
          stats.kept++;
        }
      } catch (error) {
        console.log(`  [ERROR] Failed to check ${email} (userId: ${userId}): ${error}`);
        stats.errors++;
      }

      // Progress indicator
      if (stats.scanned % 100 === 0) {
        console.log(`  Scanned ${stats.scanned} documents...`);
      }
    }

    lastDocId = snapshot.docs[snapshot.docs.length - 1].id;
    
    if (snapshot.size < PAGE_SIZE) {
      hasMore = false;
    }
  }

  console.log("");
  console.log(`Scan complete. Scanned: ${stats.scanned}, Orphans found: ${stats.orphanCandidates}`);
  console.log("");

  // Phase 2: Log orphan candidates for review
  if (orphanCandidates.length > 0) {
    console.log("Phase 2: Orphan candidates (first " + Math.min(MAX_CANDIDATES_TO_LOG, orphanCandidates.length) + "):");
    console.log("-".repeat(60));
    
    orphanCandidates.slice(0, MAX_CANDIDATES_TO_LOG).forEach((candidate, i) => {
      console.log(`  ${i + 1}. email: ${candidate.email}`);
      console.log(`     userId: ${candidate.userId}`);
      console.log(`     reason: ${candidate.reason}`);
    });
    
    if (orphanCandidates.length > MAX_CANDIDATES_TO_LOG) {
      console.log(`  ... and ${orphanCandidates.length - MAX_CANDIDATES_TO_LOG} more`);
    }
    console.log("");
  }

  // Phase 3: Delete orphans (only in commit mode)
  if (commitMode && orphanCandidates.length > 0) {
    console.log("Phase 3: Deleting orphaned documents...");
    console.log("");

    // Process in batches
    for (let i = 0; i < orphanCandidates.length; i += BATCH_SIZE) {
      const batchCandidates = orphanCandidates.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const candidate of batchCandidates) {
        const docRef = db.collection("userEmailIndex").doc(candidate.email);
        batch.delete(docRef);
      }

      try {
        await batch.commit();
        stats.deleted += batchCandidates.length;
        console.log(`  Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchCandidates.length} documents`);
      } catch (error) {
        console.log(`  [ERROR] Batch delete failed: ${error}`);
        stats.errors += batchCandidates.length;
      }
    }

    console.log("");
  } else if (!commitMode && orphanCandidates.length > 0) {
    console.log("Phase 3: SKIPPED (dry run mode)");
    console.log("  To actually delete, run with --commit flag");
    console.log("");
  }

  // Final summary
  console.log("=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Scanned:          ${stats.scanned}`);
  console.log(`  Orphan candidates: ${stats.orphanCandidates}`);
  console.log(`  Deleted:          ${stats.deleted}`);
  console.log(`  Kept:             ${stats.kept}`);
  console.log(`  Errors:           ${stats.errors}`);
  console.log("");

  if (!commitMode && stats.orphanCandidates > 0) {
    console.log("⚠️  DRY RUN - No documents were deleted.");
    console.log("   Run with --commit to actually delete orphaned documents.");
  } else if (commitMode && stats.deleted > 0) {
    console.log("✅ Cleanup complete. Orphaned documents have been deleted.");
  } else if (stats.orphanCandidates === 0) {
    console.log("✅ No orphaned documents found. Database is clean.");
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const commitMode = args.includes("--commit");

// Run the cleanup
cleanupOrphanedUserEmailIndex(commitMode)
  .then(() => {
    console.log("");
    console.log("Script finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed with error:", error);
    process.exit(1);
  });
