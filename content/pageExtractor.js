/**
 * Meow AI - Page Extractor Module
 * Smart content extraction with script/style removal,
 * article/main priority, and SPA navigation detection
 */

const MeowPageExtractor = (() => {
  'use strict';

  const MAX_CONTENT_LENGTH = 12000;
  let _lastUrl = window.location.href;
  let _onNavigateCallbacks = [];

  // ==================== SMART CONTENT EXTRACTION ====================

  /**
   * Extract clean page content with intelligent prioritization.
   * Uses site-specific extractors when available for richer context.
   * @returns {Object} { title, url, textContent, mode }
   */
  function extractPageContent() {
    try {
      const title = document.title || 'Untitled Page';
      const url = window.location.href;
      const mode = detectPageMode(url);

      // Try site-specific extractor first (richer, structured output)
      if (typeof MeowSiteExtractors !== 'undefined') {
        try {
          const siteContent = MeowSiteExtractors.extract(url, mode);
          if (siteContent && siteContent.length > 100) {
            return { title, url, textContent: siteContent, mode };
          }
        } catch (e) {
          // Silently fall through to generic extraction
        }
      }

      // Fallback: generic extraction using safe text-only approach
      // Use a DocumentFragment to avoid triggering SVG/attribute validation errors
      // that occur when cloneNode copies invalid SVGs from third-party pages
      let contentText = '';

      // Prioritize main content areas (read text directly, no cloning)
      const prioritySelectors = [
        'article', 'main', '[role="main"]',
        '.post-content', '.article-content', '.entry-content',
        '.markdown-body', '.readme', '.content',
        '#content', '#main-content'
      ];

      for (const selector of prioritySelectors) {
        const el = document.querySelector(selector);
        if (el && el.innerText && el.innerText.trim().length > 200) {
          contentText = el.innerText;
          break;
        }
      }

      // Fall back to body text (read directly without cloning)
      if (!contentText) {
        // Build text from top-level content nodes, skipping script/style/svg/nav/etc
        const skipTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'IFRAME',
          'NAV', 'FOOTER', 'HEADER', 'LINK', 'META']);
        const parts = [];
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode(node) {
              let parent = node.parentElement;
              while (parent && parent !== document.body) {
                if (skipTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
                const style = parent.getAttribute('style') || '';
                if (style.includes('display: none') || style.includes('display:none')) {
                  return NodeFilter.FILTER_REJECT;
                }
                if (parent.getAttribute('aria-hidden') === 'true') {
                  return NodeFilter.FILTER_REJECT;
                }
                parent = parent.parentElement;
              }
              return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            }
          }
        );

        let node;
        while ((node = walker.nextNode())) {
          parts.push(node.textContent);
        }
        contentText = parts.join(' ');
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
   * Detect page type based on URL patterns.
   * Covers: GitHub, GitLab, StackOverflow, LeetCode, HackerRank,
   * CodeChef, GeeksForGeeks, documentation sites, tech blogs,
   * YouTube, LinkedIn, research papers, API docs, dev forums, and more.
   */
  function detectPageMode(url) {
    const u = (url || '').toLowerCase();

    // Code review / PRs
    if ((u.includes('github.com') && u.includes('/pull')) ||
        (u.includes('gitlab.com') && u.includes('/merge_requests'))) return 'PR Review';

    // GitHub / GitLab general (repos, issues, etc.)
    if (u.includes('github.com') || u.includes('gitlab.com')) return 'GitHub Analysis';

    // Job / Career
    if (u.includes('linkedin.com/jobs') || u.includes('linkedin.com/in/') ||
        u.includes('indeed.com') || u.includes('glassdoor.com') ||
        u.includes('wellfound.com') || u.includes('angel.co')) return 'Job Analysis';

    // DSA / Competitive programming
    if (u.includes('leetcode.com') || u.includes('hackerrank.com') ||
        u.includes('codechef.com') || u.includes('codeforces.com') ||
        u.includes('geeksforgeeks.org/problems') ||
        u.includes('interviewbit.com') || u.includes('neetcode.io') ||
        u.includes('algoexpert.io')) return 'DSA Problem';

    // Learning / Educational
    if (u.includes('youtube.com') || u.includes('youtu.be') ||
        u.includes('udemy.com') || u.includes('coursera.org') ||
        u.includes('edx.org') || u.includes('pluralsight.com') ||
        u.includes('frontendmasters.com') || u.includes('egghead.io') ||
        u.includes('khanacademy.org')) return 'Learning Mode';

    // Stack Overflow & Q&A forums
    if (u.includes('stackoverflow.com') || u.includes('stackexchange.com') ||
        u.includes('superuser.com') || u.includes('serverfault.com') ||
        u.includes('askubuntu.com') || u.includes('discourse.') ||
        u.includes('reddit.com/r/programming') || u.includes('reddit.com/r/learnprogramming') ||
        u.includes('reddit.com/r/webdev') || u.includes('reddit.com/r/javascript') ||
        u.includes('reddit.com/r/python') || u.includes('reddit.com/r/rust') ||
        u.includes('reddit.com/r/golang') || u.includes('reddit.com/r/java') ||
        u.includes('reddit.com/r/csharp') || u.includes('reddit.com/r/cpp')) return 'Stack Overflow';

    // Research papers
    if (u.includes('arxiv.org') || u.includes('scholar.google') ||
        u.includes('semanticscholar.org') || u.includes('papers.nips.cc') ||
        u.includes('openreview.net') || u.includes('ieee.org') ||
        u.includes('acm.org/doi') || u.includes('dl.acm.org')) return 'Research Paper';

    // Documentation sites
    if (u.includes('docs.') || u.includes('documentation') ||
        u.includes('developer.mozilla.org') || u.includes('devdocs.io') ||
        u.includes('learn.microsoft.com') || u.includes('cloud.google.com/docs') ||
        u.includes('docs.aws.amazon.com') || u.includes('api.') ||
        u.includes('swagger.io') || u.includes('readthedocs.') ||
        u.includes('typescriptlang.org') || u.includes('reactjs.org') ||
        u.includes('react.dev') || u.includes('vuejs.org') ||
        u.includes('angular.io') || u.includes('nextjs.org') ||
        u.includes('nodejs.org') || u.includes('rust-lang.org') ||
        u.includes('go.dev') || u.includes('python.org/doc') ||
        u.includes('kotlinlang.org') || u.includes('ruby-doc.org')) return 'Documentation';

    // Technical articles & blogs
    if (u.includes('medium.com') || u.includes('dev.to') ||
        u.includes('hashnode.') || u.includes('freecodecamp.org') ||
        u.includes('css-tricks.com') || u.includes('smashingmagazine.com') ||
        u.includes('web.dev') || u.includes('blog.') ||
        u.includes('geeksforgeeks.org') || u.includes('baeldung.com') ||
        u.includes('digitalocean.com/community') || u.includes('scotch.io') ||
        u.includes('hackernoon.com') || u.includes('infoq.com') ||
        u.includes('dzone.com') || u.includes('theregister.com') ||
        u.includes('techcrunch.com') || u.includes('wired.com/tag/security') ||
        u.includes('news.ycombinator.com')) return 'Article';

    return 'General Analysis';
  }

  /**
   * Get system prompt for detected mode
   */
  function getSystemPrompt(mode) {
    const prompts = {
      'PR Review': 'You are Meow AI — an elite code reviewer. Provide: SUMMARY, KEY CONCERNS, STRENGTHS, IMPROVEMENTS, MERGE RECOMMENDATION. Suggest test cases. Be specific and actionable.',
      'GitHub Analysis': 'You are Meow AI — a senior engineering analyst. For repos: explain architecture and patterns. For issues: explain simply, suggest solution paths, highlight affected areas. Structure: SUMMARY, TECHNICAL DEPTH, WHY THIS MATTERS, KEY TAKEAWAY.',
      'Job Analysis': 'You are Meow AI — an elite career strategist. Extract required vs nice-to-have skills. Identify red/green flags. Suggest high ROI skills, portfolio improvements, and preparation strategy. Structure: ROLE SUMMARY, SKILL GAP ANALYSIS, COMPETITIVE ADVANTAGE, PREPARATION PLAN, NEXT STEPS.',
      'DSA Problem': 'You are Meow AI — an elite CS tutor. HINT-FIRST: Guide with hints and direction first. Explain the underlying pattern. Reveal approach step by step. Only show complete solutions if explicitly asked. Always mention complexity. Structure: PROBLEM TYPE, KEY INSIGHT, APPROACH HINT, COMPLEXITY ANALYSIS.',
      'Learning Mode': 'You are Meow AI — an elite technical educator. Focus on retention and practical application. Structure: CORE CONCEPTS, KEY TAKEAWAYS, PRACTICAL APPLICATION, LEARN NEXT.',
      'Stack Overflow': 'You are Meow AI — a senior developer. Cut through the noise. Summarize the real answer, highlight caveats the top answer might miss, detect bugs in posted solutions, and mention alternative approaches.',
      'Article': 'You are Meow AI — a technical curator. Summarize core idea, extract key learning points, suggest real-world use cases. Be critical. Structure: KEY POINTS, CRITICAL ANALYSIS, ACTIONABLE TAKEAWAYS.',
      'Documentation': 'You are Meow AI — a documentation expert. Summarize the API/feature, highlight gotchas, provide quick-start guidance. Suggest test cases and edge cases.',
      'Research Paper': 'You are Meow AI — a research analyst. Summarize core contribution, explain methodology in plain language, highlight key findings, suggest practical implications. Structure: SUMMARY, METHODOLOGY, KEY FINDINGS, PRACTICAL IMPLICATIONS.',
      'General Analysis': 'You are Meow AI — a senior technical analyst. Auto-detect content type and adapt. Structure: SUMMARY, KEY TECH INSIGHT, WHY THIS MATTERS, POTENTIAL RISKS, SUGGESTED NEXT STEP. Be clear and actionable.'
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
