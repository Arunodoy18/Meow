# 🚀 Meow AI Backend - Deployment Guide

Complete step-by-step deployment instructions for production.

---

## Prerequisites Checklist

Before you begin:

- [ ] Node.js 18+ installed ([download](https://nodejs.org/))
- [ ] Cloudflare account created ([sign up free](https://dash.cloudflare.com/sign-up))
- [ ] Hugging Face API key ready ([get token](https://huggingface.co/settings/tokens))
- [ ] Terminal/PowerShell access
- [ ] Basic command line knowledge

---

## Step 1: Install Wrangler CLI

```powershell
# Install Wrangler globally
npm install -g wrangler

# Verify installation
wrangler --version
# Should show: ⛅️ wrangler 3.x.x
```

---

## Step 2: Login to Cloudflare

```powershell
# Authenticate with Cloudflare
wrangler login

# Browser will open → Click "Allow"
# Terminal shows: Successfully logged in
```

**Verify login:**
```powershell
wrangler whoami
# Shows: You are logged in with email: your@email.com
```

---

## Step 3: Navigate to Backend Directory

```powershell
# Go to backend folder
cd C:\dev\Meow\backend

# Verify files exist
dir
# Should see: worker.js, wrangler.toml, package.json
```

---

## Step 4: Install Dependencies

```powershell
# Install Wrangler locally (for package.json scripts)
npm install

# Verify
npm list
# Should show: wrangler@3.x.x
```

---

## Step 5: Set API Key Secret (CRITICAL)

```powershell
# Set Hugging Face API key as encrypted secret
wrangler secret put HUGGINGFACE_API_KEY

# Prompt appears:
# Enter a secret value: ████████████
# (Type or paste your hf_... key - it will be hidden)
# Press Enter

# Success message:
# ✅ Success! Uploaded secret HUGGINGFACE_API_KEY
```

**Get your Hugging Face API key:**
1. Visit: https://huggingface.co/settings/tokens
2. Click "New token"
3. Name: `Meow AI Backend`
4. Type: Read
5. Click "Generate token"
6. Copy the `hf_...` key

**Verify secret is set:**
```powershell
wrangler secret list

# Should show:
# [
#   {
#     "name": "HUGGINGFACE_API_KEY",
#     "type": "secret_text"
#   }
# ]
```

---

## Step 6: Test Locally

```powershell
# Start local development server
npm run dev

# Output:
# ⛅️ wrangler dev
# ⎔ Starting local server...
# [mf:inf] Ready on http://localhost:8787
```

**In a NEW terminal (keep dev server running):**

```powershell
# Test POST request
curl -X POST http://localhost:8787/api/chat `
  -H "Content-Type: application/json" `
  -d '{\"message\": \"What is GitHub?\"}'

# Expected response (may take 20-30s first time):
# {
#   "success": true,
#   "response": "GitHub is a web-based platform for version control...",
#   "mode": "general"
# }
```

**If you get success response, local testing passed! ✅**

---

## Step 7: Deploy to Production

```powershell
# Stop dev server (Ctrl+C if still running)

# Deploy to Cloudflare Workers
npm run deploy

# Output:
# ⛅️ wrangler deploy
# Total Upload: XX.XX KiB / gzip: XX.XX KiB
# Uploaded meow-ai-backend (X.XX sec)
# Published meow-ai-backend (X.XX sec)
#   https://meow-ai-backend.YOUR-SUBDOMAIN.workers.dev
# Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**✅ COPY THE URL!** You need it for the extension:
```
https://meow-ai-backend.YOUR-SUBDOMAIN.workers.dev
```

---

## Step 8: Test Production Deployment

```powershell
# Test deployed worker (replace with YOUR URL)
curl -X POST https://meow-ai-backend.YOUR-SUBDOMAIN.workers.dev/api/chat `
  -H "Content-Type: application/json" `
  -d '{\"message\": \"Hello from production!\"}'

# Expected response:
# {
#   "success": true,
#   "response": "Hello! I'm Meow AI...",
#   "mode": "general"
# }
```

**If you get success response, production deployment passed! ✅**

---

## Step 9: Update Chrome Extension

Now update your extension to use the backend proxy instead of calling Hugging Face directly.

### Option A: Remove User API Key System (Recommended)

**Update `popup.js`:**

```javascript
// Remove all API key management code
// Replace callHuggingFaceAPI() function:

async function callHuggingFaceAPI(text, title, mode) {
  const BACKEND_URL = 'https://meow-ai-backend.YOUR-SUBDOMAIN.workers.dev/api/chat';
  
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Page: ${title}\n\n${text}`,
        mode: mode,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Backend error');
    }
    
    const data = await response.json();
    return data.response;
    
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Network error. Check your connection.');
    }
    throw error;
  }
}
```

**Update `content.js`:**

```javascript
// Replace callHuggingFaceAPI() function:

async function callHuggingFaceAPI(userMessage) {
  const BACKEND_URL = 'https://meow-ai-backend.YOUR-SUBDOMAIN.workers.dev/api/chat';
  
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        mode: detectPageMode(window.location.href),
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Backend error');
    }
    
    const data = await response.json();
    return data.response;
    
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error('🌐 Network error. Check your connection.');
    }
    throw error;
  }
}
```

**Simplify `popup.html`:**

Remove setup screen and settings screen - users no longer need API keys!

```html
<div class="container">
  <header>
    <h1>🐱 Meow AI</h1>
    <p class="subtitle">Your AI Developer Copilot</p>
    <div id="modeDisplay" class="mode-display"></div>
  </header>

  <div class="action-section">
    <button id="explainBtn" class="primary-btn">
      Explain This Page
    </button>
  </div>

  <div id="results" class="results-section"></div>
</div>
```

### Option B: Keep User API Key as Fallback (Hybrid)

Keep existing user API key system but add backend option:

```javascript
const USE_BACKEND = true; // Toggle between backend and user keys
const BACKEND_URL = 'https://meow-ai-backend.YOUR-SUBDOMAIN.workers.dev/api/chat';

async function callAI(message, mode) {
  if (USE_BACKEND) {
    return callBackend(message, mode);
  } else {
    return callHuggingFaceDirectly(message, mode);
  }
}
```

---

## Step 10: Test End-to-End

```powershell
# 1. Reload extension in Chrome
# chrome://extensions → Meow AI → Reload button

# 2. Visit any webpage (e.g., github.com)

# 3. Click extension icon (🐱)

# 4. Click "Explain This Page"

# 5. Should see AI response after 2-5 seconds

# 6. Open DevTools → Network tab
# Should see request to: meow-ai-backend.YOUR-SUBDOMAIN.workers.dev
# Should NOT see: api-inference.huggingface.co
```

**✅ If AI response appears, end-to-end integration successful!**

---

## Step 11: Monitor Deployment

### View Real-Time Logs

```powershell
# Stream production logs
wrangler tail

# Shows all requests in real-time:
# GET /api/chat - 200 OK
# POST /api/chat - 400 Bad Request
```

### Cloudflare Dashboard

1. Visit: https://dash.cloudflare.com/
2. Click "Workers & Pages"
3. Click "meow-ai-backend"
4. View:
   - Request count
   - Success rate
   - CPU time
   - Errors

---

## Step 12: Security Verification

### Verify API Key is Hidden

```powershell
# 1. Open extension in Chrome
# 2. Open DevTools (F12)
# 3. Go to Network tab
# 4. Click "Explain This Page"
# 5. Click the request to backend
# 6. View "Headers" tab
# 7. Verify: NO "Authorization" header visible
# 8. Verify: Request goes to YOUR worker URL, not Hugging Face

# ✅ If no Authorization header visible to client = SECURE
```

### Verify Secret is Set

```powershell
wrangler secret list

# Should show:
# [
#   {
#     "name": "HUGGINGFACE_API_KEY",
#     "type": "secret_text"
#   }
# ]
```

### Check Source Code

```powershell
cd C:\dev\Meow\backend

# Verify no hardcoded keys
Select-String -Path worker.js -Pattern "hf_[a-zA-Z0-9]{34}"

# Should return: NO MATCHES
```

---

## Deployment Complete! 🎉

Your backend is now:
- ✅ Deployed to Cloudflare Workers
- ✅ API key secured as environment secret
- ✅ Accessible from Chrome extension
- ✅ Monitored via Cloudflare dashboard
- ✅ Production-ready and scalable

---

## Next Steps

### Optional Enhancements

1. **Custom Domain**
   ```
   Workers & Pages → meow-ai-backend → Triggers → Add Custom Domain
   Example: api.meowai.com
   ```

2. **Rate Limiting**
   - Implement per-IP rate limits
   - Protect against abuse
   - See README.md "Advanced Configuration"

3. **Monitoring Alerts**
   - Set up email alerts for errors
   - Monitor request counts
   - Track response times

4. **Analytics**
   - Track usage patterns
   - Monitor model performance
   - Optimize prompts

---

## Troubleshooting

### "Secret not found"

```powershell
# Reset secret
wrangler secret delete HUGGINGFACE_API_KEY
wrangler secret put HUGGINGFACE_API_KEY
```

### "CORS error in extension"

- Check worker returns CORS headers
- Test: `curl -X OPTIONS YOUR_WORKER_URL -v`
- Should return: `Access-Control-Allow-Origin: *`

### "503 Service Unavailable"

- Wait 20-30 seconds (model loading)
- Check Hugging Face API status
- Verify API key is valid

### "Deployment failed"

```powershell
# Check Wrangler version
wrangler --version

# Update Wrangler
npm update -g wrangler

# Retry deploy
npm run deploy
```

---

## Support

**Cloudflare Workers:**
- Docs: https://developers.cloudflare.com/workers/
- Community: https://discord.gg/cloudflaredev

**Hugging Face:**
- Docs: https://huggingface.co/docs/api-inference/
- Community: https://discuss.huggingface.co/

**Issues:**
- Check logs: `wrangler tail`
- Check dashboard: https://dash.cloudflare.com/
- Review backend/README.md

---

**Deployment Status: ✅ COMPLETE**

**Backend URL:** `https://meow-ai-backend.YOUR-SUBDOMAIN.workers.dev`

**Extension Status:** Ready to use secure backend proxy!

🐱 Meow AI is now production-ready with enterprise-grade security! 🚀
