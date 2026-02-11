# 📧 Email Invitation System - Complete Guide

## Overview

A complete email-based organization invitation system with magic links and deep linking support for the Locket.AI Electron desktop app.

## ✨ Features

- **Email Invitations**: Admins can send email invites from organization settings
- **Magic Links**: One-click invitation acceptance (no manual code entry)
- **Deep Linking**: Seamless desktop app integration via `locket://` protocol
- **Invite Management**: View, resend, and revoke invitations
- **Multi-Platform**: Windows, macOS, and Linux support
- **Smart Fallbacks**: Download options if app not installed

---

## 🏗️ Architecture

### Flow Diagram

```
Admin (Settings Page) → Email Invite → User's Email → Magic Link
                ↓
        Landing Page (Web) → Deep Link (locket://invite/CODE)
                ↓
        Electron App → Invite Modal → Accept → Join Organization
```

### Components

1. **Backend**
   - Email service with SMTP
   - Invitation CRUD operations
   - API endpoints for sending/managing invites

2. **Frontend Admin**
   - Email invite form
   - Invite list with filtering
   - Resend/revoke actions

3. **Electron**
   - Protocol handler (`locket://`)
   - IPC communication
   - Deep link processing

4. **Landing Page**
   - Static HTML page
   - Deep link redirection
   - Download options

5. **React App**
   - Invite acceptance modal
   - Context for pending invites
   - Authentication checks

---

## 📁 File Structure

### Backend Files

```
backend/
├── config.py                                    # LANDING_PAGE_URL config
├── email_service.py                             # send_organization_invite()
├── main.py                                      # API endpoints
├── crud.py                                      # Database operations
└── email_templates/
    ├── organization_invite.html                 # Email HTML template
    └── organization_invite.txt                  # Email text template
```

### Frontend Files

```
frontend/
├── electron/
│   ├── main.js                                  # Deep link handler
│   ├── preload.js                               # IPC API
│   └── package.json                             # Protocol registration
├── src/
│   ├── App.jsx                                  # Modal integration
│   ├── main.jsx                                 # Context provider
│   ├── components/organization/
│   │   ├── EmailInviteManager.jsx               # Send invites
│   │   ├── InviteList.jsx                       # Manage invites
│   │   └── index.js                             # Exports
│   ├── contexts/
│   │   └── PendingInviteContext.jsx             # Deep link state
│   ├── custom_components/
│   │   └── InviteAcceptModal.jsx                # Acceptance UI
│   ├── pages/
│   │   └── OrganizationSettings.jsx             # Admin UI
│   └── utils/
│       └── api.js                               # API methods
```

### Landing Page

```
landing-page/
├── accept-invite.html                           # Invitation landing page
└── README.md                                    # Deployment guide
```

---

## 🚀 Setup Instructions

### 1. Configure Email Service

Edit `backend/.env`:

```env
# SMTP Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Landing Page URL (update after deployment)
LANDING_PAGE_URL=https://your-username.github.io/locket-landing
```

**For Gmail:**
1. Enable 2-factor authentication
2. Generate app-specific password: [Google Account](https://myaccount.google.com/apppasswords)
3. Use app password in `SMTP_PASSWORD`

### 2. Deploy Landing Page

**Option A: GitHub Pages (Recommended)**

```bash
cd landing-page
git init
git add .
git commit -m "Add invitation landing page"
git remote add origin https://github.com/YOUR_USERNAME/locket-landing.git
git push -u origin main
```

Enable GitHub Pages in repository settings:
- Settings → Pages
- Source: Deploy from main branch
- Your URL: `https://YOUR_USERNAME.github.io/locket-landing`

**Option B: Netlify**

```bash
cd landing-page
npm install -g netlify-cli
netlify deploy --prod
```

**Option C: Custom Domain**

Upload `accept-invite.html` to `https://locket.ai/accept-invite.html`

### 3. Update Backend Configuration

After deploying landing page, update `backend/.env`:

```env
LANDING_PAGE_URL=https://your-username.github.io/locket-landing
```

Or if using custom domain:

```env
LANDING_PAGE_URL=https://locket.ai
```

### 4. Update Download Links

Edit [landing-page/accept-invite.html](landing-page/accept-invite.html) (search for `const platforms`):

```javascript
const platforms = [
    {
        name: 'Windows',
        icon: '🪟',
        url: 'https://github.com/YOUR_ORG/releases/download/v1.0.0/Setup.exe',
        id: 'windows'
    },
    {
        name: 'macOS',
        icon: '🍎',
        url: 'https://github.com/YOUR_ORG/releases/download/v1.0.0/App.dmg',
        id: 'macos'
    },
    {
        name: 'Linux',
        icon: '🐧',
        url: 'https://github.com/YOUR_ORG/releases/download/v1.0.0/App.AppImage',
        id: 'linux'
    }
];
```

### 5. Build Electron App

The protocol handler will be registered during installation:

```bash
cd frontend
npm run build:win     # Windows
npm run build:mac     # macOS
npm run build:linux   # Linux
```

---

## 📖 Usage Guide

### For Admins: Sending Invitations

1. **Navigate to Organization Settings**
   - Open Locket.AI desktop app
   - Go to Settings → Organization

2. **Send Email Invitation**
   - Click "Invitations" tab
   - Enter recipient's email address
   - Click "Send Invitation"

3. **Manage Invitations**
   - View all sent invitations
   - Resend emails if needed
   - Revoke unused invitations

### For Users: Accepting Invitations

1. **Receive Email**
   - Check email inbox for invitation
   - Subject: "Join [Organization] on Locket.AI"

2. **Click Magic Link**
   - Click "Accept Invitation" button in email
   - Browser opens landing page

3. **Desktop App Opens**
   - Landing page automatically opens desktop app
   - If app not installed, see download options

4. **Accept in App**
   - Invitation modal appears
   - Click "Accept & Join"
   - Redirected to organization settings

### Without Desktop App

If user doesn't have the app installed:

1. Landing page shows download buttons
2. Download for their platform (auto-detected)
3. Install Locket.AI
4. Click magic link again
5. App opens with invitation modal

---

## 🔍 API Endpoints

### Send Email Invitation

```http
POST /api/organizations/{org_id}/invites/email
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "id": 123,
  "invite_code": "ABC123XYZ456",
  "email": "user@example.com",
  "created_at": "2025-01-15T10:30:00",
  "expires_at": "2025-01-22T10:30:00",
  "is_active": true,
  "used_count": 0,
  "max_uses": 1
}
```

### List Invitations

```http
GET /api/organizations/{org_id}/invites?active_only=true
```

### Resend Email

```http
POST /api/organizations/{org_id}/invites/{invite_id}/resend
```

### Revoke Invitation

```http
DELETE /api/organizations/{org_id}/invites/{invite_id}
```

### Join via Code

```http
POST /api/organizations/join/{invite_code}
```

---

## 🧪 Testing

### Test Email Sending

1. **Check SMTP Configuration**
   ```bash
   cd backend
   python -c "from email_service import EmailService; print(EmailService().enabled)"
   ```

2. **Send Test Invitation**
   - Log in as organization admin
   - Send invite to your own email
   - Check spam folder if not received

### Test Deep Linking

1. **Test Landing Page Locally**
   ```bash
   cd landing-page
   python -m http.server 8000
   ```

   Visit: `http://localhost:8000/accept-invite.html?code=TEST123`

2. **Test Protocol Handler**
   - Open browser
   - Navigate to: `locket://invite/TEST123`
   - Desktop app should open

3. **Test End-to-End**
   - Send real invitation email
   - Click link in email
   - Verify app opens
   - Accept invitation

### Troubleshooting

**Email not sending:**
- Check SMTP credentials in `.env`
- Verify SMTP server allows app passwords
- Check backend logs for errors

**Deep link not working:**
- Reinstall desktop app to register protocol
- Check if another app claimed `locket://` protocol
- Try manual deep link in browser address bar

**Landing page not loading:**
- Verify deployment succeeded
- Check `LANDING_PAGE_URL` in backend config
- Ensure CORS allows your domain

**Modal not appearing:**
- Check browser console for errors
- Verify `PendingInviteContext` is wrapping app
- Check Electron IPC handlers are registered

---

## 🔒 Security Considerations

### Invite Codes
- 16-character random strings
- 7-day expiration by default
- Single-use (max_uses = 1)
- Can be revoked by admins

### Email Security
- No sensitive data in email body
- Magic links expire with invite code
- HTTPS-only landing page

### Deep Linking
- Protocol validates invite codes server-side
- User must be authenticated to accept
- Email verification required

### Best Practices
- Use environment variables for secrets
- Enable SMTP authentication
- Use app-specific passwords
- Monitor invite usage
- Revoke unused invites regularly

---

## 🎨 Customization

### Email Template

Edit [backend/email_templates/organization_invite.html](backend/email_templates/organization_invite.html):

```html
<!-- Change branding -->
<h1 style="color: #667eea;">YOUR_BRAND_NAME</h1>

<!-- Customize colors -->
<style>
  .cta-button {
    background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%);
  }
</style>
```

### Landing Page

Edit [landing-page/accept-invite.html](landing-page/accept-invite.html):

```javascript
// Change logo
<div class="logo">YOUR_LOGO</div>

// Customize brand
<div class="brand">YOUR_BRAND</div>

// Update tagline
<div class="tagline">Your tagline here</div>
```

### Modal UI

Edit [frontend/src/custom_components/InviteAcceptModal.jsx](frontend/src/custom_components/InviteAcceptModal.jsx):

```jsx
// Customize text
<Text>Your custom message here</Text>

// Change colors (using Chakra UI theme)
<Button colorScheme="yourColorScheme">...</Button>
```

---

## 📊 Monitoring

### Metrics to Track

- **Invitation sent count**: Monitor API calls
- **Acceptance rate**: Used invites / Total sent
- **Average time to accept**: Track timestamps
- **Expired invites**: Count unused expired codes
- **Email delivery rate**: Monitor SMTP logs

### Logs to Monitor

**Backend:**
```bash
tail -f backend/logs/email_service.log
```

**Electron:**
- Check console logs for deep link events
- Monitor IPC communication

**Landing Page:**
- Use analytics (Google Analytics, Plausible)
- Track deep link attempts vs. downloads

---

## 🔄 Future Enhancements

### Potential Features

1. **Email Templates**
   - Custom branding per organization
   - Multi-language support
   - Rich text editor for admins

2. **Invitation Analytics**
   - Dashboard with acceptance rates
   - Email open tracking
   - User journey analytics

3. **Advanced Controls**
   - Bulk invitations (CSV upload)
   - Custom expiry dates per invite
   - Role-based invitations

4. **Mobile App Support**
   - iOS/Android deep linking
   - App Store/Play Store redirects
   - Progressive Web App option

5. **Notification Systems**
   - In-app notifications
   - Slack/Teams integration
   - Admin alerts for new members

---

## 📞 Support

### Common Issues

**Q: Emails going to spam?**
A: Configure SPF/DKIM records for your domain, use established SMTP provider (SendGrid, Mailgun)

**Q: Can I use a different protocol than `locket://`?**
A: Yes, update `DEEP_LINK_PROTOCOL` in config and rebuild the app

**Q: How to customize email sender name?**
A: Edit `email_service.py`, modify the `From` header

**Q: Can I send multiple invites at once?**
A: Not currently supported. Future enhancement planned.

### Getting Help

- Check logs: Backend and Electron console
- Review this guide thoroughly
- Test with simple invite first
- Verify SMTP configuration

---

## ✅ Implementation Checklist

- [ ] SMTP credentials configured in backend/.env
- [ ] Landing page deployed (GitHub Pages/Netlify/Custom)
- [ ] Backend LANDING_PAGE_URL updated
- [ ] Download links updated in landing page
- [ ] Electron app built and installed
- [ ] Test email sent successfully
- [ ] Deep link tested and working
- [ ] End-to-end flow tested
- [ ] Email template customized (optional)
- [ ] Landing page branding updated (optional)

---

## 📝 Changelog

### Version 1.0.0 (2025-01-15)

**Backend:**
- ✅ Email service with `send_organization_invite()`
- ✅ Email templates (HTML + TXT)
- ✅ API endpoints: send, list, resend, revoke
- ✅ Configuration for landing page URL

**Frontend Admin:**
- ✅ EmailInviteManager component
- ✅ InviteList component with tabs
- ✅ Integration with OrganizationSettings

**Electron:**
- ✅ Deep link protocol handler
- ✅ IPC communication for invite codes
- ✅ Multi-platform protocol registration

**Landing Page:**
- ✅ Static HTML page with deep link
- ✅ Download buttons with OS detection
- ✅ Responsive design

**React App:**
- ✅ PendingInviteContext
- ✅ InviteAcceptModal
- ✅ App integration

---

## 🎉 Conclusion

You now have a complete, production-ready email invitation system with:
- Professional email templates
- Magic link convenience
- Seamless desktop app integration
- Comprehensive admin controls
- Multi-platform support

**Next Steps:**
1. Deploy the landing page
2. Configure SMTP credentials
3. Test the full flow
4. Customize branding
5. Start inviting users!

For questions or issues, refer to the troubleshooting section or check the individual component README files.
