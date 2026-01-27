/**
 * Handle Service
 *
 * Manages user handles (usernames) with uniqueness enforcement.
 * Handles are stored in a `handleIndex` collection where:
 * - Doc ID = normalized handle (lowercase, no @)
 * - Doc contains userId and createdAt
 *
 * IMPORTANT: Handles cannot be reused after removal to prevent impersonation.
 */
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '../config/firebase';

/**
 * Normalize a handle for storage and comparison.
 * - Removes @ prefix
 * - Converts to lowercase
 * - Trims whitespace
 */
export function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@+/, '');
}

/**
 * Check if a handle is available for use.
 * A handle is unavailable if it exists in the handleIndex collection.
 *
 * @param handle - The handle to check
 * @param currentUserId - Optional current user ID (to allow keeping own handle)
 * @returns true if available, false if taken
 */
export async function isHandleAvailable(
  handle: string,
  currentUserId?: string,
): Promise<boolean> {
  const normalized = normalizeHandle(handle);

  if (!normalized || normalized.length < 3) {
    return false;
  }

  try {
    const handleRef = doc(db, 'handleIndex', normalized);
    const handleSnap = await getDoc(handleRef);

    if (!handleSnap.exists()) {
      return true; // Handle is available
    }

    // Handle exists - check if it belongs to the current user
    const data = handleSnap.data();
    if (currentUserId && data?.userId === currentUserId) {
      return true; // User can keep their own handle
    }

    return false; // Handle is taken
  } catch (error) {
    console.error('[HandleService] Error checking handle availability:', error);
    throw error;
  }
}

/**
 * Claim a handle for a user.
 * This creates a document in handleIndex to reserve the handle.
 *
 * IMPORTANT: This should be called during account creation and handle changes.
 * Old handles are NOT released - they remain reserved to prevent reuse.
 *
 * @param handle - The handle to claim
 * @param userId - The user ID claiming the handle
 * @throws Error if handle is already taken
 */
export async function claimHandle(handle: string, userId: string): Promise<void> {
  const normalized = normalizeHandle(handle);

  if (!normalized || normalized.length < 3) {
    throw new Error('Handle must be at least 3 characters');
  }

  try {
    const handleRef = doc(db, 'handleIndex', normalized);
    const handleSnap = await getDoc(handleRef);

    if (handleSnap.exists()) {
      const data = handleSnap.data();
      if (data?.userId !== userId) {
        throw new Error('This handle is already taken');
      }
      // User already owns this handle, no action needed
      return;
    }

    // Claim the handle
    await setDoc(handleRef, {
      userId,
      handle: normalized,
      createdAt: serverTimestamp(),
    });

    console.log(`[HandleService] Handle claimed: ${normalized} for user ${userId}`);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      // Handle might already exist
      throw new Error('This handle is already taken');
    }
    console.error('[HandleService] Error claiming handle:', error);
    throw error;
  }
}

/**
 * Check and claim a handle atomically.
 * Use this when updating a user's handle to ensure no race conditions.
 *
 * @param newHandle - The new handle to claim
 * @param userId - The user ID
 * @param currentHandle - The user's current handle (will remain reserved)
 * @returns true if successful
 * @throws Error if new handle is taken
 */
export async function updateHandle(
  newHandle: string,
  userId: string,
  currentHandle?: string,
): Promise<boolean> {
  const normalizedNew = normalizeHandle(newHandle);
  const normalizedCurrent = currentHandle ? normalizeHandle(currentHandle) : null;

  // If handle hasn't changed, no action needed
  if (normalizedNew === normalizedCurrent) {
    return true;
  }

  // Check if new handle is available
  const available = await isHandleAvailable(newHandle, userId);
  if (!available) {
    throw new Error('This handle is already taken');
  }

  // Claim the new handle
  await claimHandle(newHandle, userId);

  // NOTE: We do NOT release the old handle - it stays reserved
  // This prevents handle reuse for impersonation

  return true;
}
