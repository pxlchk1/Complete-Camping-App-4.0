/**
 * NotificationMessageModal
 *
 * Displays the full content of a push notification when tapped.
 * Shows a dismissible card with the notification title, body,
 * and a CTA button that navigates to the deep-linked screen.
 *
 * Uses a lightweight Zustand store (notificationMessageStore)
 * to receive pending notifications from the useNotifications hook.
 */

import React from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { create } from "zustand";
import {
  PARCHMENT,
  PARCHMENT_SOFT,
  DEEP_FOREST,
  DEEP_FOREST_PRESSED,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  EARTH_GREEN,
  GRANITE_GOLD,
} from "../constants/colors";
import { fonts, shadows, radius } from "../theme/theme";

// ─────────────────────────────────────────────
// Zustand store for pending notification
// ─────────────────────────────────────────────

export interface PendingNotification {
  title: string;
  body: string;
  deepLink: string;
  ctaLabel?: string;
}

interface NotificationMessageState {
  pending: PendingNotification | null;
  setPending: (notification: PendingNotification | null) => void;
  clear: () => void;
}

export const useNotificationMessageStore = create<NotificationMessageState>((set) => ({
  pending: null,
  setPending: (notification) => set({ pending: notification }),
  clear: () => set({ pending: null }),
}));

// ─────────────────────────────────────────────
// Derive a user-friendly CTA label from a deep link
// ─────────────────────────────────────────────

const DEEP_LINK_LABELS: Record<string, string> = {
  trips: "Open Trips",
  plan: "Open Trips",
  home: "Go to Home",
  learn: "Start Learning",
  connect: "Open Community",
  firstaid: "Open First Aid",
  paywall: "View Plans",
  settings: "Open Settings",
  account: "Open Account",
  notifications: "View Notifications",
  mycampsite: "Open My Campsite",
  mygearcloset: "Open Gear Closet",
  meritbadges: "View Merit Badges",
};

function ctaLabelFromDeepLink(deepLink: string): string {
  const stripped = deepLink
    .replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
  return DEEP_LINK_LABELS[stripped] || "Open in App";
}

// ─────────────────────────────────────────────
// Modal component
// ─────────────────────────────────────────────

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Props {
  onNavigate: (screen: string, params?: Record<string, any>) => void;
  resolveDeepLink: (deepLink: string) => { screen: string; params?: Record<string, any> } | null;
}

export default function NotificationMessageModal({ onNavigate, resolveDeepLink }: Props) {
  const pending = useNotificationMessageStore((s) => s.pending);
  const clear = useNotificationMessageStore((s) => s.clear);

  if (!pending) return null;

  const ctaLabel = pending.ctaLabel || ctaLabelFromDeepLink(pending.deepLink);
  const hasCTA = pending.deepLink && pending.deepLink.length > 0;

  const handleCTA = () => {
    const deepLink = pending.deepLink;
    clear();
    if (deepLink && deepLink.length > 0) {
      try {
        const resolved = resolveDeepLink(deepLink);
        if (resolved) {
          onNavigate(resolved.screen, resolved.params);
        }
      } catch {
        // Navigation failed — modal is already dismissed
      }
    }
  };

  const handleDismiss = () => {
    clear();
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(26, 47, 28, 0.82)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
        }}
        onPress={handleDismiss}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: Math.min(SCREEN_WIDTH * 0.88, 400),
            maxHeight: SCREEN_HEIGHT * 0.72,
            backgroundColor: PARCHMENT,
            borderRadius: 24,
            overflow: "hidden",
            ...shadows.modal,
          }}
        >
          {/* ── Header row ── */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingTop: 24,
              paddingBottom: 4,
              paddingHorizontal: 24,
            }}
          >
            {/* Icon badge */}
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: PARCHMENT_SOFT,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 10,
              }}
            >
              <Ionicons name="bonfire-outline" size={20} color={GRANITE_GOLD} />
            </View>

            {/* Eyebrow label */}
            <Text
              style={{
                fontFamily: fonts.bodySemi,
                fontSize: 13,
                color: EARTH_GREEN,
                letterSpacing: 0.3,
                flex: 1,
              }}
            >
              Camper tip
            </Text>

            {/* Close */}
            <Pressable
              onPress={handleDismiss}
              hitSlop={14}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: PARCHMENT_SOFT,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="close" size={16} color={EARTH_GREEN} />
            </Pressable>
          </View>

          {/* ── Content ── */}
          <ScrollView
            style={{
              paddingHorizontal: 24,
              paddingTop: 16,
              flexShrink: 1,
            }}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                fontFamily: "Raleway_700Bold",
                fontSize: 21,
                color: TEXT_PRIMARY_STRONG,
                marginBottom: 10,
                lineHeight: 27,
              }}
            >
              {pending.title}
            </Text>
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 15,
                color: TEXT_SECONDARY,
                lineHeight: 23,
              }}
            >
              {pending.body}
            </Text>
          </ScrollView>

          {/* ── Action area ── */}
          <View
            style={{
              paddingHorizontal: 24,
              paddingBottom: 24,
              paddingTop: 16,
            }}
          >
            {hasCTA && (
              <Pressable
                onPress={handleCTA}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? DEEP_FOREST_PRESSED : DEEP_FOREST,
                  paddingVertical: 15,
                  borderRadius: radius.pill,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                })}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: fonts.bodySemi,
                    color: PARCHMENT,
                    fontSize: 16,
                  }}
                >
                  {ctaLabel}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={PARCHMENT}
                  style={{ marginLeft: 6, opacity: 0.8 }}
                />
              </Pressable>
            )}
            <Pressable
              onPress={handleDismiss}
              style={{
                paddingVertical: 12,
                alignItems: "center",
                marginTop: hasCTA ? 4 : 0,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  color: EARTH_GREEN,
                  fontSize: 14,
                }}
              >
                Dismiss
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
