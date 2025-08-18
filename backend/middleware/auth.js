const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable not set');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false,
      message: 'No token provided' 
    });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('🔐 Auth middleware - decoded token:', { 
      id: decoded.id, 
      email: decoded.email, 
      endpoint: req.path 
    });
    
    // Fetch user from DB to check status
    const customer = await Customer.findById(decoded.id);
    if (!customer) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    if (customer.status === 'Deleted') {
      return res.status(403).json({ 
        success: false,
        message: 'This account has been deleted and cannot be accessed.' 
      });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.log('❌ Auth error:', err.message);
    res.status(401).json({ 
      success: false,
      message: 'Invalid token' 
    });
  }
};
