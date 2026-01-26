/**
 * Photo Daily Limit Service
 * 
 * Manages daily photo upload limits for FREE users.
 * - FREE users: 1 photo per calendar day
 * - PRO users: Unlimited
 * 
 * Uses America/Chicago timezone for consistent day boundaries.
 * Stores limit data in Firestore: /users/{userId}/dailyUsage/{YYYY-MM-DD}
 */

import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { useSubscriptionStore } from '../state/subscriptionStore';
import { useUserStore } from '../state/userStore';

// Daily limit for FREE users
export const FREE_DAILY_PHOTO_LIMIT = 1;

/**
 * Get today's date string in YYYY-MM-DD format using America/Chicago timezone
 */
export function getTodayDateString(): string {
  const now = new Date();
  // Format in America/Chicago timezone
  const chicagoDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const year = chicagoDate.getFullYear();
  const month = String(chicagoDate.getMonth() + 1).padStart(2, '0');
  const day = String(chicagoDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the daily usage document reference for a user and date
 */
function getDailyUsageRef(userId: string, dateString: string) {
  return doc(db, 'users', userId, 'dailyUsage', dateString);
}

interface DailyUsage {
  photoPosts: number;
  lastPhotoPostAt?: any;
  createdAt?: any;
}

/**
 * Check if the current user can upload a photo today
 * @returns { canUpload: boolean, remaining: number, isPro: boolean }
 */
export async function canUploadPhotoToday(): Promise<{ 
  canUpload: boolean; 
  remaining: number; 
  isPro: boolean;
  message?: string;
}> {
  const user = auth.currentUser;
  if (!user) {
    return { canUpload: false, remaining: 0, isPro: false, message: 'Not logged in' };
  }

  // Check if user is admin - unlimited uploads, bypass all limits
  const isAdmin = useUserStore.getState().isAdministrator();
  if (isAdmin) {
    return { canUpload: true, remaining: -1, isPro: true }; // -1 indicates unlimited
  }

  // Check if user is PRO - unlimited uploads
  const isPro = useSubscriptionStore.getState().isPro;
  if (isPro) {
    return { canUpload: true, remaining: -1, isPro: true }; // -1 indicates unlimited
  }

  // FREE user - check daily limit
  const today = getTodayDateString();
  const usageRef = getDailyUsageRef(user.uid, today);
  
  try {
    const usageSnap = await getDoc(usageRef);
    
    if (!usageSnap.exists()) {
      // No usage record for today - can upload
      return { canUpload: true, remaining: FREE_DAILY_PHOTO_LIMIT, isPro: false };
    }

    const usage = usageSnap.data() as DailyUsage;
    const photoPosts = usage.photoPosts || 0;
    const remaining = Math.max(0, FREE_DAILY_PHOTO_LIMIT - photoPosts);

    if (photoPosts >= FREE_DAILY_PHOTO_LIMIT) {
      return { 
        canUpload: false, 
        remaining: 0, 
        isPro: false,
        message: "You've hit today's photo limit. Try again tomorrow, or upgrade for unlimited photo posts."
      };
    }

    return { canUpload: true, remaining, isPro: false };
  } catch (error) {
    console.error('Error checking photo limit:', error);
    // On error, allow the upload but log the issue
    return { canUpload: true, remaining: 1, isPro: false };
  }
}

/**
 * Record a photo upload for the current user
 * Call this AFTER a successful photo upload
 */
export async function recordPhotoUpload(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be logged in to record photo upload');
  }

  // PRO users don't need to track (but we can for analytics)
  const isPro = useSubscriptionStore.getState().isPro;
  
  const today = getTodayDateString();
  const usageRef = getDailyUsageRef(user.uid, today);

  try {
    const usageSnap = await getDoc(usageRef);

    if (!usageSnap.exists()) {
      // Create new usage record
      await setDoc(usageRef, {
        photoPosts: 1,
        lastPhotoPostAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        isPro, // Track subscription status at time of post
      });
    } else {
      // Increment existing record
      await updateDoc(usageRef, {
        photoPosts: increment(1),
        lastPhotoPostAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error recording photo upload:', error);
    // Don't throw - the photo was already uploaded successfully
  }
}

/**
 * Get photo usage stats for the current user today
 */
export async function getPhotoUsageToday(): Promise<{
  used: number;
  limit: number;
  remaining: number;
  isPro: boolean;
}> {
  const user = auth.currentUser;
  if (!user) {
    return { used: 0, limit: FREE_DAILY_PHOTO_LIMIT, remaining: 0, isPro: false };
  }

  // Admin bypass - unlimited
  const isAdmin = useUserStore.getState().isAdministrator();
  if (isAdmin) {
    return { used: 0, limit: -1, remaining: -1, isPro: true }; // Unlimited
  }

  const isPro = useSubscriptionStore.getState().isPro;
  if (isPro) {
    return { used: 0, limit: -1, remaining: -1, isPro: true }; // Unlimited
  }

  const today = getTodayDateString();
  const usageRef = getDailyUsageRef(user.uid, today);

  try {
    const usageSnap = await getDoc(usageRef);
    const used = usageSnap.exists() ? (usageSnap.data().photoPosts || 0) : 0;
    const remaining = Math.max(0, FREE_DAILY_PHOTO_LIMIT - used);

    return { used, limit: FREE_DAILY_PHOTO_LIMIT, remaining, isPro: false };
  } catch (error) {
    console.error('Error getting photo usage:', error);
    return { used: 0, limit: FREE_DAILY_PHOTO_LIMIT, remaining: FREE_DAILY_PHOTO_LIMIT, isPro: false };
  }
}
