/**
 * CampsiteSetupScreen
 *
 * Guided 3-step campsite setup flow for new and incomplete-profile users.
 *
 *   Step 0  Welcome to the campground
 *   Step 1  Pick your camper handle
 *   Step 2  Checkpoint — continue to EditProfile or finish later
 *
 * Trigger: RootNavigator redirects here when the user has no
 * @campsite_setup_done flag and their profile is incomplete (missing
 * real handle or displayName).
 *
 * On complete or intentional skip the flag is written so the flow
 * never reappears.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { auth, db } from "../config/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "../state/authStore";
import { RootStackParamList } from "../navigation/types";
import {
  PARCHMENT,
  DEEP_FOREST,
  EARTH_GREEN,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  CARD_BACKGROUND_LIGHT,
} from "../constants/colors";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** AsyncStorage key — once set the flow never re-appears. */
export const CAMPSITE_SETUP_DONE_KEY = (uid: string) =>
  `@campsite_setup_done:${uid}`;

// Minimal reserved-handle list (mirrors EditProfileScreen subset)
const RESERVED_HANDLES = [
  "tentandlantern",
  "admin",
  "administrator",
  "moderator",
  "staff",
  "team",
  "official",
  "support",
  "help",
  "root",
  "owner",
  "system",
  "bot",
  "null",
  "undefined",
  "user",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CampsiteSetupScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const inputRef = useRef<TextInput>(null);

  // Step: 0 = welcome, 1 = handle, 2 = checkpoint
  const [step, setStep] = useState(0);
  const [handle, setHandleText] = useState("");
  const [handleError, setHandleError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedHandle, setSavedHandle] = useState("");

  // Pre-fill existing handle (if not a default placeholder)
  useEffect(() => {
    if (user?.handle && user.handle !== "user" && user.handle.trim() !== "") {
      setHandleText(user.handle);
      setSavedHandle(user.handle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-focus handle input when step changes to 1
  useEffect(() => {
    if (step === 1) {
      const timer = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // ------- helpers -------

  const markDone = async () => {
    const uid = user?.id || auth.currentUser?.uid;
    if (uid) {
      await AsyncStorage.setItem(CAMPSITE_SETUP_DONE_KEY(uid), "true");
    }
  };

  const goHome = () => {
    nav.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: "HomeTabs" }] })
    );
  };

  /** Skip the entire setup — mark done and go to Home. */
  const handleSkipAll = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await markDone();
    goHome();
  };

  /** "Continue Setup" — mark done then land on EditProfile with Home below. */
  const handleContinueToProfile = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await markDone();
    nav.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [{ name: "HomeTabs" }, { name: "EditProfile" }],
      })
    );
  };

  /** "Finish later" from checkpoint — mark done, go Home. */
  const handleFinishLater = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await markDone();
    goHome();
  };

  // ------- handle validation -------

  const validate = (h: string): string | null => {
    if (!h) return "Please enter a handle";
    if (h.length < 3) return "Handle must be at least 3 characters";
    if (h.length > 30) return "Handle must be 30 characters or less";
    if (!/^[a-z0-9_-]+$/.test(h))
      return "Only letters, numbers, hyphens, and underscores";
    if (RESERVED_HANDLES.includes(h)) return "This handle is reserved";
    return null;
  };

  const handleSaveHandle = async () => {
    const clean = handle.trim().toLowerCase().replace(/^@+/, "");
    const error = validate(clean);
    if (error) {
      setHandleError(error);
      return;
    }

    Keyboard.dismiss();
    setSaving(true);
    setHandleError("");
    try {
      const uid = user?.id || auth.currentUser?.uid;
      if (!uid) throw new Error("Not signed in");

      // Persist to both Firestore collections
      await setDoc(
        doc(db, "users", uid),
        { handle: clean, updatedAt: serverTimestamp() },
        { merge: true }
      );
      await setDoc(
        doc(db, "profiles", uid),
        { handle: clean, updatedAt: serverTimestamp() },
        { merge: true }
      );

      // Update local authStore so the rest of the app sees it
      updateProfile({ handle: clean });
      setSavedHandle(clean);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep(2);
    } catch (err: any) {
      console.error("[CampsiteSetup] Save handle failed:", err);
      if (err?.code === "permission-denied") {
        setHandleError("Permission denied. Please try signing out and back in.");
      } else {
        setHandleError("Could not save. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  /** Skip the handle step — go straight to checkpoint without saving. */
  const handleSkipHandle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(2);
  };

  // Display name for the checkpoint screen
  const displayHandle =
    savedHandle ||
    (user?.handle && user.handle !== "user" ? user.handle : "Adventurer");

  // ------- step dots -------

  const StepDots = ({ active }: { active: number }) => (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
        marginTop: 8,
      }}
    >
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i === active ? DEEP_FOREST : BORDER_SOFT,
          }}
        />
      ))}
    </View>
  );

  // ------- checklist item -------

  const CheckItem = ({
    label,
    done,
  }: {
    label: string;
    done: boolean;
  }) => (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
      {done ? (
        <Ionicons name="checkmark-circle" size={18} color={EARTH_GREEN} />
      ) : (
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 1.5,
            borderColor: BORDER_SOFT,
          }}
        />
      )}
      <Text
        style={{
          marginLeft: 10,
          fontFamily: "SourceSans3_400Regular",
          fontSize: 15,
          color: done ? TEXT_PRIMARY_STRONG : TEXT_SECONDARY,
        }}
      >
        {label}
      </Text>
    </View>
  );

  // ========================================================================
  //  STEP 0 — Welcome
  // ========================================================================
  const renderWelcome = () => (
    <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28 }}>
      <View
        style={{
          backgroundColor: CARD_BACKGROUND_LIGHT,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: BORDER_SOFT,
          padding: 28,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        {/* Icon */}
        <View style={{ alignItems: "center", marginBottom: 18 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: PARCHMENT,
              borderWidth: 2,
              borderColor: BORDER_SOFT,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="bonfire-outline" size={30} color={DEEP_FOREST} />
          </View>
        </View>

        {/* Title */}
        <Text
          style={{
            textAlign: "center",
            fontFamily: "Raleway_700Bold",
            fontSize: 24,
            color: DEEP_FOREST,
            marginBottom: 10,
          }}
        >
          {"Welcome to\nthe campground"}
        </Text>

        {/* Body */}
        <Text
          style={{
            textAlign: "center",
            fontFamily: "SourceSans3_400Regular",
            fontSize: 15,
            color: TEXT_SECONDARY,
            marginBottom: 22,
            lineHeight: 22,
          }}
        >
          {"Let\u2019s set up your campsite so other campers can find you."}
        </Text>

        {/* Checklist */}
        <View style={{ marginBottom: 24, paddingLeft: 4 }}>
          <CheckItem label="Pick your camper handle" done={false} />
          <CheckItem label="Choose your avatar" done={false} />
          <CheckItem label="Personalize your profile" done={false} />
        </View>

        {/* Primary CTA */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setStep(1);
          }}
          style={{
            backgroundColor: DEEP_FOREST,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              fontSize: 16,
              color: PARCHMENT,
            }}
          >
            {"Let\u2019s Get Started"}
          </Text>
        </Pressable>

        {/* Skip */}
        <Pressable
          onPress={handleSkipAll}
          style={{ paddingVertical: 8, alignItems: "center" }}
        >
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 14,
              color: TEXT_MUTED,
            }}
          >
            Skip for now
          </Text>
        </Pressable>
      </View>

      {/* Progress label */}
      <Text
        style={{
          textAlign: "center",
          marginTop: 18,
          fontFamily: "SourceSans3_400Regular",
          fontSize: 12,
          color: TEXT_MUTED,
        }}
      >
        Campsite Setup 0/3
      </Text>
    </View>
  );

  // ========================================================================
  //  STEP 1 — Handle
  // ========================================================================
  const renderHandle = () => (
    <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28 }}>
      <View
        style={{
          backgroundColor: CARD_BACKGROUND_LIGHT,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: BORDER_SOFT,
          padding: 28,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        {/* Close button */}
        <Pressable
          onPress={handleSkipAll}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <Ionicons name="close" size={22} color={TEXT_MUTED} />
        </Pressable>

        {/* Icon */}
        <View style={{ alignItems: "center", marginBottom: 14 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: PARCHMENT,
              borderWidth: 2,
              borderColor: BORDER_SOFT,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="compass-outline" size={30} color={DEEP_FOREST} />
          </View>
        </View>

        {/* Step label */}
        <Text
          style={{
            textAlign: "center",
            fontFamily: "SourceSans3_400Regular",
            fontSize: 13,
            color: TEXT_MUTED,
            marginBottom: 4,
          }}
        >
          Step 1 of 3
        </Text>

        {/* Title */}
        <Text
          style={{
            textAlign: "center",
            fontFamily: "Raleway_700Bold",
            fontSize: 22,
            color: DEEP_FOREST,
            marginBottom: 20,
          }}
        >
          Pick your camper handle
        </Text>

        {/* Input */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#fff",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: handleError ? "#dc2626" : BORDER_SOFT,
            paddingHorizontal: 14,
            paddingVertical: Platform.OS === "ios" ? 14 : 10,
            marginBottom: handleError ? 4 : 16,
          }}
        >
          <Ionicons
            name="person-outline"
            size={18}
            color={TEXT_MUTED}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 16,
              color: TEXT_MUTED,
              marginRight: 2,
            }}
          >
            @
          </Text>
          <TextInput
            ref={inputRef}
            value={handle}
            onChangeText={(t) => {
              setHandleText(t.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
              setHandleError("");
            }}
            placeholder="camperhandle"
            placeholderTextColor={TEXT_MUTED}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
            returnKeyType="done"
            onSubmitEditing={handleSaveHandle}
            style={{
              flex: 1,
              fontFamily: "SourceSans3_400Regular",
              fontSize: 16,
              color: DEEP_FOREST,
              padding: 0,
            }}
          />
        </View>

        {/* Error */}
        {handleError ? (
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 13,
              color: "#dc2626",
              marginBottom: 12,
              paddingLeft: 4,
            }}
          >
            {handleError}
          </Text>
        ) : null}

        {/* Next button */}
        <Pressable
          onPress={handleSaveHandle}
          disabled={saving}
          style={{
            backgroundColor: DEEP_FOREST,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
            marginBottom: 10,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color={PARCHMENT} />
          ) : (
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 16,
                color: PARCHMENT,
              }}
            >
              Next
            </Text>
          )}
        </Pressable>

        {/* Skip */}
        <Pressable
          onPress={handleSkipHandle}
          style={{ paddingVertical: 8, alignItems: "center" }}
        >
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 14,
              color: TEXT_MUTED,
            }}
          >
            Skip
          </Text>
        </Pressable>
      </View>

      {/* Progress */}
      <Text
        style={{
          textAlign: "center",
          marginTop: 18,
          fontFamily: "SourceSans3_400Regular",
          fontSize: 12,
          color: TEXT_MUTED,
        }}
      >
        Campsite Setup 0/3
      </Text>
      <StepDots active={0} />
    </View>
  );

  // ========================================================================
  //  STEP 2 — Checkpoint
  // ========================================================================
  const renderCheckpoint = () => {
    const handleDone = !!savedHandle;
    const completedCount = handleDone ? 1 : 0;

    return (
      <View
        style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28 }}
      >
        <View
          style={{
            backgroundColor: CARD_BACKGROUND_LIGHT,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: BORDER_SOFT,
            padding: 28,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          {/* Close */}
          <Pressable
            onPress={handleFinishLater}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <Ionicons name="close" size={22} color={TEXT_MUTED} />
          </Pressable>

          {/* Icon */}
          <View style={{ alignItems: "center", marginBottom: 14 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: PARCHMENT,
                borderWidth: 2,
                borderColor: BORDER_SOFT,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="trail-sign-outline" size={30} color={DEEP_FOREST} />
            </View>
          </View>

          {/* Title */}
          <Text
            style={{
              textAlign: "center",
              fontFamily: "Raleway_700Bold",
              fontSize: 22,
              color: DEEP_FOREST,
              marginBottom: 4,
            }}
          >
            {`Looking good, ${displayHandle}!`}
          </Text>
          <Text
            style={{
              textAlign: "center",
              fontFamily: "SourceSans3_400Regular",
              fontSize: 15,
              color: TEXT_SECONDARY,
              marginBottom: 22,
            }}
          >
            Ready to personalize?
          </Text>

          {/* Progress checklist */}
          <View style={{ marginBottom: 8, paddingLeft: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={EARTH_GREEN}
              />
              <Text
                style={{
                  marginLeft: 8,
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 15,
                  color: DEEP_FOREST,
                }}
              >
                Complete your campsite
              </Text>
            </View>
          </View>

          <View style={{ marginBottom: 24, paddingLeft: 12 }}>
            <CheckItem label="Picked your handle" done={handleDone} />
            <CheckItem label="Choose your avatar" done={false} />
            <CheckItem label="Personalize your profile" done={false} />
          </View>

          {/* Continue Setup */}
          <Pressable
            onPress={handleContinueToProfile}
            style={{
              backgroundColor: DEEP_FOREST,
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 16,
                color: PARCHMENT,
              }}
            >
              Continue Setup
            </Text>
          </Pressable>

          {/* Finish later */}
          <Pressable
            onPress={handleFinishLater}
            style={{ paddingVertical: 8, alignItems: "center" }}
          >
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 14,
                color: TEXT_MUTED,
              }}
            >
              Finish later
            </Text>
          </Pressable>
        </View>

        {/* Progress */}
        <Text
          style={{
            textAlign: "center",
            marginTop: 18,
            fontFamily: "SourceSans3_400Regular",
            fontSize: 12,
            color: TEXT_MUTED,
          }}
        >
          {`Campsite Setup ${completedCount}/3`}
        </Text>
        <StepDots active={1} />
      </View>
    );
  };

  // ========================================================================
  //  Root render
  // ========================================================================
  return (
    <View style={{ flex: 1, backgroundColor: PARCHMENT, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} accessible={false}>
          {step === 0 && renderWelcome()}
          {step === 1 && renderHandle()}
          {step === 2 && renderCheckpoint()}
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}
