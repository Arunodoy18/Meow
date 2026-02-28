/**
 * Meow AI - Widget Orchestrator (v4.0 Advanced)
 * Main entry point: wires all engines + new advanced modules.
 *
 * Core Engines:
 *   MeowStreamManager, MeowConversationMemory, MeowHumanEngine, MeowPersonality
 *
 * Advanced Modules:
 *   MeowSlashCommands, MeowExport, MeowPromptTemplates,
 *   MeowOfflineCache, MeowSiteExtractors, MeowMarkdown
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

    // On finalize → finish message, save to memory, cache, re-enable input
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

        // Cache the response for offline use
        if (typeof MeowOfflineCache !== 'undefined' && _lastUserMessage) {
          MeowOfflineCache.store(window.location.href, _lastUserMessage, fullContent, _lastMode);
        }
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

    // ── Slash command handling ──
    if (typeof MeowSlashCommands !== 'undefined' && MeowSlashCommands.isCommand(userMessage)) {
      const parsed = MeowSlashCommands.parse(userMessage);

      // Special commands handled locally
      if (parsed.isSpecial) {
        if (parsed.command === '/help') {
          MeowChatUI.addMessage('ai', MeowSlashCommands.getHelpText());
          return;
        }
        if (parsed.command === '/clear') {
          MeowConversationMemory.clear();
          // Reload the panel by closing & opening
          MeowChatUI.closePanel();
          MeowChatUI.openPanel();
          return;
        }
        if (parsed.command === '/export') {
          if (typeof MeowExport !== 'undefined') {
            const history = MeowConversationMemory.getFullHistory();
            const ok = await MeowExport.copyToClipboard(history, document.title, _lastMode);
            MeowChatUI.addMessage('ai', ok ? '✅ Conversation copied to clipboard!' : '❌ Failed to copy.');
          }
          return;
        }
        if (parsed.command === '/stats') {
          _showUsageStats();
          return;
        }
        if (parsed.command === '/template') {
          _showTemplateList();
          return;
        }
      }

      // Rewrite message for AI commands (e.g., /review → "Review this code: ...")
      userMessage = parsed.message;
    }

    // Store for retry
    _lastUserMessage = userMessage;
    _lastMode = MeowPageExtractor.detectPageMode(window.location.href);

    // ── Check offline cache ──
    if (typeof MeowOfflineCache !== 'undefined') {
      const cached = MeowOfflineCache.retrieve(window.location.href, userMessage);
      if (cached) {
        MeowChatUI.addMessage('user', userMessage);
        MeowConversationMemory.addMessage('user', userMessage);
        MeowChatUI.addMessage('ai', '📦 *Cached response:*\n\n' + cached);
        MeowConversationMemory.addMessage('assistant', cached);
        MeowScrollManager.scrollToBottom();
        return;
      }
    }

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

    // Augment system prompt with conversation hints + user preferences
    if (conversationHint || depthHint) {
      payload.systemPrompt += (conversationHint || '') + (depthHint ? '\n' + depthHint : '');
    }

    // Add user skill-level preference to system prompt
    if (typeof MeowStorage !== 'undefined') {
      try {
        const prefs = await MeowStorage.getPreferences();
        if (prefs.verbosity === 'concise') {
          payload.systemPrompt += '\nBe concise — bullet points preferred.';
        } else if (prefs.verbosity === 'detailed') {
          payload.systemPrompt += '\nBe very detailed with examples and explanations.';
        }
        if (prefs.skillLevel === 'beginner') {
          payload.systemPrompt += '\nExplain concepts simply for a beginner developer.';
        } else if (prefs.skillLevel === 'advanced') {
          payload.systemPrompt += '\nAssume an advanced developer audience. Skip basics.';
        }
      } catch (e) { /* prefs not critical */ }
    }

    // Step 8: Start streaming — callbacks handle the rest
    await MeowStreamManager.startStream(payload, _lastMode);

    // ── Track usage via background ──
    _trackUsage(_lastMode);
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

      // ALT + E → explain page
      if (e.altKey && (e.key === 'e' || e.key === 'E') && MeowChatUI.isPanelOpen()) {
        e.preventDefault();
        handleSendMessage('Explain this page in detail');
      }

      // ALT + S → summarize
      if (e.altKey && (e.key === 's' || e.key === 'S') && MeowChatUI.isPanelOpen()) {
        e.preventDefault();
        handleSendMessage('Summarize the key points from this page');
      }

      // ALT + R → review code
      if (e.altKey && (e.key === 'r' || e.key === 'R') && MeowChatUI.isPanelOpen()) {
        e.preventDefault();
        handleSendMessage('Review this code — highlight issues and improvements');
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
        } else if (request.action === 'contextMenuAction') {
          // Context menu actions from background.js
          MeowChatUI.openPanel();
          handleSendMessage(request.message);
          sendResponse({ success: true });
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

  // ==================== USAGE TRACKING ====================

  function _trackUsage(mode) {
    try {
      chrome.runtime.sendMessage({ action: 'trackUsage', mode });
    } catch (e) {
      // Background not available — non-critical
    }
  }

  function _showUsageStats() {
    try {
      chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
        if (response && response.stats) {
          const s = response.stats;
          const text = `📊 **Your Meow AI Stats**\n\n` +
            `**Total queries:** ${s.totalQueries}\n` +
            `**Current streak:** ${s.streak} day(s)\n` +
            `**Today:** ${s.todayQueries} queries\n` +
            `**Favorite mode:** ${s.topMode || 'N/A'}\n\n` +
            `_Keep going! 🐱_`;
          MeowChatUI.addMessage('ai', text);
        } else {
          MeowChatUI.addMessage('ai', '📊 No usage data yet. Start chatting!');
        }
      });
    } catch (e) {
      MeowChatUI.addMessage('ai', '📊 Stats tracking is not available.');
    }
  }

  // ==================== TEMPLATE LIST ====================

  function _showTemplateList() {
    if (typeof MeowPromptTemplates === 'undefined') {
      MeowChatUI.addMessage('ai', 'Templates module not loaded.');
      return;
    }
    const templates = MeowPromptTemplates.getAll();
    const categories = MeowPromptTemplates.getCategories();
    let text = '📋 **Prompt Templates**\n\n';
    categories.forEach(cat => {
      text += `**${cat}:**\n`;
      templates.filter(t => t.category === cat).forEach(t => {
        text += `• \`${t.name}\` — ${t.description}\n`;
      });
      text += '\n';
    });
    text += '_Click a template name or type `/template <name>` to use it._';
    MeowChatUI.addMessage('ai', text);
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

      // Attempt to load persisted conversation history
      const url = window.location.href;
      const restored = await MeowConversationMemory.loadPersistedHistory(url);
      if (restored) {
        // Replay recent messages into the UI
        const recent = MeowConversationMemory.getRecentMessages(6);
        recent.forEach(msg => {
          MeowChatUI.addMessage(msg.role === 'user' ? 'user' : 'ai', msg.content);
        });
        console.log('🐱 Restored', recent.length, 'messages from previous session');
      }

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

      // Apply saved preferences
      if (typeof MeowStorage !== 'undefined') {
        try {
          const prefs = await MeowStorage.getPreferences();
          if (prefs.panelSide === 'left') {
            panel.style.right = 'auto';
            panel.style.left = '-420px';
          }
        } catch (e) { /* non-critical */ }
      }

      // Notify background of mode for badge
      try {
        chrome.runtime.sendMessage({ action: 'updateBadge', mode });
      } catch (e) { /* background might not be ready */ }

      const mode = MeowPageExtractor.detectPageMode(window.location.href);
      _lastMode = mode;
      console.log('🐱 Meow AI v4.0 initialized | Mode:', mode, '| Advanced modules loaded');

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
