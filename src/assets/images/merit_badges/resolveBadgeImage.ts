/**
 * Badge Image Resolver
 *
 * Safe helper to resolve badge images by imageKey with fallback support.
 * Metro bundler requires static require() calls, so this resolver looks up
 * pre-registered images from the badgeImageMap.
 */

import { badgeImages, BadgeImageKey } from "./badgeImageMap";

/**
 * Resolve a badge image by its imageKey.
 *
 * @param imageKey - The badge's imageKey (filename without extension)
 * @returns The required image source, or fallback placeholder if key not found
 *
 * @example
 * // Valid key returns the badge image
 * const source = resolveBadgeImage("camp_setup_and_shelter_1");
 *
 * // Invalid key returns placeholder
 * const fallback = resolveBadgeImage("nonexistent_badge");
 */
export function resolveBadgeImage(imageKey: string | undefined | null): number {
  if (!imageKey) {
    return badgeImages.badge_placeholder;
  }

  const image = badgeImages[imageKey as BadgeImageKey];

  if (image !== undefined) {
    return image;
  }

  // Log warning in development for debugging
  if (__DEV__) {
    console.warn(`[resolveBadgeImage] Unknown imageKey: "${imageKey}", using placeholder`);
  }

  return badgeImages.badge_placeholder;
}

/**
 * Check if a badge image exists for the given key.
 *
 * @param imageKey - The badge's imageKey to check
 * @returns true if the image exists in the registry
 */
export function hasBadgeImage(imageKey: string | undefined | null): boolean {
  if (!imageKey) return false;
  return imageKey in badgeImages;
}

/**
 * Derive imageKey from an imageFile path.
 * Strips the .png extension and any directory path.
 *
 * @param imageFile - Full filename like "camp_setup_and_shelter_1.png"
 * @returns The imageKey like "camp_setup_and_shelter_1"
 *
 * @example
 * deriveImageKey("camp_setup_and_shelter_1.png") // "camp_setup_and_shelter_1"
 * deriveImageKey("fire_and_warmth/fire_and_warmth_campfire_storyteller.png") // "fire_and_warmth_campfire_storyteller"
 */
export function deriveImageKey(imageFile: string | undefined | null): string {
  if (!imageFile) return "";

  // Remove directory path if present
  const filename = imageFile.includes("/")
    ? imageFile.split("/").pop() || imageFile
    : imageFile;

  // Remove .png extension
  return filename.replace(/\.png$/i, "");
}
