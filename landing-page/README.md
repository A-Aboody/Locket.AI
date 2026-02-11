# Locket.AI Landing Page

This directory contains the static landing page for accepting organization invitations.

## 📄 Files

- `accept-invite.html` - Invitation acceptance page

## 🚀 Deployment Options

### Option 1: GitHub Pages (Recommended - Free)

1. **Create a new GitHub repository** (or use existing):
   ```bash
   git init
   git add accept-invite.html
   git commit -m "Add invite landing page"
   git remote add origin https://github.com/YOUR_USERNAME/locket-landing.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` → `/` (root)
   - Save

3. **Access your page**:
   - URL: `https://YOUR_USERNAME.github.io/locket-landing/accept-invite.html`

4. **Update backend configuration**:
   - Edit `backend/.env` or `backend/config.py`
   - Set `LANDING_PAGE_URL=https://YOUR_USERNAME.github.io/locket-landing`

### Option 2: Netlify (Free)

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Deploy**:
   ```bash
   cd landing-page
   netlify deploy --prod
   ```

3. **Follow prompts** to create a new site

4. **Update backend**:
   - Set `LANDING_PAGE_URL=https://YOUR_SITE_NAME.netlify.app`

### Option 3: Custom Domain

If you own `locket.ai`:

1. Upload `accept-invite.html` to your web server at `/accept-invite.html`
2. No backend configuration needed (already set to `https://locket.ai`)

### Option 4: Vercel (Free)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   cd landing-page
   vercel --prod
   ```

3. Update backend with your Vercel URL

## 🧪 Testing Locally

1. **Open the file directly**:
   - Right-click `accept-invite.html` → Open with → Browser
   - Or use a local server:
     ```bash
     cd landing-page
     python -m http.server 8000
     ```
   - Visit: `http://localhost:8000/accept-invite.html?code=TEST123`

2. **Test deep link**:
   - Make sure the Locket.AI desktop app is installed
   - Click "Open Locket.AI" button
   - App should open with the invite modal

## 🔧 Configuration

### Update Download Links

Currently, download buttons link to `#`. Update these in `accept-invite.html`:

```javascript
const platforms = [
    {
        name: 'Windows',
        icon: '🪟',
        url: 'https://github.com/YOUR_ORG/locket-ai/releases/download/v1.0.0/Locket-AI-Setup-1.0.0.exe',
        id: 'windows'
    },
    {
        name: 'macOS',
        icon: '🍎',
        url: 'https://github.com/YOUR_ORG/locket-ai/releases/download/v1.0.0/Locket-AI-1.0.0.dmg',
        id: 'macos'
    },
    {
        name: 'Linux',
        icon: '🐧',
        url: 'https://github.com/YOUR_ORG/locket-ai/releases/download/v1.0.0/Locket-AI-1.0.0.AppImage',
        id: 'linux'
    }
];
```

### Customize Branding

Edit these sections in `accept-invite.html`:
- Logo emoji: Change `🔐` to your logo
- Brand colors: Update the gradient values
- Tagline: Modify "Lock it with Locket"

## 📝 How It Works

1. **Email Link**: User clicks magic link from email invitation
   - Format: `https://YOUR_DOMAIN/accept-invite.html?code=ABC123`

2. **Page Loads**: Extracts invite code from URL query parameter

3. **Deep Link Attempt**: Tries to open desktop app via `locket://invite/CODE`

4. **Fallback**: Shows download buttons if app not installed

5. **App Opens**: Electron app captures deep link via protocol handler

6. **Modal Appears**: User sees invite acceptance modal in desktop app

## 🔒 Security Notes

- The page only redirects to the `locket://` protocol
- No sensitive data is stored or transmitted
- Invite codes are validated by the backend when user accepts
- Static HTML page with no backend dependencies

## 🐛 Troubleshooting

**Deep link not working?**
- Ensure the desktop app is installed
- Try manually opening the app first
- Check that protocol handler is registered (reinstall app if needed)

**Page shows "Invalid Invitation"?**
- Check that the URL includes `?code=XXX` parameter
- Verify the invite code is correct

**Download buttons not working?**
- Update the download URLs in the HTML file
- Ensure your releases are publicly accessible

## 📱 Mobile Support

The page is responsive and works on mobile devices. However:
- Deep links work best on desktop
- Mobile users will see download instructions
- Consider adding app store links for future mobile apps

## 🔄 Updates

To update the landing page after deployment:

**GitHub Pages:**
```bash
# Edit accept-invite.html
git add accept-invite.html
git commit -m "Update landing page"
git push
# Changes appear within 1-2 minutes
```

**Netlify/Vercel:**
```bash
# Edit accept-invite.html
netlify deploy --prod
# or
vercel --prod
```

## 📞 Support

If users have issues accepting invitations:
1. Check that they're using the latest email link
2. Verify invite code hasn't expired (check backend logs)
3. Ensure they have the desktop app installed
4. Try sending a new invitation
