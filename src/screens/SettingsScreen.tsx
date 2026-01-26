/**
 * Settings Screen
 * Manages user settings for display name, handle, email preferences, privacy, etc.
 * Wired to users/{uid}, profiles/{uid}, and emailSubscribers collections
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { auth, db, storage } from "../config/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { useSubscriptionStore } from "../state/subscriptionStore";
import { restorePurchases } from "../services/subscriptionService";
import ModalHeader from "../components/ModalHeader";
import {
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  EARTH_GREEN,
  DEEP_FOREST,
  GRANITE_GOLD,
} from "../constants/colors";

// Reserved handles that cannot be used by regular users
const RESERVED_HANDLES = [
  // Brand and product
  "tentandlantern",
  "tentlantern",
  "tentandlanternapp",
  "completecampingapp",
  "completecamping",
  "thecompletecampingapp",
  "tentandlanternofficial",
  "tentandlanternhq",
  "tentandlanternteam",
  "tentandlanternsupport",

  // Variants people will try
  "tent_and_lantern",
  "tent_lantern",
  "complete_camping_app",
  "complete_camping",
  "camping_app",
  "campingapp",

  // Staff and authority impersonation
  "admin",
  "administrator",
  "root",
  "owner",
  "moderator",
  "mod",
  "staff",
  "team",
  "official",
  "support",
  "help",
  "security",
  "trust",
  "trustandsafety",
  "safety",
  "billing",
  "payments",
  "payment",
  "refund",
  "refunds",
  "subscriptions",
  "subscription",
  "premium",
  "pro",
  "plus",
  "developer",
  "dev",

  // App navigation and core features
  "plan",
  "trips",
  "trip",
  "newtrip",
  "packing",
  "packinglist",
  "packinglists",
  "gear",
  "gearcloset",
  "mygear",
  "meal",
  "meals",
  "mealplan",
  "mealplans",
  "shopping",
  "shoppinglist",
  "parks",
  "park",
  "campground",
  "campgrounds",
  "itinerary",
  "itinerarylinks",
  "links",
  "weather",
  "learn",
  "skills",
  "leavenotrace",
  "lnt",
  "connect",
  "community",
  "askacamper",
  "campfire",
  "mycampsite",
  "campsite",
  "profile",
  "account",
  "settings",
  "notifications",
  "favorites",
  "favorite",

  // System and technical words that cause confusion
  "api",
  "app",
  "system",
  "null",
  "undefined",
  "test",
  "tester",
  "demo",
  "staging",
  "production",
  "prod",
  "beta",
  "qa",

  // Messaging and contact
  "email",
  "mail",
  "sms",
  "text",
  "contact",
  "press",
  "media",
  "partnerships",
  "partners",

  // Avoid platform brand impersonation
  "apple",
  "appstore",
  "google",
  "android",
  "ios",
  "firebase",
  "revenuecat",
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isPro = useSubscriptionStore((s) => s.isPro);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoringPurchases, setRestoringPurchases] = useState(false);

  // User data
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<"unknown" | "granted" | "denied">("unknown");
  const [emailTransactionalEnabled, setEmailTransactionalEnabled] = useState(true);
  const [emailMarketingEnabled, setEmailMarketingEnabled] = useState(true);
  // Legacy - keep for backward compatibility
  const [emailSubscribed, setEmailSubscribed] = useState(false);
  const [profilePublic, setProfilePublic] = useState(true);
  const [showUsernamePublicly, setShowUsernamePublicly] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Email change modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [updatingEmail, setUpdatingEmail] = useState(false);

  // Password change modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setDisplayName(data.displayName || "");
        setHandle(data.handle || "");
        // Default to true if missing (null/undefined) - preselected ON
        setNotificationsEnabled(data.notificationsEnabled !== false);
        setNotificationPermissionStatus(data.notificationPermissionStatus || "unknown");
        // New split email preferences (with fallback to legacy emailSubscribed)
        setEmailTransactionalEnabled(data.emailTransactionalEnabled !== false);
        setEmailMarketingEnabled(data.emailMarketingEnabled !== false && data.emailSubscribed !== false);
        // Legacy field for backward compatibility
        setEmailSubscribed(data.emailSubscribed !== false);
        setProfilePublic(data.profilePublic !== false); // default true
        setShowUsernamePublicly(data.showUsernamePublicly !== false); // default true
        // Check if user is admin
        setIsAdmin(data.role === "admin" || user.email?.toLowerCase() === "alana@tentandlantern.com");
      }
    } catch (error) {
      console.error("[Settings] Error loading:", error);
      Alert.alert("Error", "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be signed in");
      return;
    }

    // Validate display name
    if (!displayName.trim()) {
      Alert.alert("Required Field", "Please enter a display name");
      return;
    }

    if (displayName.length < 1 || displayName.length > 50) {
      Alert.alert("Invalid Name", "Display name must be between 1 and 50 characters");
      return;
    }

    // Validate handle (now required)
    if (!handle.trim()) {
      Alert.alert("Required Field", "Please enter a handle");
      return;
    }

    const cleanHandle = handle.trim().toLowerCase();

    if (cleanHandle.length < 3 || cleanHandle.length > 30) {
      Alert.alert("Invalid Handle", "Handle must be between 3 and 30 characters");
      return;
    }

    if (!/^[a-z0-9_-]+$/.test(cleanHandle)) {
      Alert.alert("Invalid Handle", "Handle can only contain lowercase letters, numbers, hyphens, and underscores");
      return;
    }

    // Allow admin email to use reserved handles
    const isAdminEmail = user.email?.toLowerCase() === "alana@tentandlantern.com";
    if (RESERVED_HANDLES.includes(cleanHandle) && !isAdminEmail) {
      Alert.alert("Reserved Handle", "This handle is reserved. Please choose a different one.");
      return;
    }

    try {
      setSaving(true);

      const userRef = doc(db, "users", user.uid);

      // Check if document exists
      const userDoc = await getDoc(userRef);

      const userData = {
        displayName: displayName.trim(),
        handle: handle.trim().toLowerCase() || null,
        notificationsEnabled,
        // New split email preferences
        emailTransactionalEnabled,
        emailMarketingEnabled,
        // Legacy field for backward compatibility
        emailSubscribed: emailMarketingEnabled,
        profilePublic,
        showUsernamePublicly,
        updatedAt: serverTimestamp(),
      };

      if (userDoc.exists()) {
        // Update existing document
        await updateDoc(userRef, userData);
      } else {
        // Create new document (shouldn't normally happen, but handles edge case)
        // NOTE: Do NOT include membershipTier - it's blocked by Firestore rules on create
        // The app treats missing membershipTier as "free" tier
        await setDoc(userRef, {
          ...userData,
          email: user.email || "",
          createdAt: serverTimestamp(),
          role: "user",
          // membershipTier omitted - blocked by Firestore rules on create
        });
      }

      // Update email subscriber document (using marketing preference)
      await updateEmailSubscription(user.uid, user.email || "", emailMarketingEnabled);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Settings saved successfully");
    } catch (error: any) {
      console.error("[Settings] Error saving:", error);

      if (error.code === "permission-denied") {
        Alert.alert("Error", "You do not have permission to update these settings. Please try signing out and back in.");
      } else {
        Alert.alert("Error", error.message || "Failed to save settings");
      }
    } finally {
      setSaving(false);
    }
  };

  const updateEmailSubscription = async (userId: string, email: string, marketingEnabled: boolean) => {
    if (!email) return;

    try {
      // Use userId as document ID for easier lookups
      const emailSubRef = doc(db, "emailSubscribers", userId);
      await setDoc(emailSubRef, {
        email,
        userId,
        unsubscribed: !marketingEnabled,
        marketingUnsubscribed: !marketingEnabled,
        source: "app-settings",
        updatedAt: serverTimestamp(),
        ...(marketingEnabled ? {} : { unsubscribedAt: serverTimestamp() }),
      }, { merge: true });
    } catch (error) {
      console.error("[Settings] Error updating email subscription:", error);
      // Don't throw - this is a secondary operation
    }
  };

  // Email marketing toggle handler
  const handleEmailMarketingToggle = async (value: boolean) => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    try {
      setEmailMarketingEnabled(value);
      
      // Update users document
      await updateDoc(doc(db, "users", user.uid), {
        emailMarketingEnabled: value,
        emailSubscribed: value, // Keep legacy field in sync
        updatedAt: serverTimestamp(),
      });

      // Update emailSubscribers document
      await updateEmailSubscription(user.uid, user.email, value);

      if (value) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error: any) {
      console.error("[Settings] Error toggling email marketing:", error);
      // Revert state on error
      setEmailMarketingEnabled(!value);
      Alert.alert("Error", "Failed to update email preferences");
    }
  };

  // Transactional email toggle handler
  const handleEmailTransactionalToggle = async (value: boolean) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setEmailTransactionalEnabled(value);
      
      await updateDoc(doc(db, "users", user.uid), {
        emailTransactionalEnabled: value,
        updatedAt: serverTimestamp(),
      });

      if (value) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error: any) {
      console.error("[Settings] Error toggling transactional email:", error);
      setEmailTransactionalEnabled(!value);
      Alert.alert("Error", "Failed to update email preferences");
    }
  };

  // Legacy update function - keep for backward compatibility with handleEmailToggle
  const updateEmailSubscriptionLegacy = async (userId: string, email: string, subscribed: boolean) => {
    if (!email) return;

    try {
      const emailSubsRef = collection(db, "emailSubscribers");
      const q = query(emailSubsRef, where("userId", "==", userId));
      const existing = await getDocs(q);

      if (existing.empty) {
        // Create new subscription document
        await setDoc(doc(emailSubsRef), {
          email,
          userId,
          unsubscribed: !subscribed,
          source: "app-settings",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Update existing document
        const docRef = existing.docs[0].ref;
        await updateDoc(docRef, {
          unsubscribed: !subscribed,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("[Settings] Error updating email subscription:", error);
      // Don't throw - this is a secondary operation
    }
  };

  const handleNotificationsToggle = async (value: boolean) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      if (value) {
        // User wants to enable notifications
        // Check if OS permission is granted
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          // Request permission from OS
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus === "granted") {
          // Permission granted - get push token and save
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: "your-expo-project-id", // This will be replaced by EAS config
          });

          // Save token to pushTokens collection
          const pushTokenRef = doc(collection(db, "pushTokens"), `${user.uid}_${Platform.OS}`);
          await setDoc(pushTokenRef, {
            userId: user.uid,
            token: tokenData.data,
            platform: Platform.OS,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          // Update users document
          await updateDoc(doc(db, "users", user.uid), {
            notificationsEnabled: true,
            updatedAt: serverTimestamp(),
          });

          setNotificationsEnabled(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          // Permission denied
          await updateDoc(doc(db, "users", user.uid), {
            notificationsEnabled: false,
            updatedAt: serverTimestamp(),
          });

          setNotificationsEnabled(false);

          Alert.alert(
            "Notifications Disabled",
            "To enable notifications, please go to your device Settings and allow notifications for this app.",
            [{ text: "OK" }]
          );
        }
      } else {
        // User wants to disable notifications
        await updateDoc(doc(db, "users", user.uid), {
          notificationsEnabled: false,
          updatedAt: serverTimestamp(),
        });

        // Optionally delete push tokens
        try {
          const pushTokenRef = doc(collection(db, "pushTokens"), `${user.uid}_${Platform.OS}`);
          await updateDoc(pushTokenRef, {
            updatedAt: serverTimestamp(),
            disabled: true,
          });
        } catch (error) {
          console.log("[Settings] No push token to disable");
        }

        setNotificationsEnabled(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error: any) {
      console.error("[Settings] Error toggling notifications:", error);
      Alert.alert("Error", "Failed to update notification settings");
    }
  };

  const handleEmailToggle = async (value: boolean) => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    try {
      if (value) {
        // User wants to enable email updates
        // Upsert emailSubscribers document
        const emailSubRef = doc(db, "emailSubscribers", user.uid);
        await setDoc(
          emailSubRef,
          {
            email: user.email,
            userId: user.uid,
            unsubscribed: false,
            source: "app-settings",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Update users document
        await updateDoc(doc(db, "users", user.uid), {
          emailSubscribed: true,
          updatedAt: serverTimestamp(),
        });

        setEmailSubscribed(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // User wants to disable email updates
        // Update emailSubscribers document
        const emailSubRef = doc(db, "emailSubscribers", user.uid);
        await setDoc(
          emailSubRef,
          {
            unsubscribed: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Update users document
        await updateDoc(doc(db, "users", user.uid), {
          emailSubscribed: false,
          updatedAt: serverTimestamp(),
        });

        setEmailSubscribed(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error: any) {
      console.error("[Settings] Error toggling email:", error);
      Alert.alert("Error", "Failed to update email preferences");
    }
  };

  const handleChangeEmail = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    // Validate new email
    if (!newEmail.trim()) {
      Alert.alert("Required Field", "Please enter your new email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    if (!emailPassword.trim()) {
      Alert.alert("Required Field", "Please enter your current password to confirm");
      return;
    }

    try {
      setUpdatingEmail(true);

      // Re-authenticate user first (security requirement)
      const credential = EmailAuthProvider.credential(user.email, emailPassword);
      await reauthenticateWithCredential(user, credential);

      // Update email in Firebase Auth
      await updateEmail(user, newEmail.trim());

      // Update email in Firestore
      await updateDoc(doc(db, "users", user.uid), {
        email: newEmail.trim(),
        updatedAt: serverTimestamp(),
      });

      // Update email subscribers if they're subscribed
      if (emailSubscribed) {
        const emailSubRef = doc(db, "emailSubscribers", user.uid);
        await setDoc(
          emailSubRef,
          {
            email: newEmail.trim(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Your email has been updated successfully");

      // Close modal and reset fields
      setShowEmailModal(false);
      setNewEmail("");
      setEmailPassword("");
    } catch (error: any) {
      console.error("[Settings] Error updating email:", error);

      if (error.code === "auth/wrong-password") {
        Alert.alert("Incorrect Password", "The password you entered is incorrect");
      } else if (error.code === "auth/email-already-in-use") {
        Alert.alert("Email In Use", "This email is already being used by another account");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Invalid Email", "Please enter a valid email address");
      } else if (error.code === "auth/requires-recent-login") {
        Alert.alert("Session Expired", "Please sign out and sign back in before changing your email");
      } else {
        Alert.alert("Error", error.message || "Failed to update email. Please try again.");
      }
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    // Validate passwords
    if (!currentPassword.trim()) {
      Alert.alert("Required Field", "Please enter your current password");
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert("Required Field", "Please enter your new password");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords Don't Match", "New password and confirmation do not match");
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert("Same Password", "New password must be different from current password");
      return;
    }

    try {
      setUpdatingPassword(true);

      // Re-authenticate user first (security requirement)
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password in Firebase Auth
      await updatePassword(user, newPassword);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Your password has been updated successfully");

      // Close modal and reset fields
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("[Settings] Error updating password:", error);

      if (error.code === "auth/wrong-password") {
        Alert.alert("Incorrect Password", "The current password you entered is incorrect");
      } else if (error.code === "auth/weak-password") {
        Alert.alert("Weak Password", "Please choose a stronger password");
      } else if (error.code === "auth/requires-recent-login") {
        Alert.alert("Session Expired", "Please sign out and sign back in before changing your password");
      } else {
        Alert.alert("Error", error.message || "Failed to update password. Please try again.");
      }
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <ModalHeader title="Settings" showTitle />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
          <Text className="mt-4" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
            Loading settings...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader
        title="Settings"
        showTitle
        rightAction={{
          icon: "checkmark",
          onPress: handleSave,
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1">
          <View className="px-5 pt-5 pb-8">
            {/* Profile Section */}
            <Text
              className="text-lg mb-3"
              style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
            >
              Profile
            </Text>

            <View
              className="mb-6 p-4 rounded-xl border"
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
            >
              {/* Display Name */}
              <View className="mb-4">
                <Text
                  className="mb-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Display Name *
                </Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your name"
                  placeholderTextColor={TEXT_MUTED}
                  className="px-4 py-3 rounded-xl border"
                  style={{
                    backgroundColor: PARCHMENT,
                    borderColor: BORDER_SOFT,
                    fontFamily: "SourceSans3_400Regular",
                    color: TEXT_PRIMARY_STRONG,
                  }}
                />
              </View>

              {/* Handle */}
              <View>
                <Text
                  className="mb-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Handle *
                </Text>
                <TextInput
                  value={handle}
                  onChangeText={setHandle}
                  placeholder="username"
                  placeholderTextColor={TEXT_MUTED}
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="px-4 py-3 rounded-xl border"
                  style={{
                    backgroundColor: PARCHMENT,
                    borderColor: BORDER_SOFT,
                    fontFamily: "SourceSans3_400Regular",
                    color: TEXT_PRIMARY_STRONG,
                  }}
                />
                <Text
                  className="mt-1 text-sm"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}
                >
                  Lowercase letters, numbers, hyphens, and underscores only
                </Text>
              </View>
            </View>

            {/* Notifications Section */}
            <Text
              className="text-lg mb-3"
              style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
            >
              App Settings
            </Text>

            <View
              className="mb-6 rounded-xl border"
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
            >
              {/* Push Notifications */}
              <View className="p-4 border-b" style={{ borderColor: BORDER_SOFT }}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text
                      className="mb-1"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                    >
                      Push Notifications
                    </Text>
                    <Text
                      style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                    >
                      Trip reminders and tips
                    </Text>
                    {/* Show OS permission status message */}
                    {notificationsEnabled && notificationPermissionStatus === "denied" && (
                      <Text
                        className="mt-1"
                        style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: "#dc2626" }}
                      >
                        ⚠️ Notifications blocked in device settings. Tap to enable.
                      </Text>
                    )}
                  </View>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={handleNotificationsToggle}
                    trackColor={{ false: BORDER_SOFT, true: EARTH_GREEN }}
                    thumbColor={PARCHMENT}
                  />
                </View>
              </View>

              {/* Subscription */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate("Paywall");
                }}
                className="flex-row items-center justify-between p-4 active:opacity-70"
              >
                <View className="flex-1 mr-4">
                  <View className="flex-row items-center">
                    <Ionicons 
                      name={isPro ? "star" : "star-outline"} 
                      size={20} 
                      color={isPro ? GRANITE_GOLD : EARTH_GREEN} 
                    />
                    <Text
                      className="ml-3"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                    >
                      {isPro ? "Pro Member" : "Upgrade to Pro"}
                    </Text>
                  </View>
                  <Text
                    className="ml-8 mt-1"
                    style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                  >
                    {isPro ? "Manage your subscription" : "Unlock all premium features"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={TEXT_SECONDARY} />
              </Pressable>

              {/* Restore Purchases (shown for non-Pro users) */}
              {!isPro && (
                <Pressable
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRestoringPurchases(true);
                    try {
                      const restored = await restorePurchases();
                      if (restored) {
                        Alert.alert(
                          "Purchases Restored",
                          "Your subscription has been restored.",
                          [{ text: "OK" }]
                        );
                      } else {
                        Alert.alert(
                          "No Purchases Found",
                          "No active subscriptions were found for your account.",
                          [{ text: "OK" }]
                        );
                      }
                    } catch (error) {
                      Alert.alert("Restore Failed", "Please try again or contact support.");
                    } finally {
                      setRestoringPurchases(false);
                    }
                  }}
                  disabled={restoringPurchases}
                  className="flex-row items-center justify-between p-4 active:opacity-70"
                  style={{ opacity: restoringPurchases ? 0.5 : 1 }}
                >
                  <View className="flex-1 mr-4">
                    <View className="flex-row items-center">
                      <Ionicons name="refresh-outline" size={20} color={EARTH_GREEN} />
                      <Text
                        className="ml-3"
                        style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                      >
                        {restoringPurchases ? "Restoring..." : "Restore purchases"}
                      </Text>
                    </View>
                    <Text
                      className="ml-8 mt-1"
                      style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                    >
                      Already subscribed? Restore your access
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>

            {/* Email Section */}
            <Text
              className="text-lg mb-3"
              style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
            >
              Email Preferences
            </Text>

            <View
              className="mb-6 rounded-xl border"
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
            >
              {/* Transactional Emails */}
              <View className="p-4 border-b" style={{ borderColor: BORDER_SOFT }}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text
                      className="mb-1"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                    >
                      Trip Planning Emails
                    </Text>
                    <Text
                      style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                    >
                      Invites, trip reminders, and account notices
                    </Text>
                  </View>
                  <Switch
                    value={emailTransactionalEnabled}
                    onValueChange={handleEmailTransactionalToggle}
                    trackColor={{ false: BORDER_SOFT, true: EARTH_GREEN }}
                    thumbColor={PARCHMENT}
                  />
                </View>
              </View>

              {/* Marketing Emails */}
              <View className="p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text
                      className="mb-1"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                    >
                      Tips & Updates
                    </Text>
                    <Text
                      style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                    >
                      Product updates and gentle first-month onboarding tips
                    </Text>
                  </View>
                  <Switch
                    value={emailMarketingEnabled}
                    onValueChange={handleEmailMarketingToggle}
                    trackColor={{ false: BORDER_SOFT, true: EARTH_GREEN }}
                    thumbColor={PARCHMENT}
                  />
                </View>
              </View>
            </View>

            {/* Security Section */}
            <Text
              className="text-lg mb-3"
              style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
            >
              Security
            </Text>

            <View
              className="mb-6 rounded-xl border"
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
            >
              {/* Change Email */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowEmailModal(true);
                }}
                className="p-4 border-b active:opacity-70"
                style={{ borderColor: BORDER_SOFT }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text
                      className="mb-1"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                    >
                      Change Email
                    </Text>
                    <Text
                      style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                    >
                      {auth.currentUser?.email || "Update your email address"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={TEXT_SECONDARY} />
                </View>
              </Pressable>

              {/* Change Password */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPasswordModal(true);
                }}
                className="p-4 active:opacity-70"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text
                      className="mb-1"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                    >
                      Change Password
                    </Text>
                    <Text
                      style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                    >
                      Update your account password
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={TEXT_SECONDARY} />
                </View>
              </Pressable>
            </View>

            {/* Admin Section - Only show for admin users */}
            {isAdmin && (
              <>
                <Text
                  className="text-lg mb-3"
                  style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
                >
                  Admin
                </Text>

                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate("AdminDashboard" as any);
                  }}
                  className="mb-6 p-4 rounded-xl border active:opacity-70"
                  style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: "#D32F2F" + "20" }}
                      >
                        <Ionicons name="shield-checkmark" size={24} color="#D32F2F" />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="mb-1"
                          style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                        >
                          Admin Dashboard
                        </Text>
                        <Text
                          style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                        >
                          Manage users, content, and reports
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={TEXT_SECONDARY} />
                  </View>
                </Pressable>
              </>
            )}

            {/* Privacy Section */}
            <Text
              className="text-lg mb-3"
              style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
            >
              Privacy
            </Text>

            <View
              className="p-4 rounded-xl border"
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
            >
              {/* Public Profile */}
              <View className="mb-4 pb-4 border-b" style={{ borderColor: BORDER_SOFT }}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text
                      className="mb-1"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                    >
                      Public Profile
                    </Text>
                    <Text
                      style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                    >
                      Allow others to view your profile
                    </Text>
                  </View>
                  <Switch
                    value={profilePublic}
                    onValueChange={setProfilePublic}
                    trackColor={{ false: BORDER_SOFT, true: EARTH_GREEN }}
                    thumbColor={PARCHMENT}
                  />
                </View>
              </View>

              {/* Show Username Publicly */}
              <View>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text
                      className="mb-1"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                    >
                      Show Username Publicly
                    </Text>
                    <Text
                      style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                    >
                      Display your username on public posts
                    </Text>
                  </View>
                  <Switch
                    value={showUsernamePublicly}
                    onValueChange={setShowUsernamePublicly}
                    trackColor={{ false: BORDER_SOFT, true: EARTH_GREEN }}
                    thumbColor={PARCHMENT}
                  />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save Button */}
      {saving && (
        <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <ActivityIndicator size="large" color={PARCHMENT} />
        </View>
      )}

      {/* Email Change Modal */}
      <Modal
        visible={showEmailModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEmailModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <Pressable
            className="flex-1 justify-end"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onPress={() => !updatingEmail && setShowEmailModal(false)}
          >
            <Pressable
              className="rounded-t-3xl p-6"
              style={{ backgroundColor: PARCHMENT }}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between mb-6">
                <Text
                  className="text-2xl"
                  style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
                >
                  Change Email
                </Text>
                <Pressable
                  onPress={() => setShowEmailModal(false)}
                  disabled={updatingEmail}
                  className="w-8 h-8 items-center justify-center active:opacity-70"
                >
                  <Ionicons name="close" size={28} color={DEEP_FOREST} />
                </Pressable>
              </View>

              {/* New Email Input */}
              <View className="mb-4">
                <Text
                  className="mb-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  New Email Address
                </Text>
                <TextInput
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder="your.new.email@example.com"
                  placeholderTextColor={TEXT_MUTED}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!updatingEmail}
                  className="px-4 py-3 rounded-xl border"
                  style={{
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    borderColor: BORDER_SOFT,
                    fontFamily: "SourceSans3_400Regular",
                    color: TEXT_PRIMARY_STRONG,
                  }}
                />
              </View>

              {/* Password Confirmation */}
              <View className="mb-6">
                <Text
                  className="mb-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Current Password
                </Text>
                <TextInput
                  value={emailPassword}
                  onChangeText={setEmailPassword}
                  placeholder="Confirm with your password"
                  placeholderTextColor={TEXT_MUTED}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!updatingEmail}
                  className="px-4 py-3 rounded-xl border"
                  style={{
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    borderColor: BORDER_SOFT,
                    fontFamily: "SourceSans3_400Regular",
                    color: TEXT_PRIMARY_STRONG,
                  }}
                />
                <Text
                  className="mt-2 text-sm"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}
                >
                  For security, please enter your current password
                </Text>
              </View>

              {/* Update Button */}
              <Pressable
                onPress={handleChangeEmail}
                disabled={updatingEmail}
                className="py-3 rounded-lg items-center active:opacity-80"
                style={{ backgroundColor: EARTH_GREEN }}
              >
                {updatingEmail ? (
                  <ActivityIndicator size="small" color={PARCHMENT} />
                ) : (
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 15,
                      color: PARCHMENT,
                    }}
                  >
                    Update Email
                  </Text>
                )}
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <Pressable
            className="flex-1 justify-end"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onPress={() => !updatingPassword && setShowPasswordModal(false)}
          >
            <Pressable
              className="rounded-t-3xl p-6"
              style={{ backgroundColor: PARCHMENT }}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between mb-6">
                <Text
                  className="text-2xl"
                  style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
                >
                  Change Password
                </Text>
                <Pressable
                  onPress={() => setShowPasswordModal(false)}
                  disabled={updatingPassword}
                  className="w-8 h-8 items-center justify-center active:opacity-70"
                >
                  <Ionicons name="close" size={28} color={DEEP_FOREST} />
                </Pressable>
              </View>

              {/* Current Password */}
              <View className="mb-4">
                <Text
                  className="mb-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Current Password
                </Text>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter your current password"
                  placeholderTextColor={TEXT_MUTED}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!updatingPassword}
                  className="px-4 py-3 rounded-xl border"
                  style={{
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    borderColor: BORDER_SOFT,
                    fontFamily: "SourceSans3_400Regular",
                    color: TEXT_PRIMARY_STRONG,
                  }}
                />
              </View>

              {/* New Password */}
              <View className="mb-4">
                <Text
                  className="mb-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  New Password
                </Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter your new password"
                  placeholderTextColor={TEXT_MUTED}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!updatingPassword}
                  className="px-4 py-3 rounded-xl border"
                  style={{
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    borderColor: BORDER_SOFT,
                    fontFamily: "SourceSans3_400Regular",
                    color: TEXT_PRIMARY_STRONG,
                  }}
                />
                <Text
                  className="mt-2 text-sm"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}
                >
                  Must be at least 8 characters long
                </Text>
              </View>

              {/* Confirm New Password */}
              <View className="mb-6">
                <Text
                  className="mb-2"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Confirm New Password
                </Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your new password"
                  placeholderTextColor={TEXT_MUTED}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!updatingPassword}
                  className="px-4 py-3 rounded-xl border"
                  style={{
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    borderColor: BORDER_SOFT,
                    fontFamily: "SourceSans3_400Regular",
                    color: TEXT_PRIMARY_STRONG,
                  }}
                />
              </View>

              {/* Update Button */}
              <Pressable
                onPress={handleChangePassword}
                disabled={updatingPassword}
                className="py-3 rounded-lg items-center active:opacity-80"
                style={{ backgroundColor: EARTH_GREEN }}
              >
                {updatingPassword ? (
                  <ActivityIndicator size="small" color={PARCHMENT} />
                ) : (
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 15,
                      color: PARCHMENT,
                    }}
                  >
                    Update Password
                  </Text>
                )}
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
