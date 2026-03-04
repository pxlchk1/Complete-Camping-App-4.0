/**
 * Badge Witness Requirements Configuration
 * 
 * Centralized mapping of which badges require witness approval for completion.
 * 
 * Rules:
 * 1. ALL badges require a photo upload to submit.
 * 2. SOME badges additionally require witness approval.
 * 
 * Witness required for:
 * - Fire building and safety (fire lays, fire-starting, axe/saw/knife work)
 * - Navigation and backcountry skills (map/compass, route finding, water treatment)
 * - Safety and readiness (first aid, emergency shelter, severe weather)
 * 
 * Photo-only (no witness needed):
 * - Gear and organization badges
 * - Learning module completions (Leave No Trace, Weekend Camper, etc.)
 * - Solo activities that can be verified by photo evidence
 */

/**
 * Badge IDs that require witness approval in addition to photo.
 * Match these IDs to the badge names in seedBadgeDefinitions.
 * 
 * Format: badge name converted to snake_case
 */
export const WITNESS_REQUIRED_BADGES: Set<string> = new Set([
  // === CAMP SETUP & SHELTER ===
  "tent_master",           // Requires witness to verify proper setup
  "hammock_pro",           // Requires witness to verify insulation setup
  "group_camp_coordinator", // Requires group verification
  
  // === FIRE & WARMTH ===
  "one_match_fire_starter", // Witness must see the single match attempt
  "spark_rod_pro",          // Witness must see ferro rod spark
  "wet_wood_negotiator",    // Witness must verify wet conditions
  "primitive_fire_starter", // Witness must see friction fire attempt
  "fire_steward",           // Witness must verify fire management
  
  // === COOKING & CAMP KITCHEN ===
  "campfire_chef",          // Witness for fire cooking verification
  "backcountry_baker",      // Witness for baking over fire
  
  // === NAVIGATION & SKILLS ===
  "compass_navigator",      // Witness for route navigation
  "map_reader",             // Witness for route finding
  "night_navigator",        // Witness for night orienteering
  "trail_blazer",           // Witness for leading group
  
  // === SAFETY & READINESS ===
  "first_aid_pro",          // Witness for scenario completion
  "emergency_shelter_builder", // Witness for timed shelter build
  "water_treatment_expert", // Witness for water treatment process
  "severe_weather_ready",   // Witness for weather response
  
  // === NATURE NERD ===
  // Generally photo-only unless safety-critical
]);

/**
 * Check if a badge requires witness approval.
 * 
 * @param badgeId - The badge ID to check (can be Firestore doc ID or snake_case name)
 * @returns true if witness is required, false for photo-only
 */
export function doesBadgeRequireWitness(badgeId: string): boolean {
  // Normalize to snake_case for comparison
  const normalizedId = normalizeBadgeId(badgeId);
  return WITNESS_REQUIRED_BADGES.has(normalizedId);
}

/**
 * Normalize a badge ID or name to snake_case for consistent matching.
 * Handles Firestore doc IDs which may be mixed-case or have underscores.
 */
export function normalizeBadgeId(badgeId: string): string {
  return badgeId
    .toLowerCase()
    .replace(/\s+/g, "_")      // spaces to underscores
    .replace(/-/g, "_")        // hyphens to underscores
    .replace(/[^a-z0-9_]/g, "") // remove special chars
    .replace(/_+/g, "_")       // collapse multiple underscores
    .replace(/^_|_$/g, "");    // trim leading/trailing underscores
}

/**
 * Get a human-readable description of why witness is required.
 * Used in UI to explain the witness requirement to users.
 */
export function getWitnessRequirementReason(badgeId: string): string {
  const normalizedId = normalizeBadgeId(badgeId);
  
  // Fire-related
  if (normalizedId.includes("fire") || normalizedId.includes("spark") || normalizedId.includes("match")) {
    return "Fire skills need a spotter for safety and verification.";
  }
  
  // Navigation-related
  if (normalizedId.includes("nav") || normalizedId.includes("compass") || normalizedId.includes("map") || normalizedId.includes("trail")) {
    return "Navigation skills are best verified by someone who followed along.";
  }
  
  // Safety-related
  if (normalizedId.includes("first_aid") || normalizedId.includes("emergency") || normalizedId.includes("weather") || normalizedId.includes("water_treatment")) {
    return "Safety skills should be witnessed for proper technique verification.";
  }
  
  // Setup-related
  if (normalizedId.includes("tent") || normalizedId.includes("hammock") || normalizedId.includes("group")) {
    return "Camp setup is easier to verify with a fellow camper present.";
  }
  
  // Default
  return "A fellow camper can confirm you completed this challenge.";
}

/**
 * Badge claim statuses for the new photo + witness flow.
 * 
 * Flow:
 * 1. draft → User starts claim, no photo yet
 * 2. ready_to_submit → Photo attached, can submit
 * 3. submitted → Waiting for witness approval (if required) or auto-approved
 * 4. approved → Complete, badge earned
 * 5. rejected → Witness declined, user can re-submit with new photo
 */
export type BadgeClaimStatusV2 = 
  | "draft"          // No photo yet
  | "ready_to_submit" // Photo attached, ready to submit
  | "submitted"       // Sent to witness (or auto-processing)
  | "approved"        // Complete
  | "rejected";       // Needs re-submit

/**
 * Map from old status names to new ones for backward compatibility.
 */
export const STATUS_MIGRATION_MAP: Record<string, BadgeClaimStatusV2> = {
  "DRAFT": "draft",
  "PENDING_STAMP": "submitted",
  "APPROVED": "approved",
  "NOT_THIS_TIME": "rejected",
};

/**
 * Get the display label for a claim status.
 */
export function getStatusDisplayLabel(status: BadgeClaimStatusV2 | string): string {
  const normalizedStatus = STATUS_MIGRATION_MAP[status] || status;
  
  switch (normalizedStatus) {
    case "draft":
      return "Add Photo";
    case "ready_to_submit":
      return "Ready to Submit";
    case "submitted":
      return "Awaiting Approval";
    case "approved":
      return "Completed";
    case "rejected":
      return "Try Again";
    default:
      return "Unknown";
  }
}
