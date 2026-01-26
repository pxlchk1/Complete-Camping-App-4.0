/**
 * Itinerary Links Service
 * Firestore operations for managing trip itinerary links
 * Uses top-level /trips/{tripId}/itineraryLinks collection
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import {
  ItineraryLink,
  CreateItineraryLinkData,
  UpdateItineraryLinkData,
  MOMENT_SORT_ORDER,
} from '../types/itinerary';
import { sniffProvider, normalizeUrl } from '../utils/providerSniffer';

/**
 * Get itinerary links collection reference for a trip
 * Uses top-level /trips/{tripId}/itineraryLinks path
 */
function getLinksCollection(tripId: string) {
  return collection(db, 'trips', tripId, 'itineraryLinks');
}

/**
 * Create a new itinerary link
 */
export async function createItineraryLink(
  tripId: string,
  data: CreateItineraryLinkData
): Promise<ItineraryLink> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be signed in to create an itinerary link');

  const normalizedUrl = normalizeUrl(data.url);
  if (!normalizedUrl) throw new Error('Invalid URL');

  const providerInfo = sniffProvider(normalizedUrl);
  const now = new Date().toISOString();

  const linkData = {
    tripId,
    url: normalizedUrl,
    title: data.title?.trim() || providerInfo.suggestedTitle,
    note: data.note?.trim() || null,
    dayIndex: data.dayIndex,
    moment: data.moment || null,
    provider: providerInfo.provider,
    providerLabel: providerInfo.label,
    createdBy: user.uid,
    createdAt: now,
    updatedAt: now,
    sortOrder: Date.now(),
  };

  const linksRef = getLinksCollection(tripId);
  const docRef = await addDoc(linksRef, linkData);

  return {
    id: docRef.id,
    ...linkData,
  } as ItineraryLink;
}

/**
 * Get all itinerary links for a trip
 */
export async function getItineraryLinks(tripId: string): Promise<ItineraryLink[]> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be signed in to get itinerary links');

  const linksRef = getLinksCollection(tripId);
  const q = query(linksRef, orderBy('dayIndex', 'asc'), orderBy('sortOrder', 'asc'));
  const snapshot = await getDocs(q);

  const links = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ItineraryLink[];

  // Sort by day, then by moment, then by sortOrder
  return links.sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    
    const aMomentOrder = a.moment ? MOMENT_SORT_ORDER[a.moment] : 99;
    const bMomentOrder = b.moment ? MOMENT_SORT_ORDER[b.moment] : 99;
    if (aMomentOrder !== bMomentOrder) return aMomentOrder - bMomentOrder;
    
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });
}

/**
 * Get a single itinerary link
 */
export async function getItineraryLink(
  tripId: string,
  linkId: string
): Promise<ItineraryLink | null> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be signed in to get an itinerary link');

  const linkRef = doc(db, 'trips', tripId, 'itineraryLinks', linkId);
  const linkDoc = await getDoc(linkRef);

  if (!linkDoc.exists()) return null;

  return {
    id: linkDoc.id,
    ...linkDoc.data(),
  } as ItineraryLink;
}

/**
 * Update an itinerary link
 */
export async function updateItineraryLink(
  tripId: string,
  linkId: string,
  data: UpdateItineraryLinkData
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be signed in to update an itinerary link');

  const linkRef = doc(db, 'trips', tripId, 'itineraryLinks', linkId);
  
  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.url !== undefined) {
    const normalizedUrl = normalizeUrl(data.url);
    if (!normalizedUrl) throw new Error('Invalid URL');
    
    const providerInfo = sniffProvider(normalizedUrl);
    updateData.url = normalizedUrl;
    updateData.provider = providerInfo.provider;
    updateData.providerLabel = providerInfo.label;
  }

  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.note !== undefined) updateData.note = data.note?.trim() || null;
  if (data.dayIndex !== undefined) updateData.dayIndex = data.dayIndex;
  if (data.moment !== undefined) updateData.moment = data.moment || null;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

  await updateDoc(linkRef, updateData);
}

/**
 * Delete an itinerary link
 */
export async function deleteItineraryLink(tripId: string, linkId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be signed in to delete an itinerary link');

  const linkRef = doc(db, 'trips', tripId, 'itineraryLinks', linkId);
  await deleteDoc(linkRef);
}

/**
 * Group links by day index
 */
export function groupLinksByDay(links: ItineraryLink[]): Map<number, ItineraryLink[]> {
  const grouped = new Map<number, ItineraryLink[]>();
  
  for (const link of links) {
    const existing = grouped.get(link.dayIndex) || [];
    existing.push(link);
    grouped.set(link.dayIndex, existing);
  }
  
  return grouped;
}
