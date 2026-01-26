/**
 * Seed Learning Content (Client-Side Version)
 * 
 * This can be called from the app to populate Firestore with initial learning content.
 * Call seedLearningContent() from an admin action or during initial setup.
 */

import {
  doc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { BadgeId } from "../types/learning";

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
      "sleep-system",
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
    ],
    isActive: true,
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
    id: "lnt-principles",
    trackId: "leave-no-trace",
    title: "The 7 Principles of Leave No Trace",
    description: "Learn how to minimize your impact on the environment",
    icon: "leaf",
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
        id: "lnt-q1",
        question: "How far from water sources should you dispose of human waste?",
        options: ["50 feet", "100 feet", "200 feet", "500 feet"],
        correctAnswerIndex: 2,
        explanation: "You should dispose of human waste at least 200 feet from water, camp, and trails to prevent contamination.",
      },
      {
        id: "lnt-q2",
        question: "What is the recommended depth for a cathole?",
        options: ["2-3 inches", "4-5 inches", "6-8 inches", "10-12 inches"],
        correctAnswerIndex: 2,
        explanation: "Catholes should be dug 6 to 8 inches deep to ensure proper decomposition.",
      },
      {
        id: "lnt-q3",
        question: "What should you do with wildlife you encounter?",
        options: [
          "Approach slowly for photos",
          "Feed them small amounts of food",
          "Observe from a distance and never feed",
          "Chase them away from camp",
        ],
        correctAnswerIndex: 2,
        explanation: "Always observe wildlife from a distance. Feeding wildlife damages their health and alters natural behaviors.",
      },
      {
        id: "lnt-q4",
        question: "What are considered 'durable surfaces' for camping?",
        options: [
          "Any flat ground",
          "Grassy meadows",
          "Established campsites, rock, gravel, or snow",
          "Under large trees",
        ],
        correctAnswerIndex: 2,
        explanation: "Durable surfaces include established trails and campsites, rock, gravel, dry grasses, or snow.",
      },
      {
        id: "lnt-q5",
        question: "Which principle says 'Pack it in, pack it out'?",
        options: [
          "Plan Ahead and Prepare",
          "Travel on Durable Surfaces",
          "Dispose of Waste Properly",
          "Leave What You Find",
        ],
        correctAnswerIndex: 2,
        explanation: "The 'Dispose of Waste Properly' principle includes packing out all trash and leftover food.",
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
    title: "Planning Your First Camping Trip",
    description: "Everything you need to know to plan a successful first camping adventure",
    icon: "map",
    order: 0,
    estimatedMinutes: 10,
    content: `# Planning Your First Camping Trip

Congratulations on deciding to go camping! Whether you're looking for a peaceful retreat in nature or an adventure-filled weekend, proper planning will make your first trip memorable for all the right reasons.

## Choosing Your Campsite

For your first trip, we recommend staying at a developed campground with amenities. This gives you a safety net while you learn the ropes.

**Look for campgrounds with:**
- Restrooms and showers nearby
- Potable water access
- Designated fire rings
- Camp hosts for questions
- Good cell service (for emergencies)

### State Parks vs National Parks vs Private

**State Parks** are often the sweet spot for beginners—they're usually well-maintained, have good facilities, and are less crowded than national parks.

**National Parks** can be incredible but often require reservations months in advance and may be more remote.

**Private campgrounds** (like KOA) often have the most amenities but feel less "wild."

## When to Go

**Best seasons for beginners:**
- Late spring (April-May): Mild weather, fewer crowds
- Early fall (September-October): Comfortable temps, beautiful colors
- Summer: Popular but can be hot and crowded

**Avoid your first trip during:**
- Holiday weekends (very crowded)
- Extreme weather seasons
- Peak bug season (varies by region)

## How Long to Stay

For your first trip, **one or two nights** is perfect. This gives you enough time to:
- Set up camp at a relaxed pace
- Cook a few meals
- Explore the area
- Sleep under the stars
- Pack up without rushing

## Making Reservations

Most popular campgrounds require reservations, especially for weekends. Here's how to book:

1. **Identify your preferred dates** (have backup dates ready)
2. **Visit the campground website** or use Recreation.gov for federal sites
3. **Check the reservation window** (some open 6 months ahead)
4. **Book early** for popular spots
5. **Read the fine print** about cancellation policies

## Creating a Packing Checklist

The key to a great trip is not forgetting essentials. Create a checklist organized by category:

- **Shelter**: Tent, footprint, sleeping bags, pads
- **Kitchen**: Stove, fuel, cookware, utensils, cooler, food
- **Clothing**: Layers, rain gear, extra socks
- **Safety**: First aid kit, flashlight, fire starter
- **Comfort**: Camp chairs, games, books

## Day of Departure Tips

- Leave early to allow setup time before dark
- Check weather forecasts one more time
- Fill up on gas and grab ice
- Confirm your reservation details
- Tell someone your plans

---

You're now ready to plan your first camping trip! Remember, camping is a skill that improves with practice. Your first trip might have a few bumps, but that's part of the adventure.
`,
    quiz: [
      {
        id: "ft-q1",
        question: "What type of campground is best for beginners?",
        options: [
          "Backcountry sites",
          "Developed campgrounds with amenities",
          "Dispersed camping",
          "Wilderness areas",
        ],
        correctAnswerIndex: 1,
        explanation: "Developed campgrounds with restrooms, water, and camp hosts provide a safety net for learning.",
      },
      {
        id: "ft-q2",
        question: "How long should your first camping trip be?",
        options: ["One night only", "One or two nights", "A full week", "Just a day trip"],
        correctAnswerIndex: 1,
        explanation: "One or two nights is perfect for learning the basics without overcommitting.",
      },
      {
        id: "ft-q3",
        question: "When should you avoid camping as a beginner?",
        options: [
          "Weekdays",
          "Holiday weekends",
          "Early fall",
          "Late spring",
        ],
        correctAnswerIndex: 1,
        explanation: "Holiday weekends are very crowded, making them less ideal for learning.",
      },
    ],
    isActive: true,
  },
  {
    id: "choosing-tent",
    trackId: "novice",
    title: "Choosing the Right Tent",
    description: "How to select the perfect tent for your camping style",
    icon: "home",
    order: 1,
    estimatedMinutes: 8,
    content: `# Choosing the Right Tent

Your tent is your home away from home. Choosing the right one makes the difference between a comfortable night's sleep and a miserable experience.

## Tent Capacity

Tents are rated by how many people they can fit—but this is usually optimistic. A good rule of thumb:

- **Solo camper**: Get a 2-person tent
- **Couple**: Get a 3-person tent  
- **Family of 4**: Get a 6-person tent

This extra space gives you room for gear and comfort.

## Seasons Ratings

### 3-Season Tents
Best for spring, summer, and fall. They're:
- Lightweight
- Well-ventilated
- Handle moderate rain
- NOT designed for snow

Most campers only need a 3-season tent.

### 4-Season Tents
Designed for winter and mountaineering:
- Heavier construction
- Less ventilation (warmer)
- Handle snow loads
- More expensive

## Key Features to Look For

### Rainfly
A full-coverage rainfly that extends to the ground provides the best weather protection. Partial rainflies work in fair weather but won't protect in storms.

### Vestibules
Covered areas outside the tent door for storing muddy boots and gear. Very useful for keeping the interior clean.

### Ventilation
Look for mesh panels and vents to reduce condensation inside the tent. Good airflow = drier sleep.

### Ease of Setup
Color-coded poles, hub designs, and fewer pieces make setup faster—especially important in bad weather or fading light.

## Tent Types

### Dome Tents
- Most common design
- Good balance of space and stability
- Easy to set up
- Great for beginners

### Cabin Tents
- Tall vertical walls
- Maximum interior space
- Heavy and bulky
- Best for car camping

### Tunnel Tents
- Excellent in wind
- Lots of usable space
- Require staking for stability
- Popular for bike touring

## What to Spend

You generally get what you pay for with tents:

- **Budget ($50-100)**: Basic protection, shorter lifespan
- **Mid-range ($100-250)**: Good quality, will last years
- **Premium ($250+)**: Ultralight, expedition-quality, long lasting

For beginners, a mid-range tent from a reputable brand is the best value.

## Top Tips

1. **Practice at home** before your trip
2. **Use a footprint** (ground cloth) to protect the floor
3. **Never store wet**—always dry before packing away
4. **Seam seal** if not factory-sealed
`,
    quiz: [
      {
        id: "ct-q1",
        question: "If you're a couple, what tent capacity should you get?",
        options: ["2-person", "3-person", "4-person", "1-person each"],
        correctAnswerIndex: 1,
        explanation: "Adding one extra person to the rating gives you room for gear and comfort.",
      },
      {
        id: "ct-q2",
        question: "What type of tent is best for most campers?",
        options: ["2-season tent", "3-season tent", "4-season tent", "Bivy sack"],
        correctAnswerIndex: 1,
        explanation: "3-season tents work for spring, summer, and fall—covering most camping needs.",
      },
      {
        id: "ct-q3",
        question: "What is a vestibule?",
        options: [
          "The tent floor",
          "A covered area outside the door for gear",
          "The tent ceiling",
          "The rainfly attachment point",
        ],
        correctAnswerIndex: 1,
        explanation: "Vestibules are covered areas outside tent doors for storing muddy boots and gear.",
      },
    ],
    isActive: true,
  },
  {
    id: "sleep-system",
    trackId: "novice",
    title: "Your Sleep System",
    description: "How to stay warm and comfortable through the night",
    icon: "bed",
    order: 2,
    estimatedMinutes: 9,
    content: `# Your Sleep System

A good night's sleep is crucial for enjoying your camping trip. Your "sleep system" consists of three components working together: sleeping bag, sleeping pad, and pillow.

## Sleeping Bags

### Temperature Ratings
Bags are rated for the lowest temperature at which they'll keep you comfortable. But there's a catch:
- Ratings assume you're wearing base layers
- Cold sleepers should add 10-15°F to the rating
- Comfort rating is more useful than extreme rating

### Fill Types

**Down Fill**
- Best warmth-to-weight ratio
- Compresses small
- Loses insulation when wet
- More expensive

**Synthetic Fill**
- Insulates when damp
- More affordable
- Heavier and bulkier
- Easier to care for

### Shape

**Mummy Bags**: Snug fit, efficient warmth, lightweight
**Rectangular Bags**: Roomy, heavier, good for warm weather
**Quilt Style**: Backless design, ultralight, for experienced users

## Sleeping Pads

Your sleeping pad does two critical jobs: cushioning AND insulation from the cold ground.

### R-Value
This measures insulation. Higher = warmer.
- R-2 or less: Summer only
- R-3 to R-4: 3-season camping
- R-5+: Cold weather and winter

### Types of Pads

**Air Pads**
- Most comfortable
- Pack small
- Can puncture
- Need inflation

**Self-Inflating Pads**
- Combine foam and air
- Partially self-inflate
- Moderate pack size
- Very durable

**Closed-Cell Foam**
- Indestructible
- Inexpensive
- Bulky
- Firm sleeping surface

## Pillows

Don't underestimate a good camping pillow! Options:
- Inflatable pillows (pack small)
- Compressible pillows (like a real pillow)
- Stuff sack with clothes (free!)

## Putting It All Together

For optimal warmth:
1. Place pad on level ground (no rocks or roots)
2. Add a foam pad underneath if cold
3. Fluff your sleeping bag before getting in
4. Wear clean, dry base layers
5. Keep tomorrow's clothes in the bag with you (warm clothes!)
6. Use a hot water bottle for extra warmth

## Common Mistakes

- Sleeping in the clothes you wore all day (moisture = cold)
- Breathing inside your sleeping bag (creates moisture)
- Not testing your setup before a trip
- Ignoring ground insulation
`,
    quiz: [
      {
        id: "ss-q1",
        question: "What does R-value measure in a sleeping pad?",
        options: ["Comfort level", "Insulation from ground", "Weight", "Thickness"],
        correctAnswerIndex: 1,
        explanation: "R-value measures how well the pad insulates you from the cold ground.",
      },
      {
        id: "ss-q2",
        question: "Why should you avoid sleeping in clothes you wore all day?",
        options: [
          "They're dirty",
          "They contain moisture which makes you cold",
          "They're uncomfortable",
          "They take up too much space",
        ],
        correctAnswerIndex: 1,
        explanation: "Day clothes contain sweat and moisture which reduces insulation and makes you colder.",
      },
      {
        id: "ss-q3",
        question: "Which sleeping bag fill retains insulation when wet?",
        options: ["Down", "Synthetic", "Wool", "Cotton"],
        correctAnswerIndex: 1,
        explanation: "Synthetic fill continues to insulate even when damp, unlike down which loses warmth when wet.",
      },
    ],
    isActive: true,
  },

  // ============================================
  // TRAIL LEADER TRACK (Sample Modules)
  // ============================================
  {
    id: "multi-day-planning",
    trackId: "intermediate",
    title: "Multi-Day Trip Planning",
    description: "Plan extended backcountry adventures with confidence",
    icon: "calendar",
    order: 0,
    estimatedMinutes: 12,
    content: `# Multi-Day Trip Planning

Taking your camping to the next level means planning trips that span multiple days. This requires more thorough preparation but rewards you with deeper wilderness experiences.

## Route Planning

### Daily Mileage
Be realistic about distance:
- **Beginners**: 5-8 miles per day
- **Experienced hikers**: 8-12 miles per day
- **Strong backpackers**: 12-15+ miles per day

Factor in:
- Elevation gain (500ft = roughly 1 extra mile of effort)
- Trail conditions
- Pack weight
- Weather

### Creating an Itinerary

1. **Map your route** with start and end points
2. **Identify water sources** along the way
3. **Plan camping locations** with bailout options
4. **Note resupply points** for trips over 4-5 days
5. **Calculate total mileage** and break into daily segments
6. **Add rest days** for trips over a week

## Food Planning

### Calculating Calories
For backpacking, plan for:
- 2,500-4,500 calories per day depending on exertion
- 1.5-2 lbs of food per person per day

### Meal Strategy

**Breakfast**: Quick and energizing
- Instant oatmeal, granola, coffee

**Lunch**: No-cook grazing
- Trail mix, jerky, cheese, crackers

**Dinner**: Hot and satisfying
- Freeze-dried meals, pasta, rice dishes

**Snacks**: Constant fuel
- Energy bars, dried fruit, nuts

### Food Safety
- Use bear canisters in required areas
- Hang food in stuff sacks with rope
- Never store food in your tent

## Permits and Regulations

Many backcountry areas require permits. Research:
- Is a permit required?
- How far in advance can you book?
- Any quotas or lottery systems?
- Fire restrictions?
- Group size limits?

## Emergency Planning

Create a trip plan that includes:
- Detailed itinerary with dates and locations
- Emergency contact information
- Expected return date
- Vehicle description and location
- Medical conditions of group members

Leave copies with:
- A trusted friend or family member
- The ranger station (if available)

## Group Considerations

Leading a group adds complexity:
- Assess everyone's fitness level honestly
- Plan for the slowest member's pace
- Divide group gear fairly
- Establish communication and decision-making protocols
- Carry a satellite communicator for emergencies
`,
    quiz: [
      {
        id: "mdp-q1",
        question: "How many miles per day should beginners plan for?",
        options: ["2-4 miles", "5-8 miles", "10-12 miles", "15+ miles"],
        correctAnswerIndex: 1,
        explanation: "Beginners should plan for 5-8 miles per day to allow for rest and enjoyment.",
      },
      {
        id: "mdp-q2",
        question: "How much food weight should you plan per person per day?",
        options: ["0.5-1 lb", "1.5-2 lbs", "3-4 lbs", "5+ lbs"],
        correctAnswerIndex: 1,
        explanation: "Plan for 1.5-2 lbs of food per person per day for adequate nutrition.",
      },
      {
        id: "mdp-q3",
        question: "Who should receive a copy of your trip plan?",
        options: [
          "Only the group leader",
          "A trusted friend or family member",
          "Posted on social media",
          "No one—keep it private",
        ],
        correctAnswerIndex: 1,
        explanation: "Always leave your trip plan with a trusted contact who can alert authorities if needed.",
      },
    ],
    isActive: true,
  },
  {
    id: "terrain-weather",
    trackId: "intermediate",
    title: "Reading Terrain and Weather",
    description: "Understand the landscape and sky to stay safe",
    icon: "cloudy",
    order: 1,
    estimatedMinutes: 11,
    content: `# Reading Terrain and Weather

Understanding terrain and weather is essential for trail leaders. These skills help you make smart decisions that keep your group safe and comfortable.

## Reading Terrain

### Topographic Maps
Learn to read "topo" maps:
- **Contour lines** show elevation (closer = steeper)
- **Index contours** are bold with elevation marked
- **Peaks** are shown by concentric circles
- **Valleys** have V-shaped contours pointing uphill
- **Ridges** have U-shaped contours pointing downhill

### Identifying Hazards

**Steep slopes**: Risk of falls, difficult travel
**Cliffs and drop-offs**: Marked by very close contour lines
**Water crossings**: May be dangerous at high water
**Avalanche terrain**: Slopes 30-45°, especially north-facing

### Route Finding

- Follow natural features (ridges, valleys)
- Avoid unnecessary elevation gain
- Stay on established trails when possible
- Identify landmarks for navigation

## Weather Basics

### Cloud Types and What They Mean

**Cirrus** (high, wispy): Fair weather, but can indicate change coming
**Cumulus** (puffy, white): Fair weather if they stay small
**Cumulonimbus** (towering, dark): Thunderstorms—seek shelter!
**Stratus** (gray blanket): Overcast, light rain or drizzle
**Altocumulus** (waves/ripples): Possible thunderstorms later

### Signs of Incoming Weather

**Bad weather approaching:**
- Clouds building or darkening
- Wind increasing or shifting direction
- Barometric pressure dropping (ears popping)
- Temperature suddenly dropping
- Lenticular clouds on peaks

**Improving weather:**
- Clouds breaking up
- Wind calming
- Visibility improving
- Pressure rising

## Mountain Weather

Mountains create their own weather. Key patterns:

### Afternoon Thunderstorms
Common in mountains during summer:
- Form in early afternoon
- Peak 2-5 PM
- **Plan to be off exposed terrain by noon**

### Lightning Safety
If caught in a storm:
1. Get off peaks, ridges, and exposed areas
2. Avoid lone trees and bodies of water
3. Spread group out (30 feet apart)
4. Crouch on insulating material (pack, rope)
5. Wait 30 minutes after last thunder

### Temperature Changes
- Temperature drops ~3.5°F per 1,000 feet elevation gain
- Summit can be 20°+ colder than trailhead
- Always pack layers

## Making Weather Decisions

Before and during your trip:
1. Check forecasts from multiple sources
2. Set turnaround times for exposed routes
3. Have alternative routes planned
4. Watch the sky constantly
5. Don't hesitate to turn back
`,
    quiz: [
      {
        id: "tw-q1",
        question: "What do cumulonimbus clouds indicate?",
        options: [
          "Fair weather",
          "Light rain",
          "Thunderstorms",
          "Clearing skies",
        ],
        correctAnswerIndex: 2,
        explanation: "Cumulonimbus clouds are towering storm clouds that produce thunderstorms.",
      },
      {
        id: "tw-q2",
        question: "By what time should you be off exposed terrain to avoid afternoon storms?",
        options: ["8 AM", "Noon", "3 PM", "5 PM"],
        correctAnswerIndex: 1,
        explanation: "Mountain thunderstorms typically form in early afternoon, so plan to be off exposed areas by noon.",
      },
      {
        id: "tw-q3",
        question: "How much does temperature drop per 1,000 feet of elevation?",
        options: ["1°F", "3.5°F", "5°F", "10°F"],
        correctAnswerIndex: 1,
        explanation: "Temperature drops approximately 3.5°F per 1,000 feet of elevation gain.",
      },
    ],
    isActive: true,
  },

  // ============================================
  // BACKCOUNTRY GUIDE TRACK (Sample Modules)
  // ============================================
  {
    id: "advanced-navigation",
    trackId: "master",
    title: "Advanced Navigation",
    description: "Navigate with confidence in any conditions",
    icon: "compass",
    order: 0,
    estimatedMinutes: 15,
    content: `# Advanced Navigation

Moving beyond basic trail following requires mastery of map, compass, and terrain association skills. These techniques keep you oriented in challenging conditions.

## Map and Compass Mastery

### Declination
The difference between true north and magnetic north varies by location.
- Find declination on your map margin
- Set your compass to adjust
- West declination: add to bearing
- East declination: subtract from bearing

### Taking a Bearing
1. Place compass on map with edge connecting start to destination
2. Rotate bezel until orienting lines align with map's north-south grid
3. Adjust for declination
4. Remove compass, hold level, rotate body until needle matches orienting arrow
5. Sight along direction of travel arrow—that's your heading

### Following a Bearing
In limited visibility:
1. Identify a visible landmark on your bearing
2. Walk to that landmark
3. Take another bearing and repeat
4. Track distance traveled

## Triangulation

Locate your position using two or more known landmarks:
1. Identify two visible features you can find on the map
2. Take a bearing to each feature
3. Draw lines on the map from those features along the back-bearing
4. Your location is where the lines intersect

## GPS Best Practices

GPS is a tool, not a replacement for traditional skills:
- Always carry map and compass as backup
- Mark waypoints for key locations
- Save track logs for reference
- Know your battery life and pack extras
- Understand datum and coordinate systems

### When GPS Fails
- Dense forest canopy
- Deep canyons
- Severe weather
- Dead batteries
- Equipment failure

**This is why analog skills matter.**

## Terrain Association

Read the landscape to confirm location:
- Match terrain features to map contours
- Use catching features (rivers, ridges, trails)
- Estimate distances between features
- Track elevation changes

### Handrails and Baselines
- **Handrails**: Linear features to follow (streams, ridges)
- **Baselines**: Features you can't accidentally cross (roads, large rivers)
- **Attack points**: Obvious features near your objective

## Navigation in Challenging Conditions

### Night Navigation
- Use headlamp to read map and compass
- Move slowly and deliberately
- Rely more on bearing following
- Use catching features

### Whiteout Conditions
- Stop if visibility is near zero
- Use wands or ski poles to mark route
- Navigate in short segments
- Consider waiting for conditions to improve

### Off-Trail Travel
- Plan a general bearing to follow
- Use terrain to guide you
- Mark your route for return
- Move cautiously over unfamiliar ground
`,
    quiz: [
      {
        id: "an-q1",
        question: "What is declination?",
        options: [
          "The angle of a slope",
          "The difference between true north and magnetic north",
          "The elevation above sea level",
          "The distance between contour lines",
        ],
        correctAnswerIndex: 1,
        explanation: "Declination is the difference between true north (map) and magnetic north (compass).",
      },
      {
        id: "an-q2",
        question: "How many landmarks do you need for triangulation?",
        options: ["One", "Two or more", "Four", "Six"],
        correctAnswerIndex: 1,
        explanation: "You need at least two visible landmarks to triangulate your position.",
      },
      {
        id: "an-q3",
        question: "What is a 'catching feature' in navigation?",
        options: [
          "A place to rest",
          "A water source",
          "A feature that prevents you from going too far",
          "A campsite",
        ],
        correctAnswerIndex: 2,
        explanation: "Catching features are obvious landmarks that stop you from overshooting your target.",
      },
    ],
    isActive: true,
  },
  {
    id: "wilderness-weather",
    trackId: "master",
    title: "Wilderness Weather Prediction",
    description: "Read the sky and predict weather changes",
    icon: "thunderstorm",
    order: 1,
    estimatedMinutes: 14,
    content: `# Wilderness Weather Prediction

When you're deep in the backcountry, understanding weather becomes a critical survival skill. Learn to read nature's signs and anticipate changes.

## Atmospheric Pressure

### Your Natural Barometer
Feel changes in pressure:
- **Dropping pressure**: Storm approaching
- **Rising pressure**: Clearing weather
- **Ears popping**: Significant pressure change

### Altimeter as Barometer
If you have an altimeter:
- At same location, rising altitude reading = dropping pressure = bad weather
- Falling altitude reading = rising pressure = improving weather

## Cloud Progression

### Storm Sequence
Weather often follows this pattern:
1. **Cirrus** appears (12-24 hours ahead)
2. **Cirrostratus** spreads (halo around sun/moon)
3. **Altostratus** thickens (6-12 hours ahead)
4. **Nimbostratus** arrives with precipitation

### Window of Action
When you see cirrus increasing, you have 12-24 hours to:
- Complete exposed objectives
- Descend to safer terrain
- Prepare camp for storm

## Wind Patterns

### Reading Wind Direction

**Northern Hemisphere rules:**
- South or southwest wind: Often brings warm, moist air
- Northwest wind: Usually brings clearing, cooler weather
- East wind: Can indicate approaching storm

### Wind Speed and Weather
- Sudden calm after wind: Storm may be imminent
- Gusty, variable winds: Instability, potential thunderstorms
- Steady increase: Front approaching

## Natural Signs

### Animal Behavior
- Birds flying low: Low pressure, bad weather
- Insects becoming more aggressive: Storm coming
- Animals seeking shelter: Weather change imminent

### Plant Indicators
- Pine cones closing: Humidity rising
- Leaves turning underside up: Wind picking up
- Strong flower scent: Low pressure

### Sky Signs
- Red sky at morning: Moisture in air, possible rain
- Red sky at night: Clear weather likely
- Green tint to clouds: Hail possible
- Wall cloud: Severe weather/tornado potential

## Micro-Climate Awareness

Different terrain creates local weather:

### Valley Effects
- Cold air sinks at night
- Morning fog common
- Temperature inversions

### Ridge and Peak Effects
- First to receive storms
- Higher winds
- Rapid temperature drops

### Lake Effects
- Afternoon sea/lake breezes
- Enhanced precipitation downwind
- Morning fog

## Decision Framework

Use weather observations to make decisions:

1. **Green light**: Clear skies, stable pressure, light winds
2. **Yellow light**: Building clouds, dropping pressure, increasing wind
3. **Red light**: Dark clouds, strong winds, precipitation starting

When in doubt, choose the conservative option. The mountain will always be there another day.
`,
    quiz: [
      {
        id: "ww-q1",
        question: "If cirrus clouds are increasing, how much time do you have before weather arrives?",
        options: ["1-2 hours", "6-8 hours", "12-24 hours", "2-3 days"],
        correctAnswerIndex: 2,
        explanation: "Cirrus clouds typically appear 12-24 hours ahead of an approaching weather system.",
      },
      {
        id: "ww-q2",
        question: "What does dropping barometric pressure indicate?",
        options: [
          "Clearing weather",
          "Storm approaching",
          "Temperature rising",
          "Wind decreasing",
        ],
        correctAnswerIndex: 1,
        explanation: "Dropping barometric pressure typically indicates a storm system is approaching.",
      },
      {
        id: "ww-q3",
        question: "What should you do when you see a 'yellow light' in weather conditions?",
        options: [
          "Continue as planned",
          "Take precautions and consider alternatives",
          "Immediately seek shelter",
          "Set up camp immediately",
        ],
        correctAnswerIndex: 1,
        explanation: "Yellow light conditions mean caution—take precautions and be prepared to change plans.",
      },
    ],
    isActive: true,
  },
];

// ============================================
// SEED FUNCTION
// ============================================

export async function seedLearningContent(): Promise<{ success: boolean; message: string }> {
  try {
    console.log("[SeedLearning] Starting seed...");
    
    const batch = writeBatch(db);
    const now = Timestamp.now();
    
    // Seed tracks
    for (const track of TRACKS) {
      const trackRef = doc(db, "learningTracks", track.id);
      batch.set(trackRef, {
        ...track,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    // Seed modules
    for (const module of MODULES) {
      const moduleRef = doc(db, "learningModules", module.id);
      batch.set(moduleRef, {
        ...module,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    await batch.commit();
    
    console.log("[SeedLearning] Successfully seeded learning content!");
    console.log(`  - ${TRACKS.length} tracks`);
    console.log(`  - ${MODULES.length} modules`);
    
    return {
      success: true,
      message: `Seeded ${TRACKS.length} tracks and ${MODULES.length} modules`,
    };
  } catch (error) {
    console.error("[SeedLearning] Error seeding content:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
