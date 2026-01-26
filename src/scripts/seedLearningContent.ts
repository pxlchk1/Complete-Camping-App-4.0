/**
 * Seed Learning Content to Firestore
 * 
 * Run this script to populate Firestore with initial learning tracks and modules.
 * This converts the local learningStore data to the new Firebase structure.
 * 
 * Usage: npx ts-node src/scripts/seedLearningContent.ts
 * 
 * Note: You'll need to be authenticated with Firebase Admin SDK or
 * run this from a Cloud Function context.
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin (for local development, use service account)
// For production, this would be initialized differently
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============================================
// TRACK DEFINITIONS
// ============================================

interface TrackSeed {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  badgeId: string;
  moduleIds: string[];
  isActive: boolean;
}

const TRACKS: TrackSeed[] = [
  {
    id: "leave-no-trace",
    title: "Leave No Trace",
    description: "Learn the 7 principles that protect the places we love",
    icon: "leaf",
    order: 0,
    badgeId: "leave-no-trace",
    moduleIds: ["lnt-principles"],
    isActive: true,
  },
  {
    id: "novice",
    title: "Weekend Camper",
    description: "Master the fundamentals of camping",
    icon: "bonfire",
    order: 1,
    badgeId: "weekend-camper",
    moduleIds: [
      "first-trip",
      "choosing-tent",
      "pitching-tent",
      "sleep-system",
      "stay-warm-dry",
      "camp-kitchen",
      "pack-smart",
      "campfire-safety",
      "first-aid-basics",
      "navigation-basics",
    ],
    isActive: true,
  },
  {
    id: "intermediate",
    title: "Trail Leader",
    description: "Develop advanced outdoor skills to lead groups",
    icon: "trail-sign",
    order: 2,
    badgeId: "trail-leader",
    moduleIds: [
      "multi-day-planning",
      "terrain-weather",
      "water-safety",
      "leading-group",
      "backcountry-cooking",
      "risk-management",
    ],
    isActive: true,
  },
  {
    id: "master",
    title: "Backcountry Guide",
    description: "Master wilderness expertise for remote adventures",
    icon: "compass",
    order: 3,
    badgeId: "backcountry-guide",
    moduleIds: [
      "advanced-navigation",
      "wilderness-weather",
      "advanced-first-aid",
      "group-dynamics",
      "search-rescue-basics",
    ],
    isActive: true,
  },
];

// ============================================
// MODULE DEFINITIONS
// ============================================

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

interface ModuleSeed {
  id: string;
  trackId: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  estimatedMinutes: number;
  content: string;
  quiz: QuizQuestion[];
  isActive: boolean;
}

const MODULES: ModuleSeed[] = [
  // ============================================
  // LEAVE NO TRACE TRACK
  // ============================================
  {
    id: "lnt-principles",
    trackId: "leave-no-trace",
    title: "The 7 Principles of Leave No Trace",
    description: "Learn how to protect the places we love",
    icon: "leaf",
    order: 0,
    estimatedMinutes: 25,
    content: `# Leave No Trace: The 7 Principles

Leave No Trace is more than a set of rules. It's a way of thinking about your relationship with the outdoors.

Every year, millions of people visit wild places. Without thoughtful practices, these places can be loved to death—worn trails, polluted water, displaced wildlife, and damaged ecosystems.

The good news: small changes make a big difference. These seven principles help you enjoy the outdoors while keeping it wild for the next person and the next generation.

---

## Principle 1: Plan Ahead and Prepare

Good planning prevents most problems—and most impact.

**What it means:**
Know before you go. Check weather, rules, and conditions. Bring the right gear and enough supplies.

**3 practical dos:**
- Check area regulations (fires, permits, group size limits)
- Pack for the conditions—layers, rain gear, sun protection
- Bring enough food, water, and waste bags

**3 common mistakes:**
- Arriving without knowing if fires are allowed
- Underestimating water needs
- Packing glass containers that can break

> **Remember:** The best trip is one where nothing goes wrong—because you planned ahead.

---

## Principle 2: Travel and Camp on Durable Surfaces

Where you walk and sleep matters more than you might think.

**What it means:**
Stick to established trails and campsites. When off-trail, choose rock, gravel, or dry grass over fragile plants.

**Durable surfaces (best to worst):**
1. Rock, sand, gravel
2. Snow (when deep enough)
3. Dry grass
4. Bare soil
5. Wet meadows and vegetation (most fragile)

**At camp:**
- Use existing campsites when available
- Keep your footprint small
- Don't trample new areas just for a better view

---

## Principle 3: Dispose of Waste Properly

Pack it in, pack it out. All of it.

**The basics:**
- Carry out all trash, leftover food, and litter
- Use a cathole (6-8 inches deep, 200 feet from water) for human waste
- Pack out toilet paper in a sealed bag

**Gray water:**
- Strain food particles and pack them out
- Scatter gray water 200 feet from water sources
- Use biodegradable soap—but still away from streams and lakes

**Pro tip:** Bring an extra trash bag. You'll always find something to pack out that isn't yours.

---

## Principle 4: Leave What You Find

Take only photos. Leave only footprints (on durable surfaces).

**What to leave:**
- Rocks, plants, and flowers
- Antlers, feathers, and bones
- Historical artifacts and cultural items

**Why it matters:**
Every pinecone, every stone, every flower is part of someone else's experience. When you take something, it's gone for the next person—and the next generation.

**Exception:** In some areas, you may collect certain items (like fallen wood for fires). Check local regulations.

---

## Principle 5: Minimize Campfire Impacts

Fire is powerful. Use it wisely—or not at all.

**Before building a fire:**
- Check if fires are allowed
- Use an existing fire ring if available
- Keep fires small and manageable

**Better alternatives:**
- Use a camp stove for cooking
- Bring a headlamp or lantern for light
- Enjoy the stars without a fire

**When you do build a fire:**
- Burn all wood completely to ash
- Drown the fire, stir the ashes, drown again
- Make sure it's cold to the touch before leaving

---

## Principle 6: Respect Wildlife

We are visitors in their home.

**Safe viewing:**
- Watch from a distance—use binoculars
- Never approach, feed, or follow wildlife
- Store food securely (bear canister, hang, or locker)

**Signs you're too close:**
- The animal changes behavior
- It stops eating or looks at you
- It moves away or shows signs of stress

**Remember:** A fed animal is a dead animal. Food-conditioned wildlife often becomes aggressive and must be relocated or killed.

---

## Principle 7: Be Considerate of Other Visitors

You're not the only one out here.

**On the trail:**
- Yield to uphill hikers
- Step aside for horses
- Keep noise levels down

**At camp:**
- Keep voices low, especially at night
- Don't set up right next to others if space is available
- Control your pets

**The goal:** Leave the experience as good—or better—for the next person.

---

## Putting It All Together

These seven principles aren't about perfection. They're about awareness. Every trip is different, and sometimes you'll face tradeoffs.

**When principles conflict:**
Use your judgment. For example, if you must go off-trail to avoid a dangerous situation, choose the least impactful route and return to the trail as soon as possible.

**The mindset:**
Ask yourself: "Will this leave the place better or worse for the next visitor—and the next generation?"

That's Leave No Trace.`,
    quiz: [
      {
        id: "lnt-q1",
        question: "How far from water should you dig a cathole for human waste?",
        options: ["50 feet", "100 feet", "200 feet", "500 feet"],
        correctAnswerIndex: 2,
        explanation: "Catholes should be dug at least 200 feet (about 70 adult steps) from water sources to prevent contamination.",
      },
      {
        id: "lnt-q2",
        question: "Which surface is most durable for off-trail travel?",
        options: ["Wet meadow", "Dry grass", "Rock or gravel", "Moss-covered ground"],
        correctAnswerIndex: 2,
        explanation: "Rock, sand, and gravel are the most durable surfaces and leave the least impact when you walk on them.",
      },
      {
        id: "lnt-q3",
        question: "What should you do if a wild animal changes its behavior when you approach?",
        options: ["Move closer for a better photo", "Back away slowly", "Make loud noises to scare it", "Throw food to distract it"],
        correctAnswerIndex: 1,
        explanation: "If an animal changes behavior, you're too close. Back away slowly to give it space.",
      },
      {
        id: "lnt-q4",
        question: "Before building a campfire, what should you check first?",
        options: ["Wind direction", "If fires are allowed in the area", "How much wood is available", "Time of day"],
        correctAnswerIndex: 1,
        explanation: "Always check local fire regulations first. Many areas have fire bans, especially during dry seasons.",
      },
      {
        id: "lnt-q5",
        question: "Which item should you leave in the wilderness?",
        options: ["A pretty rock for your collection", "Wildflowers to press at home", "An interesting antler", "All of the above—leave everything"],
        correctAnswerIndex: 3,
        explanation: "Leave what you find. Take only photos so others can enjoy the same discoveries.",
      },
    ],
    isActive: true,
  },

  // ============================================
  // WEEKEND CAMPER TRACK
  // ============================================
  {
    id: "first-trip",
    trackId: "novice",
    title: "How to Plan Your First Camping Trip",
    description: "Planning makes your first trip feel calm instead of chaotic",
    icon: "calendar",
    order: 0,
    estimatedMinutes: 15,
    content: `# How to Plan Your First Camping Trip

Planning makes your first trip feel calm instead of chaotic. Start small and keep the focus on comfort.

---

## Pick Your Dates

Choose one or two nights for your first trip. Avoid extreme heat or deep cold. Check sunrise and sunset times so you have plenty of daylight for setup.

**Best times for beginners:**
- Late spring (May-June)
- Early fall (September-October)
- Avoid holiday weekends—campgrounds are crowded

---

## Choose a Campground

Pick a simple, drive-up site with bathrooms. This is not the time for backcountry adventure.

**What to check:**
- Potable water available?
- Fire rules and restrictions
- Quiet hours
- Cell service (nice to have for emergencies)

**Pro tip:** Look at photos posted by other campers. They'll show you what the site really looks like.

---

## Make a Reservation

Popular campgrounds fill up months in advance. Don't wait until the last minute.

**How to book:**
- National parks: recreation.gov (opens 6 months ahead)
- State parks: Check individual state park websites
- Private campgrounds: Reserve directly or use HipCamp

---

## Plan Your Meals

Keep it easy. Complicated recipes lead to frustration and more cleanup.

**Simple meal ideas:**
- **Breakfast:** Oatmeal, bagels with cream cheese, fruit
- **Lunch:** Sandwiches, wraps, cheese and crackers
- **Dinner:** Pasta with jarred sauce, hot dogs, foil packet dinners

**Have a backup plan** if it rains. Cold sandwiches are better than trying to cook in a downpour.

---

## Check Your Gear

Don't wait until you're at the campsite to discover something is missing or broken.

**One week before:**
- Test your tent setup in the backyard
- Check your stove—does it light?
- Make sure sleeping bags and pads are in good condition
- Charge all batteries (headlamp, phone, speaker)

---

## Pack Smart

Make a checklist and cross things off as you pack. Group items by category.

**Don't forget:**
- Extra layers (it's always colder at night than you expect)
- Rain gear
- First aid kit
- Trash bags

---

## The Night Before

- Check the weather one more time
- Fill your cooler with ice
- Load the car so you can leave early
- Get a good night's sleep

---

## Your First Night

Arrive with at least 2 hours of daylight. Set up your tent first, then get water and start dinner.

Don't stress about doing everything perfectly. The goal is to relax, have fun, and learn what you want to do differently next time.

**Remember:** Every experienced camper was a beginner once. You've got this!`,
    quiz: [
      {
        id: "first-q1",
        question: "How long should your first camping trip be?",
        options: ["One night", "One or two nights", "A full week", "As long as possible"],
        correctAnswerIndex: 1,
        explanation: "Start with one or two nights to build confidence without overwhelming yourself.",
      },
      {
        id: "first-q2",
        question: "When should you test your camping gear?",
        options: ["At the campsite", "In the parking lot before leaving", "At home before the trip", "You don't need to test it"],
        correctAnswerIndex: 2,
        explanation: "Test your gear at home so you can fix any issues before your trip.",
      },
      {
        id: "first-q3",
        question: "What type of campsite is best for beginners?",
        options: ["Remote backcountry site", "Drive-up site with bathrooms", "Primitive site with no facilities", "Beach camping"],
        correctAnswerIndex: 1,
        explanation: "Drive-up sites with bathrooms provide comfort and convenience for first-time campers.",
      },
      {
        id: "first-q4",
        question: "How early should you arrive at your campsite?",
        options: ["Just before dark for a dramatic setup", "With at least 2 hours of daylight", "Arrival time doesn't matter", "After midnight for fewer crowds"],
        correctAnswerIndex: 1,
        explanation: "Arrive with plenty of daylight so you can set up camp comfortably and safely.",
      },
    ],
    isActive: true,
  },

  {
    id: "choosing-tent",
    trackId: "novice",
    title: "Choosing a Tent",
    description: "Your tent is your tiny home for the night. A few smart choices make a big difference.",
    icon: "home",
    order: 1,
    estimatedMinutes: 12,
    content: `# Choosing a Tent

Your tent is your tiny home for the night. A few smart choices make a big difference in comfort, durability, and ease of setup.

---

## Size Matters (But Not How You Think)

A "2-person tent" fits two people—if neither person moves, has gear, or values personal space.

**The real rule:**
- Solo camping: Get a 2-person tent
- Two people: Get a 3-person tent
- Family: Add 1-2 people to your count

Extra space means room for gear, changing clothes, and not elbowing your tent-mate all night.

---

## Three Season vs. Four Season

Most people need a three-season tent.

**Three-season tents:**
- Good for spring, summer, and fall
- More ventilation, lighter weight
- Less expensive
- Perfect for 90% of camping

**Four-season tents:**
- Built for winter and extreme conditions
- Heavier and more expensive
- Less ventilation (holds heat)
- Overkill for most campers

Unless you're planning to camp in snow or high alpine conditions, save your money and get a three-season.

---

## Features That Matter

**Doors:**
- One door works, but two doors mean no climbing over your tent-mate at 2 AM
- Side doors are easier than front doors

**Vestibules:**
- Covered area outside the door
- Perfect for storing muddy boots and wet gear
- Bigger vestibule = more protected storage

**Rainfly:**
- Full-coverage fly protects better in rain and wind
- Partial fly works in fair weather but leaks in storms
- Look for good ventilation even with fly attached

---

## Weight Considerations

**Car camping:**
Weight doesn't matter much. Get a comfortable, roomy tent.

**Backpacking:**
Every ounce counts. Look for ultralight options (under 4 lbs for 2-person).

**The tradeoff:**
Lighter tents are less roomy and less durable. Choose based on how you'll actually use it.

---

## Setup Style

**Freestanding tents:**
- Stand up without stakes (stakes still recommended for wind)
- Easy to move and reposition
- Simpler setup

**Non-freestanding tents:**
- Require stakes to stand
- Often lighter weight
- Trickier to set up in rocky or sandy ground

For beginners, freestanding tents are more forgiving.

---

## Practice at Home

Before your first trip, set up your tent in your yard or living room.

**Why this matters:**
- Learn the setup while you're comfortable
- Find any missing pieces before you're at the campsite
- Time yourself—it's faster than you think once you know how

---

## Bottom Line

- Get a tent one size bigger than you think you need
- Three-season is right for most people
- Two doors and a good vestibule are worth it
- Practice before your first trip

Your tent is where you sleep, escape the rain, and decompress at the end of the day. Choose one that makes camping feel like home.`,
    quiz: [
      {
        id: "tent-q1",
        question: "For two people, what tent size is most comfortable?",
        options: ["1-person", "2-person", "3-person", "4-person"],
        correctAnswerIndex: 2,
        explanation: "A 3-person tent gives two people room for gear and personal space.",
      },
      {
        id: "tent-q2",
        question: "What type of tent is best for most campers?",
        options: ["Four-season", "Three-season", "Ultralight", "Single-wall"],
        correctAnswerIndex: 1,
        explanation: "Three-season tents work for spring, summer, and fall—which covers 90% of camping trips.",
      },
      {
        id: "tent-q3",
        question: "Why are vestibules useful?",
        options: ["Extra sleeping space", "Protected storage for muddy boots and gear", "Better ventilation", "Lighter weight"],
        correctAnswerIndex: 1,
        explanation: "Vestibules provide covered storage outside the tent door for wet or dirty items.",
      },
      {
        id: "tent-q4",
        question: "What should you do before your first camping trip with a new tent?",
        options: ["Read the manual at the campsite", "Set it up at home first", "Watch a YouTube video while camping", "Skip practice—it's intuitive"],
        correctAnswerIndex: 1,
        explanation: "Practice at home so you know the setup process and can identify any missing parts.",
      },
    ],
    isActive: true,
  },

  // Additional modules would follow the same pattern...
  // For brevity, I'm including placeholders for the remaining modules

  {
    id: "pitching-tent",
    trackId: "novice",
    title: "Pitching a Tent",
    description: "Once you learn the pattern, every tent starts to make sense",
    icon: "construct",
    order: 2,
    estimatedMinutes: 15,
    content: `# Pitching a Tent

Pitching a tent is a simple pattern. Once you learn it, every tent starts to make sense.

---

## Step 1: Pick Your Spot

**Look for:**
- Level ground (you'll roll in your sleep on slopes)
- No rocks or roots under the tent floor
- Avoid dips where water collects
- Natural windbreak if possible

**Avoid:**
- Under dead trees or branches
- Low spots that flood in rain
- Right next to the fire pit

---

## Step 2: Lay Out the Footprint

A footprint is a ground cloth that protects your tent floor.

- Lay it flat where your tent will go
- Fold under any edges that stick out past the tent (so rain doesn't pool on top)
- This adds years to your tent's life

---

## Step 3: Lay Out the Tent Body

- Spread the tent flat on the footprint
- Door facing the direction you want
- Find the corners and orient them correctly

---

## Step 4: Assemble the Poles

- Connect pole sections (they're usually shock-corded)
- Don't let poles snap together—guide them gently
- Lay poles out where they'll attach to the tent

---

## Step 5: Attach Poles to Tent

**For pole-sleeve tents:**
- Slide poles through fabric sleeves
- Insert pole ends into grommets at corners

**For clip tents:**
- Insert pole ends into grommets first
- Clip the tent body to the poles
- Generally faster than sleeves

---

## Step 6: Raise the Tent

- The tent will lift as you flex the poles into place
- For dome tents, cross the poles at the center
- Make sure all pole ends are secured in grommets

---

## Step 7: Stake It Down

Even freestanding tents need stakes for wind.

- Start with corners
- Pull fabric taut but not drum-tight
- Angle stakes away from the tent at 45 degrees

---

## Step 8: Add the Rainfly

- Clip or buckle the fly to the tent
- Attach fly guylines to stakes
- Adjust for good ventilation (keep vents open)
- The fly shouldn't touch the inner tent walls

---

## Step 9: Final Adjustments

- Walk around and check all stakes
- Tighten guylines if windy
- Test the zipper
- Move gear inside

---

## Pro Tips

- **Practice at home** before your first trip
- **Set up in daylight** when possible
- **Know your tent** before you need it

The first time takes 20 minutes. By your third trip, you'll be done in 5.`,
    quiz: [
      {
        id: "pitch-q1",
        question: "What is the first thing you should lay down when pitching a tent?",
        options: ["Rainfly", "Footprint/ground cloth", "Tent body", "Sleeping bags"],
        correctAnswerIndex: 1,
        explanation: "The footprint protects your tent floor and helps position the tent correctly.",
      },
      {
        id: "pitch-q2",
        question: "Why should you look for level ground?",
        options: ["Better views", "So you don't roll in your sleep", "Required by park rules", "Easier to find"],
        correctAnswerIndex: 1,
        explanation: "Sleeping on a slope means you'll slide to one side all night—not restful!",
      },
      {
        id: "pitch-q3",
        question: "At what angle should you drive tent stakes?",
        options: ["Straight down (90°)", "Angled away from tent (45°)", "Angled toward tent (45°)", "Horizontally"],
        correctAnswerIndex: 1,
        explanation: "Stakes hold better when angled away from the tent at about 45 degrees.",
      },
    ],
    isActive: true,
  },

  {
    id: "sleep-system",
    trackId: "novice",
    title: "Sleep System Basics",
    description: "Being warm and comfortable is the key to happy camping",
    icon: "bed",
    order: 3,
    estimatedMinutes: 12,
    content: `# Sleep System Basics

Being warm and comfortable at night is the key to happy camping. Your "sleep system" is the combination of sleeping pad, sleeping bag, and clothing that keeps you cozy.

---

## The Sleeping Pad (Most Important!)

Your pad matters more than your bag. Here's why: the ground steals body heat much faster than cold air.

**R-Value:**
- Measures insulation from the ground
- Higher number = warmer
- Summer: R-value 2-3
- Three-season: R-value 3-5
- Winter: R-value 5+

**Types of pads:**
- **Foam (closed-cell):** Cheap, durable, always works. Heavy and bulky.
- **Self-inflating:** Comfortable, good insulation. Heavier than air pads.
- **Air pads:** Light, packable, comfortable. Can puncture.

**Pro tip:** Bring a patch kit for air pads—small leaks are common.

---

## The Sleeping Bag

Temperature ratings tell you the lowest temp you'll be comfortable at—but they're optimistic.

**The 10-degree rule:**
Choose a bag rated about 10°F colder than the lowest temp you expect.

**Fill types:**
- **Down:** Lighter, packs smaller, lasts longer. Useless when wet.
- **Synthetic:** Works when damp, dries faster. Heavier and bulkier.

**Shape matters:**
- **Mummy:** Warmest, most efficient. Snug fit.
- **Rectangular:** Roomy and comfortable. Less warm.

---

## What to Wear

Your clothing is part of your sleep system.

**Best practices:**
- Wear dry layers—change out of sweaty clothes
- A hat keeps your head warm (you lose heat there)
- Fresh socks warm your feet

**Don't:**
- Wear too much—you'll sweat and get cold
- Breathe into your bag (moisture makes it less effective)
- Skip the dry socks—your feet will thank you

---

## Extra Warmth Tricks

When it's cold:
- Eat something warm before bed
- Do light exercise (jumping jacks) before getting in
- Put a warm water bottle near your feet
- Add a fleece liner or wear a puffy jacket

Keep your bag lofted—shake it out before bed so insulation isn't compressed.

---

## Troubleshooting Cold Nights

**Still cold?**
- Add more insulation under you (extra pad, clothes under your pad)
- Wear more layers
- Cinch the hood of your mummy bag

**Too hot?**
- Unzip the bag partway
- Sleep with one leg out
- Use the bag as a blanket

---

## Bottom Line

1. Invest in a good sleeping pad—it's the foundation
2. Choose a bag rated colder than you think you need
3. Dry layers and warm socks make a big difference
4. Dial in your system over multiple trips

A good night's sleep makes everything better. Prioritize your sleep system.`,
    quiz: [
      {
        id: "sleep-q1",
        question: "What is the most important part of your sleep system?",
        options: ["Sleeping bag", "Sleeping pad", "Pillow", "Pajamas"],
        correctAnswerIndex: 1,
        explanation: "The pad insulates you from the ground, which steals heat faster than cold air.",
      },
      {
        id: "sleep-q2",
        question: "If the low temperature will be 40°F, what sleeping bag rating should you choose?",
        options: ["40°F", "30°F or lower", "50°F", "20°F exactly"],
        correctAnswerIndex: 1,
        explanation: "Choose a bag rated about 10°F colder than expected temps—so 30°F or lower.",
      },
      {
        id: "sleep-q3",
        question: "What should you do before getting into your sleeping bag?",
        options: ["Breathe into it to warm it up", "Change into dry layers", "Compress the insulation", "Skip socks to let feet breathe"],
        correctAnswerIndex: 1,
        explanation: "Dry layers help you stay warm. Wet or sweaty clothes conduct heat away from your body.",
      },
    ],
    isActive: true,
  },
];

// ============================================
// SEED FUNCTION
// ============================================

async function seedLearningContent() {
  console.log("🌱 Starting to seed learning content...\n");

  const batch = db.batch();
  const now = admin.firestore.Timestamp.now();

  // Seed tracks
  console.log("📚 Seeding tracks...");
  for (const track of TRACKS) {
    const trackRef = db.collection("learningTracks").doc(track.id);
    batch.set(trackRef, {
      ...track,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  ✓ ${track.title}`);
  }

  // Seed modules
  console.log("\n📖 Seeding modules...");
  for (const module of MODULES) {
    const moduleRef = db.collection("learningModules").doc(module.id);
    batch.set(moduleRef, {
      ...module,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  ✓ ${module.title}`);
  }

  // Commit batch
  console.log("\n💾 Committing to Firestore...");
  await batch.commit();

  console.log("\n✅ Learning content seeded successfully!");
  console.log(`   Tracks: ${TRACKS.length}`);
  console.log(`   Modules: ${MODULES.length}`);
}

// Run if called directly
seedLearningContent()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error seeding content:", error);
    process.exit(1);
  });

export { seedLearningContent, TRACKS, MODULES };
