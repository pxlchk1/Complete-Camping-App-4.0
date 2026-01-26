/**
 * Provider Sniffer Utility
 * Detects the provider type from a URL and provides icon/label info
 */

import { ItineraryLinkProvider } from '../types/itinerary';

export interface ProviderInfo {
  provider: ItineraryLinkProvider;
  label: string;
  icon: string; // Ionicons name
  suggestedTitle: string;
}

interface ProviderPattern {
  pattern: RegExp;
  provider: ItineraryLinkProvider;
  label: string;
  icon: string;
  suggestedTitle: string;
}

const PROVIDER_PATTERNS: ProviderPattern[] = [
  {
    pattern: /alltrails\.com/i,
    provider: 'alltrails',
    label: 'AllTrails',
    icon: 'trail-sign-outline',
    suggestedTitle: 'AllTrails route',
  },
  {
    pattern: /onxmaps\.com|onxhunt\.com|onxoffroad\.com|onxbackcountry\.com/i,
    provider: 'onx',
    label: 'onX',
    icon: 'map-outline',
    suggestedTitle: 'onX map',
  },
  {
    pattern: /google\.com\/maps|maps\.google\.com|goo\.gl\/maps/i,
    provider: 'google_maps',
    label: 'Google Maps',
    icon: 'location-outline',
    suggestedTitle: 'Google Maps link',
  },
  {
    pattern: /maps\.apple\.com/i,
    provider: 'apple_maps',
    label: 'Apple Maps',
    icon: 'navigate-outline',
    suggestedTitle: 'Apple Maps link',
  },
  {
    pattern: /recreation\.gov/i,
    provider: 'recreation_gov',
    label: 'Recreation.gov',
    icon: 'ticket-outline',
    suggestedTitle: 'Reservation / Permit',
  },
  {
    pattern: /hipcamp\.com/i,
    provider: 'hipcamp',
    label: 'Hipcamp',
    icon: 'bonfire-outline',
    suggestedTitle: 'Hipcamp site',
  },
  {
    pattern: /gaiagps\.com/i,
    provider: 'gaia',
    label: 'Gaia GPS',
    icon: 'compass-outline',
    suggestedTitle: 'Gaia GPS route',
  },
  {
    pattern: /caltopo\.com/i,
    provider: 'caltopo',
    label: 'CalTopo',
    icon: 'analytics-outline',
    suggestedTitle: 'CalTopo map',
  },
  {
    pattern: /fatmap\.com/i,
    provider: 'fatmap',
    label: 'FATMAP',
    icon: 'globe-outline',
    suggestedTitle: 'FATMAP route',
  },
  {
    pattern: /trailforks\.com/i,
    provider: 'trailforks',
    label: 'Trailforks',
    icon: 'bicycle-outline',
    suggestedTitle: 'Trailforks trail',
  },
  {
    pattern: /komoot\.com/i,
    provider: 'komoot',
    label: 'Komoot',
    icon: 'footsteps-outline',
    suggestedTitle: 'Komoot route',
  },
  {
    pattern: /strava\.com/i,
    provider: 'strava',
    label: 'Strava',
    icon: 'fitness-outline',
    suggestedTitle: 'Strava activity',
  },
];

/**
 * Detect provider from URL
 */
export function sniffProvider(url: string): ProviderInfo {
  const normalizedUrl = url.toLowerCase().trim();
  
  for (const pattern of PROVIDER_PATTERNS) {
    if (pattern.pattern.test(normalizedUrl)) {
      return {
        provider: pattern.provider,
        label: pattern.label,
        icon: pattern.icon,
        suggestedTitle: pattern.suggestedTitle,
      };
    }
  }
  
  // Extract domain for fallback title
  let domain = 'Link';
  try {
    const urlObj = new URL(normalizedUrl.startsWith('http') ? normalizedUrl : `https://${normalizedUrl}`);
    domain = urlObj.hostname.replace(/^www\./, '');
  } catch {
    // Keep default
  }
  
  return {
    provider: 'other',
    label: domain,
    icon: 'link-outline',
    suggestedTitle: domain,
  };
}

/**
 * Get icon name for a provider
 */
export function getProviderIcon(provider: ItineraryLinkProvider): string {
  const pattern = PROVIDER_PATTERNS.find(p => p.provider === provider);
  return pattern?.icon || 'link-outline';
}

/**
 * Get display label for a provider
 */
export function getProviderLabel(provider: ItineraryLinkProvider): string {
  const pattern = PROVIDER_PATTERNS.find(p => p.provider === provider);
  return pattern?.label || 'Link';
}

/**
 * Validate and normalize URL
 */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  
  let url = trimmed;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith('http')) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(input: string): boolean {
  return normalizeUrl(input) !== null;
}
