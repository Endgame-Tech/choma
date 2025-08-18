require('dotenv').config();
const mongoose = require('mongoose');
const MealPlan = require('../models/MealPlan');
const DailyMeal = require('../models/DailyMeal');
const connectDB = require('../config/db');

const sampleMealPlans = [
  {
    planName: 'FitFuel',
    description: 'High-protein meals for fitness enthusiasts. Perfect for those looking to build muscle and maintain an active lifestyle.',
    targetAudience: 'Fitness',
    basePrice: 15000,
    mealsPerWeek: 21,
    isActive: true,
    sortOrder: 1,
    planFeatures: ['High Protein', 'Organic', 'Gluten-Free', 'Nutrient Dense'],
    planImage: 'fitfuel.jpg',
    galleryImages: ['fitfuel1.jpg', 'fitfuel2.jpg', 'fitfuel3.jpg'],
    nutritionInfo: {
      calories: 450,
      protein: 35,
      carbs: 40,
      fat: 15,
      fiber: 8
    }
  },
  {
    planName: 'Recharge',
    description: 'Quick, nutritious meals for busy professionals. Balanced nutrition to keep you energized throughout your workday.',
    targetAudience: 'Professional',
    basePrice: 12000,
    mealsPerWeek: 14,
    isActive: true,
    sortOrder: 2,
    planFeatures: ['Quick Prep', 'Balanced Nutrition', 'Office-Friendly', 'Energy Boosting'],
    planImage: 'recharge.jpg',
    galleryImages: ['recharge1.jpg', 'recharge2.jpg'],
    nutritionInfo: {
      calories: 400,
      protein: 25,
      carbs: 45,
      fat: 18,
      fiber: 6
    }
  },
  {
    planName: 'HealthyFam',
    description: 'Family-friendly meals that everyone will love. Nutritious, delicious, and perfect for sharing with your loved ones.',
    targetAudience: 'Family',
    basePrice: 20000,
    mealsPerWeek: 28,
    isActive: true,
    sortOrder: 3,
    planFeatures: ['Family Portions', 'Kid-Friendly', 'Nutritious', 'Variety'],
    planImage: 'healthyfam.jpg',
    galleryImages: ['healthyfam1.jpg', 'healthyfam2.jpg', 'healthyfam3.jpg'],
    nutritionInfo: {
      calories: 380,
      protein: 22,
      carbs: 48,
      fat: 16,
      fiber: 7
    }
  },
  {
    planName: 'Wellness Hub',
    description: 'Holistic wellness meals designed to nourish your body and mind. Focus on natural, organic ingredients.',
    targetAudience: 'Wellness',
    basePrice: 18000,
    mealsPerWeek: 21,
    isActive: true,
    sortOrder: 4,
    planFeatures: ['Organic', 'Anti-inflammatory', 'Detox', 'Mindful Eating'],
    planImage: 'wellness-hub.jpg',
    galleryImages: ['wellness1.jpg', 'wellness2.jpg'],
    nutritionInfo: {
      calories: 350,
      protein: 20,
      carbs: 42,
      fat: 14,
      fiber: 10
    }
  },
  {
    planName: 'WellnessPack',
    description: 'Complete wellness package with superfoods and nutrient-rich meals. Perfect for health-conscious individuals.',
    targetAudience: 'Wellness',
    basePrice: 22000,
    mealsPerWeek: 21,
    isActive: true,
    sortOrder: 5,
    planFeatures: ['Superfoods', 'Plant-Based Options', 'Antioxidant Rich', 'Premium Ingredients'],
    planImage: 'wellnesspack.jpg',
    galleryImages: ['wellnesspack1.jpg', 'wellnesspack2.jpg'],
    nutritionInfo: {
      calories: 420,
      protein: 28,
      carbs: 38,
      fat: 16,
      fiber: 12
    }
  },
  {
    planName: 'Central Kitchen Special',
    description: 'Our chef\'s special selection featuring the best of Nigerian and international cuisines.',
    targetAudience: 'Professional',
    basePrice: 16000,
    mealsPerWeek: 18,
    isActive: true,
    sortOrder: 6,
    planFeatures: ['Chef Special', 'Cultural Fusion', 'Premium Quality', 'Seasonal Ingredients'],
    planImage: 'central-kitchen.jpg',
    galleryImages: ['central1.jpg', 'central2.jpg', 'central3.jpg'],
    nutritionInfo: {
      calories: 430,
      protein: 26,
      carbs: 44,
      fat: 17,
      fiber: 8
    }
  }
];

const sampleDailyMeals = [
  {
    mealId: 'DM-001',
    mealName: 'Grilled Chicken Quinoa Bowl',
    mealType: 'Lunch',
    description: 'Tender grilled chicken breast served over fluffy quinoa with roasted vegetables',
    ingredients: 'Chicken breast, quinoa, bell peppers, broccoli, olive oil, herbs',
    nutrition: {
      calories: 450,
      protein: 35,
      carbs: 40,
      fat: 15
    },
    preparationTime: 25,
    mealImage: 'grilled-chicken-quinoa.jpg',
    allergens: ['None'],
    isActive: true,
    chefNotes: 'Marinated in herbs for 2 hours for maximum flavor'
  },
  {
    mealId: 'DM-002',
    mealName: 'Nigerian Jollof Rice',
    mealType: 'Dinner',
    description: 'Authentic Nigerian jollof rice with mixed vegetables and your choice of protein',
    ingredients: 'Rice, tomatoes, peppers, onions, spices, mixed vegetables',
    nutrition: {
      calories: 380,
      protein: 22,
      carbs: 48,
      fat: 16
    },
    preparationTime: 45,
    mealImage: 'jollof-rice.jpg',
    allergens: ['None'],
    isActive: true,
    chefNotes: 'Cooked with traditional Nigerian spices for authentic taste'
  },
  {
    mealId: 'DM-003',
    mealName: 'Protein Power Smoothie Bowl',
    mealType: 'Breakfast',
    description: 'Energizing smoothie bowl topped with fresh fruits, nuts, and seeds',
    ingredients: 'Banana, berries, protein powder, almond milk, granola, chia seeds',
    nutrition: {
      calories: 320,
      protein: 25,
      carbs: 35,
      fat: 12
    },
    preparationTime: 10,
    mealImage: 'smoothie-bowl.jpg',
    allergens: ['Nuts'],
    isActive: true,
    chefNotes: 'Best served immediately after preparation'
  }
];

const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');
    
    // Connect to database
    await connectDB();
    console.log('Connected to MongoDB for seeding...');

    // Drop collections to avoid any duplicate key issues
    try {
      await mongoose.connection.db.dropCollection('mealplans');
      console.log('Dropped mealplans collection');
    } catch (error) {
      console.log('mealplans collection does not exist, continuing...');
    }

    try {
      await mongoose.connection.db.dropCollection('dailymeals');
      console.log('Dropped dailymeals collection');
    } catch (error) {
      console.log('dailymeals collection does not exist, continuing...');
    }

    // Create daily meals first
    console.log('Creating daily meals...');
    const createdMeals = await DailyMeal.create(sampleDailyMeals);
    console.log(`Created ${createdMeals.length} daily meals...`);

    // Add sample meals to meal plans
    const mealPlansWithSamples = sampleMealPlans.map(plan => ({
      ...plan,
      sampleMeals: createdMeals.slice(0, 2).map(meal => meal._id) // Add first 2 meals to each plan
    }));

    // Create meal plans
    console.log('Creating meal plans...');
    const createdPlans = await MealPlan.create(mealPlansWithSamples);
    console.log(`Created ${createdPlans.length} meal plans...`);

    console.log('Database seeded successfully! 🌱');
    console.log('Sample data created:');
    console.log(`- ${createdMeals.length} Daily Meals`);
    console.log(`- ${createdPlans.length} Meal Plans`);
    
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      console.error('Error closing connection:', closeError);
    }
    process.exit(1);
  }
};

// Run seeder
seedDatabase();
