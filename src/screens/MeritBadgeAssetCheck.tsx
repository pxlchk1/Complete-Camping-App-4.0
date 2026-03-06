/**
 * MeritBadgeAssetCheck
 *
 * DEV-ONLY screen to verify all merit badge PNG assets load correctly.
 * Renders every badge image from the registry in a grid with its key label.
 *
 * @important This screen should only be accessible in development builds.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { badgeImages, getAllBadgeImageKeys, BadgeImageKey } from "../assets/images/merit_badges/badgeImageMap";
import { resolveBadgeImage, hasBadgeImage } from "../assets/images/merit_badges/resolveBadgeImage";
import {
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
  EARTH_GREEN,
} from "../constants/colors";

interface BadgeAssetItemProps {
  imageKey: BadgeImageKey;
  onError: (key: string) => void;
}

function BadgeAssetItem({ imageKey, onError }: BadgeAssetItemProps) {
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
    onError(imageKey);
  };

  return (
    <View style={styles.badgeItem}>
      <View style={[styles.imageContainer, hasError && styles.imageError]}>
        <Image
          source={badgeImages[imageKey]}
          style={styles.badgeImage}
          resizeMode="contain"
          onError={handleError}
        />
        {hasError && (
          <View style={styles.errorOverlay}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
          </View>
        )}
      </View>
      <Text style={styles.keyLabel} numberOfLines={2}>
        {imageKey}
      </Text>
    </View>
  );
}

export default function MeritBadgeAssetCheck() {
  const insets = useSafeAreaInsets();
  const [errorKeys, setErrorKeys] = useState<string[]>([]);

  const allKeys = getAllBadgeImageKeys();
  const totalCount = allKeys.length;
  const errorCount = errorKeys.length;
  const successCount = totalCount - errorCount;

  const handleError = (key: string) => {
    setErrorKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  // Test the resolver with some sample keys
  const testResolverKeys = [
    "camp_setup_and_shelter_1",
    "fire_and_warmth_campfire_storyteller",
    "invalid_key_test",
    "",
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Badge Asset Check</Text>
        <Text style={styles.subtitle}>DEV ONLY - Verify all badge PNGs load</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{totalCount}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: `${EARTH_GREEN}20` }]}>
          <Text style={[styles.statNumber, { color: EARTH_GREEN }]}>{successCount}</Text>
          <Text style={styles.statLabel}>Loaded</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: errorCount > 0 ? "#FEE2E2" : CARD_BACKGROUND_LIGHT }]}>
          <Text style={[styles.statNumber, { color: errorCount > 0 ? "#EF4444" : TEXT_MUTED }]}>
            {errorCount}
          </Text>
          <Text style={styles.statLabel}>Errors</Text>
        </View>
      </View>

      {/* Resolver Test Section */}
      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Resolver Test</Text>
        <View style={styles.testRow}>
          {testResolverKeys.map((key) => (
            <View key={key || "empty"} style={styles.testItem}>
              <Image
                source={resolveBadgeImage(key)}
                style={styles.testImage}
                resizeMode="contain"
              />
              <Text style={styles.testLabel} numberOfLines={1}>
                {key || "(empty)"}
              </Text>
              <Text style={[styles.testStatus, { color: hasBadgeImage(key) ? EARTH_GREEN : "#F59E0B" }]}>
                {hasBadgeImage(key) ? "✓" : "fallback"}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Error List */}
      {errorCount > 0 && (
        <View style={styles.errorSection}>
          <Text style={styles.errorTitle}>Failed Keys:</Text>
          <Text style={styles.errorList}>{errorKeys.join(", ")}</Text>
        </View>
      )}

      {/* Badge Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}
      >
        {allKeys.map((key) => (
          <BadgeAssetItem key={key} imageKey={key} onError={handleError} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PARCHMENT,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SOFT,
  },
  title: {
    fontFamily: "Raleway_700Bold",
    fontSize: 24,
    color: TEXT_PRIMARY_STRONG,
  },
  subtitle: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: CARD_BACKGROUND_LIGHT,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  statNumber: {
    fontFamily: "SourceSans3_700Bold",
    fontSize: 24,
    color: TEXT_PRIMARY_STRONG,
  },
  statLabel: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  testSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SOFT,
  },
  sectionTitle: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 14,
    color: TEXT_PRIMARY_STRONG,
    marginBottom: 8,
  },
  testRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  testItem: {
    alignItems: "center",
    width: 70,
  },
  testImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD_BACKGROUND_LIGHT,
  },
  testLabel: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 9,
    color: TEXT_MUTED,
    marginTop: 4,
    textAlign: "center",
  },
  testStatus: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 10,
  },
  errorSection: {
    backgroundColor: "#FEE2E2",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorTitle: {
    fontFamily: "SourceSans3_600SemiBold",
    fontSize: 13,
    color: "#991B1B",
    marginBottom: 4,
  },
  errorList: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 11,
    color: "#991B1B",
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  badgeItem: {
    width: "25%",
    paddingHorizontal: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: CARD_BACKGROUND_LIGHT,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER_SOFT,
  },
  imageError: {
    borderColor: "#EF4444",
    borderWidth: 2,
  },
  badgeImage: {
    width: 52,
    height: 52,
  },
  errorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(254, 226, 226, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  keyLabel: {
    fontFamily: "SourceSans3_400Regular",
    fontSize: 9,
    color: TEXT_MUTED,
    marginTop: 4,
    textAlign: "center",
    lineHeight: 11,
  },
});
