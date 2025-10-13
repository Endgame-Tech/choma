const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema(
  {
    subscriptionId: { type: String, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    mealPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MealPlan",
      required: true,
    },

    // Meal selection details
    selectedMealTypes: {
      type: [String],
      enum: ["breakfast", "lunch", "dinner", "all"],
      default: ["lunch"],
    },
    frequency: {
      type: String,
      // Allow for flexible frequency options
      default: "lunch",
    },
    duration: {
      type: String,
      // Allow for flexible duration options
    },
    durationWeeks: {
      type: Number,
      min: 1,
      max: 8,
      default: 1,
    },

    // Pricing details
    basePlanPrice: { type: Number, default: 0 },
    frequencyMultiplier: { type: Number, default: 1 },
    durationMultiplier: { type: Number, default: 1 },

    status: {
      type: String,
      enum: [
        "pending_first_delivery",
        "active",
        "paused",
        "cancelled",
        "expired",
      ],
      default: "pending_first_delivery",
    },
    startDate: { type: Date, required: true },
    nextDelivery: Date,
    endDate: { type: Date, required: true },
    totalPrice: { type: Number, required: true },
    price: { type: Number, required: true }, // Monthly/weekly price
    paymentStatus: { type: String, enum: ["Paid", "Pending", "Failed"] },
    paymentReference: String,
    deliveryAddress: String,
    specialInstructions: String,

    // First delivery tracking - NEW
    firstDeliveryCompleted: { type: Boolean, default: false },
    firstDeliveryCompletedAt: Date,
    firstDeliveryOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    actualStartDate: Date, // When first delivery was completed

    // Additional fields for dashboard functionality
    renewalType: {
      type: String,
      enum: ["weekly", "monthly", "one-time"],
      default: "monthly",
    },
    paymentMethod: {
      type: String,
      enum: ["paystack", "transfer", "cash"],
      default: "paystack",
    },
    transactionId: {
      type: String,
      required: true,
    },

    // Temporary payment processing fields
    pendingOrderData: { type: mongoose.Schema.Types.Mixed },
    lastPaymentAttempt: Date,

    // Pause/Resume tracking
    pausedAt: Date,
    resumedAt: Date,
    pauseReason: String,

    // Cancellation tracking
    cancelledAt: Date,
    cancellationReason: String,

    // Renewal tracking
    autoRenewal: { type: Boolean, default: false },
    renewalNotificationSent: { type: Boolean, default: false },

    // Delivery preferences
    deliveryPreferences: {
      frequency: {
        type: String,
        enum: ["daily", "weekly", "bi-weekly"],
        default: "weekly",
      },
      preferredTime: {
        type: String,
        default: "morning", // morning, afternoon, evening
      },
      deliveryInstructions: String,
    },

    // Customization options
    customization: {
      dietaryPreferences: [String],
      allergens: [String],
      spiceLevel: {
        type: String,
        enum: ["mild", "medium", "hot"],
        default: "medium",
      },
      portionSize: {
        type: String,
        enum: ["small", "medium", "large"],
        default: "medium",
      },
    },

    // Feedback and ratings
    feedback: [
      {
        date: { type: Date, default: Date.now },
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        mealPlanId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MealPlan",
        },
      },
    ],

    // Subscription metrics
    metrics: {
      totalMealsDelivered: { type: Number, default: 0 },
      totalMealsMissed: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      consecutiveDays: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
    },

    // Recurring delivery management
    recurringDelivery: {
      // Current meal progression in the plan
      currentMealProgression: {
        weekNumber: { type: Number, default: 1 },
        dayOfWeek: { type: Number, default: 1 },
        mealTime: {
          type: String,
          enum: ["breakfast", "lunch", "dinner"],
          default: "lunch",
        },
      },

      // Last delivered meal tracking
      lastDeliveredMeal: {
        assignmentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MealPlanAssignment",
        },
        deliveredAt: Date,
        weekNumber: Number,
        dayOfWeek: Number,
      },

      // Next scheduled delivery
      nextScheduledDelivery: {
        date: Date,
        assignmentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MealPlanAssignment",
        },
        estimatedTime: String, // "12:00-13:00"
      },

      // Delivery schedule configuration
      deliverySchedule: {
        daysOfWeek: [
          {
            type: Number,
            min: 1,
            max: 7,
          },
        ], // Which days to deliver (1=Monday, 7=Sunday)
        timeSlot: {
          type: String,
          enum: ["morning", "afternoon", "evening", "custom"],
          default: "afternoon",
        },
        customTimeRange: {
          start: String, // "12:00"
          end: String, // "14:00"
        },
      },

      // Skip management
      skippedDays: [
        {
          date: Date,
          reason: String,
          skippedBy: { type: String, enum: ["customer", "chef", "admin"] },
        },
      ],

      // Activation status
      isActivated: { type: Boolean, default: false },
      activatedAt: Date,
      activationDeliveryCompleted: { type: Boolean, default: false },
    },

    // ========================================
    // MEAL PLAN SNAPSHOT - NEW
    // ========================================
    // Complete snapshot of meal plan data at subscription time
    // This ensures data consistency even if the original meal plan is modified
    mealPlanSnapshot: {
      // Basic plan information
      planId: { type: mongoose.Schema.Types.ObjectId, ref: "MealPlan" },
      planName: String,
      planDescription: String,
      targetAudience: String,
      coverImage: String,
      tier: String,

      // Subscription period
      startDate: Date,
      endDate: Date,
      durationWeeks: Number,

      // Complete meal schedule with all details
      mealSchedule: [
        {
          // Assignment reference (for tracking)
          assignmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MealPlanAssignment",
          },

          // Scheduling information
          weekNumber: { type: Number, min: 1, max: 8 },
          dayOfWeek: { type: Number, min: 1, max: 7 }, // 1=Monday, 7=Sunday
          dayName: String, // "Monday", "Tuesday", etc.
          mealTime: {
            type: String,
            enum: ["breakfast", "lunch", "dinner"],
          },

          // Custom title and description for this meal slot
          customTitle: String,
          customDescription: String,
          imageUrl: String,

          // Individual meal details (can be multiple meals per slot)
          meals: [
            {
              mealId: { type: mongoose.Schema.Types.ObjectId, ref: "Meal" },
              name: String,
              image: String,
              category: String,

              // Nutritional snapshot
              nutrition: {
                calories: Number,
                protein: Number,
                carbs: Number,
                fat: Number,
                fiber: Number,
                sugar: Number,
                weight: Number,
              },

              // Pricing snapshot
              pricing: {
                cookingCosts: Number,
                packaging: Number,
                platformFee: Number,
                totalPrice: Number,
                chefEarnings: Number,
                chomaEarnings: Number,
              },

              // Dietary information
              dietaryTags: [String],
              healthGoals: [String],
              allergens: [String],
              ingredients: String,
              detailedIngredients: [
                {
                  name: String,
                  category: String,
                  canOmit: Boolean,
                },
              ],

              // Preparation info
              preparationTime: Number,
              complexityLevel: String,
              preparationMethod: String,
              glycemicIndex: String,

              // Customization options
              customizationOptions: {
                canReducePepper: Boolean,
                canReduceOil: Boolean,
                canRemoveOnions: Boolean,
                canMakeVegan: Boolean,
                canAdjustSpice: Boolean,
                customizationNotes: String,
              },
            },
          ],

          // Delivery tracking for this specific meal slot
          scheduledDeliveryDate: Date,
          deliveryStatus: {
            type: String,
            enum: ["pending", "scheduled", "preparing", "out_for_delivery", "delivered", "skipped", "cancelled"],
            default: "pending",
          },
          deliveredAt: Date,
          skippedReason: String,

          // Slot-specific notes
          notes: String,
        },
      ],

      // Aggregated statistics (pre-calculated for performance)
      stats: {
        totalMeals: Number,
        totalMealSlots: Number, // Number of meal times across all weeks
        mealsPerWeek: Number,
        totalDays: Number,
        daysWithMeals: Number, // Actual days with scheduled meals

        // Nutritional totals and averages
        totalNutrition: {
          calories: Number,
          protein: Number,
          carbs: Number,
          fat: Number,
          fiber: Number,
        },
        avgNutritionPerMeal: {
          calories: Number,
          protein: Number,
          carbs: Number,
          fat: Number,
        },
        avgNutritionPerDay: {
          calories: Number,
          protein: Number,
          carbs: Number,
          fat: Number,
        },

        // Meal type distribution
        mealTypeDistribution: {
          breakfast: Number,
          lunch: Number,
          dinner: Number,
        },

        // Dietary breakdown
        dietaryDistribution: {
          vegan: Number,
          vegetarian: Number,
          pescatarian: Number,
          halal: Number,
          glutenFree: Number,
          dairyFree: Number,
        },

        // Complexity distribution
        complexityDistribution: {
          low: Number,
          medium: Number,
          high: Number,
        },
      },

      // Pricing snapshot (captured at subscription time)
      pricing: {
        basePlanPrice: Number,
        totalMealsCost: Number, // Sum of all individual meal prices
        frequencyMultiplier: Number,
        durationMultiplier: Number,
        subtotal: Number,

        // Discount information (if applied)
        discountApplied: {
          discountId: mongoose.Schema.Types.ObjectId,
          discountPercent: Number,
          discountAmount: Number,
          reason: String,
          discountType: String, // "promo", "ad", "referral", etc.
        },

        totalPrice: Number,
        pricePerMeal: Number,
        pricePerWeek: Number,

        // Earnings breakdown
        totalChefEarnings: Number,
        totalChomaEarnings: Number,
      },

      // Plan features snapshot
      features: [String],

      // Allergen summary (all allergens in the plan)
      allergensSummary: [String],

      // Metadata
      snapshotCreatedAt: { type: Date, default: Date.now },
      lastSyncedAt: Date, // For re-syncing if needed
      isCustomized: { type: Boolean, default: false }, // If user customized the plan
    },

    createdDate: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ endDate: 1 });
SubscriptionSchema.index({ status: 1 });

// Virtual for calculating days remaining
SubscriptionSchema.virtual("daysRemaining").get(function () {
  const today = new Date();
  const endDate = new Date(this.endDate);
  return Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
});

// Virtual for calculating progress percentage
SubscriptionSchema.virtual("progressPercentage").get(function () {
  const totalDays = Math.ceil(
    (this.endDate - this.startDate) / (1000 * 60 * 60 * 24)
  );
  const daysCompleted = totalDays - this.daysRemaining;
  return Math.round((daysCompleted / totalDays) * 100);
});

// Method to check if subscription is active
SubscriptionSchema.methods.isActive = function () {
  return this.status === "active" && this.endDate > new Date();
};

// Method to pause subscription
SubscriptionSchema.methods.pause = function (reason) {
  this.status = "paused";
  this.pausedAt = new Date();
  this.pauseReason = reason;

  console.log(`⏸️ Subscription ${this._id} paused:`, {
    pausedAt: this.pausedAt,
    reason: reason,
    currentEndDate: this.endDate,
  });

  return this.save();
};

// Method to resume subscription
SubscriptionSchema.methods.resume = function () {
  const resumeDate = new Date();
  const pauseDuration = this.pausedAt ? resumeDate - this.pausedAt : 0;
  const pauseDays = Math.ceil(pauseDuration / (1000 * 60 * 60 * 24));

  // Extend end date by the pause duration
  if (this.endDate && pauseDays > 0) {
    const newEndDate = new Date(this.endDate);
    newEndDate.setDate(newEndDate.getDate() + pauseDays);
    this.endDate = newEndDate;

    console.log(`▶️ Subscription ${this._id} resumed:`, {
      resumedAt: resumeDate,
      pauseDuration: `${pauseDays} days`,
      oldEndDate: this.endDate,
      newEndDate: newEndDate,
    });
  }

  this.status = "active";
  this.resumedAt = resumeDate;
  this.pausedAt = undefined;
  this.pauseReason = undefined;

  return this.save();
};

// Static method to find active subscriptions
SubscriptionSchema.statics.findActiveSubscriptions = function () {
  return this.find({
    status: "active",
    endDate: { $gte: new Date() },
  });
};

// Static method to find subscriptions ready for next delivery
SubscriptionSchema.statics.findReadyForDelivery = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return this.find({
    status: "active",
    "recurringDelivery.isActivated": true,
    "recurringDelivery.nextScheduledDelivery.date": {
      $gte: today,
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
    },
  }).populate("mealPlanId");
};

// Method to get current meal assignment
SubscriptionSchema.methods.getCurrentMealAssignment = async function () {
  const MealPlanAssignment = require("./MealPlanAssignment");
  const { weekNumber, dayOfWeek, mealTime } =
    this.recurringDelivery.currentMealProgression;

  return await MealPlanAssignment.findOne({
    mealPlanId: this.mealPlanId,
    weekNumber,
    dayOfWeek,
    mealTime,
  }).populate("mealIds");
};

// Method to advance to next meal
SubscriptionSchema.methods.advanceToNextMeal = async function () {
  const MealPlan = require("./MealPlan");
  const plan = await MealPlan.findById(this.mealPlanId);

  if (!plan) throw new Error("Meal plan not found");

  let { weekNumber, dayOfWeek, mealTime } =
    this.recurringDelivery.currentMealProgression;
  const mealTypes = this.selectedMealTypes || ["lunch"];

  // Find next meal time for the day
  const currentMealIndex = mealTypes.indexOf(mealTime);
  if (currentMealIndex < mealTypes.length - 1) {
    // Move to next meal time same day
    mealTime = mealTypes[currentMealIndex + 1];
  } else {
    // Move to first meal of next day
    mealTime = mealTypes[0];
    dayOfWeek += 1;

    if (dayOfWeek > 7) {
      // Move to next week
      dayOfWeek = 1;
      weekNumber += 1;

      if (weekNumber > plan.durationWeeks) {
        // Restart meal plan cycle
        weekNumber = 1;
      }
    }
  }

  this.recurringDelivery.currentMealProgression = {
    weekNumber,
    dayOfWeek,
    mealTime,
  };
  return this.save();
};

// Method to activate subscription after first delivery
SubscriptionSchema.methods.activate = function () {
  const activationDate = new Date();

  // Mark as activated
  this.recurringDelivery.isActivated = true;
  this.recurringDelivery.activatedAt = activationDate;
  this.recurringDelivery.activationDeliveryCompleted = true;
  this.status = "active";

  // Recalculate end date from activation date (not original start date)
  const durationWeeks = this.durationWeeks || 1;
  const newEndDate = new Date(activationDate);
  newEndDate.setDate(newEndDate.getDate() + durationWeeks * 7);
  this.endDate = newEndDate;

  console.log(`🎯 Subscription ${this._id} activated:`, {
    activatedAt: activationDate,
    originalEndDate: this.endDate,
    newEndDate: newEndDate,
    durationWeeks: durationWeeks,
  });

  return this.save();
};

module.exports = mongoose.model("Subscription", SubscriptionSchema);
