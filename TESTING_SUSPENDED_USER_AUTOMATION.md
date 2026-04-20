# Testing Suspended User Automation

## Overview
This guide explains how to test the automated suspended user reactivation system.

## Prerequisites
- Admin access token
- A test user account
- Access to the admin dashboard or API

## Testing Steps

### Step 1: Get a Test User ID
1. Go to Admin Dashboard → Users
2. Find a test user (or create one)
3. Copy the user's ID (UUID)

OR use the API:
```bash
GET /api/auth/admin/users
Authorization: Bearer <admin_token>
```

### Step 2: Manually Suspend the User

**Via Admin Dashboard:**
- Navigate to Users → Find the user → Click "Suspend"

**Via API:**
```bash
PUT /api/auth/admin/users/:userId/suspend
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Testing automation"
}
```

**Expected Result:**
- User's `accountStatus` becomes `'suspended'`
- User's `isActive` becomes `false`
- User's `suspensionCount` increments by 1
- User receives suspension email

### Step 3: Submit a Support Ticket (as the Suspended User)

**Via Homepage Contact Form:**
1. Go to homepage (not logged in)
2. Click "Contact Support"
3. Enter the suspended user's email
4. Subject: "Please restore my account" or "Reactivate my account"
5. Message: "My account was suspended. Can you please reactivate it? I need access to my account."
6. Submit

**Via API (as suspended user):**
```bash
POST /api/contact
Content-Type: application/json

{
  "name": "Test User",
  "email": "suspended_user@example.com",
  "subject": "Please restore my account",
  "message": "My account was suspended. Can you please reactivate it? I need access to my account.",
  "source": "homepage"
}
```

**Reactivation Keywords that trigger automation:**
- "reactivate"
- "restore"
- "unsuspend"
- "unlock"
- "activate"
- "please restore"
- "can you restore"
- "account suspended"
- "device limit"
- "multiple devices"

### Step 4: Monitor the Automation

**Check Server Logs:**
Look for these log messages:
```
[SuspendedUserAutomation] 📅 Scheduled restoration for user@example.com in 5 minutes (ticket TKT-XXXX)
```

**After 5 minutes, you should see:**
```
[SuspendedUserAutomation] ✅ Restored user user@example.com (userId)
```

**Check User Status:**
```bash
GET /api/auth/admin/users/:userId
Authorization: Bearer <admin_token>
```

**Expected Result:**
- `accountStatus` becomes `'active'`
- `isActive` becomes `true`
- User receives restoration email

### Step 5: Test Second Suspension (Auto-Deactivation)

1. Suspend the same user again (suspensionCount will be 2)
2. Have them submit another reactivation request
3. **Expected Result:** Account is automatically **deactivated** (not restored)
4. User receives deactivation email explaining permanent action

## Testing Scenarios

### Scenario 1: First Suspension + Reactivation Request
- ✅ User suspended → suspensionCount = 1
- ✅ User submits ticket with reactivation keywords
- ✅ System waits 5 minutes
- ✅ Account automatically restored
- ✅ User receives restoration email

### Scenario 2: Second Suspension + Reactivation Request
- ✅ User suspended again → suspensionCount = 2
- ✅ User submits ticket with reactivation keywords
- ✅ Account automatically **deactivated** (no restoration)
- ✅ User receives deactivation email

### Scenario 3: Non-Reactivation Ticket
- ✅ User suspended
- ✅ User submits ticket with unrelated message (e.g., "How do I use feature X?")
- ✅ No automatic restoration (ticket is not a reactivation request)

### Scenario 4: Admin Manual Restore
- ✅ User suspended → suspensionCount = 1
- ✅ Admin manually restores via dashboard/API
- ✅ suspensionCount resets to 0
- ✅ User gets another chance

## Monitoring

### Check Pending Restorations
The automation service tracks pending restorations. You can check server logs or add a debug endpoint:

```javascript
// In server.js or a debug route
import { getPendingRestorations } from './services/suspendedUserAutomation.js';
console.log('Pending restorations:', getPendingRestorations());
```

### Cron Job Status
The monitoring cron runs every minute. Check server logs for:
```
[Server] Error monitoring suspended user tickets: ...
```

## Troubleshooting

### Issue: Ticket not processed
- **Check:** Is the user actually suspended? (`accountStatus === 'suspended'`)
- **Check:** Does the ticket contain reactivation keywords?
- **Check:** Is the cron job running? (check server logs)

### Issue: Restoration not happening after 5 minutes
- **Check:** Server logs for errors
- **Check:** User status hasn't changed (maybe admin restored manually)
- **Check:** Email service is working (restoration email should be sent)

### Issue: Second suspension not auto-deactivating
- **Check:** `suspensionCount` is >= 1 before second suspension
- **Check:** Server logs for automation processing

## Quick Test Script

You can also test programmatically:

```javascript
// Test script (run in Node.js)
import { getPrisma } from './server/config/postgres.js';
import { processSuspendedUserTicket } from './server/services/suspendedUserAutomation.js';

const prisma = getPrisma();

// 1. Find a test user
const user = await prisma.user.findFirst({
  where: { email: 'test@example.com' }
});

// 2. Suspend them
await prisma.user.update({
  where: { id: user.id },
  data: {
    isActive: false,
    accountStatus: 'suspended',
    suspensionCount: 1
  }
});

// 3. Create a test ticket
const ticket = await prisma.supportTicket.create({
  data: {
    ticketId: `TKT-TEST-${Date.now()}`,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    subject: 'Please restore my account',
    message: 'My account was suspended. Can you please reactivate it?',
    status: 'open',
    userPlan: 'free'
  }
});

// 4. Process the ticket
await processSuspendedUserTicket(ticket);

// 5. Wait 5 minutes and check user status
setTimeout(async () => {
  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id }
  });
  console.log('User status after 5 minutes:', updatedUser.accountStatus);
}, 5 * 60 * 1000);
```

## Notes

- The 5-minute delay is intentional to prevent abuse
- Only tickets with reactivation keywords trigger automation
- Second suspension always results in deactivation (no restoration)
- Admin manual restore resets suspensionCount to 0










