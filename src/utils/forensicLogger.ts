/**
 * FORENSIC TEMP — Diagnostic logging for release integrity verification.
 * 
 * Provides a single structured logger with [FORENSIC] prefix so all
 * diagnostic output is easy to find and easy to remove once the pass
 * is complete. No business logic lives here.
 * 
 * REMOVAL: Delete this file and grep-remove every import/call site
 * referencing "forensicLogger" or "forensicLog".
 */

import { getUpdateMetadata } from "./updateDiagnostics";

const FORENSIC_BUILD_SHA = "9dca737";
const FORENSIC_BUILD_DATE = "2025-07-25";

/**
 * Log a labeled forensic diagnostic entry.
 * Always prints to console regardless of __DEV__ so TestFlight
 * device logs capture it too.
 */
export function forensicLog(label: string, data: Record<string, unknown>): void {
  const line = `[FORENSIC][${label}] ${JSON.stringify(data)}`;
  console.log(line);
}

/**
 * Returns a short summary string suitable for displaying in the UI
 * forensic banner. Includes build SHA, versions, update state.
 */
export function getForensicBannerText(): string {
  const m = getUpdateMetadata();
  const parts = [
    `SHA ${FORENSIC_BUILD_SHA}`,
    `v${m.appVersion ?? "?"}`,
    `build ${m.nativeBuildVersion ?? "?"}`,
    `rt ${m.runtimeVersion ?? "?"}`,
    m.updateId ? `OTA ${m.updateId.slice(0, 8)}` : "embedded",
    `ch ${m.channel ?? "none"}`,
  ];
  return parts.join(" | ");
}

/**
 * Log full build/update metadata once at app startup.
 */
export function forensicLogStartup(): void {
  const m = getUpdateMetadata();
  forensicLog("STARTUP", {
    forensicBuildSHA: FORENSIC_BUILD_SHA,
    forensicBuildDate: FORENSIC_BUILD_DATE,
    appVersion: m.appVersion,
    nativeBuildVersion: m.nativeBuildVersion,
    runtimeVersion: m.runtimeVersion,
    updateId: m.updateId,
    channel: m.channel,
    isEmbeddedLaunch: m.isEmbeddedLaunch,
    isEnabled: m.isEnabled,
    createdAt: m.createdAt?.toISOString() ?? null,
    platform: m.platform,
  });
}
