/**
 * Merit Badge Image Assets
 *
 * Re-exports the badge image registry and resolver utilities.
 */

export { badgeImages, getAllBadgeImageKeys } from "./badgeImageMap";
export type { BadgeImageKey } from "./badgeImageMap";
export { resolveBadgeImage, hasBadgeImage, deriveImageKey } from "./resolveBadgeImage";
