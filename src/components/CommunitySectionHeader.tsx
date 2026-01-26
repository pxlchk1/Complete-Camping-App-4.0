/**
 * Community Section Header
 * Shared header component for all Community tabs with deep forest green stripe
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DEEP_FOREST, TEXT_ON_DARK } from "../constants/colors";

interface CommunitySectionHeaderProps {
  title: string;
  onAddPress: () => void;
  showFilter?: boolean;
  onFilterPress?: () => void;
  onInfoPress?: () => void;
}

export default function CommunitySectionHeader({
  title,
  onAddPress,
  showFilter,
  onFilterPress,
  onInfoPress,
}: CommunitySectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {onInfoPress && (
            <Pressable onPress={onInfoPress} style={styles.infoBtn} accessibilityLabel="Info">
              <Ionicons name="information-circle-outline" size={22} color={TEXT_ON_DARK} />
            </Pressable>
          )}
        </View>
        <View style={styles.actions}>
          {showFilter && onFilterPress && (
            <Pressable onPress={onFilterPress} style={styles.actionBtn} accessibilityLabel="Filter">
              <Ionicons name="funnel-outline" size={24} color={TEXT_ON_DARK} />
            </Pressable>
          )}
          <Pressable onPress={onAddPress} style={styles.addBtn} accessibilityLabel="Add">
            <Ionicons name="add-circle" size={32} color={TEXT_ON_DARK} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: DEEP_FOREST,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontFamily: 'Raleway_700Bold',
    color: TEXT_ON_DARK,
    fontSize: 22,
    letterSpacing: 0.5,
  },
  infoBtn: {
    padding: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    padding: 4,
  },
  addBtn: {
    marginLeft: 0,
  },
});
