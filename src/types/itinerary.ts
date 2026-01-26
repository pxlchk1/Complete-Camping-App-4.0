/**
 * Itinerary Links Types
 * For managing trail maps, routes, permits, and plans organized by trip day
 */

export type ItineraryLinkProvider = 
  | 'alltrails'
  | 'onx'
  | 'google_maps'
  | 'apple_maps'
  | 'recreation_gov'
  | 'hipcamp'
  | 'gaia'
  | 'caltopo'
  | 'fatmap'
  | 'trailforks'
  | 'komoot'
  | 'strava'
  | 'other';

export type ItineraryMoment = 
  | 'morning'
  | 'midday'
  | 'after_lunch'
  | 'evening'
  | 'anytime';

export interface ItineraryLink {
  id: string;
  tripId: string;
  url: string;
  title: string;
  note?: string;
  dayIndex: number; // 1-based day of trip (Day 1, Day 2, etc.)
  moment?: ItineraryMoment;
  provider: ItineraryLinkProvider;
  providerLabel: string;
  createdAt: string;
  updatedAt: string;
  sortOrder?: number;
}

export interface CreateItineraryLinkData {
  url: string;
  title?: string;
  note?: string;
  dayIndex: number;
  moment?: ItineraryMoment;
}

export interface UpdateItineraryLinkData {
  url?: string;
  title?: string;
  note?: string;
  dayIndex?: number;
  moment?: ItineraryMoment;
  sortOrder?: number;
}

export const MOMENT_OPTIONS: { value: ItineraryMoment; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'midday', label: 'Midday' },
  { value: 'after_lunch', label: 'After lunch' },
  { value: 'evening', label: 'Evening' },
  { value: 'anytime', label: 'Anytime' },
];

export const MOMENT_SORT_ORDER: Record<ItineraryMoment, number> = {
  morning: 1,
  midday: 2,
  after_lunch: 3,
  evening: 4,
  anytime: 5,
};
