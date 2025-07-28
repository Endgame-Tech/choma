// src/services/airtable.js
import Airtable from 'airtable';

// Configure Airtable with Personal Access Token
const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN, // Using PAT instead of API key
}).base(process.env.AIRTABLE_BASE_ID);

// Table names for choma
const TABLES = {
  USERS: 'Users',
  SUBSCRIPTIONS: 'Subscriptions', 
  ORDERS: 'Orders',
  MEAL_BUNDLES: 'MealBundles',
  CUSTOMIZATIONS: 'Customizations',
};

// User operations
export const createUser = async (userData) => {
  try {
    const record = await airtable(TABLES.USERS).create([
      {
        fields: {
          email: userData.email,
          name: userData.name,
          phone: userData.phone,
          address: userData.address,
          dietary_preferences: userData.dietaryPreferences,
          allergies: userData.allergies,
          created_at: new Date().toISOString(),
          push_token: userData.pushToken,
        },
      },
    ]);
    return { success: true, data: record[0] };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
};

export const getUserByEmail = async (email) => {
  try {
    const records = await airtable(TABLES.USERS)
      .select({
        filterByFormula: `{email} = "${email}"`,
        maxRecords: 1,
      })
      .firstPage();
    
    return records.length > 0 ? { success: true, data: records[0] } : { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { success: false, error: error.message };
  }
};

export const updateUser = async (userId, updates) => {
  try {
    const record = await airtable(TABLES.USERS).update([
      {
        id: userId,
        fields: {
          ...updates,
          updated_at: new Date().toISOString(),
        },
      },
    ]);
    return { success: true, data: record[0] };
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, error: error.message };
  }
};

// Subscription operations
export const createSubscription = async (subscriptionData) => {
  try {
    const record = await airtable(TABLES.SUBSCRIPTIONS).create([
      {
        fields: {
          user_id: subscriptionData.userId,
          bundle_type: subscriptionData.bundleType,
          frequency: subscriptionData.frequency, // daily, twice_daily, thrice_daily
          duration: subscriptionData.duration, // weekly, monthly
          total_price: subscriptionData.totalPrice,
          status: 'active',
          start_date: subscriptionData.startDate,
          next_delivery: subscriptionData.nextDelivery,
          delivery_address: subscriptionData.deliveryAddress,
          customizations: JSON.stringify(subscriptionData.customizations || []),
          created_at: new Date().toISOString(),
        },
      },
    ]);
    return { success: true, data: record[0] };
  } catch (error) {
    console.error('Error creating subscription:', error);
    return { success: false, error: error.message };
  }
};

export const getUserSubscriptions = async (userId) => {
  try {
    const records = await airtable(TABLES.SUBSCRIPTIONS)
      .select({
        filterByFormula: `{user_id} = "${userId}"`,
        sort: [{ field: 'created_at', direction: 'desc' }],
      })
      .all();
    
    return { success: true, data: records };
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return { success: false, error: error.message };
  }
};

export const updateSubscriptionStatus = async (subscriptionId, status) => {
  try {
    const record = await airtable(TABLES.SUBSCRIPTIONS).update([
      {
        id: subscriptionId,
        fields: {
          status: status, // active, paused, cancelled
          updated_at: new Date().toISOString(),
        },
      },
    ]);
    return { success: true, data: record[0] };
  } catch (error) {
    console.error('Error updating subscription:', error);
    return { success: false, error: error.message };
  }
};

// Order operations
export const createOrder = async (orderData) => {
  try {
    const record = await airtable(TABLES.ORDERS).create([
      {
        fields: {
          user_id: orderData.userId,
          subscription_id: orderData.subscriptionId,
          order_number: generateOrderNumber(),
          items: JSON.stringify(orderData.items),
          total_amount: orderData.totalAmount,
          status: 'confirmed', // confirmed, preparing, out_for_delivery, delivered, cancelled
          delivery_address: orderData.deliveryAddress,
          estimated_delivery: orderData.estimatedDelivery,
          payment_status: 'paid',
          payment_reference: orderData.paymentReference,
          created_at: new Date().toISOString(),
        },
      },
    ]);
    return { success: true, data: record[0] };
  } catch (error) {
    console.error('Error creating order:', error);
    return { success: false, error: error.message };
  }
};

export const getUserOrders = async (userId) => {
  try {
    const records = await airtable(TABLES.ORDERS)
      .select({
        filterByFormula: `{user_id} = "${userId}"`,
        sort: [{ field: 'created_at', direction: 'desc' }],
      })
      .all();
    
    return { success: true, data: records };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return { success: false, error: error.message };
  }
};

export const updateOrderStatus = async (orderId, status) => {
  try {
    const record = await airtable(TABLES.ORDERS).update([
      {
        id: orderId,
        fields: {
          status: status,
          updated_at: new Date().toISOString(),
        },
      },
    ]);
    return { success: true, data: record[0] };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: error.message };
  }
};

// Meal bundle operations
export const getMealBundles = async () => {
  try {
    const records = await airtable(TABLES.MEAL_BUNDLES)
      .select({
        filterByFormula: '{is_active} = TRUE()',
        sort: [{ field: 'sort_order', direction: 'asc' }],
      })
      .all();
    
    return { success: true, data: records };
  } catch (error) {
    console.error('Error fetching meal bundles:', error);
    return { success: false, error: error.message };
  }
};

export const getBundleById = async (bundleId) => {
  try {
    const record = await airtable(TABLES.MEAL_BUNDLES).find(bundleId);
    return { success: true, data: record };
  } catch (error) {
    console.error('Error fetching bundle:', error);
    return { success: false, error: error.message };
  }
};

// Analytics and reporting
export const getAnalytics = async () => {
  try {
    // Get total users
    const usersResponse = await airtable(TABLES.USERS).select().all();
    const totalUsers = usersResponse.length;

    // Get active subscriptions
    const activeSubscriptions = await airtable(TABLES.SUBSCRIPTIONS)
      .select({
        filterByFormula: '{status} = "active"',
      })
      .all();

    // Get total orders
    const ordersResponse = await airtable(TABLES.ORDERS).select().all();
    const totalOrders = ordersResponse.length;

    // Calculate total revenue
    const totalRevenue = ordersResponse.reduce((sum, order) => {
      return sum + (order.fields.total_amount || 0);
    }, 0);

    return {
      success: true,
      data: {
        totalUsers,
        activeSubscriptions: activeSubscriptions.length,
        totalOrders,
        totalRevenue,
      },
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return { success: false, error: error.message };
  }
};

// Utility functions
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `MM${timestamp}${random}`;
};

// Export everything
export {
  airtable,
  TABLES,
};