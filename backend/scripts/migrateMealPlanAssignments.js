const mongoose = require('mongoose');
const MealPlan = require('../models/MealPlan');
const MealPlanAssignment = require('../models/MealPlanAssignment');

// Day mapping
const DAY_MAP = {
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6,
  'Sunday': 7
};

async function migrateMealPlanAssignments() {
  try {
    console.log('🔄 Starting meal plan assignment migration...');
    
    // Find all meal plans with weeklyMeals data
    const mealPlans = await MealPlan.find({
      weeklyMeals: { $exists: true, $ne: null }
    });
    
    console.log(`📊 Found ${mealPlans.length} meal plans with weekly meals data`);
    
    for (const mealPlan of mealPlans) {
      console.log(`\n🍽️ Processing meal plan: ${mealPlan.planName} (${mealPlan._id})`);
      
      // Check if assignments already exist
      const existingAssignments = await MealPlanAssignment.countDocuments({
        mealPlanId: mealPlan._id
      });
      
      if (existingAssignments > 0) {
        console.log(`⚠️ Skipping - ${existingAssignments} assignments already exist`);
        continue;
      }
      
      let assignmentCount = 0;
      
      // Process weekly meals
      for (const [weekKey, weekData] of Object.entries(mealPlan.weeklyMeals)) {
        const weekNumber = parseInt(weekKey.replace('week', '')) || 1;
        console.log(`📅 Processing ${weekKey} (week ${weekNumber})`);
        
        for (const [dayName, dayData] of Object.entries(weekData)) {
          const dayOfWeek = DAY_MAP[dayName];
          
          if (!dayOfWeek) {
            console.log(`⚠️ Skipping unknown day: ${dayName}`);
            continue;
          }
          
          for (const [mealTime, mealData] of Object.entries(dayData)) {
            if (!['breakfast', 'lunch', 'dinner'].includes(mealTime)) {
              continue; // Skip non-meal fields like 'remark'
            }
            
            if (mealData && mealData.title) {
              try {
                // Create MealPlanAssignment record
                const assignment = new MealPlanAssignment({
                  mealPlanId: mealPlan._id,
                  mealIds: [], // Empty for now - could be populated later
                  customTitle: mealData.title,
                  customDescription: mealData.description || '',
                  imageUrl: mealData.imageUrl || '',
                  weekNumber: weekNumber,
                  dayOfWeek: dayOfWeek,
                  mealTime: mealTime,
                  notes: mealData.remark || '',
                  assignedBy: 'migration'
                });
                
                await assignment.save();
                assignmentCount++;
                
                console.log(`✅ Created: Week ${weekNumber}, ${dayName} ${mealTime} - ${mealData.title}`);
                
              } catch (error) {
                console.error(`❌ Failed to create assignment for ${dayName} ${mealTime}:`, error.message);
              }
            }
          }
        }
      }
      
      console.log(`🎉 Created ${assignmentCount} assignments for ${mealPlan.planName}`);
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Connect to MongoDB and run migration
async function runMigration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/choma-app');
    console.log('📱 Connected to MongoDB');
    
    await migrateMealPlanAssignments();
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📱 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  runMigration().then(() => {
    console.log('🏁 Migration script finished');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = { migrateMealPlanAssignments };