/**
 * Seed Feedback Data Script
 * Run with: node src/scripts/seedFeedbackData.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, Timestamp } = require('firebase/firestore');

// Firebase config from your project
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_VIBECODE_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_VIBECODE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_VIBECODE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_VIBECODE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_VIBECODE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_VIBECODE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SEED_FEEDBACK = [
  {
    handle: "@camper_mike",
    text: "Add a way to bookmark campsites\n\nIt would be great if we could save campsites we want to try later. Something simple like a favorites list or a \"save for later\" button when viewing park details.",
    filterLabel: "feature",
    karmaScore: 12,
    createdAt: Timestamp.fromDate(new Date("2024-11-15T10:30:00Z")),
  },
  {
    handle: "@outdoor_enthusiast",
    text: "Map sometimes loads without markers\n\nWhen I open the Parks tab, the map shows up but the campsite markers take a long time to appear. It hasn't crashed, but it feels slow compared to the rest of the app.",
    filterLabel: "bug",
    karmaScore: 8,
    createdAt: Timestamp.fromDate(new Date("2024-11-18T14:15:00Z")),
  },
  {
    handle: "@night_camper",
    text: "Dark mode could use slightly brighter text\n\nDark mode looks great, but the body text is a little dim on my phone at night. A touch more contrast would make it easier to read while camping.",
    filterLabel: "improvement",
    karmaScore: 15,
    createdAt: Timestamp.fromDate(new Date("2024-11-22T09:45:00Z")),
  },
  {
    handle: "@trip_planner",
    text: "Does the trip planner save drafts automatically?\n\nI started building a trip and wasn't sure if the app saves changes on its own or if I need to tap something to save. Just checking how it behaves.",
    filterLabel: "question",
    karmaScore: 5,
    createdAt: Timestamp.fromDate(new Date("2024-11-25T16:20:00Z")),
  },
  {
    handle: "@family_camper",
    text: "Add gear checklists for different camping styles\n\nI'd love preset checklists for car camping, backpacking, and family camping. It would help new campers know where to start and keep things organized.",
    filterLabel: "feature",
    karmaScore: 23,
    createdAt: Timestamp.fromDate(new Date("2024-11-28T11:00:00Z")),
  },
  {
    handle: "@mobile_user",
    text: "Text overlaps on smaller screens\n\nOn my older iPhone, a few labels in the Gear Reviews section wrap strangely. Not a deal breaker, just something I noticed.",
    filterLabel: "bug",
    karmaScore: 6,
    createdAt: Timestamp.fromDate(new Date("2024-12-01T13:30:00Z")),
  },
  {
    handle: "@frequent_visitor",
    text: "Can the app remember my last used filter?\n\nEvery time I return to Parks, the filters reset. It would be helpful if it kept my options between sessions.",
    filterLabel: "improvement",
    karmaScore: 18,
    createdAt: Timestamp.fromDate(new Date("2024-12-04T15:45:00Z")),
  },
  {
    handle: "@design_lover",
    text: "Love the vintage style design\n\nJust wanted to say the illustrations and colors make the app feel cozy. It reminds me of old guidebooks my dad had in the camper.",
    filterLabel: "other",
    karmaScore: 31,
    createdAt: Timestamp.fromDate(new Date("2024-12-07T10:00:00Z")),
  },
  {
    handle: "@photographer",
    text: "How do I submit campsite photos?\n\nIs photo sharing available yet, or is that still coming later? I have a few great campground shots I'd love to add.",
    filterLabel: "question",
    karmaScore: 9,
    createdAt: Timestamp.fromDate(new Date("2024-12-10T08:30:00Z")),
  },
];

async function seedFeedbackData() {
  console.log("🌲 Starting feedback seed...");
  
  try {
    const feedbackCollection = collection(db, "feedbackPosts");
    
    for (const feedback of SEED_FEEDBACK) {
      const docRef = await addDoc(feedbackCollection, feedback);
      const firstLine = feedback.text.split('\n')[0];
      console.log(`✅ Added feedback: "${firstLine}" (ID: ${docRef.id})`);
    }
    
    console.log(`\n🎉 Successfully seeded ${SEED_FEEDBACK.length} feedback posts!`);
    console.log("📊 Breakdown:");
    console.log(`   - Feature Requests: ${SEED_FEEDBACK.filter(f => f.filterLabel === "feature").length}`);
    console.log(`   - Bug Reports: ${SEED_FEEDBACK.filter(f => f.filterLabel === "bug").length}`);
    console.log(`   - Improvements: ${SEED_FEEDBACK.filter(f => f.filterLabel === "improvement").length}`);
    console.log(`   - Questions: ${SEED_FEEDBACK.filter(f => f.filterLabel === "question").length}`);
    console.log(`   - Other: ${SEED_FEEDBACK.filter(f => f.filterLabel === "other").length}`);
  } catch (error) {
    console.error("❌ Error seeding feedback:", error);
    throw error;
  }
}

// Run the seed function
seedFeedbackData()
  .then(() => {
    console.log("\n✨ Seed complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  });
