const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Initialize Nodemailer with Gmail SMTP
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
    
    // Logo URL - can be updated to use Cloudinary or other CDN
    this.logoUrl = process.env.CHOMA_LOGO_URL || 'https://via.placeholder.com/120x60/F7AE1A/FFFFFF?text=CHOMA';
  }

  /**
   * Send chef acceptance email
   * @param {Object} data - Email data
   * @param {string} data.chefName - Chef's full name
   * @param {string} data.chefEmail - Chef's email address
   * @returns {Promise<boolean>} - Success status
   */
  async sendChefAcceptanceEmail(data) {
    try {
      const { chefName, chefEmail } = data;

      const emailTemplate = this.generateChefAcceptanceTemplate(chefName);

      const mailOptions = {
        from: {
          name: 'Choma Team',
          address: process.env.GMAIL_USER
        },
        to: chefEmail,
        subject: 'Welcome to Choma - Your Chef Application Has Been Approved! 🎉',
        html: emailTemplate,
        text: this.generatePlainTextVersion(chefName)
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Chef acceptance email sent successfully to ${chefEmail}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to send chef acceptance email:', error);
      
      // Log specific Gmail SMTP errors
      if (error.response) {
        console.error('Gmail SMTP Error Response:', error.response);
      }
      
      return false;
    }
  }

  /**
   * Send chef rejection email
   * @param {Object} data - Email data
   * @param {string} data.chefName - Chef's full name
   * @param {string} data.chefEmail - Chef's email address
   * @param {string} data.reason - Rejection reason
   * @returns {Promise<boolean>} - Success status
   */
  async sendChefRejectionEmail(data) {
    try {
      const { chefName, chefEmail, reason } = data;

      const mailOptions = {
        from: {
          name: 'Choma Team',
          address: process.env.GMAIL_USER
        },
        to: chefEmail,
        subject: 'Update on Your Choma Chef Application',
        html: this.generateRejectionTemplate(chefName, reason),
        text: `Dear ${chefName}, Thank you for your interest in joining Choma as a chef. After careful review, we're unable to proceed with your application at this time. ${reason ? 'Reason: ' + reason : ''} We encourage you to reapply in the future. Best regards, The Choma Team`
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Chef rejection email sent successfully to ${chefEmail}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to send chef rejection email:', error);
      return false;
    }
  }

  /**
   * Generate HTML email template for chef acceptance
   * @param {string} chefName - Chef's name
   * @returns {string} - HTML template
   */
  generateChefAcceptanceTemplate(chefName) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Choma!</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8f9fa;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              margin-bottom: 10px;
            }
            .logo img {
              width: 120px;
              height: auto;
            }
            .logo-text {
              font-size: 32px;
              font-weight: bold;
              color: #F7AE1A;
              margin-top: 8px;
            }
            .welcome-badge {
              background: linear-gradient(135deg, #F7AE1A, #E89611);
              color: white;
              padding: 12px 24px;
              border-radius: 25px;
              display: inline-block;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .content {
              margin-bottom: 30px;
            }
            .content h1 {
              color: #652815;
              font-size: 28px;
              margin-bottom: 15px;
            }
            .content p {
              margin-bottom: 15px;
              color: #555;
            }
            .next-steps {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #F7AE1A;
              margin: 20px 0;
            }
            .next-steps h3 {
              color: #652815;
              margin-top: 0;
            }
            .next-steps ul {
              margin: 10px 0;
              padding-left: 20px;
            }
            .cta-button {
              display: inline-block;
              background: #652815;
              color: white;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 25px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #777;
              font-size: 14px;
            }
            .social-links {
              margin: 20px 0;
            }
            .social-links a {
              display: inline-block;
              margin: 0 10px;
              color: #F7AE1A;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">
                <img src="${this.logoUrl}" alt="Choma Logo" />
                <div class="logo-text">CHOMA</div>
              </div>
              <div class="welcome-badge">🎉 Application Approved!</div>
            </div>

            <div class="content">
              <h1>Welcome to the Choma Family, ${chefName}!</h1>
              
              <p>Congratulations! We're thrilled to inform you that your chef application has been <strong>approved</strong>. After careful review of your qualifications and experience, we're excited to have you join our community of talented chefs.</p>
              
              <p>At Choma, we're passionate about delivering authentic Nigerian cuisine and international flavors to food lovers across the region. Your skills and expertise will help us continue this mission while providing you with exciting opportunities to grow your culinary career.</p>

              <div class="next-steps">
                <h3>🚀 Next Steps:</h3>
                <ul>
                  <li><strong>Download the Chef App:</strong> Get started by downloading our chef app from the App Store or Google Play</li>
                  <li><strong>Complete Your Profile:</strong> Add your specialties, available hours, and kitchen preferences</li>
                  <li><strong>Kitchen Orientation:</strong> Our team will contact you within 24 hours to schedule your onboarding session</li>
                  <li><strong>Start Cooking:</strong> Begin receiving orders and start earning immediately after your orientation</li>
                </ul>
              </div>

              <p>Our chef success team will reach out to you within the next 24 hours with detailed onboarding information, including:</p>
              <ul>
                <li>Kitchen guidelines and safety protocols</li>
                <li>Order management system training</li>
                <li>Pricing and earnings structure</li>
                <li>Marketing support for your specialties</li>
              </ul>

              <a href="${process.env.CHEF_LOGIN_URL || 'http://localhost:3002/login'}" class="cta-button">Access Chef Dashboard</a>
            </div>

            <div class="footer">
              <p><strong>Need Help?</strong></p>
              <p>Contact our Chef Support Team:</p>
              <p>📧 chefs@getchoma.com | 📱 +234 (0) 123 456 7890</p>
              
              <div class="social-links">
                <a href="#">Facebook</a> | 
                <a href="#">Instagram</a> | 
                <a href="#">Twitter</a>
              </div>
              
              <p>Choma - Delicious Home Cooked Meals, Delivered To Your Doorstep</p>
              <p style="font-size: 12px; color: #999;">
                This email was sent to you because your chef application was approved. 
                If you have any questions, please contact our support team.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate rejection email template
   * @param {string} chefName - Chef's name
   * @param {string} reason - Rejection reason
   * @returns {string} - HTML template
   */
  generateRejectionTemplate(chefName, reason) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Choma Chef Application Update</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8f9fa;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              margin-bottom: 20px;
            }
            .logo img {
              width: 120px;
              height: auto;
            }
            .logo-text {
              font-size: 32px;
              font-weight: bold;
              color: #F7AE1A;
              margin-top: 8px;
            }
            .content h1 {
              color: #652815;
              font-size: 24px;
              margin-bottom: 15px;
            }
            .content p {
              margin-bottom: 15px;
              color: #555;
            }
            .reason-box {
              background: #fff3cd;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #ffc107;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #777;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">
                <img src="${this.logoUrl}" alt="Choma Logo" />
                <div class="logo-text">CHOMA</div>
              </div>
            </div>

            <div class="content">
              <h1>Thank you for your interest, ${chefName}</h1>
              
              <p>Thank you for taking the time to apply to become a chef with Choma. We truly appreciate your interest in joining our culinary community.</p>
              
              <p>After careful review of your application, we're unable to proceed with your chef application at this time.</p>

              ${reason ? `
                <div class="reason-box">
                  <strong>Additional Information:</strong><br>
                  ${reason}
                </div>
              ` : ''}

              <p>We encourage you to consider reapplying in the future as our requirements and opportunities continue to evolve. We're always looking for passionate chefs who share our commitment to quality and excellence.</p>

              <p>Thank you again for your interest in Choma. We wish you all the best in your culinary endeavors.</p>
            </div>

            <div class="footer">
              <p><strong>Questions?</strong></p>
              <p>Contact our Team:</p>
              <p>📧 support@getchoma.com | 📱 +234 (0) 123 456 7890</p>
              
              <p>Choma - Delicious Home Cooked Meals, Delivered To Your Doorstep</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate plain text version for better email deliverability
   * @param {string} chefName - Chef's name
   * @returns {string} - Plain text content
   */
  generatePlainTextVersion(chefName) {
    return `
CHOMA - Application Approved!

Welcome to the Choma Family, ${chefName}!

Congratulations! We're thrilled to inform you that your chef application has been approved. After careful review of your qualifications and experience, we're excited to have you join our community of talented chefs.

Next Steps:
1. Download the Chef App from the App Store or Google Play
2. Complete Your Profile with specialties and available hours
3. Kitchen Orientation - Our team will contact you within 24 hours
4. Start Cooking and earning immediately after orientation

Our chef success team will provide you with:
- Kitchen guidelines and safety protocols
- Order management system training
- Pricing and earnings structure
- Marketing support for your specialties

Need Help?
Contact our Chef Support Team:
Email: chefs@getchoma.com
Phone: +234 (0) 123 456 7890

Choma - Delicious Home Cooked Meals, Delivered To Your Doorstep
    `;
  }

  /**
   * Send email verification code
   * @param {Object} data - Email data
   * @param {string} data.email - Recipient email
   * @param {string} data.verificationCode - 6-digit verification code
   * @param {string} data.purpose - Purpose of verification
   * @returns {Promise<boolean>} - Success status
   */
  async sendVerificationEmail(data) {
    try {
      const { email, verificationCode, purpose = 'chef_registration' } = data;

      const mailOptions = {
        from: {
          name: 'Choma Team',
          address: process.env.GMAIL_USER
        },
        to: email,
        subject: 'Verify Your Email - Choma Chef Registration',
        html: this.generateVerificationTemplate(verificationCode, purpose),
        text: `Your Choma verification code is: ${verificationCode}. This code expires in 10 minutes. If you didn't request this, please ignore this email.`
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent successfully to ${email}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      return false;
    }
  }

  /**
   * Generate verification email template
   * @param {string} verificationCode - 6-digit code
   * @param {string} purpose - Verification purpose
   * @returns {string} - HTML template
   */
  generateVerificationTemplate(verificationCode, purpose) {
    const titles = {
      chef_registration: 'Chef Registration Verification',
      password_reset: 'Password Reset Verification',
      email_change: 'Email Change Verification'
    };

    const messages = {
      chef_registration: 'Welcome to Choma! Please verify your email to continue your chef registration.',
      password_reset: 'You requested to reset your password. Use this code to continue.',
      email_change: 'You requested to change your email address. Please verify your new email.'
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification - Choma</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8f9fa;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              text-align: center;
            }
            .logo {
              margin-bottom: 30px;
            }
            .logo img {
              width: 120px;
              height: auto;
            }
            .logo-text {
              font-size: 32px;
              font-weight: bold;
              color: #F7AE1A;
              margin-top: 8px;
            }
            .verification-code {
              background: linear-gradient(135deg, #F7AE1A, #E89611);
              color: white;
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 8px;
              padding: 20px 30px;
              border-radius: 12px;
              margin: 30px 0;
              display: inline-block;
              box-shadow: 0 4px 15px rgba(247, 174, 26, 0.3);
            }
            .message {
              font-size: 18px;
              color: #652815;
              margin-bottom: 20px;
            }
            .instructions {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #F7AE1A;
              text-align: left;
              margin: 30px 0;
            }
            .warning {
              color: #dc3545;
              font-size: 14px;
              margin-top: 20px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #777;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <img src="https://res.cloudinary.com/your-cloud-name/image/upload/v1/choma-logo.svg" alt="Choma Logo" />
              <div class="logo-text">CHOMA</div>
            </div>
            
            <h1 style="color: #652815; margin-bottom: 10px;">${titles[purpose]}</h1>
            
            <p class="message">${messages[purpose]}</p>
            
            <div class="verification-code">
              ${verificationCode}
            </div>
            
            <div class="instructions">
              <h3 style="margin-top: 0; color: #652815;">How to use this code:</h3>
              <ol style="text-align: left; color: #555;">
                <li>Return to the Choma registration page</li>
                <li>Enter this 6-digit verification code</li>
                <li>Complete your chef registration form</li>
                <li>Wait for admin approval</li>
              </ol>
            </div>

            <p class="warning">
              ⚠️ This code expires in <strong>10 minutes</strong> and can only be used once.
            </p>

            <div class="footer">
              <p>If you didn't request this verification, please ignore this email.</p>
              <p><strong>Need help?</strong> Contact us at support@getchoma.com</p>
              <p>Choma - Delicious Home Cooked Meals, Delivered To Your Doorstep</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Send general notification email
   * @param {Object} data - Email data
   * @param {string} data.to - Recipient email
   * @param {string} data.subject - Email subject
   * @param {string} data.message - Email message
   * @returns {Promise<boolean>} - Success status
   */
  async sendNotificationEmail(data) {
    try {
      const { to, subject, message } = data;

      const mailOptions = {
        from: {
          name: 'Choma Team',
          address: process.env.GMAIL_USER
        },
        to,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${this.logoUrl}" alt="Choma Logo" style="width: 120px; height: auto;" />
              <h1 style="color: #F7AE1A; font-size: 32px; margin: 8px 0 0 0;">CHOMA</h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              ${message}
            </div>
            <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
              <p>Choma - Delicious Home Cooked Meals, Delivered To Your Doorstep</p>
            </div>
          </div>
        `,
        text: message.replace(/<[^>]*>/g, '') // Strip HTML for plain text version
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Notification email sent successfully to ${to}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to send notification email:', error);
      return false;
    }
  }
}

module.exports = new EmailService();