# Paywall Integration Guide

## Overview

The Complete Camping App uses a two-gate system for feature access:
1. **Login Gate**: User must be signed in
2. **Subscription Gate**: User must have Pro subscription (entitlement "Pro")

## Paywall Screen

**Location**: `src/screens/PaywallScreen.tsx`

### Layout (Wireframe)
- **Header**: "Go Pro" with close button ("Not now")
- **Value Props**: 5 bullet points with checkmarks
- **Plan Cards**: Annual (with "BEST VALUE" badge) and Monthly
- **Primary CTA**: "Start Annual" or "Start Monthly" (based on selection)
- **Secondary Actions**: "Restore Purchases"
- **Footer**: "Cancel anytime. Manage in Apple subscriptions."

### Features
- ✅ Radio button selection between plans
- ✅ Disabled state while purchase in progress
- ✅ Loading state while fetching offerings
- ✅ Graceful fallback when offerings unavailable
- ✅ "Restore Purchases" always visible

## Navigation Setup

### Modal Presentation
Paywall is presented as a **root-level modal** in `RootNavigator`:

```typescript
<Stack.Screen
  name="Paywall"
  component={PaywallScreen}
  options={{
    presentation: 'modal',
    headerShown: false,
  }}
/>
```

This ensures:
- User returns to previous screen after closing
- No broken navigation or missing headers
- Works from any screen in the app

## Gating Pro Features

### Method 1: Using `usePaywallGate` Hook

**Recommended for feature taps and actions**

```typescript
import { usePaywallGate } from "../hooks/usePaywallGate";

function MyScreen() {
  const { isPro, requirePro, showPaywall } = usePaywallGate();

  const handleProFeature = () => {
    // Gate the feature - shows paywall if not Pro
    if (!requirePro()) return;
    
    // Continue with Pro feature...
  };

  return (
    <View>
      {!isPro && <Text>Upgrade to unlock this feature</Text>}
      <Button title="Pro Feature" onPress={handleProFeature} />
    </View>
  );
}
```

### Method 2: Using `useUserStatus` Helper

**Good for conditional rendering**

```typescript
import { useUserStatus } from "../utils/authHelper";

function MyScreen() {
  const { isPro, isFree, isGuest } = useUserStatus();

  if (!isPro) {
    return (
      <View>
        <Text>This feature requires Pro</Text>
        <Button 
          title="Upgrade to Pro" 
          onPress={() => navigation.navigate("Paywall")} 
        />
      </View>
    );
  }

  return (
    // Pro feature content...
  );
}
```

### Method 3: Direct Store Access

**For simple checks**

```typescript
import { useSubscriptionStore } from "../state/subscriptionStore";

function MyComponent() {
  const isPro = useSubscriptionStore((s) => s.isPro);

  if (!isPro) {
    // Show locked state or navigate to paywall
  }
}
```

## Where to Show Paywall

### A) Feature Tap Gating
When user taps a Pro-only feature:

```typescript
const handleCreateAdvancedTrip = () => {
  const { requirePro } = usePaywallGate();
  
  if (!requirePro()) return; // Shows paywall
  
  // Proceed with feature...
};
```

### B) Pro-Only Screens
Replace entire screen content with locked state:

```typescript
function ProOnlyScreen() {
  const { isPro } = usePaywallGate();

  if (!isPro) {
    return (
      <View>
        <Icon name="lock" size={48} />
        <Text>This screen requires Pro</Text>
        <Button title="Go Pro" onPress={() => navigation.navigate("Paywall")} />
      </View>
    );
  }

  return (
    // Pro screen content...
  );
}
```

### C) Settings Entry Point
**Location**: `src/screens/SettingsScreen.tsx`

Shows different text based on Pro status:
- **Free users**: "Upgrade to Pro" → Opens paywall
- **Pro users**: "Pro Member" → Opens paywall (for management)

Also includes "Restore Purchases" button for free users.

## Purchase Flow

### On Successful Purchase
1. `purchasePackage(pkg)` completes
2. `getCustomerInfo()` refreshes entitlements
3. `subscriptionStore.setSubscriptionInfo(customerInfo)` updates `isPro`
4. `syncSubscriptionToFirestore()` writes to Firebase
5. Paywall closes
6. User returns to gated feature (now unlocked)

### On User Cancellation
- Paywall remains open
- No error message (silent)

### On Failure
- Show alert: "Purchase Failed. Please try again or contact support."

## Restore Flow

### From Paywall
"Restore Purchases" button always visible at bottom

### From Settings
"Restore Purchases" button shown for non-Pro users

### Process
1. Call `restorePurchases()`
2. Refresh `customerInfo`
3. Update `subscriptionStore`
4. Sync to Firestore
5. Show success/failure alert

## Feature Flags

**Location**: `src/config/subscriptions.ts`

```typescript
export const SUBSCRIPTIONS_ENABLED = true; // Master switch
export const PAYWALL_ENABLED = true; // Paywall visibility
```

### Behavior When Disabled
- `SUBSCRIPTIONS_ENABLED = false`: All features unlocked, subscription checks bypassed
- `PAYWALL_ENABLED = false`: Paywall navigation hidden, features unlocked

This allows:
- Testing without paywall friction
- Emergency disable if RevenueCat has issues
- Seamless re-enable without code changes

## Subscription State

### Single Source of Truth
```typescript
const isPro = Boolean(customerInfo?.entitlements?.active?.Pro)
```

### Persisted State
- Subscription store uses Zustand + AsyncStorage
- State survives app restarts
- Refreshed via CustomerInfo listener on app launch

### Firestore Sync
Fields written to `users/{uid}`:
- `membershipTier`: "freeMember" | "subscribed"
- `subscriptionStatus`: "active" | "expired" | "canceled" | "none"
- `entitlements`: string[] (active entitlement IDs)
- `subscriptionProvider`: "revenuecat"
- `subscriptionUpdatedAt`: serverTimestamp()

## Testing Checklist

### Fresh Install (Not Logged In)
- [ ] Paywall shows gracefully if offerings unavailable
- [ ] "Restore Purchases" button visible
- [ ] App doesn't crash

### After Login
- [ ] RevenueCat identifies with Firebase uid
- [ ] CustomerInfo loads
- [ ] `isPro` updates correctly

### Purchase Flow
- [ ] Select annual plan → "Start Annual" shows
- [ ] Select monthly plan → "Start Monthly" shows
- [ ] Button disabled during purchase
- [ ] On success: `isPro` becomes true
- [ ] Pro features unlock immediately
- [ ] Paywall closes
- [ ] Firestore updated

### Restore Flow
- [ ] Restore from paywall works
- [ ] Restore from settings works
- [ ] `isPro` updates on successful restore
- [ ] Firestore syncs

### App Restart
- [ ] `isPro` state loads from AsyncStorage
- [ ] CustomerInfo listener refreshes state
- [ ] No UI flicker

### Feature Gating
- [ ] Tapping Pro feature shows paywall when not Pro
- [ ] After subscribing, feature unlocks without restart
- [ ] Pro badge shows in settings

## Example Implementations

### Example 1: Gate Create Trip (Limit Free Users)

```typescript
// src/screens/MyTripsScreen.tsx
import { usePaywallGate } from "../hooks/usePaywallGate";

function MyTripsScreen() {
  const { isPro, requirePro } = usePaywallGate();
  const trips = useTrips();

  const handleCreateTrip = () => {
    // Free users limited to 3 trips
    if (!isPro && trips.length >= 3) {
      navigation.navigate("Paywall");
      return;
    }
    
    navigation.navigate("CreateTrip");
  };

  return (
    <View>
      <Button title="Create Trip" onPress={handleCreateTrip} />
      {!isPro && trips.length >= 2 && (
        <Text>⚠️ Create 1 more trip to reach free limit (3 total)</Text>
      )}
    </View>
  );
}
```

### Example 2: Lock Advanced Features

```typescript
// src/screens/TripDetailScreen.tsx
import { usePaywallGate } from "../hooks/usePaywallGate";

function TripDetailScreen() {
  const { requirePro } = usePaywallGate();

  const handleExportToCalendar = () => {
    if (!requirePro()) return; // Shows paywall
    
    // Export logic...
  };

  const handleShareWithTeam = () => {
    if (!requirePro()) return;
    
    // Share logic...
  };

  return (
    <View>
      <Button title="Export to Calendar" onPress={handleExportToCalendar} />
      <Button title="Share with Team" onPress={handleShareWithTeam} />
    </View>
  );
}
```

### Example 3: Full Screen Gate

```typescript
// src/screens/AdvancedSettingsScreen.tsx
import { usePaywallGate } from "../hooks/usePaywallGate";

function AdvancedSettingsScreen() {
  const { isPro, showPaywall } = usePaywallGate();

  if (!isPro) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="lock-closed" size={64} color="#666" />
        <Text style={{ fontSize: 20, marginTop: 16 }}>Pro Feature</Text>
        <Text style={{ marginTop: 8, color: "#666" }}>
          Advanced settings require a Pro subscription
        </Text>
        <Button title="Go Pro" onPress={showPaywall} />
      </View>
    );
  }

  return (
    // Advanced settings content...
  );
}
```

## Files Reference

### Core Implementation
- `src/screens/PaywallScreen.tsx` - Paywall UI
- `src/hooks/usePaywallGate.ts` - Feature gating hook
- `src/utils/authHelper.ts` - User status helpers
- `src/state/subscriptionStore.ts` - Subscription state
- `src/services/subscriptionService.ts` - Purchase/restore logic
- `src/lib/revenuecatClient.ts` - RevenueCat SDK wrapper

### Configuration
- `src/config/subscriptions.ts` - Feature flags
- `src/navigation/RootNavigator.tsx` - Modal presentation

### Integration Examples
- `src/screens/SettingsScreen.tsx` - Upgrade button + restore
- `src/screens/MyTripsScreen.tsx` - Trip limit gating

## Support

For issues:
- Check feature flags in `src/config/subscriptions.ts`
- Verify `PAYWALL_ENABLED = true` in `RootNavigator.tsx`
- Check console logs for RevenueCat errors
- Test restore flow if `isPro` not updating
