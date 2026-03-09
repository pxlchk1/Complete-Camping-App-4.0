/**
 * Gate Analytics Service
 * 
 * Tracks gate impressions (times shown) and conversions (upgrades after seeing gate)
 * Used for admin reporting to understand paywall effectiveness.
 * 
 * Firestore Collection: gateAnalytics
 * Document ID: gateKey (e.g., "home_trip_plans_quick_action")
 * 
 * Schema:
 * - gateKey: string
 * - impressions: number (total times this gate was shown)
 * - conversions: number (times user upgraded after seeing this gate)
 * - lastImpression: timestamp
 * - lastConversion: timestamp
 * - dailyImpressions: { [date]: number } (last 30 days)
 * - dailyConversions: { [date]: number } (last 30 days)
 */

import { db } from "../config/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

export interface GateAnalytics {
  gateKey: string;
  impressions: number;
  conversions: number;
  lastImpression: Date | null;
  lastConversion: Date | null;
  dailyImpressions: Record<string, number>;
  dailyConversions: Record<string, number>;
}

export interface GateAnalyticsSummary {
  totalImpressions: number;
  totalConversions: number;
  conversionRate: number;
  topGatesByImpressions: { gateKey: string; impressions: number }[];
  topGatesByConversions: { gateKey: string; conversions: number; rate: number }[];
}

const COLLECTION_NAME = "gateAnalytics";

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Track a gate impression (when gate blocks a user and shows modal)
 */
export async function trackGateImpression(gateKey: string): Promise<void> {
  if (!gateKey) return;
  
  try {
    const docRef = doc(db, COLLECTION_NAME, gateKey);
    const todayKey = getTodayKey();
    
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      // Update existing document
      await updateDoc(docRef, {
        impressions: increment(1),
        lastImpression: serverTimestamp(),
        [`dailyImpressions.${todayKey}`]: increment(1),
      });
    } else {
      // Create new document
      await setDoc(docRef, {
        gateKey,
        impressions: 1,
        conversions: 0,
        lastImpression: serverTimestamp(),
        lastConversion: null,
        dailyImpressions: { [todayKey]: 1 },
        dailyConversions: {},
      });
    }
    
    console.log("[GateAnalytics] Tracked impression:", gateKey);
  } catch (error) {
    console.error("[GateAnalytics] Error tracking impression:", error);
  }
}

/**
 * Track a conversion (when user upgrades after seeing a gate)
 * Called when subscription is purchased with a source gate key
 */
export async function trackGateConversion(gateKey: string): Promise<void> {
  if (!gateKey) return;
  
  try {
    const docRef = doc(db, COLLECTION_NAME, gateKey);
    const todayKey = getTodayKey();
    
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      await updateDoc(docRef, {
        conversions: increment(1),
        lastConversion: serverTimestamp(),
        [`dailyConversions.${todayKey}`]: increment(1),
      });
    } else {
      // Edge case: conversion without impression record
      await setDoc(docRef, {
        gateKey,
        impressions: 0,
        conversions: 1,
        lastImpression: null,
        lastConversion: serverTimestamp(),
        dailyImpressions: {},
        dailyConversions: { [todayKey]: 1 },
      });
    }
    
    console.log("[GateAnalytics] Tracked conversion:", gateKey);
  } catch (error) {
    console.error("[GateAnalytics] Error tracking conversion:", error);
  }
}

/**
 * Fetch all gate analytics
 */
export async function fetchAllGateAnalytics(): Promise<GateAnalytics[]> {
  try {
    const analyticsRef = collection(db, COLLECTION_NAME);
    const q = query(analyticsRef, orderBy("impressions", "desc"), limit(100));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        gateKey: data.gateKey || doc.id,
        impressions: data.impressions || 0,
        conversions: data.conversions || 0,
        lastImpression: data.lastImpression?.toDate() || null,
        lastConversion: data.lastConversion?.toDate() || null,
        dailyImpressions: data.dailyImpressions || {},
        dailyConversions: data.dailyConversions || {},
      } as GateAnalytics;
    });
  } catch (error) {
    console.error("[GateAnalytics] Error fetching analytics:", error);
    return [];
  }
}

/**
 * Get analytics for a specific gate
 */
export async function getGateAnalytics(gateKey: string): Promise<GateAnalytics | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, gateKey);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    return {
      gateKey: data.gateKey || gateKey,
      impressions: data.impressions || 0,
      conversions: data.conversions || 0,
      lastImpression: data.lastImpression?.toDate() || null,
      lastConversion: data.lastConversion?.toDate() || null,
      dailyImpressions: data.dailyImpressions || {},
      dailyConversions: data.dailyConversions || {},
    };
  } catch (error) {
    console.error("[GateAnalytics] Error getting gate analytics:", error);
    return null;
  }
}

/**
 * Calculate analytics summary
 */
export function calculateAnalyticsSummary(analytics: GateAnalytics[]): GateAnalyticsSummary {
  const totalImpressions = analytics.reduce((sum, g) => sum + g.impressions, 0);
  const totalConversions = analytics.reduce((sum, g) => sum + g.conversions, 0);
  const conversionRate = totalImpressions > 0 ? (totalConversions / totalImpressions) * 100 : 0;
  
  // Top gates by impressions
  const topGatesByImpressions = [...analytics]
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map((g) => ({ gateKey: g.gateKey, impressions: g.impressions }));
  
  // Top gates by conversions (with conversion rate)
  const topGatesByConversions = [...analytics]
    .filter((g) => g.impressions > 0)
    .map((g) => ({
      gateKey: g.gateKey,
      conversions: g.conversions,
      rate: g.impressions > 0 ? (g.conversions / g.impressions) * 100 : 0,
    }))
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, 10);
  
  return {
    totalImpressions,
    totalConversions,
    conversionRate,
    topGatesByImpressions,
    topGatesByConversions,
  };
}

/**
 * Get last N days of daily data summed
 */
export function getRecentDailyData(
  analytics: GateAnalytics[],
  days: number = 7
): { date: string; impressions: number; conversions: number }[] {
  const result: Record<string, { impressions: number; conversions: number }> = {};
  
  // Generate date keys for last N days
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split("T")[0]);
  }
  
  // Initialize with zeros
  dates.forEach((date) => {
    result[date] = { impressions: 0, conversions: 0 };
  });
  
  // Sum up data from all gates
  analytics.forEach((gate) => {
    dates.forEach((date) => {
      if (gate.dailyImpressions[date]) {
        result[date].impressions += gate.dailyImpressions[date];
      }
      if (gate.dailyConversions[date]) {
        result[date].conversions += gate.dailyConversions[date];
      }
    });
  });
  
  return dates.map((date) => ({
    date,
    impressions: result[date].impressions,
    conversions: result[date].conversions,
  }));
}
