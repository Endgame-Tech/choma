#!/usr/bin/env node

/**
 * Weekly Chef Payout Script
 * 
 * This script processes weekly payouts for all chefs who have completed orders.
 * It should be run every Friday via cron job.
 * 
 * Usage:
 *   node scripts/processWeeklyPayouts.js
 * 
 * Cron job example (every Friday at 2 PM):
 *   0 14 * * 5 cd /path/to/choma/backend && node scripts/processWeeklyPayouts.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const ChefPayoutService = require('../services/chefPayoutService');

async function main() {
  try {
    console.log('🚀 Starting weekly chef payout process...');
    console.log(`📅 Date: ${new Date().toDateString()}`);
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');
    
    // Process weekly payouts
    const result = await ChefPayoutService.processWeeklyPayouts();
    
    if (result.success) {
      console.log('\n📊 PAYOUT SUMMARY:');
      console.log(`✅ Processed ${result.processedChefs}/${result.totalChefs} chefs`);
      console.log(`💰 Total amount: ₦${result.totalAmount?.toLocaleString() || 0}`);
      
      if (result.results && result.results.length > 0) {
        console.log('\n📋 INDIVIDUAL RESULTS:');
        result.results.forEach(chef => {
          const status = chef.success ? '✅' : '❌';
          console.log(`${status} ${chef.chefName}: ₦${chef.amount?.toLocaleString() || 0} (${chef.orderCount} orders)`);
          if (!chef.success && chef.error) {
            console.log(`   Error: ${chef.error}`);
          }
        });
      }
    } else {
      console.log(`⚠️ ${result.message}`);
    }
    
  } catch (error) {
    console.error('❌ Weekly payout process failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n✅ Payout process completed. Database connection closed.');
    process.exit(0);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Run the script
main();