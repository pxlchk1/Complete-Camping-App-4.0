# Technical UX Foundation
## Learning Modules & Merit Badges

*Created: March 4, 2026*

---

## Current State Audit

### Badge Inventory
| Category | Count | Asset Folder |
|----------|-------|--------------|
| Camp Setup & Shelter | 10 | `camp_setup_and_shelter/` |
| Fire & Warmth | 9 | `fire_and_warmth/` |
| Cooking & Camp Kitchen | 9 | `cooking_and_camp_kitchen/` |
| Comfort & Sleep | 9 | `comfort_and_sleep/` |
| Navigation & Skills | 9 | `navigation_and_skills/` |
| Safety & Readiness | 9 | `safety_and_readiness/` |
| Nature Nerd | 9 | `nature_nerd/` |
| **Total Merit Badges** | **64** | |
| Learning Track Badges | 4 | `learning-track/` |
| **Grand Total Assets** | **68** | |

### Learning Track Badges (4)
| Badge ID | Name | Earned By |
|----------|------|-----------|
| `leave-no-trace` | Leave No Trace | Completing LNT track with 100% quiz |
| `weekend-camper` | Weekend Camper | Completing Novice track |
| `trail-leader` | Trail Leader | Completing Intermediate track |
| `backcountry-guide` | Backcountry Guide | Completing Master track |

---

## Information Architecture

```
Learn (Bottom Tab)
├── LearnTopTabsNavigator
│   ├── Tab: Learn (LearnScreen)
│   │   ├── Hero Header
│   │   ├── Track Selector (4 learning tracks)
│   │   ├── Module Cards (scrollable list)
│   │   └── Progress indicators
│   │
│   └── Tab: Merit Badges (MeritBadgesScreen)
│       ├── Progress Tally Card
│       ├── Witness Requests Banner (if pending)
│       └── Category Sections (7 categories)
│           └── Horizontal scroll badge rows
│
├── Stack Screens (modal presentation)
│   ├── ModuleDetail → Reading + Quiz
│   ├── BadgeDetail → Requirements + Photo Upload + CTA
│   ├── SelectWitness → Choose friend to verify
│   └── WitnessRequests → Approve/deny pending stamps
```

---

## Badge Earning Flow (All Badges)

```
┌─────────────────────────────────────────────────────────────────┐
│                    BADGE EARNING FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │ Browse  │───▶│ View Detail │───▶│ Add Photo   │             │
│  │ Badges  │    │ & Require-  │    │ (Required)  │             │
│  └─────────┘    │ ments       │    └──────┬──────┘             │
│                 └─────────────┘           │                     │
│                                           ▼                     │
│                         ┌─────────────────┴───────────────┐    │
│                         │                                 │    │
│                    Witness           No Witness           │    │
│                    Required          Required             │    │
│                         │                                 │    │
│                         ▼                                 ▼    │
│                 ┌───────────────┐              ┌──────────────┐│
│                 │ Select Witness│              │ Submit Proof ││
│                 └───────┬───────┘              └──────┬───────┘│
│                         │                             │        │
│                         ▼                             │        │
│                 ┌───────────────┐                     │        │
│                 │ Awaiting      │                     │        │
│                 │ Approval      │                     │        │
│                 └───────┬───────┘                     │        │
│                         │                             │        │
│                         ▼                             ▼        │
│                 ┌─────────────────────────────────────────┐   │
│                 │            BADGE EARNED                 │   │
│                 │   (Synced to Profile, Displayed in      │   │
│                 │    MyCampsite Badge Grid)               │   │
│                 └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Model Summary

### Firestore Collections
```
/badgeDefinitions/{badgeId}
  - id, name, categoryId, earnType, requirements[], imageKey
  - seasonWindow? (for seasonal/limited badges)

/users/{uid}/badges/{badgeId}
  - earnedAt, earnedVia, photoUrl, visibility
  
/users/{uid}/badgeClaims/{claimId}  
  - badgeId, status, witnessUserId, photoUrl, caption

/users/{uid}/profile
  - meritBadges[] (synced summary for display)

/learningTracks/{trackId}
  - title, moduleIds[], badgeId
  
/learningModules/{moduleId}
  - content, quiz[], trackId

/users/{uid}/learningProgress
  - moduleProgress{}, earnedBadges[]
```

---

## Display States

| State | Visual | CTA |
|-------|--------|-----|
| `not_started` | Grayscale badge | "Add Photo" |
| `in_progress` | Badge + local photo preview | "Submit Proof" or "Choose Witness" |
| `pending_stamp` | Badge + photo + spinner | "Awaiting Approval" (disabled) |
| `earned` | Full color badge + ✓ | "Completed MM.DD.YYYY" |
| `seasonal_locked` | Grayscale + lock icon | "Available in [Season]" |
| `seasonal_active` | Full color + timer | Normal flow |

---

## Screen Specifications

### MeritBadgesScreen
- **Progress Card**: X of 64 earned, percentage
- **Witness Banner**: "You have N stamp requests" (if any)
- **7 Category Sections**: Each with horizontal FlatList
- **Badge Tile**: 88px wide, 72px image, name below

### BadgeDetailScreen
- **Hero**: Large badge image (centered)
- **Title + Category chip**
- **Description**: 2-3 sentences
- **Requirements**: 3-6 bullet points
- **Photo Section**: Upload/preview area
- **CTA Button**: Context-aware (Add Photo → Submit → Choose Witness → Awaiting)

### LearnScreen
- **Track Selector**: Horizontal pills (4 tracks)
- **Module Cards**: Title, description, progress ring, lock state
- **Badge Preview**: Shows track badge at top

---

## Photo Upload Requirements

**EVERY badge requires a photo** documenting the effort. The photo:
1. Is uploaded to Firebase Storage (`badgePhotos/{userId}/{badgeId}/`)
2. Can be replaced before submission
3. Is stored with the earned badge record
4. Displays on the user's MyCampsite profile

### Witness Flow (for certain badges)
1. User uploads photo
2. User selects a witness (from campground contacts or search)
3. Witness receives notification
4. Witness approves/denies on WitnessRequestsScreen
5. On approval → badge awarded

---

## Key Files Reference

| Purpose | File |
|---------|------|
| Merit badge types | `src/types/badges.ts` |
| Learning types | `src/types/learning.ts` |
| Badge service | `src/services/meritBadgesService.ts` |
| Learning service | `src/services/learningService.ts` |
| Badge image map | `src/assets/images/merit_badges/badgeImageMap.ts` |
| Learning badge images | `src/assets/images/merit_badges/learningTrackBadgeImages.ts` |
| Badge detail screen | `src/screens/BadgeDetailScreen.tsx` |
| Merit badges list | `src/screens/MeritBadgesScreen.tsx` |
| Learn screen | `src/screens/LearnScreen.tsx` |
| Tab navigator | `src/navigation/LearnTopTabsNavigator.tsx` |
| Witness config | `src/config/badgeWitnessRequirements.ts` |

---

## Constraints & Requirements

| Requirement | Status |
|-------------|--------|
| Every badge requires uploaded photo | ✅ Implemented in BadgeDetailScreen |
| Merit Badges is a tab within Learn | ✅ LearnTopTabsNavigator |
| 63 Merit Badges | ✅ 64 defined (close match) |
| 4 Learning badges | ✅ Leave No Trace, Weekend Camper, Trail Leader, Backcountry Guide |
| Assets exist | ✅ 68 PNGs in merit_badges folder |

---

## Complete Function List

### API Services (src/api/)

| File | Functions |
|------|-----------|
| feedback-service.ts | `addFeedbackComment`, `createFeedbackPost`, `deleteFeedbackPost`, `getFeedbackComments`, `getFeedbackPostById`, `getFeedbackPosts` |
| gear-reviews-service.ts | `createGearReview`, `deleteGearReview`, `getGearReviewById`, `getGearReviews`, `getGearReviewsByCategory`, `getReviewsByUser` |
| image-generation.ts | `convertAspectRatioToSize`, `generateImage` |
| meals-service.ts | `addIngredientsToPackingList`, `addTripMeal`, `deleteTripMeal`, `getMealLibrary`, `getTripMeals`, `getUserMeals`, `saveUserMeal`, `updateTripMeal` |
| packing-service.ts | `addPackingItem`, `deleteAutoGeneratedItems`, `deletePackingItem`, `generatePackingListFromTemplate`, `getPackingList`, `togglePackingItem`, `updatePackingItem` |
| photo-service.ts | `deletePhoto`, `fetchPhotos`, `getUserPhotoVote`, `updatePhoto`, `uploadPhoto`, `votePhoto` |
| qa-service.ts | `addAnswer`, `createQuestion`, `deleteAnswer`, `deleteQuestion`, `getAnswers`, `getAnswersByUser`, `getQuestionById`, `getQuestions`, `getQuestionsByUser` |
| tips-service.ts | `addTipComment`, `createTip`, `deleteTip`, `getTipById`, `getTipComments`, `getTips`, `getTipsByUser`, `toggleTipLike` |
| trips-service.ts | `createTrip`, `deleteTrip`, `getTrip`, `getUserTrips`, `updateTrip` |
| weather-service.ts | `fetchWeather` |

### Services (src/services/)

| File | Functions |
|------|-----------|
| campgroundContactsService.ts | `createCampgroundContact`, `deleteCampgroundContact`, `getCampgroundContactById`, `getCampgroundContacts`, `updateCampgroundContact` |
| campgroundInviteService.ts | `checkPendingInvitesOnLogin`, `createCampgroundInvite`, `findPendingInviteByEmail`, `generateInviteMessage`, `getCampgroundInviteById`, `getInviteLink`, `getPendingInvitesByInviter`, `redeemCampgroundInvite`, `sendCampgroundInviteEmail` |
| meritBadgesService.ts | `approveBadgeClaim`, `createBadgeClaim`, `createUserBadge`, `declineBadgeClaim`, `deleteBadgePhoto`, `denyBadgeClaim`, `getAllBadgeDefinitions`, `getBadgeDefinition`, `getBadgeProgressStats`, `getBadgesByCategory`, `getBadgesWithProgress`, `getClaimForBadge`, `getCurrentSeasonEndDate`, `getMyPendingClaims`, `getPendingClaimsForWitness`, `getUserBadge`, `getUserBadges`, `getWitnessRequestCount`, `getWitnessRequests`, `getWitnessRequestsWithDetails`, `hasUserEarnedBadge`, `seedBadgeDefinitions`, `updateBadgeClaim`, `updateUserBadge`, `uploadBadgePhoto` |
| learningService.ts | `getAllBadges`, `getBadgeDetails`, `getEarnedBadges`, `getLearningTracks`, `getModuleById`, `getModuleProgress`, `getModulesByTrack`, `getModuleWithProgress`, `getTrackById`, `getTracksWithProgress`, `getUserLearningProgress`, `hasBadge`, `markModuleAsRead`, `submitQuizAnswers` |

### Screens (src/screens/)

| Screen | Main Export |
|--------|-------------|
| BadgeDetailScreen.tsx | `BadgeDetailScreen` |
| MeritBadgesScreen.tsx | `MeritBadgesScreen` |
| MeritBadgeAssetCheck.tsx | `MeritBadgeAssetCheck` |
| MyBadgesScreen.tsx | `MyBadgesScreen` |
| SelectWitnessScreen.tsx | `SelectWitnessScreen` |
| WitnessRequestsScreen.tsx | `WitnessRequestsScreen` |
| LearnScreen.tsx | `LearnScreen` |
| ModuleDetailScreen.tsx | `ModuleDetailScreen` |

### State/Stores (src/state/)

| File | Hooks & Functions |
|------|-------------------|
| learningStore.ts | `useLearningStore` |
| learnTabStore.ts | `useLearnTabStore` |

### Hooks (src/hooks/)

| File | Functions |
|------|-----------|
| useScreenOnboarding.ts | `useScreenOnboarding` |

### Utils (src/utils/)

| File | Functions |
|------|-----------|
| learningGating.ts | `canOpenLearningModule`, `getLearningModuleLockReason`, `getLockedModuleHelperText`, `getModuleAccessState`, `getModuleBadgeType`, `isFreeModule` |

---

## File Structure

```
src/
├── assets/images/merit_badges/
│   ├── badgeImageMap.ts
│   ├── index.ts
│   ├── learningTrackBadgeImages.ts
│   ├── resolveBadgeImage.ts
│   ├── camp_setup_and_shelter/ (10 PNGs)
│   ├── comfort_and_sleep/ (9 PNGs)
│   ├── cooking_and_camp_kitchen/ (9 PNGs)
│   ├── fire_and_warmth/ (9 PNGs)
│   ├── learning-track/ (4 PNGs)
│   ├── nature_nerd/ (9 PNGs)
│   ├── navigation_and_skills/ (9 PNGs)
│   └── safety_and_readiness/ (9 PNGs)
├── config/
│   └── badgeWitnessRequirements.ts
├── navigation/
│   └── LearnTopTabsNavigator.tsx
├── screens/
│   ├── BadgeDetailScreen.tsx
│   ├── LearnScreen.tsx
│   ├── MeritBadgeAssetCheck.tsx
│   ├── MeritBadgesScreen.tsx
│   ├── ModuleDetailScreen.tsx
│   ├── MyBadgesScreen.tsx
│   ├── SelectWitnessScreen.tsx
│   └── WitnessRequestsScreen.tsx
├── services/
│   ├── learningService.ts
│   └── meritBadgesService.ts
├── state/
│   ├── learningStore.ts
│   └── learnTabStore.ts
├── types/
│   ├── badges.ts
│   └── learning.ts
└── utils/
    └── learningGating.ts
```
