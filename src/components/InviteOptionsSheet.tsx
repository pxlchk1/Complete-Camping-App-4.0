/**
 * Invite Options Sheet
 * Bottom sheet showing options to invite a camper via Email, Text, or Copy Link
 */

import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  createCampgroundInvite,
  sendCampgroundInviteEmail,
  getInviteLink,
  findPendingInviteByEmail,
} from "../services/campgroundInviteService";
import { getCopyableInviteText } from "../constants/appLinks";
import { CampgroundContact, CreateInviteResult } from "../types/campground";
import { trackBuddyInviteSent } from "../services/analyticsService";
import { trackCoreAction } from "../services/userActionTrackerService";
import {
  DEEP_FOREST,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../constants/colors";

interface InviteOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  contact: CampgroundContact;
  onSuccess?: () => void;
}

type InviteAction = "email" | "text" | "copy" | null;

export default function InviteOptionsSheet({
  visible,
  onClose,
  contact,
  onSuccess,
}: InviteOptionsSheetProps) {
  const [loading, setLoading] = useState<InviteAction>(null);
  const [inviteResult, setInviteResult] = useState<CreateInviteResult | null>(null);

  /**
   * Get or create an invite for this contact
   */
  const ensureInvite = async (): Promise<CreateInviteResult | null> => {
    // If we already have an invite result from this session, reuse it
    if (inviteResult) {
      return inviteResult;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be signed in to send invites");
      return null;
    }

    try {
      // Get inviter's name from profiles collection
      const profileDoc = await getDoc(doc(db, "profiles", user.uid));
      const profileData = profileDoc.exists() ? profileDoc.data() : null;
      
      // Use displayName from profile, fall back to Firebase Auth displayName
      const inviterName = profileData?.displayName 
        || user.displayName 
        || "A camper";

      // Check for existing pending invite
      if (contact.contactEmail) {
        const existingInvite = await findPendingInviteByEmail(user.uid, contact.contactEmail);
        if (existingInvite) {
          const result: CreateInviteResult = {
            success: true,
            inviteId: existingInvite.id,
            token: existingInvite.token,
            inviteLink: getInviteLink(existingInvite.token),
          };
          setInviteResult(result);
          return result;
        }
      }

      // Create new invite
      const result = await createCampgroundInvite({
        inviteeEmail: contact.contactEmail || undefined,
        inviteePhone: undefined, // Could add phone support later
        inviterName,
        campgroundId: user.uid, // Using user's uid as campground id for now
      });

      setInviteResult(result);
      return result;
    } catch (error: any) {
      console.error("Error creating invite:", error);
      Alert.alert("Error", error.message || "Failed to create invite");
      return null;
    }
  };

  /**
   * Handle send email invite
   */
  const handleEmailInvite = async () => {
    if (!contact.contactEmail) {
      Alert.alert("Email Required", "This contact doesn't have an email address");
      return;
    }

    const user = auth.currentUser;

    console.log("[InviteOptionsSheet] handleEmailInvite started:", {
      inviterUserId: user?.uid,
      inviteeEmail: contact.contactEmail,
      contactName: contact.name,
    });

    try {
      setLoading("email");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const invite = await ensureInvite();
      if (!invite) {
        console.error("[InviteOptionsSheet] handleEmailInvite failed - no invite created:", {
          inviterUserId: user?.uid,
          inviteeEmail: contact.contactEmail,
        });
        setLoading(null);
        return;
      }

      console.log("[InviteOptionsSheet] Invite obtained, sending email:", {
        inviteId: invite.inviteId,
        inviteeEmail: contact.contactEmail,
        campgroundId: invite.campgroundId,
      });

      // Send email via Cloud Function
      await sendCampgroundInviteEmail(invite.inviteId);

      console.log("[InviteOptionsSheet] Email sent successfully:", {
        inviteId: invite.inviteId,
        inviteeEmail: contact.contactEmail,
      });

      // Track analytics and core action
      trackBuddyInviteSent("email");
      if (user?.uid) {
        trackCoreAction(user.uid, "buddy_invited");
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Invite Sent!", `An invitation email was sent to ${contact.contactEmail}`);
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("[InviteOptionsSheet] handleEmailInvite failed:", {
        inviterUserId: user?.uid,
        inviteeEmail: contact.contactEmail,
        errorMessage: error.message,
        errorStack: error.stack,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Failed to send invite email");
    } finally {
      setLoading(null);
    }
  };

  /**
   * Handle send text invite (opens native SMS with pre-filled recipient and message)
   */
  const handleTextInvite = async () => {
    // Validate phone number exists
    if (!contact.contactPhone) {
      Alert.alert(
        "Phone Number Required",
        "This contact does not have a phone number. Please add a phone number first, or use Copy Invite Link.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      setLoading("text");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const invite = await ensureInvite();
      if (!invite) {
        setLoading(null);
        return;
      }

      // Construct the invite message
      const inviteMessage = `Join My Campground on The Complete Camping App. Here's your invite link: ${invite.inviteLink}`;

      // Format phone number (remove non-digits for SMS)
      const phoneDigits = contact.contactPhone.replace(/\D/g, "");
      
      // Construct SMS URL with recipient and body
      // iOS format: sms:+1234567890&body=message
      // Android format: sms:+1234567890?body=message
      const separator = Platform.OS === "ios" ? "&" : "?";
      const encodedMessage = encodeURIComponent(inviteMessage);
      const smsUrl = `sms:${phoneDigits}${separator}body=${encodedMessage}`;

      console.log("[InviteOptionsSheet] Opening SMS:", {
        phone: phoneDigits,
        hasInviteLink: !!invite.inviteLink,
      });

      // Check if SMS is available
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (!canOpen) {
        console.error("[InviteOptionsSheet] Cannot open SMS URL:", smsUrl);
        Alert.alert(
          "SMS Unavailable",
          "Unable to open the Messages app. Try using Copy Invite Link instead.",
          [{ text: "OK" }]
        );
        setLoading(null);
        return;
      }

      // Open native SMS composer
      await Linking.openURL(smsUrl);

      // Track analytics and core action
      const user = auth.currentUser;
      trackBuddyInviteSent("text");
      if (user?.uid) {
        trackCoreAction(user.uid, "buddy_invited");
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("[InviteOptionsSheet] Error opening SMS:", {
        error: error.message,
        phone: contact.contactPhone,
      });
      Alert.alert(
        "SMS Failed",
        "Could not open Messages. Please try Copy Invite Link instead.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(null);
    }
  };

  /**
   * Handle copy link to clipboard
   */
  const handleCopyLink = async () => {
    try {
      setLoading("copy");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const invite = await ensureInvite();
      if (!invite) {
        setLoading(null);
        return;
      }

      // Get inviter first name from profile
      const user = auth.currentUser;
      let inviterName = "A friend";
      if (user) {
        const profileDoc = await getDoc(doc(db, "profiles", user.uid));
        if (profileDoc.exists()) {
          const displayName = profileDoc.data().displayName || user.displayName || "A friend";
          // Extract first name
          inviterName = displayName.trim().split(/\s+/)[0] || "A friend";
        } else if (user.displayName) {
          inviterName = user.displayName.trim().split(/\s+/)[0] || "A friend";
        }
      }

      // Copy the formatted invite text with App Store link
      const inviteText = getCopyableInviteText(inviterName, invite.token);
      await Clipboard.setStringAsync(inviteText);

      // Track analytics and core action
      trackBuddyInviteSent("copy");
      if (user?.uid) {
        trackCoreAction(user.uid, "buddy_invited");
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Link Copied!", "Invite link copied to clipboard");
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Error copying link:", error);
      Alert.alert("Error", "Failed to copy link");
    } finally {
      setLoading(null);
    }
  };

  /**
   * Handle close without action
   */
  const handleNotNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
        <Pressable className="flex-1" onPress={onClose} />
        
        <SafeAreaView
          edges={["bottom"]}
          style={{ backgroundColor: PARCHMENT }}
          className="rounded-t-3xl"
        >
          <View className="px-5 pt-6 pb-8">
            {/* Handle */}
            <View className="self-center w-12 h-1 rounded-full mb-6" style={{ backgroundColor: BORDER_SOFT }} />

            {/* Title */}
            <Text
              className="text-xl text-center mb-2"
              style={{ fontFamily: "SourceSans3_700Bold", color: TEXT_PRIMARY_STRONG }}
            >
              Invite {contact.contactName}
            </Text>
            <Text
              className="text-center mb-6"
              style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
            >
              Choose how to send the invitation
            </Text>

            {/* Email Button */}
            <Pressable
              onPress={handleEmailInvite}
              disabled={loading !== null || !contact.contactEmail}
              className="flex-row items-center p-4 mb-3 rounded-xl active:opacity-80"
              style={{
                backgroundColor: contact.contactEmail ? DEEP_FOREST : BORDER_SOFT,
                opacity: !contact.contactEmail ? 0.5 : 1,
              }}
            >
              {loading === "email" ? (
                <ActivityIndicator size="small" color={PARCHMENT} />
              ) : (
                <Ionicons name="mail" size={24} color={PARCHMENT} />
              )}
              <View className="ml-4 flex-1">
                <Text
                  className="text-base"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                >
                  Send email invite
                </Text>
                {contact.contactEmail ? (
                  <Text
                    className="text-sm"
                    style={{ fontFamily: "SourceSans3_400Regular", color: PARCHMENT, opacity: 0.8 }}
                  >
                    {contact.contactEmail}
                  </Text>
                ) : (
                  <Text
                    className="text-sm"
                    style={{ fontFamily: "SourceSans3_400Regular", color: PARCHMENT, opacity: 0.8 }}
                  >
                    No email address
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={PARCHMENT} />
            </Pressable>

            {/* Text Button */}
            <Pressable
              onPress={handleTextInvite}
              disabled={loading !== null}
              className="flex-row items-center p-4 mb-3 rounded-xl border active:opacity-80"
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
            >
              {loading === "text" ? (
                <ActivityIndicator size="small" color={DEEP_FOREST} />
              ) : (
                <Ionicons name="chatbubble" size={24} color={DEEP_FOREST} />
              )}
              <View className="ml-4 flex-1">
                <Text
                  className="text-base"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Send text invite
                </Text>
                <Text
                  className="text-sm"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                >
                  Opens share sheet
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
            </Pressable>

            {/* Copy Link Button */}
            <Pressable
              onPress={handleCopyLink}
              disabled={loading !== null}
              className="flex-row items-center p-4 mb-6 rounded-xl border active:opacity-80"
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
            >
              {loading === "copy" ? (
                <ActivityIndicator size="small" color={DEEP_FOREST} />
              ) : (
                <Ionicons name="link" size={24} color={DEEP_FOREST} />
              )}
              <View className="ml-4 flex-1">
                <Text
                  className="text-base"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Copy invite link
                </Text>
                <Text
                  className="text-sm"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                >
                  Share manually
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
            </Pressable>

            {/* Not Now Button */}
            <Pressable
              onPress={handleNotNow}
              disabled={loading !== null}
              className="py-3 active:opacity-70"
            >
              <Text
                className="text-center"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_SECONDARY }}
              >
                Not Now
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
