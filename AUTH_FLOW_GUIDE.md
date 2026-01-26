# Authentication & Authorization Flow

## Two-Gate System

The Complete Camping App implements a **two-gate authentication and authorization system**:

### Gate 1: Login Check
**Question:** Does the user have an account?
- **No** → Redirect to Login / Create Account (`Auth` screen)
- **Yes** → Continue to Gate 2

### Gate 2: Subscription Check  
**Question:** Are they Pro or Free?
- **Free** → Apply paywall triggers (limited features)
- **Pro** → Full access to all features

## User Types

### Guest (Not Logged In)
**What they can do:**
- ✅ Browse parks (view map, search, filters)
- ✅ View public content (tips, reviews, community posts, gear guides)
- ✅ Look at the My Trips screen (shows "Log in to start planning" empty state)
- ✅ Open Gear Closet or Packing List screens (shows placeholder empty states)
- ✅ Tap Settings, About, FAQs
- ✅ View weather forecasts

**What they cannot do:**
- ❌ Create a trip
- ❌ Save anything (parks, templates, gear)
- ❌ Customize anything
- ❌ Add gear
- ❌ Favorite a park
- ❌ Use templates
- ❌ Adjust advanced filters
- ❌ View their account page
- ❌ Upload photos → AccountRequiredModal
- ❌ Post tips or reviews → AccountRequiredModal
- ❌ Ask questions → AccountRequiredModal
- ❌ Vote on community content → AccountRequiredModal
- ❌ Comment on community posts → AccountRequiredModal

**Trigger:** Any action button shows AccountRequiredModal or redirects to `Auth` screen

### Free Users (Logged In, Not Subscribed)
**What they can do:**
- ✅ Everything guests can do, PLUS:
- ✅ Create **up to 2 trips**
- ✅ Add items to packing lists
- ✅ Save basic preferences
- ✅ Upload profile photo
- ✅ View their account
- ✅ Vote on community content (upvote/downvote)
- ✅ Create tips
- ✅ Ask questions
- ✅ Upload photos (1 per calendar day)

**Paywall Triggers:**
- Creating a 3rd trip → Navigate to `Paywall`
- Creating feedback posts → Navigate to `Paywall`
- Creating gear reviews → Navigate to `Paywall`
- Uploading more than 1 photo per day → Show limit message
- Using advanced filters (future) → Navigate to `Paywall`
- Saving parks/favorites (future) → Navigate to `Paywall`
- Offline mode (future) → Navigate to `Paywall`

### Pro Users (Subscribed)
**What they can do:**
- ✅ **Everything** - Full, unlimited access to all features
- ✅ Unlimited trips
- ✅ Saved parks and favorites
- ✅ Create tips and ask questions
- ✅ Create feedback posts
- ✅ Create gear reviews
- ✅ Unlimited photo uploads
- ✅ Advanced filters
- ✅ Offline mode
- ✅ Priority support

## Implementation

### Auth Helper (`src/utils/authHelper.ts`)

The centralized authentication/authorization helper provides:

```typescript
// Hooks
useIsLoggedIn() → boolean
useIsPro() → boolean
useUserStatus() → { isLoggedIn, isPro, isFree, isGuest }

// Gate Functions
requireLogin(navigation, action?) → boolean
requirePro(navigation, feature?) → boolean

// Hook Versions
useRequireLogin() → { isLoggedIn, isGuest, checkLogin }
useRequirePro() → { isLoggedIn, isPro, isFree, isGuest, checkPro }
```

### Usage Example

```typescript
import { useUserStatus } from "../utils/authHelper";

export default function MyScreen() {
  const { isGuest, isPro } = useUserStatus();
  const navigation = useNavigation();

  const handleCreateTrip = () => {
    // Gate 1: Login required
    if (isGuest) {
      navigation.navigate("Auth");
      return;
    }

    // Gate 2: Pro check (if needed)
    if (!isPro && trips.length >= 2) {
      navigation.navigate("Paywall");
      return;
    }

    // Proceed with action
    createTrip();
  };
}
```

## Screens with Auth Gates

### ✅ My Trips Screen (`MyTripsScreen.tsx`)
- **Login Gate:** Create trip button
- **Pro Gate:** Trip creation limited to 2 for free users
- **Guest Empty State:** "Log in to start planning" message

### ✅ My Gear Closet (`MyGearClosetScreen.tsx`)
- **Login Gate:** Add gear button
- **Guest Empty State:** "Log in to manage your gear" with detailed message

### ✅ Park Detail Modal (`ParkDetailModal.tsx`)
- **Login Gate:** "Add to Trip" buttons (all variants)
- Closes modal and navigates to Auth when guest taps

### ✅ Trip Detail Screen (`TripDetailScreen.tsx`)
- **Login Gate:** Edit Trip button

### ✅ My Campsite / Profile (`MyCampsiteScreen.tsx`)
- **Login Gate:** Edit profile, upload photos
- Already redirects to Auth if no user in `useEffect`

### ✅ Packing List (`PackingListScreen.tsx`)
- **Login Gate:** Add packing items

### ✅ Community Screen (`CommunityScreen.tsx`)
- **Login Gate:** Submit tip/review (checks guest first)
- **Pro Gate:** Posting content (free users can browse only)

## Connect (Community) Permissions

### Overview
The Connect section uses a "Middle-Road" approach to user access, allowing Free users to contribute meaningfully while reserving advanced features for Pro subscribers.

### Permission Matrix

| Action | NO_ACCOUNT | FREE | PRO |
|--------|------------|------|-----|
| Browse all content | ✅ | ✅ | ✅ |
| Vote (upvote/downvote) | ❌ (prompt) | ✅ | ✅ |
| Profile (edit) | ❌ (redirect) | ✅ | ✅ |
| Questions (create) | ❌ (prompt) | ✅ | ✅ |
| Tips (create) | ❌ (prompt) | ✅ | ✅ |
| Photos (upload) | ❌ (prompt) | ✅ (1/day) | ✅ (unlimited) |
| Feedback (create) | ❌ (prompt) | ❌ (paywall) | ✅ |
| Gear Reviews (create) | ❌ (prompt) | ❌ (paywall) | ✅ |

### Photo Daily Limit
- **FREE users:** Limited to 1 photo upload per calendar day (based on America/Chicago timezone)
- **PRO users:** Unlimited photo uploads
- **Implementation:** `src/services/photoLimitService.ts`

### Auto-Hide Moderation
When community content receives **3 or more downvotes**, it is automatically:
1. Hidden from public feeds (`isHidden: true`)
2. Added to moderator review queue (`needsReview: true`, `reviewQueueStatus: "pending"`)
3. Marked with reason (`hiddenReason: "downvotes"`)

**Important:** Once hidden, content stays hidden until a moderator manually approves or rejects it. There is no automatic un-hiding.

### Implementation Files
- **Gating Hooks:** `src/hooks/useGating.ts`
- **Access Functions:** `src/utils/gating.ts`
- **Photo Limits:** `src/services/photoLimitService.ts`
- **Moderation:** `src/services/moderationService.ts`
- **Vote Services:** `src/services/firestore/*VotesService.ts`

### Connect Screens & Their Gating

| Screen | Create Gating | Vote Gating | Notes |
|--------|---------------|-------------|-------|
| TipsListScreen | requireAccount | requireAccount | FREE can create |
| QuestionsListScreen | requireAccount | requireAccount | FREE can create |
| PhotosListScreen | requireAccount + checkPhotoLimit | requireAccount | FREE limited to 1/day |
| FeedbackListScreen | requirePro | requireAccount | PRO only to create |
| GearReviewsListScreen | requirePro | requireAccount | PRO only to create |

## Navigation Routes

- **Login/Signup:** `navigation.navigate("Auth")`
- **Paywall:** `navigation.navigate("Paywall")`

## Empty States

Screens show contextual empty states for guests:

- **My Trips:** "Log in to start planning" with "Create an account to plan trips..." message
- **Gear Closet:** "Log in to manage your gear" with "Create an account to track your camping gear..." message
- **Packing Lists:** Shows placeholder (already tied to trips)

## Future Enhancements

Potential additional auth gates:
- [ ] Save parks to favorites → Login required
- [ ] Advanced park filters → Pro required
- [ ] Duplicate trip → Login required
- [ ] Export packing list → Pro required
- [ ] Offline mode → Pro required
- [x] Photo uploads to Community → Login required (implemented with 1/day limit for FREE)
- [x] Commenting on posts → Login required (implemented)
- [x] Voting on content → Login required (implemented)
- [x] Create Feedback → Pro required (implemented)
- [x] Create Gear Reviews → Pro required (implemented)

## Testing Checklist

### General Auth Gates
- [ ] Guest user cannot create trips (redirects to Auth)
- [ ] Guest user cannot add gear (redirects to Auth)
- [ ] Guest user cannot save parks (redirects to Auth)
- [ ] Free user can create 2 trips
- [ ] Free user's 3rd trip attempt shows Paywall
- [ ] Pro user has unlimited access
- [ ] Empty states display correct messaging for guests
- [ ] All navigation redirects work correctly

### Connect Access (Updated)
- [ ] NO_ACCOUNT user sees AccountRequiredModal when voting
- [ ] NO_ACCOUNT user sees AccountRequiredModal when creating tips
- [ ] NO_ACCOUNT user sees AccountRequiredModal when creating questions
- [ ] NO_ACCOUNT user sees AccountRequiredModal when uploading photos
- [ ] FREE user can create tips
- [ ] FREE user can create questions  
- [ ] FREE user can upload 1 photo per day
- [ ] FREE user sees limit message after first daily photo
- [ ] FREE user sees Paywall when trying to create feedback
- [ ] FREE user sees Paywall when trying to create gear review
- [ ] PRO user can upload unlimited photos
- [ ] PRO user can create feedback
- [ ] PRO user can create gear reviews
- [ ] Content with 3+ downvotes is auto-hidden from feeds
- [ ] Hidden content shows in moderator review queue

---

**Last Updated:** December 12, 2025  
**Version:** 1.1.2 (Middle-Road Connect Access)
