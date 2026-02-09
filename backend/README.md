# 🔒 Meow AI - Secure Backend Proxy

Production-grade Cloudflare Workers backend that keeps your Hugging Face API key completely hidden from extension users.

---

## 🏗️ Architecture

```
┌─────────────────────┐
│  Chrome Extension   │
│   (Client-Side)     │
└──────────┬──────────┘
           │ HTTPS POST
           │ /api/chat
           ↓
┌─────────────────────┐
│ Cloudflare Worker   │
│  (Backend Proxy)    │
│                     │
│  🔐 API Key here    │
│  (Environment Var)  │
└──────────┬──────────┘
           │ HTTPS + API Key
           │ Authorization: Bearer hf_...
           ↓
┌─────────────────────┐
│  Hugging Face API   │
│   (AI Service)      │
└─────────────────────┘
```

**Security Benefits:**
- ✅ API key stored as Cloudflare secret (never in code)
- ✅ API key never sent to client
- ✅ Users can't extract or abuse your key
- ✅ Centralized rate limiting and monitoring
- ✅ Single point to rotate/revoke keys

---

## 🚀 Quick Start

### Prerequisites

```bash
# Install Node.js (18+)
# https://nodejs.org/

# Install Wrangler CLI globally
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### 1. Clone/Setup Backend

```bash
cd C:\dev\Meow\backend

# Install dependencies
npm install
```

### 2. Configure API Key (CRITICAL)

```bash
# Set Hugging Face API key as Cloudflare secret
wrangler secret put HUGGINGFACE_API_KEY

# When prompted, paste your Hugging Face API key:
# hf_YourActualKeyHere...

# ✅ Key is now encrypted and stored in Cloudflare
# ✅ Never visible in code or logs
```

**Get Hugging Face API Key:**
- Visit: https://huggingface.co/settings/tokens
- Create new token (Read access)
- Copy the `hf_...` key

### 3. Test Locally

```bash
# Start local dev server
npm run dev

# Server runs at: http://localhost:8787
```

**Test with curl:**
```bash
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, explain what GitHub is"}'
```

**Expected response:**
```json
{
  "success": true,
  "response": "GitHub is a web-based platform...",
  "mode": "general"
}
```

### 4. Deploy to Production

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Output will show your worker URL:
# ✅ Published meow-ai-backend
# 🌍 https://meow-ai-backend.YOUR-SUBDOMAIN.workers.dev
```

**Copy the URL** - you'll need it for the extension!

---

## 📡 API Endpoint

### POST /api/chat

**Request:**
```json
{
  "message": "Your question or prompt",
  "mode": "optional context mode (github_analysis, job_analysis, etc.)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "response": "AI generated response text...",
  "mode": "general"
}
```

**Error Response (4xx/5xx):**
```json
{
  "success": false,
  "error": "User-friendly error message",
  "code": "ERROR_CODE"
}
```

**Error Codes:**
- `MODEL_LOADING` - AI model warming up (retry in 20-30s)
- `SERVICE_ERROR` - Temporary service issue
- `RATE_LIMIT` - Too many requests
- `TIMEOUT` - Request took too long
- `NETWORK` - Network connectivity issue
- `VALIDATION` - Invalid request data

---

## 🔧 Configuration

### Environment Variables

**Set in `wrangler.toml`:**
```toml
[vars]
ENVIRONMENT = "production"
```

**Set via Wrangler CLI (secrets):**
```bash
# Required secret
wrangler secret put HUGGINGFACE_API_KEY

# Optional: Add more secrets
wrangler secret put RATE_LIMIT_KEY
wrangler secret put ADMIN_PASSWORD
```

**View secrets:**
```bash
# List secret names (not values)
wrangler secret list
```

**Update secrets:**
```bash
# Overwrite existing secret
wrangler secret put HUGGINGFACE_API_KEY
```

**Delete secrets:**
```bash
wrangler secret delete HUGGINGFACE_API_KEY
```

### Configuration Options

**Edit `worker.js` CONFIG object:**

```javascript
const CONFIG = {
  MODEL_NAME: 'mistralai/Mistral-7B-Instruct-v0.2',  // Change model
  TIMEOUT_MS: 30000,                                  // Request timeout
  MAX_MESSAGE_LENGTH: 5000,                           // Max user message
  ALLOWED_ORIGINS: ['*'],                             // CORS origins
};
```

---

## 🧪 Testing

### Local Testing

```bash
# Start dev server
npm run dev

# In another terminal, test requests:
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message"}'
```

### Production Testing

```bash
# Test deployed worker
curl -X POST https://meow-ai-backend.YOUR-SUBDOMAIN.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from production"}'
```

### Test CORS (from browser)

```javascript
// Open browser console on any website
fetch('https://meow-ai-backend.YOUR-SUBDOMAIN.workers.dev/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'CORS test' })
})
  .then(r => r.json())
  .then(console.log);
```

### Test Error Handling

```bash
# Test empty message (should return 400)
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": ""}'

# Test missing message (should return 400)
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{}'

# Test invalid JSON (should return 400)
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d 'not json'

# Test invalid method (should return 405)
curl -X GET http://localhost:8787/api/chat
```

---

## 📊 Monitoring & Logs

### View Real-Time Logs

```bash
# Stream live logs from production
npm run tail

# Or with wrangler directly
wrangler tail
```

**Log output example:**
```
[2026-02-09 10:30:15] POST /api/chat - 200 OK (1.2s)
[2026-02-09 10:30:16] POST /api/chat - 400 Bad Request (0.05s)
```

### Cloudflare Dashboard

**View analytics:**
1. Visit: https://dash.cloudflare.com/
2. Select your account
3. Click "Workers & Pages"
4. Click "meow-ai-backend"
5. View metrics: Requests, Errors, CPU time

**Metrics available:**
- Total requests
- Success rate
- Error rate
- CPU time usage
- Bandwidth usage

---

## 🔐 Security Best Practices

### ✅ What We Did Right

1. **Environment Secrets**
   - API key stored as Cloudflare secret
   - Encrypted at rest
   - Never visible in code or logs

2. **Request Validation**
   - Message length limits (prevent abuse)
   - JSON schema validation
   - Type checking

3. **Error Handling**
   - Never exposes internal details
   - User-friendly messages
   - Server-side logging only

4. **CORS Configuration**
   - Allows Chrome extension requests
   - Preflight handling
   - Secure origin policies

5. **Timeout Protection**
   - 30-second timeout prevents hanging
   - AbortController for cleanup
   - Graceful error responses

### 🚫 What to Avoid

1. ❌ **Never log API keys**
   ```javascript
   // BAD
   console.log('Using key:', apiKey);
   
   // GOOD
   console.log('Calling Hugging Face API...');
   ```

2. ❌ **Never expose keys in responses**
   ```javascript
   // BAD
   return { error: 'Invalid API key: ' + apiKey };
   
   // GOOD
   return { error: 'Service unavailable' };
   ```

3. ❌ **Never commit secrets to Git**
   ```bash
   # Add to .gitignore
   .env
   .dev.vars
   wrangler.toml.local
   ```

4. ❌ **Never hardcode keys**
   ```javascript
   // BAD
   const API_KEY = 'hf_abc123...';
   
   // GOOD
   const API_KEY = env.HUGGINGFACE_API_KEY;
   ```

---

## 🔄 Deployment Workflow

### Development → Production

```bash
# 1. Test locally
npm run dev

# 2. Deploy to dev environment (optional)
npm run deploy:dev

# 3. Test dev deployment
curl https://meow-ai-backend-dev.YOUR-SUBDOMAIN.workers.dev/api/chat \
  -X POST -H "Content-Type: application/json" \
  -d '{"message": "test"}'

# 4. Deploy to production
npm run deploy

# 5. Test production
curl https://meow-ai-backend.YOUR-SUBDOMAIN.workers.dev/api/chat \
  -X POST -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

### Rollback Strategy

```bash
# View deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback [DEPLOYMENT_ID]
```

### Zero-Downtime Deploys

Cloudflare Workers automatically handle zero-downtime:
- New version deployed globally
- Old version remains until propagation complete
- Gradual traffic shift
- No service interruption

---

## 💰 Cost & Limits

### Cloudflare Workers Free Tier

| Resource | Free Tier Limit |
|----------|----------------|
| Requests/day | 100,000 |
| CPU time/request | 10ms |
| Request duration | 30 seconds max |
| Storage | Unlimited secrets |
| Bandwidth | Unlimited |
| Deployments | Unlimited |

**Sufficient for:**
- Personal projects
- Small teams
- Prototyping
- Up to 3 million requests/month

### Paid Tier ($5/month)

| Resource | Paid Tier Limit |
|----------|----------------|
| Requests/month | 10 million included |
| Additional requests | $0.50 per million |
| CPU time | 50ms per request |
| Everything else | Same as free |

**Upgrade when:**
- Exceeding 100k requests/day
- Need more CPU time
- Commercial application

---

## 🔧 Advanced Configuration

### Custom Domain

**1. Add custom domain in Cloudflare Dashboard:**
```
Workers & Pages → meow-ai-backend → Triggers → Add Custom Domain
```

**2. Or edit `wrangler.toml`:**
```toml
routes = [
  { pattern = "api.meowai.com/*", zone_name = "meowai.com" }
]
```

**3. Deploy:**
```bash
npm run deploy
```

**4. Access via custom domain:**
```
https://api.meowai.com/api/chat
```

### Rate Limiting (Advanced)

**Add to `worker.js`:**
```javascript
// Simple in-memory rate limiter
const rateLimiter = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 10;
  
  const userRequests = rateLimiter.get(ip) || [];
  const recentRequests = userRequests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimiter.set(ip, recentRequests);
  return true;
}

// In fetch handler:
const clientIP = request.headers.get('CF-Connecting-IP');
if (!checkRateLimit(clientIP)) {
  return buildErrorResponse('RATE_LIMIT_EXCEEDED');
}
```

### Authentication (Advanced)

**Add API key validation:**
```javascript
// In fetch handler:
const authHeader = request.headers.get('X-API-Key');
if (authHeader !== env.EXTENSION_API_KEY) {
  return new Response('Unauthorized', { status: 401 });
}
```

**Set extension API key:**
```bash
wrangler secret put EXTENSION_API_KEY
```

---

## 📚 Additional Resources

### Cloudflare Workers
- **Docs:** https://developers.cloudflare.com/workers/
- **Examples:** https://workers.cloudflare.com/built-with/
- **Pricing:** https://developers.cloudflare.com/workers/platform/pricing/

### Wrangler CLI
- **Docs:** https://developers.cloudflare.com/workers/wrangler/
- **Commands:** https://developers.cloudflare.com/workers/wrangler/commands/

### Hugging Face API
- **Docs:** https://huggingface.co/docs/api-inference/
- **Models:** https://huggingface.co/models
- **Rate Limits:** https://huggingface.co/docs/api-inference/rate-limits

---

## 🐛 Troubleshooting

### "API key not configured"

**Problem:** Worker can't find `HUGGINGFACE_API_KEY`

**Solution:**
```bash
# Set the secret
wrangler secret put HUGGINGFACE_API_KEY

# Verify it's set
wrangler secret list
# Should show: HUGGINGFACE_API_KEY
```

### "CORS errors in browser"

**Problem:** Extension can't call worker

**Solution:**
- Ensure OPTIONS preflight returns 204
- Check CORS headers are present
- Verify `Access-Control-Allow-Origin: *`

**Test CORS:**
```bash
curl -X OPTIONS http://localhost:8787/api/chat -v
# Should return: 204 No Content
# Should include: Access-Control-Allow-* headers
```

### "503 Service Unavailable"

**Problem:** Hugging Face API issue

**Possible causes:**
1. Model loading (wait 20-30 seconds)
2. Invalid API key (check secret)
3. Rate limit exceeded (wait/upgrade)

**Debug:**
```bash
# Check logs
wrangler tail

# Test API key directly
curl https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2 \
  -H "Authorization: Bearer YOUR_KEY"
```

### "Network timeout"

**Problem:** Request exceeds 30 seconds

**Solution:**
- Reduce message length
- Use faster model
- Increase `TIMEOUT_MS` in CONFIG

---

## ✅ Deployment Checklist

Before deploying to production:

- [ ] **Wrangler CLI installed** (`wrangler --version`)
- [ ] **Logged into Cloudflare** (`wrangler whoami`)
- [ ] **API key set as secret** (`wrangler secret list`)
- [ ] **Tested locally** (`npm run dev` + curl tests)
- [ ] **CORS configured** (allows Chrome extensions)
- [ ] **Error handling tested** (empty message, invalid JSON)
- [ ] **Deployed successfully** (`npm run deploy`)
- [ ] **Production tested** (curl to deployed URL)
- [ ] **Extension updated** (using worker URL)

---

## 🎉 Success Indicators

**Your backend is working correctly when:**

✅ Local dev server starts without errors  
✅ `wrangler secret list` shows `HUGGINGFACE_API_KEY`  
✅ curl requests return valid JSON  
✅ Logs show successful API calls  
✅ Extension connects and gets AI responses  
✅ No API keys visible in browser DevTools  
✅ CORS preflight succeeds  

**You're production-ready! 🚀**
