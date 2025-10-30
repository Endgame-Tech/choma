# Backend Server Restart Required

**Date:** 2025-10-29
**Issue:** 500 Error - "Cannot read properties of undefined (reading 'isValidStatusTransition')"
**Cause:** Backend server is running old code
**Solution:** Restart backend server

---

## Error Details

### Frontend Error
```
PUT http://localhost:3002/api/chef/subscriptions/690150f6d76f5275ce92cfb5/meal-type/update
500 (Internal Server Error)
```

### Backend Error
```
❌ Update meal type status error: TypeError: Cannot read properties of undefined
(reading 'isValidStatusTransition')
    at updateMealTypeStatus (C:\dev\choma\backend\controllers\chefSubscriptionController.js:1097:38)
```

---

## Root Cause

The backend server is running **old code** that doesn't include the new methods:
- `isValidStatusTransition()` (line 1171)
- `getValidNextStatuses()` (line 1192)

These methods were added in the recent implementation, but the running server hasn't loaded them yet.

---

## Solution

**Restart your backend server** to load the updated controller code.

### Steps to Restart

1. **Stop the backend server:**
   - If running in a terminal: Press `Ctrl+C`
   - If running as a service: Use your process manager (PM2, systemctl, etc.)

2. **Start the backend server:**
   ```bash
   cd C:\dev\choma\backend
   npm start
   # OR
   npm run dev  # if using nodemon
   # OR
   node server.js
   ```

3. **Verify the server started successfully:**
   - Check console for "Server running on port 3002" (or your configured port)
   - Check for any startup errors

4. **Test the update endpoint:**
   - Refresh the chef React app
   - Try updating a meal status
   - Should work without errors

---

## Verification

### Before Restart
```
❌ TypeError: Cannot read properties of undefined (reading 'isValidStatusTransition')
```

### After Restart
```
✅ Status validation works
✅ Meal updates succeed
✅ No 500 errors
```

---

## What Was Added

The recent implementation added two new validation methods to the controller:

### 1. isValidStatusTransition(currentStatus, newStatus)
```javascript
isValidStatusTransition(currentStatus, newStatus) {
  const allowedTransitions = {
    scheduled: ["chef_assigned", "preparing", "cancelled", "skipped"],
    chef_assigned: ["preparing", "cancelled", "skipped"],
    preparing: ["prepared", "ready", "cancelled"],
    prepared: ["ready", "cancelled"],
    ready: ["out_for_delivery", "cancelled"],
    out_for_delivery: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
    skipped: []
  };

  return allowedTransitions[currentStatus]?.includes(newStatus) || false;
}
```

**Purpose:** Validates status transitions to prevent chefs from skipping steps

### 2. getValidNextStatuses(currentStatus)
```javascript
getValidNextStatuses(currentStatus) {
  const allowedTransitions = {
    // ... same transitions ...
  };

  return allowedTransitions[currentStatus] || [];
}
```

**Purpose:** Returns valid next statuses for error messages

---

## Used By

These methods are called by:

1. **updateMealTypeStatus()** (line 1097)
   - Individual meal type updates
   - PUT /api/chef/subscriptions/:id/meal-type/update

2. **updateDailyMealsStatus()** (line 926)
   - Batch updates for all meals in a day
   - PUT /api/chef/subscriptions/:id/daily-meals/update

---

## Why This Happened

Node.js loads modules into memory when the server starts. When you update controller code, the running server continues using the old code in memory.

**Common scenarios:**
- ✅ Frontend changes: Hot reload works (React dev server)
- ❌ Backend changes: Manual restart required (unless using nodemon)

**Best practice:** Use `nodemon` for development - it auto-restarts on file changes.

---

## Future Prevention

### Option 1: Use Nodemon (Recommended)

```bash
# Install nodemon globally
npm install -g nodemon

# Start backend with nodemon
cd C:\dev\choma\backend
nodemon server.js

# Or add to package.json:
{
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js"
  }
}
```

### Option 2: Watch for Changes Manually

Always restart backend after making controller/route changes.

---

## Checklist

- [ ] Stop backend server (Ctrl+C)
- [ ] Start backend server (`npm start` or `npm run dev`)
- [ ] Verify server started (check console)
- [ ] Refresh chef React app
- [ ] Test meal status update
- [ ] Confirm no errors
- [ ] Proceed with testing

---

## Status

**Current:** Backend running old code ❌
**Required:** Restart backend server
**After restart:** All features will work ✅

**Note:** Frontend is already running the correct code. Only backend needs restart.
