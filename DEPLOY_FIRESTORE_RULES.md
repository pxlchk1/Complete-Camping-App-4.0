# Deploy Firestore Rules

## The Problem
The Connect tabs (Tips, Gear, Ask, Feedback) were showing "Failed to load - Missing or insufficient permissions" because:
1. The `communityTips` collection rules were missing
2. All community collections required authentication to READ (they should allow public read)

## The Fix
Updated `firestore.rules` to:
1. Add rules for `communityTips` collection
2. Allow public read access (`allow read: if true`) for all community content
3. Still require authentication for creating/updating/deleting

## Deploy Options

### Option 1: Firebase CLI (Recommended)
```bash
# First, re-authenticate
firebase login --reauth

# Then deploy the rules
firebase deploy --only firestore:rules
```

### Option 2: Firebase Console (Manual)
1. Go to https://console.firebase.google.com/
2. Select "tentandlanternapp" project
3. Click "Firestore Database" → "Rules" tab
4. Replace the rules with the content from `firestore.rules` file
5. Click "Publish"

## Verify It Works
After deploying:
1. Open the app
2. Navigate to Connect tab
3. Tap Tips, Gear, Ask, or Feedback tabs
4. Content should load without "Missing permissions" errors
5. Users can browse without signing in
6. Creating/editing still requires authentication

## What Changed
- ✅ Added `communityTips` collection rules
- ✅ Changed all community read permissions from `isSignedIn()` to `true` (public)
- ✅ Updated all 4 services to not require auth for reading:
  - `tipsService.ts` 
  - `askService.ts`
  - `gearReviewsService.ts`
  - `feedbackService.ts`
