/**
 * Welcome Copy Utility
 * Provides personalized welcome messages based on user login state and camping preferences.
 */

// Camping type to subtext mapping
const CAMPING_TYPE_MESSAGES: Record<string, string> = {
  "car camping": "Your trunk is ready for your next campsite haul.",
  "tent camping": "Your tent is ready for your next pitch.",
  "backpacking": "Your pack is ready for your next mile.",
  "hammock camping": "Your hammock is waiting for your next hang.",
  "dispersed camping (boondocking)": "Your quiet spot off the grid is calling.",
  "dispersed camping": "Your quiet spot off the grid is calling.",
  "boondocking": "Your quiet spot off the grid is calling.",
  "camper van camping": "Your van is ready for the next pull-off-with-a-view.",
  "van camping": "Your van is ready for the next pull-off-with-a-view.",
  "rv camping": "Your RV is ready for the next easy getaway.",
  "trailer camping (travel trailer)": "Your trailer is ready for the next home-base weekend.",
  "trailer camping": "Your trailer is ready for the next home-base weekend.",
  "travel trailer": "Your trailer is ready for the next home-base weekend.",
  "vintage camper camping": "Your vintage camper is ready for the next sweet little road trip.",
  "vintage camper": "Your vintage camper is ready for the next sweet little road trip.",
  "cabin camping": "Your cabin weekend is calling.",
  "cabin": "Your cabin weekend is calling.",
  "glamping": "Your coziest camp setup is ready.",
  "group camping": "Your crew is ready for the next campfire night.",
  "solo camping": "Your solo reset is waiting.",
  "bikepacking": "Your next ride-and-camp adventure is calling.",
  "boat camping": "Your next night near the water is waiting.",
  "winter camping": "Your winter camp is waiting for that first crisp breath.",
  "overlanding": "Your next backroad adventure is calling.",
};

const DEFAULT_SUBTEXT = "Your camping adventure starts here";

/**
 * Get the welcome title based on user's display name and login status.
 * @param displayName - User's display name from profile
 * @param isLoggedIn - Whether the user is logged in
 * @returns The welcome title string
 */
export function getWelcomeTitle(displayName?: string | null, isLoggedIn?: boolean): string {
  if (!isLoggedIn) {
    return "Welcome, Camper!";
  }

  // Get first name from display name
  const firstName = displayName?.split(" ")[0]?.trim() || "Camper";
  
  return `Welcome back, ${firstName}!`;
}

/**
 * Get the welcome subtext based on user's favorite camping type and login status.
 * @param favoriteCampingType - User's favorite camping type from profile
 * @param isLoggedIn - Whether the user is logged in
 * @returns The welcome subtext string
 */
export function getWelcomeSubtext(favoriteCampingType?: string | null, isLoggedIn?: boolean): string {
  if (!isLoggedIn) {
    return DEFAULT_SUBTEXT;
  }

  if (!favoriteCampingType) {
    return DEFAULT_SUBTEXT;
  }

  // Normalize the camping type for lookup (lowercase, trimmed)
  const normalizedType = favoriteCampingType.toLowerCase().trim();
  
  // Try exact match first
  if (CAMPING_TYPE_MESSAGES[normalizedType]) {
    return CAMPING_TYPE_MESSAGES[normalizedType];
  }

  // Try matching with underscores replaced by spaces
  const withSpaces = normalizedType.replace(/_/g, " ");
  if (CAMPING_TYPE_MESSAGES[withSpaces]) {
    return CAMPING_TYPE_MESSAGES[withSpaces];
  }

  // Try partial matching for flexibility
  for (const [key, message] of Object.entries(CAMPING_TYPE_MESSAGES)) {
    if (normalizedType.includes(key) || key.includes(normalizedType)) {
      return message;
    }
  }

  return DEFAULT_SUBTEXT;
}
