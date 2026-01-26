/**
 * RevenueCat Client Wrapper
 * Handles all RevenueCat SDK interactions for subscription management
 */

import Purchases, {
  CustomerInfo,
  PurchasesPackage,
  PurchasesOffering,
  LOG_LEVEL,
} from "react-native-purchases";
import { Platform } from "react-native";
import Constants from "expo-constants";

// RevenueCat API Keys - Using existing Complete Camping App project
const REVENUECAT_API_KEY_IOS = "appl_CXLKpXutDryiSmKJsclChUqLmie"; // Complete Camping App (App Store)
const REVENUECAT_API_KEY_ANDROID = ""; // Add when Android is needed

let isInitialized = false;
let isConfigured = false;

/**
 * Check if running in Expo Go (which doesn't have native RevenueCat support)
 */
const isExpoGo = (): boolean => {
  return Constants.appOwnership === "expo";
};

/**
 * Check if RevenueCat is properly configured
 */
export const isRevenueCatReady = (): boolean => {
  return isConfigured;
};

/**
 * Initialize RevenueCat SDK anonymously
 * Must be called once at app launch before any auth state is known
 */
export const initRevenueCat = async (): Promise<boolean> => {
  if (isInitialized) {
    console.log("[RevenueCat] Already initialized");
    return isConfigured;
  }

  isInitialized = true;

  try {
    // Check if we're in Expo Go - RevenueCat requires native code
    if (isExpoGo()) {
      console.log("[RevenueCat] Running in Expo Go - native purchases unavailable (expected)");
      isConfigured = false;
      return false;
    }

    // Check if we're on web - RevenueCat doesn't work on web
    if (Platform.OS === "web") {
      console.log("[RevenueCat] Running on web - purchases disabled");
      isConfigured = false;
      return false;
    }

    // Check if API key is configured
    const apiKey = Platform.OS === "ios" ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
    if (!apiKey) {
      console.log("[RevenueCat] No API key configured for platform:", Platform.OS);
      isConfigured = false;
      return false;
    }

    // Configure RevenueCat ANONYMOUSLY (no appUserId)
    // User will be identified later via identifyUser() when Firebase auth resolves
    await Purchases.configure({ apiKey });

    // Set debug log level for rollout phase
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);

    isConfigured = true;
    console.log("[RevenueCat] Successfully configured anonymously");
    return true;
  } catch (error) {
    console.error("[RevenueCat] Failed to configure:", error);
    isConfigured = false;
    return false;
  }
};

/**
 * Register a listener for CustomerInfo updates
 * Should be called once after initialization
 */
export const addCustomerInfoListener = (callback: (info: CustomerInfo) => void): void => {
  if (!isRevenueCatReady()) {
    console.log("[RevenueCat] Not configured - cannot add listener");
    return;
  }

  try {
    Purchases.addCustomerInfoUpdateListener(callback);
    console.log("[RevenueCat] CustomerInfo listener registered");
  } catch (error) {
    console.error("[RevenueCat] Failed to add listener:", error);
  }
}

let currentIdentifiedUserId: string | null = null;

/**
 * Identify the user in RevenueCat using Firebase uid
 * CRITICAL: Must use Firebase Auth uid, NOT email
 * Only call once per uid change to avoid duplicate login calls
 */
export const identifyUser = async (firebaseUid: string): Promise<void> => {
  if (!isRevenueCatReady()) {
    console.log("[RevenueCat] Not configured - skipping user identification");
    return;
  }

  // Prevent duplicate identification
  if (currentIdentifiedUserId === firebaseUid) {
    console.log("[RevenueCat] User already identified:", firebaseUid);
    return;
  }

  try {
    const { customerInfo } = await Purchases.logIn(firebaseUid);
    currentIdentifiedUserId = firebaseUid;
    console.log("[RevenueCat] User identified with Firebase uid:", firebaseUid);
    console.log("[RevenueCat] Active entitlements:", Object.keys(customerInfo.entitlements.active));
  } catch (error) {
    console.error("[RevenueCat] Failed to identify user:", error);
    throw error;
  }
};

/**
 * Get the currently identified user ID
 */
export const getCurrentUserId = (): string | null => {
  return currentIdentifiedUserId;
};

/**
 * Get current customer info including entitlements
 */
export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  if (!isRevenueCatReady()) {
    console.log("[RevenueCat] Not configured - returning null customer info");
    return null;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error: any) {
    console.error("[RevenueCat] Failed to get customer info:", error);
    return null;
  }
};

/**
 * Check if user has a specific entitlement
 */
export const hasEntitlement = async (entitlementId: string): Promise<boolean> => {
  if (!isRevenueCatReady()) {
    return false;
  }

  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return false;

    const entitlement = customerInfo.entitlements.active[entitlementId];
    return entitlement !== undefined && entitlement !== null;
  } catch (error) {
    console.error("[RevenueCat] Failed to check entitlement:", error);
    return false;
  }
};

/**
 * Check if user has any active subscription
 */
export const hasActiveSubscription = async (): Promise<boolean> => {
  if (!isRevenueCatReady()) {
    return false;
  }

  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return false;

    return Object.keys(customerInfo.entitlements.active).length > 0;
  } catch (error) {
    console.error("[RevenueCat] Failed to check active subscription:", error);
    return false;
  }
};

/**
 * Get available offerings (DEPRECATED - use fetchOfferingsSafe instead)
 */
export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  if (!isRevenueCatReady()) {
    console.log("[RevenueCat] Not configured - returning null offerings");
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error: any) {
    console.error("[RevenueCat] Failed to get offerings:", error);
    return null;
  }
};

/**
 * Get a specific package by identifier
 */
export const getPackage = async (packageIdentifier: string): Promise<PurchasesPackage | null> => {
  if (!isRevenueCatReady()) {
    return null;
  }

  try {
    const offering = await getOfferings();
    if (!offering) return null;

    const pkg = offering.availablePackages.find(
      (p) => p.identifier === packageIdentifier
    );
    return pkg || null;
  } catch (error) {
    console.error("[RevenueCat] Failed to get package:", error);
    return null;
  }
};

/**
 * Purchase a package
 */
export const purchasePackage = async (
  pkg: PurchasesPackage
): Promise<CustomerInfo | null> => {
  if (!isRevenueCatReady()) {
    throw new Error("RevenueCat is not configured. Please check your API keys.");
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    console.log("[RevenueCat] Purchase successful");
    return customerInfo;
  } catch (error: any) {
    if (error.userCancelled) {
      console.log("[RevenueCat] User cancelled purchase");
      return null;
    }
    console.error("[RevenueCat] Purchase failed:", error);
    throw error;
  }
};

/**
 * Restore purchases
 */
export const restorePurchases = async (): Promise<CustomerInfo | null> => {
  if (!isRevenueCatReady()) {
    throw new Error("RevenueCat is not configured. Please check your API keys.");
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    console.log("[RevenueCat] Purchases restored");
    return customerInfo;
  } catch (error) {
    console.error("[RevenueCat] Failed to restore purchases:", error);
    throw error;
  }
};

/**
 * Log out the current user
 */
export const logOut = async (): Promise<void> => {
  if (!isRevenueCatReady()) {
    return;
  }

  try {
    await Purchases.logOut();
    currentIdentifiedUserId = null;
    console.log("[RevenueCat] User logged out");
  } catch (error) {
    console.error("[RevenueCat] Failed to log out:", error);
  }
};
