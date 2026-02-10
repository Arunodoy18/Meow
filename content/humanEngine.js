/**
 * Meow AI - Human Interaction Engine (Engine 3)
 * Simulates natural human conversation behaviors:
 * - Thinking delay before responses
 * - Natural conversational openers
 * - Follow-up awareness
 * - Adaptive explanation depth
 * - User skill detection
 */

const MeowHumanEngine = (() => {
  'use strict';

  // ==================== CONFIG ====================

  const THINKING_DELAY_MIN = 250;   // ms
  const THINKING_DELAY_MAX = 650;   // ms
  const THINKING_DELAY_LONG = 900;  // for complex questions

  // ==================== STATE ====================

  let _userSkillLevel = 'intermediate'; // beginner | intermediate | advanced
  let _messageCount = 0;
  let _techTermsUsed = 0;

  // ==================== THINKING SIMULATION ====================

  /**
   * Compute a natural thinking delay based on message complexity.
   * Longer messages or complex questions get slightly longer delays.
   * @param {string} userMessage
   * @returns {number} Delay in milliseconds
   */
  function getThinkingDelay(userMessage) {
    const wordCount = userMessage.split(/\s+/).length;
    const isComplex = _isComplexQuestion(userMessage);

    if (isComplex) {
      return _randomBetween(THINKING_DELAY_MAX, THINKING_DELAY_LONG);
    }

    if (wordCount > 30) {
      return _randomBetween(400, THINKING_DELAY_MAX);
    }

    return _randomBetween(THINKING_DELAY_MIN, THINKING_DELAY_MAX);
  }

  /**
   * Returns a promise that resolves after the thinking delay.
   * @param {string} userMessage
   * @returns {Promise<void>}
   */
  function simulateThinking(userMessage) {
    const delay = getThinkingDelay(userMessage);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // ==================== QUESTION ANALYSIS ====================

  /**
   * Detect if a question is complex (deserves longer thinking).
   * @param {string} message
   * @returns {boolean}
   */
  function _isComplexQuestion(message) {
    const lower = message.toLowerCase();
    const complexIndicators = [
      'explain', 'how does', 'why does', 'what happens when',
      'difference between', 'compare', 'pros and cons',
      'architecture', 'design pattern', 'trade-off', 'tradeoff',
      'best practice', 'optimize', 'debug', 'refactor',
      'step by step', 'walk me through', 'deep dive',
      'under the hood', 'internals', 'implement'
    ];
    return complexIndicators.some(i => lower.includes(i)) || message.split(/\s+/).length > 25;
  }

  /**
   * Detect if this is a simple/casual message (short answer expected).
   * @param {string} message
   * @returns {boolean}
   */
  function isSimpleMessage(message) {
    const lower = message.toLowerCase().trim();
    const simplePatterns = [
      /^(hi|hello|hey|sup|yo)\b/,
      /^(thanks|thank you|thx|ty)\b/,
      /^(ok|okay|got it|makes sense|cool|nice|great)\b/,
      /^(yes|no|yep|nope|yeah|nah)\b/,
      /^what('s| is) \d/,  // "what's 2+2"
    ];
    return simplePatterns.some(p => p.test(lower)) || lower.length < 15;
  }

  // ==================== NATURAL OPENERS ====================

  // Openers are injected via the system prompt personality — the AI generates them.
  // This module provides hints to the system prompt when appropriate.

  /**
   * Get a context hint to prepend to the system prompt for this turn.
   * Guides the AI's opening style based on conversation state.
   * @param {string} userMessage
   * @param {boolean} isFollowUp
   * @param {number} turnCount
   * @returns {string} Context hint for system prompt
   */
  function getConversationHint(userMessage, isFollowUp, turnCount) {
    const hints = [];

    if (turnCount === 0) {
      hints.push('This is the first message in this conversation. Be welcoming but not over-the-top. Dive into being helpful.');
    }

    if (isFollowUp) {
      hints.push('The user is asking a follow-up question. Reference your previous answer naturally. Don\'t repeat context they already have.');
    }

    if (isSimpleMessage(userMessage)) {
      hints.push('This is a casual/simple message. Match their energy — respond briefly and naturally. No need for a long explanation.');
    }

    if (_isComplexQuestion(userMessage)) {
      hints.push('This is a complex question. Take your time to explain thoroughly. Use a step-by-step approach if helpful, but keep it conversational.');
    }

    if (turnCount > 0 && turnCount % 10 === 0) {
      hints.push('You\'ve been chatting for a while. Feel free to be a bit more casual and familiar — you know each other now.');
    }

    return hints.length > 0 ? '\n[CONVERSATION CONTEXT: ' + hints.join(' ') + ']' : '';
  }

  // ==================== USER SKILL DETECTION ====================

  /**
   * Analyze a user message to update skill level estimation.
   * @param {string} message
   */
  function analyzeUserSkill(message) {
    _messageCount++;

    const techTerms = [
      'api', 'endpoint', 'middleware', 'async', 'await', 'promise',
      'callback', 'closure', 'prototype', 'interface', 'abstract',
      'polymorphism', 'inheritance', 'dependency injection',
      'microservice', 'docker', 'kubernetes', 'ci/cd', 'pipeline',
      'mutex', 'semaphore', 'thread', 'concurrency', 'parallelism',
      'big-o', 'complexity', 'recursion', 'memoization', 'dynamic programming',
      'binary tree', 'hash map', 'linked list', 'graph traversal',
      'sql', 'nosql', 'orm', 'migration', 'schema', 'index',
      'react', 'angular', 'vue', 'svelte', 'nextjs', 'node',
      'typescript', 'webpack', 'vite', 'babel', 'eslint'
    ];

    const lower = message.toLowerCase();
    const matches = techTerms.filter(t => lower.includes(t));
    _techTermsUsed += matches.length;

    // Update skill estimation
    const techDensity = _techTermsUsed / _messageCount;
    if (techDensity > 2) {
      _userSkillLevel = 'advanced';
    } else if (techDensity > 0.5) {
      _userSkillLevel = 'intermediate';
    } else {
      _userSkillLevel = 'beginner';
    }
  }

  /**
   * Get a depth hint based on estimated user skill.
   * @returns {string}
   */
  function getDepthHint() {
    switch (_userSkillLevel) {
      case 'advanced':
        return 'The user appears technically experienced. You can use technical terminology freely and skip basics.';
      case 'beginner':
        return 'The user appears newer to this topic. Explain concepts clearly and define technical terms when you use them.';
      default:
        return '';
    }
  }

  /**
   * Get the current estimated user skill level.
   * @returns {string}
   */
  function getUserSkillLevel() {
    return _userSkillLevel;
  }

  // ==================== HELPERS ====================

  function _randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ==================== CLEANUP ====================

  function destroy() {
    _messageCount = 0;
    _techTermsUsed = 0;
    _userSkillLevel = 'intermediate';
  }

  // ==================== PUBLIC API ====================

  return {
    simulateThinking,
    getThinkingDelay,
    isSimpleMessage,
    getConversationHint,
    analyzeUserSkill,
    getDepthHint,
    getUserSkillLevel,
    destroy
  };
})();
