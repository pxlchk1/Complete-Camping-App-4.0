/**
 * Packing Utilities
 * Normalization and helper functions for the packing list system
 */

/**
 * Normalize a category label to a stable categoryId
 * This MUST be used everywhere category IDs are needed
 * 
 * Rules:
 * - trim
 * - lowercase
 * - replace "&" with "and"
 * - replace all non [a-z0-9] with "_"
 * - collapse multiple "_" into one
 * - remove leading/trailing "_"
 * 
 * Examples:
 * "Safety and First Aid" => "safety_and_first_aid"
 * "Food & Kitchen" => "food_and_kitchen"
 */
export function normalizeCategoryId(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Season type for packing context
 */
export type Season = "winter" | "summer" | "shoulder";

/**
 * Temperature band for packing context
 */
export type TempBand = "below_freezing" | "cold" | "mild" | "hot";

/**
 * Precipitation type
 */
export type PrecipType = "none" | "rain" | "snow";

/**
 * Camping style types
 */
export type CampingStyleType = "car_camping" | "backpacking" | "hammock" | "rv" | "unknown";

/**
 * Trip context for determining packing suggestions
 */
export interface TripContext {
  season: Season;
  tempBand: TempBand;
  windy: boolean;
  precip: PrecipType;
  style: CampingStyleType;
  locationHints: string[];
}

/**
 * Determine season from date and latitude
 * @param date - Trip start date
 * @param latitude - Optional latitude (positive = northern hemisphere)
 */
export function determineSeason(date: Date, latitude?: number): Season {
  const month = date.getMonth(); // 0-11
  const isNorthern = latitude === undefined || latitude >= 0;

  // Northern hemisphere seasons
  let season: Season;
  if (month === 11 || month === 0 || month === 1) {
    season = "winter";
  } else if (month >= 5 && month <= 7) {
    season = "summer";
  } else {
    season = "shoulder";
  }

  // Flip for southern hemisphere
  if (!isNorthern) {
    if (season === "winter") season = "summer";
    else if (season === "summer") season = "winter";
  }

  return season;
}

/**
 * Determine temperature band from forecast or season default
 * @param minTemp - Optional minimum temperature from forecast (in Fahrenheit)
 * @param season - Season to use as fallback
 */
export function determineTempBand(minTemp?: number, season?: Season): TempBand {
  if (minTemp !== undefined) {
    if (minTemp <= 32) return "below_freezing";
    if (minTemp <= 50) return "cold";
    if (minTemp <= 70) return "mild";
    return "hot";
  }

  // Fallback based on season
  switch (season) {
    case "winter":
      return "below_freezing";
    case "summer":
      return "hot";
    default:
      return "mild";
  }
}

/**
 * Determine if conditions are windy from forecast
 * @param avgWindMph - Average wind speed
 * @param gustMph - Wind gust speed
 */
export function determineWindy(avgWindMph?: number, gustMph?: number): boolean {
  if (avgWindMph !== undefined && avgWindMph >= 15) return true;
  if (gustMph !== undefined && gustMph >= 20) return true;
  return false;
}

/**
 * Determine precipitation type from forecast
 * @param precipProbability - Probability of precipitation (0-100)
 * @param minTemp - Minimum temperature
 */
export function determinePrecip(precipProbability?: number, minTemp?: number): PrecipType {
  if (precipProbability === undefined || precipProbability < 30) {
    return "none";
  }

  if (minTemp !== undefined && minTemp <= 32) {
    return "snow";
  }

  return "rain";
}

/**
 * Map camping style string to standardized type
 */
export function normalizeCampingStyle(style?: string): CampingStyleType {
  if (!style) return "unknown";

  const normalized = style.toLowerCase().replace(/[_\s-]/g, "_");

  if (normalized.includes("car") || normalized === "car_camping") return "car_camping";
  if (normalized.includes("backpack")) return "backpacking";
  if (normalized.includes("hammock")) return "hammock";
  if (normalized.includes("rv") || normalized.includes("camper")) return "rv";

  return "unknown";
}

/**
 * Extract location hints from location name
 */
export function extractLocationHints(locationName?: string): string[] {
  const hints: string[] = [];
  if (!locationName) return hints;

  const lower = locationName.toLowerCase();

  if (lower.includes("dune") || lower.includes("beach") || lower.includes("coast")) {
    hints.push("coastal");
  }
  if (lower.includes("desert")) {
    hints.push("desert");
  }
  if (lower.includes("mountain") || lower.includes("peak") || lower.includes("summit")) {
    hints.push("mountains");
  }
  if (lower.includes("forest") || lower.includes("woods")) {
    hints.push("forest");
  }

  return hints;
}

/**
 * Build complete trip context from trip data and optional forecast
 */
export function buildTripContext(
  startDate: Date,
  options?: {
    latitude?: number;
    campingStyle?: string;
    locationName?: string;
    forecast?: {
      minTemp?: number;
      avgWindMph?: number;
      gustMph?: number;
      precipProbability?: number;
    };
  }
): TripContext {
  const season = determineSeason(startDate, options?.latitude);
  const tempBand = determineTempBand(options?.forecast?.minTemp, season);
  const windy = determineWindy(options?.forecast?.avgWindMph, options?.forecast?.gustMph);
  const precip = determinePrecip(options?.forecast?.precipProbability, options?.forecast?.minTemp);
  const style = normalizeCampingStyle(options?.campingStyle);
  const locationHints = extractLocationHints(options?.locationName);

  return {
    season,
    tempBand,
    windy,
    precip,
    style,
    locationHints,
  };
}

/**
 * Current packing list schema version
 * Increment when making breaking changes to pre-population logic
 */
export const PACKING_LIST_VERSION = 1;
