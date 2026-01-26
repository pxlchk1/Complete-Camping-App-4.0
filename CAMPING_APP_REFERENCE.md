# Complete Camping App 2.0 - Downloaded Reference

## Repository Information
- **Source**: https://github.com/pxlchk1/complete-camping-app-2.0
- **App Name**: Tent & Lantern
- **Tech Stack**: React Native Expo SDK 53, TypeScript, Zustand, Firebase
- **Theme**: Outdoor camping companion app with "lodge" themed design

---

## Architecture Overview

### State Management (Zustand)
The app uses 21 different Zustand stores for feature-specific state:
- `appStore.ts` - Global app state
- `authStore.ts` - User authentication
- `tripStore.ts` / `tripsListStore.ts` - Trip planning and management
- `parksStore.ts` / `savedParksStore.ts` - Parks data and favorites
- `gearStore.ts` / `gearReviewStore.ts` - Gear checklists and reviews
- `campsiteStore.ts` / `favoritesStore.ts` - Campsite data
- `weatherStore.ts` - Weather forecasts
- `imageLibraryStore.ts` / `storiesStore.ts` - Community photos
- `learningStore.ts` / `tipStore.ts` - Educational content
- `paywallStore.ts` / `premiumStore.ts` - Subscription management
- `planStore.ts` / `wishlistStore.ts` - Planning features

### Navigation Structure
- **AppNavigator.tsx** - Main navigation orchestrator
- **PlanParksStackNavigator.tsx** - Park planning navigation flow
- **NavigationService.ts** - Navigation utilities

Uses React Navigation with:
- Native stack navigators
- Bottom tabs
- Drawer menus
- Material top tabs

---

## Key Screens (45 total)

### Core Features
1. **HomeScreen.tsx** - Dashboard with quick actions, daily tips, learning modules
2. **MyTripsScreen.tsx** - User's trip collection
3. **TripDetailScreen.tsx** - Trip overview with tabs (overview, packing, meals, notes)
4. **TripPlannerScreen.tsx** - Main trip planning interface
5. **TripSetupScreen.tsx** - Initial trip creation

### Parks & Discovery
6. **ParksMapScreen.tsx** - Interactive map with park markers and filters
7. **ParkDetailScreen.tsx** - Comprehensive park information
8. **ParksSelectionScreen.tsx** - Park browsing interface
9. **AreaDetailScreen.tsx** - Camping area details
10. **AreasListScreen.tsx** - Available camping areas
11. **DestinationDetailScreen.tsx** - Destination information

### Planning Tools
12. **GearChecklistScreen.tsx** - Packing list management
13. **PackingChecklistScreen.tsx** - Interactive packing tool
14. **PackingListBuilderScreen.tsx** - Custom packing list creation
15. **MealPlanBuilderScreen.tsx** - Meal planning with shopping list
16. **MealPlansScreen.tsx** - Saved meal plans
17. **WeatherInputScreen.tsx** - Weather condition entry
18. **WeatherResultsScreen.tsx** - Weather forecast display

### Community & Learning
19. **CommunityScreen.tsx** - Social features
20. **ImageLibraryScreen.tsx** - Photo browsing
21. **LearningModulesScreen.tsx** - Educational content
22. **LearnModuleDetailScreen.tsx** - Individual module content
23. **GearReviewsScreen.tsx** - Gear reviews list
24. **GearReviewDetailScreen.tsx** - Individual review
25. **SubmitGearReviewScreen.tsx** - Review submission form
26. **SafetyScreen.tsx** - Safety guidelines
27. **TipDetailScreen.tsx** - Camping tips

### User Management
28. **AccountScreen.tsx** - User profile and account
29. **EditProfileScreen.tsx** - Profile editing
30. **PublicProfileScreen.tsx** - Public user profile
31. **SettingsScreen.tsx** - App settings
32. **OnboardingScreen.tsx** - User onboarding
33. **PersonalityQuizScreen.tsx** - Camping preference assessment
34. **WelcomeScreen.tsx** - Welcome screen

### Feedback & Admin
35. **FeedbackBoardScreen.tsx** - Community feedback
36. **CreateFeedbackScreen.tsx** - Feedback submission
37. **FeedbackDetailScreen.tsx** - Individual feedback
38. **AdminPanelScreen.tsx** - Admin controls
39. **AdminMigrationScreen.tsx** - Data migration

### Premium Features
40. **PremiumScreen.tsx** - Subscription information
41. **StartTrialConfirmScreen.tsx** - Trial confirmation

### Planning Hub
42. **PlanAndParksScreen.tsx** - Combined planning/park selection
43. **PlanDestinationsScreen.tsx** - Destination selection
44. **PlanParksHomeScreen.tsx** - Planning hub
45. **PlannedTripsOverviewScreen.tsx** - Trip summary view
46. **PlanningTemplateScreen.tsx** - Pre-built templates

---

## Key Components (61 total)

### UI Components
- **Button.tsx** - Multi-variant button (primary, secondary, outline, ghost)
  - Sizes: sm, md, lg
  - Loading states, icons, haptic feedback
  - Tailwind styling with lodge theme colors

- **Typography.tsx** - Text styling components
- **Select.tsx** - Dropdown selection
- **Avatar.tsx** / **AvatarPicker.tsx** - Profile pictures
- **StandardHeader.tsx** - Standard header bar

### Cards & Lists
- **TripCard.tsx** - Trip summary with status badges, weather, progress
- **CampsiteCard.tsx** - Campsite info with amenities, ratings, fees
- **ParkResultCard.tsx** - Park search results
- **ParkListItem.tsx** - Park list entry
- **GearReviewCard.tsx** - Gear review display
- **ImageCard.tsx** / **ImagePreviewCard.tsx** - Image displays

### Modals & Sheets
- **CreateTripModal.tsx** - Trip creation
- **ChooseTripSheet.tsx** - Trip selection bottom sheet
- **ConfirmationModal.tsx** - User confirmations
- **AddCustomCampgroundModal.tsx** - Custom campground entry
- **ImageEditModal.tsx** / **ImageMetadataModal.tsx** - Image management
- **FirstAidRecommendationModal.tsx** - First aid suggestions
- **PromptInputModal.tsx** - Text input modal
- **TipSubmissionModal.tsx** - Camping tips
- **AboutModal.tsx** - App information

### Subscription/Paywall
- **PaywallHost.tsx** - Subscription container
- **PaywallInterruptionModal.tsx** - Subscription prompts
- **SeeWhatsInPlusModal.tsx** - Premium features
- **StartTrialConfirmModal.tsx** - Trial confirmation
- **SubscriptionModal.tsx** - Subscription management
- **TrialBanner.tsx** / **PostTrialSoftPrompt.tsx** - Trial status

### Pickers & Input
- **CampingStylePicker.tsx** - Camping style selection
- **StatePicker.tsx** - US state selection
- **ImageTagPicker.tsx** - Image tag selection
- **HandleInput.tsx** - Username input
- **ParkTypeFilters.tsx** - Park type filters

### Feedback & Status
- **LoadingScreen.tsx** / **LanternLoadingIndicator.tsx** - Loading states
- **LoadingSpinner.tsx** - Spinner animation
- **EmptyState.tsx** - Empty content message
- **ErrorBoundary.tsx** - Error handling
- **OfflineIndicator.tsx** - Offline status
- **ToastManager.tsx** - Notifications
- **InlineConfirmBanner.tsx** - Confirmation messages

### Special Effects
- **FireflySystem.tsx** / **FireflyParticle.tsx** - Animated firefly effects
- **AnimatedVibecodeLogoSvg.tsx** / **VibecodeLogoSvg.tsx** - Branding
- **XPBar.tsx** - Progress visualization
- **HorizontalScrollHint.tsx** - Scroll indicators

### Interactive Elements
- **SwipeToDeleteRow.tsx** - Swipe gesture row
- **DraggableCategoryHeader.tsx** - Draggable headers
- **ImageUploadButton.tsx** - Image upload trigger
- **ImageViewer.tsx** - Full-screen image view
- **CustomBottomNavigation.tsx** - Custom nav bar

### Debug Tools
- **DebugPanel.tsx** / **DebugInfoPanel.tsx** / **ParksDebugPanel.tsx** - Debugging

---

## Design System

### Color Theme: "Lodge" Aesthetic
The app uses a nature-inspired color palette:

```typescript
// Forest greens
lodge-forest-50, 100, 200, 800, 900

// Earth tones
lodge-brown-600, 700, 800
lodge-amber-100, 600, 700, 800
lodge-sage-700

// Neutrals
lodge-cream-50, 100, 200
lodge-stone-100, 500, 600
```

### Typography
- Uses custom `ButtonText` component
- Multiple text styles via Typography components
- Consistent font sizing and weights

### Styling Approach
- **Nativewind (Tailwind CSS)** for most components
- **Inline styles** for specific components (LinearGradient, CameraView)
- Rounded corners (rounded-xl, rounded-2xl)
- Subtle borders and shadows
- Active states for pressable elements

### UI Patterns
- **Status badges** with color coding (green=in progress, blue=upcoming, gray=completed)
- **Chip/tag design** for metadata (party size, camping style, amenities)
- **Card-based layouts** with borders and padding
- **Icon integration** using @expo/vector-icons (Ionicons)
- **Haptic feedback** on interactions
- **Loading states** with branded indicators
- **Empty states** for no content
- **Bottom sheets** for secondary actions

---

## Key Features Implementation

### 1. Trip Planning System
**Data Structure** (from TripCard.tsx):
```typescript
interface Trip {
  id: string;
  name: string;
  startDate: string; // ISO format
  endDate: string;
  destination?: {
    name: string;
    latitude?: number;
    longitude?: number;
  };
  partySize?: number;
  campingStyle?: string;
  packing?: {
    categories: any[];
    checkedItems?: any[];
  };
}
```

**Features**:
- Date range with night calculation
- Status tracking (In Progress, Upcoming, Completed)
- Weather integration
- Packing progress tracking
- Resume/menu actions with haptic feedback

### 2. Parks Discovery
**Features** (from ParksMapScreen):
- Interactive map with markers
- Bounding box filtering for visible parks
- Park type filters (national parks, state parks, forests)
- Real-time sync with Firebase
- Search functionality
- Cache management (14-day expiration)

**Data Strategy**:
- Hybrid SQLite + Firebase
- In-memory filtering for performance
- Coordinate validation (filters out 0,0 coordinates)
- Deduplication via Map structure

### 3. Campsite System
**Data Structure**:
```typescript
interface Campsite {
  id: string;
  name: string;
  type: "state_park" | "national_park" | "national_forest";
  city: string;
  state: string;
  description: string;
  amenities: string[];
  distance?: number;
  rating?: number;
  reviewCount?: number;
  fees: {
    camping?: number;
  };
  reservationRequired?: boolean;
}
```

**UI Features**:
- Type icons and labels
- Distance formatting (feet < 1 mile, miles otherwise)
- Amenity tags (shows 3 + more indicator)
- Favorite toggling
- Rating display with review count

### 4. Gear Checklists
**Features**:
- Template-based list creation
- Trip type and season customization
- Category organization
- Progress tracking
- Premium limits (1 list for free, unlimited for premium)

### 5. Meal Planning
**Features**:
- Multi-day planning
- Meal categories (breakfast, lunch, dinner, snacks)
- Party size configuration
- Auto-generated shopping list
- Export/share functionality

---

## Technical Details

### Expo Configuration
- **SDK**: 53
- **React Native**: 0.76.7
- **Platform**: iOS optimized, Android supported

### Key Libraries
- **State Management**: Zustand with AsyncStorage persistence
- **Navigation**: React Navigation (native stacks, bottom tabs, drawers)
- **Styling**: Nativewind (Tailwind for React Native)
- **Icons**: @expo/vector-icons (Ionicons primary)
- **Maps**: react-native-maps
- **Backend**: Firebase (Auth, Firestore)
- **Subscriptions**: RevenueCat
- **Haptics**: Expo Haptics
- **Animations**: react-native-reanimated v3, react-native-gesture-handler
- **Context Menus**: zeego library

### Performance Optimizations
- Memo hooks for expensive computations
- Deferred operations (parks rebuild 2s after interactive)
- Rate limiting (200ms for data operations)
- Splash screen management (min 1.5s, waits for fonts/auth)
- Background sync with cache expiration

### Accessibility
- `accessibilityLabel` on interactive elements
- `accessibilityRole="button"` on pressables
- `accessibilityState` for disabled states
- Screen reader support throughout

---

## Code Examples

### Button Component Usage
```typescript
<Button
  variant="primary" // or "secondary", "outline", "ghost"
  size="md" // or "sm", "lg"
  icon="add" // Ionicons name
  iconPosition="left" // or "right"
  loading={isLoading}
  disabled={isDisabled}
  fullWidth
  onPress={handlePress}
>
  Create Trip
</Button>
```

### TripCard Usage
```typescript
<TripCard
  trip={tripData}
  onResume={(trip) => navigation.navigate("TripDetail", { id: trip.id })}
  onMenu={(trip) => showTripMenu(trip)}
/>
```

### CampsiteCard Usage
```typescript
<CampsiteCard
  campsite={campsiteData}
  onPress={(campsite) => navigation.navigate("CampsiteDetail", { id: campsite.id })}
  isFavorite={favorites.includes(campsite.id)}
  onToggleFavorite={toggleFavorite}
  showDistance={true}
/>
```

---

## File Locations

All downloaded reference files are in:
- `/home/user/workspace/downloaded-camping-app/components/`
  - Button.tsx
  - TripCard.tsx
  - CampsiteCard.tsx

Full repository available at:
https://github.com/pxlchk1/complete-camping-app-2.0

---

## Design Inspirations

The app draws inspiration from:
- **Lodge/Cabin aesthetic** - Warm earth tones, forest greens, natural feel
- **National Park branding** - Icon system, badge styles
- **Modern mobile UX** - Card-based layouts, bottom sheets, smooth animations
- **Outdoor apps** - AllTrails, REI, Campendium influences

### Key Design Principles
1. **Nature-first color palette** - Forest, earth, and cream tones
2. **Clear information hierarchy** - Status badges, visual separation
3. **Touch-optimized** - Large tap targets, swipe gestures
4. **Progressive disclosure** - Show essentials, expand for details
5. **Consistent iconography** - Ionicons throughout
6. **Haptic feedback** - Physical confirmation of actions
7. **Loading states** - Branded animations, never blank screens
8. **Empty states** - Helpful messages when no content

---

## Notes for Implementation

### Dependencies to Install
If adapting components, you'll need:
- Zustand for state
- Custom utility functions (haptics, cn helper)
- Typography components
- Color constants
- Type definitions

### Customization Points
1. **Color theme** - All lodge-* colors can be replaced
2. **Icons** - Ionicons can be swapped for other libraries
3. **Button variants** - Easy to add new styles
4. **Card layouts** - Modular structure for customization
5. **Haptic patterns** - Can be removed or customized

### Best Practices from This App
1. **Separate concerns** - 21 different stores for features
2. **Reusable components** - 61 components for composition
3. **Consistent styling** - Tailwind classes with theme
4. **Type safety** - Full TypeScript throughout
5. **Accessibility** - Labels and roles on all interactive elements
6. **Performance** - Memoization, deferred operations, caching
7. **User feedback** - Loading states, toasts, haptics
8. **Error handling** - Error boundaries, validation

---

## Additional Resources

### Documentation
- React Native: https://reactnative.dev
- Expo SDK 53: https://docs.expo.dev
- React Navigation: https://reactnavigation.org
- Nativewind: https://nativewind.dev
- Zustand: https://docs.pmnd.rs/zustand

### Similar Apps for Inspiration
- AllTrails - Hiking and trail discovery
- REI Co-op - Outdoor gear and planning
- Campendium - Campground reviews
- The Dyrt - Camping app and community
- Hipcamp - Private camping bookings

---

**Downloaded**: November 26, 2025
**Status**: Reference documentation for Complete Camping App 2.0
