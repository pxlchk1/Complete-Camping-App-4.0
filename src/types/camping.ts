// Core types for camping app

export type CampingStyle =
  | "CAR_CAMPING"
  | "BACKPACKING"
  | "RV"
  | "HAMMOCK"
  | "ROOFTOP_TENT"
  | "OVERLANDING"
  | "BOAT_CANOE"
  | "BIKEPACKING"
  | "WINTER"
  | "DISPERSED";

export type CampingStyleValue = "CAR_CAMPING" | "BACKPACKING" | "RV" | "HAMMOCK" | "ROOFTOP_TENT" | "OVERLANDING" | "BOAT_CANOE" | "BIKEPACKING" | "WINTER" | "DISPERSED";

export type TripStatus = "planning" | "upcoming" | "active" | "completed" | "cancelled";

export type ParkType =
  | "national_park"
  | "state_park"
  | "national_forest"
  | "blm_land"
  | "private";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * TripDestination - Structured destination object for trips
 * Used by Weather and other location-aware features
 * 
 * sourceType: "parks" = from Parks database, "custom" = user-added campground
 */
export interface TripDestination {
  sourceType: "parks" | "custom";
  placeId: string | null;          // Parks database ID or custom place ID
  name: string;                    // Display name
  addressLine1: string | null;     // Street address
  city: string | null;
  state: string | null;
  lat: number | null;              // Latitude for Weather
  lng: number | null;              // Longitude for Weather
  formattedAddress: string | null; // Full formatted address for display
  parkType: "State Park" | "National Park" | "National Forest" | "Other" | null;
  url?: string | null;             // Reservation URL for "Reserve a Site" button
  updatedAt?: string;              // ISO timestamp when destination was set
}

/**
 * @deprecated Use TripDestination instead. Kept for legacy data migration.
 */
export interface Destination {
  id: string;
  name: string;
  coordinates?: Coordinates;
  address?: string;
  city?: string;
  state?: string;
}

export interface WeatherDestination {
  source: "manual" | "park" | "trip";
  label: string;
  lat: number;
  lon: number;
  placeId?: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  name: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  
  // New structured destination (preferred - for Weather and location features)
  tripDestination?: TripDestination;
  
  /** @deprecated Use tripDestination instead. Kept for legacy data migration. */
  destination?: Destination;
  
  campingStyle?: CampingStyle;
  partySize?: number;
  notes?: string;
  description?: string;
  status?: TripStatus;
  createdBy?: string;
  userId: string; // User ID for Firebase scoping (required)
  parkId?: string; // Reference to selected park
  
  /** Member user IDs who can view this trip (for sharing via My Campground) */
  memberIds?: string[];
  
  /** @deprecated Use tripDestination.name instead */
  locationName?: string; // Custom location name
  /** @deprecated Use tripDestination.sourceType instead */
  locationType?: "park" | "custom";
  /** @deprecated Use tripDestination.lat/lng instead */
  coordinates?: Coordinates;
  
  createdAt: string;
  updatedAt: string;
  parks?: string[];
  customCampgrounds?: any[];
  packing?: {
    categories: GearCategory[];
    itemsChecked: number;
    totalItems: number;
  };
  meals?: any[];
  weather?: {
    forecast: WeatherForecast[];
    lastUpdated: string;
  };
  weatherDestination?: WeatherDestination;
  
  /** User-selected packing season override. Takes priority over auto-detection. */
  packingSeasonOverride?: "winter" | "spring" | "summer" | "fall";
  
  /** Explicit flag for winter camping (alternative to campingStyle === "winter") */
  winterCamping?: boolean;
  
  /** Tags for trip categorization */
  tags?: string[];
  
  /** Trip type for meal planning context */
  tripType?: string;
  
  /** Number of campers for meal planning */
  numCampers?: number;
  
  /** Free-form notes for trip details section */
  detailsNotes?: string;
  
  /** Links added to trip details (external resources like AllTrails, OnX, etc.) */
  detailsLinks?: Array<{
    id: string;
    title: string;
    url: string;
    source: string;
  }>;
  
  /** Season for trip planning context */
  season?: "spring" | "summer" | "fall" | "winter";
}

export interface Park {
  id: string;
  name: string;
  filter: "national_park" | "state_park" | "national_forest";
  address: string;
  state: string;
  latitude: number;
  longitude: number;
  url: string;
}

export interface GearCategory {
  id: string;
  name: string;
  items: GearItem[];
}

export interface GearItem {
  id: string;
  name: string;
  packed: boolean;
  quantity?: number;
  notes?: string;
}

export interface PackingList {
  id: string;
  tripId?: string;
  name: string;
  categories: GearCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface WeatherForecast {
  date: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
  precipitation?: number;
}

// Packing list item for Firebase
export interface PackingItem {
  id: string;
  category: string;
  label: string;
  quantity: number;
  isPacked: boolean;
  isAutoGenerated: boolean;
  notes?: string;
}

// Meal for Firebase
export interface Meal {
  id: string;
  name: string;
  category: "breakfast" | "lunch" | "dinner" | "snack";
  dayIndex: number; // 1-based day of trip
  sourceType: "library" | "custom";
  libraryId?: string;
  prepType: "cold" | "campStove" | "campfire" | "noCook";
  ingredients?: string[];
  instructions?: string;
  notes?: string;
}

// Meal library item (global shared meals)
export interface MealLibraryItem {
  id: string;
  name: string;
  category: "breakfast" | "lunch" | "dinner" | "snack";
  prepType: "cold" | "campStove" | "campfire" | "noCook";
  difficulty: "easy" | "moderate";
  suitableFor?: CampingStyle[];
  ingredients: string[];
  instructions: string;
  tags?: string[];
}

// Camp template (for auto-generating packing lists and meal suggestions)
export interface CampTemplate {
  id: string;
  campStyle: CampingStyle;
  name: string;
  baseItems: Omit<PackingItem, "id" | "isPacked">[];
  seasonalModifiers?: {
    cold?: Omit<PackingItem, "id" | "isPacked">[];
    rainy?: Omit<PackingItem, "id" | "isPacked">[];
    hot?: Omit<PackingItem, "id" | "isPacked">[];
  };
}
