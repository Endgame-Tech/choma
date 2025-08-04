# Email Setup Guide - Gmail SMTP with Nodemailer

This guide will help you configure Gmail SMTP for sending chef application emails automatically.

## 🔧 Setup Steps

### 1. Enable 2-Factor Authentication on Gmail
1. Go to your [Google Account settings](https://myaccount.google.com/)
2. Click on "Security" in the left sidebar
3. Enable "2-Step Verification" if not already enabled

### 2. Generate App Password
1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Other (Custom name)"
3. Enter "Choma Backend" as the custom name
4. Click "Generate"
5. **Copy the 16-character password** (you'll need this for the `.env` file)

### 3. Configure Environment Variables
Add these to your `.env` file:

```bash
# Email Configuration (Gmail SMTP)
GMAIL_USER=your-gmail-address@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
```

**Example:**
```bash
GMAIL_USER=getchoma@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

### 4. Test the Configuration
You can test the email service by approving a chef in the admin dashboard. The system will:
1. Update the chef status to "Active"
2. Send a professional welcome email automatically
3. Show a success toast with email confirmation

## 🎯 How It Works

**When Admin Approves Chef:**
- ✅ Chef status updated to "Active"
- ✅ Professional welcome email sent via Gmail SMTP
- ✅ Email includes onboarding steps and contact info
- ✅ Frontend shows success notification

**Email Features:**
- 📧 **Professional HTML templates** with Choma branding
- 📱 **Mobile-responsive design**
- 📝 **Plain text fallbacks** for better deliverability
- 🛡️ **Error resilience** - approval works even if email fails
- 🎨 **Choma orange/brown color scheme**

## 🔒 Security Features

- **App-specific passwords** instead of main Gmail password
- **Encrypted SMTP connection** (TLS)
- **Error handling** that doesn't expose sensitive information
- **Graceful fallbacks** if email service is temporarily unavailable

## 📧 Email Templates

### Acceptance Email Includes:
- Welcome message with chef's name
- Next steps for onboarding
- Kitchen orientation information
- Chef app download links
- Support contact information
- Professional Choma branding

### Rejection Email Includes (Optional):
- Polite rejection message
- Reason for rejection (if provided)
- Encouragement to reapply
- Support contact information

## 🚨 Troubleshooting

### Common Issues:

**"Authentication failed"**
- Check that 2FA is enabled on your Gmail account
- Verify the app password is correct (16 characters)
- Make sure you're using the app password, not your regular Gmail password

**"Connection refused"**
- Gmail SMTP might be blocked by your firewall
- Try using a different network
- Check if Gmail SMTP is accessible: `telnet smtp.gmail.com 587`

**"Daily sending limit exceeded"**
- Gmail has daily sending limits (500 emails/day for personal accounts)
- Consider upgrading to Google Workspace for higher limits
- Monitor your usage in the Gmail admin dashboard

### Environment Variable Format:
```bash
# Correct format (keep spaces in app password as-is)
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop

# Incorrect format (don't remove spaces)
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

## 📊 Testing the System

1. **Create a test chef** with your own email address
2. **Set status to "Pending"** in the database
3. **Use admin dashboard** to approve the chef
4. **Check your email** for the welcome message
5. **Verify toast notification** appears in the admin interface

## 🎉 Success!

Once configured, the system will automatically send professional welcome emails whenever you approve chef applications through the admin dashboard. The emails are beautifully designed with Choma branding and include all the information new chefs need to get started.

---

**Need Help?** 
If you encounter any issues, check the backend console logs for detailed error messages.