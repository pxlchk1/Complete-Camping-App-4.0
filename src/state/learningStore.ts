import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type StepType = "article" | "quiz" | "checklist";
export type StepStatus = "not_started" | "in_progress" | "completed";
export type SkillLevel = "novice" | "intermediate" | "master";

export interface LearningStep {
  id: string;
  title: string;
  type: StepType;
  content: string;
  duration?: number;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  steps: LearningStep[];
  category: string;
  trackId?: SkillLevel;
  xpReward?: number;
  badge?: {
    id: string;
    name: string;
    description: string;
    icon: string;
  };
}

export interface LearningTrack {
  id: string;
  level: SkillLevel;
  title: string;
  description: string;
  badge: string;
  xpRequired: number;
  moduleIds: string[];
}

export interface ModuleProgress {
  moduleId: string;
  status: StepStatus;
  startedAt: string;
  completedAt?: string;
  steps: { [stepId: string]: { stepId: string; status: StepStatus; completedAt?: string } };
}

export interface UserProgress {
  totalXP: number;
  currentLevel: number;
  unlockedTracks: SkillLevel[];
  completedModules: string[];
  earnedBadges: string[];
}

export interface Badge {
  id: string;
  trackId: SkillLevel;
  name: string;
  description: string;
  icon: string;
}

export const BADGES: Badge[] = [
  {
    id: "weekend-camper-badge",
    trackId: "novice",
    name: "Weekend Camper",
    description:
      "You built a strong foundation for the outdoors. You know how to plan a simple trip, set up camp, stay warm, read a map, follow Leave No Trace, and keep yourself safe.",
    icon: "lantern",
  },
  {
    id: "trail-leader-badge",
    trackId: "intermediate",
    name: "Trail Leader",
    description:
      "You can guide a group with confidence. You understand terrain, weather, pacing, camp design, safety, water, and navigation at a solid leader level.",
    icon: "trail-sign",
  },
  {
    id: "backcountry-guide-badge",
    trackId: "master",
    name: "Backcountry Guide",
    description:
      "You move comfortably in deep wilderness. You know advanced navigation, weather, water, shelter, first aid, group dynamics, and decision making. You are a true backcountry guide.",
    icon: "mountain",
  },
];

interface LearningState {
  modules: LearningModule[];
  tracks: LearningTrack[];
  progress: { [moduleId: string]: ModuleProgress };
  userProgress: UserProgress;

  getModuleById: (id: string) => LearningModule | undefined;
  getModulesByTrack: (trackId: SkillLevel) => LearningModule[];
  getModuleProgress: (moduleId: string) => ModuleProgress | undefined;
  calculateModuleProgress: (moduleId: string) => {
    completed: number;
    total: number;
    percentage: number;
  };
  calculateTrackProgress: (trackId: SkillLevel) => {
    completed: number;
    total: number;
    percentage: number;
    xpEarned: number;
    xpTotal: number;
  };
  isModuleCompleted: (moduleId: string) => boolean;
  isTrackUnlocked: (trackId: SkillLevel) => boolean;
  isTrackCompleted: (trackId: SkillLevel) => boolean;
  getCompletedModules: () => string[];
  getTotalXP: () => number;
  getCurrentLevel: () => number;
  getEarnedBadges: () => Badge[];
  hasBadge: (badgeId: string) => boolean;
  checkAndAwardBadges: () => void;
  completeStep: (moduleId: string, stepId: string) => void;
}

// Import expanded LNT module content
import { getLNTExpandedModule } from "../data/lntModuleContent";

// Get the expanded LNT module
const LNT_EXPANDED_MODULE = getLNTExpandedModule();

const DEFAULT_MODULES: LearningModule[] = [
  // Use expanded LNT module
  LNT_EXPANDED_MODULE as LearningModule,
  {
    id: "first-trip",
    title: "How to Plan Your First Camping Trip",
    description: "Planning makes your first trip feel calm instead of chaotic",
    icon: "calendar",
    difficulty: "Beginner",
    duration: "15 min",
    category: "basics",
    trackId: "novice",
    xpReward: 40,
    steps: [
      {
        id: "first-1",
        title: "Introduction",
        type: "article",
        content: "Planning makes your first trip feel calm instead of chaotic. Start small and keep the focus on comfort.",
        duration: 2,
      },
      {
        id: "first-2",
        title: "Pick Your Dates",
        type: "article",
        content: "Choose one or two nights. Avoid extreme heat or deep cold. Check sunrise and sunset so you have plenty of daylight for setup.",
        duration: 2,
      },
      {
        id: "first-3",
        title: "Choose a Campground",
        type: "article",
        content: "Pick a simple, drive up site with bathrooms. Check for potable water, fire rules, and quiet hours. Look at photos posted by campers.",
        duration: 2,
      },
      {
        id: "first-4",
        title: "Plan Your Meals",
        type: "article",
        content: "Keep it easy. Sandwiches, pasta, oatmeal. Have a backup if it rains. Bring snacks that do not require cooking.",
        duration: 2,
      },
      {
        id: "first-5",
        title: "Back at Home Checklist",
        type: "article",
        content: "Check your gear. Test your stove. Make sure you have the right sleeping bag. Charge your lights.",
        duration: 2,
      },
      {
        id: "first-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "How long should your first trip be?",
              options: ["One or two nights", "A full week"],
              correctAnswer: 0,
            },
            {
              question: "Should you pick complicated meals on your first trip?",
              options: ["Yes", "No"],
              correctAnswer: 1,
            },
          ],
        }),
        duration: 3,
      },
    ],
  },
  {
    id: "choosing-tent",
    title: "Choosing a Tent",
    description: "A few smart choices make a big difference",
    icon: "home",
    difficulty: "Beginner",
    duration: "12 min",
    category: "gear",
    trackId: "novice",
    xpReward: 35,
    steps: [
      {
        id: "tent-1",
        title: "Introduction",
        type: "article",
        content: "Your tent is your tiny home for the night. A few smart choices make a big difference.",
        duration: 2,
      },
      {
        id: "tent-2",
        title: "Size Choices",
        type: "article",
        content: "A two person tent fits two people only if nobody moves. Choose a larger size than you think you need.",
        duration: 2,
      },
      {
        id: "tent-3",
        title: "Three Season vs Four Season",
        type: "article",
        content: "Most beginners need a three season tent. It handles spring, summer, and fall weather.",
        duration: 2,
      },
      {
        id: "tent-4",
        title: "Doors and Vestibules",
        type: "article",
        content: "More doors mean easier exits at night. Vestibules give you covered storage.",
        duration: 2,
      },
      {
        id: "tent-5",
        title: "Practice at Home",
        type: "article",
        content: "Do a test pitch in your yard or living room.",
        duration: 1,
      },
      {
        id: "tent-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "Is a two person tent comfortable for two?",
              options: ["Usually no", "Always yes"],
              correctAnswer: 0,
            },
            {
              question: "What tent type should a beginner choose?",
              options: ["Four season", "Three season"],
              correctAnswer: 1,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "pitching-tent",
    title: "Pitching a Tent",
    description: "Once you learn it, every tent starts to make sense",
    icon: "construct",
    difficulty: "Beginner",
    duration: "15 min",
    category: "basics",
    trackId: "novice",
    xpReward: 40,
    steps: [
      {
        id: "pitch-1",
        title: "Introduction",
        type: "article",
        content: "Pitching a tent is a simple pattern. Once you learn it, every tent starts to make sense.",
        duration: 2,
      },
      {
        id: "pitch-2",
        title: "Pick Your Spot",
        type: "article",
        content: "Level ground. No rocks or roots. Avoid dips where water collects.",
        duration: 2,
      },
      {
        id: "pitch-3",
        title: "Lay Out the Footprint",
        type: "article",
        content: "It protects the floor and helps you place the tent straight.",
        duration: 2,
      },
      {
        id: "pitch-4",
        title: "Build the Frame",
        type: "article",
        content: "Assemble the poles. Slide them into the sleeves or clips. The tent will lift as you go.",
        duration: 2,
      },
      {
        id: "pitch-5",
        title: "Stake and Tension",
        type: "article",
        content: "Stake each corner. Adjust straps so the fabric is smooth.",
        duration: 2,
      },
      {
        id: "pitch-6",
        title: "Add the Rainfly",
        type: "article",
        content: "Clip or buckle the fly into place. Adjust for good airflow.",
        duration: 2,
      },
      {
        id: "pitch-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What is the first thing you put down?",
              options: ["Rainfly", "Footprint"],
              correctAnswer: 1,
            },
            {
              question: "Why do we look for level ground?",
              options: ["For comfort and dryness", "To be fancy"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "sleep-system",
    title: "Sleep System Basics",
    description: "Being warm and comfortable is the key to happy camping",
    icon: "bed",
    difficulty: "Beginner",
    duration: "12 min",
    category: "gear",
    trackId: "novice",
    xpReward: 35,
    steps: [
      {
        id: "sleep-1",
        title: "Introduction",
        type: "article",
        content: "Being warm and comfortable is the key to happy camping.",
        duration: 2,
      },
      {
        id: "sleep-2",
        title: "Sleeping Pad",
        type: "article",
        content: "The pad matters more than the bag. Look at R value. Higher numbers mean warmer nights.",
        duration: 2,
      },
      {
        id: "sleep-3",
        title: "Sleeping Bag",
        type: "article",
        content: "Choose a temperature rating about ten degrees colder than the lowest expected temp.",
        duration: 2,
      },
      {
        id: "sleep-4",
        title: "Clothing at Night",
        type: "article",
        content: "Wear dry layers. A hat helps. Fresh socks warm your feet.",
        duration: 2,
      },
      {
        id: "sleep-5",
        title: "Little Warm Boosts",
        type: "article",
        content: "Eat something warm before bed. Add a fleece under your hips. Keep your bag lofted.",
        duration: 2,
      },
      {
        id: "sleep-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What matters more for warmth?",
              options: ["The sleeping bag", "The sleeping pad"],
              correctAnswer: 1,
            },
            {
              question: "Should your night layers be dry?",
              options: ["Yes", "No"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "stay-warm-dry",
    title: "How to Stay Warm and Dry",
    description: "You can be ready for almost anything with a few simple habits",
    icon: "umbrella",
    difficulty: "Beginner",
    duration: "12 min",
    category: "basics",
    trackId: "novice",
    xpReward: 35,
    steps: [
      {
        id: "warm-1",
        title: "Introduction",
        type: "article",
        content: "Weather is a mood setter. You can be ready for almost anything with a few simple habits.",
        duration: 2,
      },
      {
        id: "warm-2",
        title: "Layering",
        type: "article",
        content: "Use a base layer, warm layer, and shell. Adjust as needed.",
        duration: 2,
      },
      {
        id: "warm-3",
        title: "Rain Setup",
        type: "article",
        content: "Have a dry place for gear. Keep clothes in bags. Vent your tent to avoid condensation.",
        duration: 2,
      },
      {
        id: "warm-4",
        title: "Heat Loss Basics",
        type: "article",
        content: "Most heat escapes from your head and feet.",
        duration: 2,
      },
      {
        id: "warm-5",
        title: "Drying Wet Gear",
        type: "article",
        content: "Hang items where air flows. Do not dry socks inside your sleeping bag.",
        duration: 2,
      },
      {
        id: "warm-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What is the key to comfort in cold weather?",
              options: ["Layering", "One heavy jacket"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "camp-kitchen",
    title: "Camp Kitchen Basics",
    description: "A simple kitchen keeps you fed and happy",
    icon: "restaurant",
    difficulty: "Beginner",
    duration: "12 min",
    category: "basics",
    trackId: "novice",
    xpReward: 35,
    steps: [
      {
        id: "kitchen-1",
        title: "Introduction",
        type: "article",
        content: "A simple kitchen keeps you fed and happy.",
        duration: 2,
      },
      {
        id: "kitchen-2",
        title: "Heat Source",
        type: "article",
        content: "Choose a small stove. Bring extra fuel.",
        duration: 2,
      },
      {
        id: "kitchen-3",
        title: "Cookware",
        type: "article",
        content: "One pot. One pan. A good spoon or spatula.",
        duration: 2,
      },
      {
        id: "kitchen-4",
        title: "Food Storage",
        type: "article",
        content: "Use a cooler or dry box. Keep critters out.",
        duration: 2,
      },
      {
        id: "kitchen-5",
        title: "Clean Up",
        type: "article",
        content: "Use small amounts of soap. Scatter grey water away from camp.",
        duration: 2,
      },
      {
        id: "kitchen-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "How many pots does a beginner need?",
              options: ["One", "Three"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "pack-smart",
    title: "How to Pack Smart",
    description: "Packing feels easier once you learn the rhythm",
    icon: "bag-handle",
    difficulty: "Beginner",
    duration: "12 min",
    category: "basics",
    trackId: "novice",
    xpReward: 35,
    steps: [
      {
        id: "pack-1",
        title: "Introduction",
        type: "article",
        content: "Packing feels easier once you learn the rhythm.",
        duration: 2,
      },
      {
        id: "pack-2",
        title: "Heavy Items",
        type: "article",
        content: "Keep them low and stable.",
        duration: 2,
      },
      {
        id: "pack-3",
        title: "Clothing",
        type: "article",
        content: "Pack outfits in bags. Keep one dry set for sleeping.",
        duration: 2,
      },
      {
        id: "pack-4",
        title: "Gear Placement",
        type: "article",
        content: "Food together. Tools together. Kitchen gear together.",
        duration: 2,
      },
      {
        id: "pack-5",
        title: "Last Minute Check",
        type: "article",
        content: "Headlamp. Water. Warm layers. Navigation.",
        duration: 2,
      },
      {
        id: "pack-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "Should you keep a dry night outfit?",
              options: ["Yes", "No"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "campfire-safety",
    title: "How to Start a Campfire Safely",
    description: "A fire is comforting but needs respect",
    icon: "flame",
    difficulty: "Beginner",
    duration: "12 min",
    category: "basics",
    trackId: "novice",
    xpReward: 35,
    steps: [
      {
        id: "fire-1",
        title: "Introduction",
        type: "article",
        content: "A fire is comforting but needs respect.",
        duration: 2,
      },
      {
        id: "fire-2",
        title: "Fire Rules",
        type: "article",
        content: "Only build where allowed. Use established rings.",
        duration: 2,
      },
      {
        id: "fire-3",
        title: "Fire Building",
        type: "article",
        content: "Start with tinder, then kindling, then larger wood.",
        duration: 2,
      },
      {
        id: "fire-4",
        title: "Safety",
        type: "article",
        content: "Never leave it alone. Keep water nearby.",
        duration: 2,
      },
      {
        id: "fire-5",
        title: "Extinguish",
        type: "article",
        content: "Drown it. Stir it. Drown it again.",
        duration: 2,
      },
      {
        id: "fire-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "Can you leave a fire unattended?",
              options: ["Yes", "Never"],
              correctAnswer: 1,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "first-aid",
    title: "Basic First Aid for Campers",
    description: "A few simple steps help in most situations",
    icon: "medical",
    difficulty: "Beginner",
    duration: "12 min",
    category: "safety",
    trackId: "novice",
    xpReward: 35,
    steps: [
      {
        id: "aid-1",
        title: "Introduction",
        type: "article",
        content: "You do not need to be a medic. A few simple steps help in most situations.",
        duration: 2,
      },
      {
        id: "aid-2",
        title: "Small Cuts",
        type: "article",
        content: "Clean with water. Add a bandage.",
        duration: 2,
      },
      {
        id: "aid-3",
        title: "Burns",
        type: "article",
        content: "Cool with water. Cover loosely.",
        duration: 2,
      },
      {
        id: "aid-4",
        title: "Sprains",
        type: "article",
        content: "Rest. Ice or cool water. Wrap lightly.",
        duration: 2,
      },
      {
        id: "aid-5",
        title: "When to Seek Help",
        type: "article",
        content: "Heavy bleeding. Confusion. Trouble breathing.",
        duration: 2,
      },
      {
        id: "aid-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What should you put on a fresh burn?",
              options: ["Butter", "Cool water"],
              correctAnswer: 1,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "navigation",
    title: "Navigation 101",
    description: "Navigation builds confidence",
    icon: "compass",
    difficulty: "Beginner",
    duration: "12 min",
    category: "basics",
    trackId: "novice",
    xpReward: 35,
    steps: [
      {
        id: "nav-1",
        title: "Introduction",
        type: "article",
        content: "Navigation builds confidence.",
        duration: 2,
      },
      {
        id: "nav-2",
        title: "Maps",
        type: "article",
        content: "Carry a paper map when possible.",
        duration: 2,
      },
      {
        id: "nav-3",
        title: "Compass",
        type: "article",
        content: "Learn basic direction. Practice at home.",
        duration: 2,
      },
      {
        id: "nav-4",
        title: "Trails",
        type: "article",
        content: "Follow signs. Check junctions twice.",
        duration: 2,
      },
      {
        id: "nav-5",
        title: "Phones",
        type: "article",
        content: "Useful but batteries die. Keep a backup.",
        duration: 2,
      },
      {
        id: "nav-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "Should you rely only on your phone?",
              options: ["Yes", "No"],
              correctAnswer: 1,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "etiquette",
    title: "Campsite Etiquette",
    description: "Being a good neighbor makes camping better for everyone",
    icon: "people",
    difficulty: "Beginner",
    duration: "12 min",
    category: "ethics",
    trackId: "novice",
    xpReward: 35,
    steps: [
      {
        id: "etiq-1",
        title: "Introduction",
        type: "article",
        content: "Being a good neighbor makes camping better for everyone.",
        duration: 2,
      },
      {
        id: "etiq-2",
        title: "Noise",
        type: "article",
        content: "Keep voices low at night.",
        duration: 2,
      },
      {
        id: "etiq-3",
        title: "Lights",
        type: "article",
        content: "Use dim lights. Avoid blinding other campers.",
        duration: 2,
      },
      {
        id: "etiq-4",
        title: "Space",
        type: "article",
        content: "Respect boundaries. Do not cut through other sites.",
        duration: 2,
      },
      {
        id: "etiq-5",
        title: "Cleanliness",
        type: "article",
        content: "Pack out everything.",
        duration: 2,
      },
      {
        id: "etiq-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "Should you walk through someone else's site?",
              options: ["Yes", "No"],
              correctAnswer: 1,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "first-night",
    title: "What to Expect on Your First Night",
    description: "The first night feels exciting and a little strange",
    icon: "moon",
    difficulty: "Beginner",
    duration: "12 min",
    category: "basics",
    trackId: "novice",
    xpReward: 35,
    steps: [
      {
        id: "night-1",
        title: "Introduction",
        type: "article",
        content: "The first night feels exciting and a little strange. This is normal.",
        duration: 2,
      },
      {
        id: "night-2",
        title: "Sounds",
        type: "article",
        content: "Nature can be loud. Most noises are harmless.",
        duration: 2,
      },
      {
        id: "night-3",
        title: "Comfort",
        type: "article",
        content: "It may take time to settle in. Adjust your layers.",
        duration: 2,
      },
      {
        id: "night-4",
        title: "Night Routine",
        type: "article",
        content: "Brush teeth. Use the restroom. Check your gear.",
        duration: 2,
      },
      {
        id: "night-5",
        title: "Morning",
        type: "article",
        content: "Mornings are magic. Enjoy the slow start.",
        duration: 2,
      },
      {
        id: "night-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "Are strange sounds normal your first night?",
              options: ["Yes", "No"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "multi-day-planning",
    title: "Planning a Multi-Day Trip",
    description: "A multi-day trip asks more from you than a casual overnight",
    icon: "map",
    difficulty: "Intermediate",
    duration: "15 min",
    category: "planning",
    trackId: "intermediate",
    xpReward: 50,
    steps: [
      {
        id: "multi-1",
        title: "Introduction",
        type: "article",
        content: "A multi day trip asks more from you than a casual overnight. You are thinking about distance, weather windows, water sources, food weight, and how everyone in your group will handle the terrain. Planning well turns a long trip into a calm, steady experience instead of a scramble.",
        duration: 2,
      },
      {
        id: "multi-2",
        title: "Set the Right Scope",
        type: "article",
        content: "Start by choosing the total number of nights, then pick a route that fits your slowest hiker. Beginners often overestimate their pace. A good goal is six to eight miles per day on normal terrain. Shorter days give you time to settle into camp before dark.",
        duration: 3,
      },
      {
        id: "multi-3",
        title: "Research the Route",
        type: "article",
        content: "Study maps, ranger reports, recent trip logs, and trail closures. Look for river crossings, steep climbs, exposed ridges, or long dry segments. Make notes about where you can camp and where water is available.",
        duration: 3,
      },
      {
        id: "multi-4",
        title: "Build a Realistic Timeline",
        type: "article",
        content: "Break each day into sections. Start time. Expected pace. Meal breaks. Landmarks. Camp setup time. Build in buffer for weather and fatigue.",
        duration: 3,
      },
      {
        id: "multi-5",
        title: "Create a Communication Plan",
        type: "article",
        content: "Share your route, group names, car plate numbers, and your expected return day with someone at home. Set simple rules for group communication on the trail. For example, no one hikes alone.",
        duration: 2,
      },
      {
        id: "multi-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What is a good daily mileage goal for beginners?",
              options: ["Three to five miles", "Six to eight miles", "Fifteen miles"],
              correctAnswer: 1,
            },
            {
              question: "Should you rely only on a single map?",
              options: ["No", "Yes"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "terrain-ratings",
    title: "Understanding Terrain and Trail Ratings",
    description: "Terrain shapes the whole experience",
    icon: "trending-up",
    difficulty: "Intermediate",
    duration: "15 min",
    category: "skills",
    trackId: "intermediate",
    xpReward: 50,
    steps: [
      {
        id: "terrain-1",
        title: "Introduction",
        type: "article",
        content: "Terrain shapes the whole experience. A three mile hike on flat forest trails is not the same as a three mile hike with steep climbs or loose rock. Learning how to read and interpret terrain helps you choose the right route for your group.",
        duration: 2,
      },
      {
        id: "terrain-2",
        title: "Elevation Gain",
        type: "article",
        content: "The number that surprises most new hikers is total elevation gain. Five hundred feet of climbing feels noticeable. One thousand feet starts to test people. Breaks help, but the best tool is pacing.",
        duration: 3,
      },
      {
        id: "terrain-3",
        title: "Trail Surface",
        type: "article",
        content: "Trails can be smooth dirt, packed gravel, loose rock, sand, mud, or uneven roots. Each surface requires a different walking rhythm. Wet roots are slick. Sand drains energy. Scree fields demand slow, careful steps.",
        duration: 3,
      },
      {
        id: "terrain-4",
        title: "Exposure",
        type: "article",
        content: "Exposure means how much of the trail leaves you out in the open. It may mean steep drops near the trail edge or long stretches without tree cover. Exposure is not a problem if you know it is coming and plan breaks.",
        duration: 3,
      },
      {
        id: "terrain-5",
        title: "Technical Sections",
        type: "article",
        content: "Some trails have ladders, boulders, narrow ledges, or water crossings. These require group communication and patient movement. Leaders guide one person at a time through these areas.",
        duration: 2,
      },
      {
        id: "terrain-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What trail factor often surprises beginners most?",
              options: ["Mileage", "Elevation gain"],
              correctAnswer: 1,
            },
            {
              question: "What surface is most slippery when wet?",
              options: ["Roots", "Sand", "Gravel"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "backcountry-weather",
    title: "Reading Weather in the Backcountry",
    description: "Weather decides the mood of your trip",
    icon: "cloud",
    difficulty: "Intermediate",
    duration: "12 min",
    category: "skills",
    trackId: "intermediate",
    xpReward: 45,
    steps: [
      {
        id: "weather-1",
        title: "Introduction",
        type: "article",
        content: "Weather decides the mood of your trip. Knowing how to read signs in the sky helps you avoid surprises and make safe decisions.",
        duration: 2,
      },
      {
        id: "weather-2",
        title: "Clouds and Color",
        type: "article",
        content: "Flat grey clouds usually bring steady rain. Tall towering clouds may signal storms. A green tint in storm clouds can indicate hail. A glowing red sunrise often hints at incoming weather.",
        duration: 3,
      },
      {
        id: "weather-3",
        title: "Wind Patterns",
        type: "article",
        content: "Wind that suddenly changes direction or speed can mean a weather shift. Strong gusts before a storm are common.",
        duration: 2,
      },
      {
        id: "weather-4",
        title: "Temperature Drops",
        type: "article",
        content: "Quick cooling in late afternoon can mean a storm approaching. Carry layers where they are easy to reach.",
        duration: 2,
      },
      {
        id: "weather-5",
        title: "Local Advice",
        type: "article",
        content: "Rangers and local hikers often know how weather behaves in a specific valley or ridge. Their knowledge is gold.",
        duration: 2,
      },
      {
        id: "weather-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What does a fast temperature drop often signal?",
              options: ["Strong sun", "Approaching weather"],
              correctAnswer: 1,
            },
            {
              question: "What cloud shape may show storm activity?",
              options: ["Flat", "Towering"],
              correctAnswer: 1,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "efficient-campsite",
    title: "Building a Safe and Efficient Campsite",
    description: "A good campsite keeps you comfortable, dry, and organized",
    icon: "home",
    difficulty: "Intermediate",
    duration: "12 min",
    category: "skills",
    trackId: "intermediate",
    xpReward: 45,
    steps: [
      {
        id: "camp-1",
        title: "Introduction",
        type: "article",
        content: "A good campsite keeps you comfortable, dry, and organized. A bad one keeps you awake all night.",
        duration: 2,
      },
      {
        id: "camp-2",
        title: "Tent Placement",
        type: "article",
        content: "Choose high ground that drains well. Stay clear of narrow valleys and dry creek beds. Avoid overhead hazards like dead limbs.",
        duration: 2,
      },
      {
        id: "camp-3",
        title: "Kitchen Setup",
        type: "article",
        content: "Keep your cooking area away from the tents. Aim for fifty to one hundred feet. This reduces food smells near sleeping areas.",
        duration: 2,
      },
      {
        id: "camp-4",
        title: "Gear Zones",
        type: "article",
        content: "Create a clean walking path. Place food, kitchen, and personal gear in consistent spots for the whole trip. This reduces confusion and nighttime searching.",
        duration: 2,
      },
      {
        id: "camp-5",
        title: "Wind and Rain Plans",
        type: "article",
        content: "Stake out and tension your rainfly. Face the tent door away from the strongest wind. Secure loose gear before bed.",
        duration: 2,
      },
      {
        id: "camp-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "Where should the kitchen be located?",
              options: ["Right next to the tent", "Fifty to one hundred feet away"],
              correctAnswer: 1,
            },
            {
              question: "What is the biggest nighttime hazard above a tent?",
              options: ["A healthy tree", "Dead branches"],
              correctAnswer: 1,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "water-safety",
    title: "Water Safety and Purification",
    description: "Water keeps your group healthy and moving",
    icon: "water",
    difficulty: "Intermediate",
    duration: "12 min",
    category: "safety",
    trackId: "intermediate",
    xpReward: 45,
    steps: [
      {
        id: "water-1",
        title: "Introduction",
        type: "article",
        content: "Water keeps your group healthy and moving. Leaders must know where to find it, how to treat it, and how much to carry.",
        duration: 2,
      },
      {
        id: "water-2",
        title: "Finding Water Sources",
        type: "article",
        content: "Look for streams, lakes, or springs. Research water points before you leave. Some dry up late in the season.",
        duration: 2,
      },
      {
        id: "water-3",
        title: "Treating Water",
        type: "article",
        content: "Use a filter, purifier, or chemical treatment. Clear water still needs treatment. Do not skip this step.",
        duration: 2,
      },
      {
        id: "water-4",
        title: "Carrying Enough",
        type: "article",
        content: "Warm days need more water. Plan one half liter per hour of hiking and more if the trail is steep or exposed.",
        duration: 2,
      },
      {
        id: "water-5",
        title: "Group Water Strategy",
        type: "article",
        content: "Leaders monitor how much everyone is drinking. Lightheadedness, headaches, and dark urine signal dehydration.",
        duration: 2,
      },
      {
        id: "water-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "Does clear water still need treatment?",
              options: ["Yes", "No"],
              correctAnswer: 0,
            },
            {
              question: "How much water should you drink while hiking?",
              options: ["One half liter per hour", "One cup per day"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "leading-group",
    title: "Leading a Group on the Trail",
    description: "A trail leader sets a calm tone",
    icon: "people",
    difficulty: "Intermediate",
    duration: "12 min",
    category: "leadership",
    trackId: "intermediate",
    xpReward: 45,
    steps: [
      {
        id: "lead-1",
        title: "Introduction",
        type: "article",
        content: "A trail leader sets a calm tone. Your pace, communication, and decisions shape the experience for everyone else.",
        duration: 2,
      },
      {
        id: "lead-2",
        title: "Setting Pace",
        type: "article",
        content: "Hike at the speed of your slowest member. This keeps the group unified and avoids burnout.",
        duration: 2,
      },
      {
        id: "lead-3",
        title: "Spacing and Order",
        type: "article",
        content: "Leaders walk in front. A steady hiker stays in the back to make sure no one falls behind. Keep enough space for each person to move safely.",
        duration: 2,
      },
      {
        id: "lead-4",
        title: "Break Strategy",
        type: "article",
        content: "Short breaks often work better than long ones. Use them to adjust layers, drink water, and check the map.",
        duration: 2,
      },
      {
        id: "lead-5",
        title: "Encouragement",
        type: "article",
        content: "Confidence spreads. Leaders offer steady, quiet support. No shouting. No rushing.",
        duration: 2,
      },
      {
        id: "lead-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "Whose pace should set the speed?",
              options: ["The fastest person", "The slowest person"],
              correctAnswer: 1,
            },
            {
              question: "Who should bring up the back?",
              options: ["A strong, steady hiker", "The least experienced hiker"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "backcountry-cooking",
    title: "Backcountry Cooking and Fuel Management",
    description: "Long trips need simple food routines",
    icon: "flame",
    difficulty: "Intermediate",
    duration: "12 min",
    category: "skills",
    trackId: "intermediate",
    xpReward: 45,
    steps: [
      {
        id: "cook-1",
        title: "Introduction",
        type: "article",
        content: "Long trips need simple food routines that keep energy high and packs light.",
        duration: 2,
      },
      {
        id: "cook-2",
        title: "Meal Planning",
        type: "article",
        content: "Plan meals by day. Breakfast should be fast. Lunch should require little cooking. Dinner can be warm and filling.",
        duration: 2,
      },
      {
        id: "cook-3",
        title: "Fuel Use",
        type: "article",
        content: "Different stoves burn at different rates. Estimate fuel needs based on boil times. Bring a small extra amount for cold weather.",
        duration: 2,
      },
      {
        id: "cook-4",
        title: "Food Weight",
        type: "article",
        content: "Dehydrated meals and simple ingredients keep weight low. Heavy items add up fast on multi day trips.",
        duration: 2,
      },
      {
        id: "cook-5",
        title: "Clean Up",
        type: "article",
        content: "Keep a small soap bottle and a scrubber. Be gentle with water sources. Scatter strained grey water away from camp.",
        duration: 2,
      },
      {
        id: "cook-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What meal should stay fast and simple?",
              options: ["Breakfast", "Dinner"],
              correctAnswer: 0,
            },
            {
              question: "Should you carry a little extra fuel?",
              options: ["Yes", "No"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "risk-management",
    title: "Managing Risk and Emergencies",
    description: "Leaders stay aware and calm",
    icon: "alert-circle",
    difficulty: "Intermediate",
    duration: "12 min",
    category: "safety",
    trackId: "intermediate",
    xpReward: 45,
    steps: [
      {
        id: "risk-1",
        title: "Introduction",
        type: "article",
        content: "Leaders stay aware and calm. Most risks can be managed with simple habits.",
        duration: 2,
      },
      {
        id: "risk-2",
        title: "Common Risks",
        type: "article",
        content: "Heat, cold, water crossings, unstable rock, lightning, fatigue, and dehydration. Knowing these helps you prevent them.",
        duration: 2,
      },
      {
        id: "risk-3",
        title: "Emergency Basics",
        type: "article",
        content: "Carry a small first aid kit. Know how to clean cuts, treat blisters, cool burns, and support sprains.",
        duration: 2,
      },
      {
        id: "risk-4",
        title: "Decision Making",
        type: "article",
        content: "Turn back if someone is unwell or weather changes fast. Pride has no place in wilderness travel.",
        duration: 2,
      },
      {
        id: "risk-5",
        title: "Communication Tools",
        type: "article",
        content: "Phones, satellite messengers, and paper maps work together. Do not rely on a single tool.",
        duration: 2,
      },
      {
        id: "risk-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "Should pride influence a safety decision?",
              options: ["No", "Yes"],
              correctAnswer: 0,
            },
            {
              question: "What should you carry for emergencies?",
              options: ["A small first aid kit", "Nothing"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "trail-navigation",
    title: "Navigation Skills for Trail Leaders",
    description: "Navigation builds trust",
    icon: "compass",
    difficulty: "Intermediate",
    duration: "15 min",
    category: "skills",
    trackId: "intermediate",
    xpReward: 50,
    steps: [
      {
        id: "nav-adv-1",
        title: "Introduction",
        type: "article",
        content: "Navigation builds trust. When you know where you are, your group relaxes.",
        duration: 2,
      },
      {
        id: "nav-adv-2",
        title: "Reading a Topo Map",
        type: "article",
        content: "Lines close together mean steep terrain. Lines far apart mean gentle grades. Water flows downhill, so look at how lines bend around valleys.",
        duration: 3,
      },
      {
        id: "nav-adv-3",
        title: "Compass Use",
        type: "article",
        content: "Know how to find north. Learn to take a bearing. Practice turning that bearing into a direction of travel.",
        duration: 3,
      },
      {
        id: "nav-adv-4",
        title: "Landmarks",
        type: "article",
        content: "Use mountains, ridges, lakes, and valleys to confirm your position.",
        duration: 2,
      },
      {
        id: "nav-adv-5",
        title: "Tracking Progress",
        type: "article",
        content: "Check the map often. Confirm you are passing landmarks in the right order.",
        duration: 2,
      },
      {
        id: "nav-adv-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What do close contour lines mean?",
              options: ["Steep terrain", "Flat terrain"],
              correctAnswer: 0,
            },
            {
              question: "What helps confirm your location?",
              options: ["Landmarks", "Guessing"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "wildlife-safety",
    title: "Wildlife Awareness and Safety",
    description: "Wildlife is part of the outdoor experience",
    icon: "paw",
    difficulty: "Intermediate",
    duration: "12 min",
    category: "safety",
    trackId: "intermediate",
    xpReward: 45,
    steps: [
      {
        id: "wild-1",
        title: "Introduction",
        type: "article",
        content: "Wildlife is part of the outdoor experience. Leaders help everyone feel safe around it.",
        duration: 2,
      },
      {
        id: "wild-2",
        title: "Food Storage",
        type: "article",
        content: "Use bear canisters or lockers where required. Keep scented items away from sleeping areas.",
        duration: 2,
      },
      {
        id: "wild-3",
        title: "Understanding Behavior",
        type: "article",
        content: "Most animals avoid people. Noise helps prevent surprising them. Leaders talk calmly and give space.",
        duration: 2,
      },
      {
        id: "wild-4",
        title: "Encounters",
        type: "article",
        content: "If an animal is on the trail, give it time to move. Never chase or feed wildlife.",
        duration: 2,
      },
      {
        id: "wild-5",
        title: "Group Safety",
        type: "article",
        content: "Keep the group together at dawn and dusk. These are active times for many animals.",
        duration: 2,
      },
      {
        id: "wild-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "Should you feed wildlife?",
              options: ["No", "Yes"],
              correctAnswer: 0,
            },
            {
              question: "When should the group stay close together?",
              options: ["Dawn and dusk", "Noon"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },

  // BACKCOUNTRY GUIDE (ADVANCED) MODULES
  {
    id: "advanced-route-planning",
    title: "Advanced Route Planning",
    description: "Learn to plan complex routes using maps, satellite imagery, and local beta",
    icon: "map",
    difficulty: "Advanced",
    duration: "20 min",
    category: "planning",
    trackId: "master",
    xpReward: 50,
    steps: [
      {
        id: "advanced-route-intro",
        title: "Introduction",
        type: "article",
        content: "Planning an advanced backcountry route is more than drawing a line on a map. It requires research, critical thinking, local knowledge, and adapting to conditions you cannot control. This module teaches you to plan routes for multi-day wilderness travel, including evaluating terrain, estimating times, planning contingencies, and identifying bail-out points.",
        duration: 2,
      },
      {
        id: "advanced-route-tools",
        title: "Using Maps and Satellite Imagery",
        type: "article",
        content: "Use both topographic maps and satellite imagery to evaluate terrain. Topo maps show elevation and features. Satellite imagery shows vegetation, water, recent burns, and trail visibility. Cross-check multiple sources. Look for seasonal stream flow, snow cover, and route condition reports from recent trip logs.",
        duration: 3,
      },
      {
        id: "advanced-route-contingency",
        title: "Planning for Contingency",
        type: "article",
        content: "Always have a Plan B. Identify alternate campsites, water sources, and exit routes before you go. Know where the nearest road, trailhead, or emergency services are. Decide in advance what conditions would trigger a change in plan—injury, weather, fatigue, or time.",
        duration: 3,
      },
      {
        id: "advanced-route-timing",
        title: "Estimating Time and Pace",
        type: "article",
        content: "Calculate travel time using distance, elevation gain, terrain difficulty, and group fitness. A common formula: Add 1 hour per 3 miles on flat terrain, plus 1 hour per 1,000 feet of elevation gain. Adjust for off-trail travel, bushwhacking, or steep descents. Build in time for rest, navigation, and unexpected delays.",
        duration: 3,
      },
      {
        id: "advanced-route-beta",
        title: "Using Local Beta and Permits",
        type: "article",
        content: "Check ranger reports, trail condition updates, and recent trip logs. Contact local ranger stations for snow levels, river crossings, and closures. Secure all necessary permits in advance. Know your start and end dates, and file a trip plan with a trusted contact. Good planning makes you safer and more confident in the field.",
        duration: 3,
      },
      {
        id: "advanced-route-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What should you always plan before heading out?",
              options: ["A Plan B with alternate routes and exits", "Only the main route"],
              correctAnswer: 0,
            },
            {
              question: "What helps estimate travel time accurately?",
              options: ["Distance, elevation, terrain, and fitness", "Distance alone"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "advanced-weather-patterns",
    title: "Advanced Weather Patterns",
    description: "Understand weather systems, microclimates, and forecasting in remote areas",
    icon: "cloud",
    difficulty: "Advanced",
    duration: "18 min",
    category: "planning",
    trackId: "master",
    xpReward: 45,
    steps: [
      {
        id: "advanced-weather-intro",
        title: "Introduction",
        type: "article",
        content: "Weather can make or break a backcountry trip. In remote areas, you may not have cell service to check forecasts, and conditions can change rapidly. Learning to read the sky, understand patterns, and interpret environmental clues will help you anticipate storms, avoid lightning, and make smarter decisions in the field.",
        duration: 2,
      },
      {
        id: "advanced-weather-systems",
        title: "Understanding Fronts and Pressure Systems",
        type: "article",
        content: "High-pressure systems bring clear skies and stable weather. Low-pressure systems bring clouds, wind, and precipitation. Watch for approaching fronts: a sudden drop in temperature, increasing wind, or thickening clouds can signal a storm. Barometric pressure drops before bad weather. If you have an altimeter watch, a false elevation gain means pressure is dropping—expect weather changes.",
        duration: 3,
      },
      {
        id: "advanced-weather-micro",
        title: "Microclimates and Mountain Weather",
        type: "article",
        content: "Mountains create their own weather. As air rises over peaks, it cools and releases moisture—this is why windward slopes are wetter and leeward slopes drier. Expect afternoon thunderstorms in summer. Morning is often the safest time to travel at high elevations. Know the local wind patterns: valleys funnel wind, ridges amplify it.",
        duration: 3,
      },
      {
        id: "advanced-weather-reading",
        title: "Reading Cloud Formations",
        type: "article",
        content: "Cirrus clouds (high, wispy) can signal weather change in 24 hours. Cumulus clouds (puffy, white) are usually harmless. Cumulonimbus (towering, dark) mean thunderstorms. Lenticular clouds (lens-shaped) form near mountains and indicate strong winds aloft. Darkening skies, anvil-shaped clouds, and distant thunder are signs to seek shelter.",
        duration: 3,
      },
      {
        id: "advanced-weather-response",
        title: "Responding to Changing Conditions",
        type: "article",
        content: "If a storm is approaching, make camp early or seek shelter. Avoid ridgelines, exposed terrain, and tall trees during lightning. Move to lower elevation if possible. If caught in a storm, crouch low on insulated ground away from metal objects. Wait it out. Stay dry and warm. Weather is temporary—your safety is not.",
        duration: 3,
      },
      {
        id: "advanced-weather-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What does a dropping barometric pressure indicate?",
              options: ["Incoming bad weather", "Clear skies ahead"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "navigating-off-trail",
    title: "Navigating Off Trail",
    description: "Master compass work, terrain association, and route finding without a path",
    icon: "navigate",
    difficulty: "Advanced",
    duration: "22 min",
    category: "skills",
    trackId: "master",
    xpReward: 50,
    steps: [
      {
        id: "off-trail-intro",
        title: "Introduction",
        type: "article",
        content: "Navigating off trail requires map reading, compass skills, and the ability to interpret terrain in real time. There are no markers, no footprints, and no certainty—just you, your tools, and your judgment. This module teaches you to navigate confidently through forests, ridges, valleys, and open terrain where trails do not exist.",
        duration: 2,
      },
      {
        id: "off-trail-tools",
        title: "Using Map and Compass Together",
        type: "article",
        content: "Always orient your map to the terrain using your compass. Identify landmarks—peaks, rivers, ridges—and match them to your map. Take a bearing to your destination, then follow it while adjusting for terrain obstacles. Count paces or use time estimates to measure distance traveled. Recheck your position every 15–20 minutes.",
        duration: 4,
      },
      {
        id: "off-trail-terrain",
        title: "Terrain Association and Handrails",
        type: "article",
        content: "Terrain association means matching what you see to what is on the map. Use natural features as guides: follow a ridgeline, parallel a stream, or aim for a visible peak. These are called handrails. If you lose your way, return to your last known position and reorient. Do not guess. Use the terrain to confirm or correct your route.",
        duration: 4,
      },
      {
        id: "off-trail-obstacles",
        title: "Dealing with Obstacles",
        type: "article",
        content: "Cliffs, rivers, thick brush, and steep slopes will block your path. Sometimes the straight line is not the smart line. Detour around obstacles, then return to your bearing. If descending into a valley, know where the exit is before you drop in. Always have a plan for getting back out.",
        duration: 4,
      },
      {
        id: "off-trail-night",
        title: "Staying Found and Getting Unlost",
        type: "article",
        content: "If you realize you are off course, stop. Do not keep moving. Look at your map, identify nearby features, and figure out where you are. If you cannot, backtrack to your last known point. Mark your location with cairns or flagging if legal. Navigation is a skill you build with practice—start small and increase difficulty over time.",
        duration: 4,
      },
      {
        id: "off-trail-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What should you do if you realize you are off course?",
              options: ["Stop and reorient using your map", "Keep moving and guess"],
              correctAnswer: 0,
            },
            {
              question: "What is a handrail in navigation?",
              options: ["A natural feature used to guide your route", "A physical railing on a trail"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "wilderness-shelter-camp",
    title: "Wilderness Shelter and Camp Structure",
    description: "Build durable campsites in harsh conditions and varied terrain",
    icon: "home",
    difficulty: "Advanced",
    duration: "20 min",
    category: "skills",
    trackId: "master",
    xpReward: 50,
    steps: [
      {
        id: "shelter-intro",
        title: "Introduction",
        type: "article",
        content: "In the backcountry, your campsite is your home base. Choosing the right location and building a solid shelter can mean the difference between a restful night and a survival situation. This module covers site selection, shelter reinforcement, wind protection, and strategies for camping in extreme environments.",
        duration: 2,
      },
      {
        id: "shelter-site",
        title: "Choosing a Campsite in Harsh Terrain",
        type: "article",
        content: "Look for flat ground away from hazards: avalanche paths, rockfall zones, dead trees, and flash flood channels. In high winds, camp in the lee of a hill or treeline. In rain, avoid low spots where water collects. In snow, dig down to consolidated layers or build a wind wall. Always prioritize safety over comfort.",
        duration: 4,
      },
      {
        id: "shelter-tent",
        title: "Reinforcing Your Tent",
        type: "article",
        content: "Use all guylines and stake points, even if it seems calm. Wind can pick up fast. In soft ground or sand, use rocks, logs, or buried stuff sacks as anchors. In snow, bury stakes horizontally or use skis and poles. Angle stakes away from the tent at 45 degrees. A well-staked tent can handle serious wind.",
        duration: 4,
      },
      {
        id: "shelter-emergency",
        title: "Emergency Shelters and Tarps",
        type: "article",
        content: "If your tent fails or you need to bivy, use a tarp, emergency bivy, or natural shelter. Pitch a tarp low and tight. Use trees, trekking poles, or rocks as anchors. In a survival scenario, build a debris hut, lean-to, or snow cave. Insulate yourself from the ground with branches, leaves, or a sleeping pad. Stay dry and out of the wind.",
        duration: 4,
      },
      {
        id: "shelter-practice",
        title: "Camp Layout and Efficiency",
        type: "article",
        content: "Organize your camp logically: sleeping area, cooking area, and gear storage. Keep your sleeping bag dry and stored inside your tent. Store food away from camp in a bear canister or hang. Keep essentials like headlamp, water, and layers within reach. A clean, organized camp is safer and more efficient.",
        duration: 4,
      },
      {
        id: "shelter-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "Where should you avoid camping in harsh terrain?",
              options: ["Avalanche paths, rockfall zones, and low flood areas", "Flat, open areas"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "advanced-water-finding",
    title: "Advanced Water Finding and Purification",
    description: "Locate water in arid environments and use multi-stage purification",
    icon: "water",
    difficulty: "Advanced",
    duration: "18 min",
    category: "skills",
    trackId: "master",
    xpReward: 45,
    steps: [
      {
        id: "water-intro",
        title: "Introduction",
        type: "article",
        content: "Water is the most critical resource in the backcountry. In dry climates or during droughts, finding water requires knowledge of terrain, hydrology, and environmental clues. This module teaches you how to locate hidden water sources and use advanced purification methods to make any water safe to drink.",
        duration: 2,
      },
      {
        id: "water-finding",
        title: "Finding Water in Arid Terrain",
        type: "article",
        content: "Look for green vegetation, animal tracks, and insect activity—they lead to water. Check drainages, canyon bottoms, and the base of cliffs where seeps form. In desert washes, dig in the sand at the outside bend of dry streambeds. Water may be just below the surface. In mountains, check north-facing slopes where snow melts late. Always confirm water safety before drinking.",
        duration: 4,
      },
      {
        id: "water-filtering",
        title: "Filtration vs. Purification",
        type: "article",
        content: "Filters remove bacteria and protozoa but not viruses. Chemical purification (like iodine or chlorine dioxide) kills all pathogens but takes time. UV light purifiers work fast but need clear water. Boiling is the most reliable: 1 minute at sea level, 3 minutes above 6,500 feet. For murky water, pre-filter through a bandana before treating.",
        duration: 4,
      },
      {
        id: "water-backup",
        title: "Backup Purification Methods",
        type: "article",
        content: "Carry at least two purification methods: a filter and chemical tablets. If both fail, boil water. If you cannot boil, let water sit and settle, then use the clearest layer. In an emergency, untreated water is better than severe dehydration—but treat it as soon as possible. Plan your water needs based on distance, heat, and exertion.",
        duration: 4,
      },
      {
        id: "water-conservation",
        title: "Water Conservation and Management",
        type: "article",
        content: "Drink before you are thirsty. Ration wisely, but do not dehydrate trying to save water. Know how much water you need per day—typically 3–4 liters, more in heat or at altitude. Cache water on loops or long waterless stretches. Mark sources on your map. In winter, melt snow efficiently: add a little water to the pot first to prevent burning.",
        duration: 4,
      },
      {
        id: "water-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What is the most reliable purification method?",
              options: ["Boiling", "Hoping for the best"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "advanced-first-aid",
    title: "Advanced First Aid and Field Care",
    description: "Manage serious injuries and medical emergencies in remote settings",
    icon: "medical",
    difficulty: "Advanced",
    duration: "22 min",
    category: "safety",
    trackId: "master",
    xpReward: 50,
    steps: [
      {
        id: "first-aid-intro",
        title: "Introduction",
        type: "article",
        content: "In the backcountry, you are hours or days from definitive medical care. Knowing how to stabilize injuries, manage pain, prevent shock, and evacuate safely can save a life. This module covers advanced first aid skills: wound management, fracture stabilization, hypothermia, heat illness, altitude sickness, and emergency decision-making.",
        duration: 2,
      },
      {
        id: "first-aid-assessment",
        title: "Patient Assessment and ABCs",
        type: "article",
        content: "Always start with the ABCs: Airway, Breathing, Circulation. Check for responsiveness. Open the airway if needed. Look for breathing and pulse. Control any severe bleeding. Then assess for spinal injury, fractures, and head trauma. Stay calm, work methodically, and prioritize life-threatening issues first.",
        duration: 4,
      },
      {
        id: "first-aid-wounds",
        title: "Wound Management and Infection Prevention",
        type: "article",
        content: "Clean wounds with clean water. Remove debris. Apply pressure to stop bleeding. For deep wounds, use gauze and a pressure bandage. Do not remove impaled objects. Monitor for signs of infection: redness, heat, swelling, pus, or red streaks. Change dressings daily. Evacuate if infection worsens or the wound is deep or on a joint.",
        duration: 4,
      },
      {
        id: "first-aid-fractures",
        title: "Splinting Fractures and Sprains",
        type: "article",
        content: "Stabilize fractures before moving the patient. Use a SAM splint, trekking poles, sticks, or foam pad. Immobilize the joints above and below the fracture. Check circulation, sensation, and movement (CSM) before and after splinting. For sprains, use RICE: Rest, Ice, Compression, Elevation. Severe fractures and dislocations require evacuation.",
        duration: 4,
      },
      {
        id: "first-aid-environmental",
        title: "Hypothermia, Heat Illness, and Altitude",
        type: "article",
        content: "Hypothermia: remove wet clothes, insulate, give warm fluids if conscious. Do not rewarm too fast. Heat exhaustion: move to shade, cool down, hydrate. Heat stroke: cool immediately and evacuate. Altitude sickness: descend if symptoms worsen. Recognize signs early: headache, nausea, confusion, ataxia. Know when to turn back.",
        duration: 4,
      },
      {
        id: "first-aid-evacuation",
        title: "Evacuation and Emergency Communication",
        type: "article",
        content: "Decide whether to evacuate, and whether it is self-rescue or assisted. Use a satellite messenger or PLB if available. Send clear information: location, injury, number of people, urgency. If carrying someone out, improvise a litter or use a one-person assist. Move carefully to avoid further injury. Stay with the patient and keep them warm.",
        duration: 4,
      },
      {
        id: "first-aid-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What does ABC stand for in patient assessment?",
              options: ["Airway, Breathing, Circulation", "Always Be Cautious"],
              correctAnswer: 0,
            },
            {
              question: "What should you do if someone shows signs of worsening altitude sickness?",
              options: ["Descend immediately", "Wait and see"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "glacier-desert-coastal",
    title: "Glacier, Desert, and Coastal Travel",
    description: "Navigate and survive in extreme environments with specialized skills",
    icon: "planet",
    difficulty: "Advanced",
    duration: "20 min",
    category: "skills",
    trackId: "master",
    xpReward: 50,
    steps: [
      {
        id: "extreme-intro",
        title: "Introduction",
        type: "article",
        content: "Some wilderness environments require specialized knowledge and gear. Glaciers demand rope work and crevasse awareness. Deserts test your water management and heat tolerance. Coastal zones require tide knowledge and storm awareness. This module introduces the skills and mindset needed to travel safely in extreme terrain.",
        duration: 2,
      },
      {
        id: "extreme-glacier",
        title: "Glacier Travel Basics",
        type: "article",
        content: "Never travel solo on a glacier. Use a rope team and know how to arrest a fall. Wear crampons and carry an ice axe. Probe suspicious snow bridges. Stay roped up the entire time. Learn crevasse rescue before you go. Know when to turn back—glaciers are unforgiving. Take a formal mountaineering course before attempting glaciated terrain.",
        duration: 4,
      },
      {
        id: "extreme-desert",
        title: "Desert Navigation and Survival",
        type: "article",
        content: "Deserts are hot, dry, and disorienting. Travel early morning and late evening. Rest in shade during midday heat. Carry more water than you think you need. Know where the next source is. Protect yourself from sun with a hat, long sleeves, and sunscreen. Watch for flash floods in canyons. Carry a GPS and paper map—landmarks look the same.",
        duration: 4,
      },
      {
        id: "extreme-coastal",
        title: "Coastal and Tidal Awareness",
        type: "article",
        content: "Check tide tables before hiking coastal routes. High tide can trap you against cliffs. Know your turnaround time. Watch for sneaker waves—never turn your back on the ocean. In storms, waves and wind increase. Secure gear and stay above the high tide line when camping. Saltwater damages gear—rinse and dry everything.",
        duration: 4,
      },
      {
        id: "extreme-prep",
        title: "Preparing for Specialized Environments",
        type: "article",
        content: "Each extreme environment requires specific skills, gear, and planning. Research conditions, take courses, and start with guided trips. Build experience incrementally. Carry redundant safety gear and communication devices. Know your limits. These places are beautiful and wild—but they demand respect and preparation.",
        duration: 4,
      },
      {
        id: "extreme-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What must you never do on a glacier?",
              options: ["Travel solo", "Wear crampons"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "multi-day-group-dynamics",
    title: "Multi Day Group Dynamics",
    description: "Lead groups effectively, manage conflict, and maintain morale on long trips",
    icon: "people",
    difficulty: "Advanced",
    duration: "18 min",
    category: "leadership",
    trackId: "master",
    xpReward: 45,
    steps: [
      {
        id: "dynamics-intro",
        title: "Introduction",
        type: "article",
        content: "Leading a group over multiple days is as much about people as it is about logistics. Fatigue, discomfort, and stress can create tension. Keeping the group safe, motivated, and cohesive requires strong communication, emotional intelligence, and conflict resolution skills. This module teaches you how to lead people, not just trips.",
        duration: 2,
      },
      {
        id: "dynamics-roles",
        title: "Defining Roles and Expectations",
        type: "article",
        content: "Before the trip, clarify who is leading, who is navigating, and what the daily routine will be. Set expectations for pace, mileage, camp tasks, and decision-making. Make sure everyone knows the plan and agrees to it. Clear roles prevent confusion and resentment. Revisit expectations if things change.",
        duration: 4,
      },
      {
        id: "dynamics-communication",
        title: "Communication and Check-Ins",
        type: "article",
        content: "Check in with your group daily—physically and emotionally. Ask how people are feeling. Address small issues before they become big ones. Use active listening. Avoid assumptions. If someone is struggling, give them space to speak up. Create a culture where it is okay to say you are tired, scared, or unsure.",
        duration: 4,
      },
      {
        id: "dynamics-conflict",
        title: "Managing Conflict in the Field",
        type: "article",
        content: "Conflict is normal. Address it early and calmly. Separate people if needed, let everyone speak, then find a solution together. Stay neutral. Do not take sides. Focus on the issue, not the person. Sometimes the best solution is to adjust the plan. Sometimes it is to finish the trip early. Safety and respect come first.",
        duration: 4,
      },
      {
        id: "dynamics-morale",
        title: "Maintaining Morale and Energy",
        type: "article",
        content: "Keep spirits up with small wins: a good meal, a scenic campsite, a rest day. Celebrate progress. Acknowledge hard work. Be positive but realistic. When things go wrong, stay calm and lead by example. Your attitude sets the tone. A tired, grumpy leader creates a tired, grumpy group. Take care of yourself so you can take care of others.",
        duration: 4,
      },
      {
        id: "dynamics-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What should you do before the trip to prevent conflict?",
              options: ["Clarify roles and expectations", "Avoid talking about the plan"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "wilderness-decision-making",
    title: "Wilderness Decision Making",
    description: "Make sound judgments under pressure using risk assessment frameworks",
    icon: "analytics",
    difficulty: "Advanced",
    duration: "20 min",
    category: "leadership",
    trackId: "master",
    xpReward: 50,
    steps: [
      {
        id: "decision-intro",
        title: "Introduction",
        type: "article",
        content: "In the wilderness, decisions have consequences. Push through a storm or camp early? Cross a river or find another route? Continue when someone is hurt or call for help? This module teaches structured decision-making frameworks, risk assessment, and how to avoid common cognitive traps that lead to accidents.",
        duration: 2,
      },
      {
        id: "decision-risk",
        title: "Assessing Risk and Consequence",
        type: "article",
        content: "Risk is the likelihood of something going wrong times the severity of the outcome. A low likelihood but high consequence event (like a rockfall) is still high risk. Identify hazards: terrain, weather, group fitness, time of day. Weigh the cost of continuing vs. the cost of stopping. Always ask: What is the worst that could happen?",
        duration: 4,
      },
      {
        id: "decision-bias",
        title: "Avoiding Cognitive Biases",
        type: "article",
        content: "Summit fever, sunk cost fallacy, and groupthink cause bad decisions. Just because you have come this far does not mean you must continue. Just because everyone else is okay with the plan does not mean it is safe. Check your ego. Encourage dissent. Build a culture where it is okay to speak up and turn back.",
        duration: 4,
      },
      {
        id: "decision-framework",
        title: "Using Decision-Making Frameworks",
        type: "article",
        content: "One framework: Stop, Think, Observe, Plan (STOP). Stop moving. Think about the situation. Observe your surroundings and conditions. Plan your next step. Another: Define the problem, list options, evaluate consequences, choose, act, review. Use a structured process when emotions or fatigue cloud judgment.",
        duration: 4,
      },
      {
        id: "decision-commitment",
        title: "Committing and Adapting",
        type: "article",
        content: "Once you make a decision, commit to it fully—but stay flexible. Conditions change. New information emerges. Be willing to reverse course. Ego should not prevent you from changing your mind. Good leaders adapt. Poor leaders double down on bad plans. Your goal is to bring everyone home safely.",
        duration: 4,
      },
      {
        id: "decision-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What does STOP stand for in decision-making?",
              options: ["Stop, Think, Observe, Plan", "Sit, Talk, Observe, Pray"],
              correctAnswer: 0,
            },
            {
              question: "What should always be your primary goal in the wilderness?",
              options: ["Bringing everyone home safely", "Reaching the summit"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
  {
    id: "search-and-rescue-basics",
    title: "Search and Rescue Basics for Hikers",
    description: "Understand SAR protocols, self-rescue techniques, and how to assist responders",
    icon: "shield-checkmark",
    difficulty: "Advanced",
    duration: "18 min",
    category: "safety",
    trackId: "master",
    xpReward: 45,
    steps: [
      {
        id: "sar-intro",
        title: "Introduction",
        type: "article",
        content: "Search and Rescue (SAR) teams save lives, but the best rescue is the one that never happens. Knowing how SAR works, how to call for help, and what to do while waiting can speed up rescue and improve outcomes. This module covers self-rescue strategies, how to work with SAR, and what information rescuers need from you.",
        duration: 2,
      },
      {
        id: "sar-prevention",
        title: "Prevention and Preparation",
        type: "article",
        content: "Most SAR calls are preventable. File a trip plan. Carry the 10 Essentials. Stay on trail. Turn back when conditions worsen. Bring a communication device: satellite messenger, PLB, or cell phone. The best way to avoid needing SAR is to prepare well and make smart decisions in the field.",
        duration: 4,
      },
      {
        id: "sar-calling",
        title: "When and How to Call for Help",
        type: "article",
        content: "Call for help if someone is seriously injured, lost, or in immediate danger. Use 911 if you have cell service. Use a satellite device if not. Provide your location (coordinates if possible), the nature of the emergency, number of people, and any hazards. Stay calm. Follow dispatcher instructions. Do not hang up unless told to.",
        duration: 4,
      },
      {
        id: "sar-waiting",
        title: "What to Do While Waiting",
        type: "article",
        content: "Stay put unless staying is unsafe. Make yourself visible: use bright clothing, a signal mirror, or whistle. Three whistle blasts is the universal distress signal. Conserve energy and stay warm. If you must move, leave a note with your direction and time. Mark your location. Keep your phone or device on but in low-power mode to preserve battery.",
        duration: 4,
      },
      {
        id: "sar-assisting",
        title: "Assisting SAR Teams",
        type: "article",
        content: "When rescuers arrive, give them clear information: patient condition, mechanism of injury, treatments given, and any changes. Follow their instructions. Let them take over care. SAR teams are trained professionals. Trust their process. After rescue, debrief with your group. Learn from the experience and use it to improve your skills and decision-making.",
        duration: 4,
      },
      {
        id: "sar-quiz",
        title: "Quiz",
        type: "quiz",
        content: JSON.stringify({
          questions: [
            {
              question: "What is the universal distress signal?",
              options: ["Three whistle blasts", "Waving your arms"],
              correctAnswer: 0,
            },
          ],
        }),
        duration: 2,
      },
    ],
  },
];

const DEFAULT_TRACKS: LearningTrack[] = [
  {
    id: "novice",
    level: "novice",
    title: "Weekend Camper",
    description: "Master the fundamentals of camping",
    badge: "tent",
    xpRequired: 0,
    moduleIds: [
      "leave-no-trace",
      "first-trip",
      "choosing-tent",
      "pitching-tent",
      "sleep-system",
      "stay-warm-dry",
      "camp-kitchen",
      "pack-smart",
      "campfire-safety",
      "first-aid",
      "navigation",
      "etiquette",
      "first-night",
    ],
  },
  {
    id: "intermediate",
    level: "intermediate",
    title: "Trail Leader",
    description: "Develop advanced outdoor skills",
    badge: "compass",
    xpRequired: 400,
    moduleIds: [
      "multi-day-planning",
      "terrain-ratings",
      "backcountry-weather",
      "efficient-campsite",
      "water-safety",
      "leading-group",
      "backcountry-cooking",
      "risk-management",
      "trail-navigation",
      "wildlife-safety",
    ],
  },
  {
    id: "master",
    level: "master",
    title: "Backcountry Guide",
    description: "Master wilderness expertise",
    badge: "trophy",
    xpRequired: 1200,
    moduleIds: [
      "advanced-route-planning",
      "advanced-weather-patterns",
      "navigating-off-trail",
      "wilderness-shelter-camp",
      "advanced-water-finding",
      "advanced-first-aid",
      "glacier-desert-coastal",
      "multi-day-group-dynamics",
      "wilderness-decision-making",
      "search-and-rescue-basics",
    ],
  },
];

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      modules: DEFAULT_MODULES,
      tracks: DEFAULT_TRACKS,
      progress: {},
      userProgress: {
        totalXP: 0,
        currentLevel: 0,
        unlockedTracks: ["novice"],
        completedModules: [],
        earnedBadges: [],
      },

      getModuleById: (id) => {
        return get().modules.find((module) => module.id === id);
      },

      getModulesByTrack: (trackId) => {
        return get().modules.filter((module) => module.trackId === trackId);
      },

      getModuleProgress: (moduleId) => {
        return get().progress[moduleId];
      },

      calculateModuleProgress: (moduleId) => {
        const module = get().getModuleById(moduleId);
        const progress = get().getModuleProgress(moduleId);

        if (!module) return { completed: 0, total: 0, percentage: 0 };

        const total = module.steps.length;
        const completed = module.steps.filter(
          (step) => progress?.steps[step.id]?.status === "completed"
        ).length;

        return {
          completed,
          total,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      },

      calculateTrackProgress: (trackId) => {
        const modules = get().getModulesByTrack(trackId);
        const completedModules = modules.filter((m) => get().isModuleCompleted(m.id));

        const xpEarned = completedModules.reduce((sum, m) => sum + (m.xpReward || 0), 0);
        const xpTotal = modules.reduce((sum, m) => sum + (m.xpReward || 0), 0);

        return {
          completed: completedModules.length,
          total: modules.length,
          percentage:
            modules.length > 0
              ? Math.round((completedModules.length / modules.length) * 100)
              : 0,
          xpEarned,
          xpTotal,
        };
      },

      isModuleCompleted: (moduleId) => {
        const progress = get().getModuleProgress(moduleId);
        return progress?.status === "completed";
      },

      isTrackUnlocked: (trackId) => {
        return get().userProgress.unlockedTracks.includes(trackId);
      },

      getCompletedModules: () => {
        const { progress } = get();
        return Object.keys(progress).filter(
          (moduleId) => progress[moduleId].status === "completed"
        );
      },

      getTotalXP: () => {
        return get().userProgress.totalXP;
      },

      getCurrentLevel: () => {
        return get().userProgress.currentLevel;
      },

      isTrackCompleted: (trackId) => {
        const track = get().tracks.find((t) => t.id === trackId);
        if (!track) return false;

        const modules = get().getModulesByTrack(trackId);
        return modules.every((module) => get().isModuleCompleted(module.id));
      },

      getEarnedBadges: () => {
        const earnedBadgeIds = get().userProgress.earnedBadges;
        return BADGES.filter((badge) => earnedBadgeIds.includes(badge.id));
      },

      hasBadge: (badgeId) => {
        return get().userProgress.earnedBadges.includes(badgeId);
      },

      checkAndAwardBadges: () => {
        set((state) => {
          const earnedBadges = [...state.userProgress.earnedBadges];
          let badgesChanged = false;

          BADGES.forEach((badge) => {
            if (!earnedBadges.includes(badge.id)) {
              const isTrackCompleted = get().isTrackCompleted(badge.trackId);
              if (isTrackCompleted) {
                earnedBadges.push(badge.id);
                badgesChanged = true;
              }
            }
          });

          if (badgesChanged) {
            return {
              userProgress: {
                ...state.userProgress,
                earnedBadges,
              },
            };
          }

          return state;
        });
      },

      completeStep: (moduleId, stepId) => {
        set((state) => {
          const moduleProgress = state.progress[moduleId] || {
            moduleId,
            status: "in_progress" as StepStatus,
            startedAt: new Date().toISOString(),
            steps: {},
          };

          const updatedSteps = {
            ...moduleProgress.steps,
            [stepId]: {
              stepId,
              status: "completed" as StepStatus,
              completedAt: new Date().toISOString(),
            },
          };

          const module = get().getModuleById(moduleId);
          const allStepsCompleted =
            module?.steps.every((step) => updatedSteps[step.id]?.status === "completed") ||
            false;

          let updatedUserProgress = state.userProgress;
          if (allStepsCompleted && module?.xpReward) {
            const newTotalXP = state.userProgress.totalXP + module.xpReward;
            const newLevel = Math.floor(newTotalXP / 100);
            const newUnlockedTracks = [...state.userProgress.unlockedTracks];

            if (newTotalXP >= 400 && !newUnlockedTracks.includes("intermediate")) {
              newUnlockedTracks.push("intermediate");
            }
            if (newTotalXP >= 1200 && !newUnlockedTracks.includes("master")) {
              newUnlockedTracks.push("master");
            }

            const newCompletedModules = [...state.userProgress.completedModules];
            if (!newCompletedModules.includes(moduleId)) {
              newCompletedModules.push(moduleId);
            }

            updatedUserProgress = {
              ...state.userProgress,
              totalXP: newTotalXP,
              currentLevel: newLevel,
              unlockedTracks: newUnlockedTracks,
              completedModules: newCompletedModules,
            };
          }

          return {
            progress: {
              ...state.progress,
              [moduleId]: {
                ...moduleProgress,
                status: allStepsCompleted ? "completed" : "in_progress",
                completedAt: allStepsCompleted ? new Date().toISOString() : undefined,
                steps: updatedSteps,
              },
            },
            userProgress: updatedUserProgress,
          };
        });

        // Check for badge awards after completing a module
        get().checkAndAwardBadges();
      },
    }),
    {
      name: "learning-progress-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        progress: state.progress,
        userProgress: state.userProgress,
      }),
    }
  )
);
