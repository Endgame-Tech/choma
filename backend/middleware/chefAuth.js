const jwt = require('jsonwebtoken');
const Chef = require('../models/Chef');

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable not set');
  process.exit(1);
}

const chefAuth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find chef
        const chef = await Chef.findById(decoded.chefId).select('-password');
        if (!chef) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Chef not found.'
            });
        }

        // Check if chef account is active
        if (chef.status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: `Account is ${chef.status.toLowerCase()}. Please contact admin.`
            });
        }

        // Add chef to request object
        req.chef = {
            chefId: chef._id,
            email: chef.email,
            fullName: chef.fullName,
            specialties: chef.specialties,
            availability: chef.availability
        };

        next();
    } catch (error) {
        console.error('Chef auth middleware error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error during authentication.'
        });
    }
};

module.exports = chefAuth;