/**
 * OnboardingWalkthroughModal
 *
 * Single modal with 3 paged screens for new user onboarding:
 *   1. Push notifications — request permission
 *   2. Email opt-in — subscribe to camping tips
 *   3. My Campsite — personalize your profile
 *
 * Replaces the previous stacked-modal approach (StayInLoopModal +
 * EmailOptInModal + inline CampsitePrompt) with a unified step-through
 * experience and pill-dot progress indicator.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";
import { auth, db } from "../config/firebase";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable, getFunctions } from "firebase/functions";
import { registerPushToken } from "../services/notificationService";
import { setCampsiteSetupPromptSeen } from "../services/userFlagsService";
import {
  PushNotificationIcon,
  EmailTipsIcon,
  MyCampsiteIcon,
} from "./icons/OnboardingIcons";
import {
  DEEP_FOREST,
  DEEP_FOREST_PRESSED,
  PARCHMENT,
  EARTH_GREEN,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  BORDER_SOFT,
  DISABLED_BG,
  DISABLED_TEXT,
} from "../constants/colors";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type StepId = "push" | "email" | "myCampsite";

interface Props {
  visible: boolean;
  pendingSteps: StepId[];
  onResolvePush: (outcome: "completed" | "dismissed") => void;
  onResolveEmail: (outcome: "completed" | "dismissed" | "skipped") => void;
  onResolveMyCampsite: (outcome: "completed" | "dismissed") => void;
  onClose: () => void;
  onNavigateToCampsite: () => void;
  onEmailSubscribed?: () => void;
  /** Atomic completion: persist onboardingCompleted to Firestore and navigate */
  onComplete?: () => void;
}

export default function OnboardingWalkthroughModal({
  visible,
  pendingSteps,
  onResolvePush,
  onResolveEmail,
  onResolveMyCampsite,
  onClose,
  onNavigateToCampsite,
  onEmailSubscribed,
  onComplete,
}: Props) {
  const insets = useSafeAreaInsets();

  // ─── Snapshot steps at open time (stable while modal is showing) ────
  const [pages, setPages] = useState<StepId[]>([]);
  const [pageIndex, setPageIndex] = useState(0);

  // ─── Push step state ────────────────────────────────────────────────
  const [pushLoading, setPushLoading] = useState(false);
  const [pushDenied, setPushDenied] = useState(false);

  // ─── Email step state ───────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [consent, setConsent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // ─── Reset on open ──────────────────────────────────────────────────
  useEffect(() => {
    if (visible && pendingSteps.length > 0) {
      setPages([...pendingSteps]);
      setPageIndex(0);
      setPushLoading(false);
      setPushDenied(false);
      setConsent(false);
      setEmailLoading(false);
      setEmailError(null);

      const user = auth.currentUser;
      if (user) {
        setEmail(user.email || "");
        setFirstName(user.displayName?.split(" ")[0] || "");
      }

      Notifications.getPermissionsAsync()
        .then(({ status }) => {
          if (status === "denied") setPushDenied(true);
        })
        .catch(() => {});
    }
  }, [visible]); // intentionally only depend on visible, not pendingSteps

  // ─── Derived ────────────────────────────────────────────────────────
  const total = pages.length;
  const currentStep = pages[pageIndex] as StepId | undefined;
  const isLast = pageIndex >= total - 1;
  const emailValid = EMAIL_REGEX.test(email.trim());
  const emailFormReady = emailValid && consent;

  // ─── Helpers ────────────────────────────────────────────────────────
  const haptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const advance = useCallback(() => {
    if (isLast) {
      onClose();
    } else {
      setPageIndex((p) => p + 1);
    }
  }, [isLast, onClose]);

  // ─── Push handlers ─────────────────────────────────────────────────
  const handlePushEnable = useCallback(async () => {
    if (pushLoading) return;

    const user = auth.currentUser;
    if (!user) {
      onResolvePush("dismissed");
      advance();
      return;
    }

    if (pushDenied) {
      haptic();
      Linking.openSettings();
      onResolvePush("dismissed");
      advance();
      return;
    }

    haptic();
    setPushLoading(true);

    try {
      if (!Device.isDevice) {
        onResolvePush("completed");
        advance();
        return;
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === "granted") {
        await registerPushToken(user.uid);
        onResolvePush("completed");
        advance();
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status === "granted") {
        await registerPushToken(user.uid);
        onResolvePush("completed");
      } else {
        setPushDenied(status === "denied");
        onResolvePush("dismissed");
      }
      advance();
    } catch {
      onResolvePush("dismissed");
      advance();
    } finally {
      setPushLoading(false);
    }
  }, [pushLoading, pushDenied, onResolvePush, advance, haptic]);

  // ─── Email handlers ────────────────────────────────────────────────
  const handleEmailSubmit = useCallback(async () => {
    if (!emailFormReady || emailLoading) return;

    const user = auth.currentUser;
    if (!user) {
      setEmailError("You must be signed in.");
      return;
    }

    setEmailLoading(true);
    setEmailError(null);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      const normalizedEmail = email.trim().toLowerCase();
      const trimmedName = firstName.trim();

      await updateDoc(doc(db, "users", user.uid), {
        emailSubscribed: true,
        emailSubscribedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const subRef = doc(db, "emailSubscribers", user.uid);
      await setDoc(
        subRef,
        {
          email: normalizedEmail,
          userId: user.uid,
          unsubscribed: false,
          source: "app_optin",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await setDoc(subRef, { createdAt: serverTimestamp() }, { merge: true });

      try {
        const fns = getFunctions();
        await httpsCallable(fns, "sendgridSubscribeToDrip")({
          email: normalizedEmail,
          firstName: trimmedName,
          userId: user.uid,
          source: "app_optin",
        });
      } catch {
        // SendGrid enrollment is best-effort
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onEmailSubscribed?.();
      onResolveEmail("completed");
      advance();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setEmailError("Something went wrong. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  }, [emailFormReady, emailLoading, email, firstName, onResolveEmail, onEmailSubscribed, advance]);

  // ─── Campsite handlers ─────────────────────────────────────────────
  const handleCampsiteGo = useCallback(() => {
    haptic();
    onResolveMyCampsite("completed");
    setCampsiteSetupPromptSeen();
    // Atomic completion: persist to Firestore before navigating
    if (onComplete) {
      onComplete();
    } else {
      onNavigateToCampsite();
    }
  }, [onResolveMyCampsite, onNavigateToCampsite, onComplete, haptic]);

  const handleCampsiteSkip = useCallback(() => {
    onResolveMyCampsite("dismissed");
    setCampsiteSetupPromptSeen();
    advance();
  }, [onResolveMyCampsite, advance]);

  // ─── Skip current step ─────────────────────────────────────────────
  const handleSecondary = useCallback(() => {
    if (!currentStep) return;
    if (currentStep === "push") {
      onResolvePush("dismissed");
      advance();
    } else if (currentStep === "email") {
      onResolveEmail("dismissed");
      advance();
    } else if (currentStep === "myCampsite") {
      handleCampsiteSkip();
    }
  }, [currentStep, onResolvePush, onResolveEmail, advance, handleCampsiteSkip]);

  // ─── Skip all remaining ────────────────────────────────────────────
  const handleSkipAll = useCallback(() => {
    for (let i = pageIndex; i < total; i++) {
      const s = pages[i];
      if (s === "push") onResolvePush("dismissed");
      else if (s === "email") onResolveEmail("dismissed");
      else if (s === "myCampsite") {
        onResolveMyCampsite("dismissed");
        setCampsiteSetupPromptSeen();
      }
    }
    onClose();
  }, [pageIndex, total, pages, onResolvePush, onResolveEmail, onResolveMyCampsite, onClose]);

  // ─── Early return ──────────────────────────────────────────────────
  if (!visible || total === 0) return null;

  // ─── Button config per step ────────────────────────────────────────
  let primaryLabel = "";
  let primaryHandler = () => {};
  let primaryDisabled = false;
  const isLoading = pushLoading || emailLoading;

  if (currentStep === "push") {
    primaryLabel = pushDenied ? "Open Settings" : "Turn On Notifications";
    primaryHandler = handlePushEnable;
    primaryDisabled = pushLoading;
  } else if (currentStep === "email") {
    primaryLabel = "Turn on emails";
    primaryHandler = handleEmailSubmit;
    primaryDisabled = !emailFormReady || emailLoading;
  } else if (currentStep === "myCampsite") {
    primaryLabel = "Set Up My Campsite";
    primaryHandler = handleCampsiteGo;
  }

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleSkipAll}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.backdrop}>
          {/* Card — bottom-sheet anchored at bottom */}
          <View style={styles.card}>
            {/* Handle bar */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={handleSecondary} hitSlop={12} style={styles.skipBtn}>
                <Text style={styles.skipText}>{isLast ? "" : "Skip"}</Text>
              </Pressable>
              <Text style={styles.headerTitle}>Getting Started</Text>
              <Pressable onPress={handleSkipAll} hitSlop={12} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={TEXT_MUTED} />
              </Pressable>
            </View>

            {/* Progress dots */}
            <View style={styles.dotsRow}>
              {pages.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i < pageIndex
                      ? styles.dotComplete
                      : i === pageIndex
                      ? styles.dotActive
                      : styles.dotInactive,
                  ]}
                />
              ))}
            </View>

            {/* Scrollable page content */}
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {currentStep === "push" && (
                <View style={styles.pageCenter}>
                  <PushNotificationIcon />
                  <View style={{ height: 18 }} />
                  <Text style={styles.pageTitle}>Stay in the loop</Text>
                  <Text style={styles.pageBody}>
                    {"Get helpful reminders for upcoming trips, weather changes, and updates that matter to your camping plans."}
                  </Text>

                  {pushDenied && (
                    <Pressable
                      style={styles.warningBox}
                      onPress={() => Linking.openSettings()}
                    >
                      <Ionicons name="warning-outline" size={18} color="#B45309" />
                      <Text style={styles.warningText}>
                        {"Notifications are off in your device settings. Tap to open Settings."}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}

              {currentStep === "email" && (
                <View style={styles.pageFill}>
                  <View style={styles.emailIconRow}>
                    <EmailTipsIcon />
                  </View>

                  <Text style={styles.pageTitle}>
                    {"Get camping tips in your inbox"}
                  </Text>
                  <Text style={[styles.pageBody, { marginBottom: 24 }]}>
                    {"Join thousands of campers getting weekly tips, trip ideas, and exclusive updates."}
                  </Text>

                  {/* Email input */}
                  <View style={{ marginBottom: 14 }}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="your@email.com"
                      placeholderTextColor={TEXT_MUTED}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!emailLoading}
                      style={[
                        styles.input,
                        email.length > 0 && !emailValid && { borderColor: "#D32F2F" },
                      ]}
                    />
                    {email.length > 0 && !emailValid && (
                      <Text style={styles.inputError}>
                        Please enter a valid email address
                      </Text>
                    )}
                  </View>

                  {/* First name input */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.inputLabel}>First name (optional)</Text>
                    <TextInput
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="First name"
                      placeholderTextColor={TEXT_MUTED}
                      autoCapitalize="words"
                      autoCorrect={false}
                      editable={!emailLoading}
                      style={styles.input}
                    />
                  </View>

                  {/* Consent checkbox */}
                  <Pressable
                    onPress={() => {
                      if (!emailLoading) {
                        haptic();
                        setConsent(!consent);
                      }
                    }}
                    style={styles.checkboxRow}
                    disabled={emailLoading}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        consent && styles.checkboxChecked,
                      ]}
                    >
                      {consent && (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      Yes, email me tips and updates
                    </Text>
                  </Pressable>

                  {emailError && (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{emailError}</Text>
                    </View>
                  )}

                  <Text style={styles.unsubNote}>Unsubscribe anytime.</Text>
                </View>
              )}

              {currentStep === "myCampsite" && (
                <View style={styles.pageCenter}>
                  <MyCampsiteIcon />
                  <View style={{ height: 18 }} />
                  <Text style={styles.pageTitle}>Set up My Campsite</Text>
                  <Text style={styles.pageBody}>
                    {"Add your name, handle, and a few details so people can recognize you, and so your camping profile feels like yours from the start."}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Bottom actions */}
            <View
              style={[
                styles.actionsContainer,
                { paddingBottom: Math.max(insets.bottom, 24) },
              ]}
            >
              <Pressable
                onPress={primaryHandler}
                disabled={primaryDisabled}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && !primaryDisabled && { backgroundColor: DEEP_FOREST_PRESSED },
                  primaryDisabled && { backgroundColor: DISABLED_BG },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.primaryBtnText,
                      primaryDisabled && !isLoading && { color: DISABLED_TEXT },
                    ]}
                  >
                    {primaryLabel}
                  </Text>
                )}
              </Pressable>

            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: PARCHMENT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    // Sized by content, not flex — avoids the giant dead-space problem.
    // Email form is tallest; maxHeight prevents full-screen on very short devices.
    maxHeight: "88%",
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: BORDER_SOFT,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 2,
  },
  headerTitle: {
    fontFamily: "Raleway_600SemiBold",
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  skipBtn: {
    width: 48,
    alignItems: "flex-start",
  },
  skipText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 15,
    color: EARTH_GREEN,
  },
  closeBtn: {
    width: 48,
    alignItems: "flex-end",
  },

  // ── Progress dots (active = pill, others = circle) ──
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 6,
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: DEEP_FOREST,
  },
  dotComplete: {
    width: 6,
    backgroundColor: DEEP_FOREST,
    opacity: 0.35,
  },
  dotInactive: {
    width: 6,
    backgroundColor: BORDER_SOFT,
  },

  // ── Content ──
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  pageCenter: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 8,
  },
  pageFill: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: DEEP_FOREST + "12",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emailIconRow: {
    alignItems: "center",
    marginBottom: 14,
  },
  emailIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: EARTH_GREEN + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontFamily: "Raleway_700Bold",
    fontSize: 22,
    color: DEEP_FOREST,
    textAlign: "center",
    marginBottom: 10,
  },
  pageBody: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 290,
    alignSelf: "center",
  },

  // ── Push: warning box ──
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    maxWidth: 310,
  },
  warningText: {
    flex: 1,
    fontFamily: "SourceSans3_400Regular",
    fontSize: 13,
    color: "#B45309",
    lineHeight: 18,
  },

  // ── Email: form ──
  inputLabel: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "SourceSans3_400Regular",
    color: TEXT_PRIMARY_STRONG,
    fontSize: 16,
  },
  inputError: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 12,
    color: "#D32F2F",
    marginTop: 4,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
    borderColor: BORDER_SOFT,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: DEEP_FOREST,
    borderColor: DEEP_FOREST,
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: "SourceSans3_400Regular",
    fontSize: 14,
    color: TEXT_PRIMARY_STRONG,
    lineHeight: 20,
  },
  errorBox: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#FFEBEE",
  },
  errorText: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 14,
    color: "#D32F2F",
  },
  unsubNote: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 4,
  },

  // ── Bottom actions ──
  actionsContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_SOFT,
  },
  primaryBtn: {
    backgroundColor: DEEP_FOREST,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    width: "100%" as const,
    // Subtle shadow to lift the CTA
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnText: {
    fontFamily: "SourceSans3_700Bold",
    fontSize: 17,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

});
