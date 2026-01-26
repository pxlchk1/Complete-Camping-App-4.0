/**
 * Administrator Panel Component
 * Manage users, memberships, bans, and roles
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  getUserByHandle,
  getUserByEmail,
  banUser,
  unbanUser,
  grantMembership,
  updateUserRole,
} from "../services/userService";
import { MembershipDuration } from "../types/user";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  PARCHMENT,
  SIERRA_SKY,
} from "../constants/colors";

interface AdminPanelProps {
  currentUserId: string;
}

export default function AdminPanel({ currentUserId }: AdminPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"membership" | "ban" | "role">("membership");

  // Membership form
  const [membershipDuration, setMembershipDuration] = useState<MembershipDuration>("1_month");

  // Ban form
  const [banReason, setBanReason] = useState("");

  // Role form
  const [newRole, setNewRole] = useState<"user" | "moderator" | "administrator">("moderator");

  const membershipOptions: { value: MembershipDuration; label: string }[] = [
    { value: "1_month", label: "1 Month" },
    { value: "3_months", label: "3 Months" },
    { value: "6_months", label: "6 Months" },
    { value: "1_year", label: "1 Year" },
    { value: "lifetime", label: "Lifetime" },
  ];

  const handleGrantMembership = async () => {
    if (!searchQuery.trim()) {
      Alert.alert("Error", "Please enter a user handle or email");
      return;
    }

    setLoading(true);
    try {
      // Try to find user by handle first, then email
      let user = await getUserByHandle(searchQuery.trim());
      if (!user) {
        user = await getUserByEmail(searchQuery.trim());
      }

      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      await grantMembership(currentUserId, user.id, membershipDuration);

      Alert.alert(
        "Success",
        `Granted ${membershipDuration.replace("_", " ")} membership to ${user.displayName}`
      );
      setSearchQuery("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to grant membership");
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!searchQuery.trim()) {
      Alert.alert("Error", "Please enter a user handle or email");
      return;
    }

    if (!banReason.trim()) {
      Alert.alert("Error", "Please provide a ban reason");
      return;
    }

    setLoading(true);
    try {
      let user = await getUserByHandle(searchQuery.trim());
      if (!user) {
        user = await getUserByEmail(searchQuery.trim());
      }

      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      if (user.id === currentUserId) {
        Alert.alert("Error", "You cannot ban yourself");
        return;
      }

      await banUser(currentUserId, user.id, banReason.trim());

      Alert.alert("Success", `Banned user: ${user.displayName}`);
      setSearchQuery("");
      setBanReason("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to ban user");
    } finally {
      setLoading(false);
    }
  };

  const handleUnbanUser = async () => {
    if (!searchQuery.trim()) {
      Alert.alert("Error", "Please enter a user handle or email");
      return;
    }

    setLoading(true);
    try {
      let user = await getUserByHandle(searchQuery.trim());
      if (!user) {
        user = await getUserByEmail(searchQuery.trim());
      }

      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      if (!user.isBanned) {
        Alert.alert("Info", "This user is not banned");
        return;
      }

      await unbanUser(currentUserId, user.id);

      Alert.alert("Success", `Unbanned user: ${user.displayName}`);
      setSearchQuery("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to unban user");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!searchQuery.trim()) {
      Alert.alert("Error", "Please enter a user handle or email");
      return;
    }

    setLoading(true);
    try {
      let user = await getUserByHandle(searchQuery.trim());
      if (!user) {
        user = await getUserByEmail(searchQuery.trim());
      }

      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      if (user.id === currentUserId) {
        Alert.alert("Error", "You cannot change your own role");
        return;
      }

      await updateUserRole(currentUserId, user.id, newRole);

      Alert.alert("Success", `Updated ${user.displayName} to ${newRole}`);
      setSearchQuery("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 px-5 py-6">
      <Text
        className="text-lg mb-4"
        style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
      >
        Administrator Panel
      </Text>

      {/* Section Selector */}
      <View className="flex-row gap-2 mb-6">
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveSection("membership");
          }}
          className={`flex-1 px-3 py-2 rounded-xl ${
            activeSection === "membership" ? "bg-granite" : "bg-white border border-stone-300"
          }`}
          style={activeSection === "membership" ? { backgroundColor: GRANITE_GOLD } : {}}
        >
          <Text
            className="text-center text-sm"
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              color: activeSection === "membership" ? PARCHMENT : DEEP_FOREST,
            }}
          >
            Membership
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveSection("ban");
          }}
          className={`flex-1 px-3 py-2 rounded-xl ${
            activeSection === "ban" ? "bg-red-600" : "bg-white border border-stone-300"
          }`}
        >
          <Text
            className="text-center text-sm"
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              color: activeSection === "ban" ? PARCHMENT : DEEP_FOREST,
            }}
          >
            Ban/Unban
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveSection("role");
          }}
          className={`flex-1 px-3 py-2 rounded-xl ${
            activeSection === "role" ? "bg-sierra" : "bg-white border border-stone-300"
          }`}
          style={activeSection === "role" ? { backgroundColor: SIERRA_SKY } : {}}
        >
          <Text
            className="text-center text-sm"
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              color: activeSection === "role" ? PARCHMENT : DEEP_FOREST,
            }}
          >
            Roles
          </Text>
        </Pressable>
      </View>

      {/* Search Input */}
      <View className="mb-4">
        <Text
          className="text-sm mb-2"
          style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
        >
          User Handle or Email
        </Text>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Enter @handle or email"
          className="bg-white border border-stone-300 rounded-xl px-4 py-3"
          style={{ fontFamily: "SourceSans3_400Regular", color: DEEP_FOREST }}
          placeholderTextColor="#999"
          autoCapitalize="none"
        />
      </View>

      {/* Membership Section */}
      {activeSection === "membership" && (
        <View>
          <Text
            className="text-sm mb-2"
            style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
          >
            Membership Duration
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {membershipOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMembershipDuration(option.value);
                }}
                className={`px-3 py-2 rounded-xl ${
                  membershipDuration === option.value
                    ? "bg-granite"
                    : "bg-white border border-stone-300"
                }`}
                style={membershipDuration === option.value ? { backgroundColor: GRANITE_GOLD } : {}}
              >
                <Text
                  className="text-sm"
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    color: membershipDuration === option.value ? PARCHMENT : DEEP_FOREST,
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleGrantMembership}
            disabled={loading}
            className={`bg-granite rounded-xl py-3 items-center ${loading ? "opacity-50" : "active:opacity-90"}`}
            style={{ backgroundColor: GRANITE_GOLD }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={PARCHMENT} />
            ) : (
              <Text
                style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
              >
                Grant Membership
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Ban Section */}
      {activeSection === "ban" && (
        <View>
          <Text
            className="text-sm mb-2"
            style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
          >
            Ban Reason
          </Text>
          <TextInput
            value={banReason}
            onChangeText={setBanReason}
            placeholder="Enter reason for ban"
            multiline
            numberOfLines={3}
            className="bg-white border border-stone-300 rounded-xl px-4 py-3 mb-4"
            style={{
              fontFamily: "SourceSans3_400Regular",
              color: DEEP_FOREST,
              textAlignVertical: "top",
            }}
            placeholderTextColor="#999"
          />

          <View className="flex-row gap-3">
            <Pressable
              onPress={handleBanUser}
              disabled={loading}
              className={`flex-1 bg-red-600 rounded-xl py-3 items-center ${loading ? "opacity-50" : "active:opacity-90"}`}
            >
              {loading ? (
                <ActivityIndicator size="small" color={PARCHMENT} />
              ) : (
                <Text
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                >
                  Ban User
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleUnbanUser}
              disabled={loading}
              className={`flex-1 bg-forest rounded-xl py-3 items-center ${loading ? "opacity-50" : "active:opacity-90"}`}
              style={{ backgroundColor: DEEP_FOREST }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={PARCHMENT} />
              ) : (
                <Text
                  style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                >
                  Unban User
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Role Section */}
      {activeSection === "role" && (
        <View>
          <Text
            className="text-sm mb-2"
            style={{ fontFamily: "SourceSans3_600SemiBold", color: DEEP_FOREST }}
          >
            New Role
          </Text>
          <View className="flex-row gap-2 mb-4">
            {["user", "moderator", "administrator"].map((role) => (
              <Pressable
                key={role}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setNewRole(role as typeof newRole);
                }}
                className={`flex-1 px-3 py-2 rounded-xl ${
                  newRole === role ? "bg-sierra" : "bg-white border border-stone-300"
                }`}
                style={newRole === role ? { backgroundColor: SIERRA_SKY } : {}}
              >
                <Text
                  className="text-center text-sm capitalize"
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    color: newRole === role ? PARCHMENT : DEEP_FOREST,
                  }}
                >
                  {role}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleUpdateRole}
            disabled={loading}
            className={`bg-sierra rounded-xl py-3 items-center ${loading ? "opacity-50" : "active:opacity-90"}`}
            style={{ backgroundColor: SIERRA_SKY }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={PARCHMENT} />
            ) : (
              <Text
                style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
              >
                Update Role
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Info Box */}
      <View className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <View className="flex-row items-start">
          <Ionicons name="information-circle" size={20} color={GRANITE_GOLD} />
          <Text
            className="flex-1 ml-2 text-sm"
            style={{ fontFamily: "SourceSans3_400Regular", color: "#92400e" }}
          >
            <Text style={{ fontFamily: "SourceSans3_600SemiBold" }}>Admin Powers:</Text>
            {"\n"}• Grant premium memberships to users
            {"\n"}• Ban and unban user accounts
            {"\n"}• Promote users to moderator or admin
            {"\n"}• All changes are logged in the audit trail
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
