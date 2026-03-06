/**
 * StayInLoopModal
 * 
 * First-run modal shown after first login to collect push notification 
 * and SMS opt-in preferences.
 * 
 * Flow:
 * A) Primary button: "Turn on notifications" → requests iOS push permission immediately
 * B) Secondary button: "Text me trip reminders" → shows phone input, then "Save phone number"
 * C) Tertiary link: "Not now" → closes modal
 * 
 * Data fields stored in users doc:
 * - hasSeenStayInLoop: boolean
 * - notificationsEnabled: boolean
 * - smsSubscribed: boolean
 * - phoneNumber: string | null (E.164 format)
 * - consentUpdatedAt: timestamp
 */

import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Dimensions,
  Platform,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { doc, setDoc, serverTimestamp, collection } from "firebase/firestore";
import { db, auth } from "../config/firebase";
import {
  DEEP_FOREST,
  PARCHMENT,
  EARTH_GREEN,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_MUTED,
  CARD_BACKGROUND_LIGHT,
} from "../constants/colors";

interface StayInLoopModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const { width } = Dimensions.get("window");

type ModalStep = "main" | "phone_input";

export default function StayInLoopModal({
  visible,
  onDismiss,
}: StayInLoopModalProps) {
  const [step, setStep] = useState<ModalStep>("main");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState<"push" | "sms" | null>(null);
  const [pushDeniedByOS, setPushDeniedByOS] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStep("main");
      setPhoneNumber("");
      setLoading(null);
      setPushDeniedByOS(false);
      setPushSuccess(false);
      checkCurrentPermissionStatus();
    }
  }, [visible]);

  const checkCurrentPermissionStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "denied") {
      setPushDeniedByOS(true);
    } else if (status === "granted") {
      setPushSuccess(true);
    }
  };

  const formatPhoneNumber = (input: string): string => {
    const digits = input.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const getE164PhoneNumber = (input: string): string => {
    const digits = input.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return `+${digits}`;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
  };

  const isValidPhoneNumber = (): boolean => {
    const digits = phoneNumber.replace(/\D/g, "");
    return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
  };

  /**
   * Request push permission from iOS
   */
  const requestPushPermission = async (): Promise<boolean> => {
    if (!Device.isDevice) {
      console.log("[StayInLoopModal] Not a physical device, skipping push");
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === "granted") {
      return true;
    }

    if (existingStatus === "denied") {
      setPushDeniedByOS(true);
      return false;
    }

    const { status } = await Notifications.requestPermissionsAsync();

    if (status === "denied") {
      setPushDeniedByOS(true);
      return false;
    }

    return status === "granted";
  };

  /**
   * Register push token with backend
   */
  const registerPushToken = async (userId: string): Promise<void> => {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        console.warn("[StayInLoopModal] No project ID for push token");
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;

      const pushTokenRef = doc(collection(db, "pushTokens"), `${userId}_${Platform.OS}`);
      await setDoc(pushTokenRef, {
        userId,
        token,
        platform: Platform.OS,
        deviceName: Device.deviceName || "Unknown",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log("[StayInLoopModal] Push token registered:", {
        userId,
        platform: Platform.OS,
      });
    } catch (error) {
      console.error("[StayInLoopModal] Failed to register push token:", {
        error,
        userId,
      });
    }
  };

  /**
   * Handle "Turn on notifications" button tap
   */
  const handleTurnOnNotifications = async () => {
    const user = auth.currentUser;
    if (!user) {
      console.error("[StayInLoopModal] No user signed in when requesting push");
      onDismiss();
      return;
    }

    setLoading("push");

    try {
      const granted = await requestPushPermission();

      if (granted) {
        await registerPushToken(user.uid);
        setPushSuccess(true);
      }

      // Save consent to users doc
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        notificationsEnabled: granted,
        consentUpdatedAt: serverTimestamp(),
        hasSeenStayInLoop: true,
      }, { merge: true });

      console.log("[StayInLoopModal] Push consent saved:", {
        userId: user.uid,
        notificationsEnabled: granted,
      });

      // Close modal after successful operation
      onDismiss();
    } catch (error) {
      console.error("[StayInLoopModal] Error enabling notifications:", {
        error,
        userId: user.uid,
      });
      // Still close on error - don't block app usage
      onDismiss();
    } finally {
      setLoading(null);
    }
  };

  /**
   * Handle "Text me trip reminders" button tap - show phone input
   */
  const handleTextMeReminders = () => {
    setStep("phone_input");
  };

  /**
   * Handle "Save phone number" button tap
   */
  const handleSavePhoneNumber = async () => {
    const user = auth.currentUser;
    if (!user) {
      console.error("[StayInLoopModal] No user signed in when saving phone");
      onDismiss();
      return;
    }

    if (!isValidPhoneNumber()) {
      return; // Button should be disabled, but guard anyway
    }

    setLoading("sms");

    try {
      const e164Phone = getE164PhoneNumber(phoneNumber);

      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        smsSubscribed: true,
        phoneNumber: e164Phone,
        consentUpdatedAt: serverTimestamp(),
        hasSeenStayInLoop: true,
      }, { merge: true });

      console.log("[StayInLoopModal] SMS consent saved:", {
        userId: user.uid,
        smsSubscribed: true,
        phoneNumber: e164Phone,
      });

      onDismiss();
    } catch (error) {
      console.error("[StayInLoopModal] Error saving phone number:", {
        error,
        userId: user.uid,
      });
      onDismiss();
    } finally {
      setLoading(null);
    }
  };

  /**
   * Handle "Not now" link tap - close without action
   */
  const handleNotNow = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
          hasSeenStayInLoop: true,
          consentUpdatedAt: serverTimestamp(),
        }, { merge: true });

        console.log("[StayInLoopModal] Modal dismissed with Not Now");
      } catch (error) {
        console.error("[StayInLoopModal] Error marking modal seen:", error);
      }
    }
    onDismiss();
  };

  /**
   * Handle back from phone input to main step
   */
  const handleBackToMain = () => {
    setStep("main");
    setPhoneNumber("");
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  // Render main step: notifications + SMS buttons
  const renderMainStep = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="notifications" size={32} color={EARTH_GREEN} />
        <Text style={styles.title}>Stay in the loop</Text>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.bodyText}>
          Get helpful reminders (weather changes, trip prep nudges, and the occasional update). You can change this anytime in Settings.
        </Text>

        {/* Push notification warning if already denied */}
        {pushDeniedByOS && (
          <Pressable style={styles.warningBox} onPress={openSettings}>
            <Ionicons name="warning-outline" size={18} color="#B45309" />
            <Text style={styles.warningText}>
              Notifications are off in iOS Settings. Tap to open Settings.
            </Text>
          </Pressable>
        )}

        {/* Push success message */}
        {pushSuccess && (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={18} color={EARTH_GREEN} />
            <Text style={styles.successText}>
              Notifications enabled!
            </Text>
          </View>
        )}
      </View>

      {/* Buttons */}
      <View style={styles.buttonsContainer}>
        {/* Primary: Enable push notifications */}
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            (loading === "push" || pushSuccess) && styles.buttonDisabled,
          ]}
          onPress={handleTurnOnNotifications}
          disabled={loading === "push" || pushSuccess}
        >
          {loading === "push" ? (
            <ActivityIndicator size="small" color={PARCHMENT} />
          ) : (
            <>
              <Ionicons name="notifications" size={20} color={PARCHMENT} style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>
                {pushSuccess ? "Notifications enabled" : "Enable push notifications"}
              </Text>
            </>
          )}
        </Pressable>

        {/* Secondary: Enable text reminders */}
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleTextMeReminders}
          disabled={loading !== null}
        >
          <Ionicons name="chatbubble-outline" size={20} color={EARTH_GREEN} style={{ marginRight: 8 }} />
          <Text style={styles.secondaryButtonText}>Enable text reminders</Text>
        </Pressable>

        {/* Tertiary: Not now */}
        <Pressable
          style={({ pressed }) => [
            styles.tertiaryButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleNotNow}
          disabled={loading !== null}
        >
          <Text style={styles.tertiaryButtonText}>Not now</Text>
        </Pressable>
      </View>
    </>
  );

  // Render phone input step
  const renderPhoneInputStep = () => (
    <>
      {/* Header with back button */}
      <View style={styles.header}>
        <Pressable onPress={handleBackToMain} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={DEEP_FOREST} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.title}>Text reminders</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.bodyText}>
          Enter your phone number to receive trip reminders via text message.
        </Text>

        <View style={styles.phoneInputContainer}>
          <Text style={styles.phoneLabel}>Phone number</Text>
          <TextInput
            style={styles.phoneInput}
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            placeholder="(555) 123-4567"
            placeholderTextColor={TEXT_MUTED}
            keyboardType="phone-pad"
            maxLength={14}
            autoFocus
          />
          <Text style={styles.helperText}>Standard carrier rates may apply.</Text>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonsContainer}>
        {/* Save phone number */}
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            (!isValidPhoneNumber() || loading === "sms") && styles.buttonDisabled,
          ]}
          onPress={handleSavePhoneNumber}
          disabled={!isValidPhoneNumber() || loading === "sms"}
        >
          {loading === "sms" ? (
            <ActivityIndicator size="small" color={PARCHMENT} />
          ) : (
            <Text style={styles.primaryButtonText}>Save phone number</Text>
          )}
        </Pressable>

        {/* Cancel */}
        <Pressable
          style={({ pressed }) => [
            styles.tertiaryButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleNotNow}
          disabled={loading !== null}
        >
          <Text style={styles.tertiaryButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleNotNow}
    >
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalContainer}>
          {step === "main" ? renderMainStep() : renderPhoneInputStep()}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    width: width - 48,
    maxWidth: 380,
    borderRadius: 16,
    backgroundColor: PARCHMENT,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SOFT,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontFamily: "Raleway_700Bold",
    color: DEEP_FOREST,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  bodyText: {
    fontSize: 15,
    fontFamily: "SourceSans3_400Regular",
    lineHeight: 22,
    color: TEXT_PRIMARY_STRONG,
    marginBottom: 16,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "SourceSans3_400Regular",
    color: "#B45309",
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D1FAE5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "SourceSans3_500Medium",
    color: "#065F46",
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
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: CARD_BACKGROUND_LIGHT,
    borderWidth: 1.5,
    borderColor: EARTH_GREEN,
    minHeight: 50,
  },
  secondaryButtonText: {
    color: EARTH_GREEN,
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
  phoneInputContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  phoneLabel: {
    fontSize: 14,
    fontFamily: "SourceSans3_500Medium",
    color: TEXT_MUTED,
    marginBottom: 6,
  },
  phoneInput: {
    backgroundColor: CARD_BACKGROUND_LIGHT,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "SourceSans3_400Regular",
    color: TEXT_PRIMARY_STRONG,
  },
  helperText: {
    fontSize: 12,
    fontFamily: "SourceSans3_400Regular",
    color: TEXT_MUTED,
    marginTop: 8,
  },
});
