/**
 * Paywall Screen
 * Redesigned with CTAs at top, hero image, and features below
 * 
 * Supports:
 * - triggerKey for dynamic title/body based on context (2026-01-01)
 * - variant for standard vs nudge_trial paywall (2026-01-01)
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import Purchases, { PurchasesPackage, PACKAGE_TYPE } from "react-native-purchases";

// Services
import { fetchOfferingsSafe, subscribeToPlan, restorePurchases, syncSubscriptionToFirestore } from "../services/subscriptionService";
import { useSubscriptionStore } from "../state/subscriptionStore";
import { useUserStatus } from "../utils/authHelper";
import { getProAttemptState } from "../services/proAttemptService";
import { RootStackParamList } from "../navigation/types";

// Constants
import {
  DEEP_FOREST,
  EARTH_GREEN,
  GRANITE_GOLD,
  PARCHMENT,
  CARD_BACKGROUND_LIGHT,
  BORDER_SOFT,
  TEXT_PRIMARY_STRONG,
  TEXT_SECONDARY,
  TEXT_MUTED,
} from "../constants/colors";

/**
 * Paywall content for each trigger key
 */
const PAYWALL_CONTENT: Record<string, { title: string; body: string }> = {
  // Default
  default: {
    title: "Go Pro",
    body: "Unlock the full camping toolkit.",
  },
  // Learning
  learning_locked: {
    title: "Unlock Learning with Pro",
    body: "Get access to all learning modules beyond Leave No Trace.",
  },
  // Trips
  second_trip: {
    title: "Ready for trip #2?",
    body: "Pro lets you plan unlimited trips and keep everything organized.",
  },
  // Favorites
  favorites_limit: {
    title: "Save more favorites with Pro",
    body: "Keep unlimited campgrounds and parks saved for later.",
  },
  // Packing
  packing_customization: {
    title: "Customize your packing list",
    body: "Edit items, add your own gear, and save lists with Pro.",
  },
  // Custom Campsites
  custom_campsite: {
    title: "Create custom campsites with Pro",
    body: "Add your own campsites and keep them saved in My Campsite.",
  },
  // Gear Closet limit (15 items)
  gear_closet_limit: {
    title: "Save more gear with Pro",
    body: "Pro keeps an unlimited Gear Closet, so you can reuse it for every trip.",
  },
  // Campground sharing (Pro-only for sender)
  campground_sharing: {
    title: "Share your trip plan with your Campground",
    body: "Pro lets you share dates, location, route, weather outlook, and meals, all in one place.",
  },
};

/**
 * Nudge trial variant content (shown on 3rd Pro attempt)
 */
const NUDGE_TRIAL_CONTENT = {
  title: "Looks like Pro would help",
  bodyWithTrial: "You've bumped into a few Pro features. Want to try them? Start a free 3-day trial and unlock everything.",
  bodyWithoutTrial: "You've bumped into a few Pro features. Want to try them? Upgrade to Pro and unlock everything.",
  ctaWithTrial: "Start free trial",
  ctaWithoutTrial: "Upgrade to Pro",
};

const PRO_FEATURES = [
  "Share trip plans with your camping buddies in My Campground",
  "Build a day-by-day itinerary with trail and map links",
  "Plan trips end-to-end: meals, packing lists, and weather in one place",
  "Get packing help based on season and camping style",
  "Connect with campers for tips, photos, and gear reviews",
  "Offline first aid reference",
  "Track your gear closet and add items to trips fast",
];

type PaywallScreenRouteProp = RouteProp<RootStackParamList, "Paywall">;

export default function PaywallScreen() {
  const navigation = useNavigation();
  const route = useRoute<PaywallScreenRouteProp>();
  const subscriptionLoading = useSubscriptionStore((s) => s.subscriptionLoading);
  const { isLoggedIn, isGuest } = useUserStatus();
  
  // Get triggerKey and variant from route params
  const triggerKey = route.params?.triggerKey || "default";
  const variant = route.params?.variant || "standard";
  const isNudgeVariant = variant === "nudge_trial";
  
  // For standard variant, use trigger-specific content; for nudge, use nudge content
  const standardContent = PAYWALL_CONTENT[triggerKey] || PAYWALL_CONTENT.default;

  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"annual" | "monthly">("annual");
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTrialEligibility, setHasTrialEligibility] = useState(false);
  const [proAttemptCount, setProAttemptCount] = useState(0);

  // Determine display content based on variant
  const displayTitle = isNudgeVariant ? NUDGE_TRIAL_CONTENT.title : standardContent.title;
  const displayBody = isNudgeVariant 
    ? (hasTrialEligibility ? NUDGE_TRIAL_CONTENT.bodyWithTrial : NUDGE_TRIAL_CONTENT.bodyWithoutTrial)
    : standardContent.body;
  const primaryCtaText = isNudgeVariant
    ? (hasTrialEligibility ? NUDGE_TRIAL_CONTENT.ctaWithTrial : NUDGE_TRIAL_CONTENT.ctaWithoutTrial)
    : null; // null means use default plan-based text

  useEffect(() => {
    loadOfferings();
    loadProAttemptCount();
    
    // Log paywall shown analytics
    logPaywallShown();
  }, []);

  const loadProAttemptCount = async () => {
    try {
      const state = await getProAttemptState();
      setProAttemptCount(state.proAttemptCount);
    } catch (error) {
      console.error("[Paywall] Error loading pro attempt count:", error);
    }
  };

  const logPaywallShown = () => {
    // Analytics: paywall_shown
    console.log("[Paywall Analytics] paywall_shown", {
      triggerKey,
      userState: isGuest ? "GUEST" : (isLoggedIn ? "FREE" : "GUEST"),
      variant,
      proAttemptCount,
    });
    
    if (isNudgeVariant) {
      // Analytics: pro_nudge_trial_shown
      console.log("[Paywall Analytics] pro_nudge_trial_shown", {
        triggerKey,
        proAttemptCount,
      });
    }
  };

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("[Paywall] Fetching offerings...");
      const offerings = await fetchOfferingsSafe();

      if (!offerings) {
        console.warn("[Paywall] No offerings returned - RevenueCat may not be configured");
        setError("Subscription options are not available right now. Please check back later or contact support.");
        setLoading(false);
        return;
      }

      const offering = offerings.current;
      
      if (!offering || !offering.availablePackages.length) {
        console.warn("[Paywall] No packages available in current offering");
        setError("Subscription options are not available right now. Please check back later or contact support.");
        setLoading(false);
        return;
      }

      const pkgs = offering.availablePackages;

      // Find monthly and annual packages
      // Products: cca_monthly_sub, cca_annual_sub
      const monthly = pkgs.find((p) => 
        p.product.identifier === "cca_monthly_sub" ||
        p.identifier.toLowerCase().includes("monthly") ||
        p.packageType === PACKAGE_TYPE.MONTHLY
      );
      
      const annual = pkgs.find((p) => 
        p.product.identifier === "cca_annual_sub" ||
        p.identifier.toLowerCase().includes("annual") || 
        p.identifier.toLowerCase().includes("yearly") ||
        p.packageType === PACKAGE_TYPE.ANNUAL
      );

      setMonthlyPackage(monthly || null);
      setAnnualPackage(annual || null);
      
      // Check for trial eligibility on the selected package
      // RevenueCat: check if product has intro pricing (trial) configured
      const selectedPkg = annual || monthly;
      if (selectedPkg) {
        const introPrice = selectedPkg.product.introPrice;
        const hasTrial = introPrice && introPrice.price === 0;
        setHasTrialEligibility(!!hasTrial);
        console.log("[Paywall] Trial eligibility:", hasTrial, introPrice);
      }
      
      console.log("[Paywall] Loaded packages:", {
        monthly: monthly ? {
          identifier: monthly.identifier,
          productId: monthly.product.identifier,
          price: monthly.product.priceString,
        } : null,
        annual: annual ? {
          identifier: annual.identifier,
          productId: annual.product.identifier,
          price: annual.product.priceString,
        } : null,
      });
      
      if (!monthly && !annual) {
        setError("Subscription options are not available right now. Please check back later or contact support.");
      }
    } catch (error) {
      console.error("[Paywall] Failed to load offerings:", error);
      setError("An error occurred while loading subscription options. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    try {
      setPurchasing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const success = await subscribeToPlan(pkg.identifier);

      if (success) {
        // Sync subscription status to Firestore
        await syncSubscriptionToFirestore();

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Welcome to Pro!",
          "You now have access to all premium features.",
          [{ text: "Get Started", onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      console.error("[Paywall] Purchase error:", error);
      if (!error.userCancelled) {
        Alert.alert("Purchase Failed", "Please try again or contact support.");
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setRestoring(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const restored = await restorePurchases();

      if (restored) {
        // Sync subscription status to Firestore
        await syncSubscriptionToFirestore();

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Purchases Restored",
          "Your subscription has been restored.",
          [{ text: "Continue", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("No Purchases Found", "No active subscriptions were found for your account.");
      }
    } catch (error) {
      console.error("[Paywall] Restore error:", error);
      Alert.alert("Restore Failed", "Please try again or contact support.");
    } finally {
      setRestoring(false);
    }
  };

  const handleDismiss = () => {
    // Analytics: paywall_dismissed
    console.log("[Paywall Analytics] paywall_dismissed", {
      triggerKey,
      variant,
      proAttemptCount,
    });
    navigation.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-parchment">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={DEEP_FOREST} />
          <Text
            className="mt-4"
            style={{ fontFamily: "SourceSans3_400Regular", color: TEXT_SECONDARY }}
          >
            Loading plans...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-parchment">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER_SOFT }}>
        <Text
          className="text-2xl"
          style={{ fontFamily: "Raleway_700Bold", color: TEXT_PRIMARY_STRONG }}
        >
          {displayTitle}
        </Text>
        <Pressable
          onPress={handleDismiss}
          className="p-2 active:opacity-70"
          accessibilityLabel="Not now"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={28} color={DEEP_FOREST} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Dynamic Body Text */}
        <View className="px-6 pt-6 pb-4">
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 17,
              color: TEXT_SECONDARY,
              marginBottom: 16,
              lineHeight: 24,
            }}
          >
            {displayBody}
          </Text>
        </View>

        {/* Value Props */}
        <View className="px-6 pb-4">
          {PRO_FEATURES.map((feature, index) => (
            <View key={index} className="flex-row items-center mb-3">
              <View
                className="w-6 h-6 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: EARTH_GREEN }}
              >
                <Ionicons name="checkmark" size={16} color={PARCHMENT} />
              </View>
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 16,
                  color: TEXT_PRIMARY_STRONG,
                  flex: 1,
                }}
              >
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {/* Error/Empty State */}
        {error ? (
          <View className="px-6 py-4">
            <View className="p-6 rounded-xl" style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderWidth: 1, borderColor: BORDER_SOFT }}>
              <Ionicons name="alert-circle-outline" size={48} color={TEXT_SECONDARY} style={{ alignSelf: "center", marginBottom: 12 }} />
              <Text
                className="text-center mb-4"
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 16,
                  color: TEXT_PRIMARY_STRONG,
                }}
              >
                Subscriptions Temporarily Unavailable
              </Text>
              <Text
                className="text-center mb-4"
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 14,
                  color: TEXT_SECONDARY,
                  lineHeight: 20,
                }}
              >
                {error}
              </Text>
              <Pressable
                onPress={loadOfferings}
                className="mt-2 p-3 rounded-xl active:opacity-70"
                style={{ backgroundColor: DEEP_FOREST }}
              >
                <Text
                  className="text-center"
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 15,
                    color: PARCHMENT,
                  }}
                >
                  Try again
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (!monthlyPackage && !annualPackage) ? (
          <View className="px-6 py-4">
            <View className="p-6 rounded-xl" style={{ backgroundColor: CARD_BACKGROUND_LIGHT, borderWidth: 1, borderColor: BORDER_SOFT }}>
              <Ionicons name="information-circle-outline" size={48} color={TEXT_SECONDARY} style={{ alignSelf: "center", marginBottom: 12 }} />
              <Text
                className="text-center"
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 14,
                  color: TEXT_SECONDARY,
                  lineHeight: 20,
                }}
              >
                No subscription options are currently available. Please check back later.
              </Text>
            </View>
          </View>
        ) : (
          <View className="px-6 pb-6">
            {/* Annual Plan Card */}
            {annualPackage && (
              <Pressable
                onPress={() => setSelectedPlan("annual")}
                disabled={purchasing}
                className="mb-3 p-5 rounded-xl border-2 active:opacity-90 relative"
                style={{
                  backgroundColor: selectedPlan === "annual" ? DEEP_FOREST + "15" : CARD_BACKGROUND_LIGHT,
                  borderColor: selectedPlan === "annual" ? DEEP_FOREST : BORDER_SOFT,
                }}
              >
                {/* Best Value Badge */}
                <View
                  className="absolute top-0 right-0 px-3 py-1 rounded-bl-lg rounded-tr-lg"
                  style={{ backgroundColor: GRANITE_GOLD }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 11,
                      color: "#fff",
                    }}
                  >
                    BEST VALUE
                  </Text>
                </View>

                <View className="flex-row items-center justify-between mt-3">
                  <View className="flex-1">
                    <Text
                      style={{
                        fontFamily: "Raleway_700Bold",
                        fontSize: 18,
                        color: TEXT_PRIMARY_STRONG,
                        marginBottom: 2,
                      }}
                    >
                      Annual
                    </Text>
                    <Text
                      style={{
                        fontFamily: "SourceSans3_700Bold",
                        fontSize: 24,
                        color: TEXT_PRIMARY_STRONG,
                        marginBottom: 2,
                      }}
                    >
                      {annualPackage.product.priceString}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 14,
                        color: TEXT_SECONDARY,
                      }}
                    >
                      per year
                    </Text>
                  </View>

                  {/* Radio Button */}
                  <View
                    className="w-6 h-6 rounded-full border-2 items-center justify-center"
                    style={{
                      borderColor: selectedPlan === "annual" ? DEEP_FOREST : BORDER_SOFT,
                      backgroundColor: selectedPlan === "annual" ? DEEP_FOREST : "transparent",
                    }}
                  >
                    {selectedPlan === "annual" && (
                      <View className="w-3 h-3 rounded-full" style={{ backgroundColor: PARCHMENT }} />
                    )}
                  </View>
                </View>
              </Pressable>
            )}

            {/* Monthly Plan Card */}
            {monthlyPackage && (
              <Pressable
                onPress={() => setSelectedPlan("monthly")}
                disabled={purchasing}
                className="mb-3 p-5 rounded-xl border-2 active:opacity-90"
                style={{
                  backgroundColor: selectedPlan === "monthly" ? DEEP_FOREST + "15" : CARD_BACKGROUND_LIGHT,
                  borderColor: selectedPlan === "monthly" ? DEEP_FOREST : BORDER_SOFT,
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text
                      style={{
                        fontFamily: "Raleway_700Bold",
                        fontSize: 18,
                        color: TEXT_PRIMARY_STRONG,
                        marginBottom: 2,
                      }}
                    >
                      Monthly
                    </Text>
                    <Text
                      style={{
                        fontFamily: "SourceSans3_700Bold",
                        fontSize: 24,
                        color: TEXT_PRIMARY_STRONG,
                        marginBottom: 2,
                      }}
                    >
                      {monthlyPackage.product.priceString}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 14,
                        color: TEXT_SECONDARY,
                      }}
                    >
                      per month
                    </Text>
                  </View>

                  {/* Radio Button */}
                  <View
                    className="w-6 h-6 rounded-full border-2 items-center justify-center"
                    style={{
                      borderColor: selectedPlan === "monthly" ? DEEP_FOREST : BORDER_SOFT,
                      backgroundColor: selectedPlan === "monthly" ? DEEP_FOREST : "transparent",
                    }}
                  >
                    {selectedPlan === "monthly" && (
                      <View className="w-3 h-3 rounded-full" style={{ backgroundColor: PARCHMENT }} />
                    )}
                  </View>
                </View>
              </Pressable>
            )}

            {/* Primary CTA */}
            <Pressable
              onPress={() => {
                // Analytics: paywall_primary_cta_tapped
                console.log("[Paywall Analytics] paywall_primary_cta_tapped", {
                  triggerKey,
                  variant,
                  proAttemptCount,
                  selectedPlan,
                });
                const pkg = selectedPlan === "annual" ? annualPackage : monthlyPackage;
                if (pkg) handlePurchase(pkg);
              }}
              disabled={purchasing || (!annualPackage && !monthlyPackage)}
              className="mt-2 p-4 rounded-xl active:opacity-90"
              style={{
                backgroundColor: DEEP_FOREST,
                opacity: purchasing ? 0.6 : 1,
              }}
            >
              {purchasing ? (
                <ActivityIndicator size="small" color={PARCHMENT} />
              ) : (
                <Text
                  className="text-center"
                  style={{
                    fontFamily: "SourceSans3_700Bold",
                    fontSize: 17,
                    color: PARCHMENT,
                  }}
                >
                  {primaryCtaText || (selectedPlan === "annual" ? "Start Annual" : "Start Monthly")}
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Restore Purchases */}
        <View className="px-6 pb-2">
          <Pressable
            onPress={() => {
              // Analytics: restore_purchases_tapped
              console.log("[Paywall Analytics] restore_purchases_tapped", {
                triggerKey,
                variant,
              });
              handleRestore();
            }}
            disabled={restoring}
            className="py-3 active:opacity-70"
          >
            <Text
              className="text-center"
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 15,
                color: restoring ? TEXT_MUTED : DEEP_FOREST,
              }}
            >
              {restoring ? "Restoring..." : "Restore purchases"}
            </Text>
          </Pressable>
        </View>

        {/* Footer Microcopy */}
        <View className="px-6 pb-6">
          <Text
            className="text-center"
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 13,
              color: TEXT_MUTED,
              lineHeight: 18,
            }}
          >
            Cancel anytime. Manage in Apple subscriptions.
          </Text>
          
          {/* Guest-only footer message */}
          {!isLoggedIn && (
            <Text
              className="text-center mt-3"
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 13,
                color: TEXT_SECONDARY,
                lineHeight: 18,
              }}
            >
              Create a free account to save your trips and favorites. Upgrade anytime for Pro tools.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
