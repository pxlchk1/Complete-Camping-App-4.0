/**
 * DeleteAccountConfirmScreen
 *
 * Reached via deep link: /delete-account?token=<token>
 * Validates the deletion token server-side, prompts for password re-auth,
 * then completes account deletion through the admin SDK (which fires
 * the existing onUserDeleted cleanup trigger).
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { httpsCallable } from "firebase/functions";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
} from "firebase/auth";

import { auth, functions } from "../config/firebase";
import { useAuthStore } from "../state/authStore";
import { useUserStore } from "../state/userStore";
import {
  DEEP_FOREST,
  PARCHMENT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  BORDER_SOFT,
  CARD_BACKGROUND_LIGHT,
} from "../constants/colors";

type ConfirmDeleteRoute = RouteProp<
  { ConfirmDeleteAccount: { token: string } },
  "ConfirmDeleteAccount"
>;

type ScreenState =
  | "validating"
  | "ready"
  | "reauthing"
  | "deleting"
  | "done"
  | "invalid"
  | "error";

export default function DeleteAccountConfirmScreen() {
  const route = useRoute<ConfirmDeleteRoute>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { token } = route.params;

  const authSignOut = useAuthStore((s) => s.signOut);
  const clearCurrentUser = useUserStore((s) => s.clearCurrentUser);

  const [state, setState] = useState<ScreenState>("validating");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const attemptedRef = useRef(false);

  // Phase 1 — validate token on mount
  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    if (!token) {
      setState("invalid");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setState("invalid");
      setErrorMsg("Please sign in first, then open this link again.");
      return;
    }

    const validate = httpsCallable<
      { token: string; action: string },
      { valid: boolean; email: string }
    >(functions, "confirmAccountDeletion");

    validate({ token, action: "validate" })
      .then(() => setState("ready"))
      .catch(() => {
        setState("invalid");
      });
  }, [token]);

  // Phase 2 — re-auth + execute
  const handleConfirm = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    setErrorMsg("");

    // Re-authenticate
    setState("reauthing");
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
    } catch (err: any) {
      setState("ready");
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setErrorMsg("Incorrect password. Please try again.");
      } else {
        setErrorMsg("Unable to verify your identity. Please try again.");
      }
      return;
    }

    // Execute deletion server-side
    setState("deleting");
    try {
      const execute = httpsCallable<
        { token: string; action: string },
        { deleted: boolean }
      >(functions, "confirmAccountDeletion");
      await execute({ token, action: "execute" });

      // Clean up local state
      clearCurrentUser();
      authSignOut();
      try {
        await signOut(auth);
      } catch {
        // Auth state already cleaned up server-side
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setState("done");
    } catch {
      setState("error");
      setErrorMsg("Failed to delete account. Please try again.");
    }
  };

  const handleClose = () => {
    if (state === "done") {
      // After deletion, navigate to auth
      (navigation as any).reset({ index: 0, routes: [{ name: "Auth" }] });
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: PARCHMENT }}
    >
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 12,
          paddingHorizontal: 24,
          justifyContent: "center",
        }}
      >
        {/* Validating */}
        {state === "validating" && (
          <View style={{ alignItems: "center" }}>
            <ActivityIndicator size="large" color={DEEP_FOREST} />
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_SECONDARY,
                marginTop: 16,
                fontSize: 15,
              }}
            >
              Verifying your link...
            </Text>
          </View>
        )}

        {/* Invalid / expired link */}
        {state === "invalid" && (
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#fecaca",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="close-circle" size={36} color="#dc2626" />
            </View>
            <Text
              style={{
                fontFamily: "Raleway_700Bold",
                fontSize: 20,
                color: TEXT_PRIMARY_STRONG,
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Link expired
            </Text>
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 15,
                color: TEXT_SECONDARY,
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              {errorMsg || "This deletion link is no longer valid."}
            </Text>
            <Pressable
              onPress={handleClose}
              style={{
                backgroundColor: DEEP_FOREST,
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 32,
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  color: PARCHMENT,
                  fontSize: 15,
                }}
              >
                Go back
              </Text>
            </Pressable>
          </View>
        )}

        {/* Ready for re-auth */}
        {(state === "ready" || state === "reauthing") && (
          <View>
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "#fecaca",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Ionicons name="shield-checkmark" size={32} color="#dc2626" />
              </View>
              <Text
                style={{
                  fontFamily: "Raleway_700Bold",
                  fontSize: 20,
                  color: TEXT_PRIMARY_STRONG,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                {"Confirm it's you"}
              </Text>
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 15,
                  color: TEXT_SECONDARY,
                  textAlign: "center",
                  lineHeight: 22,
                }}
              >
                For security, please confirm your password to finish deleting your account.
              </Text>
            </View>

            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                color: TEXT_PRIMARY_STRONG,
                marginBottom: 8,
              }}
            >
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrorMsg("");
              }}
              placeholder="Enter your password"
              placeholderTextColor={TEXT_MUTED}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                backgroundColor: PARCHMENT,
                borderColor: errorMsg ? "#dc2626" : BORDER_SOFT,
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_PRIMARY_STRONG,
                fontSize: 15,
                marginBottom: 8,
              }}
            />

            {errorMsg !== "" && (
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  color: "#dc2626",
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                {errorMsg}
              </Text>
            )}

            <View
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderRadius: 12,
                padding: 12,
                marginTop: 8,
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  color: TEXT_SECONDARY,
                  fontSize: 13,
                  lineHeight: 18,
                  textAlign: "center",
                }}
              >
                This action is permanent. All your data, trips, and preferences will be deleted.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={handleClose}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    color: TEXT_PRIMARY_STRONG,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConfirm}
                disabled={state === "reauthing" || !password}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  paddingVertical: 12,
                  backgroundColor: password ? "#dc2626" : "#f87171",
                  opacity: state === "reauthing" ? 0.5 : 1,
                  alignItems: "center",
                }}
              >
                {state === "reauthing" ? (
                  <ActivityIndicator size="small" color={PARCHMENT} />
                ) : (
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      color: PARCHMENT,
                    }}
                  >
                    Delete forever
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Deleting */}
        {state === "deleting" && (
          <View style={{ alignItems: "center" }}>
            <ActivityIndicator size="large" color="#dc2626" />
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                color: TEXT_SECONDARY,
                marginTop: 16,
                fontSize: 15,
              }}
            >
              Deleting your account...
            </Text>
          </View>
        )}

        {/* Done */}
        {state === "done" && (
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: DEEP_FOREST,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="checkmark" size={32} color={PARCHMENT} />
            </View>
            <Text
              style={{
                fontFamily: "Raleway_700Bold",
                fontSize: 20,
                color: TEXT_PRIMARY_STRONG,
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Account deleted
            </Text>
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 15,
                color: TEXT_SECONDARY,
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              Your account has been permanently deleted. Happy trails.
            </Text>
            <Pressable
              onPress={handleClose}
              style={{
                backgroundColor: DEEP_FOREST,
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 32,
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  color: PARCHMENT,
                  fontSize: 15,
                }}
              >
                Done
              </Text>
            </Pressable>
          </View>
        )}

        {/* Error */}
        {state === "error" && (
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#fecaca",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="alert-circle" size={36} color="#dc2626" />
            </View>
            <Text
              style={{
                fontFamily: "Raleway_700Bold",
                fontSize: 20,
                color: TEXT_PRIMARY_STRONG,
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Something went wrong
            </Text>
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 15,
                color: TEXT_SECONDARY,
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              {errorMsg || "Failed to delete account. Please try again."}
            </Text>
            <Pressable
              onPress={handleClose}
              style={{
                backgroundColor: DEEP_FOREST,
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 32,
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  color: PARCHMENT,
                  fontSize: 15,
                }}
              >
                Go back
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
