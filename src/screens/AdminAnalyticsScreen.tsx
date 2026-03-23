/**
 * Admin Analytics Screen
 * Read-only metrics derived from existing Firestore data.
 *
 * SECTION 1 — User metrics
 *   - Total users:        count of all docs in `users` collection
 *   - New users today:    docs where `createdAt >= startOfToday`
 *   - Pro users:          docs where `membershipTier == "subscribed"`
 *   - Returning users:    users whose `lastLoginAt` (or `onboarding.lastActiveAt`)
 *                         is > 24 h after `createdAt` — computed client-side because
 *                         Firestore cannot compare two fields in a single query.
 *
 * SECTION 2 — Paywall / gate metrics
 *   Uses existing `fetchAllGateAnalytics` + `calculateAnalyticsSummary` helpers
 *   from gateAnalyticsService (reads the `gateAnalytics` Firestore collection).
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { db } from "../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import {
  fetchAllGateAnalytics,
  calculateAnalyticsSummary,
  GateAnalytics,
  GateAnalyticsSummary,
} from "../services/gateAnalyticsService";
import ModalHeader from "../components/ModalHeader";
import {
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  EARTH_GREEN,
  DEEP_FOREST,
} from "../constants/colors";

// ============================================
// TYPES
// ============================================

interface UserMetrics {
  totalUsers: number;
  newUsersToday: number;
  proUsers: number;
  returningUsers: number;
}

// ============================================
// HELPERS
// ============================================

/** Firestore Timestamp for midnight today (local time). */
function getStartOfToday(): Timestamp {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Timestamp.fromDate(start);
}

/**
 * Convert any Firestore-ish timestamp to epoch ms.
 * Handles Firestore Timestamp objects, Date objects, and ISO strings.
 * Returns 0 when the value is missing or unrecognisable.
 */
function toEpochMs(value: any): number {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? 0 : ms;
  }
  return 0;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Format a gate key for admin display.
 * "home_trip_plans_quick_action" → "Home Trip Plans Quick Action"
 */
function formatGateKey(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ============================================
// COMPONENT
// ============================================

export default function AdminAnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userMetrics, setUserMetrics] = useState<UserMetrics>({
    totalUsers: 0,
    newUsersToday: 0,
    proUsers: 0,
    returningUsers: 0,
  });
  const [gateSummary, setGateSummary] = useState<GateAnalyticsSummary | null>(null);
  const [gateList, setGateList] = useState<GateAnalytics[]>([]);

  // -------------------------------------------
  // Data loading
  // -------------------------------------------

  const loadData = useCallback(async () => {
    try {
      const usersRef = collection(db, "users");

      // --- parallel fetches ---
      const [allUsersSnap, newTodaySnap, proSnap, gateData] = await Promise.all([
        getDocs(usersRef),
        getDocs(query(usersRef, where("createdAt", ">=", getStartOfToday()))),
        getDocs(query(usersRef, where("membershipTier", "==", "subscribed"))),
        fetchAllGateAnalytics(),
      ]);

      // Returning-user proxy (client-side)
      // Rule: user counts as "returning" when the later of
      //   lastLoginAt / onboarding.lastActiveAt
      // is > 24 hours after createdAt.
      let returningCount = 0;
      allUsersSnap.docs.forEach((docSnap) => {
        const d = docSnap.data();
        const created = toEpochMs(d.createdAt);
        if (!created) return;

        const lastLogin = toEpochMs(d.lastLoginAt);
        const lastActive = toEpochMs(d.onboarding?.lastActiveAt);
        const latestReturn = Math.max(lastLogin, lastActive);
        if (latestReturn - created > TWENTY_FOUR_HOURS_MS) {
          returningCount++;
        }
      });

      setUserMetrics({
        totalUsers: allUsersSnap.size,
        newUsersToday: newTodaySnap.size,
        proUsers: proSnap.size,
        returningUsers: returningCount,
      });

      setGateList(gateData);
      setGateSummary(calculateAnalyticsSummary(gateData));
    } catch (error) {
      console.error("[AdminAnalytics] Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // -------------------------------------------
  // Render helpers
  // -------------------------------------------

  const StatCard = ({
    value,
    label,
    color,
  }: {
    value: number | string;
    label: string;
    color?: string;
  }) => (
    <View className="w-1/2 p-2">
      <View className="p-4 rounded-xl" style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}>
        <Text
          className="text-3xl mb-1"
          style={{
            fontFamily: "SourceSans3_700Bold",
            color: color || TEXT_PRIMARY_STRONG,
          }}
        >
          {value}
        </Text>
        <Text
          className="text-sm"
          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
        >
          {label}
        </Text>
      </View>
    </View>
  );

  // -------------------------------------------
  // Main render
  // -------------------------------------------

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader title="Analytics" showTitle />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={EARTH_GREEN} />
        }
      >
        <View className="px-5 pt-5 pb-8">
          {loading ? (
            <View className="py-16 items-center">
              <ActivityIndicator size="large" color={EARTH_GREEN} />
              <Text
                className="mt-3"
                style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
              >
                Loading analytics...
              </Text>
            </View>
          ) : (
            <>
              {/* ========== SECTION 1: USER METRICS ========== */}
              <Text
                className="text-lg mb-3"
                style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
              >
                User Metrics
              </Text>

              <View className="flex-row flex-wrap mb-6">
                <StatCard value={userMetrics.totalUsers} label="Total Users" />
                <StatCard
                  value={userMetrics.newUsersToday}
                  label="New Today"
                  color={EARTH_GREEN}
                />
                <StatCard
                  value={userMetrics.proUsers}
                  label="Pro Users"
                  color="#9C27B0"
                />
                <StatCard
                  value={userMetrics.returningUsers}
                  label="Returning Users"
                  color={DEEP_FOREST}
                />
              </View>

              {/* ========== SECTION 2: PAYWALL / GATE METRICS ========== */}
              <Text
                className="text-lg mb-3"
                style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
              >
                Paywall &amp; Gate Metrics
              </Text>

              {gateSummary ? (
                <>
                  <View className="flex-row flex-wrap mb-4">
                    <StatCard value={gateSummary.totalImpressions} label="Impressions" />
                    <StatCard
                      value={gateSummary.totalConversions}
                      label="Conversions"
                      color={EARTH_GREEN}
                    />
                    <StatCard
                      value={`${gateSummary.conversionRate.toFixed(1)}%`}
                      label="Conversion Rate"
                      color={DEEP_FOREST}
                    />
                    <StatCard value={gateList.length} label="Active Gates" />
                  </View>

                  {/* Per-gate breakdown */}
                  {gateList.length > 0 && (
                    <>
                      <Text
                        className="text-base mb-2"
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          color: TEXT_PRIMARY_STRONG,
                        }}
                      >
                        Per-Gate Breakdown
                      </Text>

                      {gateList.map((gate) => {
                        const rate =
                          gate.impressions > 0
                            ? ((gate.conversions / gate.impressions) * 100).toFixed(1)
                            : "0.0";
                        return (
                          <View
                            key={gate.gateKey}
                            className="mb-2 p-3 rounded-xl border"
                            style={{
                              backgroundColor: CARD_BACKGROUND_LIGHT,
                              borderColor: BORDER_SOFT,
                            }}
                          >
                            <Text
                              className="text-sm mb-1"
                              style={{
                                fontFamily: "SourceSans3_600SemiBold",
                                color: TEXT_PRIMARY_STRONG,
                              }}
                              numberOfLines={1}
                            >
                              {formatGateKey(gate.gateKey)}
                            </Text>
                            <Text
                              style={{
                                fontFamily: "SourceSans3_400Regular",
                                fontSize: 12,
                                color: TEXT_SECONDARY,
                              }}
                            >
                              {gate.impressions} impressions · {gate.conversions} conversions · {rate}% rate
                            </Text>
                          </View>
                        );
                      })}
                    </>
                  )}
                </>
              ) : (
                <Text
                  className="mb-4"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}
                >
                  No gate analytics data yet.
                </Text>
              )}

              {/* ========== SECTION 3: KNOWN LIMITATION ========== */}
              <View
                className="mt-4 p-3 rounded-xl border"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 12,
                    color: TEXT_MUTED,
                  }}
                >
                  Screen-level drop-off analytics are not tracked yet.
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
