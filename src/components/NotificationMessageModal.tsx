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
  DEEP_FOREST,
  DEEP_FOREST_PRESSED,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  BORDER_SOFT,
} from "../constants/colors";

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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Props {
  onNavigate: (screen: string, params?: Record<string, any>) => void;
  resolveDeepLink: (deepLink: string) => { screen: string; params?: Record<string, any> } | null;
}

export default function NotificationMessageModal({ onNavigate, resolveDeepLink }: Props) {
  const pending = useNotificationMessageStore((s) => s.pending);
  const clear = useNotificationMessageStore((s) => s.clear);

  if (!pending) return null;

  const ctaLabel = pending.ctaLabel || ctaLabelFromDeepLink(pending.deepLink);

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
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
        onPress={handleDismiss}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: Math.min(SCREEN_WIDTH - 48, 380),
            backgroundColor: PARCHMENT,
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          {/* Header bar */}
          <View
            style={{
              backgroundColor: DEEP_FOREST,
              paddingVertical: 14,
              paddingHorizontal: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Ionicons name="notifications" size={20} color="#FFFFFF" />
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: "600",
                letterSpacing: 0.5,
                textTransform: "uppercase",
                flex: 1,
              }}
            >
              New Message
            </Text>
            <Pressable
              onPress={handleDismiss}
              hitSlop={12}
              style={{ padding: 2 }}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView
            style={{ maxHeight: 300, paddingHorizontal: 20, paddingTop: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: TEXT_PRIMARY_STRONG,
                marginBottom: 12,
                lineHeight: 26,
              }}
            >
              {pending.title}
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: TEXT_SECONDARY,
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              {pending.body}
            </Text>
          </ScrollView>

          {/* CTA + Dismiss */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingBottom: 20,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: BORDER_SOFT,
              gap: 10,
            }}
          >
            {pending.deepLink.length > 0 && (
              <Pressable
                onPress={handleCTA}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? DEEP_FOREST_PRESSED : DEEP_FOREST,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                })}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {ctaLabel}
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleDismiss}
              style={{
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: TEXT_SECONDARY,
                  fontSize: 14,
                  fontWeight: "500",
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
