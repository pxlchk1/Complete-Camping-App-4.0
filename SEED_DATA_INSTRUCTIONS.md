# Community Data Seeding Instructions

## Overview
Your app is now wired with Firebase community content seeding. This will populate your Firebase Firestore database with sample community data including tips, gear reviews, questions, and feedback posts.

## What Gets Seeded

### Tips (8 items)
- Camping tips and tricks covering various categories
- Topics: fire starting, clothing layers, gear testing, bear bags, water, organization, cooking, knots
- Categories: Safety, Gear, Setup, Wildlife, Water, Cooking

### Gear Reviews (4 items)
- Detailed product reviews with ratings
- Products: MSR Hubba Hubba NX tent, Jetboil Flash stove, Therm-a-Rest NeoAir XLite pad, Sawyer Squeeze filter
- Categories: shelter, cooking, sleeping, water
- Includes: ratings, pros/cons, pricing, recommendations

### Questions (4 items)
- Q&A posts from the community
- Topics: sleeping bag ratings, cooler tips, drying wet gear, solo camping safety
- Tags: beginner, gear, safety, weather, tips

### Feedback Posts (4 items)
- App feedback and feature requests
- Categories: feature_request, improvement
- Statuses: planned, under_review, open
- Topics: offline mode, PDF export, weather accuracy, gear weight tracking

## How to Seed Data

### Method 1: Using the Seed Data Screen (Recommended)

1. **Navigate to the screen in your app:**
   ```typescript
   // From any navigation prop:
   navigation.navigate('SeedData');
   ```

2. **Or add a button temporarily to HomeScreen:**
   ```typescript
   <TouchableOpacity onPress={() => navigation.navigate('SeedData')}>
     <Text>Seed Community Data</Text>
   </TouchableOpacity>
   ```

3. **Tap "Seed Data Now" button**
   - The screen shows what will be seeded
   - Displays loading state during seeding
   - Shows success message with counts
   - Shows error if something goes wrong

### Method 2: Programmatically

```typescript
import { seedCommunityData } from './src/scripts/seedCommunityData';

// Call anywhere in your app (e.g., in useEffect on first launch)
const seed = async () => {
  try {
    const result = await seedCommunityData();
    console.log('Seeded:', result.counts);
  } catch (error) {
    console.error('Seed failed:', error);
  }
};
```

## Important Notes

⚠️ **Run Only Once**: The seed script adds new documents each time it runs. Only execute it once per environment.

⚠️ **Firebase Required**: Make sure your Firebase configuration is correct and you have proper permissions set up.

⚠️ **Collections Used**:
- `communityTips`
- `gearReviews`
- `questions`
- `feedbackPosts`

## Firebase Security Rules

You'll need to set up Firestore security rules to allow reads/writes. Example:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Community Tips
    match /communityTips/{tipId} {
      allow read: if true; // Public read
      allow write: if request.auth != null; // Authenticated users can write
    }

    // Gear Reviews
    match /gearReviews/{reviewId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Questions
    match /questions/{questionId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Feedback
    match /feedbackPosts/{postId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Verification

After seeding, verify the data in:
1. **Firebase Console**: Check the Firestore collections
2. **App Community Tabs**: Navigate through Tips, Gear Reviews, Ask, and Feedback tabs
3. **Check counts**: Each section should show the seeded content

## Troubleshooting

**Permission Denied Errors:**
- Check Firebase security rules
- Verify Firebase config is correct
- Ensure user is authenticated (if rules require it)

**Data Not Appearing:**
- Check Firebase Console to confirm data was written
- Verify collection names match exactly
- Check for console errors in the app

**Duplicate Data:**
- The script creates new documents each time
- If you accidentally ran it twice, manually delete duplicates in Firebase Console

## Customization

To add or modify seed data, edit:
```
/home/user/workspace/src/scripts/seedCommunityData.ts
```

Each constant array (`SEED_TIPS`, `SEED_GEAR_REVIEWS`, etc.) can be modified to include different sample content.

## Clean Up

To remove all seeded data, you can either:
1. Manually delete documents in Firebase Console
2. Write a cleanup script (not provided)

## Next Steps

After seeding:
1. Navigate through community tabs to see the content
2. Test voting/liking functionality
3. Test commenting and interaction features
4. Add more content through the app's create screens
