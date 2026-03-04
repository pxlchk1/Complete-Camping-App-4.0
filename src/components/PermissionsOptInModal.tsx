/**
 * PermissionsOptInModal
 * 
 * First-run modal shown after account creation to collect permission preferences:
 * - Push notifications
 * - Email updates opt-in
 * - SMS updates opt-in (with phone number collection)
 * 
 * Stores consent flags with timestamps in users collection.
 */

import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  Switch,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  Linking,
  ActivityIndicator,
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
  TEXT_SECONDARY,
  TEXT_MUTED,
  CARD_BACKGROUND_LIGHT,
} from "../constants/colors";

interface PermissionsOptInModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const { width } = Dimensions.get("window");

export default function PermissionsOptInModal({
  visible,
  onDismiss,
}: PermissionsOptInModalProps) {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [pushDeniedByOS, setPushDeniedByOS] = useState(false);

  // Check current notification permission status on mount
  useEffect(() => {
    if (visible) {
      checkCurrentPermissionStatus();
    }
  }, [visible]);

  const checkCurrentPermissionStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "denied") {
      setPushDeniedByOS(true);
    }
  };

  const formatPhoneNumber = (input: string): string => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, "");
    
    // Format as US phone number for display
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const getE164PhoneNumber = (input: string): string => {
    const digits = input.replace(/\D/g, "");
    // Assume US country code if 10 digits
    if (digits.length === 10) return `+1${digits}`;
    // If already includes country code
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return `+${digits}`;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
  };

  const requestPushPermission = async (): Promise<boolean> => {
    if (!Device.isDevice) {
      console.log("[PermissionsOptIn] Not a physical device, skipping push");
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

  const registerPushToken = async (userId: string): Promise<void> => {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        console.warn("[PermissionsOptIn] No project ID for push token");
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

      console.log("[PermissionsOptIn] Push token registered");
    } catch (error) {
      console.error("[PermissionsOptIn] Failed to register push token:", error);
    }
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      onDismiss();
      return;
    }

    setSaving(true);

    try {
      let pushPermissionGranted = false;

      // Request push permission if user toggled it on
      if (pushEnabled) {
        pushPermissionGranted = await requestPushPermission();
        
        // Register push token if permission granted
        if (pushPermissionGranted) {
          await registerPushToken(user.uid);
        }
      }

      // Prepare user consent data
      const consentData: Record<string, any> = {
        notificationsEnabled: pushPermissionGranted,
        emailSubscribed: emailEnabled,
        smsSubscribed: smsEnabled,
        consentUpdatedAt: serverTimestamp(),
        hasSeenPermissionsModal: true,
      };

      // Only save phone number if SMS is enabled and has valid input
      if (smsEnabled && phoneNumber) {
        const digits = phoneNumber.replace(/\D/g, "");
        if (digits.length >= 10) {
          consentData.phoneNumber = getE164PhoneNumber(phoneNumber);
        }
      }

      // Save to users collection
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, consentData, { merge: true });

      console.log("[PermissionsOptIn] Consent saved:", {
        notificationsEnabled: pushPermissionGranted,
        emailSubscribed: emailEnabled,
        smsSubscribed: smsEnabled,
      });

      onDismiss();
    } catch (error) {
      console.error("[PermissionsOptIn] Failed to save consent:", error);
      // Still dismiss on error - don't block app usage
      onDismiss();
    } finally {
      setSaving(false);
    }
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="notifications" size={28} color={EARTH_GREEN} />
            <Text style={styles.title}>Stay in the loop</Text>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.bodyText}>
              Get helpful reminders (weather changes, trip prep nudges, and the occasional update). You can change this anytime in Settings.
            </Text>

            {/* Push Notifications CTA Button */}
            <Pressable
              style={({ pressed }) => [
                styles.ctaButton,
                styles.ctaButtonPrimary,
                pressed && styles.buttonPressed,
              ]}
              onPress={async () => {
                const granted = await requestPushPermission();
                setPushEnabled(granted);
              }}
            >
              <Ionicons name="notifications-outline" size={20} color={PARCHMENT} />
              <Text style={styles.ctaButtonTextPrimary}>Enable push notifications</Text>
            </Pressable>

            {/* Show note if push notifications are denied at OS level */}
            {pushDeniedByOS && (
              <Pressable style={styles.warningBox} onPress={openSettings}>
                <Ionicons name="warning-outline" size={18} color="#B45309" />
                <Text style={styles.warningText}>
                  Notifications are off in iOS Settings. Tap to open Settings.
                </Text>
              </Pressable>
            )}

            {/* Text Reminders CTA Button */}
            {!smsEnabled ? (
              <Pressable
                style={({ pressed }) => [
                  styles.ctaButton,
                  styles.ctaButtonOutline,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => setSmsEnabled(true)}
              >
                <Ionicons name="chatbubble-outline" size={20} color={DEEP_FOREST} />
                <Text style={styles.ctaButtonTextOutline}>Enable text reminders</Text>
              </Pressable>
            ) : (
              <View style={styles.phoneSection}>
                <Text style={styles.phoneSectionTitle}>Text reminders</Text>
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
                  />
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.ctaButton,
                    styles.ctaButtonPrimary,
                    pressed && styles.buttonPressed,
                    (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 10) && styles.buttonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!phoneNumber || phoneNumber.replace(/\D/g, "").length < 10 || saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={PARCHMENT} />
                  ) : (
                    <Text style={styles.ctaButtonTextPrimary}>Save phone number</Text>
                  )}
                </Pressable>
                <Pressable onPress={() => setSmsEnabled(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            )}

            {/* Email Updates Toggle - keep simple */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabel}>
                <Ionicons name="mail-outline" size={22} color={DEEP_FOREST} />
                <Text style={styles.toggleText}>Email me updates</Text>
              </View>
              <Switch
                value={emailEnabled}
                onValueChange={setEmailEnabled}
                trackColor={{ false: BORDER_SOFT, true: EARTH_GREEN }}
                thumbColor={PARCHMENT}
                ios_backgroundColor={BORDER_SOFT}
              />
            </View>

            <Text style={styles.disclaimer}>
              These are optional. You can always update your preferences in Settings.
            </Text>
          </ScrollView>

          {/* Done Button */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              saving && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={PARCHMENT} />
            ) : (
              <Text style={styles.buttonText}>Done</Text>
            )}
          </Pressable>
        </View>
      </View>
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
    maxHeight: "80%",
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
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SOFT,
  },
  title: {
    fontSize: 22,
    fontFamily: "Raleway_700Bold",
    color: DEEP_FOREST,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  bodyText: {
    fontSize: 15,
    fontFamily: "SourceSans3_400Regular",
    lineHeight: 22,
    color: TEXT_PRIMARY_STRONG,
    marginBottom: 20,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SOFT,
  },
  toggleLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  toggleText: {
    fontSize: 16,
    fontFamily: "SourceSans3_500Medium",
    color: DEEP_FOREST,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "SourceSans3_400Regular",
    color: "#B45309",
  },
  phoneInputContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  phoneLabel: {
    fontSize: 14,
    fontFamily: "SourceSans3_500Medium",
    color: TEXT_SECONDARY,
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
  disclaimer: {
    fontSize: 13,
    fontFamily: "SourceSans3_400Regular",
    color: TEXT_MUTED,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  button: {
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 24,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: DEEP_FOREST,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: PARCHMENT,
    fontSize: 16,
    fontFamily: "SourceSans3_600SemiBold",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 12,
    minHeight: 50,
  },
  ctaButtonPrimary: {
    backgroundColor: EARTH_GREEN,
  },
  ctaButtonOutline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: DEEP_FOREST,
  },
  ctaButtonTextPrimary: {
    color: PARCHMENT,
    fontSize: 16,
    fontFamily: "SourceSans3_600SemiBold",
  },
  ctaButtonTextOutline: {
    color: DEEP_FOREST,
    fontSize: 16,
    fontFamily: "SourceSans3_600SemiBold",
  },
  phoneSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER_SOFT,
  },
  phoneSectionTitle: {
    fontSize: 16,
    fontFamily: "SourceSans3_600SemiBold",
    color: DEEP_FOREST,
    marginBottom: 8,
  },
  cancelText: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
    fontFamily: "SourceSans3_500Medium",
    color: TEXT_MUTED,
  },
});
