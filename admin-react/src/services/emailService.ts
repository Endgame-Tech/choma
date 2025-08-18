interface EmailData {
  to: string
  subject: string
  html: string
}

interface ChefAcceptanceEmailData {
  chefName: string
  chefEmail: string
}

interface ChefRejectionEmailData {
  chefName: string
  chefEmail: string
  reason?: string
}

interface ChefSuspensionEmailData {
  chefName: string
  chefEmail: string
  reason: string
  suspensionDate: string
}

interface ChefDeactivationEmailData {
  chefName: string
  chefEmail: string
  reason: string
  deactivationDate: string
}

interface ChefReactivationEmailData {
  chefName: string
  chefEmail: string
  reactivationDate: string
}

interface ChefUnsuspensionEmailData {
  chefName: string
  chefEmail: string
  reactivationDate: string
}

export const emailService = {
  // Send chef acceptance email
  async sendChefAcceptanceEmail(data: ChefAcceptanceEmailData): Promise<boolean> {
    try {
      const emailTemplate = this.generateChefAcceptanceTemplate(data.chefName)
      
      const emailData: EmailData = {
        to: data.chefEmail,
        subject: 'Welcome to Choma - Your Chef Application Has Been Approved! 🎉',
        html: emailTemplate
      }

      // For now, we'll use a mock implementation
      // In production, this would call your backend email service
      console.log('Sending chef acceptance email:', emailData)
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return true
    } catch (error) {
      console.error('Failed to send chef acceptance email:', error)
      return false
    }
  },

  // Send chef rejection email
  async sendChefRejectionEmail(data: ChefRejectionEmailData): Promise<boolean> {
    try {
      const emailTemplate = this.generateChefRejectionTemplate(data.chefName, data.reason)
      
      const emailData: EmailData = {
        to: data.chefEmail,
        subject: 'Update on Your Choma Chef Application',
        html: emailTemplate
      }

      console.log('Sending chef rejection email:', emailData)
      await new Promise(resolve => setTimeout(resolve, 1000))
      return true
    } catch (error) {
      console.error('Failed to send chef rejection email:', error)
      return false
    }
  },

  // Send chef suspension email
  async sendChefSuspensionEmail(data: ChefSuspensionEmailData): Promise<boolean> {
    try {
      const emailTemplate = this.generateChefSuspensionTemplate(data.chefName, data.reason, data.suspensionDate)
      
      const emailData: EmailData = {
        to: data.chefEmail,
        subject: 'Important: Your Choma Chef Account Has Been Suspended',
        html: emailTemplate
      }

      console.log('Sending chef suspension email:', emailData)
      await new Promise(resolve => setTimeout(resolve, 1000))
      return true
    } catch (error) {
      console.error('Failed to send chef suspension email:', error)
      return false
    }
  },

  // Send chef deactivation email
  async sendChefDeactivationEmail(data: ChefDeactivationEmailData): Promise<boolean> {
    try {
      const emailTemplate = this.generateChefDeactivationTemplate(data.chefName, data.reason, data.deactivationDate)
      
      const emailData: EmailData = {
        to: data.chefEmail,
        subject: 'Your Choma Chef Account Has Been Deactivated',
        html: emailTemplate
      }

      console.log('Sending chef deactivation email:', emailData)
      await new Promise(resolve => setTimeout(resolve, 1000))
      return true
    } catch (error) {
      console.error('Failed to send chef deactivation email:', error)
      return false
    }
  },

  // Send chef reactivation email
  async sendChefReactivationEmail(data: ChefReactivationEmailData): Promise<boolean> {
    try {
      const emailTemplate = this.generateChefReactivationTemplate(data.chefName, data.reactivationDate)
      
      const emailData: EmailData = {
        to: data.chefEmail,
        subject: 'Welcome Back! Your Choma Chef Account Has Been Reactivated',
        html: emailTemplate
      }

      console.log('Sending chef reactivation email:', emailData)
      await new Promise(resolve => setTimeout(resolve, 1000))
      return true
    } catch (error) {
      console.error('Failed to send chef reactivation email:', error)
      return false
    }
  },

  // Send chef unsuspension email
  async sendChefUnsuspensionEmail(data: ChefUnsuspensionEmailData): Promise<boolean> {
    try {
      const emailTemplate = this.generateChefUnsuspensionTemplate(data.chefName, data.reactivationDate)
      
      const emailData: EmailData = {
        to: data.chefEmail,
        subject: 'Good News! Your Choma Chef Account Has Been Unsuspended',
        html: emailTemplate
      }

      console.log('Sending chef unsuspension email:', emailData)
      await new Promise(resolve => setTimeout(resolve, 1000))
      return true
    } catch (error) {
      console.error('Failed to send chef unsuspension email:', error)
      return false
    }
  },

  // Generate HTML email template for chef acceptance
  generateChefAcceptanceTemplate(chefName: string): string {
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
              font-size: 32px;
              font-weight: bold;
              color: #F7AE1A;
              margin-bottom: 10px;
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
              <div class="logo">CHOMA</div>
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

              <a href="#" class="cta-button">Access Chef Dashboard</a>
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
    `
  },

  // Generate HTML email template for chef rejection
  generateChefRejectionTemplate(chefName: string, reason?: string): string {
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
              font-size: 32px;
              font-weight: bold;
              color: #F7AE1A;
              margin-bottom: 20px;
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
              <div class="logo">CHOMA</div>
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
    `
  },

  // Generate HTML email template for chef suspension
  generateChefSuspensionTemplate(chefName: string, reason: string, suspensionDate: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Suspension Notice</title>
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
              font-size: 32px;
              font-weight: bold;
              color: #F7AE1A;
              margin-bottom: 20px;
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
            .content p {
              margin-bottom: 15px;
              color: #555;
            }
            .reason-box {
              background: #f8d7da;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #dc3545;
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
              <div class="logo">CHOMA</div>
              <div class="alert-badge">Account Suspended</div>
            </div>

            <div class="content">
              <h1>Account Suspension Notice</h1>
              
              <p>Dear ${chefName},</p>
              
              <p>We regret to inform you that your Choma chef account has been suspended as of ${suspensionDate}.</p>

              <div class="reason-box">
                <strong>Reason for suspension:</strong><br>
                ${reason}
              </div>

              <p><strong>What this means:</strong></p>
              <ul>
                <li>Your account access has been temporarily disabled</li>
                <li>You cannot receive new orders during this period</li>
                <li>Existing orders in progress can be completed</li>
              </ul>

              <p>If you believe this suspension is in error or would like to appeal this decision, please contact our support team immediately.</p>

              <p>We appreciate your understanding and look forward to resolving this matter promptly.</p>
            </div>

            <div class="footer">
              <p><strong>Need to Appeal?</strong></p>
              <p>Contact our Support Team:</p>
              <p>📧 support@getchoma.com | 📱 +234 (0) 123 456 7890</p>
              
              <p>Choma - Delicious Home Cooked Meals, Delivered To Your Doorstep</p>
            </div>
          </div>
        </body>
      </html>
    `
  },

  // Generate HTML email template for chef deactivation
  generateChefDeactivationTemplate(chefName: string, reason: string, deactivationDate: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Deactivation Notice</title>
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
              font-size: 32px;
              font-weight: bold;
              color: #F7AE1A;
              margin-bottom: 20px;
            }
            .warning-badge {
              background: #ffc107;
              color: #212529;
              padding: 12px 24px;
              border-radius: 25px;
              display: inline-block;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .content h1 {
              color: #ffc107;
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
              <div class="logo">CHOMA</div>
              <div class="warning-badge">Account Deactivated</div>
            </div>

            <div class="content">
              <h1>Account Deactivation Notice</h1>
              
              <p>Dear ${chefName},</p>
              
              <p>We're writing to inform you that your Choma chef account has been deactivated as of ${deactivationDate}.</p>

              <div class="reason-box">
                <strong>Reason for deactivation:</strong><br>
                ${reason}
              </div>

              <p><strong>What this means:</strong></p>
              <ul>
                <li>Your account has been temporarily disabled</li>
                <li>You cannot accept new orders</li>
                <li>Your profile is no longer visible to customers</li>
                <li>You may reapply in the future if eligible</li>
              </ul>

              <p>If you have questions about this decision or would like guidance on reactivation, please don't hesitate to contact our support team.</p>

              <p>Thank you for your time with Choma.</p>
            </div>

            <div class="footer">
              <p><strong>Questions?</strong></p>
              <p>Contact our Support Team:</p>
              <p>📧 support@getchoma.com | 📱 +234 (0) 123 456 7890</p>
              
              <p>Choma - Delicious Home Cooked Meals, Delivered To Your Doorstep</p>
            </div>
          </div>
        </body>
      </html>
    `
  },

  // Generate HTML email template for chef reactivation
  generateChefReactivationTemplate(chefName: string, reactivationDate: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome Back to Choma!</title>
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
              font-size: 32px;
              font-weight: bold;
              color: #F7AE1A;
              margin-bottom: 20px;
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
            .content p {
              margin-bottom: 15px;
              color: #555;
            }
            .success-box {
              background: #d4edda;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #28a745;
              margin: 20px 0;
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
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">CHOMA</div>
              <div class="success-badge">Account Reactivated!</div>
            </div>

            <div class="content">
              <h1>Welcome Back, ${chefName}!</h1>
              
              <p>Great news! Your Choma chef account has been successfully reactivated as of ${reactivationDate}.</p>

              <div class="success-box">
                <strong>Your account is now fully active:</strong><br>
                ✓ You can start accepting orders immediately<br>
                ✓ Your profile is visible to customers<br>
                ✓ All features are restored
              </div>

              <p>We're excited to have you back in the Choma family! You can now:</p>
              <ul>
                <li>Start receiving and fulfilling new orders</li>
                <li>Update your profile and specialties</li>
                <li>Access all chef dashboard features</li>
                <li>Connect with customers again</li>
              </ul>

              <a href="#" class="cta-button">Access Chef Dashboard</a>

              <p>Thank you for your patience, and we look forward to your delicious contributions to our platform!</p>
            </div>

            <div class="footer">
              <p><strong>Need Help Getting Started?</strong></p>
              <p>Contact our Chef Support Team:</p>
              <p>📧 chefs@getchoma.com | 📱 +234 (0) 123 456 7890</p>
              
              <p>Choma - Delicious Home Cooked Meals, Delivered To Your Doorstep</p>
            </div>
          </div>
        </body>
      </html>
    `
  },

  // Generate HTML email template for chef unsuspension
  generateChefUnsuspensionTemplate(chefName: string, reactivationDate: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Unsuspended - Welcome Back!</title>
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
              font-size: 32px;
              font-weight: bold;
              color: #F7AE1A;
              margin-bottom: 20px;
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
            .content p {
              margin-bottom: 15px;
              color: #555;
            }
            .success-box {
              background: #d4edda;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #28a745;
              margin: 20px 0;
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
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">CHOMA</div>
              <div class="success-badge">Suspension Lifted!</div>
            </div>

            <div class="content">
              <h1>Good News, ${chefName}!</h1>
              
              <p>We're pleased to inform you that the suspension on your Choma chef account has been lifted as of ${reactivationDate}.</p>

              <div class="success-box">
                <strong>Your account is now fully restored:</strong><br>
                ✓ Suspension has been completely removed<br>
                ✓ Full account access restored<br>
                ✓ You can accept orders immediately
              </div>

              <p>You can now return to normal operations:</p>
              <ul>
                <li>Accept and fulfill new customer orders</li>
                <li>Access all chef dashboard features</li>
                <li>Your profile is visible to customers</li>
                <li>All platform features are available</li>
              </ul>

              <p>We appreciate your patience during this period and look forward to your continued excellence on our platform.</p>

              <a href="#" class="cta-button">Resume Cooking</a>

              <p>Welcome back to the Choma family!</p>
            </div>

            <div class="footer">
              <p><strong>Ready to Get Started?</strong></p>
              <p>Contact our Chef Support Team if you need any assistance:</p>
              <p>📧 chefs@getchoma.com | 📱 +234 (0) 123 456 7890</p>
              
              <p>Choma - Delicious Home Cooked Meals, Delivered To Your Doorstep</p>
            </div>
          </div>
        </body>
      </html>
    `
  }
}