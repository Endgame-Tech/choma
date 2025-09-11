/**
 * Test script to simulate how the frontend meal schedule generation works
 */

// Simulate the frontend logic
function generateTodaysSchedule(assignment) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Always show all three meal types for the day
  const defaultMealTypes = ['breakfast', 'lunch', 'dinner'];
  
  // Get meals from backend if available
  const backendMeals = assignment.todaysMeals || [];
  
  // Create a map of backend meals by meal type for easy lookup
  const backendMealsByType = {};
  backendMeals.forEach(meal => {
    const mealType = meal.mealType || 'breakfast';
    backendMealsByType[mealType] = meal;
  });

  // Generate complete schedule by merging backend data with defaults
  const completeSchedule = defaultMealTypes.map(mealType => {
    const backendMeal = backendMealsByType[mealType];
    
    if (backendMeal) {
      // Use backend meal data if it exists
      return {
        ...backendMeal,
        mealType,
        status: backendMeal.status || 'scheduled',
        deliveryDate: backendMeal.deliveryDate || todayStr,
        isScheduled: true,
        hasBackendData: true
      };
    } else {
      // Use default meal data if no backend data exists
      return {
        mealType,
        name: `${assignment.mealPlanId.planName} - ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`,
        deliveryDate: todayStr,
        status: 'scheduled',
        isScheduled: true,
        hasBackendData: false
      };
    }
  });

  return completeSchedule;
}

// Test scenarios
console.log('🧪 Testing meal schedule generation...\n');

// Scenario 1: No backend meals (initial state)
console.log('📋 Scenario 1: No backend meals');
const assignment1 = {
  _id: 'test123',
  mealPlanId: { planName: 'Healthy Plan' },
  todaysMeals: []
};
const schedule1 = generateTodaysSchedule(assignment1);
console.log('Meals generated:', schedule1.length);
schedule1.forEach((meal, i) => {
  console.log(`  ${i + 1}. ${meal.mealType} - Status: ${meal.status} - HasBackend: ${meal.hasBackendData}`);
});

console.log('\n📋 Scenario 2: One backend meal (breakfast in progress)');
const assignment2 = {
  _id: 'test123',
  mealPlanId: { planName: 'Healthy Plan' },
  todaysMeals: [
    {
      mealType: 'breakfast',
      name: 'Healthy Plan - Breakfast',
      status: 'in_progress',
      deliveryDate: '2025-09-11'
    }
  ]
};
const schedule2 = generateTodaysSchedule(assignment2);
console.log('Meals generated:', schedule2.length);
schedule2.forEach((meal, i) => {
  console.log(`  ${i + 1}. ${meal.mealType} - Status: ${meal.status} - HasBackend: ${meal.hasBackendData}`);
});

console.log('\n📋 Scenario 3: Multiple backend meals');
const assignment3 = {
  _id: 'test123',
  mealPlanId: { planName: 'Healthy Plan' },
  todaysMeals: [
    {
      mealType: 'breakfast',
      name: 'Healthy Plan - Breakfast',
      status: 'completed',
      deliveryDate: '2025-09-11'
    },
    {
      mealType: 'lunch',
      name: 'Healthy Plan - Lunch',
      status: 'in_progress',
      deliveryDate: '2025-09-11'
    }
  ]
};
const schedule3 = generateTodaysSchedule(assignment3);
console.log('Meals generated:', schedule3.length);
schedule3.forEach((meal, i) => {
  console.log(`  ${i + 1}. ${meal.mealType} - Status: ${meal.status} - HasBackend: ${meal.hasBackendData}`);
});

console.log('\n✅ All scenarios should show 3 meals (breakfast, lunch, dinner)');