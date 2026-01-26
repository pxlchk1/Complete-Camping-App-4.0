# RevenueCat + Paywall Implementation

## Configuration

### API Keys
- **iOS**: `appl_CXLKpXutDryiSmKJsclChUqLmie`
- **Android**: Not configured yet

### Products (App Store Connect)
- **Monthly**: `cca_monthly_sub` ($6.99 USD) - Apple ID: 6757283844
- **Annual**: `cca_annual_sub` ($39.99 USD) - Apple ID: 6757283672
- **Status**: Waiting for Review
- **Subscription Group**: 21829224 (Complete Camping App Subscriptions)

### RevenueCat Setup
- **Offering ID**: `ofrng763ff4779a`
- **Entitlement ID**: `Pro` (case-sensitive!)
- **SDK Version**: react-native-purchases ^9.6.7

## Identity Model

### Critical Rules
1. **Use Firebase uid, NOT email** - RevenueCat user ID must be Firebase Auth uid
2. **Initialize anonymously first** - SDK starts without user ID at app launch
3. **Identify on auth state change** - Call `identifyUser(firebaseUid)` when Firebase auth resolves
4. **Prevent duplicate logins** - Track current identified user to avoid redundant calls

### Why Firebase uid?
- Email can change - subscriptions would be lost
- uid is permanent - restores work reliably across devices
- Matches RevenueCat best practices

## Initialization Sequence

### 1. App Launch (App.tsx)
```typescript
// BEFORE auth state is known
initSubscriptions() // Configures RevenueCat anonymously
```

### 2. Register Listener
```typescript
Purchases.addCustomerInfoUpdateListener((customerInfo) => {
  // Auto-updates subscription store
  // Syncs to Firestore
})
```

### 3. Auth State Change
```typescript
onAuthStateChanged(auth, (firebaseUser) => {
  if (firebaseUser) {
    identifyUser(firebaseUser.uid) // Links RevenueCat to Firebase user
  }
})
```

## Entitlement Gating

### Single Source of Truth
```typescript
const isPro = Boolean(customerInfo?.entitlements?.active?.Pro)
```

### Rules
- ✅ Check `isPro` flag from subscription store
- ✅ Check exact entitlement `"Pro"` (case-sensitive)
- ❌ Never check product IDs directly
- ❌ Never parse expiration dates manually
- ❌ Never check last purchase date

### Feature Gates
```typescript
import { useSubscriptionStore } from "../state/subscriptionStore";

const isPro = useSubscriptionStore((s) => s.isPro);

if (!isPro) {
  navigation.navigate("Paywall");
  return;
}
```

## Paywall Screen

### Graceful Degradation
When offerings unavailable (products in review, wrong storefront):
- ✅ Show friendly error message
- ✅ Display "Restore Purchases" button
- ✅ Log detailed diagnostics
- ❌ Never crash or show blank screen

### Package Detection
```typescript
// Prioritize exact product IDs
const monthly = pkgs.find((p) => 
  p.product.identifier === "cca_monthly_sub" ||
  p.packageType === PACKAGE_TYPE.MONTHLY
);
```

### Price Display
```typescript
// Use package price strings, never hardcode
<Text>{monthlyPackage.product.priceString}</Text>
```

## Firestore Sync

### Fields Written to `users/{uid}`
```typescript
{
  membershipTier: "freeMember" | "subscribed",
  subscriptionStatus: "active" | "expired" | "canceled" | "none",
  entitlements: string[], // Active entitlement IDs
  subscriptionProvider: "revenuecat",
  subscriptionUpdatedAt: serverTimestamp()
}
```

### Mapping Rules
- `isPro === true` → membershipTier: "subscribed", status: "active"
- `isPro === false` → membershipTier: "freeMember", status: "expired"/"canceled"

### Write Minimization
Only updates Firestore when values change to reduce database writes.

## Purchase Flow

### Subscribe
1. User taps monthly/annual package
2. Disable buttons during purchase
3. Call `purchasePackage(pkg)`
4. On success:
   - Update subscription store
   - Sync to Firestore
   - Close paywall
5. Handle outcomes:
   - User cancelled (silent)
   - Already owned (show message)
   - Network failure (retry prompt)

### Restore
1. Call `restorePurchases()`
2. Refresh customer info
3. Update subscription store
4. Sync to Firestore
5. Show success/failure message

## Known Issues

### Apple Product Availability
**Problem**: Products showing "Waiting for Review" and only "1 of 175 countries" selected.

**Impact**: `fetchOfferingsSafe()` returns null because App Store doesn't return products.

**Diagnosis Logs**:
```typescript
[SubscriptionService] No packages in current offering {
  offeringId: "default",
  possibleCauses: [
    "Products 'Waiting for Review' in App Store Connect",
    "Products not available in tester's storefront country",
    "Products not linked to offering in RevenueCat",
    "Subscription group not configured correctly"
  ]
}
```

**Resolution**:
1. Submit app with subscriptions for Apple review
2. Expand country availability to all territories
3. Verify products are approved in App Store Connect
4. Test with TestFlight build in approved storefront

## Testing Checklist

### Fresh Install
- [ ] App loads without crashes
- [ ] Paywall shows fallback if offerings empty
- [ ] Restore button always visible

### Login
- [ ] RevenueCat identifies with Firebase uid
- [ ] CustomerInfo loads
- [ ] `isPro` updates correctly
- [ ] Firestore synced

### Purchase
- [ ] Monthly subscription works
- [ ] Annual subscription works
- [ ] `isPro` becomes true immediately
- [ ] Premium features unlock
- [ ] Firestore updated

### Restore
- [ ] After reinstall, restore works
- [ ] `isPro` true after restore
- [ ] Firestore updated

### App Restart
- [ ] Persisted state loads
- [ ] CustomerInfo refreshes via listener
- [ ] No flicker in UI

## Feature Flags

`src/config/subscriptions.ts`:
```typescript
export const SUBSCRIPTIONS_ENABLED = true; // Master switch
export const PAYWALL_ENABLED = true; // Paywall visibility
```

When disabled:
- Bypass paywall checks
- Treat all users as free tier
- Subscription system runs in background (for seamless re-enable)

## Files Modified

### Core Implementation
- `src/lib/revenuecatClient.ts` - SDK wrapper with anonymous init
- `src/services/subscriptionService.ts` - Service layer with listener registration
- `src/state/subscriptionStore.ts` - Zustand store with "Pro" entitlement check
- `App.tsx` - Initialization sequence and auth state listener

### UI
- `src/screens/PaywallScreen.tsx` - Graceful degradation, product ID matching

### Configuration
- `src/config/subscriptions.ts` - Feature flags
- `package.json` - RevenueCat SDK dependencies

## Next Steps

1. **Submit app for review** - Get products approved by Apple
2. **Expand availability** - Select all countries in App Store Connect
3. **Test with TestFlight** - Verify offerings load in approved storefront
4. **Monitor logs** - Check CustomerInfo listener updates
5. **Verify Firestore** - Confirm subscription data syncing correctly

## Support

For RevenueCat issues:
- Dashboard: https://app.revenuecat.com
- Docs: https://www.revenuecat.com/docs
- Support: support@revenuecat.com
