/**
 * Update Diagnostics Utility
 * 
 * Provides update/build metadata inspection and dev-only local cache reset.
 * Used for diagnosing OTA update behavior and clearing stale persisted state during testing.
 * 
 * IMPORTANT: Cache reset is dev/admin-only and must never run automatically in production.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Known AsyncStorage keys used by this app's persisted Zustand stores.
 * These are safe to clear for local testing without affecting remote/server data.
 */
const PERSISTED_STORAGE_KEYS = [
  "user-storage",
  "upsell-storage",
  "tip-storage",
  "subscription-storage",
  "meal-storage",
  "auth-storage",
  "learning-progress-storage",
  "gear-storage",
  "image-library-storage",
  "gear-review-storage",
  "trips-list-prefs",
] as const;

export interface UpdateMetadata {
  /** App version from app.json (expo.version) */
  appVersion: string | null;
  /** Native build number (iOS) or version code (Android) */
  nativeBuildVersion: string | null;
  /** Runtime version used for OTA compatibility */
  runtimeVersion: string | null;
  /** Update ID if running a downloaded update */
  updateId: string | null;
  /** Update channel (e.g., "production", "preview") */
  channel: string | null;
  /** Whether the app is running the embedded update vs a downloaded one */
  isEmbeddedLaunch: boolean;
  /** Whether the update system is enabled */
  isEnabled: boolean;
  /** Creation date of the current update, if available */
  createdAt: Date | null;
  /** Platform (ios/android) */
  platform: string;
}

/**
 * Returns current update/build metadata from Expo APIs.
 * Safe to call in any environment.
 */
export function getUpdateMetadata(): UpdateMetadata {
  const manifest = Updates.manifest;
  
  // Get app version from Constants (works for both dev and production)
  const appVersion = Constants.expoConfig?.version ?? null;
  
  // Get native build version
  const nativeBuildVersion = Platform.select({
    ios: Constants.expoConfig?.ios?.buildNumber ?? null,
    android: Constants.expoConfig?.android?.versionCode?.toString() ?? null,
    default: null,
  });

  // Runtime version
  const runtimeVersion = Updates.runtimeVersion ?? null;

  // Update ID (only present for downloaded updates)
  const updateId = Updates.updateId ?? null;

  // Channel (only available for EAS Update)
  const channel = Updates.channel ?? null;

  // Check if running embedded vs downloaded update
  const isEmbeddedLaunch = Updates.isEmbeddedLaunch;

  // Check if updates are enabled
  const isEnabled = Updates.isEnabled;

  // Get creation date from manifest if available
  let createdAt: Date | null = null;
  if (manifest && "createdAt" in manifest && manifest.createdAt) {
    createdAt = new Date(manifest.createdAt as string);
  }

  return {
    appVersion,
    nativeBuildVersion,
    runtimeVersion,
    updateId,
    channel,
    isEmbeddedLaunch,
    isEnabled,
    createdAt,
    platform: Platform.OS,
  };
}

/**
 * Logs update/build diagnostics to console.
 * Should only be called in development or internal builds.
 */
export function logUpdateDiagnostics(): void {
  // Only log in development or internal testing
  if (!__DEV__ && !isInternalBuild()) {
    return;
  }

  const metadata = getUpdateMetadata();

  console.log("=== UPDATE DIAGNOSTICS ===");
  console.log(`App Version: ${metadata.appVersion ?? "unknown"}`);
  console.log(`Native Build: ${metadata.nativeBuildVersion ?? "unknown"}`);
  console.log(`Runtime Version: ${metadata.runtimeVersion ?? "unknown"}`);
  console.log(`Platform: ${metadata.platform}`);
  console.log(`Updates Enabled: ${metadata.isEnabled}`);
  console.log(`Is Embedded Launch: ${metadata.isEmbeddedLaunch}`);
  console.log(`Update ID: ${metadata.updateId ?? "none (embedded)"}`);
  console.log(`Channel: ${metadata.channel ?? "none"}`);
  console.log(`Update Created At: ${metadata.createdAt?.toISOString() ?? "n/a"}`);
  console.log("==========================");
}

/**
 * Check if this is an internal/testflight build (not app store production).
 * This is a heuristic - adjust based on your build configuration.
 */
function isInternalBuild(): boolean {
  // In EAS builds, you can check for specific environment variables or channels
  // For TestFlight, the distribution type isn't easily detectable at runtime
  // Use channel as a proxy if configured
  const channel = Updates.channel;
  if (channel && (channel.includes("preview") || channel.includes("staging") || channel.includes("internal"))) {
    return true;
  }
  
  // Fallback: allow in dev mode only
  return false;
}

/**
 * Check if cache reset should be available.
 * Only allow in development or for admin users.
 */
export function isCacheResetAvailable(): boolean {
  return __DEV__;
}

export interface CacheResetResult {
  success: boolean;
  clearedKeys: string[];
  failedKeys: string[];
  error?: string;
}

/**
 * Clears local persisted app state for testing purposes.
 * 
 * IMPORTANT:
 * - This is MANUAL-ONLY and must be triggered explicitly
 * - This is for DEVELOPMENT/TESTING only
 * - This does NOT delete remote/server data
 * - This does NOT affect Firebase or RevenueCat data
 * - This only clears local AsyncStorage keys owned by this app
 * 
 * @returns Result object with details of what was cleared
 */
export async function clearLocalAppCache(): Promise<CacheResetResult> {
  // Safety guard: only allow in development
  if (!__DEV__) {
    console.warn("[CacheReset] Blocked: cache reset is only available in development mode");
    return {
      success: false,
      clearedKeys: [],
      failedKeys: [],
      error: "Cache reset is only available in development mode",
    };
  }

  console.log("[CacheReset] Starting local app cache reset...");
  console.log("[CacheReset] Keys to clear:", PERSISTED_STORAGE_KEYS);

  const clearedKeys: string[] = [];
  const failedKeys: string[] = [];

  for (const key of PERSISTED_STORAGE_KEYS) {
    try {
      await AsyncStorage.removeItem(key);
      clearedKeys.push(key);
      console.log(`[CacheReset] Cleared: ${key}`);
    } catch (error) {
      failedKeys.push(key);
      console.error(`[CacheReset] Failed to clear ${key}:`, error);
    }
  }

  const success = failedKeys.length === 0;

  console.log("[CacheReset] Complete");
  console.log(`[CacheReset] Cleared ${clearedKeys.length} keys: ${clearedKeys.join(", ")}`);
  if (failedKeys.length > 0) {
    console.log(`[CacheReset] Failed to clear ${failedKeys.length} keys: ${failedKeys.join(", ")}`);
  }

  return {
    success,
    clearedKeys,
    failedKeys,
  };
}

/**
 * Get a formatted summary of update metadata for display in UI.
 */
export function getUpdateSummaryText(): string {
  const metadata = getUpdateMetadata();
  
  const lines = [
    `Version: ${metadata.appVersion ?? "?"} (${metadata.nativeBuildVersion ?? "?"})`,
    `Runtime: ${metadata.runtimeVersion ?? "?"}`,
    `Update: ${metadata.isEmbeddedLaunch ? "Embedded" : "OTA Downloaded"}`,
  ];
  
  if (metadata.updateId) {
    lines.push(`ID: ${metadata.updateId.substring(0, 8)}...`);
  }
  
  if (metadata.channel) {
    lines.push(`Channel: ${metadata.channel}`);
  }

  return lines.join("\n");
}
