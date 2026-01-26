// src/features/feedback/seedFeedback.ts
import {
  collection,
  getDocs,
  limit,
  query,
  writeBatch,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../config/firebase";
import { FEEDBACK_SEED_ITEMS } from "./feedbackSeedItems";

const FEEDBACK_COLLECTION = "feedbackPosts";

let hasRunSeed = false;

export async function seedFeedbackIfEmpty() {
  if (hasRunSeed) {
    console.log("[FeedbackSeed] Skipping, already ran in this session.");
    return;
  }

  hasRunSeed = true;
  console.log("[FeedbackSeed] Starting seed check...");
  console.log("[FeedbackSeed] Firebase projectId:", db.app.options.projectId);
  console.log("[FeedbackSeed] Auth user:", auth.currentUser?.email || auth.currentUser?.uid || "NOT SIGNED IN");

  try {
    const colRef = collection(db, FEEDBACK_COLLECTION);
    const q = query(colRef, limit(1));
    
    console.log("[FeedbackSeed] Querying collection:", FEEDBACK_COLLECTION);
    const snapshot = await getDocs(q);

    console.log(
      "[FeedbackSeed] Snapshot empty?",
      snapshot.empty,
      "Docs count:",
      snapshot.size
    );

    if (!snapshot.empty) {
      console.log("[FeedbackSeed] Collection already has data. No seeding.");
      return;
    }

    console.log(
      `[FeedbackSeed] Collection is empty. Seeding ${FEEDBACK_SEED_ITEMS.length} docs...`
    );

    const batch = writeBatch(db);

    FEEDBACK_SEED_ITEMS.forEach((item, index) => {
      const docRef = doc(colRef);
      
      console.log(`[FeedbackSeed] Preparing doc ${index + 1}/${FEEDBACK_SEED_ITEMS.length}: ${item.title}`);
      
      batch.set(docRef, {
        title: item.title,
        description: item.description,
        category: item.category,
        status: "open",
        createdAt: serverTimestamp(),
        createdByUserId: auth.currentUser?.uid ?? "system-seed",
        karmaScore: 1,
        source: "seed",
        seedIndex: index,
      });
    });

    console.log("[FeedbackSeed] Committing batch to Firestore...");
    await batch.commit();
    console.log("[FeedbackSeed] ✅ Feedback seed batch committed successfully!");
    console.log(`[FeedbackSeed] ✨ Seeded ${FEEDBACK_SEED_ITEMS.length} feedback posts with karmaScore: 1`);
  } catch (error) {
    console.error("[FeedbackSeed] ❌ Failed to seed feedback items:");
    console.error("[FeedbackSeed] Error details:", error);
    console.error("[FeedbackSeed] Error message:", (error as Error).message);
    console.error("[FeedbackSeed] Error code:", (error as any).code);
    
    // Reset flag so it can be retried
    hasRunSeed = false;
    throw error;
  }
}
