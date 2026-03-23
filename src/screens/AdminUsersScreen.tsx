/**
 * Admin User Management Screen (Updated 2026-03-08)
 * 
 * Read-only user directory showing:
 * - Handle
 * - Sign up date
 * - Last login date
 * - Status (Free/Pro/Banned)
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
} from "firebase/firestore";
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
  firstName?: string;
  banned?: boolean;
  createdAt: any;
  lastLoginAt?: any;
  lastActiveAt?: any;
  membershipTier?: string;
  isPro?: boolean;
}

const PAGE_SIZE = 50;

export default function AdminUsersScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Load all users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const usersRef = collection(db, "users");
      let q;
      
      if (loadMore && lastDoc) {
        q = query(
          usersRef,
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          usersRef,
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE)
        );
      }

      const snapshot = await getDocs(q);
      
      const users: User[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as User));

      if (loadMore) {
        setAllUsers((prev) => [...prev, ...users]);
      } else {
        setAllUsers(users);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error loading users:", error);
      Alert.alert("Error", "Failed to load users");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setLastDoc(null);
    setHasMore(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchMode(false);
      return;
    }

    try {
      setLoading(true);
      setSearchMode(true);
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

      [...emailSnapshot.docs, ...handleSnapshot.docs].forEach((docSnap) => {
        if (!seenIds.has(docSnap.id)) {
          seenIds.add(docSnap.id);
          results.push({
            id: docSnap.id,
            ...docSnap.data(),
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

  const clearSearch = () => {
    setSearchQuery("");
    setSearchMode(false);
    setSearchResults([]);
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "—";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const getStatusBadge = (user: User): { label: string; color: string; bg: string } => {
    if (user.banned) {
      return { label: "BANNED", color: "#FFFFFF", bg: "#D32F2F" };
    }
    if (user.membershipTier === "isAdmin") {
      return { label: "ADMIN", color: "#FFFFFF", bg: "#7C3AED" };
    }
    if (user.membershipTier === "isModerator") {
      return { label: "MOD", color: "#FFFFFF", bg: "#0369A1" };
    }
    if (user.isPro || user.membershipTier === "pro") {
      return { label: "PRO", color: "#15803D", bg: "#DCFCE7" };
    }
    return { label: "FREE", color: "#B45309", bg: "#FEF3C7" };
  };

  const displayUsers = searchMode ? searchResults : allUsers;

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !searchMode) {
      loadUsers(true);
    }
  };

  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }: any) => {
    const paddingToBottom = 100;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  };

  return (
    <View className="flex-1" style={{ backgroundColor: PARCHMENT }}>
      <ModalHeader title="Manage Users" showTitle />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={EARTH_GREEN} />
        }
        onScroll={({ nativeEvent }) => {
          if (isCloseToBottom(nativeEvent)) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        <View className="px-5 pt-5 pb-8">
          {/* Search Section */}
          <View className="mb-4">
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
              {searchMode ? (
                <Pressable
                  onPress={clearSearch}
                  className="px-4 py-3 rounded-xl items-center justify-center active:opacity-70"
                  style={{ backgroundColor: TEXT_SECONDARY }}
                >
                  <Ionicons name="close" size={20} color={PARCHMENT} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleSearch}
                  disabled={loading}
                  className="px-4 py-3 rounded-xl items-center justify-center active:opacity-70"
                  style={{ backgroundColor: DEEP_FOREST }}
                >
                  {loading && !allUsers.length ? (
                    <ActivityIndicator color={PARCHMENT} size="small" />
                  ) : (
                    <Ionicons name="search" size={20} color={PARCHMENT} />
                  )}
                </Pressable>
              )}
            </View>
          </View>

          {/* User Count */}
          <View className="flex-row items-center justify-between mb-3">
            <Text
              style={{ fontFamily: "SourceSans3_600SemiBold", color: TEXT_PRIMARY_STRONG }}
            >
              {searchMode ? `Search Results (${displayUsers.length})` : `All Users (${displayUsers.length}${hasMore ? "+" : ""})`}
            </Text>
          </View>

          {/* Loading State */}
          {loading && !displayUsers.length && (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color={EARTH_GREEN} />
              <Text
                className="mt-3"
                style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
              >
                Loading users...
              </Text>
            </View>
          )}

          {/* Users List */}
          {displayUsers.map((user) => {
            const status = getStatusBadge(user);
            return (
              <View
                key={user.id}
                className="mb-3 p-4 rounded-xl border"
                style={{
                  backgroundColor: CARD_BACKGROUND_LIGHT,
                  borderColor: user.banned ? "#D32F2F" : BORDER_SOFT,
                  borderWidth: user.banned ? 2 : 1,
                }}
              >
                {/* Row 1: Handle + Status */}
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-1">
                    <Text
                      className="text-base"
                      style={{ fontFamily: "SourceSans3_700Bold", color: TEXT_PRIMARY_STRONG }}
                      numberOfLines={1}
                    >
                      {user.handle ? `@${user.handle}` : user.displayName || "No handle"}
                    </Text>
                  </View>
                  <View
                    className="px-2 py-1 rounded ml-2"
                    style={{ backgroundColor: status.bg }}
                  >
                    <Text
                      style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 10, color: status.color }}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>

                {/* Row 2: First name */}
                <Text
                  className="text-sm mb-1"
                  style={{ fontFamily: "SourceSans3_500Medium", fontSize: 13, color: TEXT_PRIMARY_STRONG }}
                  numberOfLines={1}
                >
                  {user.firstName || "First name not set"}
                </Text>

                {/* Row 3: Email */}
                <Text
                  className="text-sm mb-2"
                  style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
                  numberOfLines={1}
                >
                  {user.email}
                </Text>

                {/* Row 3: Dates */}
                <View className="flex-row">
                  <View className="flex-1">
                    <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 11, color: TEXT_MUTED }}>
                      Signed up
                    </Text>
                    <Text style={{ fontFamily: "SourceSans3_500Medium", fontSize: 12, color: TEXT_SECONDARY }}>
                      {formatDate(user.createdAt)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 11, color: TEXT_MUTED }}>
                      Last active
                    </Text>
                    <Text style={{ fontFamily: "SourceSans3_500Medium", fontSize: 12, color: TEXT_SECONDARY }}>
                      {formatDate(user.lastLoginAt || user.lastActiveAt)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Load More Indicator */}
          {loadingMore && (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color={EARTH_GREEN} />
            </View>
          )}

          {/* End of List */}
          {!hasMore && displayUsers.length > 0 && !searchMode && (
            <Text
              className="text-center py-4"
              style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: TEXT_MUTED }}
            >
              End of users list
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
