/**
 * node migrateUser.js
 * Moves user doc + known subcollections from fromUid -> toUid
 * Then updates known references in other collections.
 */

const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

const fromUid = "XzyyhBRVFIMK1JZdyRUPHM71F083";
const toUid = "CumHF5enTFQJgroqRIf72uLI9N52";

// Add your actual subcollections here
const USER_SUBCOLLECTIONS = [
  "trips",
  "packingList",
  "gearCloset",
  "campgroundContacts",
  "checklists",
];

async function copyCollection(fromRef, toRef) {
  const snap = await fromRef.get();
  for (const doc of snap.docs) {
    await toRef.doc(doc.id).set(doc.data(), { merge: true });
  }
}

async function migrateUserDocAndSubs() {
  const fromUserRef = db.collection("users").doc(fromUid);
  const toUserRef = db.collection("users").doc(toUid);

  const fromUserSnap = await fromUserRef.get();
  if (fromUserSnap.exists) {
    await toUserRef.set(fromUserSnap.data(), { merge: true });
  }

  for (const sub of USER_SUBCOLLECTIONS) {
    await copyCollection(fromUserRef.collection(sub), toUserRef.collection(sub));
  }
}

async function updateReferences() {
  // Example: update documents in "questions" where userId == fromUid
  // Repeat for any global collections you have.
  const collectionsToFix = [
    { name: "questions", field: "userId" },
    { name: "tips", field: "userId" },
    { name: "feedback", field: "userId" },
  ];

  for (const c of collectionsToFix) {
    const q = await db.collection(c.name).where(c.field, "==", fromUid).get();
    if (q.empty) continue;

    const batch = db.batch();
    q.docs.forEach((d) => batch.update(d.ref, { [c.field]: toUid }));
    await batch.commit();
  }
}

async function main() {
  await migrateUserDocAndSubs();
  await updateReferences();

  console.log("Migration complete.");
  console.log("Next: verify data, then delete old Auth user, then link Apple to admin UID.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
