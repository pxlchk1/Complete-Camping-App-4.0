/**
 * Learn Top Tabs Navigator
 * Material top tabs for Learn and Merit Badges
 */

import React, { useEffect, useRef, useState } from "react";
import { View, ImageBackground, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useLearnTabStore, LearnTab } from "../state/learnTabStore";
import { useScreenOnboarding } from "../hooks/useScreenOnboarding";

import AccountButtonHeader from "../components/AccountButtonHeader";
import { OnboardingModal } from "../components/OnboardingModal";
import MeritBadgesInfoModal from "../components/MeritBadgesInfoModal";

import LearnScreen from "../screens/LearnScreen";
import MeritBadgesScreen from "../screens/MeritBadgesScreen";

import { DEEP_FOREST, PARCHMENT, BORDER_SOFT, TEXT_ON_DARK } from "../constants/colors";
import { HERO_IMAGES } from "../constants/images";

const Tab = createMaterialTopTabNavigator();

// Static mappings for tab routes
const TAB_KEY_TO_ROUTE: Record<string, string> = {
  learn: "Learn",
  badges: "Merit Badges",
};

const ROUTE_TO_TAB_KEY: Record<string, LearnTab> = {
  Learn: "learn",
  "Merit Badges": "badges",
};

// Map tab routes to hero images
const getHeroImage = (routeName: string) => {
  switch (routeName) {
    case "Learn":
      return HERO_IMAGES.LEARNING;
    case "Merit Badges":
      return HERO_IMAGES.LEARNING;
    default:
      return HERO_IMAGES.LEARNING;
  }
};

// Map tab routes to titles and descriptions
const getHeroContent = (routeName: string) => {
  switch (routeName) {
    case "Learn":
      return { title: "Learn", description: "Master camping skills and earn badges" };
    case "Merit Badges":
      return { title: "Merit Badges", description: "Earn badges by completing camping challenges" };
    default:
      return { title: "Learn", description: "Master camping skills and earn badges" };
  }
};

function HeroHeader({ activeTab, onInfoPress }: { activeTab: string; onInfoPress?: () => void }) {
  const insets = useSafeAreaInsets();

  const heroImage = getHeroImage(activeTab);
  const { title, description } = getHeroContent(activeTab);

  return (
    <View style={{ height: 200 + insets.top }}>
      <ImageBackground
        source={heroImage}
        style={{ flex: 1, backgroundColor: DEEP_FOREST }}
        resizeMode="cover"
        accessibilityLabel="Learning and education scene"
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.6)"]}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          }}
        />
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <AccountButtonHeader color={TEXT_ON_DARK} />

          <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 24, paddingBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text
                style={{
                  fontFamily: "Raleway_700Bold",
                  fontSize: 30,
                  color: PARCHMENT,
                  textShadowColor: "rgba(0, 0, 0, 0.5)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4,
                  zIndex: 1,
                }}
              >
                {title}
              </Text>
              {onInfoPress && (
                <Pressable onPress={onInfoPress} style={{ padding: 4 }} accessibilityLabel="Info">
                  <Ionicons name="information-circle-outline" size={24} color={PARCHMENT} />
                </Pressable>
              )}
            </View>
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                marginTop: 8,
                color: PARCHMENT,
                textShadowColor: "rgba(0, 0, 0, 0.5)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
                zIndex: 1,
              }}
            >
              {description}
            </Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

export default function LearnTopTabsNavigator() {
  // Zustand store for tab state
  const activeTab = useLearnTabStore((s) => s.activeTab);
  const setActiveTab = useLearnTabStore((s) => s.setActiveTab);

  // Onboarding for Learn tab
  const learnOnboarding = useScreenOnboarding("Learn");

  // Merit Badges info modal state
  const [showBadgesInfoModal, setShowBadgesInfoModal] = useState(false);

  // Get the right onInfoPress based on active tab
  const getOnInfoPress = () => {
    switch (activeTab) {
      case "learn":
        return learnOnboarding.openModal;
      case "badges":
        return () => setShowBadgesInfoModal(true);
      default:
        return learnOnboarding.openModal;
    }
  };

  // Ref to store the tab navigator's navigation object
  const tabNavigationRef = useRef<any>(null);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  const isFirstRender = useRef(true);
  const [initialTab, setInitialTab] = useState(TAB_KEY_TO_ROUTE[activeTab] || "Learn");
  const prevActiveTabRef = useRef(activeTab);
  const pendingNavigationRef = useRef<string | null>(null);

  useEffect(() => {
    if (isFirstRender.current) {
      setInitialTab(TAB_KEY_TO_ROUTE[activeTab] || "Learn");
      isFirstRender.current = false;
    }
  }, [activeTab]);

  // Navigate programmatically when activeTab changes from external source
  useEffect(() => {
    if (prevActiveTabRef.current !== activeTab) {
      const targetRoute = TAB_KEY_TO_ROUTE[activeTab];
      if (targetRoute) {
        if (tabNavigationRef.current) {
          try {
            tabNavigationRef.current.navigate(targetRoute);
          } catch (e) {
            console.log("[LEARN_TRACE] Navigation error:", e);
          }
        } else {
          pendingNavigationRef.current = targetRoute;
        }
      }
      prevActiveTabRef.current = activeTab;
    }
  }, [activeTab]);

  // Handle pending navigation when ref becomes available
  useEffect(() => {
    if (isNavigationReady && pendingNavigationRef.current && tabNavigationRef.current) {
      try {
        tabNavigationRef.current.navigate(pendingNavigationRef.current);
      } catch (e) {
        console.log("[LEARN_TRACE] Pending navigation error:", e);
      }
      pendingNavigationRef.current = null;
    }
  }, [isNavigationReady]);

  // When screen comes into focus, sync tab
  useFocusEffect(
    React.useCallback(() => {
      const targetRoute = TAB_KEY_TO_ROUTE[activeTab];
      if (tabNavigationRef.current && targetRoute) {
        const currentState = tabNavigationRef.current.getState?.();
        const currentRouteName = currentState?.routes?.[currentState?.index]?.name;
        
        if (currentRouteName && currentRouteName !== targetRoute) {
          try {
            tabNavigationRef.current.navigate(targetRoute);
          } catch (e) {
            console.log("[LEARN_TRACE] Focus navigation error:", e);
          }
        }
      }
    }, [activeTab])
  );

  const activeRouteName = TAB_KEY_TO_ROUTE[activeTab] || "Learn";

  return (
    <View style={{ flex: 1, backgroundColor: PARCHMENT }}>
      {/* Hero Header */}
      <HeroHeader activeTab={activeRouteName} onInfoPress={getOnInfoPress()} />

      {/* Material Top Tabs */}
      <Tab.Navigator
        initialRouteName={initialTab}
        screenOptions={{
          tabBarStyle: {
            backgroundColor: PARCHMENT,
            borderBottomWidth: 1,
            borderBottomColor: BORDER_SOFT,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarActiveTintColor: DEEP_FOREST,
          tabBarInactiveTintColor: "#696969",
          tabBarIndicatorStyle: {
            backgroundColor: "#f59e0b",
            height: 3,
          },
          tabBarLabelStyle: {
            fontFamily: "SourceSans3_600SemiBold",
            fontSize: 11,
            textTransform: "none",
          },
          tabBarScrollEnabled: false,
        }}
        screenListeners={({ navigation }) => {
          if (!tabNavigationRef.current) {
            tabNavigationRef.current = navigation;
            if (!isNavigationReady) {
              setIsNavigationReady(true);
            }
          }
          return {
            state: (e) => {
              const state = e.data.state;
              const routeName = state.routes[state.index]?.name;
              const tabKey = ROUTE_TO_TAB_KEY[routeName];
              if (tabKey && tabKey !== activeTab) setActiveTab(tabKey);
            },
          };
        }}
      >
        <Tab.Screen name="Learn" component={LearnScreen} />
        <Tab.Screen name="Merit Badges" component={MeritBadgesScreen} />
      </Tab.Navigator>

      {/* Onboarding Modal for Learn tab */}
      {learnOnboarding && activeTab === "learn" && (
        <OnboardingModal
          visible={learnOnboarding.showModal}
          tooltip={learnOnboarding.currentTooltip}
          onDismiss={learnOnboarding.dismissModal}
        />
      )}

      {/* Merit Badges Info Modal */}
      <MeritBadgesInfoModal
        visible={showBadgesInfoModal}
        onDismiss={() => setShowBadgesInfoModal(false)}
      />
    </View>
  );
}
