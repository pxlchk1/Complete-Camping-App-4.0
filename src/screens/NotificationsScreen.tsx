/**
 * Notifications Screen
 * Manages push notification preferences
 * Uses notificationService for comprehensive notification management
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { auth, db } from "../config/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import ModalHeader from "../components/ModalHeader";
import {
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  EARTH_GREEN,
  DEEP_FOREST,
  RUST,
  RUST_ORANGE,
} from "../constants/colors";
import {
  getNotificationStatus,
  requestNotificationPermission,
  registerPushToken,
  unregisterPushTokens,
  getNotificationPreferences,
  saveNotificationPreferences,
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "../services/notificationService";
import { Ionicons } from "@expo/vector-icons";

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [updating, setUpdating] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>("undetermined");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check permission status
      const status = await getNotificationStatus();
      setPermissionStatus(status.permissionStatus);

      // Load preferences
      const prefs = await getNotificationPreferences(user.uid);
      setPreferences(prefs);
    } catch (error) {
      console.error("[Notifications] Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMasterToggle = async (value: boolean) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be signed in to manage notifications");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (value) {
      await enableNotifications(user.uid);
    } else {
      await disableNotifications(user.uid);
    }
  };

  const enableNotifications = async (userId: string) => {
    try {
      setUpdating(true);

      // Check device support
      const status = await getNotificationStatus();
      if (!status.isDevice) {
        Alert.alert(
          "Not Available",
          "Push notifications are not available on simulators/emulators."
        );
        setUpdating(false);
        return;
      }

      // Request permission
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          "Permission Denied",
          "Please enable notifications in your device settings to receive updates."
        );
        setUpdating(false);
        return;
      }

      // Register push token
      await registerPushToken(userId);

      // Update preferences
      const newPrefs = { ...preferences, enabled: true };
      await saveNotificationPreferences(userId, { enabled: true });

      // Update user document
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        notificationsEnabled: true,
        updatedAt: serverTimestamp(),
      });

      setPreferences(newPrefs);
      setPermissionStatus("granted");
      Alert.alert("Success", "Notifications have been enabled");
    } catch (error: any) {
      console.error("[Notifications] Error enabling:", error);
      Alert.alert("Error", error.message || "Failed to enable notifications");
    } finally {
      setUpdating(false);
    }
  };

  const disableNotifications = async (userId: string) => {
    try {
      setUpdating(true);

      // Update preferences
      await saveNotificationPreferences(userId, { enabled: false });

      // Update user document
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        notificationsEnabled: false,
        updatedAt: serverTimestamp(),
      });

      // Unregister tokens
      await unregisterPushTokens(userId);

      setPreferences({ ...preferences, enabled: false });
      Alert.alert("Success", "Notifications have been disabled");
    } catch (error: any) {
      console.error("[Notifications] Error disabling:", error);
      Alert.alert("Error", error.message || "Failed to disable notifications");
    } finally {
      setUpdating(false);
    }
  };

  const handlePreferenceToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    const user = auth.currentUser;
    if (!user) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);

    try {
      await saveNotificationPreferences(user.uid, { [key]: value });
    } catch (error) {
      console.error("[Notifications] Error saving preference:", error);
      // Revert on error
      setPreferences(preferences);
    }
  };

  const toggleSection = (section: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderPreferenceRow = (
    key: keyof NotificationPreferences,
    label: string,
    description?: string
  ) => (
    <View key={key} className="flex-row items-center justify-between py-3 border-b" style={{ borderColor: BORDER_SOFT }}>
      <View className="flex-1 mr-4">
        <Text style={{ fontFamily: "SourceSans3_500Medium", color: TEXT_PRIMARY_STRONG }}>
          {label}
        </Text>
        {description && (
          <Text className="text-sm mt-0.5" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={preferences[key] as boolean}
        onValueChange={(value) => handlePreferenceToggle(key, value)}
        disabled={!preferences.enabled || updating}
        trackColor={{ false: BORDER_SOFT, true: EARTH_GREEN }}
        thumbColor={PARCHMENT}
      />
    </View>
  );

  const renderSection = (
    sectionKey: string,
    title: string,
    icon: keyof typeof Ionicons.glyphMap,
    items: { key: keyof NotificationPreferences; label: string; description?: string }[]
  ) => {
    const isExpanded = expandedSections[sectionKey];
    
    return (
      <View key={sectionKey} className="mt-4">
        <TouchableOpacity
          className="flex-row items-center justify-between p-4 rounded-xl border"
          style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
          onPress={() => toggleSection(sectionKey)}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center">
            <Ionicons name={icon} size={22} color={DEEP_FOREST} style={{ marginRight: 12 }} />
            <Text className="text-base" style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}>
              {title}
            </Text>
          </View>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={TEXT_SECONDARY} 
          />
        </TouchableOpacity>
        
        {isExpanded && (
          <View
            className="mx-2 px-4 rounded-b-xl border border-t-0"
            style={{ backgroundColor: PARCHMENT, borderColor: BORDER_SOFT }}
          >
            {items.map((item) => renderPreferenceRow(item.key, item.label, item.description))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <ModalHeader title="Notifications" showTitle />
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
      <ModalHeader title="Notifications" showTitle />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-5 pt-5">
          {/* Master Toggle */}
          <View
            className="p-4 rounded-xl border"
            style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <Text
                  className="text-lg mb-1"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Push Notifications
                </Text>
                <Text
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                >
                  Receive updates about your trips, community, and camping tips
                </Text>
              </View>
              <Switch
                value={preferences.enabled}
                onValueChange={handleMasterToggle}
                disabled={updating}
                trackColor={{ false: BORDER_SOFT, true: EARTH_GREEN }}
                thumbColor={PARCHMENT}
              />
            </View>
          </View>

          {/* Permission Warning */}
          {permissionStatus === "denied" && (
            <View className="mt-4 p-4 rounded-xl border" style={{ backgroundColor: "#FFF3E0", borderColor: RUST_ORANGE }}>
              <View className="flex-row items-center">
                <Ionicons name="warning" size={20} color={RUST_ORANGE} style={{ marginRight: 8 }} />
                <Text style={{ fontFamily: "SourceSans3_500Medium", color: RUST_ORANGE }}>
                  Notifications are disabled in settings
                </Text>
              </View>
              <Text className="mt-2 text-sm" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
                To receive notifications, please enable them in your device's Settings app.
              </Text>
            </View>
          )}

          {/* Preference Sections - only show when enabled */}
          {preferences.enabled && (
            <>
              <Text
                className="mt-6 mb-2 text-sm uppercase tracking-wide"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_SECONDARY }}
              >
                Customize Notifications
              </Text>

              {/* Trip & Planning */}
              {renderSection("trips", "Trips & Planning", "calendar-outline", [
                { key: "tripReminders", label: "Trip Reminders", description: "Notifications 3 days and 1 day before your trip" },
                { key: "leaveTimeReminders", label: "Leave Time Reminders", description: "When to leave based on drive time" },
                { key: "arrivalDayNudge", label: "Arrival Day", description: "\"You're arriving today!\" notification" },
                { key: "tripEndingReminder", label: "Trip Ending", description: "Reminder that your trip is ending" },
                { key: "postTripRecap", label: "Post-Trip Recap", description: "Reminder to add photos and notes" },
              ])}

              {/* Packing */}
              {renderSection("packing", "Packing List", "cube-outline", [
                { key: "packingListReminders", label: "Packing Reminders", description: "Remind to pack before your trip" },
                { key: "essentialsMissing", label: "Essentials Missing", description: "Alert when key categories are empty" },
                { key: "sharedPackingUpdates", label: "Shared List Updates", description: "When someone updates a shared list" },
                { key: "restockReminders", label: "Restock Reminders", description: "Consumables to restock after trip" },
              ])}

              {/* Weather & Safety */}
              {renderSection("weather", "Weather & Safety", "cloud-outline", [
                { key: "weatherAlerts", label: "Weather Alerts", description: "Rain, wind, and extreme temperatures" },
                { key: "severeWeatherWarnings", label: "Severe Weather", description: "Storms, tornado, lightning warnings" },
                { key: "freezeWarnings", label: "Freeze Warnings", description: "When overnight lows are freezing" },
                { key: "fireWeatherAlerts", label: "Fire Weather", description: "Burn bans and fire danger" },
                { key: "airQualityAlerts", label: "Air Quality", description: "Smoke and poor air quality" },
              ])}

              {/* Parks & Discovery */}
              {renderSection("parks", "Parks & Discovery", "leaf-outline", [
                { key: "parkAdvisories", label: "Park Advisories", description: "Closures for your favorite parks" },
                { key: "seasonalSuggestions", label: "Seasonal Suggestions", description: "Best time to visit recommendations" },
                { key: "nearbyParkSuggestions", label: "Nearby Parks", description: "Location-based park suggestions" },
              ])}

              {/* Community */}
              {renderSection("community", "Community", "people-outline", [
                { key: "questionAnswers", label: "Question Answers", description: "When someone answers your question" },
                { key: "commentReplies", label: "Comment Replies", description: "Replies to your comments" },
                { key: "tipEngagement", label: "Tip Engagement", description: "When your tip is featured or upvoted" },
                { key: "moderatorMessages", label: "Moderator Messages", description: "Important system messages" },
                { key: "campgroundInvites", label: "Campground Invites", description: "My Campground connection requests" },
              ])}

              {/* Account */}
              {renderSection("account", "Account", "person-outline", [
                { key: "trialReminders", label: "Trial Reminders", description: "When your trial is ending" },
                { key: "subscriptionReminders", label: "Subscription Reminders", description: "Renewal notifications" },
                { key: "paymentIssues", label: "Payment Issues", description: "Failed payment alerts" },
                { key: "featureAnnouncements", label: "Feature Announcements", description: "New Pro features" },
              ])}

              {/* Learning */}
              {renderSection("learning", "Learning", "school-outline", [
                { key: "moduleProgress", label: "Module Progress", description: "Unlocked and completed modules" },
                { key: "badgeEarned", label: "Badges Earned", description: "New badge notifications" },
              ])}

              {/* Operational */}
              {renderSection("operational", "Operational", "settings-outline", [
                { key: "permissionReminders", label: "Permission Reminders", description: "When location or notifications are off" },
              ])}
            </>
          )}

          {/* Info Footer */}
          <View className="mt-6 px-2">
            <Text
              className="text-sm text-center"
              style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
            >
              You can also manage notification permissions in your device settings.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
