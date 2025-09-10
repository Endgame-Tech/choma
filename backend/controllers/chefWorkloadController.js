const Chef = require('../models/Chef');
const MealAssignment = require('../models/MealAssignment');
const RecurringSubscription = require('../models/RecurringSubscription');
const ChefReassignmentRequest = require('../models/ChefReassignmentRequest');
const mongoose = require('mongoose');

const chefWorkloadController = {
  /**
   * Get chef workload data for management dashboard
   */
  async getChefWorkloads(req, res) {
    try {
      const { timeframe = 'today', area = 'all', sort = 'workload' } = req.query;
      
      // Simplified approach: get basic chef data first
      const chefs = await Chef.find({ status: 'Active' }).select(
        'fullName email phone profileImage location maxDailyCapacity specializations'
      ).lean();
      
      // For each chef, get their workload data
      const chefWorkloads = await Promise.all(chefs.map(async (chef) => {
        try {
          // Get active assignments count
          const activeAssignments = await MealAssignment.countDocuments({
            assignedChef: chef._id,
            status: { $in: ['chef_assigned', 'preparing', 'ready', 'out_for_delivery'] }
          });
          
          // Get total assignments in timeframe
          const today = new Date();
          const startOfDay = new Date(today.setHours(0, 0, 0, 0));
          const endOfDay = new Date(today.setHours(23, 59, 59, 999));
          
          const totalAssignments = await MealAssignment.countDocuments({
            assignedChef: chef._id,
            scheduledDate: { $gte: startOfDay, $lte: endOfDay }
          });
          
          // Get completed assignments
          const completedAssignments = await MealAssignment.countDocuments({
            assignedChef: chef._id,
            status: 'delivered',
            scheduledDate: { $gte: startOfDay, $lte: endOfDay }
          });
          
          // Calculate basic metrics
          const maxCapacity = chef.maxDailyCapacity || 10;
          const workloadScore = Math.min(100, (activeAssignments / maxCapacity) * 100);
          const utilizationRate = totalAssignments > 0 ? (activeAssignments / totalAssignments) * 100 : 0;
          const onTimeDeliveryRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 100;
          const consistencyScore = Math.min(100, onTimeDeliveryRate + 20);
          
          // Determine status
          let status = 'available';
          if (activeAssignments >= maxCapacity * 1.2) {
            status = 'overloaded';
          } else if (activeAssignments >= maxCapacity * 0.8) {
            status = 'busy';
          }
          
          return {
            _id: chef._id,
            fullName: chef.fullName,
            email: chef.email,
            phone: chef.phone,
            profileImage: chef.profileImage,
            location: chef.location,
            activeAssignments,
            totalMealsAssigned: totalAssignments,
            totalMealsCompleted: completedAssignments,
            workloadScore: Math.round(workloadScore),
            utilizationRate: Math.round(utilizationRate),
            onTimeDeliveryRate: Math.round(onTimeDeliveryRate),
            consistencyScore: Math.round(consistencyScore),
            currentWeekMeals: totalAssignments,
            status,
            nextAvailableSlot: null,
            specializations: chef.specializations || []
          };
        } catch (error) {
          console.error(`Error processing chef ${chef._id}:`, error);
          return {
            _id: chef._id,
            fullName: chef.fullName,
            email: chef.email,
            phone: chef.phone,
            profileImage: chef.profileImage,
            location: chef.location,
            activeAssignments: 0,
            totalMealsAssigned: 0,
            totalMealsCompleted: 0,
            workloadScore: 0,
            utilizationRate: 0,
            onTimeDeliveryRate: 100,
            consistencyScore: 100,
            currentWeekMeals: 0,
            status: 'available',
            nextAvailableSlot: null,
            specializations: chef.specializations || []
          };
        }
      }));
      
      // Sort results
      const sortedChefs = chefWorkloads.sort((a, b) => {
        if (sort === 'rating') {
          return b.onTimeDeliveryRate - a.onTimeDeliveryRate;
        } else if (sort === 'efficiency') {
          return b.consistencyScore - a.consistencyScore;
        } else {
          return b.workloadScore - a.workloadScore;
        }
      });

      res.json({
        success: true,
        data: sortedChefs
      });

    } catch (error) {
      console.error('Error fetching chef workloads:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch chef workload data',
        error: error.message
      });
    }
  },

  /**
   * Get chef reassignment requests
   */
  async getReassignmentRequests(req, res) {
    try {
      const requests = await ChefReassignmentRequest.find({ status: 'pending' })
        .populate('subscriptionId', 'userId')
        .populate('currentChefId', 'fullName')
        .populate({
          path: 'subscriptionId',
          populate: {
            path: 'userId',
            model: 'Customer',
            select: 'fullName'
          }
        })
        .sort({ priority: 1, createdAt: 1 })
        .lean();

      const formattedRequests = requests.map(request => ({
        _id: request._id,
        subscriptionId: request.subscriptionId._id,
        customerName: request.subscriptionId?.userId?.fullName || 'Unknown Customer',
        currentChefName: request.currentChefId?.fullName || 'Unknown Chef',
        reason: request.reason,
        requestedAt: request.createdAt,
        status: request.status,
        priority: request.priority || 'normal'
      }));

      res.json({
        success: true,
        data: formattedRequests
      });

    } catch (error) {
      console.error('Error fetching reassignment requests:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reassignment requests',
        error: error.message
      });
    }
  },

  /**
   * Assign a chef to a subscription
   */
  async assignChef(req, res) {
    try {
      const { chefId, subscriptionId, assignedBy } = req.body;

      if (!chefId || !subscriptionId) {
        return res.status(400).json({
          success: false,
          message: 'Chef ID and Subscription ID are required'
        });
      }

      // Verify chef exists and is active
      const chef = await Chef.findOne({ _id: chefId, status: 'Active' });
      if (!chef) {
        return res.status(404).json({
          success: false,
          message: 'Chef not found or inactive'
        });
      }

      // Verify subscription exists
      const subscription = await RecurringSubscription.findById(subscriptionId);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      // Create or update meal assignments for this subscription
      // This is a simplified approach - you might want more complex logic
      const result = await MealAssignment.updateMany(
        { 
          subscriptionId: subscriptionId,
          status: { $in: ['scheduled', 'chef_assigned'] }
        },
        { 
          $set: { 
            assignedChef: chefId,
            status: 'chef_assigned',
            assignedAt: new Date(),
            assignedBy: assignedBy || 'admin'
          }
        }
      );

      res.json({
        success: true,
        message: `Chef assigned successfully. Updated ${result.modifiedCount} assignments.`,
        data: {
          chefId,
          subscriptionId,
          updatedAssignments: result.modifiedCount
        }
      });

    } catch (error) {
      console.error('Error assigning chef:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign chef',
        error: error.message
      });
    }
  },

  /**
   * Handle reassignment request (approve/reject)
   */
  async handleReassignmentRequest(req, res) {
    try {
      const { requestId, action } = req.params;
      const { newChefId, adminNotes } = req.body;

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be "approve" or "reject"'
        });
      }

      const request = await ChefReassignmentRequest.findById(requestId);
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Reassignment request not found'
        });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Request has already been processed'
        });
      }

      if (action === 'approve') {
        if (!newChefId) {
          return res.status(400).json({
            success: false,
            message: 'New chef ID is required for approval'
          });
        }

        // Verify new chef exists
        const newChef = await Chef.findOne({ _id: newChefId, status: 'Active' });
        if (!newChef) {
          return res.status(404).json({
            success: false,
            message: 'New chef not found or inactive'
          });
        }

        // Update the request
        request.status = 'approved';
        request.newChefId = newChefId;
        request.resolvedAt = new Date();
        request.adminNotes = adminNotes;

        // Update meal assignments
        await MealAssignment.updateMany(
          { 
            subscriptionId: request.subscriptionId,
            status: { $in: ['scheduled', 'chef_assigned', 'preparing'] }
          },
          { 
            $set: { 
              assignedChef: newChefId,
              status: 'chef_assigned',
              assignedAt: new Date()
            }
          }
        );
      } else {
        // Reject the request
        request.status = 'rejected';
        request.resolvedAt = new Date();
        request.adminNotes = adminNotes;
      }

      await request.save();

      res.json({
        success: true,
        message: `Reassignment request ${action}d successfully`,
        data: request
      });

    } catch (error) {
      console.error('Error handling reassignment request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process reassignment request',
        error: error.message
      });
    }
  }
};

module.exports = chefWorkloadController;