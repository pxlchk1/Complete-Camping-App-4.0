# Firebase Packing List Data Model

## Overview

The packing list system uses Firebase Firestore to manage template-based packing lists. Templates are composed from base, type-specific, and weather-specific items.

## Firestore Collections

### 1. `packingTemplates` (Global Collection)

Stores reusable packing templates that apply to different camping types and weather conditions.

**Document Structure:**

```typescript
{
  id: string,                    // Auto-generated document ID
  label: string,                 // Display name (e.g., "Base Camping Essentials")
  templateType: "base" | "type" | "weather",
  campingTypes: string[],        // Empty = applies to all types
                                 // Values: ["car_camping", "backpacking", "rv", etc.]
  weatherTags: string[],         // Empty = applies to all weather
                                 // Values: ["cold", "hot", "wet"]
  addItems: Array<{              // Items to add to packing list
    id: string,
    label: string,
    category: string,            // "sleep", "kitchen", "clothing", etc.
    notes?: string
  }>,
  removeItems: string[],         // Item IDs to exclude (for filtering)
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Example Documents:**

```typescript
// Base template (applies to everyone)
{
  id: "base_essentials",
  label: "Base Camping Essentials",
  templateType: "base",
  campingTypes: [],              // Applies to all camping types
  weatherTags: [],               // Applies to all weather
  addItems: [
    {
      id: "flashlight",
      label: "Flashlight",
      category: "safety"
    },
    {
      id: "first_aid",
      label: "First Aid Kit",
      category: "safety"
    }
  ],
  removeItems: []
}

// Type-specific template (backpacking only)
{
  id: "backpacking_gear",
  label: "Backpacking Gear",
  templateType: "type",
  campingTypes: ["backpacking"],
  weatherTags: [],
  addItems: [
    {
      id: "sleeping_pad",
      label: "Ultralight Sleeping Pad",
      category: "sleep"
    },
    {
      id: "backpack",
      label: "60L Backpack",
      category: "other"
    }
  ],
  removeItems: ["camp_chair"]    // Remove items that don't apply
}

// Weather-specific template (cold weather)
{
  id: "cold_weather",
  label: "Cold Weather Gear",
  templateType: "weather",
  campingTypes: [],              // Applies to all camping types
  weatherTags: ["cold"],
  addItems: [
    {
      id: "winter_jacket",
      label: "Insulated Jacket",
      category: "clothing"
    },
    {
      id: "hand_warmers",
      label: "Hand Warmers",
      category: "other"
    }
  ],
  removeItems: []
}
```

### 2. `users/{userId}/trips/{tripId}/packingList/{itemId}` (Per-Trip Collection)

Stores the actual packing list for each trip. Generated from templates but can be customized by the user.

**Document Structure:**

```typescript
{
  id: string,                    // Auto-generated document ID
  label: string,                 // Item name
  category: string,              // "sleep", "kitchen", "clothing", etc.
  source: "base" | "type" | "weather" | "custom",
  campingType?: string,          // Set if source is "type"
  weatherTags?: string[],        // Set if source is "weather"
  isPacked: boolean,             // User checked this item
  isRemoved: boolean,            // User removed this item
  quantity: number,              // How many to bring
  notes?: string,                // User notes
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Example Documents:**

```typescript
// Base item
{
  id: "flashlight",
  label: "Flashlight",
  category: "safety",
  source: "base",
  isPacked: false,
  isRemoved: false,
  quantity: 1
}

// Type-specific item
{
  id: "sleeping_pad",
  label: "Ultralight Sleeping Pad",
  category: "sleep",
  source: "type",
  campingType: "backpacking",
  isPacked: true,
  isRemoved: false,
  quantity: 1
}

// Weather-specific item
{
  id: "rain_jacket",
  label: "Rain Jacket",
  category: "clothing",
  source: "weather",
  weatherTags: ["wet"],
  isPacked: false,
  isRemoved: false,
  quantity: 2,
  notes: "One for me, one for my partner"
}

// Custom item added by user
{
  id: "custom_xyz123",
  label: "Lucky Camping Hat",
  category: "clothing",
  source: "custom",
  isPacked: true,
  isRemoved: false,
  quantity: 1,
  notes: "Never leave home without it!"
}
```

## Template Composition Logic

When generating a packing list for a trip:

1. **Fetch all templates** from `packingTemplates` collection
2. **Filter by camping type**:
   - Include all `base` templates
   - Include `type` templates matching the trip's camping style
   - Include `weather` templates matching the trip's weather tags
3. **Compose items**:
   - Add all items from matching templates
   - Deduplicate by item ID (first occurrence wins)
4. **Apply removeItems**:
   - Collect all `removeItems` from matching templates
   - Filter out any items in the removeItems list
5. **Save to per-trip collection**:
   - Store at `users/{userId}/trips/{tripId}/packingList/{itemId}`

## Categories

Standard packing categories:

- `sleep` - Sleeping bags, pads, pillows
- `shelter` - Tents, tarps, stakes
- `kitchen` - Stove, cookware, utensils
- `clothing` - Layers, rain gear, shoes
- `safety` - First aid, flashlight, maps
- `tools` - Knife, multi-tool, repair kit
- `hygiene` - Soap, towel, toiletries
- `food` - Meals, snacks
- `water` - Bottles, filter, treatment
- `entertainment` - Books, games, music
- `other` - Everything else

## Camping Types

Supported camping styles (must match `CampingStyle` enum):

- `car_camping` - CAR_CAMPING
- `backpacking` - BACKPACKING
- `rv` - RV
- `hammock` - HAMMOCK
- `rooftop_tent` - ROOFTOP_TENT
- `overlanding` - OVERLANDING
- `boat_canoe` - BOAT_CANOE
- `bikepacking` - BIKEPACKING
- `winter` - WINTER
- `dispersed` - DISPERSED

## Weather Tags

Weather conditions for conditional packing:

- `cold` - Below 50°F (add warm layers, sleeping bag liner)
- `hot` - Above 80°F (add sun protection, cooling gear)
- `wet` - Rain/precipitation expected (add rain gear, waterproof bags)

Weather tags are determined automatically from the trip's 5-day forecast using `determineWeatherTags()` helper function.

## Service API

Located in `src/services/packingService.ts`:

### Functions

1. **`getPackingTemplates()`**
   - Loads all templates from Firestore
   - Returns: `Promise<TemplateDoc[]>`

2. **`generatePackingListForTrip(context)`**
   - Generates packing list for a trip
   - Parameters: `{ tripId, userId, campingType, weatherTags }`
   - Returns: `Promise<PackingListItem[]>`

3. **`getPackingListForTrip(userId, tripId)`**
   - Retrieves existing packing list
   - Returns: `Promise<PackingListItem[]>`

4. **`updatePackingListItem(userId, tripId, itemId, updates)`**
   - Updates single item (mark as packed, change quantity, etc.)
   - Returns: `Promise<void>`

5. **`addCustomPackingItem(userId, tripId, item)`**
   - Adds user-created custom item
   - Returns: `Promise<PackingListItem>`

6. **`determineWeatherTags(forecast)`**
   - Helper to determine weather tags from forecast
   - Parameters: `Array<{ high, low, precipitation }>`
   - Returns: `WeatherTag[]`

## Usage Example

```typescript
import {
  generatePackingListForTrip,
  getPackingListForTrip,
  updatePackingListItem,
  determineWeatherTags
} from "../services/packingService";

// 1. Determine weather tags from forecast
const weatherTags = determineWeatherTags([
  { high: 75, low: 45, precipitation: 10 },
  { high: 72, low: 48, precipitation: 80 },
  { high: 68, low: 42, precipitation: 60 }
]);
// Result: ["cold", "wet"]

// 2. Generate packing list for trip
const packingList = await generatePackingListForTrip({
  tripId: "trip123",
  userId: "user456",
  campingType: "BACKPACKING",
  weatherTags: ["cold", "wet"]
});

// 3. Retrieve existing packing list
const existingList = await getPackingListForTrip("user456", "trip123");

// 4. Mark item as packed
await updatePackingListItem("user456", "trip123", "flashlight", {
  isPacked: true
});

// 5. Update quantity
await updatePackingListItem("user456", "trip123", "water_bottle", {
  quantity: 3,
  notes: "One for each person"
});
```

## Firebase Security Rules

**IMPORTANT**: Before using this system in production, you must configure Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read for templates
    match /packingTemplates/{templateId} {
      allow read: if true;
      allow write: if false; // Admin only
    }

    // Per-user trip data
    match /users/{userId}/trips/{tripId}/packingList/{itemId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Next Steps

1. **Seed templates**: Create initial template documents in `packingTemplates` collection
2. **Wire up UI**: Connect packing tab to service functions
3. **Add auth**: Implement user authentication with Firebase Auth
4. **Configure security rules**: Set up Firestore rules for production
