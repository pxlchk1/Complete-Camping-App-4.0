/**
 * Seed Learning Content (Client-Side Version)
 *
 * This can be called from the app to populate Firestore with initial learning content.
 * Call seedLearningContent() from an admin action or during initial setup.
 */
import { Timestamp, doc, writeBatch } from 'firebase/firestore';

import { db } from '../config/firebase';
import { BadgeId } from '../types/learning';

// ============================================
// TRACK DEFINITIONS
// ============================================

interface TrackSeed {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  badgeId: BadgeId;
  moduleIds: string[];
  isActive: boolean;
  isFree: boolean;
}

const TRACKS: TrackSeed[] = [
  {
    id: 'leave-no-trace',
    title: 'Leave No Trace',
    description: 'Learn the 7 principles that protect the places we love',
    icon: 'leaf',
    order: 0,
    badgeId: 'leave-no-trace',
    moduleIds: ['lnt-principles'],
    isActive: true,
    isFree: true,
  },
  {
    id: 'novice',
    title: 'Weekend Camper',
    description:
      'One night or two, easy campground, simple meals. Plan it, pack it, set up fast, and sleep comfortably.',
    icon: 'bonfire',
    order: 1,
    badgeId: 'weekend-camper',
    moduleIds: [
      'wc-plan-trip',
      'wc-gear-basics',
      'wc-setup-skills',
      'wc-camp-food',
      'wc-weather-bugs',
      'wc-confidence-exit',
      'wc-final-quiz',
    ],
    isActive: true,
    isFree: false,
  },
  {
    id: 'intermediate',
    title: 'Trail Leader',
    description: 'Develop advanced outdoor skills to lead groups',
    icon: 'trail-sign',
    order: 2,
    badgeId: 'trail-leader',
    moduleIds: [
      'tl-what-leader-does',
      'tl-route-planning',
      'tl-navigation-basics',
      'tl-weather-planning',
      'tl-gear-minimums',
      'tl-pacing-breaks',
      'tl-first-aid',
      'tl-etiquette-ethics',
      'tl-managing-hazards',
      'tl-leveling-up',
      'tl-final-quiz',
    ],
    isActive: true,
    isFree: false,
  },
  {
    id: 'master',
    title: 'Backcountry Guide',
    description: 'Master wilderness expertise for remote adventures',
    icon: 'compass',
    order: 3,
    badgeId: 'backcountry-guide',
    moduleIds: [
      'bc-mindset',
      'bc-navigation',
      'bc-route-planning',
      'bc-weather',
      'bc-water',
      'bc-fuel',
      'bc-shelter',
      'bc-first-aid',
      'bc-terrain',
      'bc-ethics',
      'bc-final-quiz',
    ],
    isActive: true,
    isFree: false,
  },
];

// ============================================
// MODULE CONTENT
// ============================================

interface ModuleSeed {
  id: string;
  trackId: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  estimatedMinutes: number;
  content: string;
  quiz: {
    id: string;
    question: string;
    options: string[];
    correctAnswerIndex: number;
    explanation?: string;
  }[];
  isActive: boolean;
}

const MODULES: ModuleSeed[] = [
  // ============================================
  // LEAVE NO TRACE
  // ============================================
  {
    id: 'lnt-principles',
    trackId: 'leave-no-trace',
    title: 'The 7 Principles of Leave No Trace',
    description: 'Learn how to minimize your impact on the environment',
    icon: 'leaf',
    order: 0,
    estimatedMinutes: 12,
    content: `# Leave No Trace: The 7 Principles

Leave No Trace is a set of outdoor ethics promoting conservation in the outdoors. These seven principles were developed to help people make decisions that minimize their impact on the environment while enjoying the outdoors.

## Principle 1: Plan Ahead and Prepare

Proper trip planning and preparation helps you accomplish trip goals safely while minimizing damage to natural and cultural resources.

**Key Points:**
- Know the regulations and special concerns for the area you'll visit
- Prepare for extreme weather, hazards, and emergencies
- Schedule your trip to avoid times of high use
- Visit in small groups when possible
- Repackage food to minimize waste
- Use a map and compass or GPS to eliminate the use of marking paint, rock cairns or flagging

## Principle 2: Travel and Camp on Durable Surfaces

The goal is to prevent damage to land and vegetation. Durable surfaces include established trails and campsites, rock, gravel, dry grasses, or snow.

**In popular areas:**
- Use existing trails and campsites
- Walk single file in the middle of the trail, even when wet or muddy
- Keep campsites small and focus activity in areas where vegetation is absent

**In pristine areas:**
- Disperse use to prevent the creation of campsites and trails
- Avoid places where impacts are just beginning

## Principle 3: Dispose of Waste Properly

Pack it in, pack it out. Inspect your campsite and rest areas for trash or spilled foods. Pack out all trash, leftover food, and litter.

**Human Waste:**
- Deposit solid human waste in catholes dug 6 to 8 inches deep, at least 200 feet from water, camp, and trails
- Cover and disguise the cathole when finished
- Pack out toilet paper and hygiene products

**Water:**
- To wash yourself or dishes, carry water 200 feet away from streams or lakes
- Use small amounts of biodegradable soap
- Scatter strained dishwater

## Principle 4: Leave What You Find

Preserve the past: examine, but do not touch cultural or historic structures and artifacts. Leave rocks, plants, and other natural objects as you find them.

**Guidelines:**
- Do not build structures, furniture, or dig trenches
- Avoid introducing or transporting non-native species
- Let others enjoy the same sense of discovery

## Principle 5: Minimize Campfire Impacts

Campfires can cause lasting impacts to the environment. Use a lightweight stove for cooking and enjoy a candle lantern for light.

**If fires are permitted:**
- Use established fire rings, fire pans, or mound fires
- Keep fires small, using sticks from the ground that can be broken by hand
- Burn all wood and coals to ash, put out campfires completely, then scatter cool ashes

## Principle 6: Respect Wildlife

Observe wildlife from a distance. Do not follow or approach them. Never feed wildlife—feeding damages their health, alters natural behaviors, and exposes them to predators.

**Best Practices:**
- Protect wildlife by storing food and trash securely
- Control pets at all times, or leave them at home
- Avoid wildlife during sensitive times: mating, nesting, raising young, or winter

## Principle 7: Be Considerate of Other Visitors

Respect other visitors and protect the quality of their experience. Let nature's sounds prevail.

**Trail Etiquette:**
- Yield to other users on the trail
- Step to the downhill side of the trail when encountering pack stock
- Take breaks and camp away from trails and other visitors
- Avoid loud voices and noises

---

## Why Leave No Trace Matters

These principles aren't just rules—they're a way of thinking about our relationship with nature. When millions of people visit outdoor spaces, even small impacts add up. By practicing Leave No Trace, you're helping to:

- **Preserve wild places** for future generations
- **Protect ecosystems** and the wildlife that depends on them
- **Ensure access** to public lands remains open
- **Create better experiences** for everyone in the outdoors

Remember: take only photos, leave only footprints (on durable surfaces!), and kill only time.
`,
    quiz: [
      {
        id: 'lnt-q1',
        question: 'How far from water sources should you dispose of human waste?',
        options: ['50 feet', '100 feet', '200 feet', '500 feet'],
        correctAnswerIndex: 2,
        explanation:
          'You should dispose of human waste at least 200 feet from water, camp, and trails to prevent contamination.',
      },
      {
        id: 'lnt-q2',
        question: 'What is the recommended depth for a cathole?',
        options: ['2-3 inches', '4-5 inches', '6-8 inches', '10-12 inches'],
        correctAnswerIndex: 2,
        explanation:
          'Catholes should be dug 6 to 8 inches deep to ensure proper decomposition.',
      },
      {
        id: 'lnt-q3',
        question: 'What should you do with wildlife you encounter?',
        options: [
          'Approach slowly for photos',
          'Feed them small amounts of food',
          'Observe from a distance and never feed',
          'Chase them away from camp',
        ],
        correctAnswerIndex: 2,
        explanation:
          'Always observe wildlife from a distance. Feeding wildlife damages their health and alters natural behaviors.',
      },
      {
        id: 'lnt-q4',
        question: "What are considered 'durable surfaces' for camping?",
        options: [
          'Any flat ground',
          'Grassy meadows',
          'Established campsites, rock, gravel, or snow',
          'Under large trees',
        ],
        correctAnswerIndex: 2,
        explanation:
          'Durable surfaces include established trails and campsites, rock, gravel, dry grasses, or snow.',
      },
      {
        id: 'lnt-q5',
        question: "Which principle says 'Pack it in, pack it out'?",
        options: [
          'Plan Ahead and Prepare',
          'Travel on Durable Surfaces',
          'Dispose of Waste Properly',
          'Leave What You Find',
        ],
        correctAnswerIndex: 2,
        explanation:
          "The 'Dispose of Waste Properly' principle includes packing out all trash and leftover food.",
      },
    ],
    isActive: true,
  },

  // ============================================
  // WEEKEND CAMPER TRACK
  // ============================================
  {
    id: 'wc-plan-trip',
    trackId: 'novice',
    title: 'Plan a Weekend Trip',
    description: 'Pick the right campground, choose a site, and build a simple itinerary',
    icon: 'map',
    order: 0,
    estimatedMinutes: 8,
    content: `# Plan a Weekend Trip That Doesn't Stress You Out

## Lesson 1.1: Pick the Right Campground

**Start close.** Your first trip should be within 90 minutes of home.

### Look for:
- Bathrooms on-site
- Potable water access
- Cell signal (for emergencies)
- Clear check-in and quiet hours
- Fire rules posted

**Pro tip:** If you're unsure, choose a state park or county forest preserve campground. They're usually predictable and well-maintained.

### Quick Checklist
- Drive time under 90 minutes
- Bathrooms on-site
- Water available
- Campfire rules checked
- Site fits your setup (tent pad, shade, level ground)

---

## Lesson 1.2: Choose a Site Like a Pro

**Shade matters more than you think.** A shady site in summer can make the difference between comfortable and miserable.

### Things to consider:
- "Close to bathroom" sounds great until you're next to the 2:00 AM door slam parade
- Avoid low spots where water pools when it rains
- Look for level ground for sleeping

**Tiny tip:** If the map shows a site "near the loop entrance," that can mean headlights all night from people coming and going.

---

## Lesson 1.3: Build a Simple Itinerary

Keep it basic. Your first trip doesn't need to be an adventure marathon.

### The Simple Structure:
1. Arrive, set up, eat
2. One easy activity
3. One easy meal
4. Sleep, coffee, pack down, leave

### Mini Template

**Friday:** Arrive 5-7 PM, Set up camp, Simple dinner

**Saturday:** Breakfast, One activity, Lunch, Relax time, Dinner

**Sunday:** Coffee, Easy breakfast, Pack down, Head home

---

[Next: Gear Basics]
`,
    quiz: [
      {
        id: 'wc1-q1',
        question: 'What is the best first-trip drive time?',
        options: ['15 minutes', 'Under 90 minutes', '3-5 hours', 'It does not matter'],
        correctAnswerIndex: 1,
        explanation: 'Staying within about 90 minutes keeps the trip low-stress.',
      },
    ],
    isActive: true,
  },
  {
    id: 'wc-gear-basics',
    trackId: 'novice',
    title: 'Gear Basics Without the Overwhelm',
    description: 'The weekend camper core kit, sleep setup, and camp kitchen basics',
    icon: 'briefcase',
    order: 1,
    estimatedMinutes: 10,
    content: `# Gear Basics Without the Overwhelm

## Lesson 2.1: The Weekend Camper Core Kit

You don't need everything. You need the right things.

### Must-Haves

**Shelter:** Tent, Stakes, Guylines, Groundsheet

**Sleep:** Sleeping pad, Sleeping bag, Pillow (real pillow counts, no shame)

**Light:** Headlamp, Backup light source

**Water:** Water jug, Personal water bottles

**Safety:** First aid kit, Personal meds, Lighter, Multitool

**Comfort:** Camp chair, Warm layer, Bug spray

### Nice-to-Haves (But Not Essential)
Pop-up shade, Lantern, Doormat for tent entrance, Small broom

---

## Lesson 2.2: Sleep Setup That Actually Works

**Cold comes from the ground first.** Your sleeping pad matters more than your sleeping bag for warmth.

### Key Tips:
- Bring one warmer layer than you think you need
- Earplugs are not an admission of defeat

### Quick Test at Home
Set up your sleeping pad and lay on it for 10 minutes. If you hate it in your living room, you'll hate it more at 2:00 AM in the woods.

---

## Lesson 2.3: Camp Kitchen Basics

### Minimum Viable Camp Kitchen:
- Stove OR fire plan (one, not both, for your first trip)
- Pan or pot
- Spoon, knife, cutting board
- Cooler
- Dish soap, sponge, trash bags

### The Food Rule
If you need three different appliances to make it, it's not a weekend camping meal.

---

[Back: Plan Trip] [Next: Setup Skills]
`,
    quiz: [
      {
        id: 'wc2-q1',
        question:
          'Why does a sleeping pad matter even more than a sleeping bag for warmth?',
        options: [
          'Pads are softer',
          'Bags do not work',
          'The ground steals heat fast',
          'Pads block bugs',
        ],
        correctAnswerIndex: 2,
        explanation:
          'Cold comes from the ground first. Insulation under you is a big deal.',
      },
    ],
    isActive: true,
  },
  {
    id: 'wc-setup-skills',
    trackId: 'novice',
    title: 'Setup Skills for a Smooth First Night',
    description: 'Arrive and set up in the right order, tent setup basics',
    icon: 'construct',
    order: 2,
    estimatedMinutes: 8,
    content: `# Setup Skills for a Smooth First Night

## Lesson 3.1: Arrive and Set Up in the Right Order

Order matters. Here's the sequence:

1. **Park and claim your space**
2. **Tent first** (before dark, before dinner)
3. **Sleep system inside** the tent
4. **Kitchen area** set up
5. **Fire last** (if you're having one)

Getting your tent up while there's still daylight is the single most important thing you can do.

---

## Lesson 3.2: Tent Setup Basics

### Key Tips:
- Stake corners first, then add tension
- If the ground is hard, use a rock to start stake holes
- Keep the rainfly on if weather is iffy
- Venting matters, but staying dry matters more

### Practice at Home
Set up your tent in the backyard first.

---

## Lesson 3.3: Camp Layout Basics

Think in **3 zones**:

**Sleep Zone:** Tent, Shoes outside, Headlamp accessible

**Kitchen Zone:** Stove, Cooler, Water, Prep area

**Hangout Zone:** Chairs, Light, Fire pit

### The Rule
**Don't cook where you sleep.** Even at a campground. Keep food smells away from your tent.

---

[Back: Gear Basics] [Next: Camp Food]
`,
    quiz: [
      {
        id: 'wc3-q1',
        question: 'What is the smartest setup order when you arrive at camp?',
        options: [
          'Fire first',
          'Dinner first',
          'Tent first, then sleep system, then kitchen, fire last',
          'Explore first',
        ],
        correctAnswerIndex: 2,
        explanation: 'Getting shelter up early prevents a miserable after-dark setup.',
      },
    ],
    isActive: true,
  },
  {
    id: 'wc-camp-food',
    trackId: 'novice',
    title: 'Food You Can Pull Off at Camp',
    description: 'The no-fuss meal plan, starter meals, and cooler basics',
    icon: 'restaurant',
    order: 3,
    estimatedMinutes: 8,
    content: `# Food You Can Pull Off at Camp

## Lesson 4.1: The No-Fuss Meal Plan

### Simple Structure:
- 2 breakfasts
- 1 lunch
- 2 dinners
- Snacks
- **One emergency meal** (ramen, oatmeal, or pouch meal)

The emergency meal is for when everything else goes wrong.

---

## Lesson 4.2: Camp Cooking Starter Meals

### Easy Dinner Ideas

**Tacos:** Pre-cooked meat or beans, Bagged coleslaw, Tortillas

**One-Pot Pasta:** Pasta, Jar sauce, Pre-cooked sausage

**Foil Packs:** Cubed potatoes, Chopped vegetables, Sliced kielbasa

### Easy Breakfast Ideas

**Quick:** Yogurt + granola + fruit

**Heartier:** Breakfast burritos (make at home, reheat at camp)

---

## Lesson 4.3: Cooler Basics

### Key Tips:
- Pre-chill your cooler the night before if you can
- Use frozen water bottles as ice
- Keep the cooler closed as much as possible

---

[Back: Setup Skills] [Next: Weather and Bugs]
`,
    quiz: [
      {
        id: 'wc4-q1',
        question: 'For a first weekend trip, what is the simplest cooking plan?',
        options: [
          'Bring a stove, fire optional',
          'Cook everything over fire only',
          'Bring grill, stove, and propane setup',
          'Eat only snacks',
        ],
        correctAnswerIndex: 0,
        explanation: 'A stove is predictable and easy. Fires are fun but not guaranteed.',
      },
    ],
    isActive: true,
  },
  {
    id: 'wc-weather-bugs',
    trackId: 'novice',
    title: 'Weather, Bugs, and Other Tiny Goblins',
    description: 'Rain plan, staying warm at night, and dealing with bugs',
    icon: 'rainy',
    order: 4,
    estimatedMinutes: 7,
    content: `# Weather, Bugs, and Other Tiny Goblins

## Lesson 5.1: Rain Plan

**Always pack:** Rain jacket, Extra socks, Trash bags (for wet stuff), Tarp

### The Wet Stuff Rule
Wet stuff gets its own bag. Don't "deal with it later." Later is always worse.

---

## Lesson 5.2: Staying Warm at Night

### The Holy Trio:
1. Hat
2. Dry socks
3. Warm layer

If you have those three things, you can survive most cold nights.

### Hot Water Bottle Trick
Fill a water bottle with warm (not boiling) water and toss it in your sleeping bag before bed.

---

## Lesson 5.3: Bugs Without Misery

### Key Tips:
- Treat bites fast. Small itch becomes big misery.
- Bug spray is your friend. Apply before you need it.
- A headnet is a cheat code during peak mosquito season.

### Timing
Mosquitoes are worst at dawn and dusk.

---

[Back: Camp Food] [Next: Confidence and Clean Exit]
`,
    quiz: [
      {
        id: 'wc5-q1',
        question: 'Which is the best rain habit for a weekend camper?',
        options: [
          'Leave wet gear in tent to dry',
          'Pack extra socks, tarp, separate bag for wet items',
          'Skip rain gear',
          'Build huge fire to dry everything',
        ],
        correctAnswerIndex: 1,
        explanation:
          'Wet stuff needs separation. Extra dry socks and basic rain coverage are clutch.',
      },
    ],
    isActive: true,
  },
  {
    id: 'wc-confidence-exit',
    trackId: 'novice',
    title: 'Campground Confidence and Clean Exit',
    description:
      'Campfire basics, Leave No Trace weekend edition, and the 10-minute pack-down',
    icon: 'exit',
    order: 5,
    estimatedMinutes: 8,
    content: `# Campground Confidence and Clean Exit

## Lesson 6.1: Campfire Basics (Optional, But Popular)

### Before You Start:
- Know the rules first (some places ban fires, especially during dry seasons)
- Keep water nearby
- If you can't hold your hand near it for 5 seconds, it's too hot

### Fire Etiquette:
- Keep it manageable
- Don't leave it unattended
- Put it completely out before bed (stir, drown, stir again)

---

## Lesson 6.2: Leave No Trace, Weekend Edition

Even at a campground, Leave No Trace matters.

### Key Actions:
- Trash out, micro-trash too (tabs, twist ties, foil bits)
- Food scraps are NOT "nature friendly" - pack them out
- Leave your site cleaner than you found it

### The Scan
Before you leave, do a slow 360 degree scan of your site.

---

## Lesson 6.3: The 10-Minute Pack-Down

### Fast Pack Order:
1. Trash and food first
2. Cooler and kitchen gear
3. Tent interior (sleeping bag, pad, pillow)
4. Tent exterior (take down, shake out, pack)
5. Final sweep

### Did We Leave Anything Scan
**Look under the picnic table.** Everyone forgets something under the picnic table.

---

[Back: Weather and Bugs] [Next: Take the Quiz]
`,
    quiz: [
      {
        id: 'wc6-q1',
        question: 'Leave No Trace, weekend edition, means:',
        options: [
          'Burning all trash in the fire',
          'Leaving food scraps for animals',
          'Packing out all trash, including tiny micro-trash',
          'Burying everything',
        ],
        correctAnswerIndex: 2,
        explanation: 'Micro-trash and food scraps cause problems. Pack it all out.',
      },
    ],
    isActive: true,
  },
  {
    id: 'wc-final-quiz',
    trackId: 'novice',
    title: 'Weekend Camper Final Quiz',
    description: 'Test your knowledge and earn the Weekend Camper badge',
    icon: 'trophy',
    order: 6,
    estimatedMinutes: 5,
    content: `# Weekend Camper Final Quiz

Congratulations on completing the Weekend Camper track!

You've learned:
- How to pick the right campground and site
- What gear you actually need (and what you don't)
- How to set up camp efficiently
- Easy meals that work at camp
- How to handle weather and bugs
- How to leave your campsite better than you found it

---

## Ready to Earn Your Badge?

Answer all 10 questions correctly to earn the **Weekend Camper** merit badge.

The badge will appear on your My Campsite screen once you pass.

**Tip:** If you don't pass the first time, you can review the modules and try again.

Good luck!

---

Congratulations! You've earned the Weekend Camper badge. You'll find it on your campsite.
`,
    quiz: [
      {
        id: 'wcq-1',
        question: 'What is the best drive time for a first weekend camping trip?',
        options: ['15 minutes', 'Under 90 minutes', '3 to 5 hours', 'It does not matter'],
        correctAnswerIndex: 1,
        explanation: 'Staying within about 90 minutes keeps the trip low-stress.',
      },
      {
        id: 'wcq-2',
        question:
          'Why does a sleeping pad matter even more than a sleeping bag for warmth?',
        options: [
          'Pads are softer',
          'Bags do not work',
          'The ground steals heat fast and the pad insulates you',
          'Pads block bugs',
        ],
        correctAnswerIndex: 2,
        explanation:
          'Cold comes from the ground first. Insulation under you is a big deal.',
      },
      {
        id: 'wcq-3',
        question: 'Which site location often causes the most sleep disruption?',
        options: [
          'In shade',
          'On level ground',
          'Near the loop entrance or main road',
          'With a tent pad',
        ],
        correctAnswerIndex: 2,
        explanation:
          'Entrances and roads usually mean headlights, doors, and traffic noise.',
      },
      {
        id: 'wcq-4',
        question: 'What is the smartest setup order when you arrive at camp?',
        options: [
          'Fire first',
          'Dinner first',
          'Tent first, then sleep system, then kitchen, fire last',
          'Explore first',
        ],
        correctAnswerIndex: 2,
        explanation: 'Getting shelter up early prevents a miserable after-dark setup.',
      },
      {
        id: 'wcq-5',
        question: 'For a first weekend trip, what is the simplest cooking plan?',
        options: [
          'Bring a stove and rely on that, fire optional',
          'Cook everything over the fire only',
          'Bring grill, stove, and propane setup',
          'Eat only snacks',
        ],
        correctAnswerIndex: 0,
        explanation: 'A stove is predictable and easy. Fires are fun but not guaranteed.',
      },
      {
        id: 'wcq-6',
        question: 'What is a minimum viable camp kitchen item list?',
        options: [
          'Cast iron set, blender, Dutch oven',
          'Stove, one pot/pan, utensil, cooler, soap/sponge, trash bags',
          'Microwave and extension cord',
          'Only paper plates',
        ],
        correctAnswerIndex: 1,
        explanation: 'Keep it simple and functional. You can add fancy gear later.',
      },
      {
        id: 'wcq-7',
        question: 'Which is the best rain habit for a weekend camper?',
        options: [
          'Leave wet gear in tent to dry',
          'Pack extra socks, tarp, and separate bag for wet items',
          'Skip rain gear',
          'Build huge fire to dry everything',
        ],
        correctAnswerIndex: 1,
        explanation:
          'Wet stuff needs separation. Extra dry socks and basic rain coverage are clutch.',
      },
      {
        id: 'wcq-8',
        question: 'What is the best way to keep a cooler cold longer?',
        options: [
          'Open it often to let it breathe',
          'Pre-chill it and keep it closed as much as possible',
          'Put it in direct sun',
          'Use only loose ice cubes',
        ],
        correctAnswerIndex: 1,
        explanation:
          'Cold retention is mostly about starting cold and minimizing warm air swaps.',
      },
      {
        id: 'wcq-9',
        question: 'What is the best rule for camp layout?',
        options: [
          'Cook where you sleep',
          'Keep sleep, kitchen, and hangout areas separated',
          'Put the cooler inside the tent',
          'Build kitchen next to fire pit only',
        ],
        correctAnswerIndex: 1,
        explanation: 'Separation keeps things cleaner, safer, and more comfortable.',
      },
      {
        id: 'wcq-10',
        question: 'Leave No Trace, weekend edition, means:',
        options: [
          'Burning all trash in the fire',
          'Leaving food scraps for animals',
          'Packing out all trash, including tiny micro-trash',
          'Burying everything',
        ],
        correctAnswerIndex: 2,
        explanation: 'Micro-trash and food scraps cause problems. Pack it all out.',
      },
    ],
    isActive: true,
  },

  // ============================================
  // TRAIL LEADER TRACK (Intermediate to Advanced - 10 Modules + Final Quiz)
  // ============================================
  {
    id: 'tl-what-leader-does',
    trackId: 'intermediate',
    title: 'What a Trail Leader Actually Does',
    description: 'The Trail Leader mindset: planning, communication, and risk management',
    icon: 'people',
    order: 0,
    estimatedMinutes: 8,
    content: `# What a Trail Leader Actually Does

Trail leadership is not "being the boss." It is being the person who keeps the group safe, steady, and having a good time, even when conditions change. A Trail Leader is part planner, part guide, part vibe manager, and part risk accountant.

Your job is to reduce surprises. You do that by making good calls early, communicating clearly, and watching the group like a hawk without making it weird.

---

## A Solid Trail Leader Mindset

- You plan for the slowest hiker, not the strongest.
- You manage the day by time, not by ego.
- You treat small issues early, before they become a crisis.
- You keep decisions simple and visible. Nobody should wonder what the plan is.

---

## The Unsexy Responsibilities

You also take on the "unsexy" responsibilities:
- Confirming the route, the turnaround time, and the weather plan.
- Checking that everyone has the minimum gear, water, layers, and food.
- Keeping the group together. If you cannot see people, you cannot lead them.
- Setting expectations around pace, breaks, and stops.

---

## Set the Tone

And yes, you set the tone. Panic spreads fast. Calm spreads faster if you practice it.

---

[Next: Route Planning for Groups]
`,
    quiz: [
      {
        id: 'tl1-q1',
        question: 'The primary job of a Trail Leader is:',
        options: [
          'To hike the fastest',
          'To reduce surprises through planning and clear decisions',
          "To carry everyone's gear",
          'To pick the most scenic route only',
        ],
        correctAnswerIndex: 1,
        explanation: 'Leadership is prevention, not performance.',
      },
      {
        id: 'tl1-q2',
        question: 'A good pace plan should be built around:',
        options: [
          'The fastest hiker',
          'The slowest hiker',
          'Whoever brought trekking poles',
          'Whoever has the newest boots',
        ],
        correctAnswerIndex: 1,
        explanation: 'Safe group pacing protects the slowest person.',
      },
      {
        id: 'tl1-q3',
        question: 'Trail leadership is best described as:',
        options: [
          'Being the boss',
          'Being responsible for safety, timing, communication, and group cohesion',
          'Having the best gear',
          'Never turning around',
        ],
        correctAnswerIndex: 1,
        explanation: 'It is a role of responsibility and clarity.',
      },
    ],
    isActive: true,
  },
  {
    id: 'tl-route-planning',
    trackId: 'intermediate',
    title: 'Route Planning for Groups',
    description: 'Time-based planning, route cards, and turnaround times',
    icon: 'map',
    order: 1,
    estimatedMinutes: 9,
    content: `# Route Planning for Groups (The "No Drama" Version)

Leading a group means you plan with more buffer than you would solo. Groups move slower. People need more breaks. Bathroom stops appear out of thin air. Somebody will have a snack emergency. That is normal.

---

## Four Questions to Answer

A good group route plan answers four questions:
1. Where are we going?
2. How long will it take at group pace?
3. What is our turnaround time?
4. What is our plan if something changes?

Use time-based planning. Miles do not capture elevation, terrain, or the group factor. For Trail Leader level, you do not need complex modeling, just honest expectations and buffers.

---

## Build a Simple Route Card

- Trailhead start time
- Key landmarks
- Water sources
- Turnaround time (non-negotiable)
- Bailout options (shortcuts, alternate trails, exit points)

---

## Turnaround Time

Turnaround time is how leaders keep groups safe. It prevents the classic problem: hiking too far, getting caught in darkness, then making rushed decisions. Set it before you start. Say it out loud. Repeat it. Then follow it.

---

[Back: What a Trail Leader Actually Does] [Next: Navigation Basics for Leading]
`,
    quiz: [
      {
        id: 'tl2-q1',
        question: 'Group route planning should prioritize:',
        options: [
          'Total miles',
          'Time, pace, and buffer',
          'The coolest viewpoint',
          'The steepest climb',
        ],
        correctAnswerIndex: 1,
        explanation: 'Groups need realistic timing and cushion.',
      },
      {
        id: 'tl2-q2',
        question: 'A turnaround time is:',
        options: [
          'When you get bored',
          'A pre-decided time to turn back regardless of how close you feel to the goal',
          'Only for winter hiking',
          'Optional if everyone feels good',
        ],
        correctAnswerIndex: 1,
        explanation: 'It prevents late-day risk and rushed decisions.',
      },
      {
        id: 'tl2-q3',
        question: 'A simple route card should include:',
        options: [
          'Only the trail name',
          'Start time, landmarks, water, turnaround time, bailouts',
          'Just a screenshot of AllTrails',
          'Only the total elevation',
        ],
        correctAnswerIndex: 1,
        explanation: 'It is a decision and communication tool.',
      },
    ],
    isActive: true,
  },
  {
    id: 'tl-navigation-basics',
    trackId: 'intermediate',
    title: 'Navigation Basics for Leading',
    description: 'Staying oriented, junction discipline, and when to stop',
    icon: 'compass',
    order: 2,
    estimatedMinutes: 8,
    content: `# Navigation Basics for Leading (No Winging It)

A Trail Leader does not need to be a wilderness navigator, but you do need to be reliably un-lost. That means you can confirm where you are, keep the group on route, and correct quickly if you drift.

---

## Your Navigation Stack

- A downloaded map (offline)
- A basic understanding of the route shape (out-and-back, loop, lollipop)
- Landmark awareness (ridges, creeks, junctions)
- A simple "check-in" routine

---

## Junction Discipline

Leadership habit: confirm at every junction. Even obvious junctions. Especially obvious junctions. Groups get "pulled" down the wrong path because the most confident person walks first and everyone follows. Your job is to interrupt that autopilot.

---

## When Uncertain

If you are uncertain:
- Stop the group.
- Confirm position on the map.
- Identify the last known point.
- Move only when the plan is clear.

This is not "slowing everyone down." This is leadership.

---

[Back: Route Planning for Groups] [Next: Weather Planning and On-Trail Calls]
`,
    quiz: [
      {
        id: 'tl3-q1',
        question: 'Best practice at trail junctions is:',
        options: [
          'Let the group choose',
          'Confirm the route at every junction before continuing',
          'Follow the person in front',
          'Keep moving so you do not lose momentum',
        ],
        correctAnswerIndex: 1,
        explanation: 'Junctions are where groups drift off-route.',
      },
      {
        id: 'tl3-q2',
        question: 'If you are uncertain about location, the best first move is:',
        options: [
          'Keep walking until it looks familiar',
          'Stop the group and confirm position before moving',
          'Split up to search',
          'Call for rescue immediately',
        ],
        correctAnswerIndex: 1,
        explanation: 'Stopping prevents compounding mistakes.',
      },
      {
        id: 'tl3-q3',
        question: 'A strong Trail Leader navigation habit is:',
        options: [
          'Only check maps when lost',
          'Regular check-ins and landmark confirmation',
          'Ignore landmarks',
          'Rely on cell service',
        ],
        correctAnswerIndex: 1,
        explanation: 'Continuous confirmation prevents errors.',
      },
    ],
    isActive: true,
  },
  {
    id: 'tl-weather-planning',
    trackId: 'intermediate',
    title: 'Weather Planning and On-Trail Calls',
    description: 'Forecasting, exposure, and making early weather decisions',
    icon: 'cloudy',
    order: 3,
    estimatedMinutes: 8,
    content: `# Weather Planning and On-Trail Calls

Weather is where Trail Leaders earn their keep. Most bad days start with "It is probably fine." Your job is to replace "probably" with "plan."

---

## Before the Hike

- Check the forecast for the actual hiking zone, not just the nearest town.
- Look for wind, precipitation timing, and temperature swings.
- Understand what the weather means for exposure (cold + wet + wind is a big deal).

---

## On Trail

- Watch for building clouds, rising wind, and temperature drops.
- Make early calls. If a storm is building, do not wait until you are on the most exposed section to react.
- Use clear triggers:
  - **Thunder heard?** Move off high points and exposed ridges.
  - **Cold and wet?** Add layers now, not later.
  - **Heat building?** Slow pace, increase breaks, push hydration.

---

## Leadership Means Early Calls

Leadership means you call it before people start negotiating with reality.

---

[Back: Navigation Basics for Leading] [Next: The Gear Minimums]
`,
    quiz: [
      {
        id: 'tl4-q1',
        question: 'A Trail Leader should check weather:',
        options: [
          'Only after arriving',
          'Before the hike, for the specific zone, and monitor changes on trail',
          'Only if it looks cloudy',
          'Only in winter',
        ],
        correctAnswerIndex: 1,
        explanation: 'Weather drives safety and pacing decisions.',
      },
      {
        id: 'tl4-q2',
        question: 'The safest approach to storms is:',
        options: [
          'Wait and see',
          'Make early decisions and avoid exposed terrain',
          'Go faster to outrun it',
          'Ignore thunder',
        ],
        correctAnswerIndex: 1,
        explanation: 'Early calls reduce exposure risk.',
      },
      {
        id: 'tl4-q3',
        question: 'Cold + wet + wind primarily increases risk of:',
        options: ['Sunburn', 'Hypothermia', 'Altitude sickness', 'Blisters only'],
        correctAnswerIndex: 1,
        explanation: 'Wind and wet strip heat quickly.',
      },
    ],
    isActive: true,
  },
  {
    id: 'tl-gear-minimums',
    trackId: 'intermediate',
    title: 'The Gear Minimums',
    description: 'Spotting gaps and ensuring group readiness',
    icon: 'briefcase',
    order: 4,
    estimatedMinutes: 8,
    content: `# The Gear Minimums (And How to Spot the Missing Stuff)

Trail Leaders do not just carry their own gear. They ensure the group has the minimum gear to handle normal problems. That does not mean you carry everything for everyone. It means you spot the gaps and fix them before the trailhead.

---

## The Leader Minimums

The "leader minimums" are practical:
- **Navigation:** offline map, route overview, power backup
- **Safety:** first aid basics, blister care, headlamp
- **Layers:** insulation and a shell, even on "nice" days
- **Water:** enough capacity and a backup plan
- **Food:** enough calories for delays, plus a little extra
- **Communication:** charged phone, and a plan for poor service

---

## Common Failures to Spot

Also, know the most common failures:
- Cotton hoodies in cold weather
- One tiny water bottle for a long hike
- No headlamp because "we will be back before dark"
- No extra snacks

You do not need to shame people. You just need to prevent a miserable day.

---

[Back: Weather Planning and On-Trail Calls] [Next: Pacing, Breaks, and Keeping the Group Together]
`,
    quiz: [
      {
        id: 'tl5-q1',
        question: 'Why do Trail Leaders check gear minimums?',
        options: [
          'To control people',
          'To reduce predictable failures and preventable emergencies',
          'To make packing harder',
          'To make the hike longer',
        ],
        correctAnswerIndex: 1,
        explanation: 'Small gear gaps can become safety issues.',
      },
      {
        id: 'tl5-q2',
        question: 'A headlamp is important because:',
        options: [
          'It looks cool',
          'Delays happen, and darkness turns small problems into big ones',
          'It replaces a map',
          'Only guides use them',
        ],
        correctAnswerIndex: 1,
        explanation: 'Light is a safety tool.',
      },
      {
        id: 'tl5-q3',
        question: 'A common high-risk clothing mistake is:',
        options: [
          'Wool socks',
          'Cotton layers in cold or wet conditions',
          'A shell jacket',
          'A hat',
        ],
        correctAnswerIndex: 1,
        explanation: 'Cotton holds moisture and accelerates chilling.',
      },
    ],
    isActive: true,
  },
  {
    id: 'tl-pacing-breaks',
    trackId: 'intermediate',
    title: 'Pacing, Breaks, and Keeping the Group Together',
    description: 'Group cohesion, sweep concept, and fatigue signals',
    icon: 'walk',
    order: 5,
    estimatedMinutes: 8,
    content: `# Pacing, Breaks, and Keeping the Group Together

Group pacing is not about speed. It is about sustainability and cohesion. If your group splits into little pods, leadership gets harder, risk goes up, and morale can drop fast.

---

## Key Pacing Tools

- Set expectations at the trailhead: pace, breaks, regroup points.
- Use the "sweep" concept: one person stays last (or you, if small group). Nobody falls behind unseen.
- Break strategy: short and regular beats long and rare.
- Snack and water reminders prevent late-day crashes.

---

## Watch for Early Fatigue Signals

- Quietness
- Tripping more often
- Short answers
- Falling behind on uphills

When you see these, stop early, fuel, hydrate, adjust pace. This is not coddling. This is preventing an injury.

---

[Back: The Gear Minimums] [Next: First Aid and Field Fixes for Day Hikes]
`,
    quiz: [
      {
        id: 'tl6-q1',
        question: 'The safest group travel rule is:',
        options: [
          'Everyone hikes at their own speed',
          'Keep the group together with regroup points and a sweep',
          'Let the fastest scout ahead',
          'Split up to cover more ground',
        ],
        correctAnswerIndex: 1,
        explanation: 'Cohesion improves safety and communication.',
      },
      {
        id: 'tl6-q2',
        question: 'Breaks should generally be:',
        options: [
          'Long and rare',
          'Short and regular',
          'Only at the end',
          'Only when someone complains',
        ],
        correctAnswerIndex: 1,
        explanation: 'Regular short breaks maintain energy and prevent bonks.',
      },
      {
        id: 'tl6-q3',
        question: 'Early fatigue signals include:',
        options: [
          'Faster talking',
          'Clumsiness and quietness',
          'Better posture',
          'More laughter only',
        ],
        correctAnswerIndex: 1,
        explanation: 'These can indicate low fuel, dehydration, or overpacing.',
      },
    ],
    isActive: true,
  },
  {
    id: 'tl-first-aid',
    trackId: 'intermediate',
    title: 'First Aid and Field Fixes for Day Hikes',
    description: 'Blisters, ankles, heat illness, and cold exposure',
    icon: 'medkit',
    order: 6,
    estimatedMinutes: 9,
    content: `# First Aid and Field Fixes for Day Hikes

Trail Leader first aid is mostly about two things: blisters and ankles. Add heat illness and cold exposure, and you have got the big four for most day hikes.

---

## Blisters

- Treat hot spots early. Waiting is how you get a painful crater.
- Dry the area, apply blister tape, adjust socks or footwear.
- If a blister forms, protect it and reduce friction.

---

## Ankles

- If someone rolls an ankle, you assess walking ability and stability.
- Stabilize, reduce swelling, and decide if the route needs to change.
- If gait is unstable, you shift into exit mode.

---

## Heat Illness

- Slow down, increase breaks, hydrate, cool the body.
- Confusion, nausea, and chills in heat are red flags.

---

## Cold Exposure

- Add layers early.
- Keep people dry.
- Fuel and warm fluids help.

---

## Leadership Is Early Action

Leadership is early action and honest calls. The goal is to get everyone out safely, not to "push through."

---

[Back: Pacing, Breaks, and Keeping the Group Together] [Next: Trail Etiquette, Ethics, and Being the Group Adults]
`,
    quiz: [
      {
        id: 'tl7-q1',
        question: 'Best blister strategy is:',
        options: [
          'Ignore hot spots',
          'Treat hot spots early before they become blisters',
          'Wear thinner socks',
          'Pop everything immediately',
        ],
        correctAnswerIndex: 1,
        explanation: 'Early treatment prevents worse damage.',
      },
      {
        id: 'tl7-q2',
        question: 'After an ankle injury, a key decision factor is:',
        options: [
          'Whether the person is annoyed',
          'Whether they can walk with a stable gait',
          'Whether the trail is pretty',
          'Whether it is almost lunch',
        ],
        correctAnswerIndex: 1,
        explanation: 'Unstable gait increases risk of worsening injury.',
      },
      {
        id: 'tl7-q3',
        question: 'Confusion and nausea during a hot hike can indicate:',
        options: [
          'Good fitness',
          'Heat illness risk',
          'Normal hunger only',
          'Better hydration',
        ],
        correctAnswerIndex: 1,
        explanation: 'Those can be warning signs that need action.',
      },
    ],
    isActive: true,
  },
  {
    id: 'tl-etiquette-ethics',
    trackId: 'intermediate',
    title: 'Trail Etiquette, Ethics, and Being the Group Adults',
    description: 'Yield rules, impact, and setting expectations',
    icon: 'leaf',
    order: 7,
    estimatedMinutes: 8,
    content: `# Trail Etiquette, Ethics, and Being the Group Adults

Trail Leaders protect the experience for everyone. That includes your group, other hikers, and the landscape itself. Etiquette is not "being polite." It is operational.

---

## Core Etiquette

- Yield rules (know your region, but generally uphill hikers have priority, and bikes yield to hikers, horses have special rules).
- Keep noise low. Sound travels.
- Step aside for faster traffic without drama.
- Keep dogs controlled, and follow leash rules.

---

## Ethics and Impact

- Stay on trail. Cutting switchbacks causes erosion.
- Pack out all trash, including micro-trash.
- Respect closures. They exist for safety and restoration.

---

## Group Adulting

- Bathroom talk happens before the hike. Do not pretend it will not.
- Set expectations about music, pace, and breaks.
- Model the behavior you want.

---

[Back: First Aid and Field Fixes for Day Hikes] [Next: Managing Common Hazards]
`,
    quiz: [
      {
        id: 'tl8-q1',
        question: 'Why avoid cutting switchbacks?',
        options: [
          'It is slower',
          'It causes erosion and trail damage',
          'It makes you sweaty',
          'It is only a rule in national parks',
        ],
        correctAnswerIndex: 1,
        explanation: 'Shortcuts increase impact and degrade trails.',
      },
      {
        id: 'tl8-q2',
        question: 'Trail Leader etiquette includes:',
        options: [
          'Playing music loudly',
          'Keeping the group aware of yielding, spacing, and noise',
          'Only talking to your group',
          'Racing to viewpoints',
        ],
        correctAnswerIndex: 1,
        explanation: 'Leaders manage group behavior and shared space.',
      },
      {
        id: 'tl8-q3',
        question: '"Micro-trash" means:',
        options: [
          'Compostable food scraps',
          'Tiny trash like tabs, foil bits, and wrappers',
          'Only large items',
          'Rocks and sticks',
        ],
        correctAnswerIndex: 1,
        explanation: 'Tiny trash accumulates and harms wildlife.',
      },
    ],
    isActive: true,
  },
  {
    id: 'tl-managing-hazards',
    trackId: 'intermediate',
    title: 'Managing Common Hazards',
    description: 'Rivers, ridges, turnarounds, and the optimism trap',
    icon: 'warning',
    order: 8,
    estimatedMinutes: 8,
    content: `# Managing Common Hazards (Rivers, Ridges, and Turnarounds)

Trail Leaders do not need to do epic hazard crossings. They do need to recognize when a normal day hike has become a higher-risk situation.

---

## Common Hazards

- Stream crossings after rain
- Exposed ridges in wind or thunderstorms
- Slippery rock and mud
- Short winter daylight

---

## Conservative Rules

A good Trail Leader uses conservative rules:
- If a crossing feels questionable, look for a safer spot or turn around.
- If thunder is heard, get off exposed terrain.
- If the group is behind schedule, you turn around on time, not "when it feels right."

---

## The Optimism Trap

This is where leaders protect people from the optimism trap. The group will often argue for "just a bit more." Your job is to stick to the plan you made while thinking clearly.

---

[Back: Trail Etiquette, Ethics, and Being the Group Adults] [Next: Leveling Up, Debriefs, and Becoming the Person Everyone Trusts]
`,
    quiz: [
      {
        id: 'tl9-q1',
        question: 'If a stream crossing feels questionable, the best move is:',
        options: [
          'Cross fast',
          'Find a safer crossing, wait, or turn around',
          'Send the strongest person first and follow',
          'Jump and hope',
        ],
        correctAnswerIndex: 1,
        explanation: 'Conservative choices prevent high-consequence mistakes.',
      },
      {
        id: 'tl9-q2',
        question: 'Hearing thunder should trigger:',
        options: [
          'Getting onto high points for better views',
          'Moving off exposed ridges and avoiding isolated trees',
          'Speeding up to outrun it',
          'Ignoring it if rain is light',
        ],
        correctAnswerIndex: 1,
        explanation: 'Lightning risk is about exposure, not rain intensity.',
      },
      {
        id: 'tl9-q3',
        question: 'Turnaround time should be:',
        options: [
          'Flexible if everyone is excited',
          'Pre-decided and followed',
          'Optional on loops',
          'Only for beginners',
        ],
        correctAnswerIndex: 1,
        explanation: 'It prevents late-day risk.',
      },
    ],
    isActive: true,
  },
  {
    id: 'tl-leveling-up',
    trackId: 'intermediate',
    title: 'Leveling Up, Debriefs, and Becoming the Person Everyone Trusts',
    description: 'Post-trip learning, feedback loops, and building trust',
    icon: 'trending-up',
    order: 9,
    estimatedMinutes: 8,
    content: `# Leveling Up, Debriefs, and Becoming the Person Everyone Trusts

Trail Leaders become good by doing two things: practice and debrief. The debrief is where the learning actually sticks.

---

## After Each Trip, Ask

- What worked?
- What was slower than expected?
- Where did we lose time?
- What gear was missing or wrong?
- Did the group feel clear on the plan?
- What would we change next time?

This builds a feedback loop. Over time, you plan better, communicate better, and handle issues earlier. The end result is simple: people trust you. Not because you are loud, but because you are consistent.

---

## Leveling Up Skills to Aim For

- Smooth pacing with fewer "big stops"
- Clear route and weather communication
- Better hazard avoidance
- Fast problem solving when someone is cold, hungry, or anxious
- Stronger navigation confidence at junctions and in low visibility

---

## Trail Leadership Is a Craft

Trail leadership is a craft. The trail is your classroom.

---

[Back: Managing Common Hazards] [Next: Take the Final Quiz]
`,
    quiz: [
      {
        id: 'tl10-q1',
        question: 'The most important way to level up as a Trail Leader is:',
        options: [
          'Buying new gear',
          'Practicing and doing honest post-trip debriefs',
          'Hiking only solo',
          'Never turning around',
        ],
        correctAnswerIndex: 1,
        explanation: 'Debriefs create a learning loop and better decisions.',
      },
      {
        id: 'tl10-q2',
        question: 'A strong debrief question is:',
        options: [
          'Who was the slowest?',
          'What worked, what did not, and what would we change next time?',
          'Did we take enough photos?',
          'Who had the best pack?',
        ],
        correctAnswerIndex: 1,
        explanation: 'Focus on decisions and systems, not blame.',
      },
      {
        id: 'tl10-q3',
        question: 'Trust in a Trail Leader comes mostly from:',
        options: [
          'Being the strongest',
          'Being consistent, calm, and clear',
          'Being funny',
          'Knowing every trail name',
        ],
        correctAnswerIndex: 1,
        explanation: 'Consistency and clarity build confidence.',
      },
    ],
    isActive: true,
  },
  {
    id: 'tl-final-quiz',
    trackId: 'intermediate',
    title: 'Trail Leader Final Quiz',
    description: 'Test your knowledge and earn the Trail Leader badge',
    icon: 'trophy',
    order: 10,
    estimatedMinutes: 8,
    content: `# Trail Leader Final Quiz

Congratulations on completing the Trail Leader track!

You have learned:
- What a Trail Leader actually does: planning, communication, and risk management
- Route planning for groups: time-based planning and turnaround discipline
- Navigation basics for leading: junction discipline and staying oriented
- Weather planning and on-trail calls: forecasting and early decisions
- The gear minimums: spotting gaps and ensuring readiness
- Pacing, breaks, and keeping the group together: cohesion and fatigue signals
- First aid and field fixes: blisters, ankles, heat, and cold
- Trail etiquette, ethics, and being the group adults
- Managing common hazards: rivers, ridges, and the optimism trap
- Leveling up through practice and debriefs

---

## Ready to Earn Your Badge?

Answer all 10 questions correctly to earn the **Trail Leader** merit badge.

The badge will appear on your My Campsite screen once you pass.

**Tip:** If you do not pass the first time, you can review the modules and try again.

Good luck!

---

Congratulations on earning your Trail Leader badge! You will find it on your Campsite.
`,
    quiz: [
      {
        id: 'tlq-1',
        question: 'The primary job of a Trail Leader is to:',
        options: [
          'Hike the fastest',
          'Reduce surprises through planning, timing, and communication',
          "Carry everyone's gear",
          'Never change the plan',
        ],
        correctAnswerIndex: 1,
        explanation: 'Leadership is prevention and clarity.',
      },
      {
        id: 'tlq-2',
        question: 'Group pacing should be built around:',
        options: [
          'The fastest hiker',
          'The slowest hiker',
          'Whoever is most confident',
          'Whoever has the best shoes',
        ],
        correctAnswerIndex: 1,
        explanation: 'Safe plans protect the slowest person.',
      },
      {
        id: 'tlq-3',
        question: 'A turnaround time is:',
        options: [
          'Optional if you feel close to the goal',
          'A pre-decided time to head back regardless of distance achieved',
          'Only for winter',
          'Only for beginners',
        ],
        correctAnswerIndex: 1,
        explanation: 'It prevents late-day risk and rushed decisions.',
      },
      {
        id: 'tlq-4',
        question: 'Best practice at trail junctions is:',
        options: [
          'Follow the person in front',
          'Confirm the route at every junction before continuing',
          'Keep moving to save time',
          'Split up briefly',
        ],
        correctAnswerIndex: 1,
        explanation: 'Junctions are where groups drift off-route.',
      },
      {
        id: 'tlq-5',
        question: 'A key weather leadership practice is:',
        options: [
          'Check weather only after arriving',
          'Make early calls to avoid exposed terrain when storms are likely',
          'Ignore thunder if rain is light',
          'Speed up on ridges',
        ],
        correctAnswerIndex: 1,
        explanation: 'Early decisions reduce exposure risk.',
      },
      {
        id: 'tlq-6',
        question: 'A headlamp is important because:',
        options: [
          'It looks cool',
          'Delays happen, and darkness increases risk',
          'It replaces a map',
          'Only guides need them',
        ],
        correctAnswerIndex: 1,
        explanation: 'Light is a core safety tool.',
      },
      {
        id: 'tlq-7',
        question: 'Breaks are usually best when they are:',
        options: [
          'Long and rare',
          'Short and regular',
          'Only at the end',
          'Only when someone complains',
        ],
        correctAnswerIndex: 1,
        explanation: 'Regular short breaks maintain energy and cohesion.',
      },
      {
        id: 'tlq-8',
        question: 'Best blister strategy is:',
        options: [
          'Ignore hot spots',
          'Treat hot spots early to prevent blisters',
          'Pop everything immediately',
          'Wear cotton socks',
        ],
        correctAnswerIndex: 1,
        explanation: 'Early treatment prevents worse damage.',
      },
      {
        id: 'tlq-9',
        question: 'If a stream crossing feels questionable, the safest move is:',
        options: [
          'Cross quickly',
          'Find a safer spot, wait, or turn around',
          'Send the strongest person first',
          'Jump and hope',
        ],
        correctAnswerIndex: 1,
        explanation: 'Conservative choices avoid high-consequence mistakes.',
      },
      {
        id: 'tlq-10',
        question: 'The best way to level up as a Trail Leader is:',
        options: [
          'Buy new gear',
          'Practice, then do honest post-trip debriefs',
          'Hike only solo',
          'Avoid leading',
        ],
        correctAnswerIndex: 1,
        explanation: 'Debriefs create better planning and decisions over time.',
      },
    ],
    isActive: true,
  },

  // ============================================
  // BACKCOUNTRY GUIDE TRACK (Advanced - 10 Modules + Final Quiz)
  // ============================================
  {
    id: 'bc-mindset',
    trackId: 'master',
    title: 'The Backcountry Guide Mindset',
    description: 'Decision discipline, risk stacking, and leadership in remote terrain',
    icon: 'bulb',
    order: 0,
    estimatedMinutes: 10,
    content: `# The Backcountry Guide Mindset

If frontcountry camping is logistics, backcountry travel is consequences. The terrain is not "scarier," it is just less forgiving. A small error can become a long problem because help is far away, weather changes faster than your mood, and your body is doing more work than you think.

A backcountry guide mindset is not about bravado. It is about being calmly unimpressed by discomfort, and very impressed by compounding risk. The strongest skill you can build is decision discipline. Not "hike harder." Decide earlier.

Start with a few rules that feel boring. Boring is good.

## Decision Gates

Use decision gates. Time, weather, and condition gates are pre-decisions you make while you are warm, fed, and thinking clearly.

- **Time gate:** "If we are not at the saddle by 1:00 PM, we turn around."
- **Weather gate:** "If the ridge gets socked in, we drop down to treeline."
- **Condition gate:** "If anyone is shivering or limping, we stop and treat it now."

## Track Risk Like It Stacks

Wet socks plus wind plus low calories plus fading daylight is not four small things. It is one big thing in a trench coat.

## Normalize Turning Around

Normalize "turning around" as success. You are not here to complete a line on a map. You are here to return to the trailhead with everyone intact.

## Make Communication Explicit

In groups, silence is not agreement. Ask each person, out loud, if they are good, and what they need.

---

## Pace and Morale

Guides also manage pace and morale. That means protecting the slowest hiker's needs, not the fastest hiker's ego. It also means noticing early signs of trouble. If someone gets quiet, clumsy, cold, or "weirdly irritated," treat it as data. Food, water, layers, and a short break fix many problems before they become "events."

---

[Next: Navigation That Does Not Depend on Hope]
`,
    quiz: [
      {
        id: 'bc1-q1',
        question: 'Decision gates exist mainly to:',
        options: [
          'Make the trip feel strict',
          'Remove emotion from critical calls',
          'Help you hike faster',
          'Reduce your packing list',
        ],
        correctAnswerIndex: 1,
        explanation:
          'Gates are pre-decisions that prevent risky "just one more mile" thinking.',
      },
      {
        id: 'bc1-q2',
        question: 'In a group, your pacing plan should protect:',
        options: [
          'The fastest hiker',
          'The slowest hiker',
          'Whoever has the best gear',
          'Whoever complains least',
        ],
        correctAnswerIndex: 1,
        explanation: 'The slowest hiker determines safe pace and timing.',
      },
      {
        id: 'bc1-q3',
        question: 'Compounding risk means:',
        options: [
          'Only cliffs and storms matter',
          'Small issues stack until they become a major problem',
          'Risk is the same as fear',
          'Risk is unavoidable, so ignore it',
        ],
        correctAnswerIndex: 1,
        explanation: 'Minor problems combine, especially with distance from help.',
      },
    ],
    isActive: true,
  },
  {
    id: 'bc-navigation',
    trackId: 'master',
    title: 'Navigation That Does Not Depend on Hope',
    description: 'Map, compass, GPS, and terrain reading for backcountry travel',
    icon: 'compass',
    order: 1,
    estimatedMinutes: 12,
    content: `# Navigation That Does Not Depend on Hope

Backcountry navigation is a mindset first and a toolset second. Tools help, but the real skill is staying oriented, staying humble, and constantly confirming you are where you think you are. People get lost when they stop checking. Usually because things feel fine, until they do not.

## The Layered Navigation System

A reliable navigation system has layers:
- **Map** is the primary truth.
- **Compass** is how you translate the map into direction.
- **GPS** is a fast confirmation tool and a great breadcrumb trail, but it is not a brain replacement.

Think like this: "Map leads, terrain confirms, GPS verifies."

---

## Reading Contour Lines

Start by learning to read contour lines like a story:
- Tight lines mean steep
- Rounded shapes show hills
- V shapes tend to indicate drainages, and the point of the V usually points uphill
- Ridgelines and valleys are not abstract, they are the skeleton of your route

---

## Handrails, Catch Features, and Backstops

Practice a simple guiding framework:

- **Handrails:** Long features you can follow (ridges, rivers, trails, the edge of a basin).
- **Catch features:** A feature you cannot miss that tells you to stop or turn (a major creek crossing, a saddle, a lake outlet).
- **Backstops:** Something big behind your target that prevents you from overshooting (a large river, a road, a cliff band, a trail junction).

This is how you stop "drifting" into the wrong drainage or dropping too low.

---

## Practical Habits

Practical habits that make you hard to lose:
- Orient your map often. Not once. Often.
- Confirm your position every 10 to 15 minutes, or at every major change in terrain.
- When visibility drops, slow down. This is where overconfidence is expensive.
- Use elevation. An altimeter (or GPS elevation) paired with contour lines is a powerful reality check.

---

## GPS as Helpful Intern

If you do use GPS, treat it like a helpful intern. Great at quick checks. Terrible at judgment. Download maps offline, conserve battery, and drop waypoints at critical decision points (trail junctions, water sources, the turn into a hidden basin, camp).

---

[Back: The Backcountry Guide Mindset] [Next: Route Planning Like a Professional]
`,
    quiz: [
      {
        id: 'bc2-q1',
        question: 'The most reliable navigation system is:',
        options: [
          'GPS only',
          'Map and compass primary, GPS as backup and verification',
          'Following other hikers',
          'Looking for cairns only',
        ],
        correctAnswerIndex: 1,
        explanation:
          'Batteries die and signals drop. Map and compass are the foundation.',
      },
      {
        id: 'bc2-q2',
        question: 'A "catch feature" is:',
        options: [
          'A place you plan to fish',
          'A feature you cannot miss that tells you to stop or turn',
          'A shortcut',
          'A scenic viewpoint',
        ],
        correctAnswerIndex: 1,
        explanation: 'Catch features keep you from wandering past your decision point.',
      },
      {
        id: 'bc2-q3',
        question: 'Tight contour lines on a map usually mean:',
        options: ['Flat ground', 'Steep terrain', 'A meadow', 'A campsite'],
        correctAnswerIndex: 1,
        explanation: 'Closely spaced contours indicate steep slope.',
      },
    ],
    isActive: true,
  },
  {
    id: 'bc-route-planning',
    trackId: 'master',
    title: 'Route Planning Like a Professional',
    description: 'Time-based planning, route cards, and group dynamics',
    icon: 'map',
    order: 2,
    estimatedMinutes: 11,
    content: `# Route Planning Like a Professional

A lot of backcountry "surprises" are actually planning failures. Not moral failures. Just math failures.

Miles are a weak predictor of difficulty. Elevation gain, terrain texture, altitude, pack weight, and navigation complexity drive time and fatigue. So your route planning should be time-based, not distance-based.

---

## Building a Solid Route

Start by building a route that has:
- A clear objective (where you are going and why)
- A clear turnaround time
- Known water sources and dry stretches
- Bailout options and alternate camps
- A Plan B that you actually would do

---

## Route Cards

The fastest way to become safer is to start writing route cards. Keep them simple and explicit:
- Start time
- Target landmarks and expected times
- Turnaround time
- Target camp time
- Water sources (reliable vs seasonal)
- Hazards (exposed ridges, river crossings, loose slopes)
- Bailouts (trail exits, roads, lower routes)

Then model your day by time. Add buffer. Real buffer. Not "we will just hustle." Hustling is how ankles break.

---

## Group Planning

Group planning matters too. Many groups plan for the strongest hiker and then pretend the rest will magically rise to the occasion. Instead, plan around the slowest hiker's pace and the most cautious member's safety thresholds. That is how you keep a group from splitting, rushing, or making impulsive calls late in the day.

---

## Permits and Regulations

Permits and regulations are not an annoyance, they are route reality. Many places have assigned zones, canister requirements, fire restrictions, and group size limits. Your route should fit those constraints, not fight them.

---

[Back: Navigation That Does Not Depend on Hope] [Next: Weather, Microclimates, and Mountain Timing]
`,
    quiz: [
      {
        id: 'bc3-q1',
        question: 'The best primary planning metric for backcountry routes is:',
        options: [
          'Miles only',
          'Time, factoring terrain and elevation, plus buffer',
          'How fast you hike on pavement',
          'Social media trip reports',
        ],
        correctAnswerIndex: 1,
        explanation: 'Time planning accounts for real conditions.',
      },
      {
        id: 'bc3-q2',
        question: 'A route card should include:',
        options: [
          'Only a screenshot of your map',
          'Times, water, hazards, and bailouts',
          'Only the campsite name',
          'Only total miles',
        ],
        correctAnswerIndex: 1,
        explanation: 'A route card is a decision tool, not just a map.',
      },
      {
        id: 'bc3-q3',
        question: 'Plan B exists mainly to:',
        options: [
          'Add complexity',
          'Impress friends',
          'Provide a safer option when conditions change',
          'Avoid carrying a map',
        ],
        correctAnswerIndex: 2,
        explanation: 'Conditions and pace change. Plan B keeps you in control.',
      },
    ],
    isActive: true,
  },
  {
    id: 'bc-weather',
    trackId: 'master',
    title: 'Weather, Microclimates, and Mountain Timing',
    description: 'Forecasting, exposure timing, and lightning protocol',
    icon: 'thunderstorm',
    order: 3,
    estimatedMinutes: 10,
    content: `# Weather, Microclimates, and Mountain Timing

Weather is not a background detail in the backcountry. It is the operating system. You do not "deal with it," you plan around it.

---

## The Town Forecast Trap

The first trap is using a town forecast for a mountain route. Elevation changes temperature, precipitation type, and wind. A day that looks like "light rain" in town can be sleet and gusts on the ridge. So you check forecasts for the specific zone, elevation band, or nearest peak area, and you watch trend, not just a single icon.

---

## Time Your Exposure

Then you time your exposure. In many mountain environments, storms build mid-day. That is why advanced travel often starts early and aims to be off ridges, passes, and summits before noon. If you are on exposed terrain during the highest lightning risk window, you have already made the wrong decision. The correction is not "go faster," it is "start earlier, or change the objective."

---

## On-Trail Weather Reading

On-trail weather reading matters too:
- Wind rising quickly is information.
- A sudden temperature drop is information.
- Clouds building vertically and fast are information.

Treat these as early warnings, not inconveniences.

---

## Lightning Protocol

Lightning protocol is not about bravery:
- Get off high points and ridgelines early.
- Avoid isolated trees.
- Spread out your group.
- Wait it out in safer terrain.

---

## Cold and Wet

Cold and wet is a special kind of problem because it attacks your brain. Hypothermia starts with small things. It looks like clumsiness, slurred thinking, or strange irritability. Treat it early. Add layers, block wind, change wet clothes, eat, and warm up.

---

[Back: Route Planning Like a Professional] [Next: Water Strategy, Treatment, and Redundancy]
`,
    quiz: [
      {
        id: 'bc4-q1',
        question: 'Why is a town forecast often insufficient for backcountry planning?',
        options: [
          'Town forecasts are always wrong',
          'Mountains create different wind, temperature, and precipitation patterns',
          'Towns are warmer',
          'It does not matter',
        ],
        correctAnswerIndex: 1,
        explanation: 'Elevation and terrain create microclimates.',
      },
      {
        id: 'bc4-q2',
        question: 'The safest strategy when storms are likely in mountain terrain is:',
        options: [
          'Start late so it is warmer',
          'Plan ridges early and be off exposed terrain before storms build',
          'Ignore the forecast',
          'Go faster on ridges',
        ],
        correctAnswerIndex: 1,
        explanation: 'Timing reduces exposure risk.',
      },
      {
        id: 'bc4-q3',
        question: 'Wet plus wind most directly increases risk of:',
        options: ['Sunburn', 'Hypothermia', 'Muscle cramps only', 'Altitude sickness'],
        correctAnswerIndex: 1,
        explanation: 'Wet clothing and wind strip heat quickly.',
      },
    ],
    isActive: true,
  },
  {
    id: 'bc-water',
    trackId: 'master',
    title: 'Water Strategy, Treatment, and Redundancy',
    description: 'Source planning, treatment methods, and cold-weather water management',
    icon: 'water',
    order: 4,
    estimatedMinutes: 9,
    content: `# Water Strategy, Treatment, and Redundancy

In the backcountry, water is not just "drink when thirsty." It is a system you manage, because dehydration quietly sabotages everything. It makes you slower, clumsier, and worse at decisions. It also increases injury risk.

---

## Plan Before You Leave

A solid water plan starts before you leave:
- Identify reliable sources (big streams, springs, lakes with known outlets).
- Identify seasonal or questionable sources.
- Note dry stretches and required carry capacity.

---

## Treatment with Redundancy

Then choose treatment with redundancy. Filters are great until they clog, crack, or freeze. Chemicals are light but slow. UV is fast but battery-dependent and less effective in silty water. Many experienced hikers carry a primary (filter) and a backup (chemicals), plus enough capacity to carry through a dry stretch if a source is gone.

---

## Cold Weather Changes the Game

Cold weather changes the game. Squeeze filters can be damaged if they freeze while wet. They may look normal and still be compromised. In freezing conditions, keep the filter warm, like in a pocket during the day and in your sleeping bag at night.

---

## Do Not Neglect Hygiene

Do not neglect hygiene. Many backcountry stomach problems come from dirty hands, not "bad water." Sanitize before you eat. Wash when you can. Be strict about it.

---

[Back: Weather, Microclimates, and Mountain Timing] [Next: Fuel, Calories, and Stove Systems]
`,
    quiz: [
      {
        id: 'bc5-q1',
        question: 'Why carry a backup water treatment method?',
        options: [
          'It looks more advanced',
          'Filters can fail or freeze and still look fine',
          'Chemicals taste good',
          'UV is always better',
        ],
        correctAnswerIndex: 1,
        explanation: 'Redundancy prevents one failure from becoming a major problem.',
      },
      {
        id: 'bc5-q2',
        question: 'A key cold-weather risk for squeeze filters is:',
        options: [
          'They melt',
          'They can crack internally if frozen wet',
          'They attract bears',
          'They stop working in shade',
        ],
        correctAnswerIndex: 1,
        explanation: 'Freeze damage can make a filter unsafe.',
      },
      {
        id: 'bc5-q3',
        question: 'Dehydration in the backcountry often causes:',
        options: [
          'Better balance',
          'Worse decisions and higher injury risk',
          'Faster speed',
          'No noticeable effects',
        ],
        correctAnswerIndex: 1,
        explanation: 'Dehydration reduces cognitive and physical performance.',
      },
    ],
    isActive: true,
  },
  {
    id: 'bc-fuel',
    trackId: 'master',
    title: 'Fuel, Calories, and Stove Systems',
    description: 'Nutrition timing, bonk prevention, and stove selection',
    icon: 'flame',
    order: 5,
    estimatedMinutes: 9,
    content: `# Fuel, Calories, and Stove Systems

Your body is an engine, and your brain is running the navigation and safety software. When calories drop, decision-making degrades. That is why experienced backcountry travelers eat before they are hungry and drink before they are thirsty.

---

## A Simple Strategy

A simple but effective strategy:
- Eat a real breakfast.
- Snack steadily through the day.
- Do not wait for the "bonk."

Bonk signs include sudden mood dips, clumsiness, slow thinking, and that weird feeling of being both tired and annoyed at everything.

---

## Pack Food You Will Actually Eat

Pack food that you will actually eat. The best calories are the ones you will consume. Mix fast carbs for quick energy with fats for longer burn. In cold conditions, fat becomes especially valuable.

---

## Stove Choice

Stove choice should match conditions:
- **Canister stoves** are simple and fast, but can struggle in cold.
- **Liquid fuel stoves** are reliable in cold, but more complex and maintenance-heavy.
- **No-cook days** can work in heat, but can be tough on morale and recovery.

---

## Food Storage

Food storage matters for safety and ethics. In bear country, follow local requirements. In many areas, bear canisters are mandatory. Store and cook away from your sleep area. Never assume a tent is a "secure" food container. It is not.

---

[Back: Water Strategy, Treatment, and Redundancy] [Next: Shelter, Sleep Systems, and Cold Management]
`,
    quiz: [
      {
        id: 'bc6-q1',
        question: 'Why do mistakes increase late in the day?',
        options: [
          'Trails are worse at night',
          'Low calories and fatigue reduce judgment and coordination',
          'Maps stop working',
          'Water becomes unsafe',
        ],
        correctAnswerIndex: 1,
        explanation: 'Fatigue and low fuel reduce decision quality.',
      },
      {
        id: 'bc6-q2',
        question: 'A good rule to prevent bonking is:',
        options: [
          'Eat only when hungry',
          'Eat on a schedule, starting early',
          'Skip breakfast to save time',
          'Save snacks for emergencies only',
        ],
        correctAnswerIndex: 1,
        explanation: 'Appetite lags behind needs. A schedule helps.',
      },
      {
        id: 'bc6-q3',
        question: 'Stove choice should be based on:',
        options: [
          'Brand popularity',
          'Expected conditions and reliability needs',
          'Weight only',
          'Loudness',
        ],
        correctAnswerIndex: 1,
        explanation: 'Reliability in expected conditions matters most.',
      },
    ],
    isActive: true,
  },
  {
    id: 'bc-shelter',
    trackId: 'master',
    title: 'Shelter, Sleep Systems, and Cold Management',
    description: 'Site selection, insulation stacking, and condensation management',
    icon: 'home',
    order: 6,
    estimatedMinutes: 10,
    content: `# Shelter, Sleep Systems, and Cold Management

A shelter is not just a tent. Your shelter system includes site selection, wind management, your sleep insulation, and how you handle moisture.

---

## Site Selection

Site selection is the highest leverage skill here:
- Avoid widowmakers (dead branches overhead).
- Avoid cold sinks (low areas where cold air pools).
- Avoid exposed ridges in high wind.
- Look for durable surfaces and natural wind breaks.

A perfect tent with a bad site becomes an unpleasant science experiment.

---

## Sleep System Stack

Your sleep system is a full stack:
- **Ground insulation** (pad R-value)
- **Bag or quilt rating** (realistic, not optimistic)
- **Dry sleep layers** reserved for camp
- **Nutrition and hydration** before bed

Cold people sleep badly, and tired people make worse decisions tomorrow.

---

## Condensation Management

Condensation is not a failure, it is physics. Warm moist air meets cold surfaces and becomes water. Manage it by ventilating when possible, avoiding pitching in humid low spots, and keeping wet gear separated.

---

## Practice at Home

Advanced practice is to run drills at home:
- Set up shelter quickly with gloves on.
- Practice guylines and tensioning in wind.
- Pack your sleep system the same way every time.

---

[Back: Fuel, Calories, and Stove Systems] [Next: First Aid, Field Medicine, and Emergency Protocols]
`,
    quiz: [
      {
        id: 'bc7-q1',
        question: 'Site selection is important because:',
        options: [
          'It makes your tent look nicer',
          'It is part of the shelter system and affects wind, safety, and warmth',
          'It helps you meet other campers',
          'It reduces the need for a sleeping pad',
        ],
        correctAnswerIndex: 1,
        explanation: 'Bad sites increase risk and discomfort fast.',
      },
      {
        id: 'bc7-q2',
        question: '"Cold comes from the ground first" means you should prioritize:',
        options: [
          'A thicker pillow',
          'A warmer pad with better insulation',
          'A bigger tent',
          'Extra cooking gear',
        ],
        correctAnswerIndex: 1,
        explanation: 'Ground insulation is critical for warmth.',
      },
      {
        id: 'bc7-q3',
        question: 'Condensation is best managed by:',
        options: [
          'Sealing the tent completely',
          'Venting when possible and choosing less humid sites',
          'Putting wet gear inside the sleeping bag',
          'Ignoring it always',
        ],
        correctAnswerIndex: 1,
        explanation: 'Airflow and site choice reduce condensation buildup.',
      },
    ],
    isActive: true,
  },
  {
    id: 'bc-first-aid',
    trackId: 'master',
    title: 'First Aid, Field Medicine, and Emergency Protocols',
    description: 'Assessment loops, common injuries, and evacuation decisions',
    icon: 'medkit',
    order: 7,
    estimatedMinutes: 11,
    content: `# First Aid, Field Medicine, and Emergency Protocols

In the backcountry, first aid is not just supplies. It is assessment, decision-making, and the willingness to act early. Your best first aid skill is catching problems before they become non-walkouts.

---

## The Big Three

Start with the big three that cause many evacuations:
- Sprains and fractures
- Hypothermia and heat illness
- GI illness and dehydration

---

## Simple Assessment Loop

The advanced approach is to use a simple assessment loop:
- What happened?
- What changed physically (pain, swelling, mobility, temperature, mental status)?
- What can the person do now (walk, eat, drink, think clearly)?
- What is the trend (improving, stable, worsening)?

---

## Ankle Injuries

Ankle injuries are common. A mild sprain early in the day can become a serious evacuation if you ignore it. Stabilize, reduce swelling, adjust the plan, and be honest about mobility. If the person cannot walk with a stable gait, you need to shift to evacuation thinking.

---

## Exposure Problems

Exposure problems (cold or heat) are emergencies because they change cognition. If someone is confused, unusually clumsy, or out of character, treat it as urgent. Warm them, cool them, hydrate, and reduce exposure.

---

## Emergency Communication

Emergency communication is an advanced essential. If you carry a satellite messenger or PLB, you need a plan for how and when to use it. Know your location as precisely as possible. Keep messages clear. And remember: calling for rescue is not failure. It is a decision to stop the situation from worsening.

---

[Back: Shelter, Sleep Systems, and Cold Management] [Next: Terrain Skills, Crossings, and Hazard Management]
`,
    quiz: [
      {
        id: 'bc8-q1',
        question: 'The best "first aid" habit is:',
        options: [
          'Carry more bandages',
          'Treat issues early before they become non-walkouts',
          'Ignore pain to maintain pace',
          'Only treat injuries at camp',
        ],
        correctAnswerIndex: 1,
        explanation: 'Early treatment prevents escalation.',
      },
      {
        id: 'bc8-q2',
        question: 'A major danger of hypothermia and heat illness is:',
        options: [
          'They only affect comfort',
          'They can impair decision-making and coordination',
          'They make you walk faster',
          'They are always obvious immediately',
        ],
        correctAnswerIndex: 1,
        explanation: 'Cognition changes increase risk of compounding mistakes.',
      },
      {
        id: 'bc8-q3',
        question:
          'If someone cannot walk with a stable gait after an injury, you should:',
        options: [
          'Push on to camp',
          'Consider evacuation planning and reduce risk immediately',
          'Split the group and continue',
          'Ignore it and reassess tomorrow',
        ],
        correctAnswerIndex: 1,
        explanation:
          'Instability increases risk of a worsening injury and a rescue scenario.',
      },
    ],
    isActive: true,
  },
  {
    id: 'bc-terrain',
    trackId: 'master',
    title: 'Terrain Skills, Crossings, and Hazard Management',
    description: 'River crossings, steep terrain, and travel discipline',
    icon: 'analytics',
    order: 8,
    estimatedMinutes: 10,
    content: `# Terrain Skills, Crossings, and Hazard Management

Advanced backcountry travel is often less about fitness and more about terrain judgment. The big hazards are the ones that do not care how motivated you are: steep loose slopes, rockfall, river crossings, and route-finding errors that push you into harder terrain than you planned.

---

## River Crossings

River crossings deserve special respect because they can go from "fine" to "fatal" quickly. A conservative rule works well:

**If you are questioning the crossing, do not cross there.** Look for a safer option, wait for levels to drop, or turn around.

Crossing decisions should account for depth, speed, footing, temperature, and consequences downstream.

---

## Steep Terrain

On steep terrain, manage exposure:
- Slow down.
- Keep spacing to reduce rockfall risk.
- Choose stable footing and avoid loose gullies.
- Know when to detour instead of committing to bad ground.

---

## Travel Discipline

Travel discipline matters:
- Do not shortcut switchbacks on fragile slopes.
- Do not chase "faster lines" that lead into cliffs, brush traps, or dangerous creek beds.
- Use your map to anticipate terrain rather than reacting to it late.

---

[Back: First Aid, Field Medicine, and Emergency Protocols] [Next: Leave No Trace, Ethics, and Being a Good Backcountry Citizen]
`,
    quiz: [
      {
        id: 'bc9-q1',
        question: 'The safest river crossing decision rule is:',
        options: [
          'Cross wherever it is shortest',
          'If it feels questionable, find a safer spot, wait, or turn around',
          'Always cross at the widest point',
          'Cross quickly without stopping',
        ],
        correctAnswerIndex: 1,
        explanation: 'Conservative decisions prevent high-consequence mistakes.',
      },
      {
        id: 'bc9-q2',
        question: 'On steep loose terrain, you should:',
        options: [
          'Move fast to get it over with',
          'Spread out and choose stable footing to reduce rockfall risk',
          'Walk close together',
          'Remove your pack to save weight while moving',
        ],
        correctAnswerIndex: 1,
        explanation: 'Spacing and careful footing reduce hazard.',
      },
      {
        id: 'bc9-q3',
        question: 'A common route-finding mistake is:',
        options: [
          'Checking the map often',
          'Taking "shortcuts" that push you into worse terrain',
          'Using handrails and catch features',
          'Confirming elevation',
        ],
        correctAnswerIndex: 1,
        explanation: 'Shortcuts often increase risk and time.',
      },
    ],
    isActive: true,
  },
  {
    id: 'bc-ethics',
    trackId: 'master',
    title: 'Leave No Trace, Ethics, and Being a Good Backcountry Citizen',
    description: 'Advanced LNT, waste management, and wilderness humility',
    icon: 'leaf',
    order: 9,
    estimatedMinutes: 9,
    content: `# Leave No Trace, Ethics, and Being a Good Backcountry Citizen

Backcountry skill is incomplete without ethics. The goal is not just "I had a great trip." The goal is "This place stays wild and functional for the next person, and for the ecosystem that lives there."

---

## LNT Goes Deeper

Leave No Trace becomes more important as you go deeper because impacts last longer and recovery is slower:
- Travel on durable surfaces.
- Camp away from water.
- Keep groups small when required.
- Pack out all trash, including micro-trash.
- Do not build new fire rings.
- Follow fire restrictions.
- In many environments, fires are not appropriate at all.

---

## Human Waste Management

Human waste management matters. Use established toilets if available. Otherwise follow local rules, usually involving proper catholes, distance from water and trails, and packing out toilet paper where required. In some places, packing out all waste is mandatory. Advanced travel means you know and follow those rules without complaining.

---

## Wildlife Ethics

Wildlife ethics matter too:
- Store food correctly.
- Do not feed animals.
- Keep distance.
- Remember that "they ran away" does not mean "they were fine."

---

## Humility

The final advanced skill is humility. If an area is overused, choose a different route. If conditions are damaging, change your plan. If you made an impact mistake, learn, correct, and do better.

---

[Back: Terrain Skills, Crossings, and Hazard Management] [Next: Take the Final Quiz]
`,
    quiz: [
      {
        id: 'bc10-q1',
        question: 'In backcountry settings, the best campsite practice is usually:',
        options: [
          'Camp right next to water',
          'Camp on durable surfaces and away from water and trails',
          'Camp wherever looks most scenic',
          'Camp in fragile meadows because they are flat',
        ],
        correctAnswerIndex: 1,
        explanation: 'This reduces impact and protects sensitive areas.',
      },
      {
        id: 'bc10-q2',
        question: '"Micro-trash" refers to:',
        options: [
          'Only food scraps',
          'Tiny trash like tabs, twist ties, and foil bits',
          'Large trash only',
          'Items that biodegrade quickly',
        ],
        correctAnswerIndex: 1,
        explanation: 'Tiny trash accumulates and harms wildlife.',
      },
      {
        id: 'bc10-q3',
        question: 'Wildlife ethics includes:',
        options: [
          'Feeding animals small snacks',
          'Getting close for photos',
          'Proper food storage and giving animals space',
          'Leaving food scraps in the woods',
        ],
        correctAnswerIndex: 2,
        explanation: 'Proper storage protects you and the animals.',
      },
    ],
    isActive: true,
  },
  {
    id: 'bc-final-quiz',
    trackId: 'master',
    title: 'Backcountry Guide Final Quiz',
    description: 'Test your knowledge and earn the Backcountry Guide badge',
    icon: 'trophy',
    order: 10,
    estimatedMinutes: 8,
    content: `# Backcountry Guide Final Quiz

Congratulations on completing the Backcountry Guide track!

You have learned:
- The backcountry guide mindset: decision discipline, risk stacking, and group leadership
- Navigation that does not depend on hope: map, compass, GPS, and terrain reading
- Route planning like a professional: time-based planning, route cards, and bailouts
- Weather, microclimates, and mountain timing: forecasting and lightning safety
- Water strategy, treatment, and redundancy: source planning and cold-weather risks
- Fuel, calories, and stove systems: nutrition timing and bonk prevention
- Shelter, sleep systems, and cold management: site selection and insulation
- First aid, field medicine, and emergency protocols: assessment and evacuation
- Terrain skills, crossings, and hazard management: river crossings and steep terrain
- Leave No Trace, ethics, and being a good backcountry citizen

---

## Ready to Earn Your Badge?

Answer all 10 questions correctly to earn the **Backcountry Guide** merit badge.

The badge will appear on your My Campsite screen once you pass.

**Tip:** If you do not pass the first time, you can review the modules and try again.

Good luck!

---

Great job on continuing your learning! You have earned the Backcountry Guide badge. You will see it on your Campsite.
`,
    quiz: [
      {
        id: 'bcq-1',
        question:
          'What is the main purpose of decision gates (time, weather, condition)?',
        options: [
          'To hike faster',
          'To reduce emotional decision-making under stress',
          'To avoid carrying a map',
          'To impress other hikers',
        ],
        correctAnswerIndex: 1,
        explanation: 'Gates are pre-decisions made when thinking is clear.',
      },
      {
        id: 'bcq-2',
        question: 'The most reliable primary navigation system is:',
        options: [
          'GPS only',
          'Map and compass primary, GPS as verification/backup',
          'Following social trails',
          'Looking for cairns only',
        ],
        correctAnswerIndex: 1,
        explanation: 'Map and compass work without batteries or signal.',
      },
      {
        id: 'bcq-3',
        question: 'A route card should include:',
        options: [
          'Only total miles',
          'Only campsite name',
          'Times, water, hazards, bailouts, and turnaround time',
          'Only a map screenshot',
        ],
        correctAnswerIndex: 2,
        explanation: 'Route cards support decisions in real conditions.',
      },
      {
        id: 'bcq-4',
        question: 'Why is a town forecast often insufficient in mountains?',
        options: [
          'Towns are always warmer',
          'Mountains create microclimates and different wind/precipitation patterns',
          'Phones do not work in towns',
          'It never rains in town',
        ],
        correctAnswerIndex: 1,
        explanation: 'Elevation and terrain change conditions quickly.',
      },
      {
        id: 'bcq-5',
        question: 'A key cold-weather risk for squeeze filters is:',
        options: [
          'They become heavier',
          'They can crack internally if frozen wet',
          'They stop working in sunlight',
          'They attract bears',
        ],
        correctAnswerIndex: 1,
        explanation: 'Freeze damage can make them unsafe without visible signs.',
      },
      {
        id: 'bcq-6',
        question: 'Backcountry nutrition is critical because:',
        options: [
          'You need to carry less water',
          'Low calories reduce judgment and coordination',
          'It makes maps easier to read',
          'Bears avoid you',
        ],
        correctAnswerIndex: 1,
        explanation: 'Fatigue and low fuel increase mistakes.',
      },
      {
        id: 'bcq-7',
        question: '"Cold comes from the ground first" means you should prioritize:',
        options: [
          'A warmer sleeping pad',
          'A bigger tent',
          'A larger backpack',
          'A heavier stove',
        ],
        correctAnswerIndex: 0,
        explanation: 'Ground insulation prevents heat loss.',
      },
      {
        id: 'bcq-8',
        question:
          'If someone shows early hypothermia signs (shivering, clumsy, irritable), best response is:',
        options: [
          'Push harder to reach camp',
          'Stop, add insulation, block wind/wet, give calories and warm fluids if safe',
          'Make them drink cold water',
          'Tell them to tough it out',
        ],
        correctAnswerIndex: 1,
        explanation: 'Exposure management and fuel prevent worsening.',
      },
      {
        id: 'bcq-9',
        question: 'The safest river crossing decision rule is:',
        options: [
          'Cross wherever it is shortest',
          'If it feels questionable, find a safer crossing, wait, or turn around',
          'Always cross at the widest point',
          'Cross quickly without thinking',
        ],
        correctAnswerIndex: 1,
        explanation: 'Conservative decisions avoid high-consequence errors.',
      },
      {
        id: 'bcq-10',
        question: 'In most backcountry areas, best campsite impact practice is:',
        options: [
          'Camp right next to water',
          'Camp in fragile meadows for flat ground',
          'Camp on durable surfaces, away from water and trails',
          'Build a new fire ring each time',
        ],
        correctAnswerIndex: 2,
        explanation: 'This protects water sources and fragile ecosystems.',
      },
    ],
    isActive: true,
  },
];

// ============================================
// SEED FUNCTION
// ============================================

export async function seedLearningContent(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log('[SeedLearning] Starting seed...');

    const batch = writeBatch(db);
    const now = Timestamp.now();

    // Seed tracks
    for (const track of TRACKS) {
      const trackRef = doc(db, 'learningTracks', track.id);
      batch.set(trackRef, {
        ...track,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Seed modules
    for (const module of MODULES) {
      const moduleRef = doc(db, 'learningModules', module.id);
      batch.set(moduleRef, {
        ...module,
        createdAt: now,
        updatedAt: now,
      });
    }

    await batch.commit();

    console.log('[SeedLearning] Successfully seeded learning content!');
    console.log(`  - ${TRACKS.length} tracks`);
    console.log(`  - ${MODULES.length} modules`);

    return {
      success: true,
      message: `Seeded ${TRACKS.length} tracks and ${MODULES.length} modules`,
    };
  } catch (error) {
    console.error('[SeedLearning] Error seeding content:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
