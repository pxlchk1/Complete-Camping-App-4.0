# Account Linking: Apple + Password

## Overview

The Complete Camping App implements **automatic account linking** to prevent duplicate accounts when users sign in with Apple using an email address that already has a password-based account.

## User Experience Flow

### Scenario: User Has Password Account, Signs In with Apple

1. **User creates password account** with email `user@example.com`
2. **User signs out** (or on new device)
3. **User taps "Sign in with Apple"** and authorizes with Apple ID using `user@example.com`
4. **System detects existing password account** for this email
5. **Password prompt modal appears** explaining the situation
6. **User enters their password** to verify ownership
7. **Accounts are linked** - user can now sign in with either Apple or password
8. **Single profile maintained** - no duplicate accounts created

### Technical Implementation

#### 1. Apple Sign-In Flow with Duplicate Detection

```typescript
// File: src/screens/AuthLanding.tsx

const handleAppleSignIn = async () => {
  // Get Apple credential with email
  const appleCredential = await AppleAuthentication.signInAsync({...});
  const appleEmail = appleCredential.email;
  
  if (appleEmail) {
    // Check for existing accounts
    const signInMethods = await fetchSignInMethodsForEmail(auth, appleEmail);
    
    if (signInMethods includes "password") {
      // Password account exists - show linking modal
      setPendingAppleCredential(firebaseCredential);
      setShowLinkingModal(true);
      return; // Don't sign in yet
    }
  }
  
  // No conflicts - proceed with sign-in
  await completeAppleSignIn(appleCredential, nonce);
};
```

#### 2. Password Linking Handler

```typescript
const handlePasswordLinking = async () => {
  // Step 1: Sign in with password to verify ownership
  const passwordCredential = await signInWithEmailAndPassword(
    auth,
    linkingEmail,
    linkingPassword
  );
  
  // Step 2: Link Apple credential to this account
  await linkWithCredential(
    passwordCredential.user,
    pendingAppleCredential.credential
  );
  
  // Now user has both password and Apple linked to ONE account
  console.log("✅ Accounts linked successfully");
};
```

#### 3. Email Index for Fast Lookups

```typescript
// Created on new user registration (both Apple and Password)
const emailNormalized = email.toLowerCase().trim();
await setDoc(doc(db, "userEmailIndex", emailNormalized), {
  userId: firebaseUser.uid,
  email: email,
  createdAt: serverTimestamp(),
});
```

**Collection Structure:**
```
userEmailIndex/
  user@example.com → { userId: "abc123", email: "user@example.com", createdAt: timestamp }
```

## Firestore Collections

### userEmailIndex

**Purpose:** Fast email-to-userId lookups for duplicate detection and account merging.

**Document ID:** Normalized email (lowercase, trimmed)

**Schema:**
```typescript
{
  userId: string;        // Firebase Auth UID
  email: string;         // Original email (preserves case)
  createdAt: Timestamp;  // When mapping was created
}
```

**Example:**
```
userEmailIndex/john.doe@example.com
{
  userId: "2rK9xL4p3QfM8nB1vC6wH7yJ5sA0",
  email: "John.Doe@example.com",
  createdAt: Timestamp(2024-01-15T10:30:00Z)
}
```

## UI Components

### Linking Modal

**Trigger:** Shown when Apple sign-in detects existing password account

**Design:**
- **Title:** "Link Your Accounts"
- **Message:** Explains that an account exists with this email
- **Email Display:** Shows the email being linked (read-only)
- **Password Input:** Secure text field for password verification
- **Error Display:** Shows linking errors (wrong password, etc.)
- **Buttons:**
  - **Cancel:** Dismisses modal, clears state
  - **Link Accounts:** Attempts linking (disabled until password entered)

**Location:** `src/screens/AuthLanding.tsx` (Modal component)

## Error Handling

### Common Linking Errors

| Error Code | User-Friendly Message |
|------------|----------------------|
| `auth/wrong-password` | "Incorrect password. Please try again." |
| `auth/invalid-credential` | "Incorrect password. Please try again." |
| `auth/provider-already-linked` | "This Apple account is already linked to another account." |
| `auth/credential-already-in-use` | "This Apple account is already in use by another account." |

### Edge Cases

**1. Apple Provides No Email**
- **Behavior:** Skip duplicate detection, proceed with direct sign-in
- **Reason:** Can't check for duplicates without email

**2. User Cancels Linking**
- **Behavior:** Modal dismissed, Apple credential discarded, user returns to auth screen
- **Reason:** User chose not to link accounts

**3. Multiple Failed Password Attempts**
- **Behavior:** Error message updates, user can retry
- **Future Enhancement:** Rate limiting, password reset link

## Future Enhancements

### 1. Cloud Function for Merging Existing Duplicates

**Purpose:** Handle cases where duplicate accounts already exist before this feature was implemented.

**Function:** `mergeDuplicateAccounts`

**Callable Function Signature:**
```typescript
exports.mergeDuplicateAccounts = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { canonicalUserId, duplicateUserId } = data;
  
  // 1. Verify user owns both accounts (check email match)
  // 2. Transfer data from duplicate to canonical:
  //    - Merge profiles data
  //    - Reassign posts, photos, comments
  //    - Merge favorites, likes, follows
  // 3. Delete duplicate user account
  // 4. Update userEmailIndex to point to canonical
  // 5. Return merged user data
  
  return { success: true, userId: canonicalUserId };
});
```

**Admin UI:** Future settings screen option to search for and merge duplicates

### 2. Google Sign-In Support

Same pattern can be extended to Google OAuth:
```typescript
if (googleEmail) {
  const methods = await fetchSignInMethodsForEmail(auth, googleEmail);
  if (methods.includes("password")) {
    // Show linking modal
  }
}
```

### 3. Email Verification Requirement

Add email verification step before allowing account linking:
```typescript
if (!passwordCredential.user.emailVerified) {
  // Send verification email
  await sendEmailVerification(passwordCredential.user);
  setLinkingError("Please verify your email first");
}
```

## Testing Checklist

### Manual Testing Steps

**Test 1: Password → Apple Linking**
- [ ] Create password account with `test1@example.com`
- [ ] Sign out
- [ ] Sign in with Apple using `test1@example.com`
- [ ] Verify linking modal appears
- [ ] Enter correct password
- [ ] Verify accounts linked (no duplicate profile)
- [ ] Sign out, sign in with Apple again (should work directly)
- [ ] Sign out, sign in with password (should still work)

**Test 2: Apple → Password Linking**
- [ ] Sign in with Apple using `test2@example.com`
- [ ] Sign out
- [ ] Try to create password account with `test2@example.com`
- [ ] Verify Firebase error: "email-already-in-use"
- [ ] (This scenario requires manual linking in Firebase Console)

**Test 3: Wrong Password**
- [ ] Create password account with `test3@example.com`
- [ ] Sign out
- [ ] Sign in with Apple using `test3@example.com`
- [ ] Linking modal appears
- [ ] Enter WRONG password
- [ ] Verify error: "Incorrect password. Please try again."
- [ ] Enter CORRECT password
- [ ] Verify successful linking

**Test 4: Cancel Linking**
- [ ] Create password account with `test4@example.com`
- [ ] Sign out
- [ ] Sign in with Apple using `test4@example.com`
- [ ] Linking modal appears
- [ ] Tap "Cancel"
- [ ] Verify modal dismissed, back to auth screen
- [ ] No duplicate account created

**Test 5: No Email from Apple**
- [ ] Sign in with Apple (without email scope)
- [ ] Verify direct sign-in (no duplicate detection)
- [ ] Profile created with Apple ID

## Security Considerations

### Password Verification

**Why it's safe:**
- User must prove ownership of existing account by entering password
- Apple credential is only linked AFTER successful password authentication
- Prevents account hijacking via Apple sign-in

### Email Normalization

**Implementation:**
```typescript
const emailNormalized = email.toLowerCase().trim();
```

**Prevents:**
- Case-sensitive duplicates: `User@Example.com` vs `user@example.com`
- Whitespace issues: `user@example.com ` vs `user@example.com`

### Credential Storage

**Security:**
- `pendingAppleCredential` stored in component state (memory only)
- Cleared on modal dismiss or successful linking
- Never persisted to disk or Firestore
- Contains Firebase OAuthCredential (not raw Apple tokens)

## Firebase Security Rules

### userEmailIndex Collection

```javascript
match /userEmailIndex/{email} {
  // Only system can write (via Admin SDK or authenticated users creating their own)
  allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
  
  // Users can read their own email mapping
  allow read: if request.auth != null && request.auth.uid == resource.data.userId;
  
  // Admin can read all (for duplicate detection)
  // Note: Regular users use Firebase Auth's fetchSignInMethodsForEmail (client SDK)
}
```

**Note:** `fetchSignInMethodsForEmail` uses Firebase Auth API (not Firestore), so no rules needed for duplicate detection flow.

## Related Files

### Implementation
- `src/screens/AuthLanding.tsx` - Main implementation
- `src/services/createUserProfile.ts` - Profile creation logic

### Documentation
- `ACCOUNT_LINKING.md` - This file
- `AUTH_FLOW_GUIDE.md` - Overall authentication flow

## Support

For issues with account linking:

1. **User sees modal but password doesn't work:**
   - Verify user is entering password for the EMAIL account (not Apple password)
   - Check Firebase Console for user's sign-in methods
   - User may need to reset password

2. **Modal doesn't appear when it should:**
   - Check console logs for `[Apple Auth]` prefix
   - Verify `fetchSignInMethodsForEmail` returns methods
   - Ensure Apple credential includes email

3. **Duplicate accounts still created:**
   - Check if email is null from Apple (user may have hidden email)
   - Verify `fetchSignInMethodsForEmail` called before `signInWithCredential`
   - Use Cloud Function to merge existing duplicates

## Version History

- **v3.0.1** - Initial implementation of Apple + Password linking
- **v3.0.2** - Added userEmailIndex collection
- **Future** - Google OAuth linking, duplicate merge function
