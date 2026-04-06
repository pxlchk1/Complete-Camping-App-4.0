/**
 * SetupFlowScreen
 *
 * A guided, multi-step setup flow presented as a native formSheet modal
 * for users who have not yet completed push notification setup and/or
 * My Campsite profile configuration.
 *
 * Steps shown dynamically based on onboarding store state:
 *   1. Push Notifications — request permission + register token
 *   2. My Campsite — prompt to set up profile
 *
 * Steps that are already resolved in the onboarding store are skipped.
 * On completion or skip, resolves steps in the store so the HomeScreen
 * modals do not re-trigger.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";

import { auth } from "../config/firebase";
import { registerPushToken } from "../services/notificationService";
import { setCampsiteSetupPromptSeen } from "../services/userFlagsService";
import {
  useOnboardingStore,
  CURRENT_ONBOARDING_VERSION,
} from "../state/onboardingStore";
import { RootStackParamList } from "../navigation/types";
import {
  DEEP_FOREST,
  DEEP_FOREST_PRESSED,
  PARCHMENT,
  EARTH_GREEN,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  BORDER_SOFT,
} from "../constants/colors";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Step Definitions ──────────────────────────────────────────────────────

interface SetupStep {
  id: "push" | "myCampsite";
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel: string;
}

const STEP_DEFINITIONS: SetupStep[] = [
  {
    id: "push",
    icon: "notifications-outline",
    title: "Stay in the Loop",
    subtitle:
      "Get helpful reminders for upcoming trips, weather changes, and updates that matter to your camping plans.",
    primaryLabel: "Turn On Notifications",
    secondaryLabel: "Not Now",
  },
  {
    id: "myCampsite",
    icon: "person-circle-outline",
    title: "Set Up My Campsite",
    subtitle:
      "Add your name, handle, and a few details so people can recognize you and your camping profile feels like yours.",
    primaryLabel: "Set Up Now",
    secondaryLabel: "Maybe Later",
  },
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function SetupFlowScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  // Onboarding store selectors (individual to avoid infinite loops)
  const resolveStep = useOnboardingStore((s) => s.resolveStep);
  const progressByVersion = useOnboardingStore((s) => s.progressByVersion);

  const progress = progressByVersion[CURRENT_ONBOARDING_VERSION] ?? null;

  // Determine which steps are still pending
  const pendingSteps = useMemo<SetupStep[]>(() => {
    if (!progress) return [];

    return STEP_DEFINITIONS.filter((step) => {
      const stepState = progress.steps[step.id];
      return stepState && stepState.status === "pending";
    });
  }, [progress]);

  // Current step index
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushDeniedByOS, setPushDeniedByOS] = useState(false);
  const hasCheckedPermission = useRef(false);

  // If no pending steps, dismiss immediately
  useEffect(() => {
    if (pendingSteps.length === 0) {
      navigation.goBack();
    }
  }, [pendingSteps.length, navigation]);

  // Check push permission status on mount
  useEffect(() => {
    if (hasCheckedPermission.current) return;
    hasCheckedPermission.current = true;

    const check = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === "denied") {
          setPushDeniedByOS(true);
        }
        if (status === "granted") {
          // Already granted — auto-resolve push step
          resolveStep("push", "completed");
        }
      } catch {
        // Simulator or permissions API unavailable
      }
    };
    check();
  }, [resolveStep]);

  const currentStep = pendingSteps[currentIndex] ?? null;
  const isLastStep = currentIndex >= pendingSteps.length - 1;
  const totalSteps = pendingSteps.length;

  // ─── Haptic helper ─────────────────────────────────────────────────────

  const safeHaptic = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // no-op
    }
  }, []);

  // ─── Navigate to next step or close ────────────────────────────────────

  const advanceOrClose = useCallback(() => {
    if (isLastStep) {
      navigation.goBack();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [isLastStep, navigation]);

  // ─── Push Notification Handler ─────────────────────────────────────────

  const handlePushPrimary = useCallback(async () => {
    if (loading) return;

    const user = auth.currentUser;
    if (!user) {
      resolveStep("push", "dismissed");
      advanceOrClose();
      return;
    }

    // If already denied at OS level, open Settings
    if (pushDeniedByOS) {
      safeHaptic();
      Linking.openSettings();
      resolveStep("push", "dismissed");
      advanceOrClose();
      return;
    }

    safeHaptic();
    setLoading(true);

    try {
      if (!Device.isDevice) {
        // Simulator — skip
        resolveStep("push", "completed");
        advanceOrClose();
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      if (existingStatus === "granted") {
        await registerPushToken(user.uid);
        resolveStep("push", "completed");
        advanceOrClose();
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();

      if (status === "granted") {
        await registerPushToken(user.uid);
        resolveStep("push", "completed");
      } else {
        setPushDeniedByOS(status === "denied");
        resolveStep("push", "dismissed");
      }
      advanceOrClose();
    } catch (error) {
      console.error("[SetupFlow] Push permission error:", error);
      resolveStep("push", "dismissed");
      advanceOrClose();
    } finally {
      setLoading(false);
    }
  }, [loading, pushDeniedByOS, resolveStep, advanceOrClose, safeHaptic]);

  // ─── My Campsite Handler ──────────────────────────────────────────────

  const handleCampsitePrimary = useCallback(() => {
    safeHaptic();
    resolveStep("myCampsite", "completed");
    setCampsiteSetupPromptSeen();
    navigation.goBack();
    // Small delay to let the modal dismiss before navigating
    setTimeout(() => {
      navigation.navigate("MyCampsite");
    }, 350);
  }, [resolveStep, navigation, safeHaptic]);

  // ─── Dismiss / Skip ───────────────────────────────────────────────────

  const handleSecondary = useCallback(() => {
    if (!currentStep) return;
    resolveStep(currentStep.id, "dismissed");
    if (currentStep.id === "myCampsite") {
      setCampsiteSetupPromptSeen();
    }
    advanceOrClose();
  }, [currentStep, resolveStep, advanceOrClose]);

  const handleSkipAll = useCallback(() => {
    // Resolve all remaining pending steps as dismissed
    for (let i = currentIndex; i < pendingSteps.length; i++) {
      const step = pendingSteps[i];
      resolveStep(step.id, "dismissed");
      if (step.id === "myCampsite") {
        setCampsiteSetupPromptSeen();
      }
    }
    navigation.goBack();
  }, [currentIndex, pendingSteps, resolveStep, navigation]);

  // ─── Primary action router ────────────────────────────────────────────

  const handlePrimary = useCallback(() => {
    if (!currentStep) return;
    if (currentStep.id === "push") {
      handlePushPrimary();
    } else if (currentStep.id === "myCampsite") {
      handleCampsitePrimary();
    }
  }, [currentStep, handlePushPrimary, handleCampsitePrimary]);

  // ─── Render ────────────────────────────────────────────────────────────

  if (!currentStep || pendingSteps.length === 0) {
    return null;
  }

  // Adjust primary label for denied push state
  const primaryLabel =
    currentStep.id === "push" && pushDeniedByOS
      ? "Open Settings"
      : currentStep.primaryLabel;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      {/* Header with Skip */}
      <View style={styles.header}>
        <View style={{ width: 60 }} />
        <Text style={styles.headerTitle}>{"Getting Started"}</Text>
        <Pressable
          onPress={handleSkipAll}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>{"Skip"}</Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Icon circle */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={currentStep.icon}
            size={40}
            color={EARTH_GREEN}
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>{currentStep.title}</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>{currentStep.subtitle}</Text>

        {/* Denied-by-OS helper text */}
        {currentStep.id === "push" && pushDeniedByOS && (
          <Text style={styles.helperText}>
            {"Notifications are disabled in your device settings. Tap below to open Settings and enable them."}
          </Text>
        )}
      </View>

      {/* Bottom actions */}
      <View style={styles.actions}>
        {/* Step indicator dots */}
        {totalSteps > 1 && (
          <View style={styles.dotsRow}>
            {pendingSteps.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === currentIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        )}

        {/* Primary CTA */}
        <Pressable
          onPress={handlePrimary}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && { backgroundColor: DEEP_FOREST_PRESSED },
            loading && { opacity: 0.7 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          )}
        </Pressable>

        {/* Secondary dismiss */}
        <Pressable
          onPress={handleSecondary}
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
            {currentStep.secondaryLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PARCHMENT,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: "Raleway_600SemiBold",
    fontSize: 17,
    color: TEXT_PRIMARY_STRONG,
    textAlign: "center",
  },
  skipButton: {
    width: 60,
    alignItems: "flex-end",
  },
  skipText: {
    fontFamily: "SourceSans3_500Medium",
    fontSize: 15,
    color: TEXT_MUTED,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: EARTH_GREEN + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  title: {
    fontFamily: "Raleway_700Bold",
    fontSize: 24,
    color: TEXT_PRIMARY_STRONG,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
  },
  helperText: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 16,
    maxWidth: 280,
  },
  actions: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: DEEP_FOREST,
  },
  dotInactive: {
    backgroundColor: BORDER_SOFT,
  },
  primaryButton: {
    backgroundColor: DEEP_FOREST,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  primaryButtonText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 15,
    color: TEXT_MUTED,
  },
});
