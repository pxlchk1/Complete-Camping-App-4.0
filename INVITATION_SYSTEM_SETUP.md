# 🏕️ Campground Invitation System - Setup Guide

## Overview
Complete email invitation system with Firebase Cloud Functions, Resend email service, deep linking, and automatic invitation acceptance.

## Features Implemented

### ✅ Email Invitations
- Beautiful HTML email templates with branding
- Automatic app store links (iOS & Android)
- Deep link support for instant acceptance
- 30-day expiration
- Reminder emails after 7 days

### ✅ Deep Linking
- Universal Links (iOS): `https://tentlantern.app/invite/{token}`
- App Links (Android): `https://tentlantern.app/invite/{token}`
- Custom scheme: `tentlantern://invite/{token}`
- Fallback to App Store/Play Store if app not installed

### ✅ Automatic Processing
- Auto-accept when user signs up with invited email
- Firebase Auth trigger automatically adds users to campground
- Real-time status tracking in Firestore

### ✅ Invitation Management
- Track invitation status (pending/accepted/expired)
- Store invitation metadata in Firestore
- Link accepted users to campground contacts

## Setup Instructions

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 2. Initialize Firebase Project
```bash
cd functions
npm install
```

### 3. Configure Resend Email Service

#### Option A: Use Resend (Recommended - Modern & Simple)
1. Sign up at https://resend.com
2. Get your API key from dashboard
3. Add to Firebase config:
```bash
firebase functions:config:set resend.apikey="re_YOUR_API_KEY"
```

#### Option B: Use SendGrid (Alternative)
1. Sign up at https://sendgrid.com
2. Create API key with Mail Send permissions
3. Replace Resend code in `functions/src/index.ts` with SendGrid

#### Option C: Use AWS SES (Alternative)
1. Set up AWS SES account
2. Verify sender email
3. Replace Resend code with AWS SDK

### 4. Configure Email Sender Domain

#### For Production:
1. Add domain to Resend: `tentlantern.app`
2. Add DNS records for domain verification
3. Update `from` field in Cloud Function:
```typescript
from: "Tent & Lantern <invites@tentlantern.app>"
```

#### For Development/Testing:
```typescript
from: "onboarding@resend.dev" // Works without verification
```

### 5. Deploy Cloud Functions
```bash
cd functions
npm run build
firebase deploy --only functions
```

### 6. Configure Firestore Security Rules

Add to `firestore.rules`:
```
// Campground Invitations
match /campgroundInvitations/{invitationId} {
  // Anyone can read with invitation token (via deep link)
  allow read: if true;
  
  // Only authenticated users can create invitations
  allow create: if request.auth != null 
    && request.resource.data.inviterId == request.auth.uid;
  
  // Only system (Cloud Functions) can update
  allow update: if false;
  
  // Only inviter can delete
  allow delete: if request.auth != null 
    && resource.data.inviterId == request.auth.uid;
}
```

### 7. Configure Deep Linking

#### For iOS (Universal Links):
1. Add Associated Domains capability in Apple Developer
2. Add domain: `applinks:tentlantern.app`
3. Host apple-app-site-association file at:
   `https://tentlantern.app/.well-known/apple-app-site-association`

Example file:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "Q29R9MCT46.com.tentlanternchild.completecampingcompanion",
        "paths": ["/invite/*"]
      }
    ]
  }
}
```

#### For Android (App Links):
1. Host assetlinks.json at:
   `https://tentlantern.app/.well-known/assetlinks.json`

Example file:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.tentlanternchild.completecampingcompanion",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

### 8. Update App Store Links

In `functions/src/index.ts`, update:
```typescript
const iosLink = "https://apps.apple.com/app/tent-lantern/YOUR_APP_ID";
```

### 9. Set Up Cloud Scheduler (Optional - For Reminders)

```bash
# Deploy the reminder function
firebase deploy --only functions:sendInvitationReminders

# The function runs daily at 10 AM EST automatically via Pub/Sub
```

## Testing

### Test Locally with Emulators
```bash
cd functions
npm run serve

# In another terminal, trigger function:
firebase functions:shell
> sendCampgroundInvitation({
    recipientEmail: "test@example.com",
    recipientName: "Test User",
    inviterName: "Your Name",
    inviterId: "YOUR_USER_ID",
    invitationToken: "test_token_123"
  })
```

### Test Deep Links

#### iOS Simulator:
```bash
xcrun simctl openurl booted "tentlantern://invite/test_token_123"
```

#### Android Emulator:
```bash
adb shell am start -a android.intent.action.VIEW -d "tentlantern://invite/test_token_123"
```

## Firestore Collections

### campgroundInvitations
```typescript
{
  id: string; // invitationToken
  recipientEmail: string;
  recipientName: string;
  inviterId: string;
  inviterName: string;
  status: "pending" | "accepted" | "expired";
  createdAt: Timestamp;
  emailSentAt: Timestamp;
  expiresAt: Timestamp;
  reminderSent?: boolean;
  reminderSentAt?: Timestamp;
  acceptedAt?: Timestamp;
  acceptedByUserId?: string;
}
```

### campgroundContacts
```typescript
{
  userId: string; // Owner of the campground
  contactName: string;
  contactEmail?: string;
  contactNote?: string;
  contactUserId?: string; // If contact has app account
  addedVia?: "manual" | "invitation";
  invitationId?: string;
  createdAt: Timestamp;
}
```

## Cost Estimates

### Resend Pricing
- Free tier: 3,000 emails/month
- Pro: $20/month for 50,000 emails
- Cost per email: ~$0.0004

### Firebase Functions
- Free tier: 2M invocations/month
- Paid: $0.40 per million invocations

### Firestore
- Free tier: 50K reads, 20K writes per day
- Minimal cost for invitation tracking

**Total estimated cost for 1,000 invitations/month: ~$1-2**

## Monitoring & Analytics

View logs in Firebase Console:
```bash
firebase functions:log
```

Track metrics:
- Invitations sent
- Acceptance rate
- Time to acceptance
- Reminder effectiveness

## Troubleshooting

### Emails not sending
1. Check Resend API key is set correctly
2. Verify domain is verified in Resend
3. Check Cloud Function logs: `firebase functions:log`

### Deep links not working
1. Verify associated domains are configured
2. Check .well-known files are accessible
3. Test with universal link validator

### Invitations not auto-accepted
1. Check `onUserCreated` function is deployed
2. Verify email addresses match exactly
3. Check Firestore security rules allow reads

## Next Steps

1. Deploy functions: `firebase deploy --only functions`
2. Configure Resend API key
3. Test with real email addresses
4. Set up domain verification
5. Configure universal links for production
6. Monitor acceptance rates
7. Optimize email template based on feedback

## Support

For issues, check:
- Firebase Console logs
- Resend dashboard
- App Store Connect for universal links validation
