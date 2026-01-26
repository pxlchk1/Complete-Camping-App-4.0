# Membership Tier Migration Guide

## Overview
This guide explains how to migrate membership tiers from the old system to the new simplified system.

## New Membership Tier Structure

The app now uses four membership tiers that map directly to Firebase `profiles` collection:

| Tier | Display Label | Capsule Color | Description |
|------|---------------|---------------|-------------|
| `isAdmin` | Admin & Founder | Sierra Sky Blue (#92AFB1) | Admin and founder access |
| `isModerator` | Moderator | Granite Gold Tan (#AC9A6D) | Moderator access |
| `subscribed` | Pro Member | Deep Forest (#485952) | Paid subscription members |
| `freeMember` | Free Member | Red (#ef4444) | Free tier users |

## Migration Steps

### 1. Update Your Firebase Profile

Your profile should have `membershipTier: "isAdmin"` since you're the admin.

**To update in Firebase Console:**
1. Go to Firebase Console → Firestore Database
2. Navigate to `profiles` collection
3. Find your profile document (by email: `alana@tentandlantern.com`)
4. Edit the `membershipTier` field
5. Set value to: `isAdmin`

### 2. Run the Migration Script (Optional)

If you have existing users that need to be migrated from the old tier system, you can run the migration script:

```typescript
import { updateMembershipTiers } from './src/scripts/updateMembershipTiers';

// In your app initialization or admin panel:
await updateMembershipTiers();
```

This will automatically migrate:
- `free` → `freeMember`
- `premium`, `weekendCamper`, `trailLeader`, `backcountryGuide` → `subscribed`
- `isAdmin` → `isAdmin` (unchanged)
- `isModerator` → `isModerator` (unchanged)

### 3. Test the Display

Once updated, your My Campsite screen should show:
- Your avatar and name centered in the cover photo
- A blue capsule below with "Admin & Founder"

## Firebase Structure

### Profiles Collection
```typescript
{
  "profiles": {
    "<userId>": {
      "membershipTier": "isAdmin" | "isModerator" | "subscribed" | "freeMember",
      "displayName": "Alana Waters",
      "handle": "tentandlantern",
      "email": "alana@tentandlantern.com",
      // ... other fields
    }
  }
}
```

## Manual Updates for Specific Users

If you need to manually set membership tiers for specific users:

### Make Someone a Moderator
1. Find their profile in Firestore
2. Set `membershipTier: "isModerator"`
3. They'll see a dark tan "Moderator" capsule

### Grant Pro Membership
1. Find their profile in Firestore
2. Set `membershipTier: "subscribed"`
3. They'll see a deep forest "Pro Member" capsule

### Downgrade to Free
1. Find their profile in Firestore
2. Set `membershipTier: "freeMember"`
3. They'll see a red "Free Member" capsule

## Code Changes Summary

Updated files:
- ✅ `src/types/user.ts` - Updated MembershipTier type
- ✅ `src/screens/MyCampsiteScreen.tsx` - Updated display logic and colors
- ✅ `src/services/userService.ts` - Updated profile creation and access checks
- ✅ `src/services/subscriptionService.ts` - Updated subscription sync logic
- ✅ `src/screens/HomeScreen.tsx` - Updated subscription checks
- ✅ `src/screens/AuthLanding.tsx` - Updated auth defaults
- ✅ `src/screens/SettingsScreen.tsx` - Updated settings defaults
- ✅ `src/screens/AdminSubscriptionsScreen.tsx` - Updated admin grant logic

## Color Reference

For consistency, these are the brand colors used:

```typescript
// From src/constants/colors.ts
SIERRA_SKY = "#92AFB1"      // Brand blue - for isAdmin
GRANITE_GOLD = "#AC9A6D"    // Brand tan - for isModerator
DEEP_FOREST = "#485952"     // Brand forest - for subscribed
RED = "#ef4444"             // Warning red - for freeMember
```

## Testing Checklist

- [ ] Your profile shows "Admin & Founder" in blue capsule
- [ ] Free users show "Free Member" in red capsule
- [ ] Paid subscribers show "Pro Member" in deep forest capsule
- [ ] Moderators show "Moderator" in tan capsule
- [ ] Capsule displays properly on cover photo overlay
- [ ] Text is readable (white text on colored background)

## Rollback

If you need to rollback, the old tier system used:
- `free` → Free member
- `premium` → Paid member
- `weekendCamper`, `trailLeader`, `backcountryGuide` → Subscription tiers

However, the new system is simpler and recommended for production use.
