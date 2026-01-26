/**
 * Packing Tab Screen - New simplified packing hub
 * Shows all packing lists with progress, create new lists
 * Follows the UX pattern from the reference app
 */

import React, { useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActionSheetIOS,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import EmptyState from "../components/EmptyState";
import { DEEP_FOREST, EARTH_GREEN, PARCHMENT, GRANITE_GOLD, BORDER_SOFT } from "../constants/colors";
import { usePackingStore, usePackingTemplates, usePackingActiveLists } from "../state/packingStore";
import { RootStackParamList } from "../navigation/types";
import { requirePro } from "../utils/gating";
import AccountRequiredModal from "../components/AccountRequiredModal";

type PlanTab = "trips" | "parks" | "weather" | "packing" | "meals";
type PackingTabNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PackingTabScreenProps {
  onTabChange: (tab: PlanTab) => void;
}

export default function PackingTabScreenNew({ onTabChange }: PackingTabScreenProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<PackingTabNavigationProp>();
  const templates = usePackingTemplates();
  const activeLists = usePackingActiveLists();
  const { deletePackingList, copyTemplateToTrip } = usePackingStore();
  // Get getProgress separately to avoid re-render issues - store actions are stable
  const getProgress = usePackingStore((s) => s.getProgress);

  // Gating modal state
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Stats calculations (only for active lists, not templates)
  const stats = useMemo(() => {
    let totalLists = activeLists.length;
    let totalPacked = 0;
    let totalItems = 0;
    let completionSum = 0;

    activeLists.forEach((list) => {
      const progress = getProgress(list.id);
      totalPacked += progress.packed;
      totalItems += progress.total;
      completionSum += progress.percentage;
    });

    const avgCompletion = totalLists > 0 ? Math.round(completionSum / totalLists) : 0;

    return {
      totalLists,
      totalPacked,
      totalItems,
      avgCompletion,
      templateCount: templates.length,
    };
  }, [activeLists, templates, getProgress]);

  const handleCreateList = useCallback(() => {
    const canProceed = requirePro({
      openAccountModal: () => setShowAccountModal(true),
      openPaywallModal: (variant) => navigation.navigate("Paywall", { triggerKey: "packing_create_list", variant }),
    });
    if (!canProceed) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("PackingListCreate" as any);
  }, [navigation]);

  const handleOpenList = useCallback((listId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("PackingListEditor" as any, { listId });
  }, [navigation]);

  const handleDeleteList = useCallback((listId: string, listName: string, isTemplate: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      isTemplate ? "Delete Template" : "Delete List",
      `Are you sure you want to delete "${listName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deletePackingList(listId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [deletePackingList]);

  const handleShowListMenu = useCallback((listId: string, listName: string, isTemplate: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Delete"],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: listName,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleDeleteList(listId, listName, isTemplate);
          }
        }
      );
    } else {
      // Android fallback - use Alert
      Alert.alert(
        listName,
        "What would you like to do?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => handleDeleteList(listId, listName, isTemplate),
          },
        ]
      );
    }
  }, [handleDeleteList]);

  const handleUseTemplate = useCallback((templateId: string, templateName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Use Template",
      `Create a new packing list from "${templateName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create List",
          onPress: () => {
            const newListId = copyTemplateToTrip(templateId);
            if (newListId) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              navigation.navigate("PackingListEditor" as any, { listId: newListId });
            }
          },
        },
      ]
    );
  }, [copyTemplateToTrip, navigation]);

  const bottomSpacer = 50 + Math.max(insets.bottom, 18) + 12;
  const hasAnyLists = templates.length > 0 || activeLists.length > 0;

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <View className="flex-1 bg-parchment">
      {!hasAnyLists ? (
        <View className="flex-1 bg-parchment">
          <EmptyState
            iconName="bag"
            title="No Packing Lists Yet"
            message="Create your first packing list to get organized for your next adventure."
            ctaLabel="Create Packing List"
            onPress={handleCreateList}
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: bottomSpacer }}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Dashboard */}
          <View className="px-4 pt-4 pb-2">
            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: DEEP_FOREST }}
            >
              <Text
                className="text-sm mb-3"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: "rgba(255,255,255,0.7)" }}
              >
                YOUR PACKING STATS
              </Text>
              
              <View className="flex-row justify-between">
                <View className="items-center flex-1">
                  <Text
                    className="text-3xl"
                    style={{ fontFamily: "Raleway_700Bold", color: PARCHMENT }}
                  >
                    {stats.totalLists}
                  </Text>
                  <Text
                    className="text-xs"
                    style={{ fontFamily: "SourceSans3_400Regular", color: "rgba(255,255,255,0.7)" }}
                  >
                    Lists
                  </Text>
                </View>
                
                <View className="items-center flex-1">
                  <Text
                    className="text-3xl"
                    style={{ fontFamily: "Raleway_700Bold", color: PARCHMENT }}
                  >
                    {stats.totalPacked}
                  </Text>
                  <Text
                    className="text-xs"
                    style={{ fontFamily: "SourceSans3_400Regular", color: "rgba(255,255,255,0.7)" }}
                  >
                    Packed
                  </Text>
                </View>
                
                <View className="items-center flex-1">
                  <Text
                    className="text-3xl"
                    style={{ fontFamily: "Raleway_700Bold", color: GRANITE_GOLD }}
                  >
                    {stats.avgCompletion}%
                  </Text>
                  <Text
                    className="text-xs"
                    style={{ fontFamily: "SourceSans3_400Regular", color: "rgba(255,255,255,0.7)" }}
                  >
                    Avg Complete
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Create New Button */}
          <View className="px-4 py-3">
            <Pressable
              onPress={handleCreateList}
              className="flex-row items-center justify-center py-3 px-4 rounded-xl"
              style={{ backgroundColor: DEEP_FOREST }}
            >
              <Ionicons name="add-circle" size={20} color={PARCHMENT} />
              <Text
                className="ml-2"
                style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 15, color: PARCHMENT }}
              >
                Create New Packing List
              </Text>
            </Pressable>
          </View>

          {/* Active Lists Section */}
          {activeLists.length > 0 && (
            <View className="px-4">
              <Text
                className="text-xs mb-2"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: EARTH_GREEN }}
              >
                ACTIVE LISTS
              </Text>

              {activeLists.map((list) => {
                const progress = getProgress(list.id);

                return (
                  <Pressable
                    key={list.id}
                    onPress={() => handleOpenList(list.id)}
                    className="bg-white rounded-xl mb-3 p-4"
                    style={{
                      borderWidth: 1,
                      borderColor: BORDER_SOFT,
                    }}
                  >
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1 mr-3">
                        <Text
                          className="text-base mb-1"
                          style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
                          numberOfLines={1}
                        >
                          {list.name}
                        </Text>
                        <View className="flex-row items-center">
                          <Text
                            className="text-xs mr-2"
                            style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                          >
                            {list.tripType} • {list.season}
                          </Text>
                          <Text
                            className="text-xs"
                            style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                          >
                            {formatDate(list.createdAt)}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center">
                        <View className="items-end mr-2">
                          <Text
                            className="text-lg"
                            style={{
                              fontFamily: "Raleway_700Bold",
                              color: progress.percentage === 100 ? DEEP_FOREST : GRANITE_GOLD,
                            }}
                          >
                            {progress.percentage}%
                          </Text>
                          {progress.percentage === 100 && (
                            <Ionicons name="checkmark-circle" size={16} color={DEEP_FOREST} />
                          )}
                        </View>
                        <Pressable
                          onPress={() => handleShowListMenu(list.id, list.name, false)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          className="p-1"
                        >
                          <Ionicons name="ellipsis-vertical" size={18} color={EARTH_GREEN} />
                        </Pressable>
                      </View>
                    </View>

                    {/* Progress bar */}
                    <View
                      className="h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: "#E6E1D6" }}
                    >
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${progress.percentage}%` as any,
                          backgroundColor: progress.percentage === 100 ? DEEP_FOREST : GRANITE_GOLD,
                        }}
                      />
                    </View>

                    <View className="flex-row items-center justify-between mt-2">
                      <Text
                        className="text-xs"
                        style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                      >
                        {progress.packed} of {progress.total} items packed
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={EARTH_GREEN} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* My Templates Section */}
          {templates.length > 0 && (
            <View className="px-4 mt-2">
              <Text
                className="text-xs mb-2"
                style={{ fontFamily: "SourceSans3_600SemiBold", color: EARTH_GREEN }}
              >
                MY TEMPLATES
              </Text>

              {templates.map((template) => {
                const itemCount = template.sections.reduce((acc, s) => acc + s.items.length, 0);

                return (
                  <Pressable
                    key={template.id}
                    onPress={() => handleOpenList(template.id)}
                    className="bg-white rounded-xl mb-3 p-4"
                    style={{
                      borderWidth: 1,
                      borderColor: BORDER_SOFT,
                      borderStyle: "dashed",
                    }}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 mr-3">
                        <View className="flex-row items-center mb-1">
                          <Ionicons name="copy-outline" size={16} color={EARTH_GREEN} />
                          <Text
                            className="text-base ml-2"
                            style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
                            numberOfLines={1}
                          >
                            {template.name}
                          </Text>
                        </View>
                        <Text
                          className="text-xs"
                          style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                        >
                          {template.tripType} • {template.season} • {itemCount} items
                        </Text>
                      </View>

                      <View className="flex-row items-center">
                        <Pressable
                          onPress={() => handleUseTemplate(template.id, template.name)}
                          className="px-3 py-2 rounded-lg mr-2"
                          style={{ backgroundColor: DEEP_FOREST }}
                        >
                          <Text
                            className="text-xs"
                            style={{ fontFamily: "SourceSans3_600SemiBold", color: PARCHMENT }}
                          >
                            Use
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleShowListMenu(template.id, template.name, true)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          className="p-1"
                        >
                          <Ionicons name="ellipsis-vertical" size={18} color={EARTH_GREEN} />
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

        </ScrollView>
      )}

      {/* Gating Modals */}
      <AccountRequiredModal
        visible={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onCreateAccount={() => {
          setShowAccountModal(false);
          navigation.navigate("Auth" as never);
        }}
        onMaybeLater={() => setShowAccountModal(false)}
      />
    </View>
  );
}
