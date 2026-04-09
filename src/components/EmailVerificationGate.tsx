/**
 * EmailVerificationGate
 *
 * Full-screen overlay that blocks interaction for logged-in users who
 * have not yet verified their email address.
 *
 * - Apple Sign-In users are excluded (Apple handles verification).
 * - Shows a friendly card with Resend / Check-Status actions.
 * - Auto-checks verification status when the app returns to foreground.
 * - Once verified, the overlay disappears instantly (no restart needed).
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from "react-native";
import { EmailVerificationIcon } from "./icons/OnboardingIcons";
import { auth } from "../config/firebase";
import { sendEmailVerification, signOut } from "firebase/auth";
import {
  PARCHMENT,
  DEEP_FOREST,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  EARTH_GREEN,
  CARD_BACKGROUND_LIGHT,
} from "../constants/colors";

export default function EmailVerificationGate() {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const appState = useRef(AppState.currentState);
  const autoSentRef = useRef(false);

  const user = auth.currentUser;

  // Apple Sign-In users are considered verified (Apple handles it)
  const isAppleUser =
    user?.providerData?.some((p) => p.providerId === "apple.com") ?? false;

  const needsVerification =
    !!user && !user.emailVerified && !isAppleUser && !verified;

  const checkVerification = useCallback(async (silent = false) => {
    if (!silent) {
      setChecking(true);
      setMessage("");
    }
    try {
      await user?.reload();
      if (auth.currentUser?.emailVerified) {
        setVerified(true);
      } else if (!silent) {
        setMessage("Not verified yet. Please check your inbox and tap the link.");
      }
    } catch {
      if (!silent) {
        setMessage("Could not check status. Please try again.");
      }
    } finally {
      setChecking(false);
    }
  }, [user]);

  // Auto-check on app foreground
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active" &&
        needsVerification
      ) {
        await checkVerification(true);
      }
      appState.current = nextState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription.remove();
  }, [needsVerification, checkVerification]);

  // Safety-net: auto-send verification email shortly after gate mounts.
  // Only fires once per component lifetime (ref-guarded).
  useEffect(() => {
    if (!needsVerification || autoSentRef.current) return;
    autoSentRef.current = true;

    const timer = setTimeout(async () => {
      try {
        const freshUser = auth.currentUser;
        if (!freshUser || freshUser.emailVerified) return;
        await sendEmailVerification(freshUser);
        console.log("GATE_AUTO_SEND_SUCCESS");
      } catch (err: any) {
        // Rate-limited or already sent — both are fine
        console.warn("GATE_AUTO_SEND_SKIPPED", err?.code);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [needsVerification]);

  const handleResend = async () => {
    setResending(true);
    setMessage("");
    try {
      if (user) await sendEmailVerification(user);
      setMessage("Verification email sent! Check your inbox.");
    } catch (error: any) {
      if (error?.code === "auth/too-many-requests") {
        setMessage("Too many attempts. Please wait a few minutes.");
      } else {
        setMessage("Could not send email. Please try again.");
      }
    } finally {
      setResending(false);
    }
  };

  if (!needsVerification) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(26, 47, 28, 0.88)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <View
        style={{
          backgroundColor: PARCHMENT,
          borderRadius: 24,
          paddingTop: 32,
          paddingBottom: 28,
          paddingHorizontal: 28,
          marginHorizontal: 24,
          width: "88%",
          maxWidth: 360,
          alignItems: "center",
        }}
      >
        {/* Icon */}
        <View style={{ marginBottom: 16 }}>
          <EmailVerificationIcon />
        </View>

        {/* Title */}
        <Text
          style={{
            fontFamily: "SourceSans3_700Bold",
            fontSize: 22,
            color: TEXT_PRIMARY_STRONG,
            textAlign: "center",
          }}
        >
          Verify Your Email
        </Text>

        {/* Subtitle */}
        <Text
          style={{
            fontFamily: "SourceSans3_400Regular",
            fontSize: 15,
            color: TEXT_SECONDARY,
            marginTop: 10,
            textAlign: "center",
            lineHeight: 22,
          }}
        >
          {"We sent a verification link to"}
          {"\n"}
          <Text
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              color: TEXT_PRIMARY_STRONG,
            }}
          >
            {user?.email || "your email"}
          </Text>
          {"\n"}
          {"Please confirm to start using the app."}
        </Text>

        {/* Status message */}
        {message ? (
          <View
            style={{
              backgroundColor: CARD_BACKGROUND_LIGHT,
              borderRadius: 10,
              paddingVertical: 10,
              paddingHorizontal: 14,
              marginTop: 16,
              width: "100%",
            }}
          >
            <Text
              style={{
                fontFamily: "SourceSans3_500Medium",
                fontSize: 13,
                color: TEXT_MUTED,
                textAlign: "center",
              }}
            >
              {message}
            </Text>
          </View>
        ) : null}

        {/* Primary CTA: Check Verification */}
        <Pressable
          onPress={() => checkVerification(false)}
          disabled={checking}
          style={({ pressed }) => ({
            backgroundColor: DEEP_FOREST,
            borderRadius: 14,
            paddingVertical: 15,
            paddingHorizontal: 32,
            marginTop: 22,
            width: "100%",
            alignItems: "center",
            opacity: pressed ? 0.85 : 1,
          })}
        >
          {checking ? (
            <ActivityIndicator color={PARCHMENT} size="small" />
          ) : (
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 16,
                color: PARCHMENT,
              }}
            >
              {"I've Verified My Email"}
            </Text>
          )}
        </Pressable>

        {/* Secondary CTA: Resend */}
        <Pressable
          onPress={handleResend}
          disabled={resending}
          style={({ pressed }) => ({
            marginTop: 14,
            paddingVertical: 10,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          {resending ? (
            <ActivityIndicator color={EARTH_GREEN} size="small" />
          ) : (
            <Text
              style={{
                fontFamily: "SourceSans3_500Medium",
                fontSize: 14,
                color: EARTH_GREEN,
              }}
            >
              Resend Verification Email
            </Text>
          )}
        </Pressable>

        {/* Sign out escape hatch */}
        <Pressable
          onPress={() => signOut(auth)}
          style={({ pressed }) => ({
            marginTop: 20,
            paddingVertical: 8,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 13,
              color: TEXT_MUTED,
            }}
          >
            Sign out
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
