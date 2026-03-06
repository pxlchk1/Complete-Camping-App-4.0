/**
 * MeritBadgesInfoModal
 * 
 * Info modal explaining the merit badge system, shown when tapping (i) on Merit Badges tab.
 * Includes scrollable content with badge highlights and friend approval explanation.
 */

import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  DEEP_FOREST,
  PARCHMENT,
  EARTH_GREEN,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
} from "../constants/colors";

interface MeritBadgesInfoModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const { width, height } = Dimensions.get("window");

export default function MeritBadgesInfoModal({
  visible,
  onDismiss,
}: MeritBadgesInfoModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="ribbon" size={28} color={EARTH_GREEN} />
            <Text style={styles.title}>Merit Badges</Text>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Intro */}
            <Text style={styles.bodyText}>
              Merit badges are little challenges that make camping more fun. Each badge has requirements you can actually do on real trips.
            </Text>

            {/* How it works */}
            <Text style={styles.sectionHeader}>How it works</Text>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>1.</Text>
              <Text style={styles.listText}>Do the thing</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>2.</Text>
              <Text style={styles.listText}>Add a photo as proof (every badge needs one)</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>3.</Text>
              <Text style={styles.listText}>Some badges also need a friend to sign off (because it{"'"}s more fun that way)</Text>
            </View>

            {/* Pro tip */}
            <Text style={styles.sectionHeader}>Pro tip</Text>
            <Text style={styles.bodyText}>
              Earn badges with your My Campground crew. Bragging rights are better with witnesses.
            </Text>
          </ScrollView>

          {/* Got it button */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={onDismiss}
          >
            <Text style={styles.buttonText}>Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    width: width - 48,
    maxWidth: 380,
    maxHeight: height * 0.75,
    borderRadius: 16,
    backgroundColor: PARCHMENT,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SOFT,
  },
  title: {
    fontSize: 22,
    fontFamily: "Raleway_700Bold",
    color: DEEP_FOREST,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  bodyText: {
    fontSize: 16,
    fontFamily: "SourceSans3_400Regular",
    lineHeight: 24,
    color: TEXT_PRIMARY_STRONG,
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 17,
    fontFamily: "SourceSans3_700Bold",
    color: DEEP_FOREST,
    marginTop: 16,
    marginBottom: 10,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    fontFamily: "SourceSans3_400Regular",
    color: EARTH_GREEN,
    marginRight: 8,
    marginTop: 1,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "SourceSans3_400Regular",
    lineHeight: 22,
    color: TEXT_PRIMARY_STRONG,
  },
  badgeHighlight: {
    backgroundColor: "rgba(72, 89, 82, 0.08)",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 15,
    fontFamily: "SourceSans3_600SemiBold",
    color: DEEP_FOREST,
  },
  badgeDesc: {
    fontSize: 14,
    fontFamily: "SourceSans3_400Regular",
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  button: {
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 24,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: DEEP_FOREST,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: PARCHMENT,
    fontSize: 16,
    fontFamily: "SourceSans3_600SemiBold",
  },
});
