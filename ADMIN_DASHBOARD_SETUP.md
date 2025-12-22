# Admin Dashboard Setup Guide

## ✅ What's Been Added

The admin dashboard has been successfully integrated into your SneakLink project! Here's what was implemented:

### 1. **Admin Login Page** (`/admin/login`)
   - Google OAuth authentication only
   - Restricts access to authorized admin emails only
   - Beautiful, modern UI matching your existing design

### 2. **Admin Dashboard Pages**
   - **Overview** (`/admin`) - Dashboard with stats and recent activity
   - **Users** (`/admin/users`) - User management with filtering by plan
   - **Warned Users** (`/admin/warned-users`) - Users exceeding device limits
   - **Support** (`/admin/support`) - Customer support ticket management
   - **Staff** (`/admin/staff`) - Staff member management

### 3. **Admin Components**
   - `DashboardLayout` - Main layout with sidebar
   - `Sidebar` - Collapsible navigation sidebar
   - `PageHeader` - Reusable page headers
   - `StatCard` - Statistics cards
   - `DataTable` - Data table component
   - `UserModal` - User detail modal

### 4. **Backend Updates**
   - Admin email verification on Google OAuth login
   - Admin check endpoint (`/api/auth/admin/check`)
   - Admin status included in OAuth response

---

## 🚀 Setup Instructions

### Step 1: Configure Admin Emails

Add your admin email(s) to `server/.env`:

```env
# Admin Email List (comma-separated)
# Only these emails can access the admin dashboard
ADMIN_EMAILS=your_admin_email@gmail.com,another_admin@gmail.com
```

**Important:** Use the exact email address from your Google account.

### Step 2: Restart Backend Server

After updating `.env`:

```bash
cd server
npm run dev
```

### Step 3: Access Admin Dashboard

1. Navigate to: `http://localhost:8080/admin/login`
2. Click "Continue with Google"
3. Sign in with your authorized admin email
4. You'll be redirected to `/admin` (Overview page)

---

## 📁 File Structure

```
src/
├── pages/
│   ├── AdminLogin.jsx              # Admin login page
│   └── admin/
│       ├── AdminOverview.jsx       # Dashboard overview
│       ├── AdminUsers.jsx          # User management
│       ├── AdminWarnedUsers.jsx    # Warned users
│       ├── AdminSupport.jsx         # Support tickets
│       └── AdminStaff.jsx           # Staff management
├── components/
│   ├── AdminProtectedRoute.jsx     # Route protection
│   └── admin/
│       ├── DashboardLayout.jsx    # Main layout
│       ├── Sidebar.jsx             # Navigation sidebar
│       ├── PageHeader.jsx          # Page headers
│       ├── StatCard.jsx            # Stats cards
│       ├── DataTable.jsx           # Data tables
│       └── UserModal.jsx           # User modals
└── data/
    └── adminMockData.js            # Mock data for admin dashboard

server/
└── routes/
    └── auth.js                     # Updated with admin checks
```

---

## 🔐 Security Features

1. **Email-Based Access Control**
   - Only emails in `ADMIN_EMAILS` can access admin dashboard
   - Backend verifies admin status on every login

2. **Protected Routes**
   - All admin routes are protected by `AdminProtectedRoute`
   - Redirects to `/admin/login` if not authenticated

3. **Separate Admin Token**
   - Admin sessions use separate token storage
   - Logout clears admin-specific data

---

## 🎨 Features

### Overview Dashboard
- Total visitors, active users, premium users stats
- Links generated counter
- Recent users list
- Quick stats (support tickets, conversion rate, etc.)

### User Management
- View all users with filtering by plan (Free, Basic, Premium, Enterprise)
- Search users by name or email
- User status badges (Active, Suspended, Deactivated)
- User detail modal with upgrade/downgrade options
- Actions: Edit, Suspend, Deactivate

### Warned Users
- Users exceeding device limits
- Warning count tracking
- Actions: Send final warning, Restore user

### Support Tickets
- Filter by status (All, Open, In-Progress, Resolved)
- Ticket detail modal
- Reply to tickets
- Mark tickets as resolved

### Staff Management
- View all staff members
- Add new staff with roles (Admin, Moderator, Support)
- Permission management
- Role-based badges

---

## 🔄 Converting from Mock Data to Real API

Currently, the admin dashboard uses mock data. To connect to real data:

1. **Update API Service** (`src/services/api.js`):
   ```javascript
   // Add admin API functions
   export const fetchAdminUsers = async () => {
     const token = localStorage.getItem('adminToken');
     const response = await fetch(`${API_BASE_URL}/admin/users`, {
       headers: { 'Authorization': `Bearer ${token}` }
     });
     return response.json();
   };
   ```

2. **Create Backend Admin Routes** (`server/routes/admin.js`):
   ```javascript
   // GET /api/admin/users
   // GET /api/admin/stats
   // GET /api/admin/support-tickets
   // etc.
   ```

3. **Update Admin Pages**:
   - Replace `import { users } from "@/data/adminMockData"` 
   - With `import { fetchAdminUsers } from "@/services/api"`
   - Use React Query for data fetching

---

## 🐛 Troubleshooting

### "Access denied. Admin access only."
- **Cause:** Your email is not in `ADMIN_EMAILS` in `server/.env`
- **Fix:** Add your email to `ADMIN_EMAILS` and restart the server

### "Failed to authenticate with Google"
- **Cause:** Google OAuth not configured
- **Fix:** Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `server/.env`

### Admin dashboard shows blank page
- **Cause:** Missing components or routing issue
- **Fix:** Check browser console for errors, verify all files are in place

### Can't access admin routes
- **Cause:** Not logged in as admin
- **Fix:** Go to `/admin/login` and sign in with authorized email

---

## 📝 Next Steps

1. ✅ **Configure Admin Emails** - Add your email to `ADMIN_EMAILS`
2. ⬜ **Connect Real Data** - Replace mock data with API calls
3. ⬜ **Add Admin API Endpoints** - Create backend routes for admin operations
4. ⬜ **Implement User Actions** - Connect Edit/Suspend/Deactivate buttons
5. ⬜ **Add Analytics** - Connect real analytics data
6. ⬜ **Customize Styling** - Adjust colors/styling to match your brand

---

## 🎯 Quick Test

1. Start backend: `cd server && npm run dev`
2. Start frontend: `npm run dev`
3. Go to: `http://localhost:8080/admin/login`
4. Sign in with Google (using email in `ADMIN_EMAILS`)
5. You should see the admin dashboard!

---

**Last Updated:** 2024
**Status:** ✅ Admin dashboard fully integrated and ready to use!
