/**
 * Meow AI - Updated Extension Code to Use Backend Proxy
 * 
 * This file contains the updated fetch calls for popup.js and content.js
 * Replace the existing callHuggingFaceAPI functions with these versions
 */

// ==================== CONFIGURATION ====================

// IMPORTANT: Replace with YOUR actual Cloudflare Worker URL after deployment
const BACKEND_API_URL = 'https://meow-ai-backend.YOUR-SUBDOMAIN.workers.dev/api/chat';

// ==================== FOR popup.js ====================

/**
 * Call backend proxy instead of Hugging Face directly
 * 
 * SECURITY NOTE:
 * - No API key needed in extension
 * - Backend handles authentication
 * - Users get zero-setup experience
 * 
 * @param {string} text - Page text content
 * @param {string} title - Page title
 * @param {string} mode - Context mode (pr_review, github_analysis, etc.)
 * @returns {Promise<string>} AI-generated response
 */
async function callHuggingFaceAPI(text, title, mode) {
  // Build message with context
  const message = `Page Title: ${title}\n\nPage Content:\n${text}\n\nProvide analysis for ${mode} context.`;
  
  try {
    // Call backend proxy
    const response = await fetch(BACKEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        mode: mode,
      }),
    });
    
    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json();
      
      // Map backend error codes to user-friendly messages
      if (errorData.code === 'MODEL_LOADING') {
        throw new Error('AI model is loading. Please try again in 20-30 seconds.');
      } else if (errorData.code === 'RATE_LIMIT') {
        throw new Error('Too many requests. Please wait a moment.');
      } else if (errorData.code === 'TIMEOUT') {
        throw new Error('Request timed out. Please try again.');
      } else {
        throw new Error(errorData.error || 'Backend service error');
      }
    }
    
    // Parse successful response
    const data = await response.json();
    
    if (data.success && data.response) {
      return data.response;
    } else {
      throw new Error('Unexpected response format from backend');
    }
    
  } catch (error) {
    // Handle network errors
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Network error. Check your internet connection.');
    }
    
    // Re-throw other errors
    throw error;
  }
}

// ==================== FOR content.js ====================

/**
 * Call backend proxy with user message from chat panel
 * 
 * SECURITY NOTE:
 * - No API key management needed
 * - Backend handles all authentication
 * - Cleaner user experience
 * 
 * @param {string} userMessage - User's chat message
 * @returns {Promise<string>} AI response
 */
async function callHuggingFaceAPI(userMessage) {
  // Detect current page mode for context
  const mode = detectPageMode(window.location.href);
  
  try {
    // Call backend proxy
    const response = await fetch(BACKEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        mode: mode,
      }),
    });
    
    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json();
      
      // User-friendly error messages
      if (errorData.code === 'MODEL_LOADING') {
        throw new Error('🔄 AI model is loading. Please wait 20-30 seconds and try again.');
      } else if (errorData.code === 'RATE_LIMIT') {
        throw new Error('⏱️ Too many requests. Please wait a moment.');
      } else if (errorData.code === 'TIMEOUT') {
        throw new Error('⏰ Request timed out. Please try again.');
      } else if (errorData.code === 'SERVICE_ERROR') {
        throw new Error('⚠️ AI service temporarily unavailable. Please try again later.');
      } else {
        throw new Error('⚠️ ' + (errorData.error || 'Backend error occurred'));
      }
    }
    
    // Parse successful response
    const data = await response.json();
    
    if (data.success && data.response) {
      return data.response;
    } else {
      throw new Error('⚠️ Unexpected response format');
    }
    
  } catch (error) {
    // Handle network errors
    if (error.message.includes('Failed to fetch')) {
      throw new Error('🌐 Network error. Check your internet connection.');
    }
    
    // Re-throw other errors
    throw error;
  }
}

// ==================== INSTALLATION INSTRUCTIONS ====================

/**
 * HOW TO UPDATE YOUR EXTENSION:
 * 
 * 1. Deploy backend first:
 *    cd C:\dev\Meow\backend
 *    wrangler secret put HUGGINGFACE_API_KEY
 *    npm run deploy
 * 
 * 2. Copy your worker URL from deployment output:
 *    Example: https://meow-ai-backend.abc123.workers.dev
 * 
 * 3. Update BACKEND_API_URL constant above with YOUR URL
 * 
 * 4. Replace callHuggingFaceAPI function in popup.js:
 *    - Open: C:\dev\Meow\popup.js
 *    - Find: async function callHuggingFaceAPI(text, title, mode)
 *    - Replace entire function with version above
 * 
 * 5. Replace callHuggingFaceAPI function in content.js:
 *    - Open: C:\dev\Meow\content.js
 *    - Find: async function callHuggingFaceAPI(userMessage)
 *    - Replace entire function with version above
 * 
 * 6. OPTIONAL: Remove API key management code (since backend handles it)
 *    - Remove from popup.js:
 *      • isValidApiKeyFormat()
 *      • saveApiKey()
 *      • getApiKey()
 *      • hasApiKey()
 *      • All setup/settings screen logic
 *    - Remove from popup.html:
 *      • Setup screen HTML
 *      • Settings screen HTML
 *      • Keep only main screen
 *    - Remove from content.js:
 *      • getApiKey() function
 * 
 * 7. Reload extension in Chrome:
 *    chrome://extensions → Meow AI → Reload button
 * 
 * 8. Test:
 *    - Click extension icon
 *    - Click "Explain This Page"
 *    - Should get AI response without entering API key!
 */

// ==================== EXAMPLE: SIMPLIFIED popup.html ====================

/**
 * Optional: Simplify popup.html since users don't need to configure API keys anymore
 * 
 * Replace popup.html with:
 * 
 * <!DOCTYPE html>
 * <html lang="en">
 * <head>
 *   <meta charset="UTF-8">
 *   <title>Meow AI</title>
 *   <link rel="stylesheet" href="style.css">
 * </head>
 * <body>
 *   <div class="container">
 *     <header>
 *       <h1>🐱 Meow AI</h1>
 *       <p class="subtitle">Your AI Developer Copilot</p>
 *       <div id="modeDisplay" class="mode-display"></div>
 *     </header>
 * 
 *     <div class="action-section">
 *       <button id="explainBtn" class="primary-btn">
 *         Explain This Page
 *       </button>
 *     </div>
 * 
 *     <div id="results" class="results-section"></div>
 *   </div>
 * 
 *   <script src="popup.js"></script>
 * </body>
 * </html>
 * 
 * Benefits:
 * - Cleaner UI
 * - Zero setup for users
 * - Professional experience
 * - Easier to maintain
 */

// ==================== TESTING ====================

/**
 * Test backend integration:
 * 
 * 1. Open Chrome DevTools (F12)
 * 2. Go to Console tab
 * 3. Paste and run:
 */

async function testBackend() {
  const BACKEND_URL = 'https://meow-ai-backend.YOUR-SUBDOMAIN.workers.dev/api/chat';
  
  console.log('Testing backend...');
  
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Test from extension' }),
    });
    
    const data = await response.json();
    console.log('✅ Backend test successful:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Backend test failed:', error);
    throw error;
  }
}

// testBackend();

// ==================== MIGRATION CHECKLIST ====================

/**
 * Backend Deployment Checklist:
 * 
 * [ ] 1. Wrangler CLI installed (npm install -g wrangler)
 * [ ] 2. Logged into Cloudflare (wrangler login)
 * [ ] 3. API key set as secret (wrangler secret put HUGGINGFACE_API_KEY)
 * [ ] 4. Backend deployed (npm run deploy)
 * [ ] 5. Worker URL copied
 * [ ] 6. BACKEND_API_URL updated in this file
 * [ ] 7. popup.js updated with new function
 * [ ] 8. content.js updated with new function
 * [ ] 9. Extension reloaded in Chrome
 * [ ] 10. End-to-end test completed
 * 
 * Extension Update Checklist:
 * 
 * [ ] 1. Remove hardcoded Hugging Face API calls
 * [ ] 2. Update both callHuggingFaceAPI functions
 * [ ] 3. Remove API key management code (optional)
 * [ ] 4. Simplify popup.html (optional)
 * [ ] 5. Test in Chrome
 * [ ] 6. Verify no API keys visible in Network tab
 * [ ] 7. Verify AI responses working
 * [ ] 8. Check error handling
 * [ ] 9. Update README.md
 * [ ] 10. Create new .zip for Chrome Web Store
 */
