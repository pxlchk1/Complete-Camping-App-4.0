/**
 * PlanTripIntroModal
 * 
 * 3-slide onboarding modal that appears the first time a user visits Plan Trip.
 * Explains Plan basics, Packing Lists (Pro), and Meal Planner (Pro).
 */

import React, { useState, useEffect } from "react";
import { View, Text, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEEP_FOREST,
  PARCHMENT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
} from "../constants/colors";

const STORAGE_KEY = "planTripIntroSeen";

interface SlideContent {
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SLIDES: SlideContent[] = [
  {
    title: "Plan your trip",
    body: "Start with a trip name and dates, then keep your trip details organized in one place—destinations, notes, links, and itinerary info. Want to share with friends later? You'll be able to invite people to a trip once everything's set.",
    icon: "map-outline",
  },
  {
    title: "Packing Lists is Pro",
    body: "Packing Lists is a Pro feature. Upgrade to use smart templates, build lists from your Gear Closet, and check items off as you pack—so you're not doing it from memory the night before.",
    icon: "checkbox-outline",
  },
  {
    title: "Meal Planner is Pro",
    body: "Meal Planner is a Pro feature. Upgrade to get preplanned meal suggestions and recipes, then make one-tap shopping lists for the whole trip. It's the easiest way to avoid the \"what are we eating\" scramble at camp.",
    icon: "restaurant-outline",
  },
];

interface PlanTripIntroModalProps {
  /** Called when user manually opens via info button */
  forceShow?: boolean;
  /** Called when modal is dismissed */
  onDismiss?: () => void;
}

export default function PlanTripIntroModal({ forceShow, onDismiss }: PlanTripIntroModalProps) {
  const [visible, setVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

  // Check if user has seen the intro before
  useEffect(() => {
    const checkIfSeen = async () => {
      try {
        const seen = await AsyncStorage.getItem(STORAGE_KEY);
        if (seen !== "true") {
          setVisible(true);
        }
      } catch (error) {
        console.error("[PlanTripIntroModal] Error checking storage:", error);
      } finally {
        setHasCheckedStorage(true);
      }
    };
    checkIfSeen();
  }, []);

  // Handle forceShow from info button
  useEffect(() => {
    if (forceShow) {
      setCurrentSlide(0);
      setVisible(true);
    }
  }, [forceShow]);

  const markAsSeen = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, "true");
    } catch (error) {
      console.error("[PlanTripIntroModal] Error saving to storage:", error);
    }
  };

  const handleClose = async () => {
    await markAsSeen();
    setVisible(false);
    setCurrentSlide(0);
    onDismiss?.();
  };

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  if (!hasCheckedStorage) return null;

  const slide = SLIDES[currentSlide];
  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === SLIDES.length - 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
        onPress={handleClose}
      >
        <Pressable
          style={{
            backgroundColor: PARCHMENT,
            borderRadius: 20,
            padding: 28,
            width: "100%",
            maxWidth: 360,
            alignItems: "center",
            position: "relative",
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <Pressable
            onPress={handleClose}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              padding: 4,
              zIndex: 1,
            }}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color={TEXT_SECONDARY} />
          </Pressable>

          {/* Icon */}
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: DEEP_FOREST,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons name={slide.icon} size={32} color={PARCHMENT} />
          </View>

          {/* Title */}
          <Text
            style={{
              fontFamily: "Raleway_700Bold",
              fontSize: 22,
              color: DEEP_FOREST,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            {slide.title}
          </Text>

          {/* Body */}
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 16,
              color: TEXT_PRIMARY_STRONG,
              textAlign: "center",
              lineHeight: 24,
              marginBottom: 24,
            }}
          >
            {slide.body}
          </Text>

          {/* Progress Dots */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              marginBottom: 24,
            }}
          >
            {SLIDES.map((_, index) => (
              <View
                key={index}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: index === currentSlide ? DEEP_FOREST : "#C4C4C4",
                }}
              />
            ))}
          </View>

          {/* Buttons */}
          <View style={{ width: "100%", gap: 12 }}>
            {/* Done button - only on last slide */}
            {isLastSlide ? (
              <Pressable
                onPress={handleNext}
                style={({ pressed }) => ({
                  backgroundColor: DEEP_FOREST,
                  paddingVertical: 14,
                  borderRadius: 10,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 16,
                    color: PARCHMENT,
                    textAlign: "center",
                  }}
                >
                  Done
                </Text>
              </Pressable>
            ) : isFirstSlide ? (
              /* First slide: Next centered */
              <Pressable
                onPress={handleNext}
                style={({ pressed }) => ({
                  paddingVertical: 14,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 16,
                    color: TEXT_SECONDARY,
                    textAlign: "center",
                  }}
                >
                  Next »
                </Text>
              </Pressable>
            ) : (
              /* Navigation row: Back and Next on same line */
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                {/* Back - left side */}
                <Pressable
                  onPress={handleBack}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 14,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 16,
                      color: TEXT_SECONDARY,
                      textAlign: "left",
                    }}
                  >
                    « Back
                  </Text>
                </Pressable>

                {/* Next - right side */}
                <Pressable
                  onPress={handleNext}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 14,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 16,
                      color: TEXT_SECONDARY,
                      textAlign: "right",
                    }}
                  >
                    Next »
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
