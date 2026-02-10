/**
 * Meow AI - Conversation Memory Engine (Engine 2)
 * Maintains session conversation history, context window management,
 * page context integration, topic tracking, and conversation payloads
 * for the Gemini multi-turn API.
 */

const MeowConversationMemory = (() => {
  'use strict';

  // ==================== CONFIG ====================

  const MAX_HISTORY_SIZE = 40;       // total messages to retain
  const CONTEXT_WINDOW_SIZE = 12;    // messages sent to API
  const MAX_PAGE_CONTEXT_CHARS = 3000;
  const RECAP_THRESHOLD = 20;        // offer recap after N messages

  // ==================== STATE ====================

  /** @type {Array<{role: string, content: string, timestamp: number}>} */
  let _history = [];

  /** @type {{title: string, url: string, summary: string, mode: string}|null} */
  let _pageContext = null;

  let _turnCount = 0;
  let _lastTopic = '';

  // ==================== HISTORY MANAGEMENT ====================

  /**
   * Add a message to conversation history.
   * @param {'user'|'assistant'} role
   * @param {string} content
   */
  function addMessage(role, content) {
    if (!content || !content.trim()) return;

    _history.push({
      role,
      content: content.trim(),
      timestamp: Date.now()
    });

    _turnCount++;

    // Trim oldest messages if over limit
    if (_history.length > MAX_HISTORY_SIZE) {
      _history.splice(0, _history.length - MAX_HISTORY_SIZE);
    }
  }

  /**
   * Get recent conversation history for context window.
   * @returns {Array<{role: string, content: string}>}
   */
  function getRecentMessages() {
    return _history.slice(-CONTEXT_WINDOW_SIZE).map(m => ({
      role: m.role,
      content: m.content
    }));
  }

  /**
   * Get the last assistant message content.
   * @returns {string|null}
   */
  function getLastAssistantMessage() {
    for (let i = _history.length - 1; i >= 0; i--) {
      if (_history[i].role === 'assistant') {
        return _history[i].content;
      }
    }
    return null;
  }

  /**
   * Get the last user message content.
   * @returns {string|null}
   */
  function getLastUserMessage() {
    for (let i = _history.length - 1; i >= 0; i--) {
      if (_history[i].role === 'user') {
        return _history[i].content;
      }
    }
    return null;
  }

  /**
   * Get total turn count for this session.
   * @returns {number}
   */
  function getTurnCount() {
    return _turnCount;
  }

  /**
   * Check if conversation is long enough for a recap.
   * @returns {boolean}
   */
  function shouldOfferRecap() {
    return _turnCount > 0 && _turnCount % RECAP_THRESHOLD === 0;
  }

  // ==================== PAGE CONTEXT ====================

  /**
   * Update the current page context.
   * Called on init and SPA navigation.
   * @param {Object} pageData - From MeowPageExtractor.extractPageContent()
   */
  function updatePageContext(pageData) {
    if (!pageData) return;
    _pageContext = {
      title: pageData.title || '',
      url: pageData.url || '',
      summary: (pageData.textContent || '').substring(0, MAX_PAGE_CONTEXT_CHARS),
      mode: pageData.mode || 'General Analysis'
    };
  }

  /**
   * Get current page context.
   * @returns {Object|null}
   */
  function getPageContext() {
    return _pageContext;
  }

  // ==================== PAYLOAD BUILDER ====================

  /**
   * Build the full API payload for streaming requests.
   * Includes: system prompt, conversation history, page context.
   *
   * Format for backend:
   * {
   *   systemPrompt: string,
   *   messages: [{role, content}],
   *   mode: string
   * }
   *
   * @param {string} userMessage - Current user message
   * @param {string} mode - Page mode
   * @returns {Object} API payload
   */
  function buildPayload(userMessage, mode) {
    const systemPrompt = MeowPersonality.getSystemPrompt(mode);
    const messages = [];

    // Add recent conversation history (excluding current message)
    const recent = getRecentMessages();
    for (const msg of recent) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }

    // Build current user message with page context if relevant
    let enrichedMessage = userMessage;
    const wantsPage = MeowPageExtractor.isPageQuery(userMessage);
    const isFirstMessage = _history.length === 0;

    if (_pageContext && (isFirstMessage || wantsPage)) {
      enrichedMessage = _buildPageEnrichedMessage(userMessage, isFirstMessage);
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: enrichedMessage
    });

    return {
      systemPrompt,
      messages,
      mode
    };
  }

  /**
   * Build a user message enriched with page context.
   * @param {string} userMessage
   * @param {boolean} isFirst
   * @returns {string}
   */
  function _buildPageEnrichedMessage(userMessage, isFirst) {
    if (!_pageContext) return userMessage;

    if (isFirst) {
      return `[Page Context]
Title: ${_pageContext.title}
URL: ${_pageContext.url}
Type: ${_pageContext.mode}

Page Content:
${_pageContext.summary}

---
${userMessage}`;
    }

    // Follow-up with page reference
    return `[Referring to: ${_pageContext.title}]
${userMessage}`;
  }

  /**
   * Build a continuation payload when response was cut off.
   * @returns {Object}
   */
  function buildContinuationPayload() {
    const systemPrompt = MeowPersonality.getCorePrompt();

    // Include last few messages for context
    const recent = getRecentMessages().slice(-4);
    const messages = [...recent, {
      role: 'user',
      content: 'Continue naturally from where you stopped. Do not repeat anything already said.'
    }];

    return {
      systemPrompt,
      messages,
      mode: _pageContext?.mode || 'General Analysis'
    };
  }

  // ==================== TOPIC TRACKING ====================

  /**
   * Extract rough topic from a message (simple heuristic).
   * @param {string} message
   * @returns {string}
   */
  function _extractTopic(message) {
    // Extract first noun phrase or key terms
    const words = message.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);
    return words.slice(0, 5).join(' ');
  }

  /**
   * Check if a message is a follow-up to the previous topic.
   * @param {string} userMessage
   * @returns {boolean}
   */
  function isFollowUp(userMessage) {
    if (_history.length < 2) return false;

    const lower = userMessage.toLowerCase();
    const followUpIndicators = [
      'what about', 'how about', 'and ', 'also', 'but ',
      'why', 'can you', 'what if', 'is that', 'so ',
      'then', 'ok ', 'okay', 'got it', 'makes sense',
      'interesting', 'wait', 'hold on', 'actually',
      'one more', 'another', 'more about', 'elaborate',
      'explain more', 'go deeper', 'what do you mean',
      'could you', 'can you clarify', 'tell me more'
    ];

    // Short messages (< 8 words) after history are likely follow-ups
    if (userMessage.split(/\s+/).length < 8 && _history.length >= 2) {
      return true;
    }

    return followUpIndicators.some(indicator => lower.startsWith(indicator) || lower.includes(indicator));
  }

  // ==================== CONVERSATION RECAP ====================

  /**
   * Generate a brief conversation recap for long threads.
   * @returns {string}
   */
  function generateRecap() {
    if (_history.length < 6) return '';

    const topics = [];
    const userMessages = _history.filter(m => m.role === 'user');
    const sampleSize = Math.min(userMessages.length, 5);

    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor(i * (userMessages.length / sampleSize));
      const msg = userMessages[idx].content;
      topics.push(msg.length > 60 ? msg.substring(0, 57) + '...' : msg);
    }

    return `Conversation recap (${_turnCount} messages):\n${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
  }

  // ==================== CLEANUP ====================

  /**
   * Clear all conversation history (e.g., on site change).
   */
  function clear() {
    _history = [];
    _turnCount = 0;
    _lastTopic = '';
  }

  /**
   * Destroy the memory engine.
   */
  function destroy() {
    clear();
    _pageContext = null;
  }

  // ==================== PUBLIC API ====================

  return {
    addMessage,
    getRecentMessages,
    getLastAssistantMessage,
    getLastUserMessage,
    getTurnCount,
    shouldOfferRecap,
    updatePageContext,
    getPageContext,
    buildPayload,
    buildContinuationPayload,
    isFollowUp,
    generateRecap,
    clear,
    destroy
  };
})();
