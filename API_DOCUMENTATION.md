# Choma API Documentation

## Overview
This document provides comprehensive documentation of all API endpoints in the Choma food delivery system, organized by functional area.

---

## Authentication & User Management

### Auth Routes (`/api/auth`)
- `POST /signup` - User registration
- `POST /login` - User login
- `POST /logout` - User logout (protected)
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token
- `POST /activity/log` - Log user activity (protected)
- `GET /profile` - Get user profile (protected)
- `GET /profile/stats` - Get user statistics (protected)
- `GET /profile/activity` - Get user activity history (protected)
- `GET /profile/achievements` - Get user achievements (protected)
- `GET /profile/notifications` - Get notification preferences (protected)
- `PUT /profile/notifications` - Update notification preferences (protected)
- `PUT /profile` - Update user profile (protected)
- `DELETE /account` - Delete user account (protected)
- `GET /dashboard` - Get personalized dashboard data (protected)
- `POST /subscription/pause` - Pause subscription (protected)
- `POST /subscription/resume` - Resume subscription (protected)
- `GET /delivery/track/:orderId` - Track delivery (protected)
- `POST /push-token` - Register push notification token (protected)
- `DELETE /push-token` - Remove push notification token (protected)
- `POST /send-verification` - Send email verification code
- `POST /verify-email` - Verify email with code
- `POST /resend-verification` - Resend verification code
- `GET /verification-status/:email` - Check verification status
- `POST /cleanup-verifications` - Cleanup expired verifications (admin/cron)
- `POST /verify-bank-account` - Verify bank account details

### User Routes (`/api/users`)
- `GET /:userId/activity` - Get user activity for discount calculation
- `PUT /privacy-settings` - Update privacy settings (protected)
- `POST /privacy-log` - Log privacy action (protected)

---

## Admin Panel

### Admin Routes (`/api/admin`)
- `GET /health` - Health check (no auth)
- `GET /dashboard/stats` - Get dashboard statistics (cached)
- `GET /analytics/users/:id` - Get user analytics
- `GET /analytics/engagement` - Get engagement analytics
- `GET /analytics/kpis` - Get KPI data (cached)
- `GET /analytics/charts` - Get charts data (cached)
- `GET /analytics/insights` - Get insights data (cached)
- `GET /analytics/chart/:chartId` - Get specific chart data (cached)
- `POST /analytics/export` - Export report
- `GET /analytics/user-engagement` - Get user engagement metrics
- `GET /analytics/business-intelligence` - Get business intelligence
- `GET /users` - Get all users (cached)
- `GET /users/stats` - Get user statistics (cached)
- `PUT /users/:id/status` - Update user status
- `GET /export/users` - Export users data

#### Driver Management
- `GET /drivers` - Get all drivers (cached)
- `GET /drivers/:id` - Get driver by ID
- `PUT /drivers/:id/status` - Update driver status
- `DELETE /drivers/:id` - Delete driver
- `GET /drivers/:id/assignments` - Get driver assignments
- `POST /assignments` - Create driver assignment
- `GET /delivery-stats` - Get delivery statistics (cached)

#### Order Management
- `GET /orders` - Get all orders
- `GET /orders/:id` - Get order details
- `PUT /orders/:id/status` - Update order status
- `PUT /orders/bulk/status` - Bulk update order status
- `PUT /orders/:id` - Update order
- `PUT /orders/bulk` - Bulk update orders
- `PUT /orders/:id/cancel` - Cancel order
- `GET /orders/analytics` - Get order analytics

#### Order Assignment
- `GET /delegation/available-chefs/:orderId` - Get available chefs for order
- `POST /delegation/assign/:orderId/:chefId` - Assign order to chef
- `POST /delegation/auto-assign/:orderId` - Auto-assign order
- `PUT /delegation/reassign/:orderId/:newChefId` - Reassign order
- `GET /delegation/history` - Get delegation history

#### Payment Management
- `GET /payments` - Get all payments

#### Subscription Management
- `GET /subscriptions` - Get all subscriptions

#### Chef Management
- `GET /chefs` - Get all chefs
- `GET /chefs/stats` - Get chef statistics
- `GET /chefs/workload` - Get chef workloads (cached)
- `GET /chefs/reassignment-requests` - Get reassignment requests (cached)
- `POST /chefs/assign` - Assign chef
- `POST /chefs/reassignment-requests/:requestId/:action` - Handle reassignment request
- `GET /chefs/:id` - Get chef details
- `PUT /chefs/:id/status` - Update chef status
- `PUT /chefs/:id/approve` - Approve chef
- `PUT /chefs/:id/reject` - Reject chef
- `GET /chefs/pending/count` - Get pending chefs count
- `POST /chefs/:id/notify` - Notify chef

#### Chef Payouts
- `POST /chefs/payouts/process` - Process weekly payouts
- `GET /chefs/payouts/summary` - Get payout summary
- `GET /chefs/:chefId/earnings` - Get chef earnings (admin view)

#### Meal Plan Management
- `GET /mealplans` - Get all meal plans
- `GET /mealplans/:id` - Get meal plan details
- `POST /mealplans` - Create meal plan
- `PUT /mealplans/:id` - Update meal plan
- `DELETE /mealplans/:id` - Delete meal plan
- `GET /meal-plans/list` - Get meal plan list for admin
- `GET /meal-plans/categories` - Get meal plan categories

#### Daily Meals Management
- `GET /dailymeals` - Get all daily meals
- `GET /mealplans/:id/dailymeals` - Get daily meals for plan
- `PUT /dailymeals/:id` - Update daily meal
- `DELETE /dailymeals/:id` - Delete daily meal
- `POST /mealplans/:id/duplicate` - Duplicate meal plan
- `GET /mealplans/analytics/overview` - Get meal plan analytics
- `GET /mealplans/export/data` - Export meal plan data
- `POST /mealplans/bulk/template` - Create meal plan from template

#### Individual Meals Management (V2)
- `GET /meals` - Get all meals
- `DELETE /meals/duplicates` - Delete duplicate meals
- `GET /meals/:id` - Get meal details
- `POST /meals` - Create meal
- `PUT /meals/:id` - Update meal
- `DELETE /meals/:id` - Delete meal
- `PUT /meals/:id/availability` - Toggle meal availability

#### New Meal Plans Management (V2)
- `GET /meal-plans` - Get all meal plans V2
- `GET /meal-plans/:id` - Get meal plan details V2
- `POST /meal-plans` - Create meal plan V2
- `PUT /meal-plans/:id` - Update meal plan V2
- `DELETE /meal-plans/:id` - Delete meal plan V2
- `PUT /meal-plans/:id/publish` - Publish meal plan
- `PUT /meal-plans/:id/unpublish` - Unpublish meal plan
- `POST /meal-plans/:id/duplicate` - Duplicate meal plan V2
- `POST /meal-plans/:id/recalculate-price` - Recalculate meal plan price

#### Meal Assignment System
- `GET /meal-plans/:id/assignments` - Get meal plan assignments
- `POST /meal-plans/:id/assign-meal` - Assign meal to plan
- `PUT /meal-plans/:id/assignments/:assignmentId` - Update meal assignment
- `DELETE /meal-plans/:id/assignments/:assignmentId` - Remove meal assignment
- `GET /meal-plans/:id/schedule` - Get meal plan schedule

#### Bulk Operations
- `POST /meals/bulk` - Bulk create meals
- `PUT /meals/bulk/availability` - Bulk update meal availability

#### Admin Management
- `GET /admins` - Get all admins
- `GET /admins/:id` - Get admin
- `POST /admins` - Create admin
- `PUT /admins/:id` - Update admin
- `DELETE /admins/:id` - Delete admin
- `PUT /admins/:id/toggle-status` - Toggle admin status
- `GET /roles/predefined` - Get predefined roles

#### Activity & Security
- `GET /activity-logs` - Get activity logs
- `GET /activity` - Get user activity for dashboard
- `GET /security-alerts` - Get security alerts
- `PUT /security-alerts/:id/resolve` - Resolve security alert

#### Recurring Delivery Analytics
- `GET /analytics/subscription-metrics` - Get subscription metrics (cached)
- `GET /analytics/meal-plan-popularity` - Get meal plan popularity (cached)
- `GET /analytics/chef-performance` - Get chef performance (cached)
- `GET /analytics/subscription-trends` - Get subscription trends (cached)

#### Delivery Monitoring
- `GET /deliveries/monitor` - Get live deliveries (cached)
- `GET /deliveries/stats` - Get delivery stats (cached)

---

## Orders & Subscriptions

### Orders (`/api/orders`)
All routes require authentication
- `GET /` - Get user's orders (cached)
- `GET /assigned` - Get user's assigned orders (cached)
- `GET /:id` - Get order by ID (cached)
- `POST /` - Create new order
- `PUT /:id` - Update order
- `PUT /:id/status` - Update order status
- `POST /:id/rating` - Rate an order

### Subscriptions (`/api/subscriptions`)
All routes require authentication
- `GET /` - Get user's subscriptions (cached)
- `GET /:id` - Get subscription by ID (cached)
- `POST /` - Create new subscription
- `PUT /:id` - Update subscription
- `PUT /:id/pause` - Pause subscription
- `PUT /:id/resume` - Resume subscription
- `DELETE /:id` - Cancel subscription

#### Recurring Delivery Features
- `GET /:id/current-meal` - Get current meal for subscription (cached)
- `GET /:id/chef-status` - Get chef preparation status (cached)
- `GET /:id/next-delivery` - Get next delivery information (cached)
- `GET /:id/meal-timeline` - Get meal progression timeline (cached)
- `GET /:id/deliveries` - Get subscription delivery history (cached)
- `POST /:id/skip-meal` - Skip a meal delivery
- `PUT /:id/delivery-preferences` - Update delivery preferences
- `POST /:id/reassign-chef` - Request chef reassignment
- `POST /deliveries/:deliveryId/rate` - Rate a completed delivery

### Unified Subscriptions (`/api/unified-subscriptions`)

#### Admin Routes (require admin auth)
- `GET /admin/next-deliveries` - Get comprehensive next delivery overview
- `PUT /admin/reassign-chef/:subscriptionId` - Reassign chef for subscription
- `PUT /admin/bulk-update-schedules` - Bulk update delivery schedules
- `GET /admin/available-chefs` - Get available chefs for reassignment
- `GET /admin/monitoring` - Get monitoring dashboard data
- `POST /admin/trigger-workflow/:workflowName` - Trigger manual workflow

#### Chef Routes (require chef auth)
- `GET /chef/next-assignments` - Get chef's next cooking assignments
- `PUT /chef/cooking-status/:deliveryId` - Update cooking status for delivery
- `POST /chef/request-reassignment/:subscriptionId` - Request reassignment from customer

#### Driver Routes (require driver auth)
- `GET /driver/next-deliveries` - Get driver's next delivery assignments
- `PUT /driver/delivery-status/:deliveryId` - Update delivery status
- `GET /driver/optimized-route` - Get route optimization for driver's deliveries

#### Shared Routes (any authenticated role)
- `GET /timeline/:subscriptionId` - Get subscription timeline
- `GET /statistics` - Get subscription statistics

---

## Chef Management

### Chef Routes (`/api/chef`)

#### Authentication
- `GET /registration-status/:email` - Check chef registration status
- `POST /register` - Chef registration
- `POST /login` - Chef login
- `POST /forgot-password` - Send password reset link
- `POST /verify-reset-token` - Verify password reset token
- `POST /reset-password` - Reset password

#### Bank Verification
- `GET /banks` - Get list of Nigerian banks
- `POST /verify-bank-account` - Verify bank account details

#### Protected Routes (require chef auth)
- `GET /dashboard` - Get chef dashboard data
- `GET /dashboard/stats` - Get chef dashboard stats
- `GET /profile` - Get chef profile
- `PUT /profile` - Update chef profile
- `PUT /availability` - Update chef availability
- `GET /analytics` - Get chef analytics

#### Order Management
- `GET /orders` - Get chef's orders
- `PUT /orders/:orderId/accept` - Accept an order
- `PUT /orders/:orderId/start` - Start working on an order
- `PUT /orders/:orderId/complete` - Complete an order
- `PUT /orders/:orderId/reject` - Reject an order
- `PUT /orders/:orderId/chef-status` - Update chef cooking status

#### Notifications & Earnings
- `GET /notifications` - Get chef notifications
- `PUT /notifications/:notificationId/read` - Mark notification as read
- `GET /earnings` - Get chef earnings summary

#### Meal Plans & Orders
- `GET /orders/:orderId/meal-plan` - Get detailed meal plan for an order
- `GET /orders/:orderId/earnings-breakdown` - Get earnings breakdown for an order

---

## Driver Management

### Driver Routes (`/api/driver`)

#### Authentication (public)
- `POST /auth/register` - Driver registration
- `POST /auth/login` - Driver login

#### Protected Routes (require driver auth)
- `POST /auth/logout` - Driver logout
- `POST /auth/verify` - Verify token
- `GET /profile` - Get driver profile
- `PUT /profile` - Update driver profile
- `PUT /location` - Update driver location
- `POST /status/online` - Go online
- `POST /status/offline` - Go offline

#### Assignment Management
- `GET /assignments` - Get available assignments
- `POST /assignments/:id/accept` - Accept assignment
- `PUT /assignments/:id/pickup` - Confirm pickup
- `PUT /assignments/:id/deliver` - Confirm delivery
- `PUT /assignments/:id/status` - Update assignment status

#### History & Stats
- `GET /history` - Get delivery history
- `GET /stats/daily` - Get daily stats

#### Subscription Delivery Management
- `GET /subscription/my-deliveries` - Get my subscription deliveries
- `GET /subscription/pickup-assignments` - Get my pickup assignments
- `POST /subscription/confirm-pickup` - Confirm pickup
- `POST /subscription/confirm-delivery` - Confirm delivery
- `GET /subscription/weekly-schedule` - Get weekly delivery schedule
- `GET /subscription/metrics` - Get subscription metrics
- `GET /subscription/customer/:customerId/subscription/:subscriptionId/timeline` - Get customer subscription timeline
- `PUT /subscription/delivery/status` - Update delivery status

---

## Meal Plans & Content

### Meal Plans (`/api/mealplans`)
- `GET /` - Get all meal plans (cached)
- `GET /popular` - Get popular meal plans (cached)
- `GET /filtered` - Get filtered meal plans (cached)
- `GET /search` - Search meal plans with filters (cached)
- `GET /audiences` - Get available target audiences (cached)
- `GET /meals/available` - Get available daily meals (cached)
- `GET /:id` - Get meal plan by ID (cached)
- `GET /:id/customization` - Get meal customization preferences (protected)
- `POST /` - Create new meal plan (protected)
- `POST /customization` - Save meal customization preferences (protected)
- `PUT /:id` - Update meal plan (protected)
- `DELETE /:id` - Delete meal plan (protected)
- `GET /:id/discount-rules` - Get discount rules for meal plan

---

## Delivery & Logistics

### Delivery (`/api/delivery`)
- `GET /price` - Get delivery price by location (public)
- `GET /zones` - Get all delivery zones (public)
- `GET /tracking/:trackingId` - Get delivery tracking (public)
- `GET /my-deliveries` - Get customer deliveries (protected)
- `PUT /driver/:driverId/location` - Update driver location (driver only)
- `PUT /tracking/:trackingId/status` - Update delivery status (driver only)
- `POST /tracking` - Create delivery tracking (admin only)
- `PUT /tracking/:trackingId/assign` - Assign driver (admin only)
- `GET /drivers/available` - Get available drivers (admin only)
- `GET /analytics` - Get delivery analytics (admin only)

---

## Payments & Financial

### Payments (`/api/payments`)
- `POST /initialize` - Initialize payment (protected, API key required in production)
- `GET /verify/:reference` - Verify payment (protected)
- `GET /history` - Get payment history (protected)
- `POST /refund` - Refund payment (protected, API key required in production)
- `POST /webhook` - Paystack webhook (no auth)

---

## Discounts & Promotions

### Discounts (`/api/discounts`)
- `GET /global` - Get global discount rules
- `POST /calculate` - Calculate discount for user and meal plan

### Discount Routes (`/api/discount-routes`)
- `GET /global` - Get global discount rules
- `POST /calculate` - Calculate user discount

---

## Notifications & Communication

### Notifications (`/api/notifications`)
All routes require authentication
- `GET /` - Get user notifications
- `GET /unread-count` - Get unread notification count
- `GET /preferences` - Get notification preferences
- `GET /preferences/settings` - Get notification preferences (alias)
- `GET /stats` - Get notification statistics
- `PUT /preferences` - Update notification preferences
- `PUT /preferences/settings` - Update notification preferences (alias)
- `GET /:id` - Get notification by ID
- `PUT /:id/read` - Mark notification as read
- `PUT /mark-all-read` - Mark all notifications as read
- `DELETE /:id` - Delete notification
- `DELETE /read/all` - Delete all read notifications

---

## Banners & Promotions

### Banners (`/api/banners`)

#### Public Routes
- `GET /active` - Get active banners for mobile app (rate limited)
- `POST /:id/impression` - Track banner impression (rate limited)
- `POST /:id/click` - Track banner click (rate limited)

#### Admin Routes (require admin auth)
- `GET /` - Get all banners
- `GET /:id` - Get single banner
- `GET /:id/stats` - Get banner statistics
- `POST /` - Create new banner
- `PUT /:id` - Update banner
- `PUT /:id/publish` - Toggle publish status
- `DELETE /:id` - Delete banner

---

## Search & Discovery

### Search (`/api/search`)
- `GET /popular` - Get latest meal plans (returns top 10 meal plans)

---

## File Upload & Media

### Upload (`/api/upload`)
- `POST /logo` - Upload logo (admin only)
- `GET /logo` - Get current logo URL
- `POST /profile-image` - Upload profile image (protected)
- `POST /banner-image` - Upload banner image (admin only)

---

## Meal Assignments

### Meal Assignments (`/api/meal-assignments`)
Route file exists but content not analyzed in this documentation.

---

## Additional Routes

### Admin Notifications (`/api/admin/notifications`)
Mounted as sub-route under admin

### Two-Factor Authentication (`/api/admin/2fa`)
Mounted as sub-route under admin

### Chef Subscriptions (`/api/chef/subscriptions`)
Mounted as sub-route under chef

### Admin Auth (`/api/admin-auth`)
Route file exists but content not analyzed

### Errors (`/api/errors`)
Route file exists but content not analyzed

### Images (`/api/images`)
Route file exists but content not analyzed

### Admin Delivery Price (`/api/admin-delivery-price`)
Route file exists but content not analyzed

---

## Authentication & Authorization Summary

### Authentication Types:
1. **User Auth** (`auth` middleware) - Standard customer authentication
2. **Admin Auth** (`authenticateAdmin` middleware) - Admin panel authentication  
3. **Chef Auth** (`chefAuth` middleware) - Chef-specific authentication
4. **Driver Auth** (`driverAuth` middleware) - Driver-specific authentication
5. **API Key** (`validateApiKey` middleware) - For sensitive operations in production

### Caching Strategy:
The API uses extensive caching with different strategies:
- **Short**: 2-5 minutes for frequently changing data
- **Medium**: 5-10 minutes for moderately stable data
- **Long**: 1 hour+ for rarely changing data
- **Custom**: Specific caching for dashboard stats, chef workload, etc.

---

## Rate Limiting:
Several endpoints implement rate limiting, particularly:
- Banner operations (30 requests per minute)
- File uploads
- Webhook endpoints

This documentation covers all identified API endpoints in the Choma system as of the current codebase analysis.