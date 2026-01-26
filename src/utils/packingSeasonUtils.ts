/**
 * Packing Season Utils
 * Centralized logic for determining the correct packing season
 * based on trip data, dates, and user overrides
 */

import type { Trip } from "../types/camping";
import type { Season } from "../state/packingStore";

export type PackingSeason = Season;

/** Source of the auto-detected season */
export type SeasonSource = "override" | "winterCamping" | "dates" | "default";

export interface SeasonInfo {
  season: PackingSeason;
  source: SeasonSource;
  helperText: string;
}

/**
 * Determines the default packing season for a trip.
 * 
 * Priority order:
 * 1. User override (packingSeasonOverride)
 * 2. Explicit winter camping signals
 * 3. Trip start date month
 * 4. Default to summer
 */
export function getDefaultPackingSeason(trip: Partial<Trip> | null | undefined): PackingSeason {
  return getSeasonInfo(trip).season;
}

/**
 * Get full season info including source and helper text
 */
export function getSeasonInfo(trip: Partial<Trip> | null | undefined): SeasonInfo {
  // 1) User override wins
  if (trip?.packingSeasonOverride) {
    return {
      season: trip.packingSeasonOverride,
      source: "override",
      helperText: "You picked this season for this trip.",
    };
  }

  // 2) Explicit winter camping signals
  const isWinterCamping = checkIsWinterCamping(trip);
  if (isWinterCamping) {
    return {
      season: "winter",
      source: "winterCamping",
      helperText: "Based on Winter Camping.",
    };
  }

  // 3) Infer from trip start date
  if (trip?.startDate) {
    const start = new Date(trip.startDate);
    if (!isNaN(start.getTime())) {
      const month = start.getMonth() + 1; // 1-12
      const season = monthToSeason(month);
      return {
        season,
        source: "dates",
        helperText: "Based on your trip dates.",
      };
    }
  }

  // 4) Default to summer
  return {
    season: "summer",
    source: "default",
    helperText: "No trip dates set.",
  };
}

/**
 * Check if trip indicates winter camping
 */
function checkIsWinterCamping(trip: Partial<Trip> | null | undefined): boolean {
  if (!trip) return false;

  // Check campingStyle (uppercase)
  if (trip.campingStyle === "WINTER") return true;

  // Check winterCamping flag (if it exists)
  if ((trip as any).winterCamping === true) return true;

  // Check tags array
  if (Array.isArray((trip as any).tags) && (trip as any).tags.includes("winter")) {
    return true;
  }

  // Check tripType (if it includes winter)
  if ((trip as any).tripType === "winter") return true;

  return false;
}

/**
 * Map month (1-12) to season
 */
function monthToSeason(month: number): PackingSeason {
  if ([12, 1, 2].includes(month)) return "winter";
  if ([3, 4, 5].includes(month)) return "spring";
  if ([6, 7, 8].includes(month)) return "summer";
  return "fall"; // 9, 10, 11
}

/**
 * Get display label for season source
 */
export function getSeasonSourceLabel(source: SeasonInfo["source"]): string {
  switch (source) {
    case "override":
      return "(Chosen)";
    case "winterCamping":
    case "dates":
    case "default":
      return "(Auto)";
    default:
      return "";
  }
}

/**
 * Format season name for display
 */
export function formatSeasonName(season: PackingSeason): string {
  return season.charAt(0).toUpperCase() + season.slice(1);
}

/**
 * Winter-specific nudge text
 */
export const WINTER_NUDGE_TEXT = 
  "Winter trip. Focus on warmth, dry layers, and a sleep system rated for the low.";

/**
 * Category ordering by season
 */
export const SEASON_CATEGORY_ORDER: Record<PackingSeason, string[]> = {
  winter: [
    "Sleep System",
    "Warmth & Layers",
    "Shelter & Insulation",
    "Cooking & Fuel",
    "Meal Prep",
    "Water & Hydration",
    "Safety & Traction",
    "Lighting & Power",
    "Food",
    "Hygiene",
    "Comfort Extras",
  ],
  spring: [
    "Rain & Weather Protection",
    "Shelter & Sleep",
    "Clothing",
    "Cooking & Food",
    "Meal Prep",
    "Bug Protection",
    "Navigation & Safety",
    "Personal Care",
    "Tools & Utilities",
  ],
  summer: [
    "Bug Protection",
    "Hydration",
    "Sun Protection",
    "Shelter & Sleep",
    "Clothing",
    "Cooking & Food",
    "Meal Prep",
    "Navigation & Safety",
    "Personal Care",
  ],
  fall: [
    "Warmth & Layers",
    "Shelter & Sleep",
    "Lighting & Power",
    "Cooking & Food",
    "Meal Prep",
    "Navigation & Safety",
    "Personal Care",
    "Clothing",
    "Tools & Utilities",
  ],
};

/**
 * Winter category helper text
 */
export const WINTER_CATEGORY_HELPERS: Record<string, string> = {
  "Sleep System": "Warm sleeping bag, insulated pad, and a backup plan if temps drop.",
  "Warmth & Layers": "Base layers, insulation, and something windproof.",
  "Shelter & Insulation": "Keep heat in and drafts out.",
  "Cooking & Fuel": "Cold changes how stoves behave. Bring the right fuel.",
  "Water & Hydration": "Water freezes. Plan for it.",
  "Safety & Traction": "Ice happens. So do slippery parking lots.",
  "Lighting & Power": "Long nights, short battery life.",
  "Food": "Easy calories and warm drinks.",
  "Hygiene": "Cold-friendly cleanup.",
  "Comfort Extras": "Small things that make winter feel cozy.",
};
