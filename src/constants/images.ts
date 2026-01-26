/**
 * Image assets for Complete Camping App
 * All hero images and illustrations
 */

// Hero images (full-width at top of screens)
export const HERO_IMAGES = {
  WELCOME: require("../../assets/images/welcome.png"),
  COMMUNITY: require("../../assets/images/community.png"),
  LEARNING: require("../../assets/images/learning.png"),
  FIRST_AID: require("../../assets/images/first_aid.png"),
  WEATHER: require("../../assets/images/weather.png"),
  PLAN_TRIP: require("../../assets/images/plan_trip.png"),
  PACKING: require("../../assets/images/packing.png"),
  MEALS: require("../../assets/images/meals.png"),
  HEADER: require("../../assets/images/header.png"),
};

// Empty state illustrations
export const EMPTY_STATE_IMAGES = {
  MEALS: require("../../assets/images/meals.png"),
  PLAN_TRIP: require("../../assets/images/plan_trip.png"),
  PACKING: require("../../assets/images/packing.png"),
};

// Legacy/additional backgrounds
export const BACKGROUNDS = {
  HOME_HEADER: require("../../assets/images/welcome.png"),
};

// Placeholder images for community features
export const PLACEHOLDERS = {
  USER_AVATAR: "https://via.placeholder.com/100",
  PHOTO_PLACEHOLDER: "https://via.placeholder.com/300",
} as const;

// App icon
export const LOGOS = {
  APP_ICON: require("../../assets/icon.png"),
} as const;
