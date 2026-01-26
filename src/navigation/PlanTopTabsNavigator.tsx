/**
 * Plan Top Tabs Navigator
 * Material top tabs for Trips, Campgrounds, Meals, Pack, Weather
 */

import React, { useEffect, useRef, useState } from "react";
import { View, ImageBackground, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { usePlanTabStore, PlanTab } from "../state/planTabStore";
import { useScreenOnboarding } from "../hooks/useScreenOnboarding";

import AccountButtonHeader from "../components/AccountButtonHeader";
import OnboardingModal from "../components/OnboardingModal";
import PlanTripIntroModal from "../components/PlanTripIntroModal";

import MyTripsScreen from "../screens/MyTripsScreen";
import ParksBrowseScreen from "../screens/ParksBrowseScreen";
import WeatherScreen from "../screens/WeatherScreen";
import PlanSafeScreen from "../screens/PlanSafeScreen";

import { DEEP_FOREST, PARCHMENT, BORDER_SOFT, TEXT_ON_DARK } from "../constants/colors";
import { HERO_IMAGES } from "../constants/images";

const Tab = createMaterialTopTabNavigator();

// Map tab routes to hero images
const getHeroImage = (routeName: string) => {
  switch (routeName) {
    case "Plan":
      return HERO_IMAGES.PLAN_TRIP;
    case "Parks":
      return HERO_IMAGES.HEADER;
    case "Weather":
      return HERO_IMAGES.WEATHER;
    default:
      return HERO_IMAGES.PLAN_TRIP;
  }
};

// Map tab routes to titles and descriptions
const getHeroContent = (routeName: string) => {
  switch (routeName) {
    case "Plan":
      return { title: "Plan Your Trip", description: "Organize everything here—destination, packing, meals, and weather—all in one place." };
    case "Parks":
      return { title: "Find a Park", description: "Search thousands of National Park, National Forest, and State Park campgrounds across all US states & territories." };
    case "Weather":
      return { title: "Weather", description: "Check conditions for your camping destination" };
    default:
      return { title: "Plan Your Trip", description: "Organize everything here—destination, packing, meals, and weather—all in one place." };
  }
};

function HeroHeader({ activeTab, onInfoPress }: { activeTab: string; onInfoPress?: () => void }) {
  const insets = useSafeAreaInsets();

  const heroImage = getHeroImage(activeTab);
  const { title, description } = getHeroContent(activeTab);

  // Darker gradient for Plan tab specifically
  const gradientColors = activeTab === "Plan" 
    ? ["rgba(0,0,0,0.25)", "rgba(0,0,0,0.7)"] as const
    : ["rgba(0,0,0,0.1)", "rgba(0,0,0,0.6)"] as const;

  console.log("[HERO_DEBUG] activeTab:", activeTab, "heroImage:", heroImage);

  return (
    <View style={{ height: 200 + insets.top }}>
      <ImageBackground
        source={heroImage}
        style={{ flex: 1 }}
        resizeMode="cover"
        accessibilityLabel="Planning camping scene"
      >
        {/* Gradient Overlay - covers full image including safe area */}
        <LinearGradient
          colors={gradientColors}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          }}
        />
        <View style={{ flex: 1, paddingTop: insets.top }}>
          {/* Account Button - Top Right */}
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

export default function PlanTopTabsNavigator() {
  console.log("[PLAN_TRACE] Enter PlanTopTabsNavigator");

  // Zustand store for tab state
  const activeTab = usePlanTabStore((s) => s.activeTab);
  const setActiveTab = usePlanTabStore((s) => s.setActiveTab);

  // State for Plan Trip intro modal (triggered by info button)
  const [showPlanIntro, setShowPlanIntro] = useState(false);

  // Onboarding hooks for Parks and Weather tabs only
  const parksOnboarding = useScreenOnboarding("Parks");
  const weatherOnboarding = useScreenOnboarding("Weather");

  // Get the right onInfoPress based on active tab
  const getOnInfoPress = () => {
    switch (activeTab) {
      case "trips":
        return () => setShowPlanIntro(true);
      case "parks":
        return parksOnboarding.openModal;
      case "weather":
        return weatherOnboarding.openModal;
      default:
        return () => setShowPlanIntro(true);
    }
  };

  // Get the current onboarding state for rendering modal (Parks and Weather only)
  const getCurrentOnboarding = () => {
    switch (activeTab) {
      case "parks":
        return parksOnboarding;
      case "weather":
        return weatherOnboarding;
      default:
        return null;
    }
  };

  const currentOnboarding = getCurrentOnboarding();

  // Ref to store the tab navigator's navigation object
  const tabNavigationRef = useRef<any>(null);
  // State to trigger re-render when navigation ref is available
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  const tabKeyToRoute: Record<string, string> = {
    trips: "Plan",
    parks: "Parks",
    weather: "Weather",
  };

  const routeToTabKey: Record<string, PlanTab> = {
    Plan: "trips",
    Parks: "parks",
    Weather: "weather",
  };

  // Ref to prevent initial tab reset on every render
  const isFirstRender = useRef(true);
  const [initialTab, setInitialTab] = useState(tabKeyToRoute[activeTab] || "Plan");

  // Track the previous activeTab to detect external changes
  const prevActiveTabRef = useRef(activeTab);
  // Track pending navigation when ref wasn't ready
  const pendingNavigationRef = useRef<string | null>(null);

  useEffect(() => {
    if (isFirstRender.current) {
      setInitialTab(tabKeyToRoute[activeTab] || "Plan");
      isFirstRender.current = false;
    }
  }, [activeTab]);

  // Navigate programmatically when activeTab changes from external source (e.g., HomeScreen Quick Actions)
  useEffect(() => {
    // Skip if this is the first render or if the tab hasn't changed
    if (prevActiveTabRef.current !== activeTab) {
      const targetRoute = tabKeyToRoute[activeTab];
      if (targetRoute) {
        if (tabNavigationRef.current) {
          console.log("[PLAN_TRACE] Navigating to tab:", targetRoute);
          try {
            tabNavigationRef.current.navigate(targetRoute);
          } catch (e) {
            console.log("[PLAN_TRACE] Navigation error:", e);
          }
        } else {
          // Store pending navigation for when ref becomes available
          console.log("[PLAN_TRACE] Navigation pending, ref not ready:", targetRoute);
          pendingNavigationRef.current = targetRoute;
        }
      }
      prevActiveTabRef.current = activeTab;
    }
  }, [activeTab]);

  // Handle pending navigation when ref becomes available
  useEffect(() => {
    if (isNavigationReady && pendingNavigationRef.current && tabNavigationRef.current) {
      console.log("[PLAN_TRACE] Executing pending navigation:", pendingNavigationRef.current);
      try {
        tabNavigationRef.current.navigate(pendingNavigationRef.current);
      } catch (e) {
        console.log("[PLAN_TRACE] Pending navigation error:", e);
      }
      pendingNavigationRef.current = null;
    }
  }, [isNavigationReady]);

  // When screen comes into focus, ensure the tab navigator is on the correct tab
  // This handles the case where activeTab was changed while the screen was in the background
  useFocusEffect(
    React.useCallback(() => {
      const targetRoute = tabKeyToRoute[activeTab];
      if (tabNavigationRef.current && targetRoute) {
        // Check if the current tab matches what we expect
        const currentState = tabNavigationRef.current.getState?.();
        const currentRouteName = currentState?.routes?.[currentState?.index]?.name;
        
        if (currentRouteName && currentRouteName !== targetRoute) {
          console.log("[PLAN_TRACE] Focus: syncing tab from", currentRouteName, "to", targetRoute);
          try {
            tabNavigationRef.current.navigate(targetRoute);
          } catch (e) {
            console.log("[PLAN_TRACE] Focus navigation error:", e);
          }
        }
      }
    }, [activeTab])
  );

  const activeRouteName = tabKeyToRoute[activeTab] || "Plan";

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
          // Capture the navigation object for programmatic navigation
          if (!tabNavigationRef.current) {
            tabNavigationRef.current = navigation;
            // Trigger re-render to handle any pending navigation
            if (!isNavigationReady) {
              setIsNavigationReady(true);
            }
          }
          return {
            state: (e) => {
              const state = e.data.state;
              const routeName = state.routes[state.index]?.name;
              const tabKey = routeToTabKey[routeName];
              if (tabKey && tabKey !== activeTab) setActiveTab(tabKey);
            },
          };
        }}
      >
        <Tab.Screen name="Plan" component={MyTripsScreen} />
        <Tab.Screen name="Parks" component={ParksBrowseScreen} />
        <Tab.Screen name="Weather" component={WeatherScreen} />
      </Tab.Navigator>
      
      {/* Plan Trip Intro Modal (3-slide) */}
      <PlanTripIntroModal
        forceShow={showPlanIntro}
        onDismiss={() => setShowPlanIntro(false)}
      />

      {/* Onboarding Modal for Parks and Weather tabs */}
      {currentOnboarding && (
        <OnboardingModal
          visible={currentOnboarding.showModal}
          tooltip={currentOnboarding.currentTooltip}
          onDismiss={currentOnboarding.dismissModal}
        />
      )}
    </View>
  );
}
