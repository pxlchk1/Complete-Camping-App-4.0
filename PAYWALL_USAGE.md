# Access Control & Paywall Usage Guide

## Overview

Two-gate system for controlling feature access:
1. **AccountRequiredModal** - First gate (not logged in)
2. **PaywallModal** - Second gate (logged in but not Pro)

## Components

### 1. AccountRequiredModal
**Location:** `src/components/AccountRequiredModal.tsx`

**Trigger:** User is NOT logged in and attempts to save/modify data

**Content:**
- Title: "Let's get you set up"
- Message: "Saving your plans and gear requires a free account..."
- Primary button: "Create an Account" → navigates to LoginScreen
- Secondary button: "Maybe Later" → closes modal

### 2. PaywallModal
**Location:** `src/components/PaywallModal.tsx`

**Trigger:** User IS logged in but does NOT have Pro entitlement

**Content:**
- Pricing options (Annual & Monthly)
- Feature list
- Purchase/restore actions (placeholders for now)

### 3. Access Control Hook
**Location:** `src/hooks/useAccessControl.ts`

Centralized logic for checking authentication and subscription status.

## How to Use

### Basic Implementation

```tsx
import React from "react";
import { View, Pressable, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAccessControl } from "../hooks/useAccessControl";
import AccountRequiredModal from "../components/AccountRequiredModal";
import PaywallModal from "../components/PaywallModal";

export default function MyScreen() {
  const navigation = useNavigation();
  const {
    isLoggedIn,
    isPro,
    showAccountModal,
    showPaywallModal,
    checkAccess,
    requestAccess,
    closeAccountModal,
    closePaywallModal,
  } = useAccessControl();

  // Example: Free feature (requires login only)
  const handleSaveTrip = () => {
    if (!checkAccess()) {
      requestAccess(); // Shows AccountRequiredModal
      return;
    }
    
    // User is logged in, proceed
    console.log("Saving trip...");
  };

  // Example: Pro feature (requires login + Pro)
  const handleSavePark = () => {
    if (!checkAccess(true)) {
      requestAccess(true); // Shows appropriate modal
      return;
    }
    
    // User is logged in AND has Pro
    console.log("Saving park...");
  };

  return (
    <View>
      <Pressable onPress={handleSaveTrip}>
        <Text>Save Trip</Text>
      </Pressable>

      <Pressable onPress={handleSavePark}>
        <Text>Save Park (Pro)</Text>
      </Pressable>

      {/* Modals */}
      <AccountRequiredModal
        visible={showAccountModal}
        onCreateAccount={() => {
          closeAccountModal();
          navigation.navigate("AuthLanding");
        }}
        onMaybeLater={closeAccountModal}
      />

      <PaywallModal
        visible={showPaywallModal}
        onClose={closePaywallModal}
      />
    </View>
  );
}
```

## Access Rules

### Not Logged In → AccountRequiredModal
These actions require an account:
- New Trip
- Duplicate Trip
- Save Trip
- Save Park / Add to Favorites
- Wishlist
- Add Gear Set
- Duplicate Gear Set
- Save packing list templates
- Create from template
- Advanced search/filters
- My Gear Closet
- Trip templates
- Saved parks
- Favorites
- Any editable field in Profile
- Any button that modifies data

### Logged In (Free) → PaywallModal
Free users get:
- ✅ One trip
- ✅ Browse and view
- ❌ Cannot save parks
- ❌ Cannot customize

Pro features trigger PaywallModal:
- Additional trips (beyond first one)
- Saving parks
- Any customization

### Logged In (Pro) → Full Access
- ✅ Unlimited trips
- ✅ Save unlimited parks
- ✅ All customization features

## Implementation Checklist

### Phase 1: Modals (CURRENT)
- ✅ AccountRequiredModal created
- ✅ PaywallModal created
- ✅ useAccessControl hook created
- ⏳ Test modals in one screen
- ⏳ Verify styling and behavior

### Phase 2: Feature Gates
- ⏳ Add to New Trip button
- ⏳ Add to Save Park buttons
- ⏳ Add to Gear Closet
- ⏳ Add to Profile edits
- ⏳ Add to all modify/save actions

### Phase 3: RevenueCat (LATER)
- ⏳ Wire up purchase functions
- ⏳ Implement subscription checking
- ⏳ Add restore purchases
- ⏳ Handle entitlements

## Notes

- Purchase functions are placeholders (console.log)
- isPro is hardcoded to `false` for testing
- RevenueCat integration comes in Phase 3
- Safe to test without breaking existing functionality
- Each screen manages its own modal state using the hook
