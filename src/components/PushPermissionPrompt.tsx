/**
 * Soft Push Permission Prompt
 * A friendly modal shown before the OS permission prompt
 * Increases opt-in rates by explaining value proposition first
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { userActionTracker } from "../services/userActionTrackerService";
import { requestPushPermission } from "../services/notificationPreferencesService";
import { trackPermissionPromptShown, trackPermissionResult } from "../services/analyticsService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface PushPermissionPromptProps {
  onComplete?: (granted: boolean) => void;
}

export const PushPermissionPrompt: React.FC<PushPermissionPromptProps> = ({
  onComplete,
}) => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const checkIfShouldShow = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const shouldShow = await userActionTracker.shouldShowPushPrompt(user.uid);
      if (shouldShow) {
        setVisible(true);
        // Track that we showed the soft prompt
        await trackPermissionPromptShown("push");
      }
    } catch (error) {
      console.error("[PushPermissionPrompt] Error checking show status:", error);
    }
  }, [user?.uid]);

  // Check if we should show the prompt
  useEffect(() => {
    checkIfShouldShow();
  }, [checkIfShouldShow]);

  const handleEnableNotifications = async () => {
    if (!user?.uid || isRequesting) return;

    setIsRequesting(true);
    try {
      // Mark soft prompt as shown
      await userActionTracker.markSoftPromptShown(user.uid);

      // Request OS permission (no userId param needed)
      const status = await requestPushPermission();
      
      // Track result
      const analyticsStatus = status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
      await trackPermissionResult("push", analyticsStatus);

      setVisible(false);
      onComplete?.(status === "granted");
    } catch (error) {
      console.error("[PushPermissionPrompt] Error requesting permission:", error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleNotNow = async () => {
    if (!user?.uid) return;

    try {
      // Mark soft prompt as shown so we don't ask again
      await userActionTracker.markSoftPromptShown(user.uid);
      await trackPermissionResult("push", "denied");
    } catch (error) {
      console.error("[PushPermissionPrompt] Error marking prompt shown:", error);
    }

    setVisible(false);
    onComplete?.(false);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleNotNow}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="notifications" size={48} color="#2E7D32" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Never miss a trip reminder! ⛺</Text>

          {/* Description */}
          <Text style={styles.description}>
            Get helpful reminders before your camping trips, weather updates, 
            and tips to make your outdoor adventures even better.
          </Text>

          {/* Benefits list */}
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
              <Text style={styles.benefitText}>Trip departure reminders</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
              <Text style={styles.benefitText}>Packing list nudges</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
              <Text style={styles.benefitText}>Weather alerts for your destination</Text>
            </View>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={styles.enableButton}
            onPress={handleEnableNotifications}
            disabled={isRequesting}
          >
            <Text style={styles.enableButtonText}>
              {isRequesting ? "Enabling..." : "Enable Notifications"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notNowButton}
            onPress={handleNotNow}
            disabled={isRequesting}
          >
            <Text style={styles.notNowText}>Not Now</Text>
          </TouchableOpacity>

          {/* Privacy note */}
          <Text style={styles.privacyNote}>
            You can change this anytime in Settings
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH - 48,
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1B1B1B",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: "#555555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  benefitsList: {
    width: "100%",
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  benefitText: {
    fontSize: 14,
    color: "#333333",
    marginLeft: 10,
  },
  enableButton: {
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  enableButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  notNowButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  notNowText: {
    color: "#666666",
    fontSize: 15,
  },
  privacyNote: {
    fontSize: 12,
    color: "#888888",
    marginTop: 8,
  },
});

export default PushPermissionPrompt;
