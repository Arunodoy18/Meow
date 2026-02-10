/**
 * Meow AI - Widget Orchestrator (v3.0 Conversational AI)
 * Main entry point: wires all 4 engines together.
 *
 * Engine 1: MeowStreamManager    — Streaming reliability
 * Engine 2: MeowConversationMemory — Conversation context
 * Engine 3: MeowHumanEngine      — Human interaction
 * Engine 4: MeowPersonality      — Tone & personality
 *
 * + MeowChatUI, MeowScrollManager, MeowDrag, MeowPageExtractor, MeowStorage
 */

(() => {
  'use strict';

  // ==================== STATE ====================

  let _lastUserMessage = '';   // for retry
  let _lastMode = 'General Analysis';

  // ==================== STREAMING CALLBACKS ====================

  function _setupStreamCallbacks() {
    // State changes → show thinking / typing indicators
    MeowStreamManager.onStateChange((state) => {
      if (state === MeowStreamManager.STATE.CONNECTING) {
        // Thinking indicator is already showing from handleSendMessage
        // Switch to typing dots once connecting
        MeowChatUI.hideThinking();
        MeowChatUI.showTyping();
      }
    });

    // On each chunk → update streaming message UI
    MeowStreamManager.onChunk((msgId, fullContent) => {
      MeowChatUI.hideTyping();
      MeowChatUI.hideThinking();

      if (!MeowChatUI.hasStreamingMessage(msgId)) {
        MeowChatUI.createStreamingMessage(msgId);
      }
      MeowChatUI.appendStreamChunk(msgId, fullContent);
      MeowScrollManager.scrollOnChunk();
    });

    // On finalize → finish message, save to memory, re-enable input
    MeowStreamManager.onFinalize((msgId, fullContent, wasError) => {
      MeowChatUI.hideTyping();
      MeowChatUI.hideThinking();

      // Handle case where finalize fires before any chunks (error scenario)
      if (!MeowChatUI.hasStreamingMessage(msgId) && fullContent) {
        MeowChatUI.createStreamingMessage(msgId);
        MeowChatUI.appendStreamChunk(msgId, fullContent);
      }

      MeowChatUI.finalizeStreamMessage(msgId, wasError);

      // Save to conversation memory
      if (fullContent && !wasError) {
        MeowConversationMemory.addMessage('assistant', fullContent);
      }

      // Show retry on error
      if (wasError) {
        MeowChatUI.showRetryButton(msgId, _handleRetry);
      }

      MeowScrollManager.forceScrollToBottom();
      MeowChatUI.setInputEnabled(true);

      // Check if we should offer a conversation recap
      if (MeowConversationMemory.shouldOfferRecap()) {
        console.log('🐱 Long conversation — recap available');
      }
    });
  }

  // ==================== SEND MESSAGE FLOW ====================

  /**
   * End-to-end message flow:
   * 1. Store in conversation memory
   * 2. Analyze user (skill detection)
   * 3. Build context (conversation + page + personality)
   * 4. Simulate thinking delay
   * 5. Stream to backend
   * 6. Chunks → UI (via callbacks)
   * 7. Finalize → save to memory
   */
  async function handleSendMessage(userMessage) {
    if (MeowStreamManager.isStreaming() || !userMessage) return;

    // Store for retry
    _lastUserMessage = userMessage;
    _lastMode = MeowPageExtractor.detectPageMode(window.location.href);

    // Step 1: Show user message in UI
    MeowChatUI.addMessage('user', userMessage);
    MeowScrollManager.scrollToBottom();

    // Step 2: Save to conversation memory
    MeowConversationMemory.addMessage('user', userMessage);

    // Step 3: Analyze user skill level
    MeowHumanEngine.analyzeUserSkill(userMessage);

    // Step 4: Disable input
    MeowChatUI.setInputEnabled(false);

    // Step 5: Show thinking indicator + simulate natural delay
    MeowChatUI.showThinking();
    await MeowHumanEngine.simulateThinking(userMessage);

    // Step 6: Update page context
    const pageData = MeowPageExtractor.extractPageContent();
    MeowConversationMemory.updatePageContext(pageData);

    // Step 7: Build conversation payload
    const isFollowUp = MeowConversationMemory.isFollowUp(userMessage);
    const turnCount = MeowConversationMemory.getTurnCount();
    const conversationHint = MeowHumanEngine.getConversationHint(userMessage, isFollowUp, turnCount);
    const depthHint = MeowHumanEngine.getDepthHint();
    const payload = MeowConversationMemory.buildPayload(userMessage, _lastMode);

    // Augment system prompt with conversation hints
    if (conversationHint || depthHint) {
      payload.systemPrompt += (conversationHint || '') + (depthHint ? '\n' + depthHint : '');
    }

    // Step 8: Start streaming — callbacks handle the rest
    await MeowStreamManager.startStream(payload, _lastMode);
  }

  // ==================== RETRY ====================

  async function _handleRetry() {
    if (MeowStreamManager.isStreaming() || !_lastUserMessage) return;

    MeowChatUI.setInputEnabled(false);
    MeowChatUI.showThinking();
    await MeowHumanEngine.simulateThinking(_lastUserMessage);

    const payload = MeowConversationMemory.buildPayload(_lastUserMessage, _lastMode);
    await MeowStreamManager.startStream(payload, _lastMode);
  }

  // ==================== DISABLE HANDLER ====================

  async function handleDisable(action) {
    MeowStreamManager.abortCurrentStream();

    if (action === 'disable-24h' || action === 'disable-site') {
      await MeowStorage.disableSite(action === 'disable-24h');
      MeowStreamManager.destroy();
      MeowScrollManager.destroy();
      MeowConversationMemory.destroy();
      MeowHumanEngine.destroy();
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
      _lastMode = newMode;

      // Update page context in memory
      const pageData = MeowPageExtractor.extractPageContent();
      MeowConversationMemory.updatePageContext(pageData);

      console.log('🐱 SPA navigation → mode:', newMode);
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
        console.log('🐱 Tab hidden — stream continues in background');
      }
    });
  }

  // ==================== INITIALIZATION ====================

  async function init() {
    try {
      // Check if site is disabled
      const disabled = await MeowStorage.isSiteDisabled();
      if (disabled) {
        console.log('🐱 Meow AI disabled for this site.');
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

      // Init scroll manager
      const messagesContainer = panel.querySelector('.meow-chat-messages');
      if (messagesContainer) {
        MeowScrollManager.init(messagesContainer);
      }

      // Init page context
      const pageData = MeowPageExtractor.extractPageContent();
      MeowConversationMemory.updatePageContext(pageData);

      // Wire streaming callbacks
      _setupStreamCallbacks();

      // Toggle button (only if not dragged)
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

      const mode = MeowPageExtractor.detectPageMode(window.location.href);
      _lastMode = mode;
      console.log('🐱 Meow AI v3.0 initialized | Mode:', mode, '| Engines: Stream, Memory, Human, Personality');

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
