/**
 * Seed Feedback Data Script
 * Run this once to populate Firebase with initial feedback posts
 * Usage: npx ts-node src/scripts/seedFeedbackData.ts
 */

import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase";

const SEED_USER = {
  id: "seed_user_feedback",
  name: "Community Member",
};

const SEED_FEEDBACK = [
  {
    userId: SEED_USER.id,
    userName: SEED_USER.name,
    userAvatar: null,
    title: "Add a way to bookmark campsites",
    description: "It would be great if we could save campsites we want to try later. Something simple like a favorites list or a \"save for later\" button when viewing park details.",
    category: "feature",
    status: "open",
    upvotes: 12,
    createdAt: Timestamp.fromDate(new Date("2024-11-15T10:30:00Z")),
  },
  {
    userId: SEED_USER.id,
    userName: SEED_USER.name,
    userAvatar: null,
    title: "Map sometimes loads without markers",
    description: "When I open the Parks tab, the map shows up but the campsite markers take a long time to appear. It hasn't crashed, but it feels slow compared to the rest of the app.",
    category: "bug",
    status: "open",
    upvotes: 8,
    createdAt: Timestamp.fromDate(new Date("2024-11-18T14:15:00Z")),
  },
  {
    userId: SEED_USER.id,
    userName: SEED_USER.name,
    userAvatar: null,
    title: "Dark mode could use slightly brighter text",
    description: "Dark mode looks great, but the body text is a little dim on my phone at night. A touch more contrast would make it easier to read while camping.",
    category: "improvement",
    status: "open",
    upvotes: 15,
    createdAt: Timestamp.fromDate(new Date("2024-11-22T09:45:00Z")),
  },
  {
    userId: SEED_USER.id,
    userName: SEED_USER.name,
    userAvatar: null,
    title: "Does the trip planner save drafts automatically?",
    description: "I started building a trip and wasn't sure if the app saves changes on its own or if I need to tap something to save. Just checking how it behaves.",
    category: "question",
    status: "open",
    upvotes: 5,
    createdAt: Timestamp.fromDate(new Date("2024-11-25T16:20:00Z")),
  },
  {
    userId: SEED_USER.id,
    userName: SEED_USER.name,
    userAvatar: null,
    title: "Add gear checklists for different camping styles",
    description: "I'd love preset checklists for car camping, backpacking, and family camping. It would help new campers know where to start and keep things organized.",
    category: "feature",
    status: "planned",
    upvotes: 23,
    createdAt: Timestamp.fromDate(new Date("2024-11-28T11:00:00Z")),
  },
  {
    userId: SEED_USER.id,
    userName: SEED_USER.name,
    userAvatar: null,
    title: "Text overlaps on smaller screens",
    description: "On my older iPhone, a few labels in the Gear Reviews section wrap strangely. Not a deal breaker, just something I noticed.",
    category: "bug",
    status: "open",
    upvotes: 6,
    createdAt: Timestamp.fromDate(new Date("2024-12-01T13:30:00Z")),
  },
  {
    userId: SEED_USER.id,
    userName: SEED_USER.name,
    userAvatar: null,
    title: "Can the app remember my last used filter?",
    description: "Every time I return to Parks, the filters reset. It would be helpful if it kept my options between sessions.",
    category: "improvement",
    status: "planned",
    upvotes: 18,
    createdAt: Timestamp.fromDate(new Date("2024-12-04T15:45:00Z")),
  },
  {
    userId: SEED_USER.id,
    userName: SEED_USER.name,
    userAvatar: null,
    title: "Love the vintage style design",
    description: "Just wanted to say the illustrations and colors make the app feel cozy. It reminds me of old guidebooks my dad had in the camper.",
    category: "other",
    status: "open",
    upvotes: 31,
    createdAt: Timestamp.fromDate(new Date("2024-12-07T10:00:00Z")),
  },
  {
    userId: SEED_USER.id,
    userName: SEED_USER.name,
    userAvatar: null,
    title: "How do I submit campsite photos?",
    description: "Is photo sharing available yet, or is that still coming later? I have a few great campground shots I'd love to add.",
    category: "question",
    status: "open",
    upvotes: 9,
    createdAt: Timestamp.fromDate(new Date("2024-12-10T08:30:00Z")),
  },
];

export async function seedFeedbackData() {
  console.log("🌲 Starting feedback seed...");
  
  try {
    const feedbackCollection = collection(db, "feedbackPosts");
    
    for (const feedback of SEED_FEEDBACK) {
      const docRef = await addDoc(feedbackCollection, feedback);
      console.log(`✅ Added feedback: "${feedback.title}" (ID: ${docRef.id})`);
    }
    
    console.log(`\n🎉 Successfully seeded ${SEED_FEEDBACK.length} feedback posts!`);
    console.log("📊 Breakdown:");
    console.log(`   - Feature Requests: ${SEED_FEEDBACK.filter(f => f.category === "feature").length}`);
    console.log(`   - Bug Reports: ${SEED_FEEDBACK.filter(f => f.category === "bug").length}`);
    console.log(`   - Improvements: ${SEED_FEEDBACK.filter(f => f.category === "improvement").length}`);
    console.log(`   - Questions: ${SEED_FEEDBACK.filter(f => f.category === "question").length}`);
    console.log(`   - Other: ${SEED_FEEDBACK.filter(f => f.category === "other").length}`);
  } catch (error) {
    console.error("❌ Error seeding feedback:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedFeedbackData()
    .then(() => {
      console.log("\n✨ Seed complete! You can now close this process.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Seed failed:", error);
      process.exit(1);
    });
}
