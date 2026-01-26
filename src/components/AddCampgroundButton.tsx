import React, { useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, textStyles, spacing, radius, fonts, fontSizes, shadows } from "../theme/theme";
import { DEEP_FOREST, EARTH_GREEN, CARD_BACKGROUND_LIGHT, BORDER_SOFT, PARCHMENT, TEXT_PRIMARY_STRONG, TEXT_SECONDARY } from "../constants/colors";

interface AddCampgroundButtonProps {
  onPress: () => void;
}

export default function AddCampgroundButton({ onPress }: AddCampgroundButtonProps) {
  const [showInfoModal, setShowInfoModal] = useState(false);

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          backgroundColor: CARD_BACKGROUND_LIGHT,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: BORDER_SOFT,
          padding: spacing.lg,
          marginBottom: spacing.md,
          opacity: pressed ? 0.7 : 1,
          ...shadows.card,
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.xs }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: DEEP_FOREST,
              alignItems: "center",
              justifyContent: "center",
              marginRight: spacing.sm,
            }}
          >
            <Ionicons name="add" size={24} color={colors.parchment} />
          </View>
          <Text
            style={{
              fontFamily: fonts.displayRegular,
              fontSize: fontSizes.md,
              color: DEEP_FOREST,
              flex: 1,
            }}
          >
            Add your own campground
          </Text>
          {/* Info icon - separate tap target */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              setShowInfoModal(true);
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="information-circle-outline" size={22} color={EARTH_GREEN} />
          </Pressable>
        </View>

        <Text
          style={{
            fontFamily: fonts.bodyRegular,
            fontSize: fontSizes.sm,
            color: EARTH_GREEN,
            lineHeight: 22,
          }}
        >
          Want to include a private or lesser known campground in your trip? Add it here so you can plan with it.
        </Text>
      </Pressable>

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: spacing.xl,
          }}
          onPress={() => setShowInfoModal(false)}
        >
          <Pressable
            style={{
              backgroundColor: PARCHMENT,
              borderRadius: radius.lg,
              padding: spacing.xl,
              maxWidth: 340,
              width: "100%",
              ...shadows.modal,
            }}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.md }}>
              <Ionicons name="information-circle" size={28} color={DEEP_FOREST} />
              <Text
                style={{
                  fontFamily: fonts.displaySemibold,
                  fontSize: fontSizes.lg,
                  color: TEXT_PRIMARY_STRONG,
                  marginLeft: spacing.sm,
                }}
              >
                What is this for?
              </Text>
            </View>

            <Text
              style={{
                fontFamily: fonts.bodyRegular,
                fontSize: fontSizes.md,
                color: TEXT_SECONDARY,
                lineHeight: 24,
                marginBottom: spacing.md,
              }}
            >
              Use this to add private campgrounds that aren't in the national or state park system. Think campgrounds on private land, family property, farms, club campgrounds, or a friend's place.
            </Text>

            <Text
              style={{
                fontFamily: fonts.bodyRegular,
                fontSize: fontSizes.sm,
                color: EARTH_GREEN,
                fontStyle: "italic",
                marginBottom: spacing.lg,
              }}
            >
              Custom campgrounds are private to you.
            </Text>

            <Pressable
              onPress={() => setShowInfoModal(false)}
              style={({ pressed }) => ({
                backgroundColor: DEEP_FOREST,
                borderRadius: radius.md,
                paddingVertical: spacing.md,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: fontSizes.md,
                  color: PARCHMENT,
                }}
              >
                Got it
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
