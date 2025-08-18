const EmailVerification = require('../models/EmailVerification');
const Chef = require('../models/Chef');
const emailService = require('../services/emailService');

/**
 * Send verification code to email
 * POST /api/auth/send-verification
 */
exports.sendVerificationCode = async (req, res) => {
  try {
    const { email, purpose = 'chef_registration' } = req.body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check if email is already registered as a chef
    if (purpose === 'chef_registration') {
      const existingChef = await Chef.findOne({ email: email.toLowerCase() });
      if (existingChef) {
        return res.status(400).json({
          success: false,
          message: 'This email is already registered. Please use a different email or try logging in.'
        });
      }
    }

    // Check for recent verification attempts (rate limiting)
    const recentVerification = await EmailVerification.findOne({
      email: email.toLowerCase(),
      purpose,
      createdAt: { $gt: new Date(Date.now() - 2 * 60 * 1000) } // 2 minutes
    });

    if (recentVerification) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 2 minutes before requesting another verification code'
      });
    }

    // Generate verification code
    const verificationCode = EmailVerification.generateCode();

    // Delete any existing unverified codes for this email
    await EmailVerification.deleteMany({
      email: email.toLowerCase(),
      purpose,
      verified: false
    });

    // Create new verification record
    const verification = new EmailVerification({
      email: email.toLowerCase(),
      verificationCode,
      purpose,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await verification.save();

    // Send verification email
    const emailSent = await emailService.sendVerificationEmail({
      email: email.toLowerCase(),
      verificationCode,
      purpose
    });

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'Verification code sent successfully',
      data: {
        email: email.toLowerCase(),
        expiresIn: 300 // 5 minutes in seconds
      }
    });

  } catch (error) {
    console.error('Send verification code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify email with code
 * POST /api/auth/verify-email
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { email, verificationCode, purpose = 'chef_registration' } = req.body;

    if (!email || !verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }

    if (verificationCode.length !== 6 || !/^\d{6}$/.test(verificationCode)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code must be 6 digits'
      });
    }

    // Find verification record
    const verification = await EmailVerification.findOne({
      email: email.toLowerCase(),
      purpose,
      verified: false
    }).sort({ createdAt: -1 }); // Get the most recent one

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'No verification code found for this email. Please request a new code.'
      });
    }

    // Check if code is valid
    if (!verification.isValidCode(verificationCode)) {
      // Increment attempts
      await verification.incrementAttempts();

      let message = 'Invalid verification code';
      
      if (verification.attempts >= 4) {
        message = 'Too many failed attempts. Please request a new verification code.';
      } else if (verification.expiresAt <= new Date()) {
        message = 'Verification code has expired. Please request a new code.';
      }

      return res.status(400).json({
        success: false,
        message,
        attemptsRemaining: Math.max(0, 5 - verification.attempts - 1)
      });
    }

    // Mark as verified
    await verification.markAsVerified();

    // Clean up any other unverified codes for this email
    await EmailVerification.deleteMany({
      email: email.toLowerCase(),
      purpose,
      verified: false,
      _id: { $ne: verification._id }
    });

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        email: email.toLowerCase(),
        verifiedAt: verification.verifiedAt,
        token: verification._id.toString() // Use this to continue registration
      }
    });

  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Resend verification code
 * POST /api/auth/resend-verification
 */
exports.resendVerificationCode = async (req, res) => {
  try {
    const { email, purpose = 'chef_registration' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if there's a recent unverified code
    const existingVerification = await EmailVerification.findOne({
      email: email.toLowerCase(),
      purpose,
      verified: false
    }).sort({ createdAt: -1 });

    if (!existingVerification) {
      return res.status(404).json({
        success: false,
        message: 'No pending verification found for this email'
      });
    }

    // Check if we can resend (at least 1 minute since last send)
    const timeSinceLastSend = Date.now() - existingVerification.createdAt.getTime();
    if (timeSinceLastSend < 60 * 1000) { // 1 minute
      return res.status(429).json({
        success: false,
        message: 'Please wait 1 minute before requesting a new code',
        retryAfter: Math.ceil((60 * 1000 - timeSinceLastSend) / 1000)
      });
    }

    // Generate new code and update existing record
    const newVerificationCode = EmailVerification.generateCode();
    existingVerification.verificationCode = newVerificationCode;
    existingVerification.attempts = 0;
    existingVerification.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    existingVerification.createdAt = new Date();

    await existingVerification.save();

    // Send new verification email
    const emailSent = await emailService.sendVerificationEmail({
      email: email.toLowerCase(),
      verificationCode: newVerificationCode,
      purpose
    });

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'New verification code sent successfully',
      data: {
        email: email.toLowerCase(),
        expiresIn: 300 // 5 minutes
      }
    });

  } catch (error) {
    console.error('Resend verification code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Check verification status
 * GET /api/auth/verification-status/:email
 */
exports.checkVerificationStatus = async (req, res) => {
  try {
    const { email } = req.params;
    const { purpose = 'chef_registration' } = req.query;

    const verification = await EmailVerification.findOne({
      email: email.toLowerCase(),
      purpose
    }).sort({ createdAt: -1 });

    if (!verification) {
      return res.json({
        success: true,
        data: {
          hasVerification: false,
          verified: false
        }
      });
    }

    res.json({
      success: true,
      data: {
        hasVerification: true,
        verified: verification.verified,
        expiresAt: verification.expiresAt,
        attempts: verification.attempts,
        canResend: !verification.verified && (Date.now() - verification.createdAt.getTime()) > 60 * 1000
      }
    });

  } catch (error) {
    console.error('Check verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check verification status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Cleanup expired verifications (can be called via cron job)
exports.cleanupExpiredVerifications = async (req, res) => {
  try {
    const result = await EmailVerification.cleanupExpired();
    
    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} expired verification codes`
    });

  } catch (error) {
    console.error('Cleanup expired verifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup expired verifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};