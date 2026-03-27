/**
 * Backup all Firestore data for @alanawaters.com test users
 * Run: cd functions && GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/application_default_credentials.json node scripts/backupTestUsers.js
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const TARGET_DOMAIN = "@alanawaters.com";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "tentandlanternapp" });
}

const db = admin.firestore();
const auth = admin.auth();

const UID_KEYED_COLLECTIONS = ["users", "profiles", "emailSubscribers"];

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

async function main() {
  console.log("=== BACKUP @alanawaters.com TEST USER DATA ===\n");

  // 1. Get all test user UIDs from Auth
  const testUsers = [];
  let nextPageToken;
  do {
    const result = await auth.listUsers(1000, nextPageToken);
    for (const user of result.users) {
      if (user.email && user.email.endsWith(TARGET_DOMAIN)) {
        testUsers.push({ uid: user.uid, email: user.email });
      }
    }
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  console.log(`Found ${testUsers.length} test users:\n`);
  testUsers.forEach((u) => console.log(`  ${u.email} (${u.uid})`));

  const uids = testUsers.map((u) => u.uid);
  const emails = testUsers.map((u) => u.email);

  const backup = {
    timestamp: new Date().toISOString(),
    testUsers,
    collections: {},
  };

  // 2. Backup UID-keyed collections
  for (const col of UID_KEYED_COLLECTIONS) {
    const docs = [];
    for (const uid of uids) {
      const snap = await db.collection(col).doc(uid).get();
      if (snap.exists) {
        docs.push({ id: snap.id, data: snap.data() });
      }
    }
    if (docs.length > 0) {
      backup.collections[col] = docs;
      console.log(`  ${col}: ${docs.length} docs`);
    }
  }

  // 3. Backup queried collections
  for (const { collection, field } of QUERIED_COLLECTIONS) {
    const key = `${collection}__${field}`;
    const docs = [];
    // Query in batches of 30 (Firestore 'in' limit)
    for (let i = 0; i < uids.length; i += 30) {
      const batch = uids.slice(i, i + 30);
      if (batch.length === 0) continue;
      const snap = await db
        .collection(collection)
        .where(field, "in", batch)
        .get();
      snap.forEach((doc) => docs.push({ id: doc.id, data: doc.data() }));
    }
    if (docs.length > 0) {
      backup.collections[key] = docs;
      console.log(`  ${collection} (${field}): ${docs.length} docs`);
    }
  }

  // 4. Backup email-indexed docs
  for (const email of emails) {
    const snap = await db.collection("userEmailIndex").doc(email).get();
    if (snap.exists) {
      if (!backup.collections["userEmailIndex"]) {
        backup.collections["userEmailIndex"] = [];
      }
      backup.collections["userEmailIndex"].push({
        id: snap.id,
        data: snap.data(),
      });
    }
  }

  // 5. Write backup file
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(__dirname, "..", "..", `backup-testusers-firestore-${timestamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(backup, null, 2));
  console.log(`\nBackup written to: ${outPath}`);
  console.log(`Total collections with data: ${Object.keys(backup.collections).length}`);

  process.exit(0);
}

main().catch((e) => {
  console.error("BACKUP FAILED:", e);
  process.exit(1);
});
