// Test script for debugging driver tracking issues
// Run this with: node test-tracking-debug.js <orderId>

const axios = require("axios");

const API_BASE_URL = "http://localhost:5001"; // Adjust if your backend runs on a different port

async function debugDriverTracking(orderId) {
  try {
    console.log(`🔍 Debugging driver tracking for order: ${orderId}`);

    // Call the debug endpoint
    const response = await axios.get(
      `${API_BASE_URL}/api/debug-tracking/debug-tracking/${orderId}`
    );

    console.log("\n📊 Debug Results:");
    console.log("==================");
    console.log(JSON.stringify(response.data, null, 2));

    const data = response.data.data;

    // Analysis
    console.log("\n🔍 Analysis:");
    console.log("============");

    if (!data.orderExists) {
      console.log("❌ Order does not exist");
      return;
    }

    if (!data.assignmentExists) {
      console.log("❌ No driver assignment found for this order");
      return;
    }

    if (!data.driverExists) {
      console.log("❌ No driver assigned to this order");
      return;
    }

    console.log("✅ Order exists");
    console.log("✅ Driver assignment exists");
    console.log("✅ Driver exists");

    if (data.driverInfo.hasCoordinates) {
      console.log("✅ Driver has location coordinates");
      console.log(`📍 Driver location: [${data.driverInfo.coordinatesData}]`);
    } else {
      console.log("❌ Driver has NO location coordinates");
      console.log("💡 This is why the map is not showing driver location!");

      // Suggest setting a mock location for testing
      console.log("\n🛠️ Suggested fix for testing:");
      console.log(
        `Run: curl -X POST ${API_BASE_URL}/api/debug-tracking/debug-set-driver-location/${orderId} \\`
      );
      console.log(`     -H "Content-Type: application/json" \\`);
      console.log(`     -d '{"latitude": -15.4094, "longitude": 28.2871}'`);
    }
  } catch (error) {
    console.error(
      "❌ Error debugging driver tracking:",
      error.response?.data || error.message
    );
  }
}

// Get orderId from command line arguments
const orderId = process.argv[2];

if (!orderId) {
  console.log("Usage: node test-tracking-debug.js <orderId>");
  console.log("Example: node test-tracking-debug.js 507f1f77bcf86cd799439011");
  process.exit(1);
}

debugDriverTracking(orderId);
