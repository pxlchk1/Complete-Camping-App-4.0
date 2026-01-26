/**
 * Seed Community Data Script
 * Run this once to populate Firebase with initial community content
 * Usage: import and call seedCommunityData() from your app
 */

import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase";

const SEED_USER = {
  id: "seed_user_1",
  handle: "@tentandlantern",
  name: "Tent & Lantern Team",
};

// Seed Tips
const SEED_TIPS = [
  {
    title: "Always Pack a Backup Fire Starter",
    content: "Never rely on just one method to start a fire. Pack waterproof matches, a lighter, and a ferrocerium rod. Store them in separate waterproof containers. I learned this the hard way when my lighter failed in wet conditions.",
    category: "Safety",
    authorId: SEED_USER.id,
    authorHandle: SEED_USER.handle,
    authorName: SEED_USER.name,
    createdAt: new Date("2024-01-15").toISOString(),
    updatedAt: new Date("2024-01-15").toISOString(),
    likes: 42,
    views: 156,
  },
  {
    title: "The 3-3-3 Rule for Clothing Layers",
    content: "Pack 3 base layers, 3 insulating layers, and 3 outer shell options. This gives you flexibility for changing weather without overpacking. Merino wool base layers are worth the investment - they regulate temperature and resist odors.",
    category: "Gear",
    authorId: SEED_USER.id,
    authorHandle: SEED_USER.handle,
    authorName: SEED_USER.name,
    createdAt: new Date("2024-01-20").toISOString(),
    updatedAt: new Date("2024-01-20").toISOString(),
    likes: 38,
    views: 142,
  },
  {
    title: "Test Your Gear at Home First",
    content: "Set up your tent in the backyard before your trip. Cook a meal on your camp stove. Make sure everything works and you know how to use it. There is nothing worse than figuring out a broken zipper or missing pole at the campsite.",
    category: "Setup",
    authorId: SEED_USER.id,
    authorHandle: SEED_USER.handle,
    authorName: SEED_USER.name,
    createdAt: new Date("2024-01-25").toISOString(),
    updatedAt: new Date("2024-01-25").toISOString(),
    likes: 67,
    views: 234,
  },
  {
    title: "Hang a Bear Bag Properly",
    content: "Use the PCT method: throw rope over a branch 15+ feet high and 6+ feet from the trunk. Hang food at least 12 feet off the ground and 6 feet from the tree. This takes practice - do not wait until dark to figure it out.",
    category: "Wildlife",
    authorId: SEED_USER.id,
    authorHandle: SEED_USER.handle,
    authorName: SEED_USER.name,
    createdAt: new Date("2024-02-01").toISOString(),
    updatedAt: new Date("2024-02-01").toISOString(),
    likes: 54,
    views: 198,
  },
  {
    title: "Bring More Water Than You Think",
    content: "The rule of thumb is 2 liters per person per day, but bring 3-4 liters if you are hiking in hot weather or at altitude. Dehydration ruins trips. Know where water sources are on your route and always carry purification tablets or a filter.",
    category: "Water",
    authorId: SEED_USER.id,
    authorHandle: SEED_USER.handle,
    authorName: SEED_USER.name,
    createdAt: new Date("2024-02-05").toISOString(),
    updatedAt: new Date("2024-02-05").toISOString(),
    likes: 71,
    views: 267,
  },
  {
    title: "The Ditty Bag System",
    content: "Use small stuff sacks or ziplock bags to organize gear by category: cooking, first aid, hygiene, electronics, repair kit. Label them with bright tape. You will find things faster and nothing gets lost at the bottom of your pack.",
    category: "Setup",
    authorId: SEED_USER.id,
    authorHandle: SEED_USER.handle,
    authorName: SEED_USER.name,
    createdAt: new Date("2024-02-10").toISOString(),
    updatedAt: new Date("2024-02-10").toISOString(),
    likes: 45,
    views: 178,
  },
  {
    title: "Camp Kitchen Efficiency Tips",
    content: "Prep meals at home when possible. Pre-mix dry ingredients, pre-chop vegetables, pre-cook rice. At camp, set up a washing station away from your cooking area. Always have a mesh bag for drying dishes overnight.",
    category: "Cooking",
    authorId: SEED_USER.id,
    authorHandle: SEED_USER.handle,
    authorName: SEED_USER.name,
    createdAt: new Date("2024-02-15").toISOString(),
    updatedAt: new Date("2024-02-15").toISOString(),
    likes: 39,
    views: 164,
  },
  {
    title: "Master the Bowline Knot",
    content: "This is the most useful camping knot. It creates a fixed loop that will not slip or bind. Use it for bear bags, hanging tarps, securing gear, tying boats. Practice until you can tie it in the dark with gloves on.",
    category: "Setup",
    authorId: SEED_USER.id,
    authorHandle: SEED_USER.handle,
    authorName: SEED_USER.name,
    createdAt: new Date("2024-02-20").toISOString(),
    updatedAt: new Date("2024-02-20").toISOString(),
    likes: 52,
    views: 201,
  },
];

// Seed Gear Reviews
const SEED_GEAR_REVIEWS = [
  {
    gearName: "MSR Hubba Hubba NX 2",
    manufacturer: "MSR",
    title: "Reliable Backpacking Tent for 3 Seasons",
    category: "shelter",
    reviewText: "After 15 nights in this tent across various conditions, I can confidently recommend it for 3-season backpacking. Setup is intuitive and takes about 5 minutes. The freestanding design is great for rocky terrain. Ventilation is excellent - minimal condensation even in humid conditions. Pack size is reasonable at 3.7 lbs for a 2-person tent. Downsides: The floor fabric shows wear faster than expected, and the zippers can be finicky in cold weather. Overall, a solid choice for weekend warriors.",
    overallRating: 4.5,
    durabilityRating: 4,
    valueRating: 4.5,
    performanceRating: 5,
    purchasePrice: 499.95,
    wouldRecommend: true,
    verifiedPurchase: true,
    pros: ["Easy setup", "Great ventilation", "Lightweight", "Freestanding design"],
    cons: ["Floor durability concerns", "Zippers sticky in cold"],
    tags: ["backpacking", "lightweight", "three-season"],
    authorId: SEED_USER.id,
    authorHandle: SEED_USER.handle,
    authorName: SEED_USER.name,
    createdAt: new Date("2024-01-10").toISOString(),
    updatedAt: new Date("2024-01-10").toISOString(),
    helpfulCount: 28,
    views: 145,
  },
  {
    gearName: "Jetboil Flash Cooking System",
    manufacturer: "Jetboil",
    title: "Fast Boil Times But Limited Versatility",
    category: "cooking",
    reviewText: "This stove boils water incredibly fast - usually under 2 minutes for 500ml. The integrated design is convenient and the pot locks securely to the burner. Fuel efficiency is impressive. However, it is really only good for boiling water. You cannot simmer well, and the tall design makes it tippy on uneven ground. The igniter stopped working after 20 uses but the manual lighting works fine. Great for dehydrated meals and coffee, not ideal if you want to cook real food.",
    overallRating: 4,
    durabilityRating: 3.5,
    valueRating: 4,
    performanceRating: 4.5,
    purchasePrice: 109.95,
    wouldRecommend: true,
    verifiedPurchase: true,
    pros: ["Extremely fast boil times", "Fuel efficient", "Compact when packed", "Wind resistant"],
    cons: ["Cannot simmer", "Igniter failed quickly", "Tippy on uneven ground"],
    tags: ["backpacking", "fast", "fuel-efficient"],
    authorId: SEED_USER.id,
    authorHandle: SEED_USER.handle,
    authorName: SEED_USER.name,
    createdAt: new Date("2024-01-18").toISOString(),
    updatedAt: new Date("2024-01-18").toISOString(),
    helpfulCount: 19,
    views: 98,
  },
  {
    gearName: "Therm-a-Rest NeoAir XLite",
    manufacturer: "Therm-a-Rest",
    title: "Warm and Light But Noisy",
    category: "sleeping",
    reviewText: "R-value of 4.2 keeps you warm down to freezing temps. Packs down incredibly small and weighs only 12 oz. Comfortable to sleep on with good thickness. The major downside is the crinkly noise - every time you move, it sounds like a chip bag. This can be annoying for light sleepers or if you are sharing a tent. Also takes quite a few breaths to inflate. Despite the noise, the warmth-to-weight ratio is hard to beat.",
    overallRating: 4,
    durabilityRating: 4,
    valueRating: 3.5,
    performanceRating: 4.5,
    purchasePrice: 219.95,
    wouldRecommend: true,
    verifiedPurchase: true,
    pros: ["Very warm", "Ultra lightweight", "Compact", "Comfortable thickness"],
    cons: ["Loud crinkly material", "Takes time to inflate", "Expensive"],
    tags: ["ultralight", "backpacking", "warm"],
    authorId: SEED_USER.id,
    authorHandle: SEED_USER.handle,
    authorName: SEED_USER.name,
    createdAt: new Date("2024-01-22").toISOString(),
    updatedAt: new Date("2024-01-22").toISOString(),
    helpfulCount: 24,
    views: 132,
  },
  {
    gearName: "Sawyer Squeeze Water Filter",
    manufacturer: "Sawyer",
    title: "Best Value Water Filtration System",
    category: "water",
    reviewText: "Used this on 20+ trips and it has never let me down. Filters 0.1 micron which removes bacteria and protozoa. Flow rate is decent if you backflush regularly. The squeeze bags that come with it are fragile - I replaced mine with a Smartwater bottle which threads on perfectly. At 3oz and under $40, this is the best value in water filtration. One filter will last you years if maintained properly. No chemicals, no waiting, just squeeze and drink.",
    overallRating: 5,
    durabilityRating: 5,
    valueRating: 5,
    performanceRating: 4.5,
    purchasePrice: 37.99,
    wouldRecommend: true,
    verifiedPurchase: true,
    pros: ["Excellent value", "Very lightweight", "Long lifespan", "Works with smartwater bottles", "No chemicals"],
    cons: ["Squeeze bags are fragile", "Slower than pump filters"],
    tags: ["lightweight", "budget", "reliable"],
    authorId: SEED_USER.id,
    authorHandle: SEED_USER.handle,
    authorName: SEED_USER.name,
    createdAt: new Date("2024-02-03").toISOString(),
    updatedAt: new Date("2024-02-03").toISOString(),
    helpfulCount: 35,
    views: 187,
  },
];

// Seed Questions
const SEED_QUESTIONS = [
  {
    title: "What sleeping bag temperature rating do I need for summer camping?",
    content: "I am planning my first camping trip in July in the Pacific Northwest. Daytime temps will be 70-80F. What temperature rating should I look for in a sleeping bag? Is 40F enough or should I go warmer?",
    tags: ["beginner", "gear", "sleeping", "summer"],
    authorId: SEED_USER.id,
    authorHandle: "@newcamper2024",
    authorName: "Sarah J",
    createdAt: new Date("2024-02-08").toISOString(),
    updatedAt: new Date("2024-02-08").toISOString(),
    upvotes: 12,
    views: 89,
    answerCount: 3,
    hasAcceptedAnswer: false,
  },
  {
    title: "How do I keep food cold in a cooler for 3+ days?",
    content: "Going car camping for 4 days and need to keep perishables cold. I have a standard cooler. What is the best ice-to-food ratio? Should I use block ice or cubed ice? Any other tips for maximizing cold retention?",
    tags: ["car-camping", "food", "tips"],
    authorId: SEED_USER.id,
    authorHandle: "@weekendwarrior",
    authorName: "Mike T",
    createdAt: new Date("2024-02-12").toISOString(),
    updatedAt: new Date("2024-02-12").toISOString(),
    upvotes: 18,
    views: 134,
    answerCount: 5,
    hasAcceptedAnswer: true,
  },
  {
    title: "Best way to dry wet gear while camping?",
    content: "Got caught in a rainstorm yesterday and everything is soaked - tent, clothes, sleeping bag. What is the best strategy for drying gear at camp when you still have 2 nights left? Should I try to pack wet gear or keep trying to dry it?",
    tags: ["weather", "tips", "backpacking"],
    authorId: SEED_USER.id,
    authorHandle: "@trailblazer",
    authorName: "Alex K",
    createdAt: new Date("2024-02-16").toISOString(),
    updatedAt: new Date("2024-02-16").toISOString(),
    upvotes: 24,
    views: 178,
    answerCount: 7,
    hasAcceptedAnswer: true,
  },
  {
    title: "Is it safe to camp alone as a beginner?",
    content: "I really want to go camping but none of my friends are interested. Is it safe for a beginner to camp solo? What extra precautions should I take? Should I start with car camping or is backcountry okay?",
    tags: ["beginner", "safety", "solo"],
    authorId: SEED_USER.id,
    authorHandle: "@soloadventurer",
    authorName: "Emily R",
    createdAt: new Date("2024-02-18").toISOString(),
    updatedAt: new Date("2024-02-18").toISOString(),
    upvotes: 31,
    views: 245,
    answerCount: 9,
    hasAcceptedAnswer: false,
  },
];

// Seed Feedback Posts
const SEED_FEEDBACK = [
  {
    title: "Add offline mode for trip planning",
    description: "It would be great if I could plan trips and add items to packing lists without internet connection. Many camping areas have no cell service, and I often plan during my commute on the subway.",
    category: "feature_request",
    status: "planned",
    authorId: SEED_USER.id,
    authorHandle: "@outdoorsfan",
    authorName: "Jordan P",
    createdAt: new Date("2024-01-12").toISOString(),
    updatedAt: new Date("2024-02-01").toISOString(),
    upvotes: 47,
    downvotes: 2,
    karmaScore: 45,
    commentCount: 8,
  },
  {
    title: "Export packing list to PDF",
    description: "Would love to be able to export my packing lists as PDFs so I can print them out. Not everyone wants to use their phone at camp.",
    category: "feature_request",
    status: "under_review",
    authorId: SEED_USER.id,
    authorHandle: "@techsavvycamper",
    authorName: "Chris M",
    createdAt: new Date("2024-01-28").toISOString(),
    updatedAt: new Date("2024-01-28").toISOString(),
    upvotes: 32,
    downvotes: 1,
    karmaScore: 31,
    commentCount: 5,
  },
  {
    title: "Weather forecast is sometimes inaccurate",
    description: "The weather forecast showed sunny for my trip but it rained the whole time. Maybe add a way to compare multiple weather sources or show the confidence level?",
    category: "improvement",
    status: "open",
    authorId: SEED_USER.id,
    authorHandle: "@weatherwatcher",
    authorName: "Pat L",
    createdAt: new Date("2024-02-05").toISOString(),
    updatedAt: new Date("2024-02-05").toISOString(),
    upvotes: 28,
    downvotes: 3,
    karmaScore: 25,
    commentCount: 12,
  },
  {
    title: "Add gear weight tracking",
    description: "For backpackers, it would be awesome to track the weight of each item in the packing list and see a total pack weight. This would help with planning and knowing if I am over-packing.",
    category: "feature_request",
    status: "planned",
    authorId: SEED_USER.id,
    authorHandle: "@ultralighter",
    authorName: "Sam D",
    createdAt: new Date("2024-02-10").toISOString(),
    updatedAt: new Date("2024-02-10").toISOString(),
    upvotes: 56,
    downvotes: 0,
    karmaScore: 56,
    commentCount: 15,
  },
];

export async function seedCommunityData() {
  console.log("🌱 Starting to seed community data...");

  try {
    // Seed Tips
    console.log("📝 Seeding tips...");
    for (const tip of SEED_TIPS) {
      await addDoc(collection(db, "tips"), tip);
    }
    console.log(`✅ Seeded ${SEED_TIPS.length} tips`);

    // Seed Gear Reviews
    console.log("⚙️ Seeding gear reviews...");
    for (const review of SEED_GEAR_REVIEWS) {
      await addDoc(collection(db, "gearReviews"), review);
    }
    console.log(`✅ Seeded ${SEED_GEAR_REVIEWS.length} gear reviews`);

    // Seed Questions
    console.log("❓ Seeding questions...");
    for (const question of SEED_QUESTIONS) {
      await addDoc(collection(db, "questions"), question);
    }
    console.log(`✅ Seeded ${SEED_QUESTIONS.length} questions`);

    // Seed Feedback
    console.log("💬 Seeding feedback posts...");
    for (const feedback of SEED_FEEDBACK) {
      await addDoc(collection(db, "feedbackPosts"), feedback);
    }
    console.log(`✅ Seeded ${SEED_FEEDBACK.length} feedback posts`);

    console.log("🎉 Community data seeding complete!");
    return {
      success: true,
      counts: {
        tips: SEED_TIPS.length,
        gearReviews: SEED_GEAR_REVIEWS.length,
        questions: SEED_QUESTIONS.length,
        feedback: SEED_FEEDBACK.length,
      },
    };
  } catch (error) {
    console.error("❌ Error seeding community data:", error);
    throw error;
  }
}
