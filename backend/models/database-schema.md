# choma Database Schema

## Production-Ready Database Models for choma App

### 1. Users Collection

```javascript
{
  _id: ObjectId,
  fullName: String,
  email: String (unique, indexed),
  password: String (hashed),
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  profileImage: String, // URL or base64
  dietaryPreferences: [String], // ["vegetarian", "gluten-free", etc.]
  allergies: [String],
  isEmailVerified: Boolean,
  isPhoneVerified: Boolean,
  role: String, // "customer", "admin", "chef"
  status: String, // "active", "suspended", "deleted"
  referralCode: String (unique),
  referredBy: ObjectId, // Reference to user who referred
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date
}
```

### 2. Meal Plans Collection

```javascript
{
  _id: ObjectId,
  planId: String (unique, indexed),
  planName: String,
  description: String,
  category: String, // "Fitness", "Professional", "Family", "Wellness"
  basePrice: Number,
  discountedPrice: Number,
  currency: String, // "NGN"
  duration: Number, // days
  servings: Number,
  audience: String, // "fitness", "professional", "family"
  tags: [String], // ["Most Popular", "Best Value", etc.]
  images: [String], // Array of image URLs
  isActive: Boolean,
  nutritionInfo: {
    calories: Number,
    protein: String,
    carbs: String,
    fat: String,
    fiber: String
  },
  weeklyMenus: [{
    week: Number,
    days: [{
      day: String, // "Monday", "Tuesday", etc.
      meals: [{
        mealType: String, // "Breakfast", "Lunch", "Dinner", "Snack"
        name: String,
        description: String,
        image: String,
        ingredients: [String],
        nutritionInfo: {
          calories: Number,
          protein: Number,
          carbs: Number,
          fat: Number
        }
      }]
    }]
  }],
  customizationOptions: {
    canChangeMeals: Boolean,
    canChangePortions: Boolean,
    canExcludeIngredients: Boolean,
    maxChangesPerWeek: Number
  },
  createdBy: ObjectId, // Reference to chef/admin
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Orders Collection

```javascript
{
  _id: ObjectId,
  orderId: String (unique, indexed),
  customerId: ObjectId, // Reference to Users
  mealPlanId: ObjectId, // Reference to Meal Plans
  subscriptionId: ObjectId, // Reference to Subscriptions (if applicable)
  orderType: String, // "one-time", "subscription"
  status: String, // "pending", "confirmed", "preparing", "ready", "delivered", "cancelled"
  quantity: Number,
  pricing: {
    subtotal: Number,
    deliveryFee: Number,
    tax: Number,
    discount: Number,
    total: Number
  },
  deliveryInfo: {
    name: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    deliveryDate: Date,
    deliveryTimeSlot: String,
    specialInstructions: String
  },
  paymentInfo: {
    method: String, // "card", "bank_transfer", "wallet"
    reference: String,
    status: String, // "pending", "completed", "failed", "refunded"
    paidAt: Date
  },
  items: [{
    mealPlanId: ObjectId,
    planName: String,
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number,
    customizations: {
      excludedIngredients: [String],
      portionAdjustments: Object,
      mealReplacements: Object
    }
  }],
  tracking: {
    trackingId: String (unique),
    currentStatus: String,
    statusHistory: [{
      status: String,
      timestamp: Date,
      location: String,
      notes: String
    }],
    driverId: ObjectId, // Reference to delivery driver
    estimatedDeliveryTime: Date
  },
  rating: {
    foodRating: Number, // 1-5
    deliveryRating: Number, // 1-5
    overallRating: Number, // 1-5
    review: String,
    ratedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 4. Subscriptions Collection

```javascript
{
  _id: ObjectId,
  subscriptionId: String (unique, indexed),
  customerId: ObjectId, // Reference to Users
  mealPlanId: ObjectId, // Reference to Meal Plans
  status: String, // "active", "paused", "cancelled", "expired"
  frequency: String, // "weekly", "bi-weekly", "monthly"
  duration: String, // "1 month", "3 months", "6 months", "12 months"
  startDate: Date,
  endDate: Date,
  nextDeliveryDate: Date,
  pricing: {
    basePrice: Number,
    discountPercent: Number,
    finalPrice: Number,
    billingCycle: String // "weekly", "monthly"
  },
  deliveryInfo: {
    name: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    preferredTimeSlot: String,
    deliveryInstructions: String
  },
  customizations: {
    excludedIngredients: [String],
    portionPreferences: Object,
    mealPreferences: Object
  },
  upcomingOrders: [ObjectId], // References to scheduled orders
  orderHistory: [ObjectId], // References to completed orders
  pauseHistory: [{
    pausedAt: Date,
    resumedAt: Date,
    reason: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### 5. Notifications Collection

```javascript
{
  _id: ObjectId,
  notificationId: String (unique, indexed),
  userId: ObjectId, // Reference to Users
  title: String,
  message: String,
  type: String, // "order", "delivery", "promotion", "system", "payment"
  priority: String, // "high", "medium", "low"
  status: String, // "unread", "read", "archived"
  data: Object, // Additional data based on notification type
  imageUrl: String,
  actionUrl: String, // Deep link or screen to navigate
  isGlobal: Boolean, // True for announcements to all users
  scheduledFor: Date, // For scheduled notifications
  sentAt: Date,
  readAt: Date,
  createdAt: Date
}
```

### 6. Promotional Banners Collection

```javascript
{
  _id: ObjectId,
  bannerId: String (unique, indexed),
  title: String,
  subtitle: String,
  buttonText: String,
  imageUrl: String,
  colors: [String], // Gradient colors
  targetAudience: [String], // ["all", "new_users", "premium", etc.]
  priority: Number, // Display order
  isActive: Boolean,
  validFrom: Date,
  validUntil: Date,
  clickCount: Number,
  impressionCount: Number,
  actionType: String, // "navigate", "external_link", "promotion"
  actionData: Object, // Screen name, URL, or promotion details
  createdBy: ObjectId, // Reference to admin
  createdAt: Date,
  updatedAt: Date
}
```

### 7. User Statistics Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId, // Reference to Users (unique)
  ordersThisMonth: Number,
  totalOrdersCompleted: Number,
  totalOrdersCancelled: Number,
  favoriteCategory: String,
  streakDays: Number, // Consecutive days with orders
  totalSpent: Number,
  totalSaved: Number, // From discounts and promotions
  nutritionScore: Number, // 0-100
  averageRating: Number, // Average rating given
  lastOrderDate: Date,
  joinDate: Date,
  achievements: [{
    achievementId: String,
    title: String,
    description: String,
    icon: String,
    earnedAt: Date,
    progress: Number,
    target: Number
  }],
  activityLog: [{
    action: String, // "order_placed", "subscription_created", etc.
    date: Date,
    data: Object
  }],
  updatedAt: Date
}
```

### 8. Payment Transactions Collection

```javascript
{
  _id: ObjectId,
  transactionId: String (unique, indexed),
  userId: ObjectId, // Reference to Users
  orderId: ObjectId, // Reference to Orders
  subscriptionId: ObjectId, // Reference to Subscriptions (if applicable)
  amount: Number,
  currency: String, // "NGN"
  status: String, // "pending", "completed", "failed", "cancelled", "refunded"
  paymentMethod: String, // "paystack", "flutterwave", "bank_transfer"
  paymentReference: String, // Gateway reference
  gatewayResponse: Object, // Full response from payment gateway
  metadata: Object, // Additional transaction data
  refundInfo: {
    refundId: String,
    refundAmount: Number,
    refundReason: String,
    refundedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 9. Delivery Tracking Collection

```javascript
{
  _id: ObjectId,
  trackingId: String (unique, indexed),
  orderId: ObjectId, // Reference to Orders
  driverId: ObjectId, // Reference to delivery driver
  status: String, // "assigned", "picked_up", "in_transit", "delivered", "cancelled"
  currentLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    timestamp: Date
  },
  routeHistory: [{
    latitude: Number,
    longitude: Number,
    timestamp: Date,
    status: String
  }],
  estimatedArrival: Date,
  actualDeliveryTime: Date,
  deliveryProof: {
    image: String, // Photo at delivery
    signature: String, // Customer signature
    notes: String
  },
  driverInfo: {
    name: String,
    phone: String,
    vehicleNumber: String,
    rating: Number
  },
  customerFeedback: {
    rating: Number, // 1-5
    feedback: String,
    submittedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 10. User Bookmarks Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId, // Reference to Users
  itemId: ObjectId, // Reference to meal plan or other item
  itemType: String, // "mealplan", "recipe", "chef"
  bookmarkedAt: Date
}
```

### 11. Reviews and Ratings Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId, // Reference to Users
  itemId: ObjectId, // Reference to meal plan, order, etc.
  itemType: String, // "mealplan", "order", "delivery"
  rating: Number, // 1-5
  review: String,
  images: [String], // Review photos
  helpfulCount: Number,
  isVerifiedPurchase: Boolean,
  moderationStatus: String, // "approved", "pending", "rejected"
  createdAt: Date,
  updatedAt: Date
}
```

### 12. Support Tickets Collection

```javascript
{
  _id: ObjectId,
  ticketId: String (unique, indexed),
  userId: ObjectId, // Reference to Users
  subject: String,
  message: String,
  category: String, // "general", "order", "payment", "technical"
  priority: String, // "low", "medium", "high", "urgent"
  status: String, // "open", "in_progress", "resolved", "closed"
  assignedTo: ObjectId, // Reference to support agent
  attachments: [String], // File URLs
  responses: [{
    responderId: ObjectId, // User or agent ID
    responderType: String, // "user", "agent"
    message: String,
    attachments: [String],
    timestamp: Date
  }],
  resolvedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Indexes for Performance

```javascript
// Users
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ phone: 1 })
db.users.createIndex({ referralCode: 1 }, { unique: true })

// Meal Plans
db.mealplans.createIndex({ planId: 1 }, { unique: true })
db.mealplans.createIndex({ category: 1, isActive: 1 })
db.mealplans.createIndex({ basePrice: 1 })
db.mealplans.createIndex({ "tags": 1 })

// Orders
db.orders.createIndex({ orderId: 1 }, { unique: true })
db.orders.createIndex({ customerId: 1, createdAt: -1 })
db.orders.createIndex({ status: 1 })
db.orders.createIndex({ "tracking.trackingId": 1 }, { unique: true })

// Subscriptions
db.subscriptions.createIndex({ subscriptionId: 1 }, { unique: true })
db.subscriptions.createIndex({ customerId: 1, status: 1 })
db.subscriptions.createIndex({ nextDeliveryDate: 1 })

// Notifications
db.notifications.createIndex({ userId: 1, status: 1, createdAt: -1 })
db.notifications.createIndex({ notificationId: 1 }, { unique: true })

// Banners
db.promotionalbanners.createIndex({ isActive: 1, validFrom: 1, validUntil: 1 })
db.promotionalbanners.createIndex({ bannerId: 1 }, { unique: true })

// User Statistics
db.userstatistics.createIndex({ userId: 1 }, { unique: true })

// Payment Transactions
db.paymenttransactions.createIndex({ transactionId: 1 }, { unique: true })
db.paymenttransactions.createIndex({ userId: 1, createdAt: -1 })

// Delivery Tracking
db.deliverytracking.createIndex({ trackingId: 1 }, { unique: true })
db.deliverytracking.createIndex({ orderId: 1 })

// Bookmarks
db.userbookmarks.createIndex({ userId: 1, itemType: 1 })
db.userbookmarks.createIndex({ itemId: 1, itemType: 1 })

// Reviews
db.reviews.createIndex({ itemId: 1, itemType: 1 })
db.reviews.createIndex({ userId: 1, createdAt: -1 })

// Support Tickets
db.supporttickets.createIndex({ ticketId: 1 }, { unique: true })
db.supporttickets.createIndex({ userId: 1, status: 1 })
```
