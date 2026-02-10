/**
 * Meow AI - Widget Orchestrator
 * Main entry point: wires all modules together.
 * Handles init, keyboard shortcuts, API calls, SPA nav,
 * and chrome.runtime messaging.
 */

(() => {
  'use strict';

  // ==================== CONFIG ====================

  const BACKEND_API_URL = 'https://meow-ai-backend.meow-ai-arunodoy.workers.dev/api/chat';
  const MAX_HISTORY_SIZE = 20;
  const CONTEXT_WINDOW_SIZE = 6;

  // ==================== STATE ====================

  let chatHistory = [];   // API memory: [{role, content}]
  let isProcessing = false;

  // ==================== API ====================

  function addToHistory(role, content) {
    chatHistory.push({ role, content });
    if (chatHistory.length > MAX_HISTORY_SIZE) {
      chatHistory.splice(0, chatHistory.length - MAX_HISTORY_SIZE);
    }
  }

  function getRecentHistory() {
    return chatHistory.slice(-CONTEXT_WINDOW_SIZE);
  }

  /**
   * Call backend API with conversation context
   */
  async function callBackendAPI(userMessage) {
    const pageData = MeowPageExtractor.extractPageContent();
    const mode = pageData.mode;
    const systemPrompt = MeowPageExtractor.getSystemPrompt(mode);

    // Build conversation context
    let conversationContext = '';
    getRecentHistory().forEach(msg => {
      conversationContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });

    // Determine if page context should be included
    const isFirstMsg = chatHistory.length <= 1;
    const wantsPage = MeowPageExtractor.isPageQuery(userMessage);

    let message;
    if (isFirstMsg && wantsPage) {
      message = `${systemPrompt}\n\nPage Title: ${pageData.title}\nMode: ${mode}\n\nPage Content:\n${pageData.textContent.substring(0, 3000)}\n\nUser Question: ${userMessage}\n\nProvide elite-level analysis.`;
    } else if (wantsPage) {
      message = `Page Title: ${pageData.title}\n${pageData.textContent.substring(0, 2000)}\n\nConversation:\n${conversationContext}\nUser: ${userMessage}`;
    } else {
      message = userMessage;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const response = await fetch(BACKEND_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, mode }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const statusMessages = {
          429: 'Rate limit reached. Please wait a moment.',
          500: 'Backend error. Please try again later.',
          503: 'AI model is loading. Try again in 20 seconds.'
        };
        return statusMessages[response.status] || `Error: Server returned ${response.status}`;
      }

      const data = await response.json();
      if (data.success && data.response) {
        return data.response.trim();
      }
      return data.error || 'Unexpected response format.';

    } catch (error) {
      if (error.name === 'AbortError') {
        return 'Request timed out. The AI took too long to respond. Try again.';
      }
      if (!navigator.onLine) {
        return 'You appear to be offline. Check your connection and try again.';
      }
      console.error('🐱 API error:', error);
      return 'Meow AI is having trouble responding. Try again.';
    }
  }

  // ==================== SEND MESSAGE FLOW ====================

  async function handleSendMessage(userMessage) {
    if (isProcessing || !userMessage) return;
    isProcessing = true;

    // 1. Show user message
    MeowChatUI.addMessage('user', userMessage);
    addToHistory('user', userMessage);

    // 2. Disable input, show typing
    MeowChatUI.setInputEnabled(false);
    MeowChatUI.showTyping();

    try {
      // 3. Call API
      const aiResponse = await callBackendAPI(userMessage);

      // 4. Show response
      MeowChatUI.hideTyping();
      MeowChatUI.addMessage('ai', aiResponse);
      addToHistory('assistant', aiResponse);

    } catch (error) {
      console.error('🐱 Chat error:', error);
      MeowChatUI.hideTyping();
      const errMsg = 'Meow AI is having trouble responding. Try again.';
      MeowChatUI.addMessage('ai', errMsg);
      addToHistory('assistant', errMsg);
    } finally {
      MeowChatUI.setInputEnabled(true);
      isProcessing = false;
    }
  }

  // ==================== DISABLE HANDLER ====================

  async function handleDisable(action) {
    if (action === 'disable-24h') {
      await MeowStorage.disableSite(true);
      MeowChatUI.destroy();
      MeowDrag.destroy();
    } else if (action === 'disable-site') {
      await MeowStorage.disableSite(false);
      MeowChatUI.destroy();
      MeowDrag.destroy();
    }
  }

  // ==================== KEYBOARD SHORTCUTS ====================

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // ALT + M → toggle panel
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        MeowChatUI.togglePanel();
      }

      // Escape → close panel
      if (e.key === 'Escape' && MeowChatUI.isPanelOpen()) {
        MeowChatUI.closePanel();
      }
    });
  }

  // ==================== SPA NAVIGATION ====================

  function setupSPAWatcher() {
    MeowPageExtractor.initSPAWatcher();
    MeowPageExtractor.onNavigate((url) => {
      const newMode = MeowPageExtractor.detectPageMode(url);
      MeowChatUI.updateMode(newMode);
      console.log('🐱 SPA navigation detected → mode:', newMode);
    });
  }

  // ==================== CHROME RUNTIME MESSAGING ====================

  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        if (request.action === 'getPageContent') {
          const content = MeowPageExtractor.extractPageContent();
          sendResponse({ success: true, data: content });
        } else {
          sendResponse({ success: false, error: 'Unknown action' });
        }
      } catch (error) {
        console.error('🐱 Message handler error:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    });
  }

  // ==================== INITIALIZATION ====================

  async function init() {
    try {
      // Check if site is disabled
      const disabled = await MeowStorage.isSiteDisabled();
      if (disabled) {
        console.log('🐱 Meow AI is disabled for this site.');
        return;
      }

      // Inject styles
      MeowChatUI.injectStyles();

      // Create UI
      const toggleButton = MeowChatUI.createToggleButton();
      const panel = MeowChatUI.createPanel();

      document.body.appendChild(toggleButton);
      document.body.appendChild(panel);

      // Init dragging
      MeowDrag.init(toggleButton);

      // Toggle button click (only if not dragged)
      toggleButton.addEventListener('click', () => {
        if (!MeowDrag.wasDragged()) {
          MeowChatUI.togglePanel();
        }
      });

      // Wire callbacks
      MeowChatUI.onSend(handleSendMessage);
      MeowChatUI.onDisable(handleDisable);

      // Setup features
      setupKeyboardShortcuts();
      setupSPAWatcher();
      setupMessageListener();

      console.log('🐱 Meow AI v2.0 initialized | Mode:', MeowPageExtractor.detectPageMode(window.location.href));

    } catch (error) {
      console.error('🐱 Meow AI init failed:', error);
    }
  }

  // ==================== BOOTSTRAP ====================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
