/**
 * Packing List Editor Screen
 * Full-featured list editor with sections, items, swipe gestures
 * Follows the UX pattern from the reference app
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";

import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  GRANITE_GOLD,
  BORDER_SOFT,
  RUST,
} from "../constants/colors";
import {
  usePackingStore,
  usePackingListById,
  PackingItem,
} from "../state/packingStore";
import { RootStackParamList } from "../navigation/types";
import { isGearClosetItem } from "../utils/mergeGearIntoPacking";

type PackingListEditorRouteProp = RouteProp<{ PackingListEditor: { listId: string } }, "PackingListEditor">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ============================================================================
// SWIPEABLE ITEM COMPONENT
// ============================================================================

interface SwipeableItemProps {
  item: PackingItem;
  listId: string;
  sectionId: string;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function SwipeableItem({ item, listId, sectionId, onToggle, onDelete, onEdit }: SwipeableItemProps) {
  const translateX = useSharedValue(0);
  const [isArmed, setIsArmed] = useState(false);

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete();
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      if (isArmed && event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -100);
      }
    })
    .onEnd((event) => {
      if (translateX.value < -70) {
        translateX.value = withSpring(-100);
        runOnJS(handleDelete)();
      } else {
        translateX.value = withSpring(0);
      }
      runOnJS(setIsArmed)(false);
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(300)
    .onStart(() => {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      runOnJS(setIsArmed)(true);
    });

  const composedGesture = Gesture.Simultaneous(longPressGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View className="overflow-hidden">
      {/* Delete background */}
      <View
        className="absolute right-0 top-0 bottom-0 w-24 items-center justify-center"
        style={{ backgroundColor: RUST }}
      >
        <Ionicons name="trash" size={20} color="#FFF" />
      </View>

      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[animatedStyle, { backgroundColor: "#FFF" }]}
          className="flex-row items-center py-3 px-4 border-b"
          // @ts-ignore
          borderColor={BORDER_SOFT}
        >
          {/* Checkbox */}
          <Pressable onPress={onToggle} className="mr-3">
            <View
              className="w-6 h-6 rounded border-2 items-center justify-center"
              style={{
                backgroundColor: item.checked ? DEEP_FOREST : "transparent",
                borderColor: item.checked ? DEEP_FOREST : BORDER_SOFT,
              }}
            >
              {item.checked && <Ionicons name="checkmark" size={16} color={PARCHMENT} />}
            </View>
          </Pressable>

          {/* Content */}
          <Pressable onPress={onEdit} className="flex-1">
            <View className="flex-row items-center">
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 16,
                  color: item.checked ? EARTH_GREEN : DEEP_FOREST,
                  textDecorationLine: item.checked ? "line-through" : "none",
                }}
              >
                {item.name}
              </Text>
              {item.essential && (
                <View
                  className="ml-2 px-2 py-0.5 rounded"
                  style={{ backgroundColor: "#FEE2E2" }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 10,
                      color: RUST,
                    }}
                  >
                    ESSENTIAL
                  </Text>
                </View>
              )}
              {isGearClosetItem(item) && (
                <View
                  className="ml-2 px-2 py-0.5 rounded"
                  style={{ backgroundColor: "#E0F2F1" }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 10,
                      color: "#00695C",
                    }}
                  >
                    FROM GEAR CLOSET
                  </Text>
                </View>
              )}
            </View>
            {item.note && (
              <Text
                className="text-xs mt-1"
                style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
              >
                {item.note}
              </Text>
            )}
          </Pressable>

          {/* Armed indicator */}
          {isArmed && (
            <Text
              className="text-xs"
              style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
            >
              ← Swipe to delete
            </Text>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function PackingListEditorScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PackingListEditorRouteProp>();
  const { listId } = route.params;
  const insets = useSafeAreaInsets();

  const list = usePackingListById(listId);
  const {
    toggleSectionCollapsed,
    toggleItemChecked,
    deleteItem,
    addItem,
    addSection,
    deleteSection,
    updateItem,
    uncheckAllItems,
    getProgress,
    saveAsTemplate,
    copyTemplateToTrip,
  } = usePackingStore();

  // Modal state
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ sectionId: string; item: PackingItem } | null>(null);

  // Form state
  const [newItemName, setNewItemName] = useState("");
  const [newItemNote, setNewItemNote] = useState("");
  const [newItemEssential, setNewItemEssential] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  const progress = useMemo(() => 
    list ? getProgress(listId) : { packed: 0, total: 0, percentage: 0 },
    [list, listId, getProgress]
  );

  // Handle toggle item
  const handleToggleItem = useCallback((sectionId: string, itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleItemChecked(listId, sectionId, itemId);
  }, [listId, toggleItemChecked]);

  // Handle delete item
  const handleDeleteItem = useCallback((sectionId: string, itemId: string) => {
    deleteItem(listId, sectionId, itemId);
  }, [listId, deleteItem]);

  // Handle edit item
  const handleEditItem = useCallback((sectionId: string, item: PackingItem) => {
    setEditingItem({ sectionId, item });
    setNewItemName(item.name);
    setNewItemNote(item.note || "");
    setNewItemEssential(item.essential || false);
    setShowEditItem(true);
  }, []);

  // Save edited item
  const handleSaveEditItem = useCallback(() => {
    if (!editingItem || !newItemName.trim()) return;

    updateItem(listId, editingItem.sectionId, editingItem.item.id, {
      name: newItemName.trim(),
      note: newItemNote.trim() || undefined,
      essential: newItemEssential,
    });

    setShowEditItem(false);
    setEditingItem(null);
    setNewItemName("");
    setNewItemNote("");
    setNewItemEssential(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [editingItem, newItemName, newItemNote, newItemEssential, listId, updateItem]);

  // Handle add item
  const handleAddItem = useCallback(() => {
    if (!activeSectionId || !newItemName.trim()) return;

    addItem(listId, activeSectionId, newItemName.trim(), newItemEssential);

    setShowAddItem(false);
    setNewItemName("");
    setNewItemNote("");
    setNewItemEssential(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [listId, activeSectionId, newItemName, newItemEssential, addItem]);

  // Handle add section
  const handleAddSection = useCallback(() => {
    if (!newSectionName.trim()) return;

    addSection(listId, newSectionName.trim());

    setShowAddSection(false);
    setNewSectionName("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [listId, newSectionName, addSection]);

  // Handle delete section
  const handleDeleteSection = useCallback((sectionId: string, sectionTitle: string) => {
    Alert.alert(
      "Delete Section",
      `Delete "${sectionTitle}" and all its items?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteSection(listId, sectionId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [listId, deleteSection]);

  // Handle reset list
  const handleResetList = useCallback(() => {
    Alert.alert(
      "Reset List",
      "Mark all items as unpacked?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: () => {
            uncheckAllItems(listId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [listId, uncheckAllItems]);

  // Handle share/export
  const handleShare = useCallback(async () => {
    if (!list) return;

    let text = `📦 ${list.name}\n`;
    text += `${list.tripType} • ${list.season}\n\n`;

    list.sections.forEach((section) => {
      if (section.items.length > 0) {
        text += `📂 ${section.title}\n`;
        section.items.forEach((item) => {
          const check = item.checked ? "✅" : "⬜";
          text += `${check} ${item.name}${item.note ? ` (${item.note})` : ""}\n`;
        });
        text += "\n";
      }
    });

    text += `\nProgress: ${progress.packed}/${progress.total} (${progress.percentage}%)`;

    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied!", "Packing list copied to clipboard");
  }, [list, progress]);

  // Handle use as template (copy to new list)
  const handleUseAsNewList = useCallback(() => {
    if (!list) return;
    
    Alert.alert(
      "Create New List",
      `Create a new packing list from "${list.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: () => {
            const newListId = copyTemplateToTrip(listId);
            if (newListId) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              navigation.replace("PackingListEditor" as any, { listId: newListId });
            }
          },
        },
      ]
    );
  }, [list, listId, copyTemplateToTrip, navigation]);

  // More menu - different options based on whether it's a template
  const handleMoreMenu = useCallback(() => {
    const isTemplate = list?.isTemplate;
    
    const options: any[] = [
      { text: "Add Section", onPress: () => setShowAddSection(true) },
      { text: "Reset All Items", onPress: handleResetList },
      { text: "Share List", onPress: handleShare },
    ];
    
    if (isTemplate) {
      // Template-specific options
      options.push({ text: "Create List from Template", onPress: handleUseAsNewList });
    }
    
    options.push({ text: "Cancel", style: "cancel" });
    
    Alert.alert(
      isTemplate ? "Template Options" : "Options",
      undefined,
      options
    );
  }, [list, handleResetList, handleShare, handleUseAsNewList]);

  if (!list) {
    return (
      <View className="flex-1 bg-parchment items-center justify-center">
        <Text style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}>
          List not found
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-parchment">
        {/* Header */}
        <SafeAreaView edges={["top"]} style={{ backgroundColor: DEEP_FOREST }}>
          <View
            style={{
              paddingTop: 8,
              paddingHorizontal: 20,
              paddingBottom: 16,
              backgroundColor: DEEP_FOREST,
            }}
          >
            {/* Top Row */}
            <View className="flex-row items-center justify-between mb-3">
              <Pressable
                onPress={() => navigation.goBack()}
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
              >
                <Ionicons name="arrow-back" size={20} color={PARCHMENT} />
              </Pressable>

              <View className="flex-1 mx-4">
                <View className="flex-row items-center justify-center">
                  {list.isTemplate && (
                    <View className="flex-row items-center mr-2 px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
                      <Ionicons name="copy-outline" size={12} color={PARCHMENT} />
                      <Text
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 10,
                          color: PARCHMENT,
                          marginLeft: 4,
                        }}
                      >
                        TEMPLATE
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={{
                    fontFamily: "Raleway_700Bold",
                    fontSize: 18,
                    color: PARCHMENT,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  {list.name}
                </Text>
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.7)",
                    textAlign: "center",
                  }}
                >
                  {list.tripType} • {list.season}
                </Text>
              </View>

              <Pressable
                onPress={handleMoreMenu}
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={PARCHMENT} />
              </Pressable>
            </View>

            {/* Progress Bar */}
            <View>
              <View className="flex-row justify-between mb-1">
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 13,
                    color: PARCHMENT,
                  }}
                >
                  {progress.packed} of {progress.total} packed
                </Text>
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {progress.percentage}%
                </Text>
              </View>
              <View
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
              >
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${progress.percentage}%`,
                    backgroundColor: GRANITE_GOLD,
                  }}
                />
              </View>
            </View>
          </View>
        </SafeAreaView>

        {/* Sections & Items */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        >
          {list.sections.map((section) => (
            <View key={section.id} className="mt-4">
              {/* Section Header */}
              <Pressable
                onPress={() => toggleSectionCollapsed(listId, section.id)}
                onLongPress={() => handleDeleteSection(section.id, section.title)}
                className="flex-row items-center justify-between px-4 py-2"
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons
                    name={section.collapsed ? "chevron-forward" : "chevron-down"}
                    size={20}
                    color={DEEP_FOREST}
                  />
                  <Text
                    className="ml-2 text-base"
                    style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
                  >
                    {section.title}
                  </Text>
                  <Text
                    className="ml-2 text-sm"
                    style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                  >
                    ({section.items.filter((i) => i.checked).length}/{section.items.length})
                  </Text>
                </View>

                <Pressable
                  onPress={() => {
                    setActiveSectionId(section.id);
                    setShowAddItem(true);
                  }}
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: DEEP_FOREST }}
                >
                  <Ionicons name="add" size={18} color={PARCHMENT} />
                </Pressable>
              </Pressable>

              {/* Items */}
              {!section.collapsed && (
                <View className="bg-white mx-4 rounded-xl overflow-hidden" style={{ borderWidth: 1, borderColor: BORDER_SOFT }}>
                  {section.items.length === 0 ? (
                    <View className="py-6 items-center">
                      <Text
                        style={{ fontFamily: "SourceSans3_400Regular", color: EARTH_GREEN }}
                      >
                        No items yet
                      </Text>
                    </View>
                  ) : (
                    section.items.map((item) => (
                      <SwipeableItem
                        key={item.id}
                        item={item}
                        listId={listId}
                        sectionId={section.id}
                        onToggle={() => handleToggleItem(section.id, item.id)}
                        onDelete={() => handleDeleteItem(section.id, item.id)}
                        onEdit={() => handleEditItem(section.id, item)}
                      />
                    ))
                  )}
                </View>
              )}
            </View>
          ))}

          {/* Add Section Button */}
          <View className="px-4 mt-6">
            <Pressable
              onPress={() => setShowAddSection(true)}
              className="flex-row items-center justify-center py-3 rounded-xl border-2 border-dashed"
              style={{ borderColor: BORDER_SOFT }}
            >
              <Ionicons name="add-circle-outline" size={20} color={EARTH_GREEN} />
              <Text
                className="ml-2"
                style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: EARTH_GREEN }}
              >
                Add New Section
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Add Item Modal */}
        <Modal visible={showAddItem} animationType="slide" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, justifyContent: "flex-end" }}
          >
            <Pressable
              className="flex-1"
              onPress={() => setShowAddItem(false)}
            />
            <View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 16 }}>
              <Text
                className="text-lg mb-4"
                style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
              >
                Add Item
              </Text>

              <TextInput
                value={newItemName}
                onChangeText={setNewItemName}
                placeholder="Item name"
                placeholderTextColor="#999"
                autoFocus
                className="bg-gray-100 rounded-xl px-4 py-3 mb-3"
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 16,
                  color: DEEP_FOREST,
                }}
              />

              <TextInput
                value={newItemNote}
                onChangeText={setNewItemNote}
                placeholder="Note (optional)"
                placeholderTextColor="#999"
                className="bg-gray-100 rounded-xl px-4 py-3 mb-3"
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 16,
                  color: DEEP_FOREST,
                }}
              />

              <Pressable
                onPress={() => setNewItemEssential(!newItemEssential)}
                className="flex-row items-center mb-4"
              >
                <View
                  className="w-6 h-6 rounded border-2 items-center justify-center mr-3"
                  style={{
                    backgroundColor: newItemEssential ? RUST : "transparent",
                    borderColor: newItemEssential ? RUST : BORDER_SOFT,
                  }}
                >
                  {newItemEssential && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </View>
                <Text style={{ fontFamily: "SourceSans3_400Regular", color: DEEP_FOREST }}>
                  Mark as essential
                </Text>
              </Pressable>

              <Pressable
                onPress={handleAddItem}
                disabled={!newItemName.trim()}
                className="py-4 rounded-xl items-center"
                style={{
                  backgroundColor: newItemName.trim() ? DEEP_FOREST : "#E6E1D6",
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_700Bold",
                    fontSize: 16,
                    color: newItemName.trim() ? PARCHMENT : "#999",
                  }}
                >
                  Add Item
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Edit Item Modal */}
        <Modal visible={showEditItem} animationType="slide" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, justifyContent: "flex-end" }}
          >
            <Pressable
              className="flex-1"
              onPress={() => setShowEditItem(false)}
            />
            <View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 16 }}>
              <Text
                className="text-lg mb-4"
                style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
              >
                Edit Item
              </Text>

              <TextInput
                value={newItemName}
                onChangeText={setNewItemName}
                placeholder="Item name"
                placeholderTextColor="#999"
                autoFocus
                className="bg-gray-100 rounded-xl px-4 py-3 mb-3"
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 16,
                  color: DEEP_FOREST,
                }}
              />

              <TextInput
                value={newItemNote}
                onChangeText={setNewItemNote}
                placeholder="Note (optional)"
                placeholderTextColor="#999"
                className="bg-gray-100 rounded-xl px-4 py-3 mb-3"
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 16,
                  color: DEEP_FOREST,
                }}
              />

              <Pressable
                onPress={() => setNewItemEssential(!newItemEssential)}
                className="flex-row items-center mb-4"
              >
                <View
                  className="w-6 h-6 rounded border-2 items-center justify-center mr-3"
                  style={{
                    backgroundColor: newItemEssential ? RUST : "transparent",
                    borderColor: newItemEssential ? RUST : BORDER_SOFT,
                  }}
                >
                  {newItemEssential && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </View>
                <Text style={{ fontFamily: "SourceSans3_400Regular", color: DEEP_FOREST }}>
                  Mark as essential
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSaveEditItem}
                disabled={!newItemName.trim()}
                className="py-4 rounded-xl items-center"
                style={{
                  backgroundColor: newItemName.trim() ? DEEP_FOREST : "#E6E1D6",
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_700Bold",
                    fontSize: 16,
                    color: newItemName.trim() ? PARCHMENT : "#999",
                  }}
                >
                  Save Changes
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Add Section Modal */}
        <Modal visible={showAddSection} animationType="slide" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, justifyContent: "flex-end" }}
          >
            <Pressable
              className="flex-1"
              onPress={() => setShowAddSection(false)}
            />
            <View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 16 }}>
              <Text
                className="text-lg mb-4"
                style={{ fontFamily: "Raleway_700Bold", color: DEEP_FOREST }}
              >
                Add Section
              </Text>

              <TextInput
                value={newSectionName}
                onChangeText={setNewSectionName}
                placeholder="Section name"
                placeholderTextColor="#999"
                autoFocus
                className="bg-gray-100 rounded-xl px-4 py-3 mb-4"
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 16,
                  color: DEEP_FOREST,
                }}
              />

              <Pressable
                onPress={handleAddSection}
                disabled={!newSectionName.trim()}
                className="py-4 rounded-xl items-center"
                style={{
                  backgroundColor: newSectionName.trim() ? DEEP_FOREST : "#E6E1D6",
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_700Bold",
                    fontSize: 16,
                    color: newSectionName.trim() ? PARCHMENT : "#999",
                  }}
                >
                  Add Section
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}
