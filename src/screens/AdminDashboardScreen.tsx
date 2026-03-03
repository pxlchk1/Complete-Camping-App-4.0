/**
 * Admin Dashboard Screen
 * Central hub for all admin functions
 */

import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { db } from "../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import ModalHeader from "../components/ModalHeader";
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
    {
      id: "communications",
      title: "Communications",
      subtitle: "Push, Modal & Email drafts",
      icon: "megaphone" as const,
      screen: "AdminCommunications" as const,
      color: "#00897B",
    },
  ];

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
        </View>
      </ScrollView>
    </View>
  );
}
