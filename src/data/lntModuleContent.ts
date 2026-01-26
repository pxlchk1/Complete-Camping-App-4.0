/**
 * Leave No Trace Expanded Module Content
 *
 * 20 steps covering introduction, all 7 principles (with scenarios),
 * a practical checklist, and a final assessment quiz.
 */

import { LearningStep } from "../state/learningStore";

export const LNT_MODULE_METADATA = {
  id: "leave-no-trace",
  title: "Leave No Trace: The 7 Principles",
  description:
    "Learn how to protect the places we love with these seven principles. Make better decisions in real-world camping scenarios.",
  icon: "leaf",
  difficulty: "Beginner" as const,
  duration: "25 min",
  category: "ethics",
  trackId: "novice" as const,
  xpReward: 75,
  badge: {
    id: "lnt-badge",
    name: "Leave No Trace Ready",
    description: "Completed Leave No Trace training and passed the assessment",
    icon: "medal",
  },
};

export const LNT_EXPANDED_STEPS: LearningStep[] = [
  // ===== INTRO (1 step) =====
  {
    id: "lnt-intro",
    title: "Why Leave No Trace Matters",
    type: "article",
    content: `Leave No Trace is more than a set of rules. It's a way of thinking about your relationship with the outdoors.

Every year, millions of people visit wild places. Without thoughtful practices, these places can be loved to death—worn trails, polluted water, displaced wildlife, and damaged ecosystems.

The good news: small changes make a big difference. These seven principles help you enjoy the outdoors while keeping it wild for the next person and the next generation.

By the end of this module, you'll be able to:
• Explain the 7 principles in plain language
• Make better decisions in common camping scenarios
• Know what to do when rules seem to conflict
• Leave with a checklist for your next trip

Let's get started.`,
    duration: 2,
  },

  // ===== PRINCIPLE 1: Plan Ahead and Prepare (2 steps) =====
  {
    id: "lnt-p1-main",
    title: "Principle 1: Plan Ahead and Prepare",
    type: "article",
    content: `Good planning prevents most problems—and most impact.

**What it means:**
Know before you go. Check weather, rules, and conditions. Bring the right gear and enough supplies.

**3 practical dos:**
✓ Check area regulations (fires, permits, group size limits)
✓ Pack for the conditions—layers, rain gear, sun protection
✓ Bring enough food, water, and waste bags

**3 common mistakes:**
✗ Arriving without knowing if fires are allowed
✗ Underestimating water needs
✗ Packing glass containers that can break

**Remember this:**
"The best trip is one where nothing goes wrong—because you planned ahead."`,
    duration: 2,
  },
  {
    id: "lnt-p1-scenario",
    title: "Scenario: Late Arrival",
    type: "article",
    content: `**Scenario:**
You arrive at the trailhead after dark. The campsite is somewhere ahead, but you can't see the trail markers clearly.

**What should you do?**

**Best choice:** Use your headlamp and stick to the established trail. Move slowly until you find the campsite.

**Why?** Wandering off-trail creates "social trails"—new paths that damage plants and confuse future hikers. Even one shortcut can start a new trail that lasts for years.

**Lesson:**
Planning means arriving with enough daylight. But when plans fail, protecting the land comes first. Stay on the trail, even if it takes longer.`,
    duration: 2,
  },

  // ===== PRINCIPLE 2: Travel and Camp on Durable Surfaces (2 steps) =====
  {
    id: "lnt-p2-main",
    title: "Principle 2: Travel and Camp on Durable Surfaces",
    type: "article",
    content: `Where you walk and sleep matters more than you might think.

**What it means:**
Stick to paths and established campsites. Choose surfaces that can handle impact: rock, gravel, dry grass, snow.

**3 practical dos:**
✓ Walk single-file in the center of the trail
✓ Camp on established pads or previously used sites
✓ In pristine areas, spread out to avoid creating new trails

**3 common mistakes:**
✗ Walking around muddy spots (this widens trails)
✗ Cutting switchbacks to save time
✗ Camping on vegetation "just for one night"

**Remember this:**
"Stay on the path. Your footsteps matter."`,
    duration: 2,
  },
  {
    id: "lnt-p2-scenario",
    title: "Scenario: The Muddy Trail",
    type: "article",
    content: `**Scenario:**
It rained last night. The trail is muddy, and you don't want to ruin your boots. There's a dry path through some plants next to the trail.

**What should you do?**

**Best choice:** Walk through the mud, in the center of the trail.

**Why?** Going around creates a wider trail. One person walks around, then another, and soon the trail is three times as wide. Muddy boots can be cleaned. Damaged trails take years to recover.

**Lesson:**
Trails exist to concentrate impact. When they're muddy, they're doing their job. Walk through, not around.`,
    duration: 2,
  },

  // ===== PRINCIPLE 3: Dispose of Waste Properly (3 steps) =====
  {
    id: "lnt-p3-main",
    title: "Principle 3: Dispose of Waste Properly",
    type: "article",
    content: `This principle causes the most confusion—and the most damage when ignored.

**What it means:**
Pack it in, pack it out. This includes ALL trash, food scraps, and hygiene products.

**3 practical dos:**
✓ Bring extra trash bags (one for garbage, one for recycling)
✓ Pack out food scraps—even "natural" ones like orange peels
✓ Know the rules for human waste before you go

**3 common mistakes:**
✗ Thinking fruit peels are "biodegradable" (they take years and attract animals)
✗ Burning trash in campfires (creates toxins and residue)
✗ Leaving toilet paper buried in the woods

**Remember this:**
"If it wasn't there when you arrived, take it with you."`,
    duration: 2,
  },
  {
    id: "lnt-p3-bathroom",
    title: "Human Waste: The Uncomfortable Truth",
    type: "article",
    content: `Nobody wants to talk about this. But improper waste disposal is one of the biggest problems in popular outdoor areas.

**The basics:**
• Use facilities when available
• When there's no toilet, dig a cathole: 6-8 inches deep, 200 feet from water, trails, and camp
• Pack out toilet paper if required (check local rules)
• Wash hands 200 feet from water sources

**Wag bags:**
Many areas now require "pack it out" for all human waste. Wag bags are lightweight, seal completely, and are more common than you'd think. Check before you go.

**Gray water (dishwater):**
• Strain out food bits and pack them out
• Scatter water widely, at least 200 feet from streams and lakes
• Use biodegradable soap sparingly

**Lesson:**
This is the principle people skip because it's awkward. But it's the one that protects water quality and prevents disease.`,
    duration: 3,
  },
  {
    id: "lnt-p3-scenario",
    title: "Scenario: The Apple Core Debate",
    type: "article",
    content: `**Scenario:**
Your hiking partner finishes an apple and tosses the core into the bushes. "It's natural," they say. "It'll decompose."

**What should you say?**

**Best response:** "Actually, we should pack that out."

**Why?** Apple cores take 2 months to decompose—longer in dry climates. But the bigger problem is wildlife. Animals learn to associate trails with food. A tossed apple core today means a bold squirrel tomorrow and a problem bear next year.

**What counts as trash?**
• Orange peels (up to 2 years to decompose)
• Sunflower seed shells
• Banana peels
• Eggshells
• Nut shells

**Lesson:**
"Natural" doesn't mean "belongs here." If you brought it, take it back.`,
    duration: 2,
  },

  // ===== PRINCIPLE 4: Leave What You Find (2 steps) =====
  {
    id: "lnt-p4-main",
    title: "Principle 4: Leave What You Find",
    type: "article",
    content: `Everything you see is part of someone else's experience—and part of the ecosystem.

**What it means:**
Don't take souvenirs. Don't move things. Don't build structures.

**3 practical dos:**
✓ Take photos instead of objects
✓ Leave rocks, shells, feathers, and plants where they are
✓ Report historic or cultural artifacts—don't touch them

**3 common mistakes:**
✗ Taking "just one" rock or flower
✗ Carving initials into trees or rocks
✗ Building cairns, furniture, or fire rings

**Remember this:**
"The best souvenir is a photograph and a memory."`,
    duration: 2,
  },
  {
    id: "lnt-p4-scenario",
    title: "Scenario: The Perfect Rock",
    type: "article",
    content: `**Scenario:**
You find a beautiful, smooth river stone. It would look great on your desk. "It's just one rock," you think. "The river has millions."

**What should you do?**

**Best choice:** Leave it where it is. Take a photo if you want.

**Why?** That rock is habitat—maybe for insects, salamanders, or fish. And if every visitor took "just one," the riverbed would change. 

Multiply your action by thousands. That's the real impact.

**What about cairns?**
Those rock stacks you see on trails? In some places, they're trail markers. In others, they're "rock graffiti" that confuses hikers and disturbs habitat. If you didn't build it for navigation, don't build it.

**Lesson:**
Leave the landscape as you found it. Future visitors deserve the same experience.`,
    duration: 2,
  },

  // ===== PRINCIPLE 5: Minimize Campfire Impacts (3 steps) =====
  {
    id: "lnt-p5-main",
    title: "Principle 5: Minimize Campfire Impacts",
    type: "article",
    content: `Campfires are iconic, but they come with real risks and lasting impacts.

**What it means:**
Use a stove when possible. If you have a fire, keep it small and controlled. Leave no trace.

**3 practical dos:**
✓ Use a camping stove for cooking—it's faster, cleaner, and safer
✓ If fires are allowed, use existing fire rings only
✓ Burn only small, dead, and downed wood

**3 common mistakes:**
✗ Building fires when conditions are dry or windy
✗ Cutting live branches for fuel
✗ Leaving a fire ring full of half-burned trash

**Remember this:**
"The cleanest fire is no fire."`,
    duration: 2,
  },
  {
    id: "lnt-p5-safety",
    title: "Fire Safety: From Spark to Cold",
    type: "article",
    content: `If you choose to have a fire, do it right from start to finish.

**Starting:**
• Check if fires are allowed (fire bans change frequently)
• Use an existing fire ring—never create a new one
• Keep fires small—you should be able to put it out quickly

**Burning:**
• Use only dead, downed wood that's smaller than your wrist
• Never burn trash—it leaves residue and toxins
• Don't burn food scraps—they don't burn completely and attract animals

**Putting it out (the most important part):**
1. Drown with water—stir—drown again
2. Feel with the back of your hand (not palm)
3. If it's warm, it's not out. Repeat.
4. Scatter cooled ashes if allowed, or pack them out

**The test:** Can you put your hand in it? If not, keep going.

**Remember:**
Wildfires often start from "dead" campfires. Be certain, not confident.`,
    duration: 3,
  },
  {
    id: "lnt-p5-scenario",
    title: "Scenario: The Windy Night",
    type: "article",
    content: `**Scenario:**
It's getting cold, and the wind has picked up. Fires are technically allowed, but sparks keep blowing sideways. Your group really wants a fire.

**What should you do?**

**Best choice:** Skip the fire tonight. Use your stove for warmth (hot drinks) and layer up.

**Why?** Wind carries embers. Even a well-contained fire can throw sparks 50+ feet in gusty conditions. One spark on dry grass is all it takes.

**What about fire pans?**
Fire pans (elevated metal containers) are great for containing fires in some conditions. But in high wind? No pan helps with flying embers.

**Lesson:**
The responsible choice isn't always the fun choice. But the outdoors will still be there tomorrow if you make the right call tonight.`,
    duration: 2,
  },

  // ===== PRINCIPLE 6: Respect Wildlife (2 steps) =====
  {
    id: "lnt-p6-main",
    title: "Principle 6: Respect Wildlife",
    type: "article",
    content: `Wildlife is one of the reasons we go outside. Respecting them keeps everyone safe.

**What it means:**
Observe from a distance. Never feed. Store food properly.

**3 practical dos:**
✓ Keep 100+ feet from large animals (more for bears, moose, etc.)
✓ Store all food and scented items in bear canisters, lockers, or hung bags
✓ Keep pets leashed and under control

**3 common mistakes:**
✗ Feeding animals (even "harmless" ones like squirrels)
✗ Approaching wildlife for photos
✗ Leaving food, trash, or toiletries accessible

**Remember this:**
"A fed animal is a dead animal."

When wildlife learns to associate humans with food, they become bold. Bold animals become nuisances. Nuisances become dangers. And dangerous animals are often killed.`,
    duration: 2,
  },
  {
    id: "lnt-p6-scenario",
    title: "Scenario: The Friendly Chipmunk",
    type: "article",
    content: `**Scenario:**
A chipmunk keeps coming into your campsite. It's cute! Your kid wants to give it a cracker.

**What should you do?**

**Best choice:** Clean up any crumbs, secure all food, and ignore the chipmunk. Do not feed it.

**Why?** That chipmunk has probably been fed before—that's why it's so bold. Feeding it reinforces the behavior. Eventually, it may chew through tents or backpacks to get food.

**What if an animal won't leave?**
• Make noise
• Stand up and appear large
• Secure your food immediately
• If it's a bear or large animal, know the local protocols

**How close is too close?**
If the animal changes its behavior because of you—stops eating, stares, moves away—you're too close. Back up.

**Lesson:**
Love wildlife from a distance. The kindest thing you can do is let them stay wild.`,
    duration: 2,
  },

  // ===== PRINCIPLE 7: Be Considerate of Other Visitors (2 steps) =====
  {
    id: "lnt-p7-main",
    title: "Principle 7: Be Considerate of Other Visitors",
    type: "article",
    content: `You're not the only one out there. Others came for the same reasons you did.

**What it means:**
Share the space. Keep noise low. Be a good neighbor.

**3 practical dos:**
✓ Keep voices and music low—or use headphones
✓ Yield to others on trails (uphill hikers, horses, bikes per local rules)
✓ Camp out of sight and sound of others when possible

**3 common mistakes:**
✗ Playing music on speakers (yes, even quietly)
✗ Using bright lights that shine into other campsites
✗ Letting pets or kids run through others' sites

**Remember this:**
"Others came for nature, not for your playlist."`,
    duration: 2,
  },
  {
    id: "lnt-p7-scenario",
    title: "Scenario: The Loud Neighbors",
    type: "article",
    content: `**Scenario:**
It's 11 PM. The group at the next campsite is loud—laughing, music, headlamps everywhere. You have an early start tomorrow.

**What should you do?**

**Best approach:**
1. Walk over calmly and politely ask them to quiet down
2. If that doesn't work, contact the campground host or ranger
3. Stay calm—escalation rarely helps

**What to say:**
"Hey, we've got an early morning and the sound really carries out here. Would you mind keeping it down?"

Most people don't realize how far sound travels outdoors. A kind request usually works.

**Flip it around:**
Think about your own group. Are you the loud neighbors? Set quiet hours for your group. Use headphones. Keep lights pointed down.

**Lesson:**
Be the camper you'd want next to you.`,
    duration: 2,
  },

  // ===== WRAP-UP: Your First Trip Checklist (1 step) =====
  {
    id: "lnt-checklist",
    title: "Your First Trip Checklist",
    type: "article",
    content: `Here's your Leave No Trace checklist for every trip. Screenshot this or add it to your packing list.

**Before You Go:**
☐ Check regulations (fires, permits, group size)
☐ Check weather and plan for conditions
☐ Pack trash bags (at least 2)
☐ Know the bathroom rules (cathole? wag bag? facilities?)
☐ Bring reusable containers—no glass

**At Camp:**
☐ Use established campsites and fire rings
☐ Store food and scented items properly
☐ Keep 200 feet from water for washing and waste
☐ Keep noise and lights low after dark

**Before You Leave:**
☐ Pack out ALL trash—including food scraps
☐ If you had a fire, make sure it's COLD (hand test)
☐ Do a "microtrash sweep" of your site
☐ Leave the site cleaner than you found it

**On the Trail:**
☐ Stay on established trails—even when muddy
☐ Don't cut switchbacks
☐ Yield to others (uphill, horses, local rules)
☐ Keep pets leashed

**The Simple Version:**
Take only photos. Leave only footprints. Kill only time.

You're ready for the final assessment.`,
    duration: 2,
  },

  // ===== FINAL ASSESSMENT (1 step) =====
  {
    id: "lnt-final-quiz",
    title: "Final Assessment",
    type: "quiz",
    content: "DYNAMIC_LNT_QUIZ", // Special marker for dynamic quiz generation
    duration: 5,
  },
];

/**
 * Get the full LNT module with expanded steps
 */
export function getLNTExpandedModule() {
  return {
    ...LNT_MODULE_METADATA,
    steps: LNT_EXPANDED_STEPS,
  };
}
