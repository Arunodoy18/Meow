/**
 * Meow AI - Content Script
 * Side Chat Panel with AI Integration
 * 
 * ARCHITECTURE:
 * - Backend proxy: Cloudflare Workers (handles API authentication)
 * - Frontend: Chrome Extension (zero setup for users)
 * - AI Model: Mistral-7B-Instruct via Hugging Face Inference API
 * - Security: API keys stored as encrypted environment secrets server-side
 */

// ==================== API CONFIGURATION ====================
// SECURITY: API calls go through secure Cloudflare Workers backend
// API key is stored as encrypted environment secret on server (never exposed to users)
const BACKEND_API_URL = 'https://meow-ai-backend.meow-ai-arunodoy.workers.dev/api/chat';

// ==================== SITE CONTROL SYSTEM ====================
const SITE_CONTROL_KEY = 'meow_ai_site_control';

/**
 * Site control storage structure:
 * {
 *   "example.com": {
 *     disabled: true,
 *     disabledUntil: timestamp | null,
 *     permanently: boolean
 *   }
 * }
 */
function getSiteDomain() {
  return window.location.hostname;
}

function getSiteControl() {
  try {
    const data = localStorage.getItem(SITE_CONTROL_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

function setSiteControl(domain, settings) {
  try {
    const control = getSiteControl();
    control[domain] = settings;
    localStorage.setItem(SITE_CONTROL_KEY, JSON.stringify(control));
  } catch (e) {
    console.error('Failed to save site control:', e);
  }
}

function isSiteDisabled() {
  const domain = getSiteDomain();
  const control = getSiteControl();
  const site = control[domain];
  
  if (!site || !site.disabled) return false;
  
  // Check if temporary disable expired
  if (!site.permanently && site.disabledUntil) {
    if (Date.now() > site.disabledUntil) {
      // Re-enable site
      delete control[domain];
      localStorage.setItem(SITE_CONTROL_KEY, JSON.stringify(control));
      return false;
    }
  }
  
  return true;
}

function disableSite(temporarily = false) {
  const domain = getSiteDomain();
  const settings = {
    disabled: true,
    disabledUntil: temporarily ? Date.now() + (24 * 60 * 60 * 1000) : null,
    permanently: !temporarily
  };
  setSiteControl(domain, settings);
}

function enableSite() {
  const domain = getSiteDomain();
  const control = getSiteControl();
  delete control[domain];
  localStorage.setItem(SITE_CONTROL_KEY, JSON.stringify(control));
}

// ==================== CHAT STATE ====================
let chatMessages = [];      // For UI display: [{type: 'user'|'ai', content: string, timestamp: Date}]
let chatHistory = [];        // For API memory: [{role: 'user'|'assistant', content: string}]
let chatPanel = null;
let toggleButton = null;
let settingsMenu = null;
let isPanelOpen = false;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// Memory configuration
const MAX_HISTORY_SIZE = 20;     // Maximum messages to keep in memory
const CONTEXT_WINDOW_SIZE = 6;   // Number of recent messages to send to API

/**
 * Extract visible page content for AI context
 */
function extractPageContent() {
  try {
    const title = document.title || 'Untitled Page';
    const bodyText = document.body.innerText || '';
    const cleanedText = bodyText
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
    
    return {
      title: title,
      url: window.location.href,
      textContent: cleanedText.substring(0, 3000)
    };
  } catch (error) {
    console.error('🐱 Error extracting content:', error);
    return { title: 'Error', url: window.location.href, textContent: '' };
  }
}

/**
 * Detect page mode based on URL
 */
function detectPageMode(url) {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('github.com') && urlLower.includes('/pull')) return 'PR Review';
  if (urlLower.includes('github.com')) return 'GitHub Analysis';
  if (urlLower.includes('linkedin.com/jobs')) return 'Job Analysis';
  if (urlLower.includes('leetcode.com')) return 'DSA Problem Mode';
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'Learning Mode';
  return 'General Analysis';
}

/**
 * Get elite system prompt for current mode
 */
function getSystemPrompt(mode) {
  const prompts = {
    'PR Review': 'You are Meow AI - an elite code reviewer. Provide: SUMMARY, KEY CONCERNS, STRENGTHS, IMPROVEMENTS, MERGE RECOMMENDATION. Be concise and actionable.',
    'GitHub Analysis': 'You are Meow AI - a senior engineering analyst. Provide: SUMMARY, TECHNICAL DEPTH, WHY THIS MATTERS, KEY TAKEAWAY. Be insightful.',
    'Job Analysis': 'You are Meow AI - an elite career strategist. Provide: ROLE SUMMARY, SKILL GAP ANALYSIS, COMPETITIVE ADVANTAGE, NEXT STEPS. Be strategic.',
    'DSA Problem Mode': 'You are Meow AI - an elite CS tutor. Guide with hints. Provide: PROBLEM TYPE, KEY INSIGHT, APPROACH HINT, COMPLEXITY ANALYSIS. Teach, don\'t solve.',
    'Learning Mode': 'You are Meow AI - an elite technical educator. Provide: CORE CONCEPTS, KEY TAKEAWAYS, PRACTICAL APPLICATION, LEARN NEXT. Focus on retention.',
    'General Analysis': 'You are Meow AI - a senior technical analyst. Provide: SUMMARY, KEY INSIGHT, PRACTICAL VALUE. Be clear and actionable.'
  };
  return prompts[mode] || prompts['General Analysis'];
}

/**
 * Call Hugging Face Inference API with conversation memory
 * Uses managed chat history for contextual responses
 * @param {string} userMessage - The latest user message
 * @returns {Promise<string>} AI-generated response
 */
async function callHuggingFaceAPI(userMessage) {
  try {
    // ==================== BUILD CONVERSATION CONTEXT ====================
    // Get recent conversation history (last N messages)
    const recentHistory = getRecentHistory();
    
    let conversationContext = '';
    
    // Build conversation string from recent history
    recentHistory.forEach(msg => {
      if (msg.role === 'user') {
        conversationContext += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        conversationContext += `Assistant: ${msg.content}\n`;
      }
    });
    
    // Add current user message (already added to history before this call)
    conversationContext += `Assistant:`;
    
    console.log(`🐱 API called with ${recentHistory.length} messages in context`);
    
    // ==================== GET PAGE CONTEXT ====================
    const pageData = extractPageContent();
    const mode = detectPageMode(pageData.url);
    const systemPrompt = getSystemPrompt(mode);
    
    // ==================== BUILD FINAL PROMPT ====================
    // Check if this is first message and asking about page
    const isFirstMessage = chatHistory.length === 1; // Only user message so far
    const isPageQuery = userMessage.toLowerCase().includes('page') || 
                       userMessage.toLowerCase().includes('this') ||
                       userMessage.toLowerCase().includes('explain') ||
                       userMessage.toLowerCase().includes('analyze');
    
    let finalPrompt;
    
    if (isFirstMessage && isPageQuery) {
      // First message asking about page - include full context
      finalPrompt = `[INST] ${systemPrompt}

Page Title: ${pageData.title}
Mode: ${mode}

Page Content:
${pageData.textContent.substring(0, 2000)}

User Question: ${userMessage}

Provide elite-level analysis. [/INST]`;
    } else {
      // Conversational message - use history context
      finalPrompt = `[INST] You are Meow AI - an elite developer and career copilot.

Conversation history:
${conversationContext}

Continue the conversation naturally. Provide senior-level insights for technical topics. [/INST]`;
    }
    
    // ==================== MAKE API REQUEST ====================
    console.log('🐱 Calling Backend API...');
    
    // Call backend proxy instead of Hugging Face directly
    const response = await fetch(BACKEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: userMessage,
        mode: mode
      })
    });
    
    // ==================== HANDLE API RESPONSE ====================
    if (!response.ok) {
      // Handle specific error codes
      if (response.status === 503) {
        return 'AI model is loading. Please try again in 20-30 seconds.';
      } else if (response.status === 500) {
        return 'Backend server error. Please try again later.';
      } else if (response.status === 429) {
        return 'Rate limit reached. Please wait a moment.';
      } else {
        throw new Error(`API returned status ${response.status}`);
      }
    }
    
    const data = await response.json();
    console.log('🐱 API Response received');
    
    // ==================== EXTRACT GENERATED TEXT ====================
    if (data.success && data.response) {
      return data.response.trim();
    } else if (data.error) {
      return `Error: ${data.error}`;
    } else {
      throw new Error('Unexpected API response format');
    }
    
  } catch (error) {
    // ==================== ERROR HANDLING ====================
    console.error('🐱 Hugging Face API Error:', error);
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return 'Meow AI is having trouble connecting. Check your internet connection.';
    }
    
    return 'Meow AI is having trouble responding. Try again.';
  }
}

/**
 * Inject chat panel styles
 */
function injectChatStyles() {
  const styleId = 'meow-ai-chat-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Meow AI Toggle Button */
    .meow-chat-toggle {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
      cursor: pointer;
      z-index: 999999;
      font-size: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      color: white;
    }
    
    .meow-chat-toggle:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 24px rgba(102, 126, 234, 0.6);
    }
    
    .meow-chat-toggle.panel-open {
      right: 374px;
    }

    /* Meow AI Chat Panel */
    .meow-chat-panel {
      position: fixed;
      top: 0;
      right: -400px;
      width: 380px;
      height: 100vh;
      background: white;
      box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
      z-index: 999998;
      display: flex;
      flex-direction: column;
      transition: right 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    .meow-chat-panel.open {
      right: 0;
    }

    /* Chat Header */
    .meow-chat-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .meow-chat-header-title {
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .meow-chat-close {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      opacity: 0.8;
      transition: opacity 0.2s;
      padding: 0;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .meow-chat-close:hover {
      opacity: 1;
    }

    /* Chat Messages Container */
    .meow-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #f8f9fa;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Message Bubbles */
    .meow-message {
      display: flex;
      flex-direction: column;
      max-width: 85%;
      animation: messageSlide 0.3s ease;
    }

    @keyframes messageSlide {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .meow-message.user {
      align-self: flex-end;
    }

    .meow-message.ai {
      align-self: flex-start;
    }

    .meow-message-bubble {
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
      white-space: pre-wrap;
    }

    .meow-message.user .meow-message-bubble {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .meow-message.ai .meow-message-bubble {
      background: white;
      color: #333;
      border: 1px solid #e0e0e0;
      border-bottom-left-radius: 4px;
    }

    .meow-message-time {
      font-size: 11px;
      color: #999;
      margin-top: 4px;
      padding: 0 4px;
    }

    .meow-message.user .meow-message-time {
      text-align: right;
    }

    /* Thinking Indicator */
    .meow-thinking {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
    }

    .meow-thinking-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #667eea;
      animation: thinkingBounce 1.4s infinite ease-in-out both;
    }

    .meow-thinking-dot:nth-child(1) { animation-delay: -0.32s; }
    .meow-thinking-dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes thinkingBounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    /* Welcome Message */
    .meow-welcome {
      text-align: center;
      padding: 40px 20px;
      color: #666;
    }

    .meow-welcome-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .meow-welcome-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }

    .meow-welcome-text {
      font-size: 13px;
      line-height: 1.6;
    }

    .meow-quick-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
    }

    .meow-quick-btn {
      padding: 10px 16px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
      text-align: left;
    }

    .meow-quick-btn:hover {
      border-color: #667eea;
      background: #f0f4ff;
    }

    /* Chat Input */
    .meow-chat-input {
      padding: 16px 20px;
      background: white;
      border-top: 1px solid #e0e0e0;
      flex-shrink: 0;
    }

    .meow-input-wrapper {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .meow-chat-textarea {
      flex: 1;
      padding: 12px 14px;
      border: 1px solid #ddd;
      border-radius: 12px;
      font-size: 14px;
      font-family: inherit;
      resize: none;
      max-height: 120px;
      transition: border-color 0.2s;
    }

    .meow-chat-textarea:focus {
      outline: none;
      border-color: #667eea;
    }

    .meow-send-btn {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .meow-send-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .meow-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    /* Scrollbar Styling */
    .meow-chat-messages::-webkit-scrollbar {
      width: 6px;
    }

    .meow-chat-messages::-webkit-scrollbar-track {
      background: transparent;
    }

    .meow-chat-messages::-webkit-scrollbar-thumb {
      background: #ccc;
      border-radius: 3px;
    }

    .meow-chat-messages::-webkit-scrollbar-thumb:hover {
      background: #999;
    }
    
    /* Settings Menu */
    .meow-settings-menu {
      position: fixed;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      z-index: 1000000;
      min-width: 200px;
      padding: 8px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    .meow-settings-item {
      padding: 12px 16px;
      cursor: pointer;
      font-size: 14px;
      color: #333;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .meow-settings-item:hover {
      background: #f5f5f5;
    }
    
    .meow-settings-item:active {
      background: #e0e0e0;
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Add a message to chat history for API memory
 * Maintains conversation context with size limits
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content - Message content
 */
function addToHistory(role, content) {
  // Add new message to history
  chatHistory.push({
    role: role,
    content: content
  });
  
  // ==================== MEMORY SIZE MANAGEMENT ====================
  // If history exceeds max size, remove oldest messages
  if (chatHistory.length > MAX_HISTORY_SIZE) {
    const overflow = chatHistory.length - MAX_HISTORY_SIZE;
    chatHistory.splice(0, overflow);
    console.log(`🐱 Memory trimmed: Removed ${overflow} old messages`);
  }
  
  console.log(`🐱 History updated: ${chatHistory.length} messages in memory`);
}

/**
 * Get recent conversation history for API context
 * @returns {Array} Last N messages from history
 */
function getRecentHistory() {
  // Return last CONTEXT_WINDOW_SIZE messages
  return chatHistory.slice(-CONTEXT_WINDOW_SIZE);
}

/**
 * Add a message to chat UI display
 * @param {string} type - 'user' or 'ai'
 * @param {string} content - Message content
 */
function addMessage(type, content) {
  const message = {
    type: type,
    content: content,
    timestamp: new Date()
  };
  chatMessages.push(message);
  renderMessages();
}

/**
 * Render all messages in chat
 */
function renderMessages() {
  const messagesContainer = chatPanel.querySelector('.meow-chat-messages');
  
  // Clear existing messages except welcome
  const welcome = messagesContainer.querySelector('.meow-welcome');
  messagesContainer.innerHTML = '';
  
  // Show welcome if no messages
  if (chatMessages.length === 0 && welcome) {
    messagesContainer.appendChild(welcome);
    return;
  }
  
  // Render messages
  chatMessages.forEach(msg => {
    const messageEl = document.createElement('div');
    messageEl.className = `meow-message ${msg.type}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'meow-message-bubble';
    bubble.textContent = msg.content;
    
    messageEl.appendChild(bubble);
    messagesContainer.appendChild(messageEl);
  });
  
  // Auto-scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Main chat flow: user message → thinking indicator → API call → AI response
 */
async function handleSendMessage() {
  const textarea = chatPanel.querySelector('.meow-chat-textarea');
  const sendBtn = chatPanel.querySelector('.meow-send-btn');
  const userMessage = textarea.value.trim();
  
  // Validate input
  if (!userMessage) return;
  
  // ==================== STEP 1: ADD USER MESSAGE ====================
  addMessage('user', userMessage);
  
  // Clear and reset input
  textarea.value = '';
  textarea.style.height = 'auto';
  
  // ==================== STEP 2: DISABLE INPUT ====================
  textarea.disabled = true;
  sendBtn.disabled = true;
  
  // ==================== STEP 3: SHOW THINKING INDICATOR ====================
  const thinkingEl = showThinking();
  
  try {
    // ==================== STEP 4: CALL HUGGING FACE API ====================
    // Pass user message and chat history (excluding the just-added user message)
    const chatHistory = chatMessages.slice(0, -1);
    const aiResponse = await callHuggingFaceAPI(userMessage, chatHistory);
    
    // ==================== STEP 5: REMOVE THINKING & SHOW AI RESPONSE ====================
    removeThinking();
    addMessage('ai', aiResponse);
    
    console.log('🐱 Chat exchange completed successfully');
    
  } catch (error) {
    // ==================== ERROR HANDLING ====================
    console.error('🐱 Chat error:', error);
    removeThinking();
    addMessage('ai', 'Meow AI is having trouble responding. Try again.');
  } finally {
    // ==================== STEP 6: RE-ENABLE INPUT ====================
    textarea.disabled = false;
    sendBtn.disabled = false;
    textarea.focus();
  }
}

/**
 * Show thinking indicator while waiting for AI response
 */
function showThinking() {
  const messagesContainer = chatPanel.querySelector('.meow-chat-messages');
  
  const thinkingEl = document.createElement('div');
  thinkingEl.className = 'meow-message meow-thinking-message';
  thinkingEl.innerHTML = `
    <div class="meow-message-bubble">
      <span class="meow-thinking-dots">
        <span>.</span><span>.</span><span>.</span>
      </span>
      Thinking...
    </div>
  `;
  
  messagesContainer.appendChild(thinkingEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  return thinkingEl;
}

/**
 * Remove thinking indicator
 */
function removeThinking() {
  const thinkingEl = chatPanel.querySelector('.meow-thinking-message');
  if (thinkingEl) {
    thinkingEl.remove();
  }
}

/**
 * Handle sending a message in the chat
 * Main chat flow with conversation memory management
 */
async function handleSendMessage() {
  const textarea = chatPanel.querySelector('.meow-chat-textarea');
  const sendBtn = chatPanel.querySelector('.meow-send-btn');
  const userMessage = textarea.value.trim();
  
  // Validate input
  if (!userMessage) return;
  
  // ==================== STEP 1: ADD USER MESSAGE TO UI ====================
  addMessage('user', userMessage);
  
  // ==================== STEP 2: ADD USER MESSAGE TO MEMORY ====================
  addToHistory('user', userMessage);
  
  // Clear and reset input
  textarea.value = '';
  textarea.style.height = 'auto';
  
  // ==================== STEP 3: DISABLE INPUT ====================
  textarea.disabled = true;
  sendBtn.disabled = true;
  
  // ==================== STEP 4: SHOW THINKING INDICATOR ====================
  const thinkingEl = showThinking();
  
  try {
    // ==================== STEP 5: CALL API WITH MEMORY ====================
    // API function now uses managed chatHistory internally
    const aiResponse = await callHuggingFaceAPI(userMessage);
    
    // ==================== STEP 6: ADD AI RESPONSE TO MEMORY ====================
    addToHistory('assistant', aiResponse);
    
    // ==================== STEP 7: SHOW AI RESPONSE IN UI ====================
    removeThinking();
    addMessage('ai', aiResponse);
    
    console.log('🐱 Chat exchange completed | Total messages in memory:', chatHistory.length);
    
  } catch (error) {
    // ==================== ERROR HANDLING ====================
    console.error('🐱 Chat error:', error);
    removeThinking();
    
    const errorMessage = 'Meow AI is having trouble responding. Try again.';
    addMessage('ai', errorMessage);
    
    // Add error to history so conversation stays consistent
    addToHistory('assistant', errorMessage);
    
  } finally {
    // ==================== STEP 8: RE-ENABLE INPUT ====================
    textarea.disabled = false;
    sendBtn.disabled = false;
    textarea.focus();
  }
}

/**
 * Create chat panel UI
 */
function createChatPanel() {
  // Create toggle button (draggable)
  toggleButton = document.createElement('button');
  toggleButton.className = 'meow-chat-toggle';
  toggleButton.innerHTML = '🐱';
  toggleButton.title = 'Meow AI Assistant (drag to move)';
  
  // Make button draggable
  makeButtonDraggable();
  
  // Create settings menu
  createSettingsMenu();
  
  // Create chat panel
  chatPanel = document.createElement('div');
  chatPanel.className = 'meow-chat-panel';
  
  const mode = detectPageMode(window.location.href);
  
  chatPanel.innerHTML = `
    <div class="meow-chat-header">
      <div class="meow-chat-header-title">
        <span>Meow AI</span>
        <span>🐱</span>
      </div>
      <button class="meow-chat-close" title="Close">×</button>
    </div>
    
    <div class="meow-chat-messages">
      <div class="meow-welcome">
        <div class="meow-welcome-icon">🐱</div>
        <div class="meow-welcome-title">Hey! I'm Meow AI</div>
        <div class="meow-welcome-text">
          Your elite developer and career copilot.<br>
          Current mode: <strong>${mode}</strong>
        </div>
        <div class="meow-quick-actions">
          <button class="meow-quick-btn" data-action="explain">📄 Explain this page</button>
          <button class="meow-quick-btn" data-action="summarize">✨ Key insights</button>
          <button class="meow-quick-btn" data-action="help">💡 How can you help?</button>
        </div>
      </div>
    </div>
    
    <div class="meow-chat-input">
      <div class="meow-input-wrapper">
        <textarea 
          class="meow-chat-textarea" 
          placeholder="Ask me anything..."
          rows="1"
        ></textarea>
        <button class="meow-send-btn" title="Send">➤</button>
      </div>
    </div>
  `;
  
  // Append to body
  document.body.appendChild(toggleButton);
  document.body.appendChild(settingsMenu);
  document.body.appendChild(chatPanel);
  
  // Add event listeners
  setupEventListeners();
  
  // Load saved button position
  loadButtonPosition();
}

/**
 * Create settings menu (gear icon on toggle button)
 */
function createSettingsMenu() {
  settingsMenu = document.createElement('div');
  settingsMenu.className = 'meow-settings-menu';
  settingsMenu.style.display = 'none';
  
  settingsMenu.innerHTML = `
    <div class="meow-settings-item" data-action="disable-site">
      🚫 Disable for this site
    </div>
    <div class="meow-settings-item" data-action="disable-24h">
      ⏰ Disable for 24 hours
    </div>
  `;
}

/**
 * Make toggle button draggable
 */
function makeButtonDraggable() {
  toggleButton.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDrag);
}

function startDrag(e) {
  // Right-click for settings menu
  if (e.button === 2) {
    e.preventDefault();
    showSettingsMenu(e);
    return;
  }
  
  // Only drag with left click
  if (e.button !== 0) return;
  
  const rect = toggleButton.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;
  
  // Small movement threshold to distinguish click from drag
  const startX = e.clientX;
  const startY = e.clientY;
  
  const checkDrag = (moveEvent) => {
    const distance = Math.sqrt(
      Math.pow(moveEvent.clientX - startX, 2) + 
      Math.pow(moveEvent.clientY - startY, 2)
    );
    if (distance > 5) {
      isDragging = true;
      toggleButton.style.cursor = 'grabbing';
      document.removeEventListener('mousemove', checkDrag);
    }
  };
  
  document.addEventListener('mousemove', checkDrag);
  setTimeout(() => document.removeEventListener('mousemove', checkDrag), 200);
}

function drag(e) {
  if (!isDragging) return;
  
  e.preventDefault();
  
  let x = e.clientX - dragOffset.x;
  let y = e.clientY - dragOffset.y;
  
  // Keep within viewport bounds
  const maxX = window.innerWidth - toggleButton.offsetWidth;
  const maxY = window.innerHeight - toggleButton.offsetHeight;
  
  x = Math.max(0, Math.min(x, maxX));
  y = Math.max(0, Math.min(y, maxY));
  
  toggleButton.style.right = 'auto';
  toggleButton.style.bottom = 'auto';
  toggleButton.style.left = x + 'px';
  toggleButton.style.top = y + 'px';
}

function stopDrag() {
  if (isDragging) {
    isDragging = false;
    toggleButton.style.cursor = 'pointer';
    saveButtonPosition();
  }
}

function saveButtonPosition() {
  try {
    const pos = {
      left: toggleButton.style.left,
      top: toggleButton.style.top
    };
    localStorage.setItem('meow_button_position', JSON.stringify(pos));
  } catch (e) {
    console.error('Failed to save button position:', e);
  }
}

function loadButtonPosition() {
  try {
    const saved = localStorage.getItem('meow_button_position');
    if (saved) {
      const pos = JSON.parse(saved);
      if (pos.left && pos.top) {
        toggleButton.style.right = 'auto';
        toggleButton.style.bottom = 'auto';
        toggleButton.style.left = pos.left;
        toggleButton.style.top = pos.top;
      }
    }
  } catch (e) {
    console.error('Failed to load button position:', e);
  }
}

function showSettingsMenu(e) {
  e.preventDefault();
  
  // Position menu near button
  const rect = toggleButton.getBoundingClientRect();
  settingsMenu.style.left = (rect.left - 180) + 'px';
  settingsMenu.style.top = rect.top + 'px';
  settingsMenu.style.display = 'block';
  
  // Close on click outside
  setTimeout(() => {
    const closeMenu = (event) => {
      if (!settingsMenu.contains(event.target) && event.target !== toggleButton) {
        settingsMenu.style.display = 'none';
        document.removeEventListener('click', closeMenu);
      }
    };
    document.addEventListener('click', closeMenu);
  }, 10);
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  const closeBtn = chatPanel.querySelector('.meow-chat-close');
  const sendBtn = chatPanel.querySelector('.meow-send-btn');
  const textarea = chatPanel.querySelector('.meow-chat-textarea');
  const quickBtns = chatPanel.querySelectorAll('.meow-quick-btn');
  
  // Toggle button - only toggle panel if not dragging
  toggleButton.addEventListener('click', (e) => {
    if (!isDragging) {
      togglePanel();
    }
  });
  
  // Right-click menu
  toggleButton.addEventListener('contextmenu', showSettingsMenu);
  
  // Settings menu handlers
  const settingsItems = settingsMenu.querySelectorAll('.meow-settings-item');
  settingsItems.forEach(item => {
    item.addEventListener('click', handleSettingsAction);
  });
  
  // Close button
  closeBtn.addEventListener('click', closePanel);
  
  // Send button
  sendBtn.addEventListener('click', handleSendMessage);
  
  // Textarea enter key
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
  
  // Auto-resize textarea
  textarea.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });
  
  // Quick action buttons
  quickBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      
      if (action === 'explain') {
        textarea.value = 'Explain this page in detail';
      } else if (action === 'summarize') {
        textarea.value = 'Give me the key insights from this page';
      } else if (action === 'help') {
        textarea.value = 'What can you help me with?';
      }
      
      handleSendMessage();
    });
  });
}

/**
 * Toggle panel open/close
 */
function togglePanel() {
  if (isPanelOpen) {
    closePanel();
  } else {
    openPanel();
  }
}

/**
 * Open chat panel
 */
function openPanel() {
  chatPanel.classList.add('open');
  toggleButton.classList.add('panel-open');
  isPanelOpen = true;
  
  // Focus textarea
  const textarea = chatPanel.querySelector('.meow-chat-textarea');
  setTimeout(() => textarea.focus(), 300);
}

/**
 * Close chat panel
 */
function closePanel() {
  chatPanel.classList.remove('open');
  toggleButton.classList.remove('panel-open');
  isPanelOpen = false;
}

function handleSettingsAction(e) {
  const action = e.currentTarget.dataset.action;
  
  settingsMenu.style.display = 'none';
  
  if (action === 'disable-site') {
    disableSite(false);
    if (toggleButton) toggleButton.remove();
    if (chatPanel) chatPanel.remove();
    if (settingsMenu) settingsMenu.remove();
    alert('🐱 Meow AI disabled for this site.\nRefresh to enable again.');
  } else if (action === 'disable-24h') {
    disableSite(true);
    if (toggleButton) toggleButton.remove();
    if (chatPanel) chatPanel.remove();
    if (settingsMenu) settingsMenu.remove();
    alert('🐱 Meow AI disabled for 24 hours.\nWill re-enable automatically.');
  }
}

/**
 * Initialize chat UI
 */
function initChatUI() {
  // Check if site is disabled
  if (isSiteDisabled()) {
    return;
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectChatStyles();
      createChatPanel();
    });
  } else {
    injectChatStyles();
    createChatPanel();
  }
}

// Initialize with crash protection
try {
  initChatUI();
} catch (error) {
  console.error('Meow AI initialization failed:', error);
}

/**
 * Listen for messages from popup (CRASH-SAFE for demo)
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'getPageContent') {
      const content = extractPageContent();
      sendResponse({ success: true, data: content });
    } else {
      sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('🐱 Message handler error:', error);
    sendResponse({ success: false, error: error.message });
  }
  return true; // Keep channel open for async response
});
