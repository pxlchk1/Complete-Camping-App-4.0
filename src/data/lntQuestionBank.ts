/**
 * Leave No Trace Question Bank
 *
 * 42 questions (6 per principle) for the LNT learning module.
 * Questions are drawn randomly for assessments with at least 1 from each principle.
 */

export type QuestionType = "single" | "multi" | "tf" | "scenario";

export interface LNTQuestionChoice {
  id: string;
  text: string;
}

export interface LNTQuestion {
  id: string;
  moduleId: string;
  principleId: string;
  type: QuestionType;
  difficulty: 1 | 2 | 3;
  prompt: string;
  choices: LNTQuestionChoice[];
  correctChoiceIds: string[];
  explanation: string;
  tags: string[];
  shuffleChoices: boolean;
  isActive: boolean;
}

export const LNT_PRINCIPLES = {
  p1_plan_ahead_prepare: {
    id: "p1_plan_ahead_prepare",
    number: 1,
    title: "Plan Ahead and Prepare",
    summary: "Good planning prevents most problems.",
  },
  p2_durable_surfaces: {
    id: "p2_durable_surfaces",
    number: 2,
    title: "Travel and Camp on Durable Surfaces",
    summary: "Stick to trails and established sites.",
  },
  p3_dispose_waste_properly: {
    id: "p3_dispose_waste_properly",
    number: 3,
    title: "Dispose of Waste Properly",
    summary: "Pack it in, pack it out. Everything.",
  },
  p4_leave_what_you_find: {
    id: "p4_leave_what_you_find",
    number: 4,
    title: "Leave What You Find",
    summary: "Take photos, not souvenirs.",
  },
  p5_campfire_impacts: {
    id: "p5_campfire_impacts",
    number: 5,
    title: "Minimize Campfire Impacts",
    summary: "Use stoves. Keep fires small. Leave no trace.",
  },
  p6_respect_wildlife: {
    id: "p6_respect_wildlife",
    number: 6,
    title: "Respect Wildlife",
    summary: "Observe from distance. Never feed.",
  },
  p7_be_considerate: {
    id: "p7_be_considerate",
    number: 7,
    title: "Be Considerate of Other Visitors",
    summary: "Share the space kindly.",
  },
};

export const LNT_QUESTION_BANK: LNTQuestion[] = [
  // ===== PRINCIPLE 1: Plan Ahead and Prepare =====
  {
    id: "lnt_p1_q1",
    moduleId: "lnt_7_principles",
    principleId: "p1_plan_ahead_prepare",
    type: "single",
    difficulty: 1,
    prompt: "Why is checking local regulations part of Leave No Trace?",
    choices: [
      { id: "a", text: "It helps you avoid harm and follow area-specific rules." },
      { id: "b", text: "So you can camp anywhere you want." },
      { id: "c", text: "To make your trip longer." },
      { id: "d", text: "So you can ignore trail signs." },
    ],
    correctChoiceIds: ["a"],
    explanation: "Rules exist to protect resources and reduce impact.",
    tags: ["base", "new_camper"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p1_q2",
    moduleId: "lnt_7_principles",
    principleId: "p1_plan_ahead_prepare",
    type: "multi",
    difficulty: 2,
    prompt: "Select all that reduce your impact.",
    choices: [
      { id: "a", text: "Pack reusable containers." },
      { id: "b", text: "Bring an extra trash bag." },
      { id: "c", text: "Assume you can burn trash." },
      { id: "d", text: "Know if restrooms are available." },
    ],
    correctChoiceIds: ["a", "b", "d"],
    explanation:
      "Planning prevents messy last-minute decisions that create waste and damage.",
    tags: ["planning"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p1_q3",
    moduleId: "lnt_7_principles",
    principleId: "p1_plan_ahead_prepare",
    type: "tf",
    difficulty: 1,
    prompt: "It's okay to bring glass because it's recyclable.",
    choices: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctChoiceIds: ["f"],
    explanation: "Broken glass is dangerous and easy to miss when cleaning up.",
    tags: ["safety"],
    shuffleChoices: false,
    isActive: true,
  },
  {
    id: "lnt_p1_q4",
    moduleId: "lnt_7_principles",
    principleId: "p1_plan_ahead_prepare",
    type: "single",
    difficulty: 2,
    prompt: "Why does packing warm layers support Leave No Trace?",
    choices: [
      {
        id: "a",
        text: "Comfort helps you make safer choices instead of cutting corners.",
      },
      { id: "b", text: "It guarantees perfect weather." },
      { id: "c", text: "It lets you create new campsites." },
      { id: "d", text: "It means you do not need a map." },
    ],
    correctChoiceIds: ["a"],
    explanation:
      "When people are cold or stressed, they are more likely to take shortcuts or leave messes.",
    tags: ["behavior"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p1_q5",
    moduleId: "lnt_7_principles",
    principleId: "p1_plan_ahead_prepare",
    type: "scenario",
    difficulty: 2,
    prompt:
      "You arrive after dark and cannot find the campsite right away. What is the best Leave No Trace move?",
    choices: [
      { id: "a", text: 'Wander off-trail to find a "perfect" spot.' },
      {
        id: "b",
        text: "Stick to established paths and campsites using a headlamp.",
      },
      { id: "c", text: "Build a fire to light the way." },
      { id: "d", text: "Cut through vegetation to save time." },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "Staying on established routes prevents new social trails and plant damage.",
    tags: ["arrival", "trail"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p1_q6",
    moduleId: "lnt_7_principles",
    principleId: "p1_plan_ahead_prepare",
    type: "single",
    difficulty: 2,
    prompt: "Why does group size matter for Leave No Trace?",
    choices: [
      {
        id: "a",
        text: "Impact increases with more people, noise, and trampling.",
      },
      { id: "b", text: "It makes your tent warmer." },
      { id: "c", text: "It guarantees better cell service." },
      { id: "d", text: "It changes the park's opening hours." },
    ],
    correctChoiceIds: ["a"],
    explanation:
      "More people magnify footprint, sound, and wear on trails and campsites.",
    tags: ["group"],
    shuffleChoices: true,
    isActive: true,
  },

  // ===== PRINCIPLE 2: Travel and Camp on Durable Surfaces =====
  {
    id: "lnt_p2_q1",
    moduleId: "lnt_7_principles",
    principleId: "p2_durable_surfaces",
    type: "single",
    difficulty: 1,
    prompt: "Which is the best example of a durable surface?",
    choices: [
      { id: "a", text: "Rock or gravel" },
      { id: "b", text: "A patch of wildflowers" },
      { id: "c", text: "Soft moss" },
      { id: "d", text: "The edge of a fragile dune plant cluster" },
    ],
    correctChoiceIds: ["a"],
    explanation:
      "Rock and gravel resist damage better than living plants and fragile soils.",
    tags: ["trail"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p2_q2",
    moduleId: "lnt_7_principles",
    principleId: "p2_durable_surfaces",
    type: "single",
    difficulty: 2,
    prompt: "Why should you stay on the trail even when it is muddy?",
    choices: [
      {
        id: "a",
        text: "Going around widens the trail and harms vegetation.",
      },
      { id: "b", text: "Mud is always dangerous to step on." },
      { id: "c", text: "It helps you walk faster." },
      { id: "d", text: "It makes your shoes cleaner." },
    ],
    correctChoiceIds: ["a"],
    explanation: "Detours create braided trails that spread damage outward.",
    tags: ["mud"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p2_q3",
    moduleId: "lnt_7_principles",
    principleId: "p2_durable_surfaces",
    type: "scenario",
    difficulty: 2,
    prompt:
      "You see a shortcut cutting down a switchback. Why is taking it a problem?",
    choices: [
      { id: "a", text: "It causes erosion and damages plants." },
      { id: "b", text: "It makes the trail signs confusing." },
      { id: "c", text: "It helps animals find food." },
      { id: "d", text: "It keeps your backpack lighter." },
    ],
    correctChoiceIds: ["a"],
    explanation:
      "Switchbacks reduce erosion. Shortcuts undo that design and scar the hillside.",
    tags: ["erosion"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p2_q4",
    moduleId: "lnt_7_principles",
    principleId: "p2_durable_surfaces",
    type: "tf",
    difficulty: 1,
    prompt: "Camping on vegetation for one night is fine if you leave early.",
    choices: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctChoiceIds: ["f"],
    explanation:
      "Trampling damage can last months or years, even from one night.",
    tags: ["camping"],
    shuffleChoices: false,
    isActive: true,
  },
  {
    id: "lnt_p2_q5",
    moduleId: "lnt_7_principles",
    principleId: "p2_durable_surfaces",
    type: "single",
    difficulty: 2,
    prompt: "In a popular area, what is usually the best campsite choice?",
    choices: [
      {
        id: "a",
        text: "An established campsite that is already impacted.",
      },
      { id: "b", text: "A fresh untouched spot near water." },
      { id: "c", text: "Any open patch of plants." },
      { id: "d", text: "A new spot you clear yourself." },
    ],
    correctChoiceIds: ["a"],
    explanation:
      "Concentrating use in established sites prevents creating new damage.",
    tags: ["popular_area"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p2_q6",
    moduleId: "lnt_7_principles",
    principleId: "p2_durable_surfaces",
    type: "single",
    difficulty: 3,
    prompt:
      "In a pristine area with no established trails, what is the best approach?",
    choices: [
      {
        id: "a",
        text: "Disperse travel to avoid creating a single new path.",
      },
      {
        id: "b",
        text: "Walk in a single-file line everywhere to form a trail.",
      },
      { id: "c", text: "Cut branches to mark your route." },
      {
        id: "d",
        text: "Always camp directly on plants to soften your footprint.",
      },
    ],
    correctChoiceIds: ["a"],
    explanation:
      "Spreading out reduces the chance of creating a permanent social trail.",
    tags: ["backcountry"],
    shuffleChoices: true,
    isActive: true,
  },

  // ===== PRINCIPLE 3: Dispose of Waste Properly =====
  {
    id: "lnt_p3_q1",
    moduleId: "lnt_7_principles",
    principleId: "p3_dispose_waste_properly",
    type: "single",
    difficulty: 1,
    prompt: 'What does "pack it in, pack it out" include?',
    choices: [
      { id: "a", text: "Only plastic trash" },
      {
        id: "b",
        text: "All trash, including food scraps and hygiene items",
      },
      { id: "c", text: "Only what is visible at the campsite" },
      { id: "d", text: "Only what you brought in a bag" },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "Food scraps and hygiene items count as waste and often cause the biggest problems.",
    tags: ["waste"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p3_q2",
    moduleId: "lnt_7_principles",
    principleId: "p3_dispose_waste_properly",
    type: "single",
    difficulty: 1,
    prompt: "Should you burn trash in a campfire?",
    choices: [
      { id: "a", text: "Yes, it disappears." },
      { id: "b", text: "No, it creates toxins and leftover trash." },
      { id: "c", text: "Only plastic is okay." },
      { id: "d", text: "Only paper is okay." },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "Burned trash leaves residue, smells, and sometimes melted plastic or foil behind.",
    tags: ["fire", "waste"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p3_q3",
    moduleId: "lnt_7_principles",
    principleId: "p3_dispose_waste_properly",
    type: "single",
    difficulty: 3,
    prompt: "What is the best way to handle dishwater at camp?",
    choices: [
      {
        id: "a",
        text: "Dump it directly into the nearest lake or stream.",
      },
      {
        id: "b",
        text: "Strain food bits, pack them out, then scatter water widely away from water sources.",
      },
      { id: "c", text: "Pour it on the trail so it dries faster." },
      {
        id: "d",
        text: "Leave food bits at the campsite because animals will eat them.",
      },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "Food bits attract animals and dishwater near water sources harms ecosystems.",
    tags: ["water", "cleanup"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p3_q4",
    moduleId: "lnt_7_principles",
    principleId: "p3_dispose_waste_properly",
    type: "multi",
    difficulty: 2,
    prompt: "Select all that count as trash you should pack out.",
    choices: [
      { id: "a", text: "Orange peel" },
      { id: "b", text: "Sunflower seed shells" },
      { id: "c", text: "Apple core" },
      { id: "d", text: "Paper towel" },
    ],
    correctChoiceIds: ["a", "b", "c", "d"],
    explanation:
      '"Natural" does not mean "belongs here." Food waste changes wildlife behavior and lingers.',
    tags: ["microtrash"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p3_q5",
    moduleId: "lnt_7_principles",
    principleId: "p3_dispose_waste_properly",
    type: "single",
    difficulty: 3,
    prompt: "What should you do with toilet paper when there is no restroom?",
    choices: [
      { id: "a", text: "Leave it under a rock so no one sees it." },
      {
        id: "b",
        text: "Pack it out where required, otherwise follow local guidance for proper burial and distance.",
      },
      { id: "c", text: "Burn it in the fire ring." },
      { id: "d", text: "Throw it into water so it floats away." },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "Many places require packing it out. Where burial is allowed, follow depth and distance rules.",
    tags: ["bathroom"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p3_q6",
    moduleId: "lnt_7_principles",
    principleId: "p3_dispose_waste_properly",
    type: "scenario",
    difficulty: 2,
    prompt:
      "You notice tiny bits of trash around your site (twist ties, bottle caps, corners of wrappers). What is the best action?",
    choices: [
      { id: "a", text: "Ignore it because it is not yours." },
      { id: "b", text: "Pick it up and pack it out." },
      { id: "c", text: "Bury it so animals do not find it." },
      { id: "d", text: "Burn it in a fire." },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "Microtrash is easy for wildlife to eat and hard for others to clean later.",
    tags: ["stewardship"],
    shuffleChoices: true,
    isActive: true,
  },

  // ===== PRINCIPLE 4: Leave What You Find =====
  {
    id: "lnt_p4_q1",
    moduleId: "lnt_7_principles",
    principleId: "p4_leave_what_you_find",
    type: "single",
    difficulty: 1,
    prompt:
      "Why should you leave rocks, plants, and artifacts where you find them?",
    choices: [
      {
        id: "a",
        text: "Because they are part of the ecosystem and experience for everyone.",
      },
      { id: "b", text: "Because they are too heavy to carry." },
      { id: "c", text: "Because it is only allowed on weekends." },
      { id: "d", text: "Because it makes your tent smaller." },
    ],
    correctChoiceIds: ["a"],
    explanation:
      "Removing items changes the place and teaches others it is normal to take souvenirs.",
    tags: ["ethics"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p4_q2",
    moduleId: "lnt_7_principles",
    principleId: "p4_leave_what_you_find",
    type: "tf",
    difficulty: 1,
    prompt: "Taking one wildflower is harmless.",
    choices: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctChoiceIds: ["f"],
    explanation:
      "Small actions multiplied by many visitors can wipe out sensitive areas.",
    tags: ["plants"],
    shuffleChoices: false,
    isActive: true,
  },
  {
    id: "lnt_p4_q3",
    moduleId: "lnt_7_principles",
    principleId: "p4_leave_what_you_find",
    type: "single",
    difficulty: 2,
    prompt:
      "What is the best approach to historic or cultural objects you find outdoors?",
    choices: [
      { id: "a", text: "Take it home so it is safe." },
      { id: "b", text: "Leave it, photograph it, and report if needed." },
      { id: "c", text: "Move it to a more visible place." },
      { id: "d", text: "Bury it so no one else finds it." },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "These items are protected and belong in place, not in a backpack.",
    tags: ["history"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p4_q4",
    moduleId: "lnt_7_principles",
    principleId: "p4_leave_what_you_find",
    type: "single",
    difficulty: 1,
    prompt: "Carving initials into trees is best described as:",
    choices: [
      { id: "a", text: "A harmless tradition" },
      { id: "b", text: "Damage that can last decades" },
      { id: "c", text: "A way to help people find camp" },
      { id: "d", text: "A safety requirement" },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "It wounds the tree and encourages more people to do the same.",
    tags: ["damage"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p4_q5",
    moduleId: "lnt_7_principles",
    principleId: "p4_leave_what_you_find",
    type: "single",
    difficulty: 2,
    prompt:
      "Is it okay to build camp furniture from logs if you put it back later?",
    choices: [
      { id: "a", text: "Yes, as long as you put it back." },
      {
        id: "b",
        text: "No, it changes habitat and encourages more impact.",
      },
      { id: "c", text: "Only in winter." },
      { id: "d", text: "Only if you are camping alone." },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "Moving natural materials changes the site and can harm wildlife habitat.",
    tags: ["habitat"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p4_q6",
    moduleId: "lnt_7_principles",
    principleId: "p4_leave_what_you_find",
    type: "single",
    difficulty: 1,
    prompt: 'What is the best "souvenir" from a camping trip?',
    choices: [
      { id: "a", text: "A pocket full of rocks" },
      { id: "b", text: "A jar of sand" },
      { id: "c", text: "Photos and memories" },
      { id: "d", text: "A carved branch" },
    ],
    correctChoiceIds: ["c"],
    explanation: "You can take home the story without taking from the place.",
    tags: ["mindset"],
    shuffleChoices: true,
    isActive: true,
  },

  // ===== PRINCIPLE 5: Minimize Campfire Impacts =====
  {
    id: "lnt_p5_q1",
    moduleId: "lnt_7_principles",
    principleId: "p5_campfire_impacts",
    type: "single",
    difficulty: 2,
    prompt: "What is often the lowest-impact option for cooking and warmth?",
    choices: [
      { id: "a", text: "A large bonfire" },
      {
        id: "b",
        text: "A stove and warm layers, skipping a fire when possible",
      },
      { id: "c", text: "Burning trash for fuel" },
      { id: "d", text: "Cutting live branches to keep the fire going" },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "Stoves reduce fire scars and lower risk, especially in windy or dry conditions.",
    tags: ["fire"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p5_q2",
    moduleId: "lnt_7_principles",
    principleId: "p5_campfire_impacts",
    type: "single",
    difficulty: 1,
    prompt: "If fires are allowed, where should you build one?",
    choices: [
      { id: "a", text: "In an existing fire ring" },
      { id: "b", text: "Anywhere that looks flat" },
      { id: "c", text: "On top of plant roots" },
      { id: "d", text: "Right next to the tent for warmth" },
    ],
    correctChoiceIds: ["a"],
    explanation:
      "Using existing rings prevents new scars and keeps impact contained.",
    tags: ["site"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p5_q3",
    moduleId: "lnt_7_principles",
    principleId: "p5_campfire_impacts",
    type: "single",
    difficulty: 2,
    prompt: "What wood should you burn (where allowed)?",
    choices: [
      { id: "a", text: "Live branches because they are cleaner" },
      { id: "b", text: "Large logs so the fire lasts all night" },
      { id: "c", text: "Small dead and down wood" },
      { id: "d", text: "Any wood you can cut nearby" },
    ],
    correctChoiceIds: ["c"],
    explanation:
      "Cutting live wood harms trees and changes the area. Small dead wood burns more fully.",
    tags: ["wood"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p5_q4",
    moduleId: "lnt_7_principles",
    principleId: "p5_campfire_impacts",
    type: "single",
    difficulty: 3,
    prompt: "What should you do with leftover coals and ash before leaving?",
    choices: [
      { id: "a", text: "Leave them, they will burn out." },
      {
        id: "b",
        text: "Drown, stir, and feel for heat until cold, then follow local rules for disposal.",
      },
      { id: "c", text: "Cover them with dirt so nobody sees." },
      { id: "d", text: "Kick them apart and walk away." },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "If it is warm, it can still start a fire. Cold to the touch is the standard.",
    tags: ["safety", "wildfire"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p5_q5",
    moduleId: "lnt_7_principles",
    principleId: "p5_campfire_impacts",
    type: "tf",
    difficulty: 2,
    prompt: "Burning food scraps in the fire is fine because it disappears.",
    choices: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctChoiceIds: ["f"],
    explanation:
      "Food scraps can leave residue and smells that attract animals, and not everything burns completely.",
    tags: ["food"],
    shuffleChoices: false,
    isActive: true,
  },
  {
    id: "lnt_p5_q6",
    moduleId: "lnt_7_principles",
    principleId: "p5_campfire_impacts",
    type: "scenario",
    difficulty: 2,
    prompt:
      "It is very windy at camp. Fires are allowed, but conditions feel sketchy. What is the best choice?",
    choices: [
      { id: "a", text: "Build a bigger fire so it does not go out." },
      {
        id: "b",
        text: "Skip the fire and use a stove, warm clothes, and shelter.",
      },
      { id: "c", text: "Burn trash so the fire stays hot." },
      {
        id: "d",
        text: "Move the fire ring into the grass for wind protection.",
      },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "Wind increases wildfire risk and can spread embers fast. Safety comes first.",
    tags: ["wind"],
    shuffleChoices: true,
    isActive: true,
  },

  // ===== PRINCIPLE 6: Respect Wildlife =====
  {
    id: "lnt_p6_q1",
    moduleId: "lnt_7_principles",
    principleId: "p6_respect_wildlife",
    type: "single",
    difficulty: 1,
    prompt: "Why should you never feed wildlife?",
    choices: [
      {
        id: "a",
        text: "It can change animal behavior and harm animals and people.",
      },
      { id: "b", text: "It makes animals friendlier." },
      { id: "c", text: "It helps animals learn to camp." },
      { id: "d", text: "It is only a problem in summer." },
    ],
    correctChoiceIds: ["a"],
    explanation:
      "Animals that associate people with food can become aggressive or unhealthy.",
    tags: ["wildlife"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p6_q2",
    moduleId: "lnt_7_principles",
    principleId: "p6_respect_wildlife",
    type: "single",
    difficulty: 2,
    prompt: "What is a good food storage habit at camp?",
    choices: [
      { id: "a", text: "Leave food out so it cools faster." },
      {
        id: "b",
        text: "Store food and scented items securely when not in use.",
      },
      { id: "c", text: "Put food scraps in the fire ring." },
      { id: "d", text: "Hide food under your sleeping bag." },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "Scented items include toothpaste, snacks, and trash. Store them like food.",
    tags: ["food_storage"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p6_q3",
    moduleId: "lnt_7_principles",
    principleId: "p6_respect_wildlife",
    type: "tf",
    difficulty: 1,
    prompt: "If an animal approaches you, it probably means it is friendly.",
    choices: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctChoiceIds: ["f"],
    explanation:
      "Approaching animals may be habituated or stressed. Give wildlife space.",
    tags: ["distance"],
    shuffleChoices: false,
    isActive: true,
  },
  {
    id: "lnt_p6_q4",
    moduleId: "lnt_7_principles",
    principleId: "p6_respect_wildlife",
    type: "single",
    difficulty: 2,
    prompt: "You see a young animal alone. What should you do?",
    choices: [
      { id: "a", text: "Pick it up and move it to safety." },
      { id: "b", text: "Leave it alone and back away." },
      { id: "c", text: "Feed it so it is not hungry." },
      { id: "d", text: "Take it to your campsite." },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "Parents are often nearby. Human contact can put the animal at risk.",
    tags: ["ethics"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p6_q5",
    moduleId: "lnt_7_principles",
    principleId: "p6_respect_wildlife",
    type: "single",
    difficulty: 3,
    prompt: "What is a key sign you are too close to wildlife?",
    choices: [
      { id: "a", text: "The animal ignores you completely." },
      {
        id: "b",
        text: "The animal changes behavior, stops eating, or moves away.",
      },
      { id: "c", text: "The animal looks at you once." },
      { id: "d", text: "You can take a clear photo." },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "If you change an animal's behavior, you are already affecting it.",
    tags: ["respect"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p6_q6",
    moduleId: "lnt_7_principles",
    principleId: "p6_respect_wildlife",
    type: "scenario",
    difficulty: 2,
    prompt: "A chipmunk keeps coming into camp. What is the best response?",
    choices: [
      { id: "a", text: "Feed it a little so it leaves you alone." },
      {
        id: "b",
        text: "Clean up crumbs, secure food, and do not feed it.",
      },
      { id: "c", text: "Throw food away from camp so it goes there." },
      { id: "d", text: "Chase it until it disappears." },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "Food rewards teach animals to return. Clean camp habits fix the problem.",
    tags: ["camp_habits"],
    shuffleChoices: true,
    isActive: true,
  },

  // ===== PRINCIPLE 7: Be Considerate of Other Visitors =====
  {
    id: "lnt_p7_q1",
    moduleId: "lnt_7_principles",
    principleId: "p7_be_considerate",
    type: "single",
    difficulty: 1,
    prompt: "Why should you keep noise low in camp and on trails?",
    choices: [
      { id: "a", text: "Sound carries, and others came for nature too." },
      { id: "b", text: "It makes your phone battery last longer." },
      { id: "c", text: "It keeps mosquitoes away." },
      { id: "d", text: "It is only important after midnight." },
    ],
    correctChoiceIds: ["a"],
    explanation:
      "Quiet helps protect wildlife behavior and keeps the experience better for everyone.",
    tags: ["etiquette"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p7_q2",
    moduleId: "lnt_7_principles",
    principleId: "p7_be_considerate",
    type: "single",
    difficulty: 2,
    prompt: "What is the best way to handle music in shared outdoor spaces?",
    choices: [
      { id: "a", text: "Play it quietly so you can still hear birds." },
      { id: "b", text: "Use headphones or keep it off." },
      { id: "c", text: "Play it louder so others know your taste." },
      { id: "d", text: "Only play music at sunrise." },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "Even low music can travel far, especially across water or open areas.",
    tags: ["noise"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p7_q3",
    moduleId: "lnt_7_principles",
    principleId: "p7_be_considerate",
    type: "single",
    difficulty: 2,
    prompt:
      "On a narrow trail, what is a good etiquette move when others are passing?",
    choices: [
      { id: "a", text: "Spread out so your group takes up more space." },
      {
        id: "b",
        text: "Step aside on durable ground and let others pass safely.",
      },
      { id: "c", text: "Speed up and pass them closely." },
      { id: "d", text: "Yell so they know you are coming." },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "Yielding politely reduces trail widening and keeps everyone safer.",
    tags: ["trail_etiquette"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p7_q4",
    moduleId: "lnt_7_principles",
    principleId: "p7_be_considerate",
    type: "single",
    difficulty: 2,
    prompt: "Why should pets be leashed in most parks and campgrounds?",
    choices: [
      {
        id: "a",
        text: "To protect wildlife, other campers, and your pet.",
      },
      { id: "b", text: "So your pet does not get bored." },
      { id: "c", text: "So your pet walks faster." },
      { id: "d", text: "Because leashes keep tents warmer." },
    ],
    correctChoiceIds: ["a"],
    explanation:
      "Off-leash pets can chase wildlife, disturb other campers, and get lost or injured.",
    tags: ["pets"],
    shuffleChoices: true,
    isActive: true,
  },
  {
    id: "lnt_p7_q5",
    moduleId: "lnt_7_principles",
    principleId: "p7_be_considerate",
    type: "tf",
    difficulty: 2,
    prompt:
      "Bright lanterns at night are fine as long as you stay at your site.",
    choices: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
    correctChoiceIds: ["f"],
    explanation:
      "Light pollution affects other campers and can disrupt wildlife. Use lower light when possible.",
    tags: ["light"],
    shuffleChoices: false,
    isActive: true,
  },
  {
    id: "lnt_p7_q6",
    moduleId: "lnt_7_principles",
    principleId: "p7_be_considerate",
    type: "scenario",
    difficulty: 3,
    prompt:
      "Another group is being loud late at night. What is a good first step?",
    choices: [
      { id: "a", text: "Start yelling back so they stop." },
      {
        id: "b",
        text: "Politely ask them to lower the noise, then involve staff if needed.",
      },
      { id: "c", text: "Throw something near their campsite." },
      { id: "d", text: "Turn your music up louder." },
    ],
    correctChoiceIds: ["b"],
    explanation:
      "Start calm and direct. If it continues, use campground hosts or rangers.",
    tags: ["conflict"],
    shuffleChoices: true,
    isActive: true,
  },
];

/**
 * Quiz configuration for the LNT final assessment
 */
export const LNT_QUIZ_CONFIG = {
  totalQuestions: 12,
  minPerPrinciple: 1,
  passPercent: 80,
  shuffleQuestions: true,
  shuffleChoices: true,
  // Weight more questions toward waste (p3) and fire (p5)
  weightedPrinciples: ["p3_dispose_waste_properly", "p5_campfire_impacts"],
};

/**
 * Get questions grouped by principle
 */
export function getQuestionsByPrinciple(): Record<string, LNTQuestion[]> {
  const grouped: Record<string, LNTQuestion[]> = {};
  for (const q of LNT_QUESTION_BANK) {
    if (!grouped[q.principleId]) {
      grouped[q.principleId] = [];
    }
    grouped[q.principleId].push(q);
  }
  return grouped;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate a randomized quiz from the question bank
 * - At least 1 question from each principle
 * - Remaining slots weighted toward p3 and p5
 */
export function generateLNTQuiz(): LNTQuestion[] {
  const config = LNT_QUIZ_CONFIG;
  const byPrinciple = getQuestionsByPrinciple();
  const principleIds = Object.keys(byPrinciple);

  const selectedQuestions: LNTQuestion[] = [];
  const usedIds = new Set<string>();

  // Step 1: Pick at least 1 from each principle
  for (const principleId of principleIds) {
    const available = byPrinciple[principleId].filter(
      (q) => q.isActive && !usedIds.has(q.id)
    );
    if (available.length > 0) {
      const shuffled = shuffleArray(available);
      const picked = shuffled[0];
      selectedQuestions.push(picked);
      usedIds.add(picked.id);
    }
  }

  // Step 2: Fill remaining slots
  const remaining = config.totalQuestions - selectedQuestions.length;

  if (remaining > 0) {
    // Create weighted pool: add extra copies of weighted principles
    let pool: LNTQuestion[] = [];
    for (const principleId of principleIds) {
      const available = byPrinciple[principleId].filter(
        (q) => q.isActive && !usedIds.has(q.id)
      );
      pool = pool.concat(available);

      // Add extra copies for weighted principles
      if (config.weightedPrinciples.includes(principleId)) {
        pool = pool.concat(available); // double the weight
      }
    }

    const shuffledPool = shuffleArray(pool);
    for (const q of shuffledPool) {
      if (selectedQuestions.length >= config.totalQuestions) break;
      if (!usedIds.has(q.id)) {
        selectedQuestions.push(q);
        usedIds.add(q.id);
      }
    }
  }

  // Step 3: Shuffle final order
  const finalQuestions = shuffleArray(selectedQuestions);

  // Step 4: Shuffle choices for each question if configured
  if (config.shuffleChoices) {
    for (const q of finalQuestions) {
      if (q.shuffleChoices) {
        q.choices = shuffleArray(q.choices);
      }
    }
  }

  return finalQuestions;
}

/**
 * Calculate quiz results
 */
export interface QuizResult {
  passed: boolean;
  score: number;
  totalQuestions: number;
  percentCorrect: number;
  missedQuestions: LNTQuestion[];
  missedPrinciples: string[];
}

export function calculateQuizResult(
  questions: LNTQuestion[],
  answers: Record<string, string[]>
): QuizResult {
  let correctCount = 0;
  const missedQuestions: LNTQuestion[] = [];
  const missedPrincipleSet = new Set<string>();

  for (const q of questions) {
    const userAnswers = answers[q.id] || [];
    const correctIds = q.correctChoiceIds;

    // Check if answers match (order-independent for multi-select)
    const isCorrect =
      userAnswers.length === correctIds.length &&
      userAnswers.every((a) => correctIds.includes(a));

    if (isCorrect) {
      correctCount++;
    } else {
      missedQuestions.push(q);
      missedPrincipleSet.add(q.principleId);
    }
  }

  const percentCorrect = Math.round((correctCount / questions.length) * 100);

  return {
    passed: percentCorrect >= LNT_QUIZ_CONFIG.passPercent,
    score: correctCount,
    totalQuestions: questions.length,
    percentCorrect,
    missedQuestions,
    missedPrinciples: Array.from(missedPrincipleSet),
  };
}
