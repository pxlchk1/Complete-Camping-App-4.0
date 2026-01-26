/**
 * Add/Edit Packing Item Modal
 * Modal for creating or editing packing list items
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  PackingItemV2,
  PackingCategory,
  PACKING_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from "../types/packingV2";
import { savePackingItem } from "../services/packingServiceV2";
import { useAuth } from "../context/AuthContext";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  CARD_BACKGROUND_LIGHT,
} from "../constants/colors";

interface AddEditPackingItemModalProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  editingItem?: PackingItemV2 | null;
  defaultCategory?: PackingCategory;
  onSaved: () => void;
}

export default function AddEditPackingItemModal({
  visible,
  onClose,
  tripId,
  editingItem,
  defaultCategory,
  onSaved,
}: AddEditPackingItemModalProps) {
  const { user } = useAuth();

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PackingCategory>(
    defaultCategory || "camp_comfort"
  );
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [isEssential, setIsEssential] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      if (editingItem) {
        setName(editingItem.name);
        setCategory(editingItem.category);
        setQuantity(editingItem.quantity);
        setNotes(editingItem.notes || "");
        setIsEssential(editingItem.isEssential);
      } else {
        setName("");
        setCategory(defaultCategory || "camp_comfort");
        setQuantity(1);
        setNotes("");
        setIsEssential(false);
      }
      setShowCategoryPicker(false);
    }
  }, [visible, editingItem, defaultCategory]);

  // Handle save
  const handleSave = async () => {
    if (!user?.uid || !name.trim()) return;

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const itemData: Partial<PackingItemV2> = {
        name: name.trim(),
        category,
        quantity,
        notes: notes.trim() || undefined,
        isEssential,
        isPacked: editingItem?.isPacked || false,
        isFromGearCloset: editingItem?.isFromGearCloset || false,
        gearItemId: editingItem?.gearItemId,
        gearGroup: editingItem?.gearGroup,
        gearVariant: editingItem?.gearVariant,
      };

      if (editingItem) {
        itemData.id = editingItem.id;
        itemData.createdAt = editingItem.createdAt;
      }

      await savePackingItem(user.uid, tripId, itemData);
      onSaved();
      onClose();
    } catch (error) {
      console.error("[AddEditPackingItemModal] Error saving item:", error);
    } finally {
      setSaving(false);
    }
  };

  // Increment/decrement quantity
  const adjustQuantity = (delta: number) => {
    const newQty = Math.max(1, Math.min(99, quantity + delta));
    setQuantity(newQty);
    Haptics.selectionAsync();
  };

  const isEditing = !!editingItem;
  const canSave = name.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-end">
          {/* Backdrop */}
          <Pressable
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onPress={onClose}
          />

          {/* Content */}
          <View
            className="rounded-t-3xl overflow-hidden"
            style={{ backgroundColor: PARCHMENT, maxHeight: "90%" }}
          >
            <SafeAreaView edges={["bottom"]}>
              {/* Header */}
              <View
                className="flex-row items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: BORDER_SOFT }}
              >
                <Pressable onPress={onClose} hitSlop={10}>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 16,
                      color: EARTH_GREEN,
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Text
                  style={{
                    fontFamily: "Raleway_700Bold",
                    fontSize: 17,
                    color: DEEP_FOREST,
                  }}
                >
                  {isEditing ? "Edit Item" : "Add Item"}
                </Text>

                <Pressable
                  onPress={handleSave}
                  disabled={!canSave || saving}
                  hitSlop={10}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 16,
                      color: canSave ? DEEP_FOREST : TEXT_SECONDARY,
                    }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                className="px-5 py-4"
                keyboardShouldPersistTaps="handled"
              >
                {/* Name Input */}
                <View className="mb-5">
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 13,
                      color: TEXT_SECONDARY,
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Item Name
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g., Sleeping bag"
                    placeholderTextColor={TEXT_SECONDARY}
                    className="px-4 py-3 rounded-xl border"
                    style={{
                      borderColor: BORDER_SOFT,
                      backgroundColor: CARD_BACKGROUND_LIGHT,
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 16,
                      color: TEXT_PRIMARY_STRONG,
                    }}
                    autoFocus={!isEditing}
                  />
                </View>

                {/* Category Selector */}
                <View className="mb-5">
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 13,
                      color: TEXT_SECONDARY,
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Category
                  </Text>
                  <Pressable
                    onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                    className="flex-row items-center justify-between px-4 py-3 rounded-xl border"
                    style={{
                      borderColor: BORDER_SOFT,
                      backgroundColor: CARD_BACKGROUND_LIGHT,
                    }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={CATEGORY_ICONS[category] as any}
                        size={18}
                        color={EARTH_GREEN}
                      />
                      <Text
                        style={{
                          fontFamily: "SourceSans3_400Regular",
                          fontSize: 16,
                          color: TEXT_PRIMARY_STRONG,
                          marginLeft: 10,
                        }}
                      >
                        {CATEGORY_LABELS[category]}
                      </Text>
                    </View>
                    <Ionicons
                      name={showCategoryPicker ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={EARTH_GREEN}
                    />
                  </Pressable>

                  {showCategoryPicker && (
                    <View
                      className="mt-2 rounded-xl border overflow-hidden"
                      style={{
                        borderColor: BORDER_SOFT,
                        backgroundColor: CARD_BACKGROUND_LIGHT,
                        maxHeight: 200,
                      }}
                    >
                      <ScrollView nestedScrollEnabled>
                        {PACKING_CATEGORIES.map((cat) => (
                          <Pressable
                            key={cat}
                            onPress={() => {
                              setCategory(cat);
                              setShowCategoryPicker(false);
                              Haptics.selectionAsync();
                            }}
                            className="flex-row items-center px-4 py-3 border-b"
                            style={{
                              borderColor: BORDER_SOFT,
                              backgroundColor:
                                cat === category
                                  ? "rgba(26, 76, 57, 0.1)"
                                  : "transparent",
                            }}
                          >
                            <Ionicons
                              name={CATEGORY_ICONS[cat] as any}
                              size={16}
                              color={cat === category ? DEEP_FOREST : EARTH_GREEN}
                            />
                            <Text
                              style={{
                                fontFamily:
                                  cat === category
                                    ? "SourceSans3_600SemiBold"
                                    : "SourceSans3_400Regular",
                                fontSize: 14,
                                color:
                                  cat === category ? DEEP_FOREST : TEXT_PRIMARY_STRONG,
                                marginLeft: 10,
                              }}
                            >
                              {CATEGORY_LABELS[cat]}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Quantity */}
                <View className="mb-5">
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 13,
                      color: TEXT_SECONDARY,
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Quantity
                  </Text>
                  <View className="flex-row items-center">
                    <Pressable
                      onPress={() => adjustQuantity(-1)}
                      className="w-11 h-11 rounded-xl items-center justify-center border"
                      style={{ borderColor: BORDER_SOFT }}
                    >
                      <Ionicons name="remove" size={20} color={DEEP_FOREST} />
                    </Pressable>
                    <View className="px-6">
                      <Text
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 18,
                          color: TEXT_PRIMARY_STRONG,
                        }}
                      >
                        {quantity}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => adjustQuantity(1)}
                      className="w-11 h-11 rounded-xl items-center justify-center border"
                      style={{ borderColor: BORDER_SOFT }}
                    >
                      <Ionicons name="add" size={20} color={DEEP_FOREST} />
                    </Pressable>
                  </View>
                </View>

                {/* Essential Toggle */}
                <Pressable
                  onPress={() => {
                    setIsEssential(!isEssential);
                    Haptics.selectionAsync();
                  }}
                  className="flex-row items-center justify-between px-4 py-3 rounded-xl border mb-5"
                  style={{
                    borderColor: BORDER_SOFT,
                    backgroundColor: CARD_BACKGROUND_LIGHT,
                  }}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="star" size={18} color={EARTH_GREEN} />
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 16,
                        color: TEXT_PRIMARY_STRONG,
                        marginLeft: 10,
                      }}
                    >
                      Mark as Essential
                    </Text>
                  </View>
                  <View
                    className="w-6 h-6 rounded-md border-2 items-center justify-center"
                    style={{
                      borderColor: isEssential ? DEEP_FOREST : BORDER_SOFT,
                      backgroundColor: isEssential ? DEEP_FOREST : "transparent",
                    }}
                  >
                    {isEssential && (
                      <Ionicons name="checkmark" size={16} color={PARCHMENT} />
                    )}
                  </View>
                </Pressable>

                {/* Notes */}
                <View className="mb-5">
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 13,
                      color: TEXT_SECONDARY,
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Notes (Optional)
                  </Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="e.g., 20°F rated, blue one"
                    placeholderTextColor={TEXT_SECONDARY}
                    multiline
                    numberOfLines={3}
                    className="px-4 py-3 rounded-xl border"
                    style={{
                      borderColor: BORDER_SOFT,
                      backgroundColor: CARD_BACKGROUND_LIGHT,
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 16,
                      color: TEXT_PRIMARY_STRONG,
                      minHeight: 80,
                      textAlignVertical: "top",
                    }}
                  />
                </View>

                {/* Spacer for keyboard */}
                <View style={{ height: 20 }} />
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
