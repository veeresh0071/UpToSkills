# Admin Notification System - Testing Guide

## Overview
This system automatically notifies admins whenever a new Student, Mentor, or Company registers on the platform.

## Features Implemented

### ✅ Backend Features
1. **Admin Notification Utility** (`backend/utils/adminNotifications.js`)
   - Automatic admin notification on new user registration
   - Email notifications (configurable)
   - Get admin notifications with pagination
   - Mark notifications as read
   - Unread notification count

2. **Updated Registration Endpoint** (`backend/routes/auth.js`)
   - Integrated admin notification trigger on successful registration
   - Handles all user roles: Student, Mentor, Company

3. **New API Endpoints** (`backend/routes/adminNotifications.js`)
   - `GET /api/admin/notifications` - Get all admin notifications
   - `GET /api/admin/notifications/unread-count` - Get unread count
   - `PATCH /api/admin/notifications/:id/read` - Mark notification as read
   - `PATCH /api/admin/notifications/mark-all-read` - Mark all as read

4. **Database Schema** (Already exists in `notifications` table)
   - All required fields are present: id, recipient_id, title, message, is_read, created_at, metadata

### ✅ Frontend Features
1. **Updated AdminNotifications Component**
   - Real-time notification display
   - JWT token authentication
   - Mark individual notifications as read
   - Mark all notifications as read
   - Unread notification indicators
   - Time formatting ("2 hours ago")
   - Registration metadata display

2. **Notification Center Integration** (Already exists)
   - Bell icon with unread count badge in admin navbar
   - Real-time updates via Socket.IO

## Configuration

### Email Notifications (Optional)
Add these to your `.env` file:
```env
EMAIL_NOTIFICATIONS_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## Testing Steps

### 1. Start the Backend Server
```bash
cd backend
npm run dev
```

### 2. Start the Frontend
```bash
npm start
```

### 3. Test Registration Notifications

#### Step 1: Login as Admin
1. Go to `http://localhost:3000/login`
2. Select "Admin" role
3. Login with existing admin credentials

#### Step 2: Navigate to Notifications
1. Click on the bell icon in the navbar (should show current count)
2. Go to Admin Panel → Notifications section

#### Step 3: Test New User Registration
1. Open a new incognito/private browser tab
2. Go to `http://localhost:3000/register`
3. Register as a Student, Mentor, or Company
4. Complete the registration process

#### Step 4: Verify Admin Notification
1. Switch back to admin tab
2. Check the bell icon - count should increase
3. Check the Admin Notifications page - should show new notification
4. Notification should display:
   - Title: "New [Role] Registered"
   - Message: "[Name] has registered as [role]"
   - User email in metadata
   - Time stamp
   - Unread indicator (blue dot/border)

### 4. Test Notification Management

#### Mark Individual Notification as Read
- Click on any unread notification
- Blue indicator should disappear
- Notification should be marked as read

#### Mark All Notifications as Read
- Click "Mark All Read" button
- All notifications should lose unread indicators
- Unread count should go to zero

### 5. Test Real-time Updates
1. Keep admin notifications page open
2. In another browser, register a new user
3. Admin notifications should update in real-time without page refresh
4. Bell icon count should update automatically

## API Testing (Optional)

### Test Admin Notification APIs directly:

1. **Login to get admin token**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@project.com","password":"admin_password","role":"admin"}'
```

2. **Get notifications**
```bash
curl -X GET "http://localhost:5000/api/admin/notifications" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **Get unread count**
```bash
curl -X GET "http://localhost:5000/api/admin/notifications/unread-count" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

4. **Mark notification as read**
```bash
curl -X PATCH "http://localhost:5000/api/admin/notifications/1/read" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Expected Behavior

### ✅ When a new user registers:
- Admin receives immediate notification
- Notification appears in admin dashboard
- Bell icon count increases
- Real-time update via Socket.IO
- Optional email sent to admin (if configured)

### ✅ Notification content:
- **Title**: "New Student Registered", "New Mentor Registered", or "New Company Registered"
- **Message**: "[User Name] has registered as [role]"
- **Metadata**: Contains user email and timestamp
- **Time**: Shows relative time ("2 minutes ago")

### ✅ Notification management:
- Click notification to mark as read
- "Mark All Read" button works
- Unread indicators work correctly
- Real-time updates function properly

## Troubleshooting

### No notifications appearing:
1. Check backend console for errors
2. Verify admin user exists in database
3. Check browser console for API errors
4. Verify JWT token is valid

### Email notifications not working:
1. Check EMAIL_NOTIFICATIONS_ENABLED=true in .env
2. Verify email credentials are correct
3. For Gmail, use App Password instead of regular password

### Real-time updates not working:
1. Check Socket.IO connection in browser dev tools
2. Verify WebSocket connection is established
3. Check for CORS issues

## Files Modified/Created

### Backend:
- `utils/adminNotifications.js` (new)
- `routes/adminNotifications.js` (new)
- `routes/auth.js` (modified)
- `server.js` (modified)
- `.env` (modified)

### Frontend:
- `components/AdminPanelDashboard/AdminNotifications.jsx` (modified)

## Security Notes
- All admin endpoints require JWT authentication
- Admin role verification is enforced
- No sensitive data exposed in notifications
- Email credentials are environment variables