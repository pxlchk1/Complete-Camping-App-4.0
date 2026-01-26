// src/constants/colors.ts
// Legacy high-contrast palette (original app look)

export const INK = "#3D2817"; // high contrast body text

export const PARCHMENT = "#EEE7D9";
export const PARCHMENT_SOFT = "#F4F2EC";

export const DEEP_FOREST = "#1A4C39";
export const DEEP_FOREST_PRESSED = "#104233";

export const EARTH_GREEN = "#485951"; // muted green-gray
export const RIVER_ROCK = "#DDEBE4"; // pale mint hint used in selected states

export const GRANITE_GOLD = "#986C42"; // warm tan
export const RUST = "#B5591D";
export const RUST_ORANGE = RUST; // Alias for backward compatibility
export const RUST_DEEP = "#7E4015";

export const TEXT_PRIMARY = INK;
export const TEXT_SECONDARY = "#485951";
export const TEXT_ON_DARK = "#FFFFFF";

export const BORDER_SOFT = "#CCBFA9";
export const CARD_BACKGROUND_LIGHT = PARCHMENT_SOFT;

export const DISABLED_BG = "#E6E1D6";
export const DISABLED_TEXT = "#8A8076";

// List row alternating background (10% darker than PARCHMENT)
export const LIST_ROW_DEFAULT = "#F4EBD0"; // matches tailwind parchment
export const LIST_ROW_ALT = "#E8DFC5"; // 10% darker for alternating rows

// Additional exports for backward compatibility with existing screens
export const TEXT_PRIMARY_STRONG = INK;
export const TEXT_MUTED = "#7A8A82";
export const SIERRA_SKY = "#92AFB1";
export const PARCHMENT_BORDER = BORDER_SOFT;
export const PARCHMENT_BACKGROUND = PARCHMENT;
export const CARD_BACKGROUND_ALT = PARCHMENT_SOFT;
export const SURFACE_HEADER_DARK = DEEP_FOREST;
export const BORDER_STRONG = "#374543";
export const HAIRLINE_RUST = "#B26A4A";
export const PARCHMENT_95 = "rgba(238, 231, 217, 0.95)";

// Legacy aliases for backward compatibility
export const TL_FOREST_GREEN = DEEP_FOREST;
export const TL_SAGE = EARTH_GREEN;
export const TL_GOLDEN_TAN = GRANITE_GOLD;
export const TL_DEEP_SAGE = RIVER_ROCK;
export const TL_SKY_BLUE = SIERRA_SKY;
export const TL_PARCHMENT = PARCHMENT;
export const TL_FOREST_SUBTLE = "rgba(26, 76, 57, 0.1)";
export const TL_PARCHMENT_SUBTLE = PARCHMENT;
export const TL_INK = DEEP_FOREST;
export const TL_INK_LIGHT = EARTH_GREEN;
export const TL_BROWN = GRANITE_GOLD;
export const LODGE_FOREST = DEEP_FOREST;
export const LODGE_AMBER = GRANITE_GOLD;
export const LODGE_STONE_600 = EARTH_GREEN;
