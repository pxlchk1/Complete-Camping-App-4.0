/**
 * Admin User Management Screen
 * Search users, ban/unban, view user details
 */

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { db } from "../config/firebase";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
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

interface User {
  id: string;
  email: string;
  displayName: string;
  handle?: string;
  banned?: boolean;
  createdAt: string;
}

export default function AdminUsersScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert("Enter Search", "Please enter an email or handle to search");
      return;
    }

    try {
      setLoading(true);
      const usersRef = collection(db, "users");
      const lowerQuery = searchQuery.trim().toLowerCase();

      // Search by email or handle
      const emailQuery = query(usersRef, where("email", "==", lowerQuery));
      const handleQuery = query(usersRef, where("handle", "==", lowerQuery));

      const [emailSnapshot, handleSnapshot] = await Promise.all([
        getDocs(emailQuery),
        getDocs(handleQuery),
      ]);

      const results: User[] = [];
      const seenIds = new Set<string>();

      [...emailSnapshot.docs, ...handleSnapshot.docs].forEach(doc => {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          results.push({
            id: doc.id,
            ...doc.data()
          } as User);
        }
      });

      setSearchResults(results);

      if (results.length === 0) {
        Alert.alert("No results", "No users found matching your search");
      }
    } catch (error) {
      console.error("Error searching users:", error);
      Alert.alert("Error", "Failed to search users");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBan = async (user: User) => {
    const action = user.banned ? "Unban" : "Ban";
    Alert.alert(
      `${action} User`,
      `Are you sure you want to ${action.toLowerCase()} ${user.displayName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action,
          style: user.banned ? "default" : "destructive",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "users", user.id), {
                banned: !user.banned,
                bannedAt: user.banned ? null : serverTimestamp(),
              });

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Success", `User ${action.toLowerCase()}ned successfully`);

              // Refresh search results
              handleSearch();
            } catch (error) {
              console.error(`Error ${action.toLowerCase()}ning user:`, error);
              Alert.alert("Error", `Failed to ${action.toLowerCase()} user`);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader title="Manage Users" showTitle />

      <ScrollView className="flex-1">
        <View className="px-5 pt-5 pb-8">
          {/* Search Section */}
          <View className="mb-6">
            <Text
              className="mb-2"
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              Search Users
            </Text>
            <View className="flex-row">
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Email or handle"
                placeholderTextColor={TEXT_MUTED}
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 px-4 py-3 rounded-xl border mr-2"
                style={{
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderColor: BORDER_SOFT,
                  fontFamily: "SourceSans3_400Regular",
                  color: TEXT_PRIMARY_STRONG,
                }}
                onSubmitEditing={handleSearch}
              />
              <Pressable
                onPress={handleSearch}
                disabled={loading}
                className="px-4 py-3 rounded-xl items-center justify-center active:opacity-70"
                style={{ backgroundColor: DEEP_FOREST }}
              >
                {loading ? (
                  <ActivityIndicator color={PARCHMENT} size="small" />
                ) : (
                  <Ionicons name="search" size={20} color={PARCHMENT} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View>
              <Text
                className="mb-3"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
              >
                Search Results ({searchResults.length})
              </Text>

              {searchResults.map((user) => (
                <View
                  key={user.id}
                  className="mb-4 p-4 rounded-xl border"
                  style={{
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                    borderColor: user.banned ? "#D32F2F" : BORDER_SOFT,
                    borderWidth: user.banned ? 2 : 1,
                  }}
                >
                  {/* User Info */}
                  <View className="mb-3">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text
                        className="text-lg"
                        style={{ fontFamily: "SourceSans3_700Bold", color: TEXT_PRIMARY_STRONG }}
                      >
                        {user.displayName}
                      </Text>
                      {user.banned && (
                        <View
                          className="px-2 py-1 rounded"
                          style={{ backgroundColor: "#D32F2F" }}
                        >
                          <Text
                            className="text-xs"
                            style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                          >
                            BANNED
                          </Text>
                        </View>
                      )}
                    </View>

                    {user.handle && (
                      <Text
                        className="text-sm mb-1"
                        style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                      >
                        @{user.handle}
                      </Text>
                    )}

                    <Text
                      className="text-sm mb-1"
                      style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                    >
                      {user.email}
                    </Text>

                    <Text
                      className="text-xs"
                      style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_MUTED }}
                    >
                      Joined: {new Date(user.createdAt).toLocaleDateString()}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row mt-3 pt-3 border-t" style={{ borderColor: BORDER_SOFT }}>
                    <Pressable
                      onPress={() => handleToggleBan(user)}
                      className="flex-1 p-3 rounded-xl items-center active:opacity-70"
                      style={{
                        backgroundColor: user.banned ? EARTH_GREEN : "#D32F2F",
                      }}
                    >
                      <View className="flex-row items-center">
                        <Ionicons
                          name={user.banned ? "checkmark-circle" : "ban"}
                          size={18}
                          color={PARCHMENT}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: PARCHMENT }}
                        >
                          {user.banned ? "Unban User" : "Ban User"}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
