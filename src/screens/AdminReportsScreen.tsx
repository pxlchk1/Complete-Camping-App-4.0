/**
 * Admin Reports Screen
 * Review and action reported content
 */

import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { db } from "../config/firebase";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc, serverTimestamp, orderBy, limit } from "firebase/firestore";
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
} from "../constants/colors";

interface Report {
  id: string;
  contentType: string;
  contentId: string;
  reason: string;
  details?: string;
  reportedBy: string;
  reportedAt: any;
  status: "pending" | "reviewed" | "dismissed";
}

export default function AdminReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const reportsRef = collection(db, "reports");
      const q = query(
        reportsRef,
        where("status", "==", "pending"),
        orderBy("reportedAt", "desc"),
        limit(50)
      );

      const snapshot = await getDocs(q);
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];

      setReports(reportsData);
    } catch (error: any) {
      console.error("Error loading reports:", error);
      // Don't show error for missing index or empty collection - just show empty state
      const errorMessage = error?.message || "";
      const isIndexError = errorMessage.includes("index") || errorMessage.includes("Index");
      const isPermissionError = errorMessage.includes("permission") || errorMessage.includes("Permission");
      
      if (!isIndexError && !isPermissionError) {
        // Only show alert for unexpected errors, not missing indexes or empty collections
        Alert.alert("Error", "Failed to load reports");
      }
      // Set empty array so UI shows empty state instead of loading forever
      setReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDismiss = async (reportId: string) => {
    try {
      await updateDoc(doc(db, "reports", reportId), {
        status: "dismissed",
        reviewedAt: serverTimestamp(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setReports(reports.filter(r => r.id !== reportId));
    } catch (error) {
      console.error("Error dismissing report:", error);
      Alert.alert("Error", "Failed to dismiss report");
    }
  };

  const handleRemoveContent = async (report: Report) => {
    Alert.alert(
      "Remove Content",
      "Are you sure you want to remove this content? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete the reported content
              const contentCollectionMap: Record<string, string> = {
                tip: "tips",
                story: "stories",
                question: "questions",
                answer: "answers",
                gearReview: "gearReviews",
                feedback: "feedbackPosts",
              };

              const collectionName = contentCollectionMap[report.contentType];
              if (collectionName) {
                await deleteDoc(doc(db, collectionName, report.contentId));
              }

              // Update report status
              await updateDoc(doc(db, "reports", report.id), {
                status: "reviewed",
                action: "content_removed",
                reviewedAt: serverTimestamp(),
              });

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setReports(reports.filter(r => r.id !== report.id));
              Alert.alert("Success", "Content removed successfully");
            } catch (error) {
              console.error("Error removing content:", error);
              Alert.alert("Error", "Failed to remove content");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
        <ModalHeader title="Reports" showTitle />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
          <Text className="mt-4" style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}>
            Loading reports...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader title="Reports" showTitle />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadReports();
            }}
            tintColor={DEEP_FOREST}
          />
        }
      >
        <View className="px-5 pt-5 pb-8">
          {reports.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Ionicons name="checkmark-circle" size={64} color={EARTH_GREEN} />
              <Text
                className="mt-4 text-center"
                style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 18, color: TEXT_PRIMARY_STRONG }}
              >
                No Pending Reports
              </Text>
              <Text
                className="mt-2 text-center"
                style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: TEXT_SECONDARY }}
              >
                All reports have been reviewed
              </Text>
            </View>
          ) : (
            reports.map((report) => (
              <View
                key={report.id}
                className="mb-4 p-4 rounded-xl border"
                style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT }}
              >
                {/* Report Header */}
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1">
                    <Text
                      className="text-base mb-1"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                    >
                      {report.contentType.charAt(0).toUpperCase() + report.contentType.slice(1)}
                    </Text>
                    <Text
                      className="text-sm"
                      style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                    >
                      Reported by: {report.reportedBy}
                    </Text>
                  </View>
                  <View
                    className="px-2 py-1 rounded"
                    style={{ backgroundColor: "#D32F2F" }}
                  >
                    <Text
                      className="text-xs"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                    >
                      PENDING
                    </Text>
                  </View>
                </View>

                {/* Report Details */}
                <View className="mb-3">
                  <Text
                    className="text-sm mb-1"
                    style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                  >
                    Reason:
                  </Text>
                  <Text
                    className="text-sm"
                    style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                  >
                    {report.reason}
                  </Text>
                </View>

                {report.details && (
                  <View className="mb-3">
                    <Text
                      className="text-sm mb-1"
                      style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
                    >
                      Additional Details:
                    </Text>
                    <Text
                      className="text-sm"
                      style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                    >
                      {report.details}
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View className="flex-row mt-3 pt-3 border-t" style={{ borderColor: BORDER_SOFT }}>
                  <Pressable
                    onPress={() => handleDismiss(report.id)}
                    className="flex-1 mr-2 p-3 rounded-xl items-center active:opacity-70"
                    style={{ backgroundColor: "#757575" }}
                  >
                    <Text
                      style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: PARCHMENT }}
                    >
                      Dismiss
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleRemoveContent(report)}
                    className="flex-1 ml-2 p-3 rounded-xl items-center active:opacity-70"
                    style={{ backgroundColor: "#D32F2F" }}
                  >
                    <Text
                      style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: PARCHMENT }}
                    >
                      Remove Content
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
