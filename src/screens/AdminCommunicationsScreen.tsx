/**
 * Admin Communications Screen
 * Draft push notifications, home screen modals, and emails
 * Test delivery: push/modal to current device, email to alana@alanawaters.com
 */

import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert, Modal, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import { doc, setDoc, getDoc, getDocs, collection, addDoc, serverTimestamp, query, orderBy, limit } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, db } from "../config/firebase";
import ModalHeader from "../components/ModalHeader";
import Button from "../components/Button";
import {
  requestPushPermission,
  getPushPermissionStatus,
  registerPushToken,
} from "../services/notificationPreferencesService";
import {
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  EARTH_GREEN,
  DEEP_FOREST,
  DISABLED_BG,
  DISABLED_TEXT,
} from "../constants/colors";

// Test email recipient (SAFE: only sends to this address)
const TEST_EMAIL_RECIPIENT = "alana@alanawaters.com";

type ChannelTab = "push" | "modal" | "email";

type CtaMode = "url" | "subscription";

interface DraftState {
  campaignName: string;
  subjectLine: string;
  mainHeading: string;
  body: string;
  ctaLabel: string;
  ctaLink: string;
  ctaMode: CtaMode;
  microCopy: string;
}

const EMPTY_DRAFT: DraftState = {
  campaignName: "",
  subjectLine: "",
  mainHeading: "",
  body: "",
  ctaLabel: "",
  ctaLink: "",
  ctaMode: "url",
  microCopy: "",
};

// Deep link / screen options for the CTA dropdown
const DEEP_LINK_OPTIONS: Array<{ label: string; value: string; icon: string; section: string }> = [
  // Main Tabs
  { label: "Home", value: "HomeTabs", icon: "home", section: "Main Tabs" },
  { label: "Plan / My Trips", value: "HomeTabs|Plan", icon: "calendar", section: "Main Tabs" },
  { label: "Learn", value: "HomeTabs|Learn", icon: "book", section: "Main Tabs" },
  { label: "Connect / Community", value: "HomeTabs|Connect", icon: "people", section: "Main Tabs" },
  { label: "First Aid", value: "HomeTabs|FirstAid", icon: "medkit", section: "Main Tabs" },
  // Features
  { label: "Create a Trip", value: "CreateTrip", icon: "add-circle", section: "Features" },
  { label: "My Gear Closet", value: "MyGearCloset", icon: "shirt", section: "Features" },
  { label: "My Campsite Profile", value: "MyCampsite", icon: "bonfire", section: "Features" },
  { label: "My Campground", value: "MyCampground", icon: "trail-sign", section: "Features" },
  { label: "Browse Parks", value: "ParksBrowse", icon: "leaf", section: "Features" },
  { label: "Packing List", value: "PackingListCreate", icon: "checkbox", section: "Features" },
  // Learning & Badges
  { label: "Merit Badges", value: "MeritBadges", icon: "ribbon", section: "Learning" },
  { label: "My Badges", value: "MyBadges", icon: "trophy", section: "Learning" },
  // Community
  { label: "Ask a Question", value: "AskQuestion", icon: "chatbubble-ellipses", section: "Community" },
  { label: "Submit a Tip", value: "CreateTip", icon: "bulb", section: "Community" },
  { label: "Write a Gear Review", value: "CreateGearReview", icon: "star", section: "Community" },
  { label: "Share a Photo", value: "PhotoComposer", icon: "camera", section: "Community" },
  // Account
  { label: "Account / Profile", value: "Account", icon: "person-circle", section: "Account" },
  { label: "Settings", value: "Settings", icon: "settings", section: "Account" },
  { label: "Notifications", value: "Notifications", icon: "notifications", section: "Account" },
  { label: "Subscription / Paywall", value: "Paywall", icon: "card", section: "Account" },
];

export default function AdminCommunicationsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState<ChannelTab>("push");
  const [isSending, setIsSending] = useState(false);
  
  // Push debug state
  const [pushPermissionStatus, setPushPermissionStatus] = useState<string>("checking...");
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [pushSetupMessage, setPushSetupMessage] = useState<string>("");
  const [isSettingUpPush, setIsSettingUpPush] = useState(false);
  const [showDeepLinkPicker, setShowDeepLinkPicker] = useState(false);

  // Check push status on mount and when tab changes to push
  useEffect(() => {
    const checkPushStatus = async () => {
      try {
        const status = await getPushPermissionStatus();
        setPushPermissionStatus(status);

        // Check if token exists in Firestore
        const user = auth.currentUser;
        if (user) {
          const tokenDoc = await getDoc(doc(db, "pushTokens", `${user.uid}_${Platform.OS}`));
          if (tokenDoc.exists() && tokenDoc.data()?.token && !tokenDoc.data()?.disabled) {
            setPushToken(tokenDoc.data().token);
          } else {
            setPushToken(null);
          }
        }
      } catch (error) {
        console.log("[AdminComms] Error checking push status:", error);
        setPushPermissionStatus("unknown");
      }
    };

    if (activeTab === "push") {
      checkPushStatus();
    }
  }, [activeTab]);

  // Handle enable notifications button
  const handleEnableNotifications = async () => {
    setIsSettingUpPush(true);
    setPushSetupMessage("");
    
    console.log("[AdminComms] Starting push setup...");
    
    try {
      // Request permission
      console.log("[AdminComms] Requesting push permission...");
      const permStatus = await requestPushPermission();
      console.log("[AdminComms] Permission result:", permStatus);
      setPushPermissionStatus(permStatus);

      if (permStatus === "denied") {
        console.log("[AdminComms] Permission denied by user");
        setPushSetupMessage("Permission denied. Turn it on in iPhone Settings > Notifications.");
        return;
      }

      if (permStatus === "granted") {
        // Register token
        console.log("[AdminComms] Permission granted, registering token...");
        const token = await registerPushToken();
        if (token) {
          console.log("[AdminComms] Token registered:", token.substring(0, 15) + "..." + token.slice(-6));
          setPushToken(token);
          setPushSetupMessage("✓ Notifications enabled successfully!");
        } else {
          console.log("[AdminComms] Token registration returned null");
          setPushSetupMessage("Permission granted but token registration failed. Try again.");
        }
      } else {
        console.log("[AdminComms] Permission status unknown:", permStatus);
        setPushSetupMessage("Permission not granted. Please try again.");
      }
    } catch (error: any) {
      console.error("[AdminComms] Push setup error:", error);
      console.error("[AdminComms] Error message:", error?.message);
      console.error("[AdminComms] Error code:", error?.code);
      setPushSetupMessage(`Error: ${error?.message || "Unknown error. Try again."}`);
    } finally {
      setIsSettingUpPush(false);
    }
  };
  
  // Each tab has its own draft state
  const [pushDraft, setPushDraft] = useState<DraftState>({ ...EMPTY_DRAFT });
  const [modalDraft, setModalDraft] = useState<DraftState>({ ...EMPTY_DRAFT });
  const [emailDraft, setEmailDraft] = useState<DraftState>({ ...EMPTY_DRAFT });
  
  // Communications log state
  const [showLog, setShowLog] = useState(false);
  const [logEntries, setLogEntries] = useState<Array<{
    id: string;
    type: "push" | "modal" | "email";
    campaignName: string;
    sentAt: Date;
    recipientCount?: number;
  }>>([]);
  const [loadingLog, setLoadingLog] = useState(false);
  
  // Draft saving state
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaveMessage, setDraftSaveMessage] = useState("");

  // Load saved drafts on mount
  useEffect(() => {
    const loadDrafts = async () => {
      const user = auth.currentUser;
      if (!user) return;
      
      try {
        const draftsDoc = await getDoc(doc(db, "adminDrafts", user.uid));
        if (draftsDoc.exists()) {
          const data = draftsDoc.data();
          if (data.push) setPushDraft({ ...EMPTY_DRAFT, ...data.push });
          if (data.modal) setModalDraft({ ...EMPTY_DRAFT, ...data.modal });
          if (data.email) setEmailDraft({ ...EMPTY_DRAFT, ...data.email });
          console.log("[AdminComms] Loaded saved drafts");
        }
      } catch (error) {
        console.log("[AdminComms] No saved drafts or error loading:", error);
      }
    };
    
    loadDrafts();
  }, []);

  // Save all drafts to Firestore
  const saveDrafts = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be signed in to save drafts");
      return;
    }
    
    setSavingDraft(true);
    setDraftSaveMessage("");
    
    try {
      await setDoc(doc(db, "adminDrafts", user.uid), {
        push: pushDraft,
        modal: modalDraft,
        email: emailDraft,
        updatedAt: serverTimestamp(),
      });
      setDraftSaveMessage("✓ Drafts saved");
      setTimeout(() => setDraftSaveMessage(""), 3000);
    } catch (error) {
      console.error("[AdminComms] Error saving drafts:", error);
      setDraftSaveMessage("Failed to save");
    } finally {
      setSavingDraft(false);
    }
  };

  // Copy current draft to another channel
  const copyToChannel = (targetChannel: ChannelTab) => {
    const source = getCurrentDraft();
    const copyData: DraftState = {
      ...source,
      // Keep campaign name but append channel suffix if copying
      campaignName: source.campaignName ? `${source.campaignName}` : "",
    };
    
    switch (targetChannel) {
      case "push":
        setPushDraft(copyData);
        break;
      case "modal":
        setModalDraft(copyData);
        break;
      case "email":
        setEmailDraft(copyData);
        break;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied", `Content copied to ${targetChannel.charAt(0).toUpperCase() + targetChannel.slice(1)} tab`);
  };

  // Load communications log
  const loadCommunicationsLog = async () => {
    setLoadingLog(true);
    const entries: typeof logEntries = [];
    
    try {
      // Load push campaigns
      const pushQuery = query(
        collection(db, "adminPushCampaigns"),
        orderBy("sentAt", "desc"),
        limit(10)
      );
      const pushDocs = await getDocs(pushQuery);
      pushDocs.forEach((doc) => {
        const data = doc.data();
        entries.push({
          id: doc.id,
          type: "push",
          campaignName: data.campaignName || "Untitled",
          sentAt: data.sentAt?.toDate() || new Date(),
          recipientCount: data.successCount,
        });
      });

      // Load email campaigns
      const emailQuery = query(
        collection(db, "adminEmailCampaigns"),
        orderBy("sentAt", "desc"),
        limit(10)
      );
      const emailDocs = await getDocs(emailQuery);
      emailDocs.forEach((doc) => {
        const data = doc.data();
        entries.push({
          id: doc.id,
          type: "email",
          campaignName: data.campaignName || "Untitled",
          sentAt: data.sentAt?.toDate() || new Date(),
          recipientCount: data.successCount,
        });
      });

      // Load modal announcements
      const modalQuery = query(
        collection(db, "announcements"),
        limit(5)
      );
      const modalDocs = await getDocs(modalQuery);
      modalDocs.forEach((doc) => {
        const data = doc.data();
        if (data.publishedAt) {
          entries.push({
            id: doc.id,
            type: "modal",
            campaignName: data.campaignName || data.headline || "Untitled",
            sentAt: data.publishedAt?.toDate() || new Date(),
          });
        }
      });

      // Sort by date
      entries.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
      setLogEntries(entries);
    } catch (error) {
      console.error("[AdminComms] Error loading log:", error);
      Alert.alert("Error", "Failed to load communications log");
    } finally {
      setLoadingLog(false);
    }
  };

  const getCurrentDraft = (): DraftState => {
    switch (activeTab) {
      case "push": return pushDraft;
      case "modal": return modalDraft;
      case "email": return emailDraft;
      default: return pushDraft;
    }
  };

  const updateCurrentDraft = (field: keyof DraftState, value: string) => {
    // If switching to subscription mode, clear the ctaLink
    const updates: Partial<DraftState> = { [field]: value };
    if (field === "ctaMode" && value === "subscription") {
      updates.ctaLink = "";
    }
    
    switch (activeTab) {
      case "push":
        setPushDraft((prev: DraftState) => ({ ...prev, ...updates }));
        break;
      case "modal":
        setModalDraft((prev: DraftState) => ({ ...prev, ...updates }));
        break;
      case "email":
        setEmailDraft((prev: DraftState) => ({ ...prev, ...updates }));
        break;
    }
  };

  // Toggle CTA mode between url and subscription
  const toggleCtaMode = () => {
    const newMode = draft.ctaMode === "subscription" ? "url" : "subscription";
    updateCurrentDraft("ctaMode", newMode);
  };

  // Get helper text for the current channel
  const getLegalHelperText = (): string => {
    switch (activeTab) {
      case "push":
        return "Push goes only to users who opted in to notifications on their device.";
      case "modal":
        return "This message appears in-app. Keep claims accurate and avoid personal data.";
      case "email":
        return "Email must follow unsubscribe rules. Only send to users who opted in to email.";
      default:
        return "";
    }
  };

  const draft = getCurrentDraft();

  const tabs: { key: ChannelTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "push", label: "Push", icon: "notifications" },
    { key: "modal", label: "Modal", icon: "browsers" },
    { key: "email", label: "Email", icon: "mail" },
  ];

  const handleTabPress = (tab: ChannelTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const getPlaceholders = (): { heading: string; body: string; ctaLabel: string; ctaLink: string } => {
    switch (activeTab) {
      case "push":
        return {
          heading: "New Feature: Trip Sharing!",
          body: "You can now invite friends to your camping trips...",
          ctaLabel: "Open App",
          ctaLink: "HomeTabs|Plan",
        };
      case "modal":
        return {
          heading: "Welcome to Winter Camping Season!",
          body: "Check out our new winter gear guides and tips...",
          ctaLabel: "Learn More",
          ctaLink: "HomeTabs|Learn",
        };
      case "email":
        return {
          heading: "Your Weekly Camping Digest",
          body: "Here's what's new in the Tent & Lantern community...",
          ctaLabel: "Read More",
          ctaLink: "https://tentandlantern.com/blog",
        };
      default:
        return {
          heading: "New Feature: Trip Sharing!",
          body: "You can now invite friends to your camping trips...",
          ctaLabel: "Open App",
          ctaLink: "HomeTabs",
        };
    }
  };

  const placeholders = getPlaceholders();

  // Check if required fields are filled for the current tab
  const isFormValid = (): boolean => {
    const { campaignName, mainHeading, body } = draft;
    return campaignName.trim() !== "" && mainHeading.trim() !== "" && body.trim() !== "";
  };

  const canTestOrPublish = isFormValid();

  // Get test destination label for current tab
  const getTestDestination = (): string => {
    switch (activeTab) {
      case "push": return "This device";
      case "modal": return "This device";
      case "email": return TEST_EMAIL_RECIPIENT;
      default: return "This device";
    }
  };

  // Placeholder handlers for action buttons
  const onPreview = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Preview",
      `Previewing ${activeTab === "push" ? "Push Notification" : activeTab === "modal" ? "Home Screen Modal" : "Email"}\n\nCampaign: ${draft.campaignName || "(untitled)"}\nHeading: ${draft.mainHeading || placeholders.heading}`,
      [{ text: "OK" }]
    );
  };

  // Send test push notification to current admin device only
  const sendTestPush = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be signed in to send test notifications");
      return;
    }

    setIsSending(true);
    try {
      // Call the sendAdminTestPush cloud function for immediate delivery
      const functions = getFunctions();
      const sendAdminTestPush = httpsCallable(functions, "sendAdminTestPush");

      const result = await sendAdminTestPush({
        title: draft.mainHeading || placeholders.heading,
        body: draft.body || placeholders.body,
        deepLink: draft.ctaLink || placeholders.ctaLink,
        campaignName: draft.campaignName,
      });

      console.log("[Communications] Test push sent:", result.data);
      Alert.alert(
        "Test Push Sent! 🔔",
        `Your test push notification has been sent to your device.\n\nTitle: ${draft.mainHeading || placeholders.heading}`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      console.error("[Communications] Failed to send test push:", error);
      const errorDetail = error?.details || error?.message || "Unknown error";
      const errorCode = error?.code ? ` (${error.code})` : "";
      Alert.alert(
        "Error",
        `Failed to send test push${errorCode}: ${errorDetail}`,
        [{ text: "OK" }]
      );
    } finally {
      setIsSending(false);
    }
  };

  // Send test modal visible only to current admin device
  const sendTestModal = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be signed in to send test modals");
      return;
    }

    setIsSending(true);
    try {
      // Write to user-scoped test modal document
      // Only this admin's device will see it when checking adminTestModals/{uid}
      const testModalData = {
        heading: draft.mainHeading || placeholders.heading,
        body: draft.body || placeholders.body,
        ctaLabel: draft.ctaLabel || placeholders.ctaLabel,
        ctaLink: draft.ctaLink || placeholders.ctaLink,
        ctaMode: draft.ctaMode,
        campaignName: draft.campaignName,
        isActive: true,
        createdAt: serverTimestamp(),
        sentBy: user.uid,
      };

      await setDoc(doc(db, "adminTestModals", user.uid), testModalData);
      
      console.log("[Communications] Test modal created for:", user.uid);
      Alert.alert(
        "Test Modal Created",
        "Your test modal has been created. Close and reopen the app to see it on the home screen. Dismiss it to remove.",
        [{ text: "OK" }]
      );
    } catch (error: any) {
      console.error("[Communications] Failed to create test modal:", error);
      Alert.alert(
        "Error",
        `Failed to create test modal: ${error.code || error.message || "Unknown error"}`,
        [{ text: "OK" }]
      );
    } finally {
      setIsSending(false);
    }
  };

  // Send test email immediately via cloud function
  const sendTestEmail = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be signed in to send test emails");
      return;
    }

    setIsSending(true);
    try {
      // Call the sendAdminTestEmail cloud function for immediate delivery
      const functions = getFunctions();
      const sendAdminTestEmail = httpsCallable(functions, "sendAdminTestEmail");

      const result = await sendAdminTestEmail({
        toEmail: TEST_EMAIL_RECIPIENT,
        subjectLine: draft.subjectLine || `🏕️ ${draft.mainHeading || placeholders.heading}`,
        templateData: {
          firstName: "Alana",
          headline: draft.mainHeading || placeholders.heading,
          body: draft.body || placeholders.body,
          ctaText: draft.ctaLabel || placeholders.ctaLabel,
          ctaLink: draft.ctaLink || placeholders.ctaLink,
          preheader: draft.body?.substring(0, 100) || placeholders.body.substring(0, 100),
        },
        campaignName: draft.campaignName,
      });

      console.log("[Communications] Test email sent:", result.data);

      Alert.alert(
        "Test Email Sent! 📧",
        `Your test email has been sent.\n\nTo: ${TEST_EMAIL_RECIPIENT}\nSubject: ${draft.subjectLine || `🏕️ ${draft.mainHeading || placeholders.heading}`}\n\nCheck your inbox!`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      console.error("[Communications] Failed to send test email:", error);
      Alert.alert(
        "Error",
        `Failed to send test email: ${error.code || error.message || "Unknown error"}`,
        [{ text: "OK" }]
      );
    } finally {
      setIsSending(false);
    }
  };

  const onTest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const destination = getTestDestination();
    const channelName = activeTab === "push" ? "push notification" : activeTab === "modal" ? "home screen modal" : "email";
    
    Alert.alert(
      "Send Test",
      `This will send a test ${channelName} to:\n\n${destination}\n\nCampaign: ${draft.campaignName}`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Send Test", 
          onPress: async () => {
            switch (activeTab) {
              case "push":
                await sendTestPush();
                break;
              case "modal":
                await sendTestModal();
                break;
              case "email":
                await sendTestEmail();
                break;
            }
          }
        },
      ]
    );
  };

  const handlePublishEmail = async () => {
    setIsSending(true);
    try {
      const functions = getFunctions();
      const publishAdminEmail = httpsCallable(functions, "publishAdminEmail");
      
      const result = await publishAdminEmail({
        campaignName: draft.campaignName,
        subjectLine: draft.subjectLine || undefined,
        templateData: {
          headline: draft.mainHeading,
          body: draft.body,
          ctaText: draft.ctaLabel || undefined,
          ctaLink: draft.ctaMode === "subscription" 
            ? "https://apps.apple.com/us/app/complete-camping-app/id6752673528"
            : (draft.ctaLink || undefined),
          preheader: draft.body.substring(0, 100),
        },
      });

      const data = result.data as {
        success: boolean;
        status: string;
        recipientsAttemptedCount?: number;
        usersEligibleCount?: number;
        successCount?: number;
        failCount?: number;
        message: string;
      };

      if (data.status === "already_sent") {
        Alert.alert("Already Sent", data.message);
      } else if (data.success) {
        Alert.alert(
          "Campaign Published",
          `${data.message}\n\nRecipients: ${data.recipientsAttemptedCount}`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Error", data.message || "Failed to publish campaign");
      }
    } catch (error) {
      console.error("[Communications] Publish email error:", error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to publish campaign");
    } finally {
      setIsSending(false);
    }
  };

  // Publish push notification to all users with tokens
  const handlePublishPush = async () => {
    setIsSending(true);
    try {
      const functions = getFunctions();
      const publishAdminPush = httpsCallable(functions, "publishAdminPush");
      
      const result = await publishAdminPush({
        campaignName: draft.campaignName,
        title: draft.mainHeading || placeholders.heading,
        body: draft.body || placeholders.body,
        deepLink: draft.ctaLink || undefined,
        ctaMode: draft.ctaMode,
      });

      const data = result.data as {
        success: boolean;
        status: string;
        tokenCount?: number;
        attemptedCount?: number;
        successCount?: number;
        failureCount?: number;
        message: string;
      };

      if (data.status === "already_sent") {
        Alert.alert("Already Sent", data.message);
      } else if (data.success) {
        Alert.alert(
          "Push Published",
          `${data.message}\n\nDevices: ${data.attemptedCount}`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Error", data.message || "Failed to publish push");
      }
    } catch (error) {
      console.error("[Communications] Publish push error:", error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to publish push");
    } finally {
      setIsSending(false);
    }
  };

  // Publish modal announcement to all users
  const handlePublishModal = async () => {
    setIsSending(true);
    try {
      const functions = getFunctions();
      const publishAdminModal = httpsCallable(functions, "publishAdminModal");
      
      const result = await publishAdminModal({
        campaignName: draft.campaignName,
        headline: draft.mainHeading || placeholders.heading,
        body: draft.body || placeholders.body,
        microCopy: draft.microCopy || "",
        ctaText: draft.ctaLabel || placeholders.ctaLabel,
        ctaMode: draft.ctaMode === "subscription" ? "subscription" : (draft.ctaLink ? "url" : "none"),
        ctaLink: draft.ctaLink || undefined,
      });

      const data = result.data as {
        success: boolean;
        status: string;
        versionId?: string;
        message: string;
      };

      if (data.success) {
        Alert.alert(
          "Modal Published",
          `${data.message}`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Error", data.message || "Failed to publish modal");
      }
    } catch (error) {
      console.error("[Communications] Publish modal error:", error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to publish modal");
    } finally {
      setIsSending(false);
    }
  };

  const onPublish = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Publish Campaign",
      `Are you sure you want to publish this ${activeTab === "push" ? "push notification" : activeTab === "modal" ? "modal" : "email"} to all users?\n\nCampaign: ${draft.campaignName}`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Publish", 
          style: "destructive", 
          onPress: () => {
            if (activeTab === "email") {
              handlePublishEmail();
            } else if (activeTab === "push") {
              handlePublishPush();
            } else if (activeTab === "modal") {
              handlePublishModal();
            }
          } 
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: PARCHMENT }}>
      <ModalHeader title="Communications" showTitle />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ padding: 16, paddingBottom: 200 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Text
            style={{ 
              fontFamily: "SourceSans3_400Regular", 
              color: TEXT_SECONDARY,
              fontSize: 14,
              marginBottom: 16,
            }}
          >
            Push, Modal & Email
          </Text>

          {/* Tab Selector */}
          <View 
            style={{ 
              flexDirection: "row", 
              backgroundColor: CARD_BACKGROUND_LIGHT, 
              borderRadius: 12, 
              padding: 4,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: BORDER_SOFT,
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => handleTabPress(tab.key)}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                    backgroundColor: isActive ? DEEP_FOREST : "transparent",
                  }}
                >
                  <Ionicons 
                    name={tab.icon} 
                    size={16} 
                    color={isActive ? "#FFFFFF" : TEXT_SECONDARY} 
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      fontFamily: isActive ? "SourceSans3_600SemiBold" : "SourceSans3_400Regular",
                      fontSize: 14,
                      color: isActive ? "#FFFFFF" : TEXT_SECONDARY,
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Form Fields */}
          <View style={{ gap: 16 }}>
            {/* Campaign Name */}
            <View>
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 14,
                  color: TEXT_PRIMARY_STRONG,
                  marginBottom: 6,
                }}
              >
                Campaign Name <Text style={{ color: TEXT_MUTED }}>(internal)</Text>
              </Text>
              <TextInput
                value={draft.campaignName}
                onChangeText={(text: string) => updateCurrentDraft("campaignName", text)}
                placeholder="e.g., Feb 2026 Feature Launch"
                placeholderTextColor={TEXT_MUTED}
                style={{
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                  borderRadius: 8,
                  padding: 12,
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 16,
                  color: TEXT_PRIMARY_STRONG,
                }}
              />
            </View>

            {/* Subject Line - Email Only */}
            {activeTab === "email" && (
              <View>
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 14,
                    color: TEXT_PRIMARY_STRONG,
                    marginBottom: 6,
                  }}
                >
                  Subject Line
                </Text>
                <TextInput
                  value={draft.subjectLine}
                  onChangeText={(text: string) => updateCurrentDraft("subjectLine", text)}
                  placeholder="e.g., 🏕️ New features just dropped!"
                  placeholderTextColor={TEXT_MUTED}
                  style={{
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    borderWidth: 1,
                    borderColor: BORDER_SOFT,
                    borderRadius: 8,
                    padding: 12,
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 16,
                    color: TEXT_PRIMARY_STRONG,
                  }}
                />
              </View>
            )}

            {/* Main Heading */}
            <View>
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 14,
                  color: TEXT_PRIMARY_STRONG,
                  marginBottom: 6,
                }}
              >
                Main Heading
              </Text>
              <TextInput
                value={draft.mainHeading}
                onChangeText={(text: string) => updateCurrentDraft("mainHeading", text)}
                placeholder={placeholders.heading}
                placeholderTextColor={TEXT_MUTED}
                style={{
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                  borderRadius: 8,
                  padding: 12,
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 16,
                  color: TEXT_PRIMARY_STRONG,
                }}
              />
            </View>

            {/* Body */}
            <View>
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 14,
                  color: TEXT_PRIMARY_STRONG,
                  marginBottom: 6,
                }}
              >
                Body
              </Text>
              <TextInput
                value={draft.body}
                onChangeText={(text: string) => updateCurrentDraft("body", text)}
                placeholder={placeholders.body}
                placeholderTextColor={TEXT_MUTED}
                multiline
                numberOfLines={4}
                blurOnSubmit={false}
                textAlignVertical="top"
                style={{
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                  borderRadius: 8,
                  padding: 12,
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 16,
                  color: TEXT_PRIMARY_STRONG,
                  minHeight: 100,
                }}
              />
            </View>

            {/* CTA Label */}
            <View>
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 14,
                  color: TEXT_PRIMARY_STRONG,
                  marginBottom: 6,
                }}
              >
                CTA Button Label
              </Text>
              <TextInput
                value={draft.ctaLabel}
                onChangeText={(text: string) => updateCurrentDraft("ctaLabel", text)}
                placeholder={placeholders.ctaLabel}
                placeholderTextColor={TEXT_MUTED}
                style={{
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                  borderRadius: 8,
                  padding: 12,
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 16,
                  color: TEXT_PRIMARY_STRONG,
                }}
              />
            </View>

            {/* CTA Mode Checkbox */}
            <Pressable
              onPress={toggleCtaMode}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: draft.ctaMode === "subscription" ? DEEP_FOREST : BORDER_SOFT,
                  backgroundColor: draft.ctaMode === "subscription" ? DEEP_FOREST : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                {draft.ctaMode === "subscription" && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
              </View>
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 15,
                  color: TEXT_PRIMARY_STRONG,
                }}
              >
                CTA opens subscription panel
              </Text>
            </Pressable>

            {/* CTA Link - only show when ctaMode is "url" */}
            {draft.ctaMode === "url" ? (
              <View>
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 14,
                    color: TEXT_PRIMARY_STRONG,
                    marginBottom: 6,
                  }}
                >
                  CTA Link / Deep Link
                </Text>
                <Pressable
                  onPress={() => setShowDeepLinkPicker(true)}
                  style={{
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    borderWidth: 1,
                    borderColor: BORDER_SOFT,
                    borderRadius: 8,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    {(() => {
                      const selected = DEEP_LINK_OPTIONS.find(o => o.value === draft.ctaLink);
                      if (selected) {
                        return (
                          <>
                            <Ionicons name={selected.icon as any} size={18} color={EARTH_GREEN} style={{ marginRight: 8 }} />
                            <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 16, color: TEXT_PRIMARY_STRONG }}>
                              {selected.label}
                            </Text>
                          </>
                        );
                      }
                      if (draft.ctaLink) {
                        return (
                          <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 16, color: TEXT_PRIMARY_STRONG }}>
                            {draft.ctaLink}
                          </Text>
                        );
                      }
                      return (
                        <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 16, color: TEXT_MUTED }}>
                          Select a destination...
                        </Text>
                      );
                    })()}
                  </View>
                  <Ionicons name="chevron-down" size={20} color={TEXT_SECONDARY} />
                </Pressable>
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 14,
                    color: TEXT_SECONDARY,
                  }}
                >
                  Tap will open the in-app subscription offer modal.
                </Text>
              </View>
            )}
          </View>

          {/* Preview Section */}
          <View style={{ marginTop: 32 }}>
            <Text
              style={{
                fontFamily: "Raleway_700Bold",
                fontSize: 18,
                color: TEXT_PRIMARY_STRONG,
                marginBottom: 12,
              }}
            >
              Preview
            </Text>

            <View
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderWidth: 1,
                borderColor: BORDER_SOFT,
                borderRadius: 12,
                padding: 16,
              }}
            >
              {activeTab === "push" && (
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        backgroundColor: DEEP_FOREST,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 8,
                      }}
                    >
                      <Ionicons name="bonfire" size={14} color="#FFFFFF" />
                    </View>
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 12,
                        color: TEXT_SECONDARY,
                      }}
                    >
                      TENT & LANTERN
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 16,
                      color: TEXT_PRIMARY_STRONG,
                      marginBottom: 4,
                    }}
                  >
                    {draft.mainHeading || placeholders.heading}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 14,
                      color: TEXT_SECONDARY,
                    }}
                    numberOfLines={2}
                  >
                    {draft.body || placeholders.body}
                  </Text>
                  {draft.ctaMode === "subscription" && (
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 12,
                        color: TEXT_MUTED,
                        marginTop: 8,
                      }}
                    >
                      Tap opens subscription panel
                    </Text>
                  )}
                </View>
              )}

              {activeTab === "modal" && (
                <View style={{ alignItems: "center", paddingVertical: 8 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: EARTH_GREEN + "20",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons name="megaphone" size={24} color={EARTH_GREEN} />
                  </View>
                  <Text
                    style={{
                      fontFamily: "Raleway_700Bold",
                      fontSize: 18,
                      color: TEXT_PRIMARY_STRONG,
                      textAlign: "center",
                      marginBottom: 8,
                    }}
                  >
                    {draft.mainHeading || placeholders.heading}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 14,
                      color: TEXT_SECONDARY,
                      textAlign: "center",
                      marginBottom: 16,
                    }}
                  >
                    {draft.body || placeholders.body}
                  </Text>
                  <View
                    style={{
                      backgroundColor: DEEP_FOREST,
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 14,
                        color: "#FFFFFF",
                      }}
                    >
                      {draft.ctaLabel || placeholders.ctaLabel}
                    </Text>
                  </View>
                  {draft.ctaMode === "subscription" && (
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 12,
                        color: TEXT_MUTED,
                        marginTop: 8,
                      }}
                    >
                      Opens subscription panel
                    </Text>
                  )}
                </View>
              )}

              {activeTab === "email" && (
                <View>
                  <View
                    style={{
                      backgroundColor: DEEP_FOREST,
                      padding: 16,
                      marginHorizontal: -16,
                      marginTop: -16,
                      borderTopLeftRadius: 11,
                      borderTopRightRadius: 11,
                      marginBottom: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Raleway_700Bold",
                        fontSize: 16,
                        color: "#FFFFFF",
                        textAlign: "center",
                      }}
                    >
                      Tent & Lantern
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_700Bold",
                      fontSize: 20,
                      color: TEXT_PRIMARY_STRONG,
                      marginBottom: 12,
                    }}
                  >
                    {draft.mainHeading || placeholders.heading}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 14,
                      color: TEXT_SECONDARY,
                      marginBottom: 16,
                      lineHeight: 20,
                    }}
                  >
                    {draft.body || placeholders.body}
                  </Text>
                  <View
                    style={{
                      backgroundColor: EARTH_GREEN,
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 6,
                      alignSelf: "flex-start",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 14,
                        color: "#FFFFFF",
                      }}
                    >
                      {draft.ctaLabel || placeholders.ctaLabel}
                    </Text>
                  </View>
                  {draft.ctaMode === "subscription" && (
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 12,
                        color: TEXT_MUTED,
                        marginTop: 8,
                      }}
                    >
                      Opens subscription panel
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Micro / Helper Copy Field */}
          <View style={{ marginTop: 24 }}>
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 14,
                color: TEXT_PRIMARY_STRONG,
                marginBottom: 6,
              }}
            >
              Micro / Helper Copy <Text style={{ color: TEXT_MUTED }}>(optional)</Text>
            </Text>
            <TextInput
              value={draft.microCopy}
              onChangeText={(text: string) => updateCurrentDraft("microCopy", text)}
              placeholder={getLegalHelperText()}
              placeholderTextColor={TEXT_MUTED}
              multiline
              numberOfLines={2}
              blurOnSubmit={false}
              textAlignVertical="top"
              style={{
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderWidth: 1,
                borderColor: BORDER_SOFT,
                borderRadius: 8,
                padding: 12,
                fontFamily: "SourceSans3_400Regular",
                fontSize: 14,
                color: TEXT_PRIMARY_STRONG,
                minHeight: 60,
              }}
            />
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 12,
                color: TEXT_MUTED,
                marginTop: 4,
              }}
            >
              Small print, disclaimers, or legal terms shown below the CTA.
            </Text>
          </View>

          {/* Copy to Other Channels */}
          <View style={{ marginTop: 24 }}>
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 14,
                color: TEXT_PRIMARY_STRONG,
                marginBottom: 8,
              }}
            >
              Copy to Other Channels
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {activeTab !== "push" && (
                <Pressable
                  onPress={() => copyToChannel("push")}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    borderWidth: 1,
                    borderColor: BORDER_SOFT,
                    borderRadius: 8,
                  }}
                >
                  <Ionicons name="notifications-outline" size={16} color={TEXT_SECONDARY} />
                  <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_SECONDARY, marginLeft: 6 }}>
                    Push
                  </Text>
                </Pressable>
              )}
              {activeTab !== "modal" && (
                <Pressable
                  onPress={() => copyToChannel("modal")}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    borderWidth: 1,
                    borderColor: BORDER_SOFT,
                    borderRadius: 8,
                  }}
                >
                  <Ionicons name="browsers-outline" size={16} color={TEXT_SECONDARY} />
                  <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_SECONDARY, marginLeft: 6 }}>
                    Modal
                  </Text>
                </Pressable>
              )}
              {activeTab !== "email" && (
                <Pressable
                  onPress={() => copyToChannel("email")}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    borderWidth: 1,
                    borderColor: BORDER_SOFT,
                    borderRadius: 8,
                  }}
                >
                  <Ionicons name="mail-outline" size={16} color={TEXT_SECONDARY} />
                  <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_SECONDARY, marginLeft: 6 }}>
                    Email
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Draft Save & Log */}
          <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Pressable
                onPress={saveDrafts}
                disabled={savingDraft}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderWidth: 1,
                  borderColor: BORDER_SOFT,
                  borderRadius: 6,
                }}
              >
                <Ionicons name="save-outline" size={16} color={savingDraft ? TEXT_MUTED : EARTH_GREEN} />
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: savingDraft ? TEXT_MUTED : TEXT_PRIMARY_STRONG, marginLeft: 6 }}>
                  {savingDraft ? "Saving..." : "Save Drafts"}
                </Text>
              </Pressable>
              {draftSaveMessage ? (
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: EARTH_GREEN, marginLeft: 8 }}>
                  {draftSaveMessage}
                </Text>
              ) : null}
            </View>
            
            <Pressable
              onPress={() => {
                setShowLog(!showLog);
                if (!showLog && logEntries.length === 0) {
                  loadCommunicationsLog();
                }
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
                paddingHorizontal: 12,
              }}
            >
              <Ionicons name="time-outline" size={16} color={TEXT_SECONDARY} />
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_SECONDARY, marginLeft: 6 }}>
                {showLog ? "Hide Log" : "View Log"}
              </Text>
            </Pressable>
          </View>

          {/* Communications Log */}
          {showLog && (
            <View style={{ marginTop: 12, backgroundColor: CARD_BACKGROUND_LIGHT, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: BORDER_SOFT }}>
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: TEXT_PRIMARY_STRONG, marginBottom: 12 }}>
                Recent Communications
              </Text>
              {loadingLog ? (
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_MUTED, textAlign: "center", paddingVertical: 16 }}>
                  Loading...
                </Text>
              ) : logEntries.length === 0 ? (
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_MUTED, textAlign: "center", paddingVertical: 16 }}>
                  No communications sent yet
                </Text>
              ) : (
                logEntries.map((entry) => (
                  <View key={entry.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER_SOFT }}>
                    <Ionicons
                      name={entry.type === "push" ? "notifications" : entry.type === "modal" ? "browsers" : "mail"}
                      size={16}
                      color={TEXT_SECONDARY}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_PRIMARY_STRONG }}>
                        {entry.campaignName}
                      </Text>
                      <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 11, color: TEXT_MUTED }}>
                        {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)} • {entry.sentAt.toLocaleDateString()}{entry.recipientCount ? ` • ${entry.recipientCount} recipients` : ""}
                      </Text>
                    </View>
                  </View>
                ))
              )}
              <Pressable
                onPress={loadCommunicationsLog}
                style={{ alignItems: "center", paddingTop: 12 }}
              >
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: EARTH_GREEN }}>
                  Refresh
                </Text>
              </Pressable>
            </View>
          )}

          {/* Push Setup Card - Push tab only */}
          {activeTab === "push" && (
            <View
              style={{
                marginTop: 24,
                backgroundColor: CARD_BACKGROUND_LIGHT,
                borderWidth: 1,
                borderColor: BORDER_SOFT,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Ionicons name="notifications" size={20} color={EARTH_GREEN} />
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 15,
                    color: TEXT_PRIMARY_STRONG,
                    marginLeft: 8,
                  }}
                >
                  Push Setup (Admin Debug)
                </Text>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_SECONDARY }}>
                  Permission: <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: pushPermissionStatus === "granted" ? EARTH_GREEN : TEXT_PRIMARY_STRONG }}>{pushPermissionStatus}</Text>
                </Text>
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_SECONDARY, marginTop: 4 }}>
                  Token: <Text style={{ fontFamily: "SourceSans3_600SemiBold", color: pushToken ? EARTH_GREEN : TEXT_MUTED }}>
                    {pushToken ? `${pushToken.substring(0, 10)}...${pushToken.slice(-6)}` : "missing"}
                  </Text>
                </Text>
              </View>

              {pushSetupMessage ? (
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 12,
                    color: pushSetupMessage.startsWith("✓") ? EARTH_GREEN : "#B45309",
                    marginBottom: 12,
                  }}
                >
                  {pushSetupMessage}
                </Text>
              ) : null}

              {/* Build Identity Info */}
              <View style={{ marginBottom: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER_SOFT }}>
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 11, color: TEXT_MUTED }}>
                  Bundle: {Constants.expoConfig?.ios?.bundleIdentifier || "unknown"}
                </Text>
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 11, color: TEXT_MUTED }}>
                  Build: {Constants.appOwnership || "standalone"}
                </Text>
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 11, color: TEXT_MUTED }}>
                  Project: {Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || "unknown"}
                </Text>
              </View>

              <Pressable
                onPress={handleEnableNotifications}
                disabled={isSettingUpPush}
                style={{
                  backgroundColor: isSettingUpPush ? DISABLED_BG : DEEP_FOREST,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 14,
                    color: isSettingUpPush ? DISABLED_TEXT : "#FFFFFF",
                  }}
                >
                  {isSettingUpPush ? "Setting up..." : "Enable Notifications on This Phone"}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action Bar */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: PARCHMENT,
          borderTopWidth: 1,
          borderTopColor: BORDER_SOFT,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          flexDirection: "row",
          gap: 10,
        }}
      >
        {/* Preview Button - least emphasis (secondary/outline) */}
        <View style={{ flex: 1 }}>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onPress={onPreview}
          >
            Preview
          </Button>
        </View>

        {/* Test Button - primary dark style */}
        <View style={{ flex: 1 }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={onTest}
            disabled={!canTestOrPublish || isSending}
            loading={isSending}
          >
            {isSending ? "..." : "Test"}
          </Button>
        </View>

        {/* Publish Button - primary style (strongest CTA) */}
        <View style={{ flex: 1 }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={onPublish}
            disabled={!canTestOrPublish}
          >
            Publish
          </Button>
        </View>
      </View>

      {/* Deep Link Picker Modal */}
      <Modal
        visible={showDeepLinkPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDeepLinkPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: PARCHMENT }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: BORDER_SOFT,
            }}
          >
            <Text
              style={{
                fontFamily: "Raleway_700Bold",
                fontSize: 18,
                color: TEXT_PRIMARY_STRONG,
              }}
            >
              Select Destination
            </Text>
            <Pressable
              onPress={() => setShowDeepLinkPicker(false)}
              hitSlop={12}
            >
              <Ionicons name="close-circle" size={28} color={TEXT_SECONDARY} />
            </Pressable>
          </View>

          <FlatList
            data={(() => {
              // Group options by section
              const sections: Array<{ type: "header"; section: string } | { type: "option"; option: typeof DEEP_LINK_OPTIONS[0] }> = [];
              let lastSection = "";
              for (const opt of DEEP_LINK_OPTIONS) {
                if (opt.section !== lastSection) {
                  sections.push({ type: "header", section: opt.section });
                  lastSection = opt.section;
                }
                sections.push({ type: "option", option: opt });
              }
              return sections;
            })()}
            keyExtractor={(item, idx) => item.type === "header" ? `h-${item.section}` : `o-${(item as any).option.value}-${idx}`}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => {
              if (item.type === "header") {
                return (
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 12,
                      color: TEXT_MUTED,
                      letterSpacing: 0.8,
                      paddingHorizontal: 16,
                      paddingTop: 20,
                      paddingBottom: 6,
                    }}
                  >
                    {item.section.toUpperCase()}
                  </Text>
                );
              }
              const opt = item.option;
              const isSelected = draft.ctaLink === opt.value;
              return (
                <Pressable
                  onPress={() => {
                    updateCurrentDraft("ctaLink", opt.value);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowDeepLinkPicker(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    backgroundColor: isSelected ? EARTH_GREEN + "10" : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: isSelected ? EARTH_GREEN + "20" : CARD_BACKGROUND_LIGHT,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={18}
                      color={isSelected ? EARTH_GREEN : TEXT_SECONDARY}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 16,
                        color: isSelected ? EARTH_GREEN : TEXT_PRIMARY_STRONG,
                      }}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 12,
                        color: TEXT_MUTED,
                        marginTop: 1,
                      }}
                    >
                      {opt.value}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={EARTH_GREEN} />
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}
