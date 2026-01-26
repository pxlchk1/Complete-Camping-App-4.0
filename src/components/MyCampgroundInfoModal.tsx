/**
 * My Campground Info Modal
 * 
 * Shows first-time information about My Campground feature.
 * Only shown to FREE users on first tap of Quick Action.
 * PRO users can still see it via info icon on the screen.
 */

import React from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  PARCHMENT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
} from "../constants/colors";

interface MyCampgroundInfoModalProps {
  visible: boolean;
  onDismiss: () => void;
  onUpgrade?: () => void;
  source?: string;
}

export default function MyCampgroundInfoModal({
  visible,
  onDismiss,
  onUpgrade,
  source,
}: MyCampgroundInfoModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouchable} onPress={onDismiss} />
        
        <View style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.handle} />
          
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="bonfire" size={48} color={EARTH_GREEN} />
          </View>

          {/* Title */}
          <Text style={styles.title}>What is My Campground?</Text>

          {/* Content */}
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.body}>
              My Campground is your personal group of camping contacts — the people you camp with regularly.
            </Text>

            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="people" size={20} color={EARTH_GREEN} />
                </View>
                <Text style={styles.featureText}>
                  Save your camping crew so you can quickly add them to trips
                </Text>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="mail" size={20} color={EARTH_GREEN} />
                </View>
                <Text style={styles.featureText}>
                  Invite friends to join the app and connect with your group
                </Text>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="star" size={20} color={GRANITE_GOLD} />
                </View>
                <Text style={styles.featureText}>
                  <Text style={styles.proBadge}>Pro: </Text>
                  Share trip plans, weather, meals, and more with your Campground
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={styles.primaryButton}
              onPress={onDismiss}
            >
              <Text style={styles.primaryButtonText}>Got it</Text>
            </Pressable>

            {onUpgrade && (
              <Pressable
                style={styles.secondaryButton}
                onPress={onUpgrade}
              >
                <Ionicons name="star" size={16} color={GRANITE_GOLD} style={{ marginRight: 6 }} />
                <Text style={styles.secondaryButtonText}>Upgrade to Pro</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: PARCHMENT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 24,
    maxHeight: "80%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: BORDER_SOFT,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: CARD_BACKGROUND_LIGHT,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Raleway_700Bold",
    fontSize: 24,
    color: TEXT_PRIMARY_STRONG,
    textAlign: "center",
    marginBottom: 16,
  },
  scrollContent: {
    maxHeight: 280,
  },
  body: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
  },
  featureList: {
    gap: 16,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CARD_BACKGROUND_LIGHT,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    fontFamily: "SourceSans3_400Regular",
    fontSize: 15,
    color: TEXT_PRIMARY_STRONG,
    lineHeight: 22,
  },
  proBadge: {
    fontFamily: "SourceSans3_600SemiBold",
    color: GRANITE_GOLD,
  },
  actions: {
    gap: 12,
    paddingTop: 8,
  },
  primaryButton: {
    backgroundColor: DEEP_FOREST,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 16,
    color: PARCHMENT,
  },
  secondaryButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 14,
    color: GRANITE_GOLD,
  },
});
