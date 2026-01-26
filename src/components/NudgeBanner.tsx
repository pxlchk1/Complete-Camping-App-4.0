/**
 * In-App Nudge Banner Component
 * Shows contextual onboarding tips as dismissable banners
 */

import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import {
  getCurrentNudge,
  dismissNudge,
  recordNudgeShown,
  InAppNudge,
} from "../services/inAppNudgeService";
import { DEEP_LINK_ROUTES } from "../types/notifications";
import { RootStackNavigationProp } from "../navigation/types";
import {
  DEEP_FOREST,
  EARTH_GREEN,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
} from "../constants/colors";

interface NudgeBannerProps {
  /** Where the banner is shown (for styling/priority) */
  location?: "home" | "plan" | "community";
  /** Force show a specific nudge (for testing) */
  forceNudge?: InAppNudge;
}

export default function NudgeBanner({ location = "home", forceNudge }: NudgeBannerProps) {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [nudge, setNudge] = useState<InAppNudge | null>(forceNudge || null);
  const [visible, setVisible] = useState(!!forceNudge);
  const slideAnim = useState(new Animated.Value(-100))[0];

  useEffect(() => {
    if (forceNudge) {
      setNudge(forceNudge);
      setVisible(true);
      animateIn();
      return;
    }

    loadNudge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceNudge]);

  const loadNudge = async () => {
    try {
      const currentNudge = await getCurrentNudge();
      if (currentNudge) {
        setNudge(currentNudge);
        setVisible(true);
        await recordNudgeShown(currentNudge.type);
        animateIn();
      }
    } catch (error) {
      console.error("[NudgeBanner] Error loading nudge:", error);
    }
  };

  const animateIn = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const animateOut = (callback?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      callback?.();
    });
  };

  const handlePress = () => {
    if (!nudge) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Parse deep link and navigate
    const route = DEEP_LINK_ROUTES[nudge.deepLink];
    if (route) {
      animateOut(() => {
        if (nudge.dismissable) {
          dismissNudge(nudge.type);
        }
        navigation.navigate(route.screen as any, route.params);
      });
    }
  };

  const handleDismiss = () => {
    if (!nudge) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateOut(() => {
      dismissNudge(nudge.type);
    });
  };

  if (!visible || !nudge) {
    return null;
  }

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 4,
      }}
    >
      <Pressable
        onPress={handlePress}
        style={{
          backgroundColor: CARD_BACKGROUND_LIGHT,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: EARTH_GREEN + "30",
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {/* Icon */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: EARTH_GREEN + "15",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name="bulb-outline" size={20} color={EARTH_GREEN} />
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              fontSize: 15,
              color: DEEP_FOREST,
              marginBottom: 2,
            }}
          >
            {nudge.title}
          </Text>
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 13,
              color: EARTH_GREEN,
            }}
            numberOfLines={2}
          >
            {nudge.body}
          </Text>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 8 }}>
          {nudge.dismissable && (
            <Pressable
              onPress={handleDismiss}
              hitSlop={8}
              style={{
                padding: 4,
                marginRight: 4,
              }}
            >
              <Ionicons name="close" size={20} color={EARTH_GREEN + "80"} />
            </Pressable>
          )}
          <Ionicons name="chevron-forward" size={18} color={EARTH_GREEN} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============================================
// MINI TOAST VARIANT (for event nudges)
// ============================================

interface MiniNudgeToastProps {
  title: string;
  body: string;
  deepLink: string;
  onDismiss: () => void;
  duration?: number;
}

export function MiniNudgeToast({
  title,
  body,
  deepLink,
  onDismiss,
  duration = 5000,
}: MiniNudgeToastProps) {
  const navigation = useNavigation<RootStackNavigationProp>();
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto dismiss after duration
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(onDismiss);
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const route = DEEP_LINK_ROUTES[deepLink];
    if (route) {
      onDismiss();
      navigation.navigate(route.screen as any, route.params);
    }
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        position: "absolute",
        bottom: 100,
        left: 16,
        right: 16,
        backgroundColor: DEEP_FOREST,
        borderRadius: 12,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      <Pressable onPress={handlePress} style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
        <Ionicons name="sparkles" size={18} color={PARCHMENT} style={{ marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              fontSize: 14,
              color: PARCHMENT,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 12,
              color: PARCHMENT + "CC",
            }}
            numberOfLines={1}
          >
            {body}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={PARCHMENT + "80"} />
      </Pressable>

      <Pressable onPress={onDismiss} hitSlop={8} style={{ padding: 4, marginLeft: 8 }}>
        <Ionicons name="close" size={18} color={PARCHMENT + "80"} />
      </Pressable>
    </Animated.View>
  );
}
