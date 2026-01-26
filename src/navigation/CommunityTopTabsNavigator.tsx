/**
 * Community Top Tabs Navigator
 * Material top tabs for Tips, Gear, Ask, Photos, Feedback
 */

import React, { useEffect } from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { View, ImageBackground } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "react-native";
import { useNavigationState, useNavigation } from "@react-navigation/native";
import TipsListScreen from "../screens/community/TipsListScreen";
import GearReviewsListScreen from "../screens/community/GearReviewsListScreen";
import QuestionsListScreen from "../screens/community/QuestionsListScreen";
import PhotosListScreen from "../screens/community/PhotosListScreen";
import FeedbackListScreen from "../screens/community/FeedbackListScreen";
import AccountButtonHeader from "../components/AccountButtonHeader";
import { DEEP_FOREST, PARCHMENT, TEXT_PRIMARY_STRONG, BORDER_SOFT, TEXT_ON_DARK } from "../constants/colors";
import { HERO_IMAGES } from "../constants/images";

const Tab = createMaterialTopTabNavigator();

// Map tab routes to hero images
const getHeroImage = (routeName: string) => {
  switch (routeName) {
    case "Tips":
      return HERO_IMAGES.COMMUNITY;
    case "Gear":
      return HERO_IMAGES.COMMUNITY;
    case "Ask":
      return HERO_IMAGES.COMMUNITY;
    case "Photos":
      return HERO_IMAGES.COMMUNITY;
    case "Feedback":
      return HERO_IMAGES.COMMUNITY;
    default:
      return HERO_IMAGES.COMMUNITY;
  }
};

// Map tab routes to titles and descriptions
const getHeroContent = (routeName: string) => {
  switch (routeName) {
    case "Tips":
      return { title: "Community", description: "Discover expert advice and helpful camping tips" };
    case "Gear":
      return { title: "Community", description: "Read and share honest gear reviews from fellow campers" };
    case "Ask":
      return { title: "Community", description: "Get answers to your camping questions" };
    case "Photos":
      return { title: "Community", description: "Share and explore beautiful camping moments" };
    case "Feedback":
      return { title: "Community", description: "Help us improve with your suggestions" };
    default:
      return { title: "Community", description: "Share tips, gear reviews, and connect with fellow campers" };
  }
};

function HeroHeader({ activeTab }: { activeTab: string }) {
  const insets = useSafeAreaInsets();
  
  const heroImage = getHeroImage(activeTab);
  const { title, description } = getHeroContent(activeTab);

  return (
    <View style={{ height: 200 + insets.top }}>
      <ImageBackground
        source={heroImage}
        style={{ flex: 1 }}
        resizeMode="cover"
        accessibilityLabel="Community camping scene"
      >
        <View className="flex-1" style={{ paddingTop: insets.top }}>
          {/* Account Button - Top Right */}
          <AccountButtonHeader color={TEXT_ON_DARK} />

          <View className="flex-1 justify-end px-6 pb-4">
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.5)"]}
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 100,
              }}
            />
            <Text
              className="text-parchment text-3xl"
              style={{
                fontFamily: "Raleway_700Bold",
                textShadowColor: "rgba(0, 0, 0, 0.5)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
                zIndex: 1,
              }}
            >
              {title}
            </Text>
            <Text
              className="text-parchment mt-2"
              style={{
                fontFamily: "SourceSans3_400Regular",
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

interface CommunityTopTabsNavigatorProps {
  initialRouteName?: string;
}

export default function CommunityTopTabsNavigator({ initialRouteName }: CommunityTopTabsNavigatorProps = {}) {
  const navigation = useNavigation<any>();
  
  // Use navigation state to track active tab
  const activeTabIndex = useNavigationState(state => state?.index ?? 0);
  const tabNames = ["Tips", "Gear", "Ask", "Photos", "Feedback"];
  const activeTab = tabNames[activeTabIndex] || "Tips";

  // Navigate to the requested tab when initialRouteName is provided
  useEffect(() => {
    if (initialRouteName && tabNames.includes(initialRouteName)) {
      // Small delay to ensure navigator is ready
      const timer = setTimeout(() => {
        navigation.navigate(initialRouteName);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [initialRouteName]);

  return (
    <View className="flex-1 bg-parchment">
      {/* Hero Header */}
      <HeroHeader activeTab={activeTab} />

      {/* Material Top Tabs */}
      <Tab.Navigator
        initialRouteName={initialRouteName}
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
            fontSize: 13,
            textTransform: "none",
          },
          tabBarScrollEnabled: true,
          tabBarItemStyle: {
            width: "auto",
            minWidth: 80,
          },
        }}
      >
        <Tab.Screen name="Tips" component={TipsListScreen} />
        <Tab.Screen name="Gear" component={GearReviewsListScreen} />
        <Tab.Screen name="Ask" component={QuestionsListScreen} />
        <Tab.Screen name="Photos" component={PhotosListScreen} />
        <Tab.Screen name="Feedback" component={FeedbackListScreen} />
      </Tab.Navigator>
    </View>
  );
}
