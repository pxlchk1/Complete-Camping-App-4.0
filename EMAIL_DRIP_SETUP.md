# Email Drip Campaign Setup Guide

## Overview

This guide covers the setup needed to enable the email drip campaign for Complete Camping App. The system automatically subscribes users who opt-in via the app to a SendGrid Marketing list, which triggers an automated drip campaign.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  App Opt-In     │────▶│  Cloud Function  │────▶│  SendGrid Marketing  │
│  EmailOptInCard │     │  sendgridSubscribeToDrip │     │  Contacts & Lists    │
└─────────────────┘     └──────────────────┘     └──────────────────────┘
                                │                          │
                                │                          ▼
                                ▼                 ┌──────────────────────┐
                        ┌──────────────────┐     │  SendGrid Automation │
                        │    Firestore     │     │  (Drip Campaign)     │
                        │  - users/{uid}   │     └──────────────────────┘
                        │  - emailSubscribers │
                        └──────────────────┘
```

## Firebase Secrets Required

Set these secrets before deploying:

```bash
# SendGrid API Key (needs Marketing permissions)
firebase functions:secrets:set SENDGRID_API_KEY

# SendGrid Drip List ID (from "CCA Drip Entry" list)
firebase functions:secrets:set SENDGRID_DRIP_LIST_ID
```

## SendGrid Setup

### 1. Create Marketing List

1. Go to SendGrid Dashboard → Marketing → Contacts → Lists
2. Create a new list named **"CCA Drip Entry"**
3. Copy the List ID (found in the URL when viewing the list, or via API)
4. Set as Firebase secret: `firebase functions:secrets:set SENDGRID_DRIP_LIST_ID`

### 2. Create API Key

1. Go to Settings → API Keys
2. Create a new API Key with permissions:
   - **Marketing** → Full Access
   - **Mail Send** → Full Access (if not already configured)
3. Set as Firebase secret: `firebase functions:secrets:set SENDGRID_API_KEY`

### 3. Create Automation (Drip Campaign)

1. Go to Marketing → Automations
2. Create a new Automation
3. **Entry Criteria**: "When a contact is added to a list" → Select "CCA Drip Entry"
4. Add email steps:

**Day 1: Welcome Email** (send immediately)
- Subject: "Welcome to Tent & Lantern! 🏕️"
- Content: Welcome message, app features overview

**Day 3: Planning Tips**
- Subject: "Plan your perfect camping trip"
- Content: Trip planning tips, link to Plan feature

**Day 5: Gear Guide**
- Subject: "Essential gear for your next adventure"
- Content: Gear checklist tips, link to Packing feature

**Day 7: Community Invite**
- Subject: "Join the camping community"
- Content: Connect features, how to share photos

**Day 10: Pro Features**
- Subject: "Unlock the full experience"
- Content: Premium features overview, upgrade CTA

5. Set the automation to **Live**

### 4. Dynamic Template (Optional)

If you want consistent branding, create a Dynamic Template:
1. Go to Email API → Dynamic Templates
2. Create template with placeholders:
   - `{{first_name}}` - User's first name
   - Any other custom fields

## Firestore Collections

### users/{uid}

Fields added/updated on opt-in:
```typescript
{
  emailSubscribed: boolean,      // true when opted in
  emailSubscribedAt: Timestamp,  // server timestamp
  updatedAt: Timestamp           // server timestamp
}
```

### emailSubscribers/{uid}

Full document structure:
```typescript
{
  email: string,              // normalized email
  userId: string,             // Firebase UID
  unsubscribed: boolean,      // false when subscribed
  source: string,             // "app_optin"
  createdAt: Timestamp,       // first subscription time
  updatedAt: Timestamp,       // last update time
  sendgrid: {
    status: string,           // "subscribed"
    subscribedAt: Timestamp,  // when added to SendGrid
    listId: string,           // SendGrid list ID
    jobId: string | null      // SendGrid job ID
  }
}
```

## App Integration

The `EmailOptInModal` appears on the HomeScreen after:
- User has opened the app 3+ times
- User is logged in (not a guest)
- User hasn't already subscribed
- Modal hasn't been shown in the last 7 days

Users can also subscribe via Settings → Email Preferences.

## Testing

### Test the Cloud Function

```bash
# Deploy functions
cd functions && npm run build
firebase deploy --only functions:sendgridSubscribeToDrip

# Check logs
firebase functions:log --only sendgridSubscribeToDrip
```

### Verify in SendGrid

1. After opt-in, check Marketing → Contacts for the new contact
2. Verify contact is in "CCA Drip Entry" list
3. Check Automation activity to see if email is queued

### Test Email Links

All "go to app" links should use the App Store URL:
```
https://apps.apple.com/us/app/complete-camping-app/id6752673528
```

## Troubleshooting

### User not appearing in SendGrid

1. Check Cloud Function logs for errors
2. Verify `SENDGRID_API_KEY` has Marketing permissions
3. Verify `SENDGRID_DRIP_LIST_ID` is correct

### Automation not triggering

1. Verify automation is set to **Live** (not Paused)
2. Check entry criteria is "added to list" for correct list
3. Check for any SendGrid account-level blocks

### Firestore not updating

1. Check Firestore rules allow write to emailSubscribers
2. Verify user is authenticated when calling function

## Unsubscribe Handling

SendGrid manages unsubscribes automatically. When a user clicks "Unsubscribe" in an email:
1. SendGrid marks them as unsubscribed
2. Future automation emails are blocked
3. The app should sync unsubscribe status via webhook (optional enhancement)

## Files Changed

- `src/components/EmailOptInCard.tsx` - Opt-in form UI
- `src/components/EmailOptInModal.tsx` - Modal wrapper
- `src/screens/HomeScreen.tsx` - Integration with modal trigger logic
- `functions/src/index.ts` - `sendgridSubscribeToDrip` Cloud Function
- `functions/package.json` - Added `@sendgrid/client` dependency
