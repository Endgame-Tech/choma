# 📧 Email Service Production Issue - Documentation

## 🚨 **Problem Summary**
Email functionality works perfectly in development but fails in production on Render.com with SMTP connection timeouts.

## 🔍 **Root Cause Analysis**
**Render.com blocks outbound SMTP connections** on ports 587/465 for security reasons to prevent spam. This is a common restriction among cloud hosting providers.

## 📊 **Error Pattern**
```
❌ SMTP connection verification failed: Connection timeout
❌ Email send attempt failed via primary: Connection timeout
💥 Email send failed after 3 attempts: Error: Connection timeout
Code: 'ETIMEDOUT', Command: 'CONN'
```

## ✅ **Recommended Solutions**

### **Option 1: SendGrid (Recommended)**
- **Why**: REST API bypasses SMTP restrictions
- **Cost**: Free tier (100 emails/day)
- **Setup**: 5 minutes
- **Implementation**: Replace SMTP with SendGrid API

```javascript
// Install: npm install @sendgrid/mail
const sgMail = require('@sendgrid/mail');

// In your email service
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (to, subject, html) => {
  const msg = {
    to,
    from: process.env.FROM_EMAIL, // Must be verified domain
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log('✅ Email sent via SendGrid');
  } catch (error) {
    console.error('❌ SendGrid error:', error);
  }
};
```

### **Option 2: Resend**
- **Why**: Modern email API, developer-friendly
- **Cost**: Free tier available
- **Setup**: Simple API integration

```javascript
// Install: npm install resend
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, html) => {
  try {
    await resend.emails.send({
      from: 'noreply@yourdomain.com',
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('❌ Resend error:', error);
  }
};
```

### **Option 3: Mailgun**
- **Why**: Reliable email service with API
- **Cost**: Free tier available
- **Setup**: API-based solution

```javascript
// Install: npm install mailgun-js
const mailgun = require('mailgun-js');
const mg = mailgun({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN
});

const sendEmail = async (to, subject, html) => {
  const data = {
    from: process.env.FROM_EMAIL,
    to,
    subject,
    html,
  };

  try {
    await mg.messages().send(data);
  } catch (error) {
    console.error('❌ Mailgun error:', error);
  }
};
```

## 🚫 **Solutions That Won't Work**
- Different SMTP ports (all blocked)
- SMTP relay services (still use blocked ports)
- Gmail SMTP (also blocked)
- Custom SMTP servers (blocked regardless)

## ⚡ **Implementation Priority**
1. **SendGrid** - Most popular, reliable
2. **Resend** - Modern alternative
3. **Mailgun** - Enterprise-grade option

## 🔧 **Required Changes**
- Replace nodemailer SMTP with REST API calls
- Update environment variables
- Modify email service configuration
- Test in production environment

## 📝 **Environment Variables Needed**
```env
# For SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourdomain.com

# For Resend
RESEND_API_KEY=your_resend_api_key

# For Mailgun
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
```

## 🔧 **Quick Fix Steps**
1. **Sign up for SendGrid** (free tier: 100 emails/day)
2. **Get API key** from SendGrid dashboard
3. **Add to Render environment variables**
4. **Replace your SMTP code** with SendGrid REST API
5. **Deploy and test**

## 📝 **Next Steps When Ready**
1. Choose email service provider
2. Sign up and get API credentials
3. Update backend email service
4. Deploy and test in production
5. Verify chef notification emails work

---
**Status**: ⏸️ **PAUSED** - Ready for implementation when email functionality is prioritized.

**Date**: September 29, 2025
**Priority**: Medium (affects chef notifications)
**Impact**: Chef notifications not working in production