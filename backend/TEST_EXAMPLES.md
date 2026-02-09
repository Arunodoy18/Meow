# 🧪 Meow AI Backend - Test Examples

Complete collection of curl commands and test scenarios.

---

## 🎯 Basic Tests

### Test 1: Successful Request

```bash
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is GitHub?"}'
```

**Expected:**
```json
{
  "success": true,
  "response": "GitHub is a web-based platform for version control and collaboration...",
  "mode": "general"
}
```

### Test 2: With Mode Context

```bash
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain this PR", "mode": "pr_review"}'
```

**Expected:**
```json
{
  "success": true,
  "response": "This appears to be a pull request...",
  "mode": "pr_review"
}
```

---

## ❌ Error Tests

### Test 3: Empty Message

```bash
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": ""}'
```

**Expected:**
```json
{
  "success": false,
  "error": "Message cannot be empty",
  "code": "VALIDATION_ERROR"
}
```

### Test 4: Missing Message

```bash
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:**
```json
{
  "success": false,
  "error": "Message field is required and must be a string",
  "code": "VALIDATION_ERROR"
}
```

### Test 5: Invalid JSON

```bash
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d 'not valid json'
```

**Expected:**
```json
{
  "success": false,
  "error": "Invalid JSON in request body",
  "code": "INVALID_JSON"
}
```

### Test 6: Wrong HTTP Method

```bash
curl -X GET https://YOUR-WORKER-URL.workers.dev/api/chat
```

**Expected:**
```json
{
  "success": false,
  "error": "Method not allowed. Use POST."
}
```

### Test 7: Message Too Long

```bash
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "'$(printf 'a%.0s' {1..6000})'"}'
```

**Expected:**
```json
{
  "success": false,
  "error": "Message exceeds maximum length of 5000 characters",
  "code": "VALIDATION_ERROR"
}
```

---

## 🌐 CORS Tests

### Test 8: Preflight Request

```bash
curl -X OPTIONS https://YOUR-WORKER-URL.workers.dev/api/chat -v
```

**Expected Headers:**
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

### Test 9: CORS in Browser Console

Open any website, then run in browser console:

```javascript
fetch('https://YOUR-WORKER-URL.workers.dev/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Testing CORS from browser'
  })
})
  .then(response => response.json())
  .then(data => {
    console.log('✅ CORS working!');
    console.log(data);
  })
  .catch(error => {
    console.error('❌ CORS error:', error);
  });
```

---

## 🔐 Security Tests

### Test 10: API Key Not Exposed

```bash
# Make request and check headers
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}' \
  -v 2>&1 | grep -i "authorization"

# Should return: NOTHING
# API key should NOT be visible in client requests
```

### Test 11: Check Source Code

```bash
cd C:\dev\Meow\backend

# Verify no hardcoded API keys
Select-String -Path worker.js -Pattern "hf_[a-zA-Z0-9]{34}"

# Should return: NO MATCHES
```

---

## ⚡ Performance Tests

### Test 12: Response Time

```bash
time curl -X POST https://YOUR-WORKER-URL.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Quick test"}'

# First request: ~20-30 seconds (model loading)
# Subsequent requests: ~2-5 seconds (model warm)
```

### Test 13: Concurrent Requests

```bash
# Make 5 requests simultaneously
for i in {1..5}; do
  curl -X POST https://YOUR-WORKER-URL.workers.dev/api/chat \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"Concurrent test $i\"}" &
done
wait

# All should succeed with ~2-5 second response times
```

---

## 🛠️ Integration Tests

### Test 14: Extension Integration (PowerShell)

```powershell
# Simulate extension request
$body = @{
    message = "Explain this GitHub repository"
    mode = "github_analysis"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "https://YOUR-WORKER-URL.workers.dev/api/chat" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body

# Display response
$response | ConvertTo-Json
```

### Test 15: Extension Integration (JavaScript)

```javascript
// In popup.js or content.js
async function testBackend() {
  const BACKEND_URL = 'https://YOUR-WORKER-URL.workers.dev/api/chat';
  
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Test from extension',
        mode: 'general',
      }),
    });
    
    const data = await response.json();
    console.log('✅ Backend test successful:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Backend test failed:', error);
    throw error;
  }
}

// Run test
testBackend();
```

---

## 📊 Monitoring Tests

### Test 16: View Live Logs

```bash
# In terminal, stream logs
wrangler tail

# In another terminal, make requests
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Logging test"}'

# Should see log output in first terminal
```

### Test 17: Check Metrics

```bash
# Get recent metrics
wrangler metrics

# Or view in dashboard:
# https://dash.cloudflare.com/
# Workers & Pages → meow-ai-backend
```

---

## 🔄 Deployment Tests

### Test 18: Local vs Production

```bash
# Test local (dev server)
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Local test"}'

# Test production
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Production test"}'

# Both should return similar responses
```

### Test 19: Post-Deploy Verification

```bash
# After deploying, run full test suite
npm run deploy

# Wait 10 seconds for propagation
sleep 10

# Test basic functionality
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Post-deploy test"}'

# Test error handling
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{}'

# Test CORS
curl -X OPTIONS https://YOUR-WORKER-URL.workers.dev/api/chat -v
```

---

## 🎭 Scenario Tests

### Test 20: GitHub PR Analysis

```bash
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Review this code change: Added error handling to API calls",
    "mode": "pr_review"
  }'
```

### Test 21: Job Description Analysis

```bash
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analyze this job: Senior Software Engineer, 5 years experience, React/Node.js",
    "mode": "job_analysis"
  }'
```

### Test 22: Learning Mode

```bash
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain what async/await is in JavaScript",
    "mode": "learning_mode"
  }'
```

---

## 🐛 Debug Tests

### Test 23: Verbose Output

```bash
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Debug test"}' \
  -v 2>&1 | tee debug.log

# Saves full request/response to debug.log
```

### Test 24: Network Inspection

```bash
# Install httpie for better formatting (optional)
# choco install httpie (Windows)

# Make pretty-printed request
http POST https://YOUR-WORKER-URL.workers.dev/api/chat \
  message="Network inspection test"
```

---

## ✅ Automated Test Suite

### Full Test Script (PowerShell)

```powershell
# Save as: test-backend.ps1

$BACKEND_URL = "https://YOUR-WORKER-URL.workers.dev/api/chat"

Write-Host "🧪 Running Meow AI Backend Tests..." -ForegroundColor Cyan

# Test 1: Success case
Write-Host "`n✓ Test 1: Successful request" -ForegroundColor Green
$response = Invoke-RestMethod -Uri $BACKEND_URL -Method Post -ContentType "application/json" -Body '{"message":"test"}'
if ($response.success -eq $true) {
    Write-Host "  PASS" -ForegroundColor Green
} else {
    Write-Host "  FAIL" -ForegroundColor Red
}

# Test 2: Empty message
Write-Host "`n✓ Test 2: Empty message validation" -ForegroundColor Green
try {
    Invoke-RestMethod -Uri $BACKEND_URL -Method Post -ContentType "application/json" -Body '{"message":""}'
    Write-Host "  FAIL (should have errored)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "  PASS" -ForegroundColor Green
    } else {
        Write-Host "  FAIL (wrong status code)" -ForegroundColor Red
    }
}

# Test 3: CORS preflight
Write-Host "`n✓ Test 3: CORS preflight" -ForegroundColor Green
$headers = Invoke-WebRequest -Uri $BACKEND_URL -Method Options -Headers @{"Origin"="chrome-extension://test"} -UseBasicParsing
if ($headers.Headers["Access-Control-Allow-Origin"]) {
    Write-Host "  PASS" -ForegroundColor Green
} else {
    Write-Host "  FAIL" -ForegroundColor Red
}

Write-Host "`n🎉 Tests complete!" -ForegroundColor Cyan
```

**Run:**
```powershell
.\test-backend.ps1
```

---

## 📝 Test Checklist

Before going to production:

- [ ] Basic success request works
- [ ] Error validation works (empty message)
- [ ] JSON parsing works
- [ ] CORS preflight succeeds
- [ ] POST method accepted
- [ ] GET method rejected
- [ ] Extension can call backend
- [ ] No API key exposed in Network tab
- [ ] Logs show successful requests
- [ ] Response times acceptable (<5s)

---

**All tests passing? Your backend is production-ready! 🚀**
