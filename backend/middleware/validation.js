const { body, param, query, validationResult } = require('express-validator');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Common validation rules
const commonValidations = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  password: body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  name: body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name can only contain letters and spaces'),
  
  firstName: body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 25 })
    .withMessage('First name must be between 2 and 25 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  lastName: body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 25 })
    .withMessage('Last name must be between 2 and 25 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  phone: body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  mongoId: param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  
  positiveNumber: (field) => body(field)
    .isFloat({ min: 0 })
    .withMessage(`${field} must be a positive number`),
  
  positiveInteger: (field) => body(field)
    .isInt({ min: 0 })
    .withMessage(`${field} must be a positive integer`),
  
  stringArray: (field) => body(field)
    .optional()
    .isArray()
    .withMessage(`${field} must be an array`)
    .custom((arr) => {
      if (!Array.isArray(arr)) return false;
      return arr.every(item => typeof item === 'string');
    })
    .withMessage(`${field} must be an array of strings`)
};

// User validation rules
const userValidations = {
  register: [
    commonValidations.name,
    commonValidations.email,
    commonValidations.password,
    commonValidations.phone,
    body('address').optional().trim().isLength({ max: 200 }),
    body('city').optional().trim().isLength({ max: 50 }),
    body('dietaryPreferences').optional().isArray(),
    body('allergies').optional().isArray(),
    handleValidationErrors
  ],
  
  login: [
    commonValidations.email,
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
  ],
  
  updateProfile: [
    commonValidations.name,
    commonValidations.firstName,
    commonValidations.lastName,
    commonValidations.phone,
    body('address').optional().trim().isLength({ max: 200 }),
    body('city').optional().trim().isLength({ max: 50 }),
    body('state').optional().trim().isLength({ max: 50 }),
    body('dateOfBirth').optional().isISO8601().withMessage('Date of birth must be a valid date'),
    body('dietaryPreferences').optional().isArray(),
    body('allergies').optional().custom((value) => {
      // Accept both string and array for allergies
      if (typeof value === 'string' || Array.isArray(value)) {
        return true;
      }
      throw new Error('Allergies must be a string or array');
    }),
    body('profileImage').optional().isString().withMessage('Profile image must be a string URL'),
    handleValidationErrors
  ],
  
  updateStatus: [
    commonValidations.mongoId,
    body('status')
      .isIn(['Active', 'Inactive', 'Suspended', 'Deleted'])
      .withMessage('Invalid status value'),
    handleValidationErrors
  ]
};

// Chef validation rules
const chefValidations = {
  register: [
    commonValidations.name,
    commonValidations.email,
    commonValidations.password,
    commonValidations.phone,
    body('specialties')
      .isArray({ min: 1 })
      .withMessage('At least one specialty is required'),
    body('experience')
      .isInt({ min: 0, max: 50 })
      .withMessage('Experience must be between 0 and 50 years'),
    body('city').trim().isLength({ min: 2, max: 50 }),
    body('area').trim().isLength({ min: 2, max: 50 }),
    body('address').trim().isLength({ min: 10, max: 200 }),
    body('maxCapacity')
      .isInt({ min: 1, max: 100 })
      .withMessage('Max capacity must be between 1 and 100'),
    body('workingHours').optional().isObject(),
    body('workDays').optional().isArray(),
    body('bankDetails').optional().isObject(),
    handleValidationErrors
  ],
  
  login: [
    commonValidations.email,
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
  ],
  
  updateStatus: [
    commonValidations.mongoId,
    body('status')
      .isIn(['Active', 'Inactive', 'Suspended', 'Pending'])
      .withMessage('Invalid chef status'),
    handleValidationErrors
  ]
};

// Meal Plan validation rules
const mealPlanValidations = {
  create: [
    body('planName')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Plan name must be between 3 and 100 characters'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('Description must be between 10 and 500 characters'),
    body('targetAudience')
      .isIn(['Fitness', 'Weight Loss', 'Muscle Gain', 'General Health', 'Vegetarian', 'Vegan'])
      .withMessage('Invalid target audience'),
    commonValidations.positiveNumber('basePrice'),
    body('mealsPerWeek')
      .isInt({ min: 1, max: 21 })
      .withMessage('Meals per week must be between 1 and 21'),
    body('planDuration')
      .isIn(['1 Week', '2 Weeks', '4 Weeks', '8 Weeks', '12 Weeks'])
      .withMessage('Invalid plan duration'),
    body('isActive').optional().isBoolean(),
    body('planFeatures').optional().isArray(),
    body('nutritionInfo').optional().isObject(),
    body('allergens').optional().isArray(),
    body('chefNotes').optional().trim().isLength({ max: 1000 }),
    body('weeklyMeals').optional().isObject(),
    handleValidationErrors
  ],
  
  update: [
    commonValidations.mongoId,
    body('planName')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 }),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 500 }),
    body('targetAudience')
      .optional()
      .isIn(['Fitness', 'Weight Loss', 'Muscle Gain', 'General Health', 'Vegetarian', 'Vegan']),
    body('basePrice').optional().isFloat({ min: 0 }),
    body('mealsPerWeek').optional().isInt({ min: 1, max: 21 }),
    body('planDuration')
      .optional()
      .isIn(['1 Week', '2 Weeks', '4 Weeks', '8 Weeks', '12 Weeks']),
    body('isActive').optional().isBoolean(),
    handleValidationErrors
  ],
  
  delete: [
    commonValidations.mongoId,
    handleValidationErrors
  ]
};

// Order validation rules
const orderValidations = {
  create: [
    body('customerId').isMongoId().withMessage('Invalid customer ID'),
    body('subscriptionId').isMongoId().withMessage('Invalid subscription ID'),
    body('orderItems').isArray({ min: 1 }).withMessage('Order must have at least one item'),
    body('deliveryAddress').trim().isLength({ min: 10, max: 200 }),
    body('totalAmount').isFloat({ min: 0 }),
    body('paymentMethod').isIn(['card', 'transfer', 'cash']),
    handleValidationErrors
  ],
  
  updateStatus: [
    commonValidations.mongoId,
    body('orderStatus')
      .isIn(['Pending', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled'])
      .withMessage('Invalid order status'),
    body('paymentStatus')
      .optional()
      .isIn(['Pending', 'Paid', 'Failed', 'Refunded'])
      .withMessage('Invalid payment status'),
    body('notes').optional().trim().isLength({ max: 500 }),
    handleValidationErrors
  ],
  
  assignChef: [
    body('orderId').isMongoId().withMessage('Invalid order ID'),
    body('chefId').isMongoId().withMessage('Invalid chef ID'),
    body('notes').optional().trim().isLength({ max: 500 }),
    handleValidationErrors
  ]
};

// Subscription validation rules
const subscriptionValidations = {
  create: [
    body('userId').isMongoId().withMessage('Invalid user ID'),
    body('mealPlanId').isMongoId().withMessage('Invalid meal plan ID'),
    body('frequency')
      .isIn(['Daily', 'Weekly', 'Bi-weekly', 'Monthly'])
      .withMessage('Invalid frequency'),
    body('duration')
      .isIn(['1 Week', '2 Weeks', '4 Weeks', '8 Weeks', '12 Weeks'])
      .withMessage('Invalid duration'),
    body('startDate').isISO8601().withMessage('Invalid start date'),
    body('customizations').optional().isObject(),
    handleValidationErrors
  ],
  
  update: [
    commonValidations.mongoId,
    body('status')
      .optional()
      .isIn(['Active', 'Paused', 'Cancelled', 'Completed'])
      .withMessage('Invalid subscription status'),
    body('frequency')
      .optional()
      .isIn(['Daily', 'Weekly', 'Bi-weekly', 'Monthly']),
    body('customizations').optional().isObject(),
    handleValidationErrors
  ]
};

// Payment validation rules
const paymentValidations = {
  initialize: [
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('callback_url').optional().isURL().withMessage('Invalid callback URL'),
    handleValidationErrors
  ],
  
  verify: [
    param('reference').notEmpty().withMessage('Payment reference is required'),
    handleValidationErrors
  ]
};

// Query validation rules
const queryValidations = {
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    handleValidationErrors
  ],
  
  search: [
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search term must be between 1 and 100 characters'),
    handleValidationErrors
  ]
};

// Notification validation rules
const notificationValidations = {
  preferences: [
    body('orderUpdates').optional().isBoolean(),
    body('deliveryReminders').optional().isBoolean(),
    body('promotions').optional().isBoolean(),
    body('newMealPlans').optional().isBoolean(),
    body('achievements').optional().isBoolean(),
    handleValidationErrors
  ]
};

module.exports = {
  userValidations,
  chefValidations,
  mealPlanValidations,
  orderValidations,
  subscriptionValidations,
  paymentValidations,
  queryValidations,
  notificationValidations,
  handleValidationErrors,
  commonValidations
};