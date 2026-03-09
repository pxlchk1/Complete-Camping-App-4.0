/**
 * StayInLoopModal (Notification Opt-In Modal)
 *
 * A single-purpose centered modal shown to eligible users after login
 * to request push notification permission.
 *
 * REQUIREMENTS (per QA spec):
 * - Single isolated modal card with dimmed background
 * - Strong primary CTA: "Turn On Notifications"
 * - Low-emphasis dismissal: "Not now"
 * - No SMS enrollment in this modal
 * - No settings-sheet behavior
 * - Must block underlying interaction
 * - Must be fully accessible
 *
 * Analytics events tracked:
 * - notification_modal_primary_tapped (when CTA tapped)
 * - notification_modal_dismissed (when "Not now" tapped)
 * - notification_modal_closed (when X button tapped)
 * - notification_permission_prompt_triggered (before OS prompt)
 * - notification_permission_granted (after user grants)
 * - notification_permission_denied (after user denies)
 */

import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  Linking,
  ActivityIndicator,
  AccessibilityInfo,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { auth } from "../config/firebase";
import { registerPushToken } from "../services/notificationService";
import {
  recordModalDismissed,
  recordModalCompleted,
  trackModalPrimaryTapped,
  trackModalDismissed,
  trackModalClosed,
  trackPermissionPromptTriggered,
  trackPermissionGranted,
  trackPermissionDenied,
  NotificationCohort,
} from "../services/notificationEligibilityService";
import {
  DEEP_FOREST,
  PARCHMENT,
  EARTH_GREEN,
  TEXT_PRIMARY_STRONG,
  TEXT_MUTED,
} from "../constants/colors";

interface StayInLoopModalProps {
  visible: boolean;
  onDismiss: () => void;
  cohort?: NotificationCohort | null;
}

const { width } = Dimensions.get("window");

export default function StayInLoopModal({
  visible,
  onDismiss,
  cohort,
}: StayInLoopModalProps) {
  const [loading, setLoading] = useState(false);
  const [pushDeniedByOS, setPushDeniedByOS] = useState(false);
  const [requestInProgress, setRequestInProgress] = useState(false);

  // Reset state when modal opens and announce for accessibility
  useEffect(() => {
    if (visible) {
      setLoading(false);
      setPushDeniedByOS(false);
      setRequestInProgress(false);
      checkIfPushBlocked();

      // Announce modal for screen readers
      AccessibilityInfo.announceForAccessibility(
        "Get trail alerts modal. Turn on notifications to receive weather updates and trip reminders."
      );
    }
  }, [visible]);

  /**
   * Check if push is already denied at OS level
   */
  const checkIfPushBlocked = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "denied") {
      setPushDeniedByOS(true);
    }
  };

  /**
   * Request push permission from iOS
   */
  const requestPushPermission = async (): Promise<"granted" | "denied" | "undetermined"> => {
    if (!Device.isDevice) {
      console.log("[StayInLoopModal] Not a physical device, returning undetermined");
      return "undetermined";
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === "granted") {
      return "granted";
    }

    if (existingStatus === "denied") {
      setPushDeniedByOS(true);
      return "denied";
    }

    // Track that we're about to show the OS permission prompt
    if (cohort) {
      trackPermissionPromptTriggered(cohort);
    }

    const { status } = await Notifications.requestPermissionsAsync();

    if (status === "denied") {
      setPushDeniedByOS(true);
      return "denied";
    }

    return status === "granted" ? "granted" : "undetermined";
  };

  /**
   * Handle "Turn On Notifications" button tap
   */
  const handleTurnOnNotifications = async () => {
    // Debounce: prevent multiple rapid taps
    if (loading || requestInProgress) return;

    const user = auth.currentUser;
    if (!user) {
      console.error("[StayInLoopModal] No user signed in when requesting push");
      onDismiss();
      return;
    }

    // Track primary CTA tap
    if (cohort) {
      trackModalPrimaryTapped(cohort);
    }

    setLoading(true);
    setRequestInProgress(true);

    try {
      const result = await requestPushPermission();

      if (result === "granted") {
        // Register push token with backend
        await registerPushToken(user.uid);

        // Track permission granted
        if (cohort) {
          trackPermissionGranted(cohort);
        }

        // Record completion with granted result
        await recordModalCompleted(user.uid, "granted");

        console.log("[StayInLoopModal] Push permission granted:", {
          userId: user.uid,
          cohort,
        });
      } else if (result === "denied") {
        // Track permission denied
        if (cohort) {
          trackPermissionDenied(cohort);
        }

        // Record as dismissal (not completion) so 14-day cadence applies
        await recordModalDismissed(user.uid);

        console.log("[StayInLoopModal] Push permission denied:", {
          userId: user.uid,
          cohort,
        });
      }

      // Close modal after operation completes
      onDismiss();
    } catch (error) {
      console.error("[StayInLoopModal] Error during notification setup:", error);
      // Still close on error - don't block app usage
      onDismiss();
    } finally {
      setLoading(false);
      setRequestInProgress(false);
    }
  };

  /**
   * Handle "Not now" link tap - dismiss without requesting permission
   */
  const handleNotNow = async () => {
    // Debounce
    if (loading || requestInProgress) return;

    const user = auth.currentUser;

    // Track dismissal
    trackModalDismissed(cohort ?? null);

    if (user) {
      try {
        await recordModalDismissed(user.uid);
        console.log("[StayInLoopModal] Modal dismissed with Not Now");
      } catch (error) {
        console.error("[StayInLoopModal] Error recording dismissal:", error);
      }
    }
    onDismiss();
  };

  /**
   * Handle close button tap - same behavior as Not now
   */
  const handleClose = async () => {
    // Debounce
    if (loading || requestInProgress) return;

    const user = auth.currentUser;

    // Track close (separate event for analytics granularity)
    trackModalClosed(cohort ?? null);

    if (user) {
      try {
        await recordModalDismissed(user.uid);
        console.log("[StayInLoopModal] Modal closed via X button");
      } catch (error) {
        console.error("[StayInLoopModal] Error recording close:", error);
      }
    }
    onDismiss();
  };

  /**
   * Open iOS Settings when notifications blocked
   */
  const openSettings = () => {
    Linking.openSettings();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleNotNow}
      accessibilityViewIsModal={true}
    >
      <View
        style={styles.overlay}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleNotNow}
          accessible={false}
        />
      </View>

      <View style={styles.centeredContainer} pointerEvents="box-none">
        <View
          style={styles.modalCard}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel="Notification permission request"
        >
          {/* Header with close button */}
          <View style={styles.header}>
            <View style={{ flex: 1 }} />
            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close modal"
              accessibilityRole="button"
              accessibilityHint="Dismisses the notification request without enabling notifications"
            >
              <Ionicons name="close" size={24} color={TEXT_MUTED} />
            </Pressable>
          </View>

          {/* Icon + Title centered */}
          <View style={styles.iconTitleContainer}>
            <View style={styles.bellIconContainer}>
              <Ionicons name="notifications" size={32} color={DEEP_FOREST} />
              <View style={styles.alertBadge}>
                <Ionicons name="warning" size={14} color="#B45309" />
              </View>
            </View>
            <Text
              style={styles.title}
              accessibilityRole="header"
            >
              Get trail alerts
            </Text>
          </View>

          {/* Body content */}
          <View style={styles.body}>
            <Text style={styles.bodyText}>
              Know about weather changes, trip reminders, and important trail updates at the right time.
            </Text>

            {/* Feature bullet points */}
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={EARTH_GREEN}
                  accessibilityElementsHidden={true}
                />
                <Text style={styles.bulletText}>Weather changes before you go</Text>
              </View>
              <View style={styles.bulletItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={EARTH_GREEN}
                  accessibilityElementsHidden={true}
                />
                <Text style={styles.bulletText}>Trip prep reminders</Text>
              </View>
              <View style={styles.bulletItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={EARTH_GREEN}
                  accessibilityElementsHidden={true}
                />
                <Text style={styles.bulletText}>Important trail and safety alerts</Text>
              </View>
            </View>

            {/* Warning if notifications blocked at OS level */}
            {pushDeniedByOS && (
              <Pressable
                style={styles.warningBox}
                onPress={openSettings}
                accessibilityLabel="Notifications are turned off in iOS Settings. Tap to open Settings."
                accessibilityRole="button"
              >
                <Ionicons name="warning-outline" size={18} color="#B45309" />
                <Text style={styles.warningText}>
                  Notifications are off in iOS Settings. Tap to open Settings.
                </Text>
              </Pressable>
            )}
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            {/* Primary CTA: Turn On Notifications */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleTurnOnNotifications}
              disabled={loading}
              accessibilityLabel="Turn On Notifications"
              accessibilityRole="button"
              accessibilityHint="Opens system notification permission dialog"
              accessibilityState={{ disabled: loading }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={PARCHMENT} />
              ) : (
                <Text style={styles.primaryButtonText}>Turn On Notifications</Text>
              )}
            </Pressable>

            {/* Tertiary: Not now */}
            <Pressable
              style={({ pressed }) => [
                styles.tertiaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleNotNow}
              disabled={loading}
              accessibilityLabel="Not now"
              accessibilityRole="button"
              accessibilityHint="Dismisses modal without enabling notifications"
              accessibilityState={{ disabled: loading }}
            >
              <Text style={styles.tertiaryButtonText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: width - 48,
    maxWidth: 380,
    borderRadius: 16,
    backgroundColor: PARCHMENT,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 0,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  iconTitleContainer: {
    alignItems: "center",
    paddingTop: 0,
    paddingBottom: 16,
  },
  bellIconContainer: {
    position: "relative",
    marginBottom: 12,
  },
  alertBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    padding: 2,
  },
  title: {
    fontSize: 22,
    fontFamily: "Raleway_700Bold",
    color: DEEP_FOREST,
    textAlign: "center",
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 8,
  },
  bodyText: {
    fontSize: 15,
    fontFamily: "SourceSans3_400Regular",
    lineHeight: 22,
    color: TEXT_PRIMARY_STRONG,
    marginBottom: 16,
    textAlign: "center",
  },
  bulletList: {
    marginBottom: 16,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  bulletText: {
    fontSize: 15,
    fontFamily: "SourceSans3_400Regular",
    color: TEXT_PRIMARY_STRONG,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "SourceSans3_400Regular",
    color: "#B45309",
  },
  buttonsContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: DEEP_FOREST,
    minHeight: 50,
  },
  primaryButtonText: {
    color: PARCHMENT,
    fontSize: 16,
    fontFamily: "SourceSans3_600SemiBold",
  },
  tertiaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  tertiaryButtonText: {
    color: TEXT_MUTED,
    fontSize: 15,
    fontFamily: "SourceSans3_500Medium",
    textDecorationLine: "underline",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
