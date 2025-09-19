const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  verificationCode: {
    type: String,
    required: true,
    length: 6
  },
  purpose: {
    type: String,
    enum: ['chef_registration', 'customer_registration', 'password_reset', 'email_change'],
    default: 'chef_registration'
  },
  verified: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    index: { expireAfterSeconds: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  verifiedAt: {
    type: Date
  },
  ipAddress: String,
  userAgent: String
});

// Compound index for efficient queries
emailVerificationSchema.index({ email: 1, purpose: 1 });
emailVerificationSchema.index({ verificationCode: 1 });

// Generate a 6-digit verification code
emailVerificationSchema.statics.generateCode = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Clean up expired codes
emailVerificationSchema.statics.cleanupExpired = async function() {
  return this.deleteMany({ expiresAt: { $lt: new Date() } });
};

// Verify code method
emailVerificationSchema.methods.isValidCode = function(inputCode) {
  return this.verificationCode === inputCode && 
         !this.verified && 
         this.expiresAt > new Date() &&
         this.attempts < 5;
};

// Mark as verified
emailVerificationSchema.methods.markAsVerified = async function() {
  this.verified = true;
  this.verifiedAt = new Date();
  // Extend expiration to 24 hours for verified emails so they don't get auto-deleted
  this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return this.save();
};

// Increment attempts
emailVerificationSchema.methods.incrementAttempts = async function() {
  this.attempts += 1;
  return this.save();
};

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);