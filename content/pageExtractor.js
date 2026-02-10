/**
 * Meow AI - Page Extractor Module
 * Smart content extraction with script/style removal,
 * article/main priority, and SPA navigation detection
 */

const MeowPageExtractor = (() => {
  'use strict';

  const MAX_CONTENT_LENGTH = 8000;
  let _lastUrl = window.location.href;
  let _onNavigateCallbacks = [];

  // ==================== SMART CONTENT EXTRACTION ====================

  /**
   * Extract clean page content with intelligent prioritization
   * @returns {Object} { title, url, textContent, mode }
   */
  function extractPageContent() {
    try {
      const title = document.title || 'Untitled Page';
      const url = window.location.href;
      const mode = detectPageMode(url);

      // Clone body to avoid DOM modifications
      const clone = document.body.cloneNode(true);

      // Remove non-content elements
      const removeTags = ['script', 'style', 'noscript', 'svg', 'iframe',
        'nav', 'footer', 'header'];
      removeTags.forEach(tag => {
        clone.querySelectorAll(tag).forEach(el => el.remove());
      });

      // Remove hidden elements
      clone.querySelectorAll('[aria-hidden="true"], [style*="display: none"], [style*="display:none"]')
        .forEach(el => el.remove());

      // Prioritize main content areas
      let contentText = '';
      const prioritySelectors = [
        'article', 'main', '[role="main"]',
        '.post-content', '.article-content', '.entry-content',
        '.markdown-body', '.readme', '.content',
        '#content', '#main-content'
      ];

      for (const selector of prioritySelectors) {
        const el = clone.querySelector(selector);
        if (el && el.textContent.trim().length > 200) {
          contentText = el.textContent;
          break;
        }
      }

      // Fall back to full body text
      if (!contentText) {
        contentText = clone.textContent || '';
      }

      // Clean whitespace
      contentText = contentText
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/^\s+$/gm, '')
        .trim();

      return {
        title,
        url,
        textContent: contentText.substring(0, MAX_CONTENT_LENGTH),
        mode
      };
    } catch (error) {
      console.error('🐱 Page extraction error:', error);
      return {
        title: document.title || 'Error',
        url: window.location.href,
        textContent: '',
        mode: 'General Analysis'
      };
    }
  }

  // ==================== PAGE MODE DETECTION ====================

  /**
   * Detect page type based on URL patterns
   */
  function detectPageMode(url) {
    const u = (url || '').toLowerCase();
    if (u.includes('github.com') && u.includes('/pull')) return 'PR Review';
    if (u.includes('github.com')) return 'GitHub Analysis';
    if (u.includes('linkedin.com/jobs')) return 'Job Analysis';
    if (u.includes('leetcode.com')) return 'DSA Problem';
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'Learning Mode';
    if (u.includes('stackoverflow.com')) return 'Stack Overflow';
    if (u.includes('medium.com') || u.includes('dev.to')) return 'Article';
    if (u.includes('docs.') || u.includes('documentation')) return 'Documentation';
    return 'General Analysis';
  }

  /**
   * Get system prompt for detected mode
   */
  function getSystemPrompt(mode) {
    const prompts = {
      'PR Review': 'You are Meow AI — an elite code reviewer. Provide: SUMMARY, KEY CONCERNS, STRENGTHS, IMPROVEMENTS, MERGE RECOMMENDATION. Be concise and actionable.',
      'GitHub Analysis': 'You are Meow AI — a senior engineering analyst. Provide: SUMMARY, TECHNICAL DEPTH, WHY THIS MATTERS, KEY TAKEAWAY. Be insightful.',
      'Job Analysis': 'You are Meow AI — an elite career strategist. Provide: ROLE SUMMARY, SKILL GAP ANALYSIS, COMPETITIVE ADVANTAGE, NEXT STEPS. Be strategic.',
      'DSA Problem': 'You are Meow AI — an elite CS tutor. Guide with hints. Provide: PROBLEM TYPE, KEY INSIGHT, APPROACH HINT, COMPLEXITY ANALYSIS. Teach, don\'t solve.',
      'Learning Mode': 'You are Meow AI — an elite technical educator. Provide: CORE CONCEPTS, KEY TAKEAWAYS, PRACTICAL APPLICATION, LEARN NEXT. Focus on retention.',
      'Stack Overflow': 'You are Meow AI — a senior developer. Summarize the question and best answer. Highlight caveats and alternative approaches.',
      'Article': 'You are Meow AI — a technical curator. Provide: KEY POINTS, CRITICAL ANALYSIS, ACTIONABLE TAKEAWAYS.',
      'Documentation': 'You are Meow AI — a documentation expert. Summarize the API/feature, highlight gotchas, and provide quick-start guidance.',
      'General Analysis': 'You are Meow AI — a senior technical analyst. Provide: SUMMARY, KEY INSIGHT, PRACTICAL VALUE. Be clear and actionable.'
    };
    return prompts[mode] || prompts['General Analysis'];
  }

  /**
   * Check if a user message implies they want page context
   */
  function isPageQuery(message) {
    const triggers = [
      'page', 'this', 'explain', 'analyze', 'summarize',
      'what is', 'what does', 'tell me about', 'review',
      'key points', 'key insights', 'summary', 'break down'
    ];
    const lower = message.toLowerCase();
    return triggers.some(t => lower.includes(t));
  }

  // ==================== SPA NAVIGATION DETECTION ====================

  function onNavigate(callback) {
    _onNavigateCallbacks.push(callback);
  }

  function _checkNavigation() {
    const currentUrl = window.location.href;
    if (currentUrl !== _lastUrl) {
      _lastUrl = currentUrl;
      _onNavigateCallbacks.forEach(cb => {
        try { cb(currentUrl); } catch (e) { console.error('🐱 Nav callback error:', e); }
      });
    }
  }

  function initSPAWatcher() {
    // Intercept History API
    const origPush = history.pushState;
    const origReplace = history.replaceState;

    history.pushState = function (...args) {
      origPush.apply(this, args);
      setTimeout(_checkNavigation, 50);
    };
    history.replaceState = function (...args) {
      origReplace.apply(this, args);
      setTimeout(_checkNavigation, 50);
    };

    // Listen for popstate (back/forward buttons)
    window.addEventListener('popstate', () => setTimeout(_checkNavigation, 50));

    // Fallback: periodic check for hash-based routing
    setInterval(_checkNavigation, 2000);
  }

  // ==================== PUBLIC API ====================

  return {
    extractPageContent,
    detectPageMode,
    getSystemPrompt,
    isPageQuery,
    onNavigate,
    initSPAWatcher
  };
})();
