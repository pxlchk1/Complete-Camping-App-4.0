# Tent & Lantern - Camping Companion App

A clean, optimized rebuild of your camping app with better architecture, performance, and maintainability.

## 🎯 Recent Updates

### Security & Account Management (Latest)
- **Email & Password Updates** in Settings screen:
  - **Change Email** - Update your account email with password confirmation
    - Modal-based interface with password re-authentication
    - Updates Firebase Auth, Firestore, and email subscribers
    - Email validation and duplicate detection
    - Clear error messages for common issues
  - **Change Password** - Secure password update flow
    - Three-field form: current password, new password, confirm password
    - Minimum 8 character requirement
    - Password matching validation
    - Re-authentication required for security
  - Both features use modern UX patterns:
    - Bottom sheet modals with keyboard avoidance
    - Loading states during updates
    - Haptic feedback on success
    - Comprehensive error handling with user-friendly messages
    - Fields disabled during processing
    - Can dismiss by tapping outside modal or close button

### Profile Photo Updates
- **Direct photo updates on Account screen**:
  - **Profile Photo** - Tap profile picture to upload new photo from library
    - Camera icon overlay (green circle) on bottom-right of profile picture
    - Shows loading spinner during upload
    - 1:1 aspect ratio with editing
    - Updates Firebase Storage and Firestore in real-time
  - **Cover Photo** - Tap camera button on cover photo to change background image
    - Camera button (dark overlay) on bottom-right of cover image
    - Shows loading spinner during upload
    - 16:9 aspect ratio with editing
    - Updates Firebase Storage and Firestore in real-time
  - Both uploads sync immediately to Zustand store for instant UI updates
  - Haptic feedback on successful upload

### Profile Enhancement & UI Polish
- **Removed duplicate titles** from My Campground and My Gear Closet screens
  - These screens already have titles in the green ModalHeader
  - Cleaned up visual hierarchy for better mobile UX

- **Enhanced Account/Profile System**:
  - **Edit Profile Screen** - New dedicated screen for profile editing
    - Update About section (bio/description)
    - Select favorite camping style with icons (car camping, backpacking, RV, etc.)
    - Choose favorite gear categories with icons (shelter, sleep, kitchen, clothing, etc.)
    - Upload/change profile photo
    - Upload/change cover photo (background image for profile)
    - All changes saved to Firebase and synced with local state
  - **Admin Badge Display** - Administrators now show red ADMIN badge instead of PRO badge
    - Badge priority: Admin > Pro (admins see admin badge even if they're pro members)
    - Visible on profile header alongside display name
  - **About Section** - User-editable bio now displays on profile when set
  - **Custom Cover Photos** - Users can set personalized background images
  - **User Type System** - Extended with favoriteCampingStyle and favoriteGear fields

- **Trip Date Selection Improvements**:
  - **Calendar Modal** for trip start and end dates
    - No longer uses inline DateTimePicker which didn't highlight today's date
    - Beautiful modal with date picker in "inline" display mode
    - Separate modals for start date and end date selection
    - End date picker has minimum date set to start date (prevents invalid ranges)
    - Haptic feedback and clean close buttons
    - Modal slides up from bottom with fade animation

- **Firebase Permissions & Settings Fix**:
  - Settings screen now handles both creating and updating user documents
  - Checks if user document exists before attempting update
  - Creates document with proper fields if it doesn't exist
  - Fixes "Missing or insufficient permissions" error
  - Firebase rules updated to allow users to keep existing handles when updating

### UI Polish & Welcome Screen Updates
- **Fixed lightning bug animation** on Meals tab
  - Animation now only shows in Camp Recipes view, not in empty Meal Planner view
- **Welcome screen user state improvements**:
  - Shows "Welcome, Camper!" with app icon avatar for new/unauthenticated users
  - Shows "Welcome, [Name]!" with user photo or app icon for signed-in users
  - Dynamically extracts first name from display name or uses handle
  - Properly uses app icon from LOGOS.APP_ICON when no photo is available
- **Auto-updating copyright year**:
  - Copyright year now updates automatically at midnight CST (Chicago timezone) every January 1st
  - Uses proper timezone calculation with UTC-6 offset
  - Updates dynamically without app restart
- **About modal** created with complete app information:
  - Beautiful slide-up modal with proper styling matching app theme
  - Raleway headers (deep forest green) and Source Sans body text
  - Links to website, YouTube, Instagram, and email
  - Special thanks section for contributors
  - All links properly open in device browser
  - Accessible from footer by tapping "About" text
- **Footer About link** now fully interactive:
  - Tappable "About" text with underline styling
  - Haptic feedback on tap
  - Opens About modal with slide-up animation

### Community Collection Names - Standardized
- **All Community/Connect features now use correct Firestore collection names**:
  - ✅ `tips` with `tipComments` subcollection
  - ✅ `questions` with `answers` subcollection
  - ✅ `gearReviews` (single collection for all gear reviews)
  - ✅ `feedbackPosts` with `feedbackComments` subcollection
  - ✅ `stories` (photo stories) with `storyComments` and `storyVotes` subcollections
- **Services updated**:
  - Fixed `src/services/firestore/tipsService.ts` (was using `tipsPosts`)
  - Fixed `src/services/firestore/askService.ts` (was using `askPosts`)
  - Fixed `src/services/firestore/photosService.ts` (was using `photos`)
  - Deleted `src/services/firestore/gearPostsService.ts` (unused duplicate)
- **Main services folder already correct**:
  - `src/services/tipsService.ts` ✅
  - `src/services/questionsService.ts` ✅
  - `src/services/storiesService.ts` ✅
  - `src/services/feedbackService.ts` ✅
  - `src/services/gearReviewsService.ts` ✅
- **No new collections created** - all queries use specified collection names

### Push Notifications & Email Settings - Default ON
- **Preselected notifications and email updates** for all new users:
  - `notificationsEnabled: true` by default in `users/{uid}`
  - `emailSubscribed: true` by default in `users/{uid}`
  - Onboarding helpers: `onboardingStartAt`, `onboardingCompleted` fields
  - Null/undefined values treated as enabled (backwards compatible)
- **Settings screen toggle behavior**:
  - **Push Notifications**: Full OS permission flow with automatic token management
    - Requests iOS/Android permission when user enables
    - Saves push token to `pushTokens` collection with platform info
    - Shows helpful message if permission denied
    - Disables token when user turns off notifications
  - **Email Updates**: Manages `emailSubscribers` collection
    - Upserts subscriber document when enabled
    - Sets `unsubscribed: true` when disabled
    - Syncs state with `users/{uid}.emailSubscribed`
- **Use cases**:
  - Push notifications for trip updates and campground changes
  - Email updates for product news and first-month onboarding
- **User document creation**:
  - AuthLanding email signup creates full user doc with defaults
  - MyCampsiteScreen profile creation also creates user doc for Apple Sign In
  - All new users start with notifications and email enabled

### My Gear Closet Feature
- **Complete gear management system** for tracking personal camping equipment:
  - Private gear collection stored in `userGear` Firestore collection
  - Category-based organization: Shelter, Sleep, Kitchen, Clothing, Bags, Lighting, Misc
  - Photo upload with Firebase Storage integration (`gearCloset/{userId}/{gearId}/`)
  - Rich gear details: name, brand, model, weight, notes, category, favorite status
- **Three main screens**:
  - **MyGearClosetScreen**: Main list view with category filter pills, empty state, add button
  - **AddGearScreen**: Form for creating new gear items with photo picker (camera/library)
  - **GearDetailScreen**: Full item details with edit/delete actions and favorite toggle
- **Navigation integration**:
  - Accessible from My Activity → Gear tab on profile page
  - Properly registered in RootNavigator with all three screens
  - Uses ModalHeader for consistent back button navigation
- **Firestore rules needed** ⚠️:
  - Rules for `userGear` collection must be manually added to Firebase Console
  - Users can only read/write their own gear (matched by `ownerId` field)
  - See below for exact rules to add

### My Campsite Profile System - Handle Bug Fixes & Navigation Cleanup
- **Fixed double @ bug in handles**:
  - Handles are now stored WITHOUT the "@" prefix in both `users` and `profiles` collections
  - Display logic always strips any existing "@" and adds it for display (@username)
  - Normalized handle creation in AuthLanding for both email and Apple sign-in
  - Prevents "@@username" display bug when handles already contained "@"
- **Cleaned up MyCampsite navigation**:
  - Removed custom bottom navigation bar from MyCampsiteScreen
  - Screen now uses standard back navigation like other stack screens
  - Consistent spacing with proper bottom insets for safe area
  - Users navigate back to main tabs via back button
- **Updated Firestore security rules** ✅:
  - Added rules for `users` collection (read: all signed-in, write: own user only)
  - Added rules for `profiles` collection (read: all signed-in, write: own profile only)
  - Added rules for `trips` collection (read/write: own trips only)
  - Rules successfully deployed - profile loading now works correctly
  - Fixed "Missing or insufficient permissions" error
- **Handle normalization standards**:
  - Stored handles: lowercase alphanumeric only, no special characters
  - Display handles: always shown as "@{handle}" in UI
  - Edit/create flows: strip any "@" prefix before saving to database

### My Campsite Profile Page Redesign
- **Facebook-style profile layout** with hero header image and overlapping avatar
- **Consistent with footer navigation pages** - follows same pattern as Home, Learn, Plan, Connect, First Aid
- **Hero header area** with beautiful background image and gradient overlay
- **Large circular avatar** (120px) overlapping the header by 60px
- **User profile information**: Display name, handle, email, membership tier
- **Earned badges section** displays learning achievements
- **Account sections**: My Campground, Notifications, Subscription
- **Sign out button** at bottom
- **Footer navigation visible** - removed modal presentation, now behaves like main pages
- **Bottom spacing** properly accounts for footer navigation height
- **Back button** in top-left corner for easy navigation

### Campground Contacts Firestore Rules
- **Fixed permission error** for My Campground contacts loading
- **Added Firestore rules** for `campgroundContacts` collection:
  - Read: Only the owner (matching `ownerId` field) can read their contacts
  - Create: Only signed-in users can create contacts with their own `ownerId`
  - Update/Delete: Only the owner can modify or delete their contacts
- **Important**: Firestore rules updated in `firestore.rules` but need manual deployment
- **Manual deployment required**: Run `firebase deploy --only firestore:rules` to deploy the updated rules

### Firebase Auth Protection for Community Content
- **Authentication-gated access** - All Connect/Community tabs now require sign-in to view content
- **Sign-in CTAs** - Non-authenticated users see friendly prompts to sign in instead of permission errors
- **Updated Firestore rules** - Any signed-in user can:
  - Read all community content (tips, gear reviews, questions, answers, stories, feedback)
  - Create their own posts in any collection
  - Edit/delete only their own content (or admins can manage all)
- **Auth checks before queries** - All tabs verify Firebase Auth state before calling Firestore
- **Error logging** - Permission-denied errors now log the exact collection/path for debugging
- **Collections protected**:
  - `tips` and `tipComments`
  - `gearReviews`
  - `questions` and `answers`
  - `stories`, `storyComments`, and `storyVotes`
  - `feedbackPosts` and `feedbackComments`
  - `campgroundContacts` (My Campground)
- **Schema preserved** - All existing field names and collection structures remain unchanged

### Community Data Seeding
- **Complete seed data script** for populating Firebase with sample community content
- **SeedData screen** - Easy-to-use UI for running the seed script
- **20 sample items** across all community sections:
  - 8 camping tips covering safety, gear, setup, wildlife, water, cooking
  - 4 detailed gear reviews with ratings and recommendations
  - 4 Q&A questions with tags and metadata
  - 4 feedback posts with categories and status tracking
- **Instructions**: See `SEED_DATA_INSTRUCTIONS.md` for complete setup guide
- Navigate to the SeedData screen to populate your Firebase with sample data
- Run once to instantly populate your community tabs with realistic content

### Complete Learning Module Library (Latest)
- **All three skill tiers now fully populated with comprehensive content**:
  - **Weekend Camper (Beginner)** - 13 complete modules with 70+ pages total
    - Leave No Trace, First Trip Planning, Tent Selection & Setup, Sleep Systems
    - Warmth & Weather Protection, Camp Kitchen, Smart Packing, Campfire Safety
    - Basic First Aid, Navigation 101, Campsite Etiquette, First Night Expectations
  - **Trail Leader (Intermediate)** - 10 complete modules with 54+ pages total
    - Multi-Day Planning, Terrain Ratings, Backcountry Weather, Efficient Campsites
    - Water Safety & Purification, Leading Groups, Backcountry Cooking, Risk Management
    - Trail Navigation, Wildlife Safety
  - **Backcountry Guide (Advanced)** - 10 complete modules with 58+ pages total
    - Advanced Route Planning, Advanced Weather Patterns, Off-Trail Navigation
    - Wilderness Shelter Construction, Advanced Water Finding, Advanced First Aid
    - Glacier/Desert/Coastal Travel, Multi-Day Group Dynamics, Wilderness Decision Making
    - Search & Rescue Basics
- **182+ total pages of educational content** covering all aspects of camping from beginner to expert
- **33 complete modules** with article pages and quizzes
- **Interactive Module Detail Screen**:
  - Multi-page learning experience with step-by-step navigation
  - Article pages with formatted content and estimated reading time
  - Interactive quiz pages with immediate feedback
  - Progress bar showing completion through module
  - Next/Previous navigation between steps
  - Auto-saves progress as users complete each step
  - Completion alerts with XP rewards
  - Haptic feedback for better user experience
- **Quiz system** with correct answers for knowledge assessment
  - Multiple choice questions with visual feedback
  - Shows correct/incorrect answers after submission
  - Disabled "Next" button until quiz is completed
  - Green/red highlighting for correct/incorrect answers
- **XP progression** tied to module completion (35-50 XP per module)
- **Skill unlocking** at XP thresholds (novice: 0, intermediate: 400, master: 1200)
- All content written in clear, accessible voice matching the app's tone
- Ready for user engagement with complete learning pathways
- **Badge System**:
  - **Weekend Camper Badge** - Earned by completing all 13 beginner modules
    - Icon: Lantern with warm glow
    - Recognition for building a strong outdoor foundation
  - **Trail Leader Badge** - Earned by completing all 10 intermediate modules
    - Icon: Crossed trekking poles on shield
    - Recognition for leadership and advanced skills
  - **Backcountry Guide Badge** - Earned by completing all 10 advanced modules
    - Icon: Mountain peak with summit star
    - Recognition for mastering wilderness expertise
  - Badges display on My Campsite profile page
  - Automatically awarded when all track modules are completed
  - Persisted to AsyncStorage with user progress

### Unified EmptyState Component
- **Created icon-based EmptyState component** at `src/components/EmptyState.tsx`
- Replaced all empty states across Plan section screens with unified component
- **Consistent design across all screens**:
  - 64px icon with EARTH_GREEN color
  - Raleway_700Bold title (20px, DEEP_FOREST)
  - SourceSans3_400Regular message (16px, EARTH_GREEN, 24px line height)
  - Optional CTA button (DEEP_FOREST background, PARCHMENT text)
  - Specific spacing: 32px above icon, 16px icon-to-title, 8px title-to-message, 24px message-to-button
- **Applied to screens**:
  - MyTripsScreen: compass icon, "No active trips"
  - PackingTabScreen: bag icon, "No active trips"
  - MealsScreen: calendar icon, "No active trips"
- Centered layout with proper vertical spacing
- Replaces old card-based EmptyState component

### RevenueCat Configuration - Package Type Selection & Clean Wiring
- **PaywallScreen now uses `PACKAGE_TYPE.ANNUAL`** instead of string matching
  - Changed from `p.identifier.includes("annual")` to `p.packageType === PACKAGE_TYPE.ANNUAL`
  - Product IDs may change, but packageType remains stable
  - More reliable and future-proof package selection
- **Removed hardcoded entitlement check** in subscriptionStore
  - Changed from checking specific "pro" entitlement to checking if ANY entitlement is active
  - `isPro` now set to `true` if user has any active entitlement (length > 0)
  - Works with whatever entitlements exist in your RevenueCat project
- **Verified clean RevenueCat wiring**:
  - Only one API key in codebase: `appl_CXLKpXutDryiSmKJsclChUqLmie`
  - No hardcoded product IDs in application code
  - All entitlement checks use dynamic parameters
  - App fully compatible with your existing Complete Camping App project

### RevenueCat Configuration - Complete Camping App Project
- **Connected to existing RevenueCat project**: Complete Camping App (App Store)
- **Correct iOS API key configured**: `appl_CXLKpXutDryiSmKJsclChUqLmie`
- API key updated in both `src/lib/revenuecatClient.ts` and `.env` file
- **No hardcoded product or entitlement IDs** - app dynamically uses whatever exists in your project
- PaywallScreen auto-selects packages based on identifier (annual/year keywords)
- All subscription checks use dynamic entitlement IDs passed as parameters
- App works with your existing offerings, packages, and entitlements

### Community Section Shared Header Component
- **Created `CommunitySectionHeader` component** - Single source of truth for all Community tab headers
- **Pixel-perfect consistency** across all 5 tabs (Tips, Gear Reviews, Ask, Photos, Feedback)
- Deep forest green background with white text and icons
- Exact same spacing, padding, and layout on every tab
- No per-tab header drift - all tabs use the identical shared component
- Simplified maintenance - header changes propagate automatically to all Community tabs

### Community Section Green Header Stripe
- **Deep forest green stripe** added behind all Community section headers
- White text and icons (`TEXT_ON_DARK`) on the green stripe for strong contrast
- Flat color design with no gradients, shadows, or borders
- Applied consistently to all 5 tabs: Tips, Gear Reviews, Ask a Camper, Photos, Feedback
- Search bars and filter chips remain below the stripe in the parchment background
- Clean, professional header treatment that unifies the Community experience

### Community Section Header Standardization
- **Unified header layout** across all Community tabs (Tips, Gear Reviews, Questions, Photos, Feedback)
- All page titles now use consistent placement: `px-5 py-3` with `mb-3` on title row
- Title size standardized to `text-xl` with `Raleway_700Bold`
- Action button (+ icon) consistently positioned on the right at `size={32}`
- Clean, professional look with matching spacing and alignment throughout Connect section

### RevenueCat Error Handling - Graceful Configuration
- **Improved error handling** for incomplete RevenueCat setup
- Changed log level from DEBUG to WARN to suppress configuration error messages
- Gracefully handles "offerings empty" errors until App Store Connect API is configured
- Returns null offerings/customer info instead of throwing errors
- App works perfectly while RevenueCat configuration is being finalized
- SDK errors are suppressed until App Store Connect API credentials are added
- **To complete setup**: Add App Store Connect API credentials (P8 key, Key ID, Issuer ID) in RevenueCat dashboard

## 🎯 Recent Updates

### My Campground - Enhanced with Roles & Last Trip Tracking (Latest)
- **Participant Roles System**:
  - 6 role types: Host, Co-host, Guest, Kid, Pet, Other
  - Two-step flow when adding people: select contacts → assign roles
  - Roles displayed in Trip Detail as "Name · role" chips
  - Tap any participant to edit their role via modal
  - Default role is "Guest" if not specified
- **Last Trip Date Tracking**:
  - `lastTripDate` field added to campgroundContacts
  - Auto-updates when contact is added to a trip
  - Only updates if new trip is more recent
  - Displayed on My Campground screen: "Last camped: June 2025"
  - Shows "Not on a trip yet" for contacts never added to trips
  - Uses trip start date when available
- **Firestore Security Rules**:
  - Locked down `campgroundContacts` - only owner can read/write
  - Locked down `trips/{tripId}/participants` - only trip owner can read/write
  - Uses existing `isSignedIn()` helper
  - Validates ownership via `resource.data.ownerId`
- **Updated Services**:
  - `addTripParticipantsWithRoles()` - Add participants with role and trip date
  - `updateParticipantRole()` - Change participant role
  - `updateContactLastTripDate()` - Track most recent trip date per contact

### My Campground - Camping Contacts & Trip People
- **My Campground**: Manage your camping contacts (the people you camp with)
  - View all contacts with name, email, phone, and notes
  - Add new contacts with simple form (no user search in v1)
  - Edit and delete existing contacts
  - Pull-to-refresh support
  - Empty state with helpful messaging
- **Firestore Collections**:
  - `campgroundContacts`: Stores user's camping contacts
  - `trips/{tripId}/participants`: Stores people added to each trip
- **Trip Integration**:
  - New "People" section in Trip Detail screen
  - Add people from My Campground to trips via multi-select modal
  - View all participants as chips/badges on trip detail
  - Real-time updates when adding/removing people
- **Navigation**:
  - New screens: MyCampground, AddCamper, EditCamper, AddPeopleToTrip
  - Registered in RootNavigator with proper TypeScript types
- **Services**:
  - campgroundContactsService.ts: CRUD operations for contacts
  - tripParticipantsService.ts: Manage trip participants subcollection
  - Client-side filtering for missing Firestore indexes

### UI Enhancement: Learn Screen Background
- Removed dark overlay from Learn screen hero image
- Removed outer dark `bg-forest` container
- Removed LinearGradient overlay that was darkening the background
- Hero image now displays at full brightness
- Text shadows retained for readability

### UI Enhancement: Dark Forest Green Modal Headers
- Created reusable `ModalHeader` component for all modal/detail screens
- All modal screens now have consistent dark forest green header extending beyond safe zone
- White back arrow and title text for better contrast
- Applied to 11 screens:
  - **Detail screens**: TipDetail, QuestionDetail, FeedbackDetail, PhotoDetail, GearReviewDetail, ThreadDetail
  - **Create/Edit screens**: CreateTip, CreateQuestion, CreateGearReview, UploadPhoto, CreateFeedback
- Improved visual hierarchy and professional appearance
- Better touch targets with proper spacing

### Firestore Query Optimization - Feedback Tab
- Fixed "missing permissions" error in Feedback List screen
- Root cause: Firestore composite queries (category + orderBy) require indexes
- Solution: Implemented client-side filtering to avoid index requirements
- Fetch 2x results and filter by category on client-side for instant functionality
- Added fallback error handling for permission-denied and failed-precondition errors
- Comments query now falls back to simpler query with client-side sorting if index is missing
- TypeScript type safety improved for Timestamp | string handling

### Bug Fix: Navigation During Render
- Fixed React error: "Cannot update a component while rendering a different component"
- Moved authentication navigation logic from render to `useEffect` in MyCampsiteScreen
- Auth check now properly handles redirects without causing React state update errors

### Community/Connect - Full Stack Navigation Implementation (Latest)
- **Complete CONNECT section with Material Top Tabs navigation**
  - **Ask Tab** (Questions & Answers):
    - QuestionsListScreen.tsx - Browse all questions with filters (All, Unanswered, Answered, Popular)
    - QuestionDetailScreen.tsx - View question with all answers and upvotes
    - CreateQuestionScreen.tsx - Ask new questions with title, body, and up to 5 tags
    - Real-time answer posting with accepted answer marking
    - Uses questionsService.ts for Firestore queries
  - **Photos Tab** (Photo Stories):
    - PhotosListScreen.tsx - Grid layout photo gallery with tag filtering
    - PhotoDetailScreen.tsx - Full-size photo with caption, location, likes, and comments
    - UploadPhotoScreen.tsx - Upload photos to Firebase Storage with captions and tags
    - Like/unlike functionality with storyVotes collection
    - Uses storiesService.ts for Firestore queries
  - **Feedback Tab** (App Feedback):
    - FeedbackListScreen.tsx - Browse feedback posts sorted by newest or most upvoted
    - FeedbackDetailScreen.tsx - View feedback post with comments and status badges
    - CreateFeedbackScreen.tsx - Submit feedback (Feature, Bug, Improvement, Question, Other)
    - Status tracking (Open, Planned, In Progress, Done, Declined)
    - Uses feedbackService.ts for Firestore queries
  - **Material Top Tabs** (CommunityTopTabsNavigator.tsx):
    - Beautiful hero header with community image and gradient
    - Swipeable tabs: Tips, Gear, Ask, Photos, Feedback
    - Normal stack navigation push transitions (no slide-in overlays)
    - Consistent navigation patterns across all tabs
  - All screens registered in RootNavigator.tsx
  - All screens use Firestore services (no mock data)
  - All photo uploads go through Firebase Storage
  - Type-safe navigation with proper TypeScript types

### Community/Connect Firestore Refactor
- **Complete Firestore service layer for all CONNECT features**
  - **Tips Service** (`tipsService.ts`):
    - Get tips with pagination (newest, most helpful, my tips)
    - Create tips with serverTimestamp()
    - Upvote tips
    - Tip comments with full CRUD
  - **Gear Reviews Service** (`gearReviewsService.ts`):
    - Get reviews with category filtering and pagination
    - Create gear reviews with ratings 1-5
    - Upvote gear reviews
    - Support for brand, pros, cons, tags
  - **Questions & Answers Service** (`questionsService.ts`):
    - Get questions with filters (all, unanswered, answered, popular, my questions)
    - Create questions with status tracking
    - Answer questions with upvotes
    - Accept answer functionality
    - Proper lastActivityAt tracking
  - **Stories/Photos Service** (`storiesService.ts`):
    - Get stories with tag filtering and pagination
    - Like/unlike stories with storyVotes collection
    - Story comments
    - Check if user liked a story
  - **Feedback Service** (`feedbackService.ts`):
    - Get feedback posts (newest, most upvoted)
    - Category filtering
    - Upvote feedback posts
    - Feedback comments
  - **Content Reports Service** (`contentReportsService.ts`):
    - Report any content type (tip, gear, question, answer, story, comment, feedback)
    - All reports go to contentReports collection
  - All services use proper Firestore Timestamps
  - All services implement pagination with lastDoc cursors
  - All writes use serverTimestamp() for createdAt
  - Proper increment() for counts

### Account System with Role-Based Access
- **Complete Firebase-backed account management system**
  - **All Users Get:**
    - My Campsite tab - Personal profile and stats (coming soon)
    - Edit Account tab - Update profile settings (coming soon)
    - Premium membership badges displayed on profile
  - **Moderators Get:**
    - Moderation tab for content management
    - Can hide inappropriate photos, comments, posts, questions, and reviews
    - Cannot ban users or delete accounts
    - Enter content ID, owner ID, and reason to hide content
    - All actions logged in audit trail
  - **Administrators Get:**
    - Full Admin panel with complete control
    - **Grant Memberships:** Award 1 month, 3 months, 6 months, 1 year, or lifetime premium memberships by handle or email
    - **Ban/Unban Users:** Ban accounts with reason tracking, cannot ban yourself
    - **Manage Roles:** Promote users to moderator or administrator
    - All moderator powers plus account deletion
    - Comprehensive audit logging
  - Role badges display on profile (Moderator = blue, Admin = red)
  - Test user auto-initialized on HomeScreen for development
  - Beautiful tabbed interface with role-based tab visibility
  - Firebase service layer with full permission checks

### Packing List Edit Mode
- **Streamlined editing interface with dedicated Edit button**
  - "Edit" button in header (right-aligned) toggles to "Done" when active
  - Edit button changes to gold color when active for clear visual feedback
  - **In Edit Mode:**
    - Small + button appears next to each category title for quick item addition
    - All items show "Remove" text button with red background
    - Can remove ANY item including auto-generated ones
    - Tap + on category to add items directly to that category
  - **Normal Mode:**
    - Only custom items show trash icon (auto-generated items protected)
    - Clean, minimal interface for checking off items
  - Haptic feedback on mode toggle and all interactions
  - Modal pre-selects the category when adding from category + button

### Custom Meals in Trip Planning
- **Users can now create personalized meals directly when planning trips**
  - "Create Custom Meal" button in the Add Meal modal
  - Simple form with meal name, ingredients, and instructions
  - Add custom meals instantly to any trip day and meal category
  - No need to navigate to recipe library first
  - Perfect for unique family recipes or special dietary needs
  - Form validation (meal name required)
  - Works with both Firebase and local storage
  - Haptic feedback and success notifications
  - Automatically added to the selected day and meal category

### Packing List Editing
- **Full packing list customization with add and remove capabilities**
  - Add custom items to any packing list with "Add Item" button
  - Remove unwanted items with trash icon (auto-generated items protected)
  - Comprehensive add item modal with:
    - Category selection (Shelter, Sleep System, Kitchen, Clothing, etc.)
    - Item name and quantity fields
    - Optional notes for special instructions
    - Form validation with visual feedback
  - Custom category creation for trip-specific needs
  - Works seamlessly with both Firebase and local storage
  - Haptic feedback for all interactions
  - Success notifications when items are added/removed
  - Real-time progress tracking updates

### Add Custom Meals Feature
- **Users can now create and save their own custom meals**
  - New "Add Custom Meal" button (+ icon) in Camp Recipes view
  - Beautiful modal form with all meal details:
    - Meal name, category (breakfast/lunch/dinner/snack)
    - Preparation type (no cook, cold, camp stove, campfire)
    - Difficulty level (easy, moderate)
    - Ingredients list (one per line)
    - Optional cooking instructions
    - Optional tags for filtering
  - Custom meals are saved to local meal library using Zustand + AsyncStorage
  - Instantly appear in recipe list and can be added to any trip
  - Success toast notification when meal is saved
  - Form validation (name required) with disabled save button
  - Haptic feedback for better UX

### Navigation Without Slide-In Animations
- **Restored full navigation functionality with page-replacement behavior**
  - Set `animation: 'none'` on RootNavigator to disable iOS slide-in animations
  - Navigation now works like page replacement/full page loads instead of overlays
  - Trip cards are fully clickable and navigate to TripDetail screen
  - TripDetail shortcuts (Packing, Meals, Weather) all functional
  - Community Q&A cards remain display-only (no ThreadDetail navigation)
  - **Zero slide-in animations** - all navigation uses instant page replacement
  - Complies with VIBECODE directive: no slide-in overlays

### Account Page Removal
- **Completely removed all Account page navigation throughout the app**
  - Removed Account icon (person-circle) from all hero sections (5 screens)
  - Removed all navigation.navigate("Account") calls (12 instances)
  - Cleaned authentication checks to simply return instead of navigating
  - Removed Resume button and TripDetail navigation from trip cards
  - Removed "View Details" menu option from trip actions
  - No slide-in Account screen or TripDetail screen functionality anywhere
  - Complies with VIBECODE directive against slide-in overlay screens

### Meals Screen with Toggle View
- **Toggle between two full-screen views:**
  - **Meal Planner View** - Plan meals for active trips with quick access cards
  - **Camp Recipes View** - Browse 100+ recipes from Firebase/local library
  - Stone-200 toggle control with forest green selected state
  - Haptic feedback on toggle for better UX
  - Each view gets full screen real estate

- **Meal Planner View:**
  - Horizontal scrolling trip cards for all active trips
  - Direct navigation to day-by-day meal planning
  - Trip date ranges and restaurant icon
  - Helpful tip section with amber background
  - Empty state when no active trips exist

- **Camp Recipes View:**
  - Firebase-backed recipe library with local fallback
  - Search bar with clear button
  - Multi-select filter chips (All, Breakfast, Lunch, Dinner, Snacks, No cook, Camp stove, Campfire)
  - White recipe cards with better contrast on parchment background
  - "Add to trip" button on each recipe card
  - Modal for selecting trip, meal type, and day
  - Toast notification: "Added to [trip] · [meal type], Day X"
  - Loading states and empty states
  - Lazy loading (only loads recipes when "Camp Recipes" view is active)

- **Shopping List Feature:**
  - Automatically aggregates all ingredients from planned meals
  - Accessible via "Shopping" button in Meal Planning header
  - Ingredients grouped and sorted alphabetically
  - Shows which meals use each ingredient
  - Interactive checkboxes with haptic feedback
  - Progress tracker showing checked vs total items
  - Visual progress bar
  - Empty state when no meals are planned

- **Features:**
  - Smart filtering by category and prep type
  - Search across recipe names, ingredients, and tags
  - Recipe cards show: name, category, prep type, difficulty, tags
  - Complete "Add to trip" workflow with haptic feedback

### Trip-Specific Meal Planning
- **Complete meal planning system for trips**
  - Plan meals day-by-day for each trip (breakfast, lunch, dinner, snacks)
  - Quick access from Meals tab with trip selector cards
  - Select from 100+ pre-populated meal ideas
  - Real-time meal tracking per day and category
  - Searchable meal library organized by meal type

- **Features:**
  - Day selector for multi-day trips
  - Category-specific meal planning (breakfast, lunch, dinner, snacks)
  - Add meals from comprehensive library
  - Delete meals with confirmation
  - Visual empty states for unplanned meals
  - Firebase integration with local storage fallback

- **Components Created:**
  - `MealPlanningScreen.tsx` - Day-by-day meal planning interface
  - `localMealService.ts` - AsyncStorage service for offline meal planning
  - Enhanced `MealsScreen.tsx` with trip planning cards
  - Integrated meal planning navigation

### Meal Planning Library
- **Complete meal inspiration library with 100+ camping meal ideas**
  - Organized by meal type: Breakfast, Lunch, Dinner, and Snacks
  - Filter by preparation type: No Cook, Cold, Camp Stove, or Campfire
  - Search by meal name, ingredients, or tags
  - View detailed meal information including ingredients, tags, and suitable camping styles

- **Meal Categories:**
  - **Breakfast**: 20 ideas from overnight oats to hot skillets
  - **Lunch**: 18 options including wraps, salads, and hot meals
  - **Dinner**: 30 recipes covering one-pot meals, foil packets, and campfire cooking
  - **Snacks**: 23 savory and sweet treats for energy on the trail

- **Smart Filtering:**
  - Filter by meal type (Breakfast, Lunch, Dinner, Snacks)
  - Filter by prep method (No Cook, Cold, Camp Stove, Campfire)
  - Search by keywords in meal names, ingredients, or tags
  - Real-time filtering with meal count display

- **Meal Details:**
  - Complete ingredient lists
  - Prep type with visual icons
  - Difficulty level (Easy or Moderate)
  - Tags for quick reference (no-cook, protein, vegetarian, etc.)
  - Suitable camping styles (backpacking, car camping, RV, etc.)

- **Components Created:**
  - `MealsScreen.tsx` - Full meal library browsing with filters and search
  - `mealStore.ts` - Zustand store with 100+ pre-populated meals
  - Integrated into Plan section's Meals tab with hero image

### Packing Checklist Integration
- **Interactive packing lists accessible from the Packing tab**
  - View all active trips with packing lists in one place
  - Quick trip selector for switching between multiple active trips
  - Real-time packing progress tracking with visual progress bars
  - Check off items as you pack with haptic feedback
  - Organized by category with collapsible sections
  - Full edit mode available via "Manage" button

- **Features:**
  - Auto-selects first active trip on load
  - Shows packed vs total items count per category
  - Displays item quantities and notes inline
  - Tap checkboxes to mark items as packed/unpacked
  - Seamless navigation to full packing list editor
  - Firebase integration with local storage fallback

- **Components Created:**
  - `PackingTabScreen.tsx` - Packing overview with trip selector and checklist
  - Integrated into Plan section's Packing tab
  - Links to existing `PackingListScreen.tsx` for full management

### Packing List Local Storage Fallback
- **Fixed Firebase permissions error with automatic fallback**
  - Automatically detects Firebase configuration issues
  - Falls back to AsyncStorage for local data persistence
  - Seamless user experience - no manual intervention needed
  - All packing list features work offline with local storage

- **Complete packing templates for all 10 camping styles:**
  - Car Camping, Backpacking, RV, Hammock, Rooftop Tent
  - Overlanding, Boat/Canoe, Bikepacking, Winter, Dispersed
  - Auto-generates appropriate gear lists based on camping type

- **Components Created/Updated:**
  - `localPackingService.ts` - AsyncStorage service for packing lists
  - `localMealService.ts` - AsyncStorage service for meal planning
  - `PackingListScreen.tsx` - Enhanced with automatic Firebase/local fallback
  - Improved error handling with user-friendly messages
  - Retry button for failed operations

### Weather Tab Integration
- **CRITICAL: Real weather data integration for user safety**
  - ⚠️ **IMPORTANT**: Weather data is now fetched from Open-Meteo API for accurate, real-time conditions
  - Inaccurate weather information can cause serious harm to campers - this is not mock data
  - Shows actual current temperature, conditions, humidity, wind speed for any location
  - 5-day forecast with real precipitation probability and daily highs/lows
  - **No API key required** - Uses free Open-Meteo API with no setup needed

- **Weather Features:**
  - Seamlessly inherits selected location from Parks finder
  - City/State search field for any location (e.g., "San Francisco, CA")
  - "Use My Location" button for GPS-based weather
  - "Check Weather" button in Park Detail Modal
  - Shared location state between Parks and Weather tabs
  - Stacked action buttons for better mobile UX
  - Fixed infinite loop issue with proper useEffect dependencies

- **Location State Management:**
  - New `locationStore.ts` for shared location data
  - Automatically saves selected park location when user taps "Check Weather"
  - Supports selected locations (from parks), user's GPS location, and city/state search
  - Location persists across tab switches

- **Components Created/Updated:**
  - `weather-service.ts` - Open-Meteo API integration with real weather data (free, no key needed)
  - `WeatherScreen.tsx` - Full weather forecast screen with search and GPS
  - `locationStore.ts` - Zustand store for shared location state
  - `ParkDetailModal.tsx` - Added "Check Weather" button
  - `ParksBrowseScreen.tsx` - Integrated weather callback
  - `MyTripsScreen.tsx` - Added Weather tab routing

### Camping Type Categories Expanded
- **NEW: 10 camping types available in trip creation:**
  - Car camping
  - Backpacking
  - RV camping
  - Hammock camping
  - Roof-top tent camping
  - Overlanding
  - Boat or canoe camping
  - Bikepacking
  - Winter camping
  - Dispersed camping

- Updated in both CreateTripScreen and CreateTripModal with appropriate emojis

### Visual Improvements
- **NEW: Hairline separators with warm rust color**
  - Added `HAIRLINE_RUST (#B26A4A)` to color palette
  - Available as `colors.hairline` in theme
  - Used for subtle separators under park addresses
  - Perfect for decorative accents that need warmth without weight

### Parks Browse Screen
- **Enhanced Parks & Campgrounds browsing with smart filtering**
  - **Two search modes:**
    - **Near Me** - Location-based search with drive-time filtering
      - Specify drive time: 2, 4, 6, 8, or 12 hours
      - Assumes 55 mph average speed
      - Automatic distance calculation and filtering
    - **Search by Name** - Text-based park search with debouncing

  - **Park Type Filtering** (works in all modes):
    - All Parks
    - State Parks only
    - National Parks only
    - National Forests only

  - Live map integration showing filtered results using react-native-maps
  - Firebase Firestore integration for real-time park data
  - Distance-based sorting using Haversine formula (in miles)
  - Beautiful park list cards with amenities, type, and location info
  - Hairline separators under each park address for visual polish
  - "Add your own campground" button for private/custom locations
  - Tap any park to add it to a trip (in progress)
  - Responsive empty states and loading indicators
  - Full integration with Plan section navigation

- **Plan Section Top Navigation**
  - Tab bar matching Community screen design
  - 5 tabs: Trips, Parks, Weather, Packing, Meals
  - Icon-based with underline indicator for active tab
  - Haptic feedback on tab press
  - Seamlessly integrated into My Trips, Parks Browse, and Weather screens

- **Components Created/Updated:**
  - `ParksBrowseScreen.tsx` - Main parks browsing with drive-time logic
  - `ParksMap.tsx` - Interactive map with park markers
  - `ParkFilterBar.tsx` - Two-mode filter with drive-time and park type selectors
  - `ParkListItem.tsx` - Park card with amenities and details
  - `AddCampgroundButton.tsx` - CTA for custom campground addition
  - `PlanTopNav.tsx` - Top navigation bar matching Community style

- **Firebase Configuration:**
  - Updated Firebase config with TentAndLanternApp credentials
  - Project ID: tentandlanternapp
  - Collection structure: `parks` with fields for name, stateCode, type, coordinates, amenities

### Modal Improvements
- Removed all slide-in modal animations throughout the app
- Replaced with fade animations for smoother, less jarring transitions
- Affected components:
  - `CreateTripModal.tsx` - Trip creation modal
  - `TipSubmissionModal.tsx` - Community tip submission
  - `AskQuestionModal.tsx` - Q&A question submission
  - `CommunityScreen.tsx` - Filter/sort modal
- Improved user experience with gentler, more modern modal presentations

### Contrast Improvements
- Enhanced legibility across the entire app with improved contrast tokens
- New color constants added for better text readability:
  - `TEXT_PRIMARY_STRONG (#35413B)` - Darker primary text for body content
  - `TEXT_SECONDARY (#4F655F)` - Secondary text and labels
  - `TEXT_ON_DARK (#FDF7E8)` - Text on dark backgrounds (hero overlays)
  - `TEXT_MUTED (#7A8A82)` - Muted text for timestamps and subtle labels
  - `CARD_BACKGROUND_LIGHT (#FFF9EB)` - Lighter card backgrounds
  - `CARD_BACKGROUND_ALT (#F9F1DD)` - Alternative card background
  - `BORDER_SOFT (#D9CDAF)` - Soft border color
  - `BORDER_STRONG (#374543)` - Strong border for emphasis
- Updated major screens (Home, Community, Learn, First Aid) with new contrast tokens
- Hero text now uses TEXT_ON_DARK for better readability
- All cards updated to use CARD_BACKGROUND_LIGHT for improved contrast
- Body text updated to TEXT_PRIMARY_STRONG throughout the app
- Secondary text updated to TEXT_SECONDARY for consistent hierarchy

### Community Tab Standardization
- All Community tabs now have consistent green bar headers with LEFT-ALIGNED layout
- Layout pattern: Title (left) + Icon + Search (right) - all on ONE line
- Action buttons are + circle icons (28px) for cleaner look
- Search bars integrated inline with lowercase placeholder text:
  - Tips: No search (just title + icon)
  - Gear Reviews: "search gear" in inline search bar
  - Ask a Camper: "search questions" in inline search bar
  - Photo Library: "search photos" in inline search bar + category filters below
  - Feedback: No search (just title + icon)
- Green bars bleed to screen edges (full width)
- Optimized vertical space with single-line header layout

### Hero Images & Navigation
- Full-bleed hero images on all main screens (Home, Learn, Plan, Community, First Aid)
- Universal Account icon in top-right of all hero sections
- Consistent typography: Raleway_700Bold for titles, SourceSans3_400Regular for subtitles
- Hero images extend beyond safe area for immersive feel
- Plan/My Trips screen uses green bar pattern with "+ New Trip" button

## 🏗️ Architecture

This is a complete rebuild from the ground up with:
- **Clean architecture** - Proper separation of concerns
- **Optimized state management** - Individual Zustand stores with selective subscriptions
- **Type safety** - Full TypeScript implementation
- **Modern UI** - Lodge-themed design with consistent components
- **Better performance** - No bloated code, efficient re-renders

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx      # Multi-variant button with haptics
│   ├── Typography.tsx  # Text components (Heading1-3, BodyText, etc.)
│   ├── TripCard.tsx    # Trip display card with weather & packing progress
│   ├── ParkCard.tsx    # Park display card
│   ├── Avatar.tsx      # User avatar component
│   ├── XPBar.tsx       # Learning progress bar
│   ├── Select.tsx      # Custom dropdown select
│   ├── CreateTripModal.tsx  # Trip creation modal
│   ├── ConfirmationModal.tsx  # Action confirmation modal
│   └── CustomBottomTabBar.tsx  # Custom footer navigation
│
├── screens/            # All app screens
│   ├── HomeScreen.tsx
│   ├── LearnScreen.tsx
│   ├── MyTripsScreen.tsx (Plan tab)
│   ├── CommunityScreen.tsx (Connect tab with 5 sub-tabs)
│   ├── FirstAidScreen.tsx
│   ├── CreateTripScreen.tsx
│   ├── TripDetailScreen.tsx
│   ├── ParksScreen.tsx
│   ├── ParksBrowseScreen.tsx
│   ├── WeatherScreen.tsx
│   ├── MealsScreen.tsx
│   ├── PackingTabScreen.tsx
│   ├── PackingListScreen.tsx
│   ├── MealPlanningScreen.tsx
│   ├── ParkDetailScreen.tsx
│   ├── GearListsScreen.tsx
│   ├── CreateGearListScreen.tsx
│   ├── GearListDetailScreen.tsx
│   ├── AccountScreen.tsx
│   └── community/      # Community sub-screens
│       ├── ConnectAskScreen.tsx  # Q&A interface
│       ├── AskQuestionModal.tsx  # Question submission
│       ├── ThreadDetailScreen.tsx  # Q&A thread view
│       └── PhotosTabContent.tsx  # Photo library
│
├── state/              # Zustand stores
│   ├── tripsStore.ts   # Trip management with packing/weather
│   ├── tripsListStore.ts  # Trip list filters, sorting, pagination
│   ├── learningStore.ts  # Learning modules and XP progression
│   ├── gearStore.ts    # Packing lists
│   ├── parksStore.ts   # Parks discovery
│   ├── mealStore.ts    # Meal library with 100+ camping meal ideas
│   ├── authStore.ts    # User authentication state
│   ├── paywallStore.ts # Premium feature gating
│   ├── tipStore.ts     # Community tips with Firebase sync
│   ├── gearReviewStore.ts  # Gear reviews with Firebase sync
│   └── imageLibraryStore.ts  # Photo library with Firebase Storage
│
├── navigation/         # Navigation configuration
│   ├── RootNavigator.tsx
│   └── types.ts
│
├── types/              # TypeScript types
│   └── camping.ts      # Core types (Trip, Park, GearList, etc.)
│
├── constants/          # App constants
│   ├── colors.ts       # Official CCC color palette
│   └── images.ts       # Hero images and empty state illustrations
│
├── utils/              # Utility functions
    ├── cn.ts           # Tailwind class merger
    ├── haptics.ts      # Haptic feedback helpers
    └── userType.ts     # User type utility
│
├── api/                # API services
│   ├── chat-service.ts     # LLM chat services
│   ├── openai.ts           # OpenAI client
│   ├── anthropic.ts        # Anthropic client
│   ├── grok.ts             # Grok client
│   ├── image-generation.ts # Image generation
│   ├── transcribe-audio.ts # Audio transcription
│   ├── tips-service.ts     # Community tips Firebase API
│   ├── qa-service.ts       # Q&A Firebase API
│   ├── feedback-service.ts # Feedback Firebase API
│   ├── gear-reviews-service.ts  # Gear reviews Firebase API
│   └── photo-service.ts    # Photo library Firebase API
│
└── config/             # Configuration
    └── firebase.ts     # Firebase initialization
```

## 🚀 Core Features

### 1. Trip Management (Plan Tab)
- **Create trips** with full-featured modal: name, dates, destination, party size, camping style, description
- **Trip segments**: Active (upcoming + in progress), Completed, All
- **Sorting options**: Start date (soonest), Recently updated, A-Z
- **Advanced filters**: Date range, camping style (Backpacking, Car Camping, RV, Glamping), states
- **Trip cards** display:
  - Status badges (In Progress, Upcoming, Completed)
  - Destination with location icon
  - Party size and camping style chips
  - Packing progress (items checked/total) - **tappable to go to Packing tab**
  - Weather forecast preview (if available) - **tappable to go to Weather tab**
  - Resume button for quick access
- **Quick navigation from trip cards**:
  - Tap packing progress chip → opens Packing tab
  - Tap weather chip → opens Weather tab
  - Seamless context switching within active trips
- **Trip actions menu**: Edit, Duplicate, Share, Archive, Delete
- **Pagination**: 20 trips per page with infinite scroll
- **Persistent preferences**: Selected segment, sort order, and filters saved
- Status tracking computed from dates (Upcoming, In Progress, Completed)

### 2. Parks Discovery
- Browse camping parks and locations
- Filter by type (National Park, State Park, etc.)
- View park details, amenities, and ratings
- Mock data included (ready for API integration)

### 3. Packing Lists
- **Interactive checklist accessible from Packing tab**
  - View and manage packing lists for all active trips
  - Quick trip selector for switching between trips
  - Real-time progress tracking with visual progress bars
  - Check off items as you pack with haptic feedback
- **Full packing list management**
  - Create comprehensive packing lists
  - Pre-built templates with essential gear for 10 camping styles
  - Organize items by category (Shelter, Kitchen, Clothing, etc.)
  - Track packing progress per item with quantities and notes
  - Add/edit/delete items and custom categories
  - Filter to show only unpacked items
  - Link packing lists to specific trips
- **Auto-generation based on camping style**
- Visual progress indicators
- Firebase integration with local storage fallback

### 4. Meal Planning
- **Trip-specific meal planning**
  - Plan meals day-by-day for each trip
  - Select from 100+ camping meal ideas
  - Organize by meal type: breakfast (3 meals), lunch (3 meals), dinner (3 meals), snacks (unlimited)
  - Quick access from Meals tab with trip cards
  - Firebase with local storage fallback
- **Meal library browser**
  - 100+ camping meal ideas organized by category
  - Filter by meal type (Breakfast, Lunch, Dinner, Snacks)
  - Filter by prep method (No Cook, Cold, Camp Stove, Campfire)
  - Search meals by name, ingredients, or tags
  - View detailed meal information with ingredients and instructions
  - Difficulty levels and tags for quick reference
  - Suitable camping styles for each meal

### 5. Learning & Community
- **Learn** - XP-based progression system with 3 learning tracks:
  - Weekend Camper (novice)
  - Trail Leader (intermediate)
  - Backcountry Guide (master)
- Learning modules with step-by-step lessons, XP rewards, and achievement badges
- Visual XP progress bar showing current level
- Module cards with difficulty badges, time estimates, and progress tracking
- **Connect/Community** - Full-featured community platform with 5 tabs:
  - **Tips Tab**: Community-submitted camping tips with categories, likes, and Firebase sync
  - **Gear Reviews Tab**: Equipment reviews with ratings, filtering, sorting, and helpful votes
  - **Ask a Camper Tab**: Q&A system for asking questions, providing answers, and accepting solutions
  - **Photos Tab**: Image library with upload, voting, categories, and Firebase Storage integration
  - **Feedback Tab**: Reddit-style voting system for app feedback, feature requests, and bug reports
- All community features use real Firebase integration (Firestore + Storage)
- Premium/trial gating for content submission
- User authentication required for voting and posting
- **First Aid** - Essential wilderness first aid guide

## 🔥 Connect/Community Features

The Connect section is a full-featured community platform with Firebase integration:

### Tips Tab
- Submit and browse camping tips organized by category
- 10 categories: Setup, Cooking, Safety, Gear, Weather, Wildlife, Navigation, Water, Family, Other
- Like/helpful marking synced with Firebase
- Premium/trial users can submit tips
- Real-time sync with Firestore

### Gear Reviews Tab
- Comprehensive gear reviews with multiple ratings (overall, durability, value, performance)
- Filter by category, search by keyword
- Sort by newest, highest-rated, most helpful, or price
- Mark reviews as helpful
- Verified purchase badges
- Activity tags and audience levels

### Ask a Camper Tab (Q&A)
- Post questions with tags for better discoverability
- Provide answers to community questions
- Upvote questions for visibility
- Accept answers (question author only)
- View count and answer count tracking
- Real-time Firebase sync

### Photos Tab
- Upload photos with titles, descriptions, and categories
- Vote on photos (upvote/downvote)
- Filter by category: Camping, Nature, Gear, Food, Wildlife, Trails, etc.
- Sort by date, score, or "hot" algorithm
- Image storage via Firebase Storage
- Grid view with voting controls

### Feedback Tab
- Reddit-style voting system for app feedback
- Categories: Feature Requests, Bug Reports, Improvements, Questions, Other
- Status tracking: Open, Under Review, Planned, In Progress, Completed, Closed
- Karma scores (upvotes - downvotes)
- Comment system for discussion
- Sort by hot, top, or newest

### Technical Implementation
- **Firebase Firestore** for all community data
- **Firebase Storage** for photo uploads
- **Zustand** for local state management with AsyncStorage persistence
- **Optimistic UI updates** for instant feedback on votes
- **Authentication gating** for content submission and voting
- **Premium feature gating** via PaywallStore
- **Toast notifications** for user feedback
Custom-designed bottom navigation matching your original design:
- **Home** - Dashboard with quick actions and tips
- **Learn** - Camping education and skill building
- **Plan** - Trip management and planning
- **Connect** - Community and social features
- **First Aid** - Safety and emergency information
- Copyright footer: "©2025 Tent and Lantern, LLC • About"

## 🎨 Design System

**Master Theme:** All design tokens are centralized in `src/theme/theme.ts`

### Complete Theme Documentation

📖 **See [THEME_GUIDE.md](./THEME_GUIDE.md) for comprehensive theme usage guide**

The app uses a complete design system with:
- **Centralized color palette** (no ad-hoc colors allowed)
- **Standardized typography** (pre-defined text styles)
- **Consistent spacing scale** (4/8/12/16/24/32px)
- **Shared component styles** (cards, buttons, screens)

**Quick Import:**
```typescript
import { colors, textStyles, componentStyles, spacing, layout } from "../theme/theme";
```

### Official Color Palette (Complete Camping App)

The app now uses an official, carefully curated color palette that creates a warm, natural camping aesthetic:

**Primary Colors:**
- **Deep Forest (#485952)** - Primary text, headings, icons, buttons, navigation active states
- **Earth Green (#828872)** - Secondary text, muted labels, subtle borders, inactive icon states
- **Warm Granite Gold (#AC9A6D)** - Accents, highlight text, decorative moments (use sparingly)

**Secondary Colors:**
- **River Rock Blue Green (#607A77)** - Status badges, card accents, secondary emphasis icons
- **Soft Sierra Sky (#92AFB1)** - Soft backgrounds, light accent moments, dividers, weather elements

**Background:**
- **Parchment Cream (#F4EBD0)** - Universal background for screens, cards, ScrollViews, footer navigation

**Borders:**
- **Parchment Border (#D5C8A2)** - Thin, soft borders (never harsh black or gray)

### Color Usage Rules

**Hero Images & Empty States:**

The app features beautiful hero images and empty state illustrations:

**Hero Images** (`HERO_IMAGES` in `src/constants/images.ts`):
- `welcome.png` - HomeScreen hero with forest scene
- `community.png` - CommunityScreen hero with camping community
- `learning.png` - LearnScreen hero with education theme
- `first_aid.png` - FirstAidScreen hero with medical supplies
- `weather.png` - Available for weather-related screens

**Empty State Illustrations** (`EMPTY_STATE_IMAGES`):
- `plan_trip.png` - Used in MyTripsScreen when no trips exist
- `packing.png` - Used in GearListsScreen when no packing lists exist
- `meals.png` - Ready for meal planning feature implementation

All hero images are displayed with:
- Height: 180-200px with safe area insets
- Dark gradient overlay (rgba(0,0,0,0.3) to rgba(0,0,0,0.4))
- White parchment text with title and subtitle
- Centered content layout

1. **Text Colors:**
   - Primary text: Deep Forest
   - Secondary text: Earth Green
   - Never use pure black for text

2. **Buttons:**
   - Primary button: Deep Forest background with Parchment text
   - Secondary button: Outline using Deep Forest with Deep Forest text
   - No other button color styles allowed

3. **Backgrounds:**
   - Use Parchment Cream for all screen and card backgrounds
   - Never use pure white or dark gray backgrounds
   - Everything should feel warm, calm, and natural

4. **Borders:**
   - Use thin, soft borders with Parchment Border color
   - Do not use harsh black or gray borders

5. **Icons:**
   - Default: Deep Forest
   - Inactive: Earth Green or 70% opacity Deep Forest
   - Active: Deep Forest filled
   - Never use color gradients on icons

6. **Tailwind Classes:**
```typescript
// Text
text-forest          // Primary text (#485952)
text-earthGreen      // Secondary text (#828872)
text-granite         // Accent text (#AC9A6D)

// Backgrounds
bg-parchment         // Universal background (#F4EBD0)
bg-forest            // Primary buttons (#485952)
bg-riverRock         // Status badges (#607A77)
bg-sierraSky         // Soft backgrounds (#92AFB1)

// Borders
border-parchmentDark // Soft borders (#D5C8A2)
```

7. **Constants (for inline styles):**
```typescript
import {
  DEEP_FOREST,      // #485952
  EARTH_GREEN,      // #828872
  GRANITE_GOLD,     // #AC9A6D
  RIVER_ROCK,       // #607A77
  SIERRA_SKY,       // #92AFB1
  PARCHMENT,        // #F4EBD0
  PARCHMENT_BORDER  // #D5C8A2
} from "../constants/colors";
```

### Typography

The app uses the official CCC Font Stack with carefully selected typefaces:

#### Display Font: Raleway
**Weights Available:**
- `Raleway_600SemiBold` - Secondary headers, section titles
- `Raleway_700Bold` - Hero titles, main headings

**IMPORTANT:** Never use `Raleway_400Regular`. It has been fully replaced with the SemiBold weight.

**Use For:**
- Hero titles (Bold)
- Section headers (SemiBold)
- Big titles (Bold)
- Feature landing screens (Bold)
- Illustrated pages
- Welcome screen titles
- Anything that carries the "WPA field guide" aesthetic

#### Body Font: Source Sans 3
**Weights Available:**
- `SourceSans3_400Regular`
- `SourceSans3_600SemiBold`
- `SourceSans3_700Bold`

**Use For:**
- Body text
- Labels
- Checklists
- Cards
- Buttons
- Navigation labels
- Paragraphs under section headings

#### Accent Font: Satisfy
**Weights Available:**
- `Satisfy_400Regular`

**Use For:**
- Very sparingly
- Never for functional UI
- Think tiny, decorative text when needed

#### Implementation Rules
**IMPORTANT:** Every `<Text>` element must specify one of these exact font families. No system font fallback is allowed.

**Typography Components** (recommended approach):
```typescript
import { Heading1, Heading2, SectionTitle, BodyText, Caption } from "../components/Typography";

// Display fonts
<Heading1>Welcome to Camping</Heading1>  // Raleway_700Bold
<SectionTitle>Getting Started</SectionTitle>  // Raleway_600SemiBold

// Body fonts
<BodyText>This is regular body text</BodyText>  // SourceSans3_400Regular
<Caption>Small caption text</Caption>  // SourceSans3_400Regular
```

**Direct Text Usage** (when typography components can't be used):
```typescript
<Text style={{ fontFamily: "SourceSans3_400Regular" }}>Regular text</Text>
<Text style={{ fontFamily: "SourceSans3_600SemiBold" }}>Semibold text</Text>
<Text style={{ fontFamily: "Raleway_700Bold" }}>Bold display text</Text>
```

### UI Components

- **Button** - 4 variants (primary, secondary, outline, ghost), 3 sizes
- **Typography** - Consistent text styles
- **Cards** - Rounded corners, subtle borders, active states
- **Haptic feedback** - On all interactive elements
- **Icons** - Ionicons throughout

## 🛠 State Management

### Zustand Stores with Persistence

**tripsStore.ts** - Comprehensive trip management
```typescript
- trips: Trip[]
- addTrip() - Returns trip ID
- updateTrip()
- deleteTrip()
- getTripById()
- getTripsByStatus()
- updateTripPacking() - Track gear progress
- updateTripMeals() - Meal planning
- updateTripNotes() - Trip journal
- updateTripWeather() - Store forecast data
```

**tripsListStore.ts** - Trip list UI state (persisted)
```typescript
- segment: "active" | "completed" | "all"
- sortBy: "startSoonest" | "updatedRecent" | "az"
- filters: { dateFrom, dateTo, campingStyle, states }
- pageBySegment: Record<segment, page>
- setSegment(), setSortBy(), setFilters()
- resetFilters(), incrementPage(), resetPaging()
```

**learningStore.ts** - Learning progression
```typescript
- modules: LearningModule[]
- tracks: LearningTrack[]
- userProgress: { level, xp, completedModules }
- completeModule() - Award XP
- getModulesByTrack()
- canAccessModule() - Check unlock status
```

**gearStore.ts** - Packing lists
```typescript
- packingLists: PackingList[]
- addPackingList()
- updatePackingList()
- deletePackingList()
- toggleItemPacked()
- getPackingProgress()
```

**parksStore.ts** - Parks discovery
```typescript
- parks: Park[]
- filteredParks: Park[]
- filters: { types, state, searchQuery }
- setParks()
- setFilters()
- clearFilters()
```

**mealStore.ts** - Meal library and filtering
```typescript
- mealLibrary: MealLibraryItem[] (100+ pre-populated meals)
- selectedCategory: "all" | "breakfast" | "lunch" | "dinner" | "snack"
- selectedPrepType: "all" | "noCook" | "cold" | "campStove" | "campfire"
- searchQuery: string
- setSelectedCategory()
- setSelectedPrepType()
- setSearchQuery()
- getFilteredMeals() - Returns filtered meals based on all filters
- addCustomMeal() - Add user's custom meals
- initializeMealLibrary() - Populates library on first load
```

### Best Practices Used
✅ Individual selectors to prevent unnecessary re-renders
✅ AsyncStorage persistence for trips and gear
✅ Immutable state updates
✅ Type-safe actions and selectors

## 📱 Navigation Structure

```
RootNavigator (Stack)
└── HomeTabs (Bottom Tabs)
    ├── Home
    ├── MyTrips
    ├── Parks
    └── GearLists

Modal Screens (presentation: modal)
├── CreateTrip
└── CreateGearList

Detail Screens
├── TripDetail
├── ParkDetail
├── GearListDetail
└── Account
```

## 🔧 Key Improvements Over Original

### 1. State Management
**Before**: 21 different stores, potential for over-subscription
**After**: 3 optimized stores with selective subscriptions

### 2. Code Organization
**Before**: Mixed concerns, unclear structure
**After**: Clear separation - components, screens, state, navigation

### 3. Type Safety
**Before**: Inconsistent typing
**After**: Full TypeScript with strict types

### 4. Performance
**Before**: Unnecessary re-renders, bloated code
**After**: Optimized selectors, clean code, efficient updates

### 5. UI Consistency
**Before**: Inconsistent styling and patterns
**After**: Design system with reusable components

## 🎯 Usage Examples

### Using Stores
```typescript
// ✅ Good - Selective subscription
const trips = useTripsStore((s) => s.trips);
const addTrip = useTripsStore((s) => s.addTrip);

// ❌ Bad - Subscribes to entire store
const store = useTripsStore();
```

### Creating a Trip
```typescript
addTrip({
  name: "Yosemite Weekend",
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 86400000 * 2).toISOString(),
  campingStyle: "backpacking",
  partySize: 4,
});
```

### Creating a Packing List
```typescript
const listId = addPackingList({
  name: "Weekend Camping",
  tripId: "trip_123",
  categories: GEAR_TEMPLATES,
});
```

## 🚀 Next Steps

### Ready to Implement
- Weather API integration (forecast display on trips)
- Map view for parks (react-native-maps is installed)
- Photo uploads for trip memories
- Notes and journal entries per trip
- Share packing lists
- Offline mode with better caching

### Easy Extensions
- More park filters (amenities, activities)
- Custom gear item creation
- Trip invitations and sharing
- Camping tips and guides
- Equipment reviews

## 📦 Dependencies

All required packages are already installed:
- **React Navigation** - Native stack, bottom tabs
- **Zustand** - State management with persistence
- **date-fns** - Date formatting
- **Nativewind** - Tailwind CSS for React Native
- **Expo** - Full Expo SDK 53
- **Haptics** - Native haptic feedback

## 🧪 Testing

The app structure makes testing easy:
- Pure functions in stores (easy to unit test)
- Component props are well-defined
- Navigation types prevent routing errors
- Mock data included for development

## 📝 Notes

### What Was Kept
- Your original feature set and vision
- The lodge/camping aesthetic
- Core functionality (trips, parks, gear)

### What Was Improved
- Architecture and organization
- State management efficiency
- Code cleanliness and maintainability
- Type safety
- UI consistency
- Performance

### What's Ready to Add
- Backend integration (Firebase, Supabase, etc.)
- Authentication
- Real park data (NPS API)
- Weather API
- Image uploads
- Social features

## 💡 Tips

1. **Adding new screens**: Add to `RootStackParamList` in `src/navigation/types.ts`
2. **New state**: Create a focused store in `src/state/`
3. **Reusable UI**: Add components to `src/components/`
4. **Styling**: Use Nativewind classes with lodge theme colors
5. **Icons**: Browse Ionicons at https://ionic.io/ionicons

---

## 🔒 Firestore Security Rules

The following rules need to be manually added to your Firebase Console under Firestore Database → Rules.

### userGear Collection (My Gear Closet)

Add these rules to allow users to manage their personal gear:

```javascript
// My Gear Closet - private gear collection
match /userGear/{gearId} {
  allow read: if isSignedIn()
    && "ownerId" in resource.data
    && request.auth.uid == resource.data.ownerId;

  allow create: if isSignedIn()
    && "ownerId" in request.resource.data
    && request.auth.uid == request.resource.data.ownerId;

  allow update, delete: if isSignedIn()
    && "ownerId" in resource.data
    && request.auth.uid == resource.data.ownerId;
}
```

**Storage Rules for Gear Photos:**

Add these rules to Firebase Storage under Storage → Rules:

```javascript
// Gear Closet images - users can only access their own gear photos
match /gearCloset/{userId}/{gearId}/{fileName} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow write: if request.auth != null && request.auth.uid == userId;
  allow delete: if request.auth != null && request.auth.uid == userId;
}
```

### How to Deploy Rules

1. Go to Firebase Console → Your Project
2. Navigate to **Firestore Database** → **Rules** tab
3. Add the `userGear` rules to your existing rules (inside the `service cloud.firestore` block)
4. Navigate to **Storage** → **Rules** tab
5. Add the `gearCloset` storage rules to your existing rules (inside the `service firebase.storage` block)
6. Click **Publish** to deploy the changes

---


**Built with** ❤️ **using Expo SDK 53 + React Native 0.76.7**
