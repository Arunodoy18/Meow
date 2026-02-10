/**
 * Meow AI - Widget Orchestrator (v2.1 Streaming)
 * Main entry point: wires all modules together.
 * Handles init, keyboard shortcuts, streaming API calls,
 * SPA nav, and chrome.runtime messaging.
 */

(() => {
  'use strict';

  // ==================== CONFIG ====================

  const MAX_HISTORY_SIZE = 20;
  const CONTEXT_WINDOW_SIZE = 6;

  // ==================== STATE ====================

  let chatHistory = [];        // API memory: [{role, content}]
  let _lastUserMessage = '';   // for retry
  let _lastMode = 'general';

  // ==================== HISTORY ====================

  function addToHistory(role, content) {
    chatHistory.push({ role, content });
    if (chatHistory.length > MAX_HISTORY_SIZE) {
      chatHistory.splice(0, chatHistory.length - MAX_HISTORY_SIZE);
    }
  }

  function getRecentHistory() {
    return chatHistory.slice(-CONTEXT_WINDOW_SIZE);
  }

  // ==================== MESSAGE BUILDER ====================

  /**
   * Build the full message with page context and conversation history.
   */
  function _buildMessage(userMessage) {
    const pageData = MeowPageExtractor.extractPageContent();
    const mode = pageData.mode;
    const systemPrompt = MeowPageExtractor.getSystemPrompt(mode);

    let conversationContext = '';
    getRecentHistory().forEach(msg => {
      conversationContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });

    const isFirstMsg = chatHistory.length <= 1;
    const wantsPage = MeowPageExtractor.isPageQuery(userMessage);

    if (isFirstMsg && wantsPage) {
      return `${systemPrompt}\n\nPage Title: ${pageData.title}\nMode: ${mode}\n\nPage Content:\n${pageData.textContent.substring(0, 3000)}\n\nUser Question: ${userMessage}\n\nProvide elite-level analysis.`;
    } else if (wantsPage) {
      return `Page Title: ${pageData.title}\n${pageData.textContent.substring(0, 2000)}\n\nConversation:\n${conversationContext}\nUser: ${userMessage}`;
    } else if (conversationContext) {
      return `Conversation:\n${conversationContext}\nUser: ${userMessage}`;
    }
    return userMessage;
  }

  // ==================== STREAMING CALLBACKS ====================

  function _setupStreamCallbacks() {
    // Show typing dots while connecting
    MeowStreamManager.onStateChange((state) => {
      if (state === MeowStreamManager.STATE.CONNECTING) {
        MeowChatUI.showTyping();
      }
    });

    // On each chunk → update streaming message UI
    MeowStreamManager.onChunk((msgId, fullContent) => {
      MeowChatUI.hideTyping();

      if (!MeowChatUI.hasStreamingMessage(msgId)) {
        MeowChatUI.createStreamingMessage(msgId);
      }
      MeowChatUI.appendStreamChunk(msgId, fullContent);
      MeowScrollManager.scrollOnChunk();
    });

    // On finalize → finish message, save to history, re-enable input
    MeowStreamManager.onFinalize((msgId, fullContent, wasError) => {
      MeowChatUI.hideTyping();

      // If we finalize before any chunks arrived (error before first chunk)
      if (!MeowChatUI.hasStreamingMessage(msgId) && fullContent) {
        MeowChatUI.createStreamingMessage(msgId);
        MeowChatUI.appendStreamChunk(msgId, fullContent);
      }

      MeowChatUI.finalizeStreamMessage(msgId, wasError);

      if (fullContent && !wasError) {
        addToHistory('assistant', fullContent);
      }

      if (wasError) {
        MeowChatUI.showRetryButton(msgId, handleRetry);
      }

      MeowScrollManager.forceScrollToBottom();
      MeowChatUI.setInputEnabled(true);
    });
  }

  // ==================== SEND MESSAGE FLOW ====================

  async function handleSendMessage(userMessage) {
    if (MeowStreamManager.isStreaming() || !userMessage) return;

    // Store for retry
    _lastUserMessage = userMessage;
    _lastMode = MeowPageExtractor.detectPageMode(window.location.href);

    // Show user message
    MeowChatUI.addMessage('user', userMessage);
    addToHistory('user', userMessage);
    MeowScrollManager.scrollToBottom();

    // Disable input
    MeowChatUI.setInputEnabled(false);

    // Build message with page context + history
    const message = _buildMessage(userMessage);

    // Start streaming — callbacks handle UI updates
    await MeowStreamManager.startStream(message, _lastMode);
  }

  // ==================== RETRY ====================

  async function handleRetry() {
    if (MeowStreamManager.isStreaming() || !_lastUserMessage) return;

    MeowChatUI.setInputEnabled(false);
    const message = _buildMessage(_lastUserMessage);
    await MeowStreamManager.startStream(message, _lastMode);
  }

  // ==================== DISABLE HANDLER ====================

  async function handleDisable(action) {
    MeowStreamManager.abortCurrentStream();

    if (action === 'disable-24h') {
      await MeowStorage.disableSite(true);
      MeowStreamManager.destroy();
      MeowScrollManager.destroy();
      MeowChatUI.destroy();
      MeowDrag.destroy();
    } else if (action === 'disable-site') {
      await MeowStorage.disableSite(false);
      MeowStreamManager.destroy();
      MeowScrollManager.destroy();
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

      // Escape → close panel (abort stream if active)
      if (e.key === 'Escape' && MeowChatUI.isPanelOpen()) {
        if (MeowStreamManager.isStreaming()) {
          MeowStreamManager.abortCurrentStream();
        }
        MeowChatUI.closePanel();
      }
    });
  }

  // ==================== SPA NAVIGATION ====================

  function setupSPAWatcher() {
    MeowPageExtractor.initSPAWatcher();
    MeowPageExtractor.onNavigate((url) => {
      // Abort active stream on navigation
      if (MeowStreamManager.isStreaming()) {
        MeowStreamManager.abortCurrentStream();
      }

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

  // ==================== TAB VISIBILITY ====================

  function setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && MeowStreamManager.isStreaming()) {
        console.log('🐱 Tab hidden during stream — stream continues in background');
      }
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

      // Init scroll manager (bind to messages container)
      const messagesContainer = panel.querySelector('.meow-chat-messages');
      if (messagesContainer) {
        MeowScrollManager.init(messagesContainer);
      }

      // Wire streaming callbacks
      _setupStreamCallbacks();

      // Toggle button click (only if not dragged)
      toggleButton.addEventListener('click', () => {
        if (!MeowDrag.wasDragged()) {
          MeowChatUI.togglePanel();
        }
      });

      // Wire UI callbacks
      MeowChatUI.onSend(handleSendMessage);
      MeowChatUI.onDisable(handleDisable);

      // Setup features
      setupKeyboardShortcuts();
      setupSPAWatcher();
      setupMessageListener();
      setupVisibilityHandler();

      console.log('🐱 Meow AI v2.1 (streaming) initialized | Mode:', MeowPageExtractor.detectPageMode(window.location.href));

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
