const ChefEarning = require('../models/ChefEarning');
const Chef = require('../models/Chef');
const NotificationService = require('./notificationService');
const emailService = require('./emailService');

class ChefPayoutService {
  
  /**
   * Process weekly payouts for all chefs
   * This function should be called every Friday
   */
  static async processWeeklyPayouts() {
    try {
      const currentDate = new Date();
      const dayOfWeek = currentDate.getDay();
      
      // Check if today is Friday (5)
      if (dayOfWeek !== 5) {
        console.log(`⚠️ Payout service called on ${currentDate.toDateString()}, but today is not Friday. Skipping payout.`);
        return {
          success: false,
          message: 'Payouts are only processed on Fridays',
          processedChefs: 0,
          totalAmount: 0
        };
      }
      
      console.log(`💰 Starting weekly chef payout process for ${currentDate.toDateString()}`);
      
      // Get the week ending on this Friday
      const weekEnd = new Date(currentDate);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekStart = ChefEarning.getWeekStart(weekEnd);
      
      // Find all pending earnings for this week
      const pendingEarnings = await ChefEarning.find({
        status: 'pending',
        weekStartDate: { $gte: weekStart },
        weekEndDate: { $lte: weekEnd }
      }).populate('chef', 'fullName email bankDetails');
      
      if (pendingEarnings.length === 0) {
        console.log('✅ No pending earnings found for this week');
        return {
          success: true,
          message: 'No pending earnings to process',
          processedChefs: 0,
          totalAmount: 0
        };
      }
      
      // Group earnings by chef
      const chefEarnings = {};
      let totalPayoutAmount = 0;
      
      pendingEarnings.forEach(earning => {
        const chefId = earning.chef._id.toString();
        if (!chefEarnings[chefId]) {
          chefEarnings[chefId] = {
            chef: earning.chef,
            earnings: [],
            totalAmount: 0,
            orderCount: 0
          };
        }
        chefEarnings[chefId].earnings.push(earning);
        chefEarnings[chefId].totalAmount += earning.cookingFee;
        chefEarnings[chefId].orderCount += 1;
        totalPayoutAmount += earning.cookingFee;
      });
      
      console.log(`📊 Processing payouts for ${Object.keys(chefEarnings).length} chefs, total amount: ₦${totalPayoutAmount}`);
      
      // Process each chef's payout
      let processedChefs = 0;
      const payoutResults = [];
      
      for (const chefId in chefEarnings) {
        const chefData = chefEarnings[chefId];
        
        try {
          // In a real implementation, you would integrate with bank API here
          // For now, we'll simulate the payout process
          const payoutResult = await this.processChefPayout(chefData, currentDate);
          
          if (payoutResult.success) {
            // Update all earnings to 'paid' status
            await ChefEarning.updateMany(
              { _id: { $in: chefData.earnings.map(e => e._id) } },
              {
                status: 'paid',
                payoutDate: currentDate,
                payoutReference: payoutResult.reference
              }
            );
            
            // Send notification to chef
            await this.sendPayoutNotification(chefData.chef, chefData.totalAmount, payoutResult.reference);
            
            processedChefs++;
            payoutResults.push({
              chefId,
              chefName: chefData.chef.fullName,
              amount: chefData.totalAmount,
              orderCount: chefData.orderCount,
              success: true,
              reference: payoutResult.reference
            });
            
            console.log(`✅ Paid ${chefData.chef.fullName}: ₦${chefData.totalAmount} for ${chefData.orderCount} orders`);
          } else {
            payoutResults.push({
              chefId,
              chefName: chefData.chef.fullName,
              amount: chefData.totalAmount,
              orderCount: chefData.orderCount,
              success: false,
              error: payoutResult.error
            });
            
            console.error(`❌ Failed to pay ${chefData.chef.fullName}: ${payoutResult.error}`);
          }
        } catch (error) {
          console.error(`❌ Error processing payout for ${chefData.chef.fullName}:`, error);
          payoutResults.push({
            chefId,
            chefName: chefData.chef.fullName,
            amount: chefData.totalAmount,
            orderCount: chefData.orderCount,
            success: false,
            error: error.message
          });
        }
      }
      
      console.log(`💰 Weekly payout completed: ${processedChefs}/${Object.keys(chefEarnings).length} chefs paid successfully`);
      
      return {
        success: true,
        message: 'Weekly payout process completed',
        processedChefs,
        totalChefs: Object.keys(chefEarnings).length,
        totalAmount: totalPayoutAmount,
        weekStart,
        weekEnd,
        results: payoutResults
      };
      
    } catch (error) {
      console.error('❌ Weekly payout process error:', error);
      throw error;
    }
  }
  
  /**
   * Process individual chef payout
   * In production, this would integrate with bank transfer API
   */
  static async processChefPayout(chefData, payoutDate) {
    try {
      const { chef, totalAmount, orderCount } = chefData;
      
      // Validate chef has bank details
      if (!chef.bankDetails || !chef.bankDetails.accountNumber || !chef.bankDetails.bankName) {
        return {
          success: false,
          error: 'Chef bank details not complete'
        };
      }
      
      // Generate payout reference
      const reference = `CHOMA_PAYOUT_${Date.now()}_${chef._id.toString().slice(-6).toUpperCase()}`;
      
      // TODO: Integrate with actual bank transfer API (e.g., Paystack, Flutterwave)
      // For now, we'll simulate a successful transfer
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate 95% success rate (for testing)
      const isSuccessful = Math.random() > 0.05;
      
      if (isSuccessful) {
        console.log(`💳 Simulated bank transfer: ₦${totalAmount} to ${chef.bankDetails.accountNumber} (${chef.bankDetails.bankName})`);
        return {
          success: true,
          reference,
          amount: totalAmount,
          bankAccount: `${chef.bankDetails.accountNumber} - ${chef.bankDetails.bankName}`
        };
      } else {
        return {
          success: false,
          error: 'Bank transfer failed - please try again'
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Send payout notification to chef
   */
  static async sendPayoutNotification(chef, amount, reference) {
    try {
      // Send push notification
      await NotificationService.createNotification({
        userId: chef._id,
        title: '💰 Weekly Payout Processed!',
        message: `Your weekly earnings of ₦${amount.toLocaleString()} have been transferred to your bank account.`,
        type: 'payout',
        data: {
          amount,
          reference,
          payoutDate: new Date().toISOString()
        },
        priority: 'high'
      });
      
      // Send email notification
      const emailData = {
        to: chef.email,
        subject: 'Weekly Payout - Choma',
        template: 'chef-payout',
        data: {
          chefName: chef.fullName,
          amount: amount.toLocaleString(),
          reference,
          payoutDate: new Date().toLocaleDateString('en-NG'),
          bankAccount: chef.bankDetails?.accountNumber ? 
            `****${chef.bankDetails.accountNumber.slice(-4)}` : 'Your account'
        }
      };
      
      await emailService.sendEmail(emailData);
      
    } catch (error) {
      console.warn('⚠️ Failed to send payout notification:', error.message);
    }
  }
  
  /**
   * Get payout summary for a specific week
   */
  static async getWeeklyPayoutSummary(weekStart, weekEnd) {
    try {
      const earnings = await ChefEarning.find({
        weekStartDate: { $gte: weekStart },
        weekEndDate: { $lte: weekEnd }
      }).populate('chef', 'fullName email');
      
      const summary = {
        totalChefs: new Set(earnings.map(e => e.chef._id.toString())).size,
        totalOrders: earnings.length,
        totalAmount: earnings.reduce((sum, e) => sum + e.cookingFee, 0),
        paidAmount: earnings.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.cookingFee, 0),
        pendingAmount: earnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.cookingFee, 0),
        statusBreakdown: {
          pending: earnings.filter(e => e.status === 'pending').length,
          paid: earnings.filter(e => e.status === 'paid').length,
          cancelled: earnings.filter(e => e.status === 'cancelled').length
        }
      };
      
      return summary;
    } catch (error) {
      console.error('Error getting payout summary:', error);
      throw error;
    }
  }
}

module.exports = ChefPayoutService;