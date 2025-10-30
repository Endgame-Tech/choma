const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    // Use SendGrid as the primary and only email provider
    this.isSendGrid = true;

    // Initialize SendGrid (API key must be provided in SENDGRID_API_KEY env var)
    try {
      const sgMail = require("@sendgrid/mail");
      if (!process.env.SENDGRID_API_KEY) {
        console.error(
          "❌ SENDGRID_API_KEY is not set. Set process.env.SENDGRID_API_KEY to use SendGrid."
        );
        throw new Error("SendGrid API key is required");
      } else {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.sgMail = sgMail;
        console.log("📧 SendGrid mail client initialized successfully");
      }
    } catch (err) {
      console.error("❌ Failed to initialize SendGrid client:", err.message);
      throw new Error(`SendGrid initialization failed: ${err.message}`);
    }

    // Gmail SMTP is now disabled - SendGrid only
    if (false) {
      // Initialize Nodemailer with Gmail SMTP and production-ready settings
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // true for port 465, false for other ports
        auth: {
          user: process.env.SENDGRID_FROM || process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
        // Production timeout and connection settings
        connectionTimeout: 30000, // 30 seconds
        greetingTimeout: 10000, // 10 seconds
        socketTimeout: 60000, // 60 seconds
        // Connection pooling for better performance
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        // Retry configuration
        rateDelta: 20000, // 20 second rate delta
        rateLimit: 5, // max 5 emails per rateDelta
        // TLS settings for better compatibility
        tls: {
          // ciphers: "SSLv3", // Removed for improved security and compatibility
          rejectUnauthorized: false, // Consider setting to true in production
        },
        // Debug mode in development
        debug: process.env.NODE_ENV === "development",
        logger: process.env.NODE_ENV === "development",
      });

      // Verify connection configuration on startup
      this.verifyConnection();
    } else {
      // Gmail SMTP disabled - SendGrid is the only email provider
      console.log("� Using SendGrid as the only email provider");
    }

    // Logo URL - can be updated to use Cloudinary or other CDN
    this.logoUrl =
      process.env.CHOMA_LOGO_URL ||
      "https://res.cloudinary.com/dql0tbyes/image/upload/v1754582591/Chomalogo_bm0hdu.png";

    // Alternative logo formats for better email client compatibility
    this.logoUrlJpg = this.logoUrl.replace(".png", ".jpg");
    this.logoBase64Fallback =
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTIwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjx0ZXh0IHg9IjEwIiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjIwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iI0Y3QUUxQSI+Q0hPTUE8L3RleHQ+PC9zdmc+";

    // Maximum retry attempts for failed emails
    this.maxRetryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds between retries

    // Fallback transporter for critical production emails
    this.fallbackTransporter = null;
    this.initializeFallbackTransporter();
  }

  /**
   * Initialize fallback SMTP transporter (optional)
   * For production resilience - can use different SMTP provider
   */
  initializeFallbackTransporter() {
    // Only set up fallback if environment variables are provided
    if (process.env.FALLBACK_SMTP_HOST && process.env.FALLBACK_SMTP_USER) {
      try {
        this.fallbackTransporter = nodemailer.createTransporter({
          host: process.env.FALLBACK_SMTP_HOST,
          port: process.env.FALLBACK_SMTP_PORT || 587,
          secure: process.env.FALLBACK_SMTP_SECURE === "true",
          auth: {
            user: process.env.FALLBACK_SMTP_USER,
            pass: process.env.FALLBACK_SMTP_PASS,
          },
          connectionTimeout: 30000,
          greetingTimeout: 10000,
          socketTimeout: 60000,
          tls: {
            rejectUnauthorized: true,
          },
        });

        console.log("📧 Fallback SMTP transporter initialized");
      } catch (error) {
        console.error(
          "❌ Failed to initialize fallback SMTP transporter:",
          error.message
        );
      }
    }
  }

  /**
   * Verify SMTP connection on startup
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log("✅ SMTP connection verified successfully");
    } catch (error) {
      console.error("❌ SMTP connection verification failed:", error.message);
      // Don't throw error to prevent app crash, just log warning
      console.warn(
        "🚧 Email service may not work properly. Check SMTP configuration."
      );
    }
  }

  /**
   * Send email using SendGrid only
   * @param {Object} mailOptions - Mail options
   * @param {number} attempt - Current attempt number
   * @returns {Promise<boolean>} - Success status
   */
  async sendEmailWithRetry(mailOptions, attempt = 1) {
    try {
      // Use SendGrid as the only email provider
      if (!this.sgMail) {
        throw new Error("SendGrid client not initialized");
      }

      const msg = {
        to: mailOptions.to,
        from:
          mailOptions.from?.address ||
          process.env.SENDGRID_FROM ||
          process.env.SENDGRID_FROM ||
          process.env.GMAIL_USER,
        subject: mailOptions.subject,
        text: mailOptions.text,
        html: mailOptions.html,
      };

      await this.sgMail.send(msg);
      console.log(
        `✅ Email sent successfully to ${mailOptions.to} via SendGrid (attempt ${attempt})`
      );
      return true;
    } catch (error) {
      console.error(
        `❌ SendGrid email send attempt ${attempt} failed:`,
        error.message
      );

      // Check if we should retry
      if (attempt < this.maxRetryAttempts && this.shouldRetry(error)) {
        console.log(
          `🔄 Retrying SendGrid email send in ${this.retryDelay}ms... (${attempt}/${this.maxRetryAttempts})`
        );

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));

        // Exponential backoff: increase delay for next retry
        this.retryDelay = this.retryDelay * 1.5;

        return await this.sendEmailWithRetry(mailOptions, attempt + 1);
      }

      console.error(
        `💥 SendGrid email send failed after ${attempt} attempts:`,
        error
      );
      return false;
    }
  }

  /**
   * Determine if error is worth retrying
   * @param {Error} error - The error object
   * @returns {boolean} - Whether to retry
   */
  shouldRetry(error) {
    const retryableErrors = [
      "ETIMEDOUT",
      "ECONNRESET",
      "ECONNREFUSED",
      "ENOTFOUND",
      "EAI_AGAIN",
      "Connection timeout",
      "Socket timeout",
    ];

    return retryableErrors.some(
      (errorType) =>
        error.message.includes(errorType) ||
        error.code === errorType ||
        error.errno === errorType
    );
  }

  /**
   * Test SendGrid email service
   * @param {string} testEmail - Email to send test to
   * @returns {Promise<Object>} - Test results
   */
  async testEmailService(testEmail) {
    const results = {
      sendGridTest: false,
      testEmailSent: false,
      errors: [],
    };

    // Test SendGrid connection
    try {
      if (!this.sgMail) {
        throw new Error("SendGrid client not initialized");
      }

      if (!process.env.SENDGRID_API_KEY) {
        throw new Error("SendGrid API key not configured");
      }

      results.sendGridTest = true;
      console.log("✅ SendGrid client test passed");
    } catch (error) {
      results.errors.push(`SendGrid: ${error.message}`);
      console.error("❌ SendGrid client test failed:", error.message);
    }

    // Send test email if SendGrid is working
    if (results.sendGridTest) {
      try {
        if (testEmail) {
          const testResult = await this.sendTestEmail(testEmail);
          results.testEmailSent = testResult;
        }
      } catch (error) {
        results.errors.push(`Test email: ${error.message}`);
        console.error("❌ Test email failed:", error.message);
      }
    }

    return results;
  }

  /**
   * Generate email-client-friendly logo HTML
   * @returns {string} - Logo HTML with fallbacks
   */
  generateLogoHtml() {
    return `
      <div class="logo" style="text-align: center; margin-bottom: 20px;">
        <!--[if mso]>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="120" style="margin: 0 auto;">
          <tr>
            <td>
        <![endif]-->
        <img 
          src="${this.logoUrl}" 
          alt="Choma - Delicious Home Cooked Meals" 
          width="120" 
          height="auto" 
          style="
            display: block; 
            margin: 0 auto; 
            max-width: 120px; 
            width: 120px; 
            height: auto;
            border: 0;
            outline: none;
            text-decoration: none;
            -ms-interpolation-mode: bicubic;
          " 
        />
        <!--[if mso]>
            </td>
          </tr>
        </table>
        <![endif]-->
        <div class="logo-text" style="font-size: 24px; font-weight: bold; color: #F7AE1A; margin-top: 8px;">
          CHOMA
        </div>
      </div>
    `;
  }

  /**
   * Test email delivery and logo loading
   * @param {string} testEmail - Email to send test to
   * @returns {Promise<boolean>} - Success status
   */
  async sendTestEmail(testEmail) {
    try {
      const mailOptions = {
        from: {
          name: "Choma Team",
          address: process.env.SENDGRID_FROM || process.env.GMAIL_USER,
        },
        to: testEmail,
        subject: "🧪 Choma Email Template Test - Logo Visibility Check",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Email Test - Choma</title>
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
                .test-section {
                  margin: 20px 0;
                  padding: 15px;
                  border: 1px solid #ddd;
                  border-radius: 8px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                ${this.generateLogoHtml()}
                
                <h1 style="color: #004432; text-align: center;">Email Template Test</h1>
                
                <div class="test-section">
                  <h3>Logo Test Results:</h3>
                  <p>✅ If you can see the Choma logo above, images are loading correctly!</p>
                  <p>❌ If you only see "CHOMA" text, images may be blocked by your email client.</p>
                </div>
                
                <div class="test-section">
                  <h3>Logo URL Being Used:</h3>
                  <p><a href="${this.logoUrl}" target="_blank">${
          this.logoUrl
        }</a></p>
                </div>
                
                <div class="test-section">
                  <h3>Email Client Compatibility:</h3>
                  <ul>
                    <li>✅ HTML email support detected</li>
                    <li>✅ CSS styling support detected</li>
                    <li>✅ Logo fallback text available</li>
                  </ul>
                </div>
                
                <div style="text-align: center; margin-top: 30px; color: #777; font-size: 14px;">
                  <p>This is a test email to verify logo display and email formatting.</p>
                  <p>Choma - Delicious Home Cooked Meals, Delivered To Your Doorstep</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `Choma Email Test - If you can see the CHOMA logo in the HTML version, images are working correctly. Logo URL: ${this.logoUrl}`,
      };

      // Use retry mechanism for production reliability
      return await this.sendEmailWithRetry(mailOptions);
    } catch (error) {
      console.error("❌ Failed to send test email:", error);
      return false;
    }
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
          name: "Choma Team",
          address: process.env.SENDGRID_FROM || process.env.GMAIL_USER,
        },
        to: chefEmail,
        subject:
          "Welcome to Choma - Your Chef Application Has Been Approved! 🎉",
        html: emailTemplate,
        text: this.generatePlainTextVersion(chefName),
      };

      // Use retry mechanism for production reliability
      return await this.sendEmailWithRetry(mailOptions);
    } catch (error) {
      console.error("❌ Failed to send chef acceptance email:", error);

      // Log specific Gmail SMTP errors
      if (error.response) {
        console.error("Gmail SMTP Error Response:", error.response);
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
          name: "Choma Team",
          address: process.env.SENDGRID_FROM || process.env.GMAIL_USER,
        },
        to: chefEmail,
        subject: "Update on Your Choma Chef Application",
        html: this.generateRejectionTemplate(chefName, reason),
        text: `Dear ${chefName}, Thank you for your interest in joining Choma as a chef. After careful review, we're unable to proceed with your application at this time. ${
          reason ? "Reason: " + reason : ""
        } We encourage you to reapply in the future. Best regards, The Choma Team`,
      };

      await this.sendEmailWithRetry(mailOptions);
      console.log(`✅ Chef rejection email sent successfully to ${chefEmail}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to send chef rejection email:", error);
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
              display: block;
              margin: 0 auto;
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
              color: #004432;
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
              margin: 20px 0;
            }
            .next-steps h3 {
              color: #004432;
              margin-top: 0;
            }
            .next-steps ul {
              margin: 10px 0;
              padding-left: 20px;
            }
            .cta-button {
              display: inline-block;
              background: #004432;
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
                <img src="${
                  this.logoUrl
                }" alt="Choma - Delicious Home Cooked Meals" width="120" height="auto" style="display: block; margin: 0 auto; max-width: 120px;" />
                <div class="logo-text">CHOMA</div>
              </div>
              <div class="welcome-badge">Application Approved!</div>
            </div>

            <div class="content">
              <h1>Welcome to the Choma Family, ${chefName}!</h1>
              
              <p>Congratulations! We're thrilled to inform you that your chef application has been <strong>approved</strong>. After careful review of your qualifications and experience, we're excited to have you join our community of talented chefs.</p>
              
              <p>At Choma, we're passionate about delivering authentic Nigerian cuisine and international flavors to food lovers across the region. Your skills and expertise will help us continue this mission while providing you with exciting opportunities to grow your culinary career.</p>

              <div class="next-steps">
                <h3>Next Steps:</h3>
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

              <a href="${
                process.env.CHEF_LOGIN_URL || "http://localhost:3002/login"
              }" class="cta-button">Access Chef Dashboard</a>
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
              display: block;
              margin: 0 auto;
            }
            .logo-text {
              font-size: 32px;
              font-weight: bold;
              color: #F7AE1A;
              margin-top: 8px;
            }
            .content h1 {
              color: #004432;
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
                <img src="${
                  this.logoUrl
                }" alt="Choma - Delicious Home Cooked Meals" width="120" height="auto" style="display: block; margin: 0 auto; max-width: 120px;" />
                <div class="logo-text">CHOMA</div>
              </div>
            </div>

            <div class="content">
              <h1>Thank you for your interest, ${chefName}</h1>
              
              <p>Thank you for taking the time to apply to become a chef with Choma. We truly appreciate your interest in joining our culinary community.</p>
              
              <p>After careful review of your application, we're unable to proceed with your chef application at this time.</p>

              ${
                reason
                  ? `
                <div class="reason-box">
                  <strong>Additional Information:</strong><br>
                  ${reason}
                </div>
              `
                  : ""
              }

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
      const { email, verificationCode, purpose = "chef_registration" } = data;

      const mailOptions = {
        from: {
          name: "Choma Team",
          address: process.env.SENDGRID_FROM || process.env.GMAIL_USER,
        },
        to: email,
        subject: "Verify Your Email - Choma Chef Registration",
        html: this.generateVerificationTemplate(verificationCode, purpose),
        text: `Your Choma verification code is: ${verificationCode}. This code expires in 5 minutes. If you didn't request this, please ignore this email.`,
      };

      // Use retry mechanism for production reliability
      return await this.sendEmailWithRetry(mailOptions);
    } catch (error) {
      console.error("❌ Failed to send verification email:", error);
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
      chef_registration: "Chef Registration Verification",
      password_reset: "Password Reset Verification",
      email_change: "Email Change Verification",
    };

    const messages = {
      chef_registration:
        "Welcome to Choma! Please verify your email to continue your chef registration.",
      password_reset:
        "You requested to reset your password. Use this code to continue.",
      email_change:
        "You requested to change your email address. Please verify your new email.",
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
              display: block;
              margin: 0 auto;
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
              color: #004432;
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
              <img src="${this.logoUrl}" alt="Choma Logo" />
              <div class="logo-text">CHOMA</div>
            </div>
            
            <h1 style="color: #004432; margin-bottom: 10px;">${titles[purpose]}</h1>
            
            <p class="message">${messages[purpose]}</p>
            
            <div class="verification-code">
              ${verificationCode}
            </div>
            
            <div class="instructions">
              <h3 style="margin-top: 0; color: #004432;">How to use this code:</h3>
              <ol style="text-align: left; color: #555;">
                <li>Return to the Choma registration page</li>
                <li>Enter this 6-digit verification code</li>
                <li>Complete your chef registration form</li>
                <li>Wait for admin approval</li>
              </ol>
            </div>

            <p class="warning">
              ⚠️ This code expires in <strong>5 minutes</strong> and can only be used once.
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
          name: "Choma Team",
          address: process.env.SENDGRID_FROM || process.env.GMAIL_USER,
        },
        to,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${this.logoUrl}" alt="Choma - Delicious Home Cooked Meals" style="width: 120px; height: auto; display: block; margin: 0 auto; max-width: 120px;" />
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
        text: message.replace(/<[^>]*>/g, ""), // Strip HTML for plain text version
      };

      await this.sendEmailWithRetry(mailOptions);
      console.log(`✅ Notification email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to send notification email:", error);
      return false;
    }
  }

  /**
   * Send chef suspension email
   * @param {Object} data - Email data
   * @param {string} data.chefName - Chef's full name
   * @param {string} data.chefEmail - Chef's email address
   * @param {string} data.reason - Reason for suspension
   * @returns {Promise<boolean>} - Success status
   */
  async sendChefSuspensionEmail(data) {
    try {
      const { chefName, chefEmail, reason } = data;

      const emailTemplate = this.generateChefSuspensionTemplate(
        chefName,
        reason
      );

      const mailOptions = {
        from: {
          name: "Choma Team",
          address: process.env.SENDGRID_FROM || process.env.GMAIL_USER,
        },
        to: chefEmail,
        subject:
          "Important: Your Choma Chef Account Has Been Temporarily Suspended",
        html: emailTemplate,
        text: `Dear ${chefName}, your Choma chef account has been temporarily suspended. Reason: ${
          reason || "Violation of platform policies"
        }. Please contact support for assistance.`,
      };

      await this.sendEmailWithRetry(mailOptions);
      console.log(`✅ Chef suspension email sent successfully to ${chefEmail}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to send chef suspension email:", error);
      return false;
    }
  }

  /**
   * Send chef deactivation email
   * @param {Object} data - Email data
   * @param {string} data.chefName - Chef's full name
   * @param {string} data.chefEmail - Chef's email address
   * @param {string} data.reason - Reason for deactivation
   * @returns {Promise<boolean>} - Success status
   */
  async sendChefDeactivationEmail(data) {
    try {
      const { chefName, chefEmail, reason } = data;

      const emailTemplate = this.generateChefDeactivationTemplate(
        chefName,
        reason
      );

      const mailOptions = {
        from: {
          name: "Choma Team",
          address: process.env.SENDGRID_FROM || process.env.GMAIL_USER,
        },
        to: chefEmail,
        subject: "Your Choma Chef Account Has Been Deactivated",
        html: emailTemplate,
        text: `Dear ${chefName}, your Choma chef account has been deactivated. Reason: ${
          reason || "Account deactivation requested"
        }. Contact support if you believe this is an error.`,
      };

      await this.sendEmailWithRetry(mailOptions);
      console.log(
        `✅ Chef deactivation email sent successfully to ${chefEmail}`
      );
      return true;
    } catch (error) {
      console.error("❌ Failed to send chef deactivation email:", error);
      return false;
    }
  }

  /**
   * Send chef reactivation email
   * @param {Object} data - Email data
   * @param {string} data.chefName - Chef's full name
   * @param {string} data.chefEmail - Chef's email address
   * @returns {Promise<boolean>} - Success status
   */
  async sendChefReactivationEmail(data) {
    try {
      const { chefName, chefEmail } = data;

      const emailTemplate = this.generateChefReactivationTemplate(chefName);

      const mailOptions = {
        from: {
          name: "Choma Team",
          address: process.env.SENDGRID_FROM || process.env.GMAIL_USER,
        },
        to: chefEmail,
        subject:
          "Welcome Back! Your Choma Chef Account Has Been Reactivated 🎉",
        html: emailTemplate,
        text: `Dear ${chefName}, great news! Your Choma chef account has been reactivated. You can now start accepting orders again. Welcome back to the Choma family!`,
      };

      await this.sendEmailWithRetry(mailOptions);
      console.log(
        `✅ Chef reactivation email sent successfully to ${chefEmail}`
      );
      return true;
    } catch (error) {
      console.error("❌ Failed to send chef reactivation email:", error);
      return false;
    }
  }

  /**
   * Send chef unsuspension email
   * @param {Object} data - Email data
   * @param {string} data.chefName - Chef's full name
   * @param {string} data.chefEmail - Chef's email address
   * @returns {Promise<boolean>} - Success status
   */
  async sendChefUnsuspensionEmail(data) {
    try {
      const { chefName, chefEmail } = data;

      const emailTemplate = this.generateChefUnsuspensionTemplate(chefName);

      const mailOptions = {
        from: {
          name: "Choma Team",
          address: process.env.SENDGRID_FROM || process.env.GMAIL_USER,
        },
        to: chefEmail,
        subject: "Your Choma Chef Account Suspension Has Been Lifted 🎉",
        html: emailTemplate,
        text: `Dear ${chefName}, your Choma chef account suspension has been lifted. You can now resume your chef activities. Thank you for your patience.`,
      };

      await this.sendEmailWithRetry(mailOptions);
      console.log(
        `✅ Chef unsuspension email sent successfully to ${chefEmail}`
      );
      return true;
    } catch (error) {
      console.error("❌ Failed to send chef unsuspension email:", error);
      return false;
    }
  }

  /**
   * Generate chef suspension email template
   */
  generateChefSuspensionTemplate(chefName, reason) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Suspended - Choma</title>
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
              border-left: 4px solid #dc3545;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo img {
              width: 120px;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .alert-badge {
              background: #dc3545;
              color: white;
              padding: 12px 24px;
              border-radius: 25px;
              display: inline-block;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .content h1 {
              color: #dc3545;
              font-size: 24px;
              margin-bottom: 15px;
            }
            .reason-box {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .next-steps {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .contact-button {
              display: inline-block;
              background: #004432;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 25px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #777;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${this.logoUrl}" alt="Choma Logo" width="120">
              <div class="alert-badge">Account Suspended</div>
            </div>
            
            <div class="content">
              <h1>Dear ${chefName},</h1>
              
              <p>We regret to inform you that your Choma chef account has been temporarily suspended due to policy violations.</p>
              
              <div class="reason-box">
                <h4>Reason for Suspension:</h4>
                <p><strong>${
                  reason || "Violation of platform policies"
                }</strong></p>
              </div>
              
              <div class="next-steps">
                <h4>What happens now?</h4>
                <ul>
                  <li>Your account is temporarily suspended</li>
                  <li>You cannot accept new orders during this period</li>
                  <li>You can appeal this decision by contacting our support team</li>
                  <li>Our team will review your case within 2-3 business days</li>
                </ul>
              </div>
              
              <p>If you believe this suspension was made in error, please contact our support team immediately.</p>
              
              <a href="mailto:support@choma.com" class="contact-button">Contact Support</a>
            </div>
            
            <div class="footer">
              <p>Best regards,<br>The Choma Team</p>
              <p>This is an automated message. Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate chef deactivation email template
   */
  generateChefDeactivationTemplate(chefName, reason) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Deactivated - Choma</title>
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
              border-left: 4px solid #6c757d;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo img {
              width: 120px;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .deactivated-badge {
              background: #6c757d;
              color: white;
              padding: 12px 24px;
              border-radius: 25px;
              display: inline-block;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .content h1 {
              color: #495057;
              font-size: 24px;
              margin-bottom: 15px;
            }
            .reason-box {
              background: #e9ecef;
              border: 1px solid #dee2e6;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .info-box {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .contact-button {
              display: inline-block;
              background: #004432;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 25px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #777;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${this.logoUrl}" alt="Choma Logo" width="120">
              <div class="deactivated-badge">Account Deactivated</div>
            </div>
            
            <div class="content">
              <h1>Dear ${chefName},</h1>
              
              <p>Your Choma chef account has been deactivated as requested.</p>
              
              <div class="reason-box">
                <h4>Reason:</h4>
                <p><strong>${
                  reason || "Account deactivation requested"
                }</strong></p>
              </div>
              
              <div class="info-box">
                <h4>What this means:</h4>
                <ul>
                  <li>Your chef profile is no longer visible to customers</li>
                  <li>You will not receive new order requests</li>
                  <li>Your account data is preserved for potential reactivation</li>
                  <li>You can request reactivation at any time</li>
                </ul>
              </div>
              
              <p>Thank you for being part of the Choma chef community. If you decide to return, we'll be happy to help you reactivate your account.</p>
              
              <a href="mailto:support@choma.com" class="contact-button">Request Reactivation</a>
            </div>
            
            <div class="footer">
              <p>Best regards,<br>The Choma Team</p>
              <p>This is an automated message. Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate chef reactivation email template
   */
  generateChefReactivationTemplate(chefName) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome Back! - Choma</title>
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
              border-left: 4px solid #28a745;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo img {
              width: 120px;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .welcome-badge {
              background: linear-gradient(135deg, #28a745, #20c997);
              color: white;
              padding: 12px 24px;
              border-radius: 25px;
              display: inline-block;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .content h1 {
              color: #28a745;
              font-size: 28px;
              margin-bottom: 15px;
            }
            .celebration {
              text-align: center;
              font-size: 48px;
              margin: 20px 0;
            }
            .next-steps {
              background: #d4edda;
              border: 1px solid #c3e6cb;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .cta-button {
              display: inline-block;
              background: #004432;
              color: white;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 25px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #777;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${this.logoUrl}" alt="Choma Logo" width="120">
              <div class="welcome-badge">Account Reactivated</div>
            </div>
            
            <div class="content">
              <div class="celebration">🎉</div>
              <h1>Welcome Back, ${chefName}!</h1>
              
              <p>Great news! Your Choma chef account has been successfully reactivated. We're thrilled to have you back in the Choma family!</p>
              
              <div class="next-steps">
                <h4>You're all set to:</h4>
                <ul>
                  <li>✅ Start accepting new orders immediately</li>
                  <li>✅ Update your menu and availability</li>
                  <li>✅ Connect with customers in your area</li>
                  <li>✅ Access all chef dashboard features</li>
                </ul>
              </div>
              
              <p>Your chef profile is now live and visible to customers. Get ready to create amazing culinary experiences!</p>
              
              <a href="https://chef.choma.com" class="cta-button">Access Chef Dashboard</a>
            </div>
            
            <div class="footer">
              <p>Welcome back to the team!<br>The Choma Team</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate chef unsuspension email template
   */
  generateChefUnsuspensionTemplate(chefName) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Suspension Lifted - Choma</title>
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
              border-left: 4px solid #17a2b8;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo img {
              width: 120px;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .lifted-badge {
              background: linear-gradient(135deg, #17a2b8, #138496);
              color: white;
              padding: 12px 24px;
              border-radius: 25px;
              display: inline-block;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .content h1 {
              color: #17a2b8;
              font-size: 24px;
              margin-bottom: 15px;
            }
            .good-news {
              background: #d1ecf1;
              border: 1px solid #bee5eb;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .next-steps {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .cta-button {
              display: inline-block;
              background: #004432;
              color: white;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 25px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #777;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${this.logoUrl}" alt="Choma Logo" width="120">
              <div class="lifted-badge">Suspension Lifted</div>
            </div>
            
            <div class="content">
              <h1>Great News, ${chefName}!</h1>
              
              <div class="good-news">
                <h4>🎉 Your account suspension has been lifted!</h4>
                <p>After reviewing your case, we're pleased to inform you that your Choma chef account is now fully restored.</p>
              </div>
              
              <div class="next-steps">
                <h4>You can now:</h4>
                <ul>
                  <li>Resume accepting orders from customers</li>
                  <li>Update your menu and pricing</li>
                  <li>Manage your availability schedule</li>
                  <li>Access all chef dashboard features</li>
                </ul>
              </div>
              
              <p>Thank you for your patience during the review process. We appreciate your commitment to maintaining the high standards that make Choma a trusted platform.</p>
              
              <a href="https://chef.choma.com" class="cta-button">Return to Dashboard</a>
            </div>
            
            <div class="footer">
              <p>Thank you for your patience,<br>The Choma Team</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Send password reset email
   * @param {Object} data - Email data
   * @param {string} data.email - Chef's email address
   * @param {string} data.name - Chef's full name
   * @param {string} data.resetUrl - Password reset URL
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordResetEmail(data) {
    try {
      const { email, name, resetUrl } = data;

      const emailTemplate = this.generatePasswordResetTemplate(name, resetUrl);

      const mailOptions = {
        from: {
          name: "Choma Team",
          address: process.env.SENDGRID_FROM || process.env.GMAIL_USER,
        },
        to: email,
        subject: "Reset Your Choma Password 🔐",
        html: emailTemplate,
        text: `Dear ${name}, we received a request to reset your password for your Choma chef account. Click the following link to reset your password: ${resetUrl} This link will expire in 15 minutes for security reasons. If you didn't request this, please ignore this email.`,
      };

      await this.sendEmailWithRetry(mailOptions);
      console.log(`✅ Password reset email sent successfully to ${email}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to send password reset email:", error);
      return false;
    }
  }

  /**
   * Send password reset confirmation email
   * @param {Object} data - Email data
   * @param {string} data.email - Chef's email address
   * @param {string} data.name - Chef's full name
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordResetConfirmation(data) {
    try {
      const { email, name } = data;

      const emailTemplate =
        this.generatePasswordResetConfirmationTemplate(name);

      const mailOptions = {
        from: {
          name: "Choma Team",
          address: process.env.SENDGRID_FROM || process.env.GMAIL_USER,
        },
        to: email,
        subject: "Password Successfully Reset ✅",
        html: emailTemplate,
        text: `Dear ${name}, your Choma password has been successfully reset. If you didn't make this change, please contact our support team immediately. For security, you've been logged out of all devices.`,
      };

      await this.sendEmailWithRetry(mailOptions);
      console.log(
        `✅ Password reset confirmation email sent successfully to ${email}`
      );
      return true;
    } catch (error) {
      console.error(
        "❌ Failed to send password reset confirmation email:",
        error
      );
      return false;
    }
  }

  /**
   * Generate password reset email template
   */
  generatePasswordResetTemplate(name, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password - Choma</title>
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
              border-left: 4px solid #dc3545;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo img {
              width: 120px;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .reset-badge {
              background: #dc3545;
              color: white;
              padding: 12px 24px;
              border-radius: 25px;
              display: inline-block;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .content h1 {
              color: #dc3545;
              font-size: 24px;
              margin-bottom: 15px;
            }
            .reset-button {
              display: inline-block;
              background: #004432;
              color: white;
              padding: 16px 32px;
              text-decoration: none;
              border-radius: 25px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .security-info {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #777;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${this.logoUrl}" alt="Choma Logo" width="120">
              <div class="reset-badge">Password Reset</div>
            </div>
            
            <div class="content">
              <h1>Reset Your Password</h1>
              
              <p>Dear ${name},</p>
              
              <p>We received a request to reset the password for your Choma chef account. Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="reset-button">Reset My Password</a>
              </div>
              
              <div class="security-info">
                <h4>🔒 Security Information:</h4>
                <ul>
                  <li>This link will expire in <strong>15 minutes</strong> for your security</li>
                  <li>You can only use this link once</li>
                  <li>If you didn't request this reset, you can safely ignore this email</li>
                  <li>Your current password remains unchanged until you complete the reset</li>
                </ul>
              </div>
              
              <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
              
              <p>If you didn't request this password reset, please ignore this email or contact our support team if you have concerns.</p>
            </div>
            
            <div class="footer">
              <p>Best regards,<br>The Choma Team</p>
              <p>This is an automated message. Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate password reset confirmation email template
   */
  generatePasswordResetConfirmationTemplate(name) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Successful - Choma</title>
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
              border-left: 4px solid #28a745;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo img {
              width: 120px;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .success-badge {
              background: #28a745;
              color: white;
              padding: 12px 24px;
              border-radius: 25px;
              display: inline-block;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .content h1 {
              color: #28a745;
              font-size: 24px;
              margin-bottom: 15px;
            }
            .success-icon {
              text-align: center;
              font-size: 48px;
              margin: 20px 0;
            }
            .security-info {
              background: #d4edda;
              border: 1px solid #c3e6cb;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .login-button {
              display: inline-block;
              background: #004432;
              color: white;
              padding: 16px 32px;
              text-decoration: none;
              border-radius: 25px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #777;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${this.logoUrl}" alt="Choma Logo" width="120">
              <div class="success-badge">Password Reset Complete</div>
            </div>
            
            <div class="content">
              <div class="success-icon">✅</div>
              <h1>Password Successfully Reset!</h1>
              
              <p>Dear ${name},</p>
              
              <p>Your Choma password has been successfully reset. You can now log in to your chef account using your new password.</p>
              
              <div class="security-info">
                <h4>🛡️ Security Update:</h4>
                <ul>
                  <li>Your password has been securely updated</li>
                  <li>You've been automatically logged out of all devices</li>
                  <li>You'll need to log in again with your new password</li>
                  <li>Your account security has been enhanced</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="https://chef.choma.com/login" class="login-button">Log In Now</a>
              </div>
              
              <p><strong>Didn't reset your password?</strong> If you didn't make this change, please contact our support team immediately at support@choma.com.</p>
            </div>
            
            <div class="footer">
              <p>Stay secure,<br>The Choma Team</p>
              <p>This is an automated message. Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
