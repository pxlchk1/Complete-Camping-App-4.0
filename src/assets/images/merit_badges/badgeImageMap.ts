/**
 * Badge Image Registry
 *
 * Static map of all merit badge images.
 * Keys are imageKey values (filename without extension).
 * All require() calls are literal - NO dynamic paths for Metro compatibility.
 *
 * @important DO NOT use dynamic require() or computed paths.
 */

export const badgeImages = {
  // ============================================
  // PLACEHOLDER / FALLBACK
  // ============================================
  badge_placeholder: require("./camp_setup_and_shelter/camp_setup_and_shelter_1.png"),

  // ============================================
  // CAMP SETUP AND SHELTER (9 badges)
  // ============================================
  camp_setup_and_shelter_1: require("./camp_setup_and_shelter/camp_setup_and_shelter_1.png"),
  camp_setup_and_shelter_2: require("./camp_setup_and_shelter/camp_setup_and_shelter_2.png"),
  camp_setup_and_shelter_3: require("./camp_setup_and_shelter/camp_setup_and_shelter_3.png"),
  camp_setup_and_shelter_4: require("./camp_setup_and_shelter/camp_setup_and_shelter_4.png"),
  camp_setup_and_shelter_5: require("./camp_setup_and_shelter/camp_setup_and_shelter_5.png"),
  camp_setup_and_shelter_6: require("./camp_setup_and_shelter/camp_setup_and_shelter_6.png"),
  camp_setup_and_shelter_7: require("./camp_setup_and_shelter/camp_setup_and_shelter_7.png"),
  camp_setup_and_shelter_8: require("./camp_setup_and_shelter/camp_setup_and_shelter_8.png"),
  camp_setup_and_shelter_9: require("./camp_setup_and_shelter/camp_setup_and_shelter_9.png"),

  // ============================================
  // FIRE AND WARMTH (9 badges - descriptive names)
  // ============================================
  fire_and_warmth_campfire_storyteller: require("./fire_and_warmth/fire_and_warmth_campfire_storyteller.png"),
  fire_and_warmth_extinguish_it_like_you_mean_it: require("./fire_and_warmth/fire_and_warmth_extinguish_it_like_you_mean_it.png"),
  fire_and_warmth_fire_lay_nerd: require("./fire_and_warmth/fire_and_warmth_fire_lay_nerd.png"),
  fire_and_warmth_one_match_fire_starter: require("./fire_and_warmth/fire_and_warmth_one_match_fire_starter.png"),
  fire_and_warmth_perfect_coals_chef: require("./fire_and_warmth/fire_and_warmth_perfect_coals_chef.png"),
  fire_and_warmth_safe_fire_ring_builder: require("./fire_and_warmth/fire_and_warmth_safe_fire_ring_builder.png"),
  fire_and_warmth_smokeless_fire_sorcerer: require("./fire_and_warmth/fire_and_warmth_smokeless_fire_sorcerer.png"),
  fire_and_warmth_spark_rod_pro: require("./fire_and_warmth/fire_and_warmth_spark_rod_pro.png"),
  fire_and_warmth_wet_wood_negotiator: require("./fire_and_warmth/fire_and_warmth_wet_wood_negotiator.png"),

  // ============================================
  // COOKING AND CAMP KITCHEN (9 badges)
  // ============================================
  cooking_and_camp_kitchen_1: require("./cooking_and_camp_kitchen/cooking_and_camp_kitchen_1.png"),
  cooking_and_camp_kitchen_2: require("./cooking_and_camp_kitchen/cooking_and_camp_kitchen_2.png"),
  cooking_and_camp_kitchen_3: require("./cooking_and_camp_kitchen/cooking_and_camp_kitchen_3.png"),
  cooking_and_camp_kitchen_4: require("./cooking_and_camp_kitchen/cooking_and_camp_kitchen_4.png"),
  cooking_and_camp_kitchen_5: require("./cooking_and_camp_kitchen/cooking_and_camp_kitchen_5.png"),
  cooking_and_camp_kitchen_6: require("./cooking_and_camp_kitchen/cooking_and_camp_kitchen_6.png"),
  cooking_and_camp_kitchen_7: require("./cooking_and_camp_kitchen/cooking_and_camp_kitchen_7.png"),
  cooking_and_camp_kitchen_8: require("./cooking_and_camp_kitchen/cooking_and_camp_kitchen_8.png"),
  cooking_and_camp_kitchen_9: require("./cooking_and_camp_kitchen/cooking_and_camp_kitchen_9.png"),

  // ============================================
  // COMFORT AND SLEEP (9 badges)
  // ============================================
  comfort_and_sleep_1: require("./comfort_and_sleep/comfort_and_sleep_1.png"),
  comfort_and_sleep_2: require("./comfort_and_sleep/comfort_and_sleep_2.png"),
  comfort_and_sleep_3: require("./comfort_and_sleep/comfort_and_sleep_3.png"),
  comfort_and_sleep_4: require("./comfort_and_sleep/comfort_and_sleep_4.png"),
  comfort_and_sleep_5: require("./comfort_and_sleep/comfort_and_sleep_5.png"),
  comfort_and_sleep_6: require("./comfort_and_sleep/comfort_and_sleep_6.png"),
  comfort_and_sleep_7: require("./comfort_and_sleep/comfort_and_sleep_7.png"),
  comfort_and_sleep_8: require("./comfort_and_sleep/comfort_and_sleep_8.png"),
  comfort_and_sleep_9: require("./comfort_and_sleep/comfort_and_sleep_9.png"),

  // ============================================
  // NAVIGATION AND SKILLS (9 badges)
  // ============================================
  navigation_and_skills_1: require("./navigation_and_skills/navigation_and_skills_1.png"),
  navigation_and_skills_2: require("./navigation_and_skills/navigation_and_skills_2.png"),
  navigation_and_skills_3: require("./navigation_and_skills/navigation_and_skills_3.png"),
  navigation_and_skills_4: require("./navigation_and_skills/navigation_and_skills_4.png"),
  navigation_and_skills_5: require("./navigation_and_skills/navigation_and_skills_5.png"),
  navigation_and_skills_6: require("./navigation_and_skills/navigation_and_skills_6.png"),
  navigation_and_skills_7: require("./navigation_and_skills/navigation_and_skills_7.png"),
  navigation_and_skills_8: require("./navigation_and_skills/navigation_and_skills_8.png"),
  navigation_and_skills_9: require("./navigation_and_skills/navigation_and_skills_9.png"),

  // ============================================
  // NATURE NERD (9 badges)
  // ============================================
  nature_nerd_1: require("./nature_nerd/nature_nerd_1.png"),
  nature_nerd_2: require("./nature_nerd/nature_nerd_2.png"),
  nature_nerd_3: require("./nature_nerd/nature_nerd_3.png"),
  nature_nerd_4: require("./nature_nerd/nature_nerd_4.png"),
  nature_nerd_5: require("./nature_nerd/nature_nerd_5.png"),
  nature_nerd_6: require("./nature_nerd/nature_nerd_6.png"),
  nature_nerd_7: require("./nature_nerd/nature_nerd_7.png"),
  nature_nerd_8: require("./nature_nerd/nature_nerd_8.png"),
  nature_nerd_9: require("./nature_nerd/nature_nerd_9.png"),

  // ============================================
  // SAFETY AND READINESS (9 badges)
  // ============================================
  safety_and_readiness_1: require("./safety_and_readiness/safety_and_readiness_1.png"),
  safety_and_readiness_2: require("./safety_and_readiness/safety_and_readiness_2.png"),
  safety_and_readiness_3: require("./safety_and_readiness/safety_and_readiness_3.png"),
  safety_and_readiness_4: require("./safety_and_readiness/safety_and_readiness_4.png"),
  safety_and_readiness_5: require("./safety_and_readiness/safety_and_readiness_5.png"),
  safety_and_readiness_6: require("./safety_and_readiness/safety_and_readiness_6.png"),
  safety_and_readiness_7: require("./safety_and_readiness/safety_and_readiness_7.png"),
  safety_and_readiness_8: require("./safety_and_readiness/safety_and_readiness_8.png"),
  safety_and_readiness_9: require("./safety_and_readiness/safety_and_readiness_9.png"),
} as const;

/**
 * Type for valid badge image keys
 */
export type BadgeImageKey = keyof typeof badgeImages;

/**
 * Get all available badge image keys
 */
export function getAllBadgeImageKeys(): BadgeImageKey[] {
  return Object.keys(badgeImages) as BadgeImageKey[];
}
