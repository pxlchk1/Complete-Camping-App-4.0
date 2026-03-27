/**
 * HARD DELETE ALL TEST USERS (@alanawaters.com)
 *
 * This script permanently purges ALL Firebase Auth users, Firestore documents,
 * and Cloud Storage files associated with the @alanawaters.com email domain.
 *
 * Usage:
 *   cd functions
 *   GOOGLE_APPLICATION_CREDENTIALS=<path-to-service-account.json> node scripts/purgeTestUsers.js
 *   — or —
 *   firebase login  (already done)
 *   node scripts/purgeTestUsers.js
 *
 * SAFETY: Requires typing "DELETE ALL TEST USERS" to confirm.
 */

const admin = require("firebase-admin");
const readline = require("readline");

// Target domain — ONLY users with this email domain will be affected
const TARGET_DOMAIN = "@alanawaters.com";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({ projectId: "tentandlanternapp" });
}

const db = admin.firestore();
const auth = admin.auth();

// ============================================
// CONFIGURATION
// ============================================

// UID-keyed collections (document ID === user UID)
const UID_KEYED_COLLECTIONS = [
  "users",
  "profiles",
  "emailSubscribers",
];

// Collections queried by userId / authorId / ownerUid / ownerId / claimantUserId
const QUERIED_COLLECTIONS = [
  { collection: "pushTokens", field: "userId" },
  { collection: "trips", field: "userId" },
  { collection: "stories", field: "userId" },
  { collection: "photoPosts", field: "userId" },
  { collection: "tips", field: "userId" },
  { collection: "gearReviews", field: "userId" },
  { collection: "questions", field: "authorId" },
  { collection: "answers", field: "userId" },
  { collection: "userGear", field: "userId" },
  { collection: "userBadges", field: "userId" },
  { collection: "storyVotes", field: "userId" },
  { collection: "photoVotes", field: "userId" },
  { collection: "storyComments", field: "userId" },
  { collection: "tipComments", field: "userId" },
  { collection: "feedbackPosts", field: "userId" },
  { collection: "feedbackComments", field: "userId" },
  { collection: "contentReports", field: "userId" },
  { collection: "contentModeration", field: "userId" },
  { collection: "moderationLogs", field: "userId" },
  { collection: "reports", field: "userId" },
  { collection: "packingTemplates", field: "userId" },
  { collection: "badgeClaims", field: "claimantUserId" },
  { collection: "campgroundContacts", field: "ownerId" },
  { collection: "campgroundContacts", field: "contactUserId" },
  { collection: "campgroundInvites", field: "inviterUid" },
  { collection: "notificationQueue", field: "userId" },
  { collection: "emailQueue", field: "userId" },
  { collection: "deletionRequests", field: "uid" },
  { collection: "connectPhotos", field: "userId" },
  { collection: "auditLogs", field: "userId" },
  { collection: "mealLibrary", field: "userId" },
  { collection: "membershipGrants", field: "userId" },
  { collection: "adminTestEmails", field: "sentBy" },
];

// Also check by email field for email-indexed data
const EMAIL_KEYED_COLLECTIONS = [
  { collection: "userEmailIndex", field: null }, // doc ID is the email
];

// Storage paths (prefix/{uid}/...)
const STORAGE_PREFIXES = [
  "stories",
  "photoPosts",
  "gearCloset",
  "avatars",
  "profileBackgrounds",
  "meritBadges",
  "badgePhotos",
  "gearReviews",
  "trips",
];

// ============================================
// HELPERS
// ============================================

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function deleteCollection(collectionPath, queryFn, uid, label) {
  let totalDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    const baseRef = db.collection(collectionPath);
    const snapshot = await (queryFn ? queryFn(baseRef) : baseRef).limit(450).get();

    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    totalDeleted += snapshot.size;

    if (snapshot.size < 450) {
      hasMore = false;
    }
  }

  if (totalDeleted > 0) {
    console.log(`  ✓ ${label}: deleted ${totalDeleted} doc(s)`);
  }

  return totalDeleted;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("=".repeat(60));
  console.log("HARD DELETE ALL TEST USERS (@alanawaters.com)");
  console.log("Project: tentandlanternapp");
  console.log("=".repeat(60));

  // ------------------------------------------------
  // STEP 1: Find target users
  // ------------------------------------------------
  console.log("\n--- STEP 1: Finding target users ---");

  const usersToDelete = [];
  let nextPageToken;

  do {
    const listResult = await auth.listUsers(1000, nextPageToken);
    for (const user of listResult.users) {
      if (user.email && user.email.toLowerCase().endsWith(TARGET_DOMAIN)) {
        usersToDelete.push({ uid: user.uid, email: user.email });
      }
    }
    nextPageToken = listResult.pageToken;
  } while (nextPageToken);

  if (usersToDelete.length === 0) {
    console.log("\nNo users found with @alanawaters.com emails. Nothing to do.");
    process.exit(0);
  }

  console.log(`\nFound ${usersToDelete.length} user(s) to delete:\n`);
  usersToDelete.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.email} (${u.uid})`);
  });

  // ------------------------------------------------
  // STEP 6 (moved up): Safety confirmation
  // ------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log("⚠️  THIS WILL PERMANENTLY DELETE ALL DATA FOR THE ABOVE USERS.");
  console.log("⚠️  THIS CANNOT BE UNDONE.");
  console.log("=".repeat(60));

  const confirmation = await prompt('\nType "DELETE ALL TEST USERS" to proceed: ');

  if (confirmation.trim() !== "DELETE ALL TEST USERS") {
    console.log("\n❌ ABORTED. Confirmation did not match.");
    process.exit(1);
  }

  console.log("\n✅ Confirmed. Beginning purge...\n");

  const results = {
    authDeleted: 0,
    docsDeleted: 0,
    storageDeleted: 0,
    failures: [],
  };

  // Store UIDs and emails before deleting auth
  const uidList = usersToDelete.map((u) => u.uid);
  const emailList = usersToDelete.map((u) => u.email.toLowerCase());

  // ------------------------------------------------
  // STEP 3: Delete Firestore data FIRST (before auth)
  // ------------------------------------------------
  console.log("--- STEP 3: Deleting Firestore data ---\n");

  for (const uid of uidList) {
    const user = usersToDelete.find((u) => u.uid === uid);
    console.log(`\nProcessing Firestore for: ${user.email} (${uid})`);

    // UID-keyed documents
    for (const col of UID_KEYED_COLLECTIONS) {
      try {
        const docRef = db.collection(col).doc(uid);
        const snap = await docRef.get();
        if (snap.exists) {
          await docRef.delete();
          results.docsDeleted++;
          console.log(`  ✓ ${col}/${uid}: deleted`);
        }
      } catch (err) {
        const msg = `Failed to delete ${col}/${uid}: ${err.message}`;
        console.error(`  ✗ ${msg}`);
        results.failures.push(msg);
      }
    }

    // Queried collections
    for (const { collection: col, field } of QUERIED_COLLECTIONS) {
      try {
        const deleted = await deleteCollection(
          col,
          (ref) => ref.where(field, "==", uid),
          uid,
          `${col} (${field}=${uid})`
        );
        results.docsDeleted += deleted;
      } catch (err) {
        const msg = `Failed to query ${col}.${field}==${uid}: ${err.message}`;
        console.error(`  ✗ ${msg}`);
        results.failures.push(msg);
      }
    }
  }

  // Email-keyed data
  console.log("\nProcessing email-keyed data...");
  for (const email of emailList) {
    const normalizedEmail = email.toLowerCase().trim();
    for (const { collection: col } of EMAIL_KEYED_COLLECTIONS) {
      try {
        const docRef = db.collection(col).doc(normalizedEmail);
        const snap = await docRef.get();
        if (snap.exists) {
          // Safety: verify it belongs to one of our target UIDs
          const data = snap.data();
          if (data && data.userId && uidList.includes(data.userId)) {
            await docRef.delete();
            results.docsDeleted++;
            console.log(`  ✓ ${col}/${normalizedEmail}: deleted`);
          } else if (data && !data.userId) {
            // No userId field, but doc is keyed by the target email - safe to delete
            await docRef.delete();
            results.docsDeleted++;
            console.log(`  ✓ ${col}/${normalizedEmail}: deleted (no userId field)`);
          } else {
            console.log(`  ⚠ ${col}/${normalizedEmail}: userId mismatch, SKIPPED`);
          }
        }
      } catch (err) {
        const msg = `Failed to delete ${col}/${normalizedEmail}: ${err.message}`;
        console.error(`  ✗ ${msg}`);
        results.failures.push(msg);
      }
    }
  }

  // ------------------------------------------------
  // STEP 4: Delete Storage files
  // ------------------------------------------------
  console.log("\n--- STEP 4: Deleting Storage files ---\n");

  try {
    const bucket = admin.storage().bucket("tentandlanternapp.firebasestorage.app");

    for (const uid of uidList) {
      for (const prefix of STORAGE_PREFIXES) {
        try {
          const [files] = await bucket.getFiles({ prefix: `${prefix}/${uid}/` });
          if (files.length > 0) {
            for (const file of files) {
              await file.delete();
              results.storageDeleted++;
            }
            console.log(`  ✓ ${prefix}/${uid}/: deleted ${files.length} file(s)`);
          }
        } catch (err) {
          // 404 is fine — means no files existed at that path
          if (err.code !== 404) {
            const msg = `Failed to delete storage ${prefix}/${uid}/: ${err.message}`;
            console.error(`  ✗ ${msg}`);
            results.failures.push(msg);
          }
        }
      }
    }
  } catch (err) {
    const msg = `Failed to access Storage bucket: ${err.message}`;
    console.error(`  ✗ ${msg}`);
    results.failures.push(msg);
  }

  // ------------------------------------------------
  // STEP 2: Delete Auth users LAST
  // ------------------------------------------------
  console.log("\n--- STEP 2: Deleting Auth users ---\n");

  for (const user of usersToDelete) {
    try {
      await auth.deleteUser(user.uid);
      results.authDeleted++;
      console.log(`  ✓ Auth deleted: ${user.email} (${user.uid})`);
    } catch (err) {
      const msg = `Failed to delete auth user ${user.email}: ${err.message}`;
      console.error(`  ✗ ${msg}`);
      results.failures.push(msg);
    }
  }

  // ------------------------------------------------
  // STEP 5: Log results
  // ------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log("PURGE COMPLETE");
  console.log("=".repeat(60));
  console.log(`\n  Auth users deleted:     ${results.authDeleted}`);
  console.log(`  Firestore docs deleted: ${results.docsDeleted}`);
  console.log(`  Storage files deleted:  ${results.storageDeleted}`);

  if (results.failures.length > 0) {
    console.log(`\n  ⚠️  FAILURES (${results.failures.length}):`);
    results.failures.forEach((f) => console.log(`    - ${f}`));
  } else {
    console.log("\n  ✅ No failures.");
  }

  console.log("\n" + "=".repeat(60));

  // Exit with error code if there were failures
  if (results.failures.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n❌ FATAL ERROR:", err);
  process.exit(1);
});
