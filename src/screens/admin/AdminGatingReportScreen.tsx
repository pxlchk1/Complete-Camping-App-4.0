/**
 * Admin Gating Report Screen
 * Dev-only screen to view all gates, their levels, and export the registry
 * 
 * Access: Only visible in __DEV__ mode or for admin users
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import {
  GATING_REGISTRY,
  GateDefinition,
  GateLevel,
  getGatesByLevel,
  getGatingSummary,
  exportRegistryAsJSON,
} from "../../gating/gatingRegistry";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  PARCHMENT,
  BORDER_SOFT,
  TEXT_SECONDARY,
  CARD_BACKGROUND_LIGHT,
} from "../../constants/colors";

type FilterOption = "all" | GateLevel;

// Gate level colors
const LEVEL_COLORS: Record<GateLevel, { bg: string; text: string; label: string }> = {
  account_required: { bg: "#E0F2FE", text: "#0369A1", label: "Account Required" },
  pro_required: { bg: "#FEF3C7", text: "#B45309", label: "Pro Required" },
  free_limit: { bg: "#DCFCE7", text: "#15803D", label: "Free Limit" },
};

export default function AdminGatingReportScreen() {
  const navigation = useNavigation();
  const [filter, setFilter] = useState<FilterOption>("all");
  const [expandedGate, setExpandedGate] = useState<string | null>(null);

  // Get summary stats
  const summary = useMemo(() => getGatingSummary(), []);

  // Filter gates
  const filteredGates = useMemo(() => {
    if (filter === "all") return GATING_REGISTRY;
    return getGatesByLevel(filter);
  }, [filter]);

  // Group gates by level for display
  const groupedGates = useMemo(() => {
    const groups: Record<GateLevel, GateDefinition[]> = {
      account_required: [],
      pro_required: [],
      free_limit: [],
    };

    filteredGates.forEach((gate) => {
      groups[gate.level].push(gate);
    });

    return groups;
  }, [filteredGates]);

  // Handle export
  const handleExport = async () => {
    try {
      const json = exportRegistryAsJSON();
      await Clipboard.setStringAsync(json);
      console.log("=== GATING REGISTRY EXPORT ===");
      console.log(json);
      console.log("=== END EXPORT ===");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Exported!", "Gating registry copied to clipboard and printed to console.");
    } catch (error) {
      console.error("Export failed:", error);
      Alert.alert("Error", "Failed to export gating registry.");
    }
  };

  // Toggle expanded gate
  const toggleGate = (gateKey: string) => {
    setExpandedGate(expandedGate === gateKey ? null : gateKey);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: PARCHMENT }} edges={["top"]}>
      {/* Header */}
      <View
        className="px-5 pt-4 pb-4 border-b"
        style={{ backgroundColor: DEEP_FOREST, borderColor: BORDER_SOFT }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Pressable onPress={() => navigation.goBack()} className="mr-3 active:opacity-70">
              <Ionicons name="arrow-back" size={24} color={PARCHMENT} />
            </Pressable>
            <Text
              className="text-xl"
              style={{ fontFamily: "Raleway_700Bold", color: PARCHMENT }}
            >
              Gating Report
            </Text>
          </View>
          <View className="flex-row items-center px-2 py-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 11, color: PARCHMENT }}>
              DEV ONLY
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Summary Cards */}
        <View className="px-4 py-4">
          <Text
            className="mb-3"
            style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: EARTH_GREEN }}
          >
            SUMMARY
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            <View
              className="flex-1 p-3 rounded-xl border"
              style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderColor: BORDER_SOFT, minWidth: 100 }}
            >
              <Text style={{ fontFamily: "Raleway_700Bold", fontSize: 24, color: DEEP_FOREST }}>
                {summary.totalGates}
              </Text>
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: TEXT_SECONDARY }}>
                Total Gates
              </Text>
            </View>
            <View
              className="flex-1 p-3 rounded-xl"
              style={{ backgroundColor: LEVEL_COLORS.account_required.bg, minWidth: 100 }}
            >
              <Text style={{ fontFamily: "Raleway_700Bold", fontSize: 24, color: LEVEL_COLORS.account_required.text }}>
                {summary.accountRequired}
              </Text>
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: LEVEL_COLORS.account_required.text }}>
                Account Req.
              </Text>
            </View>
            <View
              className="flex-1 p-3 rounded-xl"
              style={{ backgroundColor: LEVEL_COLORS.pro_required.bg, minWidth: 100 }}
            >
              <Text style={{ fontFamily: "Raleway_700Bold", fontSize: 24, color: LEVEL_COLORS.pro_required.text }}>
                {summary.proRequired}
              </Text>
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: LEVEL_COLORS.pro_required.text }}>
                Pro Required
              </Text>
            </View>
            <View
              className="flex-1 p-3 rounded-xl"
              style={{ backgroundColor: LEVEL_COLORS.free_limit.bg, minWidth: 100 }}
            >
              <Text style={{ fontFamily: "Raleway_700Bold", fontSize: 24, color: LEVEL_COLORS.free_limit.text }}>
                {summary.freeLimits}
              </Text>
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: LEVEL_COLORS.free_limit.text }}>
                Free Limits
              </Text>
            </View>
          </View>

          {/* Additional stats */}
          <View className="flex-row mt-3" style={{ gap: 8 }}>
            <View
              className="flex-1 p-3 rounded-xl border"
              style={{ backgroundColor: "white", borderColor: BORDER_SOFT }}
            >
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: DEEP_FOREST }}>
                {summary.countsTowardProAttempt}
              </Text>
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 11, color: TEXT_SECONDARY }}>
                Count toward Pro attempts
              </Text>
            </View>
            <View
              className="flex-1 p-3 rounded-xl border"
              style={{ backgroundColor: "white", borderColor: BORDER_SOFT }}
            >
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: DEEP_FOREST }}>
                {summary.uniquePaywallKeys}
              </Text>
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 11, color: TEXT_SECONDARY }}>
                Unique paywall keys
              </Text>
            </View>
            <View
              className="flex-1 p-3 rounded-xl border"
              style={{ backgroundColor: "white", borderColor: BORDER_SOFT }}
            >
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 16, color: DEEP_FOREST }}>
                {summary.uniqueAccountKeys}
              </Text>
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 11, color: TEXT_SECONDARY }}>
                Unique account keys
              </Text>
            </View>
          </View>
        </View>

        {/* Filter Pills */}
        <View className="px-4 pb-3">
          <Text
            className="mb-2"
            style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: EARTH_GREEN }}
          >
            FILTER
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Pressable
              onPress={() => setFilter("all")}
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: filter === "all" ? DEEP_FOREST : "white", borderWidth: 1, borderColor: BORDER_SOFT }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 13,
                  color: filter === "all" ? PARCHMENT : DEEP_FOREST,
                }}
              >
                All ({summary.totalGates})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFilter("account_required")}
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: filter === "account_required" ? LEVEL_COLORS.account_required.text : LEVEL_COLORS.account_required.bg }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 13,
                  color: filter === "account_required" ? "white" : LEVEL_COLORS.account_required.text,
                }}
              >
                Account ({summary.accountRequired})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFilter("pro_required")}
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: filter === "pro_required" ? LEVEL_COLORS.pro_required.text : LEVEL_COLORS.pro_required.bg }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 13,
                  color: filter === "pro_required" ? "white" : LEVEL_COLORS.pro_required.text,
                }}
              >
                Pro ({summary.proRequired})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFilter("free_limit")}
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: filter === "free_limit" ? LEVEL_COLORS.free_limit.text : LEVEL_COLORS.free_limit.bg }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 13,
                  color: filter === "free_limit" ? "white" : LEVEL_COLORS.free_limit.text,
                }}
              >
                Free Limit ({summary.freeLimits})
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Gates List */}
        <View className="px-4">
          {/* Account Required Section */}
          {(filter === "all" || filter === "account_required") && groupedGates.account_required.length > 0 && (
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <View
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: LEVEL_COLORS.account_required.text }}
                />
                <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: DEEP_FOREST }}>
                  Account Required
                </Text>
              </View>
              {groupedGates.account_required.map((gate) => (
                <GateCard
                  key={gate.gateKey}
                  gate={gate}
                  expanded={expandedGate === gate.gateKey}
                  onToggle={() => toggleGate(gate.gateKey)}
                />
              ))}
            </View>
          )}

          {/* Free Limit Section */}
          {(filter === "all" || filter === "free_limit") && groupedGates.free_limit.length > 0 && (
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <View
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: LEVEL_COLORS.free_limit.text }}
                />
                <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: DEEP_FOREST }}>
                  Free Limits
                </Text>
              </View>
              {groupedGates.free_limit.map((gate) => (
                <GateCard
                  key={gate.gateKey}
                  gate={gate}
                  expanded={expandedGate === gate.gateKey}
                  onToggle={() => toggleGate(gate.gateKey)}
                />
              ))}
            </View>
          )}

          {/* Pro Required Section */}
          {(filter === "all" || filter === "pro_required") && groupedGates.pro_required.length > 0 && (
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <View
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: LEVEL_COLORS.pro_required.text }}
                />
                <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: DEEP_FOREST }}>
                  Pro Required
                </Text>
              </View>
              {groupedGates.pro_required.map((gate) => (
                <GateCard
                  key={gate.gateKey}
                  gate={gate}
                  expanded={expandedGate === gate.gateKey}
                  onToggle={() => toggleGate(gate.gateKey)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Export Button */}
      <View
        className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t"
        style={{ backgroundColor: PARCHMENT, borderColor: BORDER_SOFT, paddingBottom: 34 }}
      >
        <Pressable
          onPress={handleExport}
          className="flex-row items-center justify-center py-3 rounded-xl active:opacity-90"
          style={{ backgroundColor: DEEP_FOREST }}
        >
          <Ionicons name="download-outline" size={18} color={PARCHMENT} />
          <Text
            className="ml-2"
            style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 15, color: PARCHMENT }}
          >
            Export JSON
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/**
 * Gate Card Component
 */
function GateCard({
  gate,
  expanded,
  onToggle,
}: {
  gate: GateDefinition;
  expanded: boolean;
  onToggle: () => void;
}) {
  const levelStyle = LEVEL_COLORS[gate.level];

  return (
    <Pressable
      onPress={onToggle}
      className="mb-2 rounded-xl border overflow-hidden"
      style={{ backgroundColor: "white", borderColor: BORDER_SOFT }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between p-3">
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text
              style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: DEEP_FOREST }}
              numberOfLines={1}
            >
              {gate.title}
            </Text>
            {gate.freeLimit !== null && (
              <View
                className="ml-2 px-2 py-0.5 rounded"
                style={{ backgroundColor: levelStyle.bg }}
              >
                <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 11, color: levelStyle.text }}>
                  Limit: {gate.freeLimit}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: TEXT_SECONDARY }}
            numberOfLines={1}
          >
            {gate.gateKey}
          </Text>
        </View>
        <View className="flex-row items-center ml-2">
          {gate.countsTowardProAttempt && (
            <View className="mr-2">
              <Ionicons name="pulse" size={14} color={GRANITE_GOLD} />
            </View>
          )}
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={TEXT_SECONDARY}
          />
        </View>
      </View>

      {/* Expanded Details */}
      {expanded && (
        <View className="px-3 pb-3 pt-1 border-t" style={{ borderColor: BORDER_SOFT }}>
          {/* Level Badge */}
          <View className="flex-row items-center mb-2">
            <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: TEXT_SECONDARY, width: 80 }}>
              Level:
            </Text>
            <View className="px-2 py-0.5 rounded" style={{ backgroundColor: levelStyle.bg }}>
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 11, color: levelStyle.text }}>
                {levelStyle.label}
              </Text>
            </View>
          </View>

          {/* Modal */}
          <View className="flex-row items-center mb-2">
            <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: TEXT_SECONDARY, width: 80 }}>
              Modal:
            </Text>
            <Text style={{ fontFamily: "SourceSans3_500Medium", fontSize: 12, color: DEEP_FOREST }}>
              {gate.triggerModal}
            </Text>
          </View>

          {/* Paywall Key */}
          {gate.paywallTriggerKey && (
            <View className="flex-row items-center mb-2">
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: TEXT_SECONDARY, width: 80 }}>
                Paywall Key:
              </Text>
              <View className="px-2 py-0.5 rounded" style={{ backgroundColor: "#FEF3C7" }}>
                <Text style={{ fontFamily: "SourceSans3_500Medium", fontSize: 11, color: "#B45309" }}>
                  {gate.paywallTriggerKey}
                </Text>
              </View>
            </View>
          )}

          {/* Account Key */}
          {gate.accountModalTriggerKey && (
            <View className="flex-row items-center mb-2">
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: TEXT_SECONDARY, width: 80 }}>
                Account Key:
              </Text>
              <View className="px-2 py-0.5 rounded" style={{ backgroundColor: "#E0F2FE" }}>
                <Text style={{ fontFamily: "SourceSans3_500Medium", fontSize: 11, color: "#0369A1" }}>
                  {gate.accountModalTriggerKey}
                </Text>
              </View>
            </View>
          )}

          {/* Screens */}
          <View className="flex-row items-start mb-2">
            <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: TEXT_SECONDARY, width: 80 }}>
              Screens:
            </Text>
            <View className="flex-1 flex-row flex-wrap" style={{ gap: 4 }}>
              {gate.screens.map((screen) => (
                <View key={screen} className="px-2 py-0.5 rounded" style={{ backgroundColor: "#F3F4F6" }}>
                  <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 11, color: "#374151" }}>
                    {screen}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View className="flex-row items-start mb-2">
            <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: TEXT_SECONDARY, width: 80 }}>
              Actions:
            </Text>
            <View className="flex-1 flex-row flex-wrap" style={{ gap: 4 }}>
              {gate.actions.map((action) => (
                <View key={action} className="px-2 py-0.5 rounded" style={{ backgroundColor: "#EDE9FE" }}>
                  <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 11, color: "#5B21B6" }}>
                    {action}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Notes */}
          {gate.notes && (
            <View className="flex-row items-start">
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: TEXT_SECONDARY, width: 80 }}>
                Notes:
              </Text>
              <Text
                style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: TEXT_SECONDARY, flex: 1, fontStyle: "italic" }}
              >
                {gate.notes}
              </Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}
