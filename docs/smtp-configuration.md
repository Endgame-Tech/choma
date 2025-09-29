# SMTP Configuration & Email Service Setup

## Production Email Service Configuration

The Choma email service now includes production-ready timeout handling and retry mechanisms to resolve connection issues.

### Required Environment Variables

#### Primary Gmail SMTP (Required)

```env
GMAIL_USER=your-gmail-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
```

#### Optional Fallback SMTP Provider

For additional production resilience, you can configure a fallback SMTP provider:

```env
# Fallback SMTP settings (optional but recommended for production)
FALLBACK_SMTP_HOST=smtp.sendgrid.net
FALLBACK_SMTP_PORT=587
FALLBACK_SMTP_SECURE=false
FALLBACK_SMTP_USER=apikey
FALLBACK_SMTP_PASS=your-sendgrid-api-key

# Or for Mailgun
FALLBACK_SMTP_HOST=smtp.mailgun.org
FALLBACK_SMTP_PORT=587
FALLBACK_SMTP_SECURE=false
FALLBACK_SMTP_USER=postmaster@your-domain.mailgun.org
FALLBACK_SMTP_PASS=your-mailgun-password
```

#### Other Email Settings

```env
CHOMA_LOGO_URL=https://res.cloudinary.com/dql0tbyes/image/upload/v1754582591/Chomalogo_bm0hdu.png
CHEF_LOGIN_URL=https://chef.choma.com/login
NODE_ENV=production
```

### Production Improvements

#### 1. Timeout Configuration

- **Connection Timeout**: 30 seconds
- **Greeting Timeout**: 10 seconds
- **Socket Timeout**: 60 seconds
- **Connection Pooling**: Enabled with max 5 connections

#### 2. Retry Mechanism

- **Max Retry Attempts**: 3
- **Retry Delay**: 5 seconds (with exponential backoff)
- **Automatic Fallback**: If primary SMTP fails, automatically tries fallback provider
- **Smart Error Detection**: Only retries on network/timeout errors

#### 3. Error Handling

Retries are attempted for these error types:

- `ETIMEDOUT` - Connection timeout
- `ECONNRESET` - Connection reset
- `ECONNREFUSED` - Connection refused
- `ENOTFOUND` - DNS resolution failed
- `EAI_AGAIN` - DNS lookup timed out

### Testing Email Service

#### Via Admin Panel API

Test the email service in production using these endpoints:

**Test Email Service Health:**

```bash
POST /admin/email/test
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_TOKEN

{
  "testEmail": "test@example.com"
}
```

**Test Specific Email Template:**

```bash
POST /admin/email/test-template
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_TOKEN

{
  "testEmail": "test@example.com",
  "templateType": "verification",
  "testData": {
    "chefName": "Test Chef"
  }
}
```

#### Response Format

```json
{
  "success": true,
  "message": "Email service test completed",
  "results": {
    "connectionTest": true,
    "primaryTransporter": true,
    "fallbackTransporter": true,
    "testEmailSent": true,
    "errors": []
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Troubleshooting Production Issues

#### Common SMTP Issues

1. **Connection Timeout**

   - **Cause**: Network connectivity issues or server overload
   - **Solution**: Retry mechanism handles this automatically
   - **Monitoring**: Check server logs for retry attempts

2. **Authentication Failed**

   - **Cause**: Invalid Gmail App Password or expired credentials
   - **Solution**: Regenerate Gmail App Password in Google Account settings
   - **Prevention**: Use environment variable rotation

3. **Rate Limiting**
   - **Cause**: Too many emails sent too quickly
   - **Solution**: Built-in rate limiting (5 emails per 20 seconds)
   - **Monitoring**: Check for rate limit errors in logs

#### Log Analysis

Look for these log patterns in production:

**Success:**

```ins
✅ Email sent successfully to user@example.com via primary (attempt 1)
```

**Retry:**

```ins
❌ Email send attempt 1 failed via primary: Connection timeout
🔄 Trying fallback SMTP transporter...
✅ Email sent successfully to user@example.com via fallback (attempt 1)
```

**Final Failure:**

```ins
💥 Email send failed after 3 attempts: Connection timeout
```

### Deployment Checklist

- [ ] Set `GMAIL_USER` and `GMAIL_APP_PASSWORD` in production environment
- [ ] Configure fallback SMTP provider (recommended)
- [ ] Test email service using admin API endpoints
- [ ] Monitor email service logs for failures
- [ ] Set up alerts for email service failures
- [ ] Verify email templates render correctly
- [ ] Test from production domain for CORS/SPF issues

### Gmail App Password Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account Settings > Security
3. Under "Signing in to Google" select "2-Step Verification"
4. Select "App passwords"
5. Generate new app password for "Mail"
6. Use the 16-character password as `GMAIL_APP_PASSWORD`

### Alternative SMTP Providers

If Gmail continues to have issues, consider these alternatives:

\*_SendGrid_

- Reliable API-based email delivery
- Good deliverability rates
- Easy setup with API key authentication

\*_Mailgun_

- Developer-friendly email API
- Excellent tracking and analytics
- Competitive pricing

\*_Amazon SES_

- Cost-effective for high volume
- Integrates well with AWS infrastructure
- Requires domain verification

### Monitoring & Alerts

Set up monitoring for:

- Email delivery success rates
- SMTP connection failures
- Retry attempt frequency
- Fallback transporter usage

Consider implementing:

- Dead letter queue for failed emails
- Email delivery status webhooks
- Performance metrics dashboard
- Automated failover testing
