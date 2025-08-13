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

      // For now, we'll use a mock implementation
      // In production, this would call your backend email service
      console.log('Sending chef rejection email:', emailData)
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return true
    } catch (error) {
      console.error('Failed to send chef rejection email:', error)
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
  }
}