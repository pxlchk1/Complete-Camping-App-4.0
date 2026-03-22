/**
 * Handle Service
 * 
 * Manages user handles with uniqueness guarantees.
 * Provides placeholder handles for users who haven't set one.
 * 
 * Handle Rules:
 * - 3-20 characters
 * - lowercase letters, numbers, and underscores only
 * - must not start with underscore
 * 
 * Placeholder Handle Format:
 * - "camper" + 5 digits (camper00000 to camper99999)
 * - Guaranteed unique via userHandlesIndex collection
 */

import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

// ==================== Handle Validation ====================

/**
 * Validates a handle according to the rules:
 * - 3-20 characters
 * - lowercase letters, numbers, underscores only
 * - must not start with underscore
 */
export function isValidHandle(handle: string | null | undefined): boolean {
  if (!handle || typeof handle !== "string") return false;
  
  const trimmed = handle.trim().toLowerCase();
  
  // Length check: 3-20 chars
  if (trimmed.length < 3 || trimmed.length > 20) return false;
  
  // Character check: lowercase letters, numbers, underscores only
  if (!/^[a-z0-9_]+$/.test(trimmed)) return false;
  
  // Must not start with underscore
  if (trimmed.startsWith("_")) return false;
  
  // Reject "anonymous" and "user" as invalid
  if (trimmed === "anonymous" || trimmed === "user") return false;
  
  return true;
}

/**
 * Normalizes a handle for display (lowercase, trimmed)
 */
export function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase();
}

// ==================== Deterministic Placeholder Handle ====================

/**
 * Generates a deterministic placeholder handle from a userId.
 * Uses a simple hash to create a 5-digit number.
 * This ensures the same userId always gets the same placeholder.
 */
export function generatePlaceholderFromUserId(userId: string): string {
  if (!userId) return "camper00000";
  
  // Simple hash function: sum of char codes
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to positive number in range 00000-99999
  const num = Math.abs(hash) % 100000;
  return `camper${num.toString().padStart(5, "0")}`;
}

// ==================== Placeholder Handle Generation ====================

/**
 * Generates a random 5-digit number string (00000-99999)
 */
function generateRandomDigits(): string {
  const num = Math.floor(Math.random() * 100000);
  return num.toString().padStart(5, "0");
}

/**
 * Generates a placeholder handle like "camper12345"
 */
function generatePlaceholderHandle(): string {
  return `camper${generateRandomDigits()}`;
}

/**
 * Creates a unique placeholder handle with transaction-based uniqueness.
 * Retries up to maxRetries times if there's a collision.
 */
export async function createUniquePlaceholderHandle(
  userId: string,
  maxRetries: number = 10
): Promise<string> {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    const candidate = generatePlaceholderHandle();
    
    try {
      // Use a transaction to ensure atomicity
      await runTransaction(db, async (transaction) => {
        const handleIndexRef = doc(db, "userHandlesIndex", candidate);
        const handleDoc = await transaction.get(handleIndexRef);
        
        if (handleDoc.exists()) {
          // Handle already taken, throw to retry
          throw new Error("HANDLE_COLLISION");
        }
        
        // Reserve the handle in the index
        transaction.set(handleIndexRef, {
          userId,
          createdAt: serverTimestamp(),
          isPlaceholder: true,
        });
        
        // Update the user document with the placeholder handle
        const userRef = doc(db, "users", userId);
        transaction.set(userRef, {
          placeholderHandle: candidate,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });
      
      console.log(`[HandleService] Created placeholder handle: ${candidate} for user: ${userId}`);
      return candidate;
      
    } catch (error: any) {
      if (error.message === "HANDLE_COLLISION") {
        attempts++;
        console.log(`[HandleService] Handle collision on attempt ${attempts}, retrying...`);
        continue;
      }
      // Other error, rethrow
      throw error;
    }
  }
  
  throw new Error(`[HandleService] Failed to create unique placeholder handle after ${maxRetries} attempts`);
}

/**
 * Reserves a custom handle in the index with transaction-based uniqueness.
 * Also writes handle to both users/{uid} and profiles/{uid} atomically.
 * Returns true if successful, false if handle is taken.
 */
export async function reserveHandle(
  userId: string,
  handle: string
): Promise<boolean> {
  const normalizedHandle = normalizeHandle(handle);
  
  if (!isValidHandle(normalizedHandle)) {
    console.error("[HandleService] Invalid handle format:", handle);
    return false;
  }
  
  try {
    await runTransaction(db, async (transaction) => {
      const handleIndexRef = doc(db, "userHandlesIndex", normalizedHandle);
      const handleDoc = await transaction.get(handleIndexRef);
      
      if (handleDoc.exists()) {
        const existingUserId = handleDoc.data()?.userId;
        if (existingUserId !== userId) {
          throw new Error("HANDLE_TAKEN");
        }
        // User already owns this handle, nothing to do
        return;
      }
      
      // Reserve the handle
      transaction.set(handleIndexRef, {
        userId,
        createdAt: serverTimestamp(),
        isPlaceholder: false,
      });
      
      // Update both user and profile documents atomically
      const userRef = doc(db, "users", userId);
      transaction.set(userRef, {
        handle: normalizedHandle,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      const profileRef = doc(db, "profiles", userId);
      transaction.set(profileRef, {
        handle: normalizedHandle,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });
    
    console.log(`[HandleService] Reserved handle: ${normalizedHandle} for user: ${userId}`);
    return true;
    
  } catch (error: any) {
    if (error.message === "HANDLE_TAKEN") {
      console.log(`[HandleService] Handle already taken: ${normalizedHandle}`);
      return false;
    }
    throw error;
  }
}

// ==================== Display Handle Resolution ====================

export interface UserHandleData {
  handle?: string | null;
  placeholderHandle?: string | null;
}

/**
 * Gets the display handle for a user.
 * Priority:
 * 1. Valid custom handle
 * 2. Existing placeholder handle
 * 3. Returns null (caller should trigger placeholder generation)
 */
export function getDisplayHandle(userData: UserHandleData | null | undefined): string | null {
  if (!userData) return null;
  
  // Check for valid custom handle first
  if (userData.handle && isValidHandle(userData.handle)) {
    return normalizeHandle(userData.handle);
  }
  
  // Fall back to placeholder handle
  if (userData.placeholderHandle) {
    return userData.placeholderHandle;
  }
  
  return null;
}

/**
 * Gets the display handle with a synchronous fallback.
 * Use this when you need to display something immediately.
 * Returns "camper" as a temporary fallback if no handle exists.
 */
export function getDisplayHandleSync(userData: UserHandleData | null | undefined): string {
  const handle = getDisplayHandle(userData);
  return handle || "camper";
}

/**
 * Ensures a user has a display handle (either custom or placeholder).
 * If neither exists, creates a placeholder handle.
 * Returns the handle to display.
 */
export async function ensureDisplayHandle(userId: string): Promise<string> {
  try {
    // Get current user data
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data() as UserHandleData;
      
      // Check for valid custom handle
      if (userData.handle && isValidHandle(userData.handle)) {
        return normalizeHandle(userData.handle);
      }
      
      // Check for existing placeholder
      if (userData.placeholderHandle) {
        return userData.placeholderHandle;
      }
    }
    
    // No valid handle found, create a placeholder
    return await createUniquePlaceholderHandle(userId);
    
  } catch (error) {
    console.error("[HandleService] Error ensuring display handle:", error);
    // Return a temporary fallback - this should not persist
    return "camper";
  }
}

/**
 * Bulk fetch handles for multiple user IDs.
 * Returns a map of userId -> displayHandle.
 */
export async function fetchHandlesForUsers(userIds: string[]): Promise<Record<string, string>> {
  const handles: Record<string, string> = {};
  
  // Deduplicate and filter empty IDs
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  
  await Promise.all(
    uniqueIds.map(async (userId) => {
      try {
        const handle = await ensureDisplayHandle(userId);
        handles[userId] = handle;
      } catch (error) {
        console.error(`[HandleService] Error fetching handle for ${userId}:`, error);
        handles[userId] = "camper";
      }
    })
  );
  
  return handles;
}

/**
 * Gets handle from profiles collection (legacy support).
 * Used when we already have profile data with handle field.
 */
export function getHandleFromProfile(profileData: { handle?: string | null } | null | undefined): string {
  if (!profileData) return "camper";
  
  if (profileData.handle && isValidHandle(profileData.handle)) {
    return normalizeHandle(profileData.handle);
  }
  
  return "camper";
}

// ==================== Connect Display Helper ====================

/**
 * Gets the display handle for Connect content.
 * This is the PRIMARY function to use in Connect screens.
 * 
 * Priority:
 * 1. Valid authorHandle from content
 * 2. Deterministic placeholder from authorId
 * 3. "camper" as last resort
 * 
 * NEVER returns "Anonymous", "@user", or empty string.
 */
export function getConnectDisplayHandle(
  authorHandle: string | null | undefined,
  authorId: string | null | undefined
): string {
  // Check if authorHandle is valid (not empty, not "anonymous", not "user")
  if (authorHandle && isValidHandle(authorHandle)) {
    return normalizeHandle(authorHandle);
  }
  
  // Handle is invalid or missing - generate deterministic placeholder from authorId
  if (authorId) {
    return generatePlaceholderFromUserId(authorId);
  }
  
  // Last resort - should rarely happen
  return "camper";
}

/**
 * Formats handle with @ prefix for display
 */
export function formatHandleDisplay(handle: string): string {
  const cleanHandle = handle.replace(/^@+/, "");
  return `@${cleanHandle}`;
}
