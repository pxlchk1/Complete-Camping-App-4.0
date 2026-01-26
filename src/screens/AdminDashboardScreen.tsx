/**
 * Admin Dashboard Screen
 * Central hub for all admin functions
 */

import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { auth, db, functions } from "../config/firebase";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, deleteDoc, writeBatch } from "firebase/firestore";
import ModalHeader from "../components/ModalHeader";
import { seedLearningContent } from "../services/seedLearningContent";
import {
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  EARTH_GREEN,
  DEEP_FOREST,
} from "../constants/colors";

interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  pendingReports: number;
  bannedUsers: number;
}

export default function AdminDashboardScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [clearingPhotos, setClearingPhotos] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalPosts: 0,
    pendingReports: 0,
    bannedUsers: 0,
  });

  useEffect(() => {
    loadAdminStats();
  }, []);

  const loadAdminStats = async () => {
    try {
      // Load various stats from Firestore
      const usersSnapshot = await getDocs(collection(db, "users"));
      const reportsQuery = query(
        collection(db, "reports"),
        where("status", "==", "pending")
      );
      const reportsSnapshot = await getDocs(reportsQuery);

      const bannedQuery = query(
        collection(db, "users"),
        where("banned", "==", true)
      );
      const bannedSnapshot = await getDocs(bannedQuery);

      setStats({
        totalUsers: usersSnapshot.size,
        totalPosts: 0, // Can calculate from multiple collections
        pendingReports: reportsSnapshot.size,
        bannedUsers: bannedSnapshot.size,
      });
    } catch (error) {
      console.error("Error loading admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const adminActions = [
    {
      id: "review-reports",
      title: "Review Reports",
      subtitle: `${stats.pendingReports} pending`,
      icon: "flag" as const,
      screen: "AdminReports" as const,
      color: "#D32F2F",
    },
    {
      id: "review-photos",
      title: "Review Photos",
      subtitle: "Moderate community photos",
      icon: "images" as const,
      screen: "AdminPhotos" as const,
      color: EARTH_GREEN,
    },
    {
      id: "manage-users",
      title: "Manage Users",
      subtitle: `${stats.totalUsers} total users`,
      icon: "people" as const,
      screen: "AdminUsers" as const,
      color: DEEP_FOREST,
    },
    {
      id: "award-subscriptions",
      title: "Award Subscriptions",
      subtitle: "Grant premium access",
      icon: "gift" as const,
      screen: "AdminSubscriptions" as const,
      color: "#9C27B0",
    },
    {
      id: "content-moderation",
      title: "Content Moderation",
      subtitle: "Review and remove content",
      icon: "shield-checkmark" as const,
      screen: "AdminContent" as const,
      color: "#FF6F00",
    },
    {
      id: "banned-users",
      title: "Banned Users",
      subtitle: `${stats.bannedUsers} banned`,
      icon: "ban" as const,
      screen: "AdminBanned" as const,
      color: "#455A64",
    },
    {
      id: "gating-report",
      title: "Gating Report",
      subtitle: "View all access gates",
      icon: "lock-closed" as const,
      screen: "AdminGatingReport" as const,
      color: "#0288D1",
    },
  ];

  const handleSeedLearningContent = async () => {
    Alert.alert(
      "Seed Learning Content",
      "This will populate Firestore with learning tracks and modules. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Seed Content",
          onPress: async () => {
            setSeeding(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            
            try {
              const result = await seedLearningContent();
              
              if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert("Success", result.message);
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert("Error", result.message);
              }
            } catch (error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Error", error instanceof Error ? error.message : "Failed to seed content");
            } finally {
              setSeeding(false);
            }
          },
        },
      ]
    );
  };

  const handleClearAllPhotos = async () => {
    Alert.alert(
      "Clear All Photos",
      "This will permanently delete ALL photos from the photos, stories, and photoPosts collections. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All Photos",
          style: "destructive",
          onPress: async () => {
            setClearingPhotos(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            
            try {
              let totalDeleted = 0;
              let errors: string[] = [];
              
              console.log("[AdminDashboard] Starting photo cleanup...");
              
              // Delete from 'photos' collection
              const photosSnapshot = await getDocs(collection(db, "photos"));
              console.log(`[AdminDashboard] Found ${photosSnapshot.size} photos to delete`);
              for (const docSnap of photosSnapshot.docs) {
                try {
                  await deleteDoc(doc(db, "photos", docSnap.id));
                  totalDeleted++;
                  console.log(`[AdminDashboard] Deleted photo: ${docSnap.id}`);
                } catch (e) {
                  console.error(`[AdminDashboard] Failed to delete photo ${docSnap.id}:`, e);
                  errors.push(`photos/${docSnap.id}`);
                }
              }
              
              // Delete from 'stories' collection
              const storiesSnapshot = await getDocs(collection(db, "stories"));
              console.log(`[AdminDashboard] Found ${storiesSnapshot.size} stories to delete`);
              for (const docSnap of storiesSnapshot.docs) {
                try {
                  await deleteDoc(doc(db, "stories", docSnap.id));
                  totalDeleted++;
                  console.log(`[AdminDashboard] Deleted story: ${docSnap.id}`);
                } catch (e) {
                  console.error(`[AdminDashboard] Failed to delete story ${docSnap.id}:`, e);
                  errors.push(`stories/${docSnap.id}`);
                }
              }
              
              // Delete from 'photoPosts' collection
              const photoPostsSnapshot = await getDocs(collection(db, "photoPosts"));
              console.log(`[AdminDashboard] Found ${photoPostsSnapshot.size} photoPosts to delete`);
              for (const docSnap of photoPostsSnapshot.docs) {
                try {
                  await deleteDoc(doc(db, "photoPosts", docSnap.id));
                  totalDeleted++;
                  console.log(`[AdminDashboard] Deleted photoPost: ${docSnap.id}`);
                } catch (e) {
                  console.error(`[AdminDashboard] Failed to delete photoPost ${docSnap.id}:`, e);
                  errors.push(`photoPosts/${docSnap.id}`);
                }
              }
              
              console.log(`[AdminDashboard] Cleanup complete. Deleted: ${totalDeleted}, Errors: ${errors.length}`);
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              if (errors.length > 0) {
                Alert.alert(
                  "Partially Complete", 
                  `Deleted ${totalDeleted} items.\n\nFailed to delete ${errors.length} items (check console for details).`
                );
              } else {
                Alert.alert("Success", `Deleted ${totalDeleted} photos from all collections.`);
              }
            } catch (error) {
              console.error("[AdminDashboard] Clear photos error:", error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Error", error instanceof Error ? error.message : "Failed to clear photos");
            } finally {
              setClearingPhotos(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdateTentAndLanternProfile = async () => {
    Alert.alert(
      "Update @tentandlantern Profile",
      "This will set stats to:\n• 220 Trips\n• 7 Tips\n• 3 Reviews\n• 1 Question\n• 4 Photos\n\nAnd add all Merit Badges.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update Profile",
          onPress: async () => {
            setUpdatingProfile(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            
            try {
              const adminUpdateProfile = httpsCallable<
                {
                  targetUserId: string;
                  stats?: {
                    tripsCount?: number;
                    tipsCount?: number;
                    gearReviewsCount?: number;
                    questionsCount?: number;
                    photosCount?: number;
                  };
                  addBadge?: {
                    id: string;
                    name: string;
                    icon: string;
                    color: string;
                  };
                },
                { success: boolean; updated: string[] }
              >(functions, "adminUpdateProfile");

              // Target user: tentandlantern (alana@tentandlantern.com)
              const targetUserId = "CumHF5enTFQJgroqRIf72uLI9N52";

              // First update stats
              await adminUpdateProfile({
                targetUserId,
                stats: {
                  tripsCount: 220,
                  tipsCount: 7,
                  gearReviewsCount: 3,
                  questionsCount: 1,
                  photosCount: 4,
                },
              });

              // Add all badges (using approved site color palette)
              // Leave No Trace first - it's the first Learning Module everyone takes
              const badges = [
                { id: "leave-no-trace", name: "Leave No Trace", icon: "leaf", color: "#1A4C39" }, // DEEP_FOREST
                { id: "weekend-camper", name: "Weekend Camper", icon: "bonfire", color: "#92AFB1" }, // SIERRA_SKY
                { id: "trail-leader", name: "Trail Leader", icon: "compass", color: "#986C42" }, // GRANITE_GOLD
                { id: "backcountry-guide", name: "Backcountry Guide", icon: "navigate", color: "#485951" }, // EARTH_GREEN
              ];

              for (const badge of badges) {
                await adminUpdateProfile({
                  targetUserId,
                  addBadge: badge,
                });
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Success", "Profile updated with new stats and all Merit Badges!");
            } catch (error) {
              console.error("Error updating profile:", error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Error", error instanceof Error ? error.message : "Failed to update profile");
            } finally {
              setUpdatingProfile(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader title="Admin Dashboard" showTitle />

      <ScrollView className="flex-1">
        <View className="px-5 pt-5 pb-8">
          {/* Stats Cards */}
          <View className="flex-row flex-wrap mb-6">
            <View className="w-1/2 p-2">
              <View
                className="p-4 rounded-xl"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
              >
                <Text
                  className="text-3xl mb-1"
                  style={{ fontFamily: "SourceSans3_700Bold", color: TEXT_PRIMARY_STRONG }}
                >
                  {stats.totalUsers}
                </Text>
                <Text
                  className="text-sm"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                >
                  Total Users
                </Text>
              </View>
            </View>

            <View className="w-1/2 p-2">
              <View
                className="p-4 rounded-xl"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
              >
                <Text
                  className="text-3xl mb-1"
                  style={{ fontFamily: "SourceSans3_700Bold", color: "#D32F2F" }}
                >
                  {stats.pendingReports}
                </Text>
                <Text
                  className="text-sm"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                >
                  Pending Reports
                </Text>
              </View>
            </View>

            <View className="w-1/2 p-2">
              <View
                className="p-4 rounded-xl"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT }}
              >
                <Text
                  className="text-3xl mb-1"
                  style={{ fontFamily: "SourceSans3_700Bold", color: TEXT_PRIMARY_STRONG }}
                >
                  {stats.bannedUsers}
                </Text>
                <Text
                  className="text-sm"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                >
                  Banned Users
                </Text>
              </View>
            </View>
          </View>

          {/* Admin Actions */}
          <Text
            className="text-lg mb-3"
            style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
          >
            Admin Actions
          </Text>

          {adminActions.map((action) => (
            <Pressable
              key={action.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate(action.screen as any);
              }}
              className="mb-3 p-4 rounded-xl border active:opacity-70"
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
            >
              <View className="flex-row items-center">
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: action.color + "20" }}
                >
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-base mb-1"
                    style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                  >
                    {action.title}
                  </Text>
                  <Text
                    className="text-sm"
                    style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                  >
                    {action.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={TEXT_SECONDARY} />
              </View>
            </Pressable>
          ))}

          {/* Data Seeding Section */}
          <Text
            className="text-lg mb-3 mt-4"
            style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
          >
            Data Management
          </Text>

          <Pressable
            onPress={handleSeedLearningContent}
            disabled={seeding}
            className="mb-3 p-4 rounded-xl border active:opacity-70"
            style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT, opacity: seeding ? 0.7 : 1 }}
          >
            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: EARTH_GREEN + "20" }}
              >
                {seeding ? (
                  <ActivityIndicator size="small" color={EARTH_GREEN} />
                ) : (
                  <Ionicons name="book" size={24} color={EARTH_GREEN} />
                )}
              </View>
              <View className="flex-1">
                <Text
                  className="text-base mb-1"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Seed Learning Content
                </Text>
                <Text
                  className="text-sm"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                >
                  Populate tracks, modules, and quizzes
                </Text>
              </View>
              <Ionicons name="cloud-upload" size={20} color={TEXT_SECONDARY} />
            </View>
          </Pressable>

          <Pressable
            onPress={handleClearAllPhotos}
            disabled={clearingPhotos}
            className="mb-3 p-4 rounded-xl border active:opacity-70"
            style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: "#D32F2F40", opacity: clearingPhotos ? 0.7 : 1 }}
          >
            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: "#D32F2F20" }}
              >
                {clearingPhotos ? (
                  <ActivityIndicator size="small" color="#D32F2F" />
                ) : (
                  <Ionicons name="trash" size={24} color="#D32F2F" />
                )}
              </View>
              <View className="flex-1">
                <Text
                  className="text-base mb-1"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Clear All Photos
                </Text>
                <Text
                  className="text-sm"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                >
                  Delete all photos from Connect
                </Text>
              </View>
              <Ionicons name="alert-circle" size={20} color="#D32F2F" />
            </View>
          </Pressable>

          <Pressable
            onPress={handleUpdateTentAndLanternProfile}
            disabled={updatingProfile}
            className="mb-3 p-4 rounded-xl border active:opacity-70"
            style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT, opacity: updatingProfile ? 0.7 : 1 }}
          >
            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: "#9C27B020" }}
              >
                {updatingProfile ? (
                  <ActivityIndicator size="small" color="#9C27B0" />
                ) : (
                  <Ionicons name="person" size={24} color="#9C27B0" />
                )}
              </View>
              <View className="flex-1">
                <Text
                  className="text-base mb-1"
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                >
                  Update @tentandlantern
                </Text>
                <Text
                  className="text-sm"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                >
                  Set stats + Leave No Trace badge
                </Text>
              </View>
              <Ionicons name="create" size={20} color={TEXT_SECONDARY} />
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
