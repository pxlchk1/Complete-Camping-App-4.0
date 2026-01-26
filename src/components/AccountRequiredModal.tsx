/**
 * Account Required Modal (Updated 2026-01-01)
 * 
 * Prompts guests to create an account when attempting free-tier actions that require persistence.
 * 
 * ONLY use for: Actions that are FREE but need a logged-in user to persist data.
 * Examples: First trip creation, favorites #1-5, trip-linked packing checklist, My Campsite
 * 
 * DO NOT use for: Pro-gated features (use PaywallModal instead)
 */

import React from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  CARD_BACKGROUND_LIGHT,
} from "../constants/colors";

/**
 * Modal content for each trigger key
 */
const ACCOUNT_MODAL_CONTENT: Record<string, { title: string; body: string }> = {
  // Default
  default: {
    title: "Let's Get You Set Up",
    body: "Create a free account so we can save your activity and keep the community running smoothly. It only takes a moment.",
  },
  // First trip
  create_first_trip: {
    title: "Save Your First Trip",
    body: "Create a free account to save your trip plan and access it later.",
  },
  // Favorites
  save_favorite: {
    title: "Save Favorites",
    body: "Create a free account to save parks and campgrounds for later.",
  },
  // Packing
  packing_for_trip: {
    title: "Save Your Packing Progress",
    body: "Create a free account to track your packing list for this trip.",
  },
  // My Campsite
  my_campsite: {
    title: "Your Campsite, Saved",
    body: "Create a free account to save trips, favorites, and your camping profile.",
  },
  // Trip Plans Quick Action
  trip_plans_quick_action: {
    title: "Save Your Trips",
    body: "Create a free account to plan trips and keep everything in one place.",
  },
  // Gear Closet Quick Action
  gear_closet_quick_action: {
    title: "Save Your Gear List",
    body: "Create a free account to track your gear and reuse it for every trip.",
  },
  // My Campground Quick Action
  my_campground_quick_action: {
    title: "Your Camping People, Saved",
    body: "Create a free account to build your Campground and invite friends.",
  },
  // Ask a Camper Post
  ask_a_camper_post: {
    title: "Join the Community",
    body: "Create a free account to ask questions and help fellow campers.",
  },
  // View Shared Trip (Invited Campground Member)
  view_shared_trip: {
    title: "View Shared Trip",
    body: "Create a free account to view trips shared by your Campground friends.",
  },
};

interface AccountRequiredModalProps {
  visible: boolean;
  /** Optional close handler - defaults to no-op if not provided */
  onClose?: () => void;
  onCreateAccount?: () => void;
  onLogIn?: () => void;
  onMaybeLater?: () => void;
  /** Optional trigger key for dynamic content */
  triggerKey?: string;
}

export default function AccountRequiredModal({
  visible,
  onClose = () => {},
  onCreateAccount,
  onLogIn,
  onMaybeLater,
  triggerKey = "default",
}: AccountRequiredModalProps) {
  const content = ACCOUNT_MODAL_CONTENT[triggerKey] || ACCOUNT_MODAL_CONTENT.default;
  
  // Use onClose for dismiss actions if specific handlers not provided
  const handleCreateAccount = onCreateAccount || onClose;
  const handleMaybeLater = onMaybeLater || onClose;
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleMaybeLater}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouchable} onPress={handleMaybeLater} />
        
        <View style={styles.modalContainer}>
          <View style={styles.handle} />
          
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="person-add" size={48} color={EARTH_GREEN} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{content.title}</Text>

          {/* Message */}
          <Text style={styles.message}>{content.body}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={handleCreateAccount}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Create Account</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleCreateAccount}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Log In</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={handleMaybeLater}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: PARCHMENT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    marginBottom: 24,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontFamily: "SourceSans3_700Bold",
    fontSize: 26,
    color: TEXT_PRIMARY_STRONG,
    textAlign: "center",
    marginBottom: 16,
  },
  message: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    width: "100%",
  },
  primaryButton: {
    backgroundColor: EARTH_GREEN,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    fontFamily: "SourceSans3_700Bold",
    fontSize: 15,
    color: PARCHMENT,
  },
  loginButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: DEEP_FOREST,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: "center",
  },
  loginButtonText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 15,
    color: DEEP_FOREST,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 15,
    color: TEXT_SECONDARY,
  },
});
