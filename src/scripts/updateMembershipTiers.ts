/**
 * Update Membership Tiers Script
 * 
 * This script migrates the membershipTier field in the profiles collection
 * from the old values (free, premium, weekendCamper, trailLeader, backcountryGuide)
 * to the new values (freeMember, subscribed, isAdmin, isModerator)
 * 
 * Usage:
 * 1. Import this file in your app
 * 2. Call updateMembershipTiers() once to migrate all profiles
 * 
 * NEW MEMBERSHIP TIERS:
 * - isAdmin: Admin & Founder (blue capsule)
 * - isModerator: Moderator (dark tan capsule)
 * - subscribed: Pro Member (deep forest capsule)
 * - freeMember: Free Member (red capsule)
 */

import { collection, getDocs, doc, updateDoc, query } from "firebase/firestore";
import { db } from "../config/firebase";

type OldTier = "free" | "premium" | "weekendCamper" | "trailLeader" | "backcountryGuide" | "isAdmin" | "isModerator";
type NewTier = "freeMember" | "subscribed" | "isAdmin" | "isModerator";

/**
 * Maps old membership tier values to new ones
 */
function mapMembershipTier(oldTier: string | undefined): NewTier {
  // Keep admin and moderator status
  if (oldTier === "isAdmin") return "isAdmin";
  if (oldTier === "isModerator") return "isModerator";
  
  // Map all paid tiers to "subscribed"
  if (oldTier === "premium" || 
      oldTier === "weekendCamper" || 
      oldTier === "trailLeader" || 
      oldTier === "backcountryGuide") {
    return "subscribed";
  }
  
  // Default to freeMember
  return "freeMember";
}

/**
 * Updates all profiles in Firebase with new membership tier values
 */
export async function updateMembershipTiers() {
  console.log("[UpdateMembershipTiers] Starting migration...");
  
  try {
    // Get all profiles
    const profilesRef = collection(db, "profiles");
    const profilesSnapshot = await getDocs(profilesRef);
    
    console.log(`[UpdateMembershipTiers] Found ${profilesSnapshot.size} profiles to check`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Update each profile
    for (const profileDoc of profilesSnapshot.docs) {
      const profileData = profileDoc.data();
      const currentTier = profileData.membershipTier as string | undefined;
      const newTier = mapMembershipTier(currentTier);
      
      // Skip if already using new tier format
      if (currentTier === newTier) {
        skippedCount++;
        continue;
      }
      
      try {
        const profileRef = doc(db, "profiles", profileDoc.id);
        await updateDoc(profileRef, {
          membershipTier: newTier,
        });
        
        console.log(`[UpdateMembershipTiers] Updated ${profileDoc.id}: ${currentTier} → ${newTier}`);
        updatedCount++;
      } catch (error) {
        console.error(`[UpdateMembershipTiers] Error updating ${profileDoc.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`[UpdateMembershipTiers] Migration complete!`);
    console.log(`  - Updated: ${updatedCount}`);
    console.log(`  - Skipped (already correct): ${skippedCount}`);
    console.log(`  - Errors: ${errorCount}`);
    
    return {
      total: profilesSnapshot.size,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errorCount,
    };
  } catch (error) {
    console.error("[UpdateMembershipTiers] Migration failed:", error);
    throw error;
  }
}

/**
 * Seeds sample profiles with different membership tiers for testing
 */
export async function seedSampleMembershipTiers() {
  console.log("[UpdateMembershipTiers] Seeding sample tiers...");
  
  // This is just documentation - you would manually set these in Firebase Console
  const samples = [
    {
      email: "alana@tentandlantern.com",
      membershipTier: "isAdmin",
      description: "Admin & Founder - Blue capsule",
    },
    {
      email: "moderator@example.com",
      membershipTier: "isModerator",
      description: "Moderator - Dark tan capsule",
    },
    {
      email: "prouser@example.com",
      membershipTier: "subscribed",
      description: "Pro Member - Deep forest capsule",
    },
    {
      email: "freeuser@example.com",
      membershipTier: "freeMember",
      description: "Free Member - Red capsule",
    },
  ];
  
  console.log("[UpdateMembershipTiers] Sample membership tiers:");
  samples.forEach((sample) => {
    console.log(`  - ${sample.email}: ${sample.membershipTier} (${sample.description})`);
  });
  
  console.log("\nTo set these manually in Firebase Console:");
  console.log("1. Go to Firestore Database");
  console.log("2. Navigate to the 'profiles' collection");
  console.log("3. Find the user by email");
  console.log("4. Edit the 'membershipTier' field to one of: isAdmin, isModerator, subscribed, freeMember");
}
