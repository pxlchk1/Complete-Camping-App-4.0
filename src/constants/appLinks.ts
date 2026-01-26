/**
 * App Links Configuration
 * Central location for all app store and deep links
 */

// App Store Links
export const APP_STORE_ID = "6752673528";
export const APP_STORE_SKU = "TLCAMP001";
export const APP_STORE_LINK = `https://apps.apple.com/app/id${APP_STORE_ID}`;

// Google Play Links (for future Android support)
export const PLAY_STORE_PACKAGE = "com.tentandlantern.completecampingapp";
export const PLAY_STORE_LINK = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;

// Deep Link Domain
export const DEEP_LINK_DOMAIN = "tentandlantern.com";

// Invite Link Base URL
export const INVITE_LINK_BASE = `https://${DEEP_LINK_DOMAIN}/join`;

/**
 * Generate the full invite link from a token
 */
export function getInviteLinkUrl(token: string): string {
  return `${INVITE_LINK_BASE}?token=${token}`;
}

/**
 * Get the App Store download link
 */
export function getAppDownloadLink(): string {
  return APP_STORE_LINK;
}

/**
 * Check if the app is published to the App Store
 */
export function isAppPublished(): boolean {
  return true; // App ID: 6752673528
}

// App info for sharing
export const APP_NAME = "The Complete Camping App";
export const APP_SHORT_NAME = "Tent & Lantern";

/**
 * Generate invite share message with App Store link
 * Since deep links aren't configured on the domain, we direct users to the App Store
 * and include instructions to accept the invite within the app.
 */
export function generateShareInviteMessage(inviterFirstName: string, inviteToken: string): string {
  return `${inviterFirstName} invited you to join their campground on ${APP_NAME}! 🏕️\n\nDownload the app to accept:\n${APP_STORE_LINK}\n\nYour invite code: ${inviteToken.substring(0, 8)}...`;
}

/**
 * Generate the copyable invite link text
 * Includes App Store link since deep links aren't configured
 */
export function getCopyableInviteText(inviterFirstName: string, inviteToken: string): string {
  return `${inviterFirstName} wants you to join their campground on ${APP_NAME}! 🏕️\n\nDownload the app: ${APP_STORE_LINK}\n\nThen use invite code: ${inviteToken.substring(0, 8)}`;
}
