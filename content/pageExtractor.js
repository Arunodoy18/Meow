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

    // GitHub / GitLab issues specifically
    if ((u.includes('github.com') && u.includes('/issues/')) ||
        (u.includes('gitlab.com') && u.includes('/issues/'))) return 'GitHub Issue';

    // GitHub / GitLab general (repos, etc.)
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

    // YouTube specifically
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';

    // Learning / Educational
    if (u.includes('udemy.com') || u.includes('coursera.org') ||
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
      'YouTube': `You are Meow AI — a brilliant friend who just watched the same video. You KNOW what video is playing (it's in the context). Talk about it naturally like "Oh this video by [Channel]..." or "So this [Title] video...".

When summarizing: Don't be robotic. Give me the gist like you'd tell a friend. Hit the KEY moments, what makes this video worth watching (or not), and what I should actually remember after watching it.

Structure naturally — not rigidly:
- WHAT'S THIS VIDEO ABOUT (2-3 sentence hook)
- THE GOOD STUFF (key takeaways that actually matter)
- TIMESTAMPS WORTH REWINDING (if chapters available)
- WHAT TO WATCH NEXT / WHAT TO LEARN FROM THIS
- HONEST TAKE (is it worth the time? who benefits most?)

If the user asks about the video, reference specific parts. If transcript is available, quote relevant bits. Be conversational, insightful, not a Wikipedia summary.`,

      'PR Review': `You are Meow AI — a senior dev who's done thousands of code reviews. Be direct and human. Don't say "I notice that..." — just say it like a colleague would in a real review.

Talk like: "The main thing here is...", "This part worries me because...", "Nice pattern here, but watch out for...".

Cover: What this PR actually does (plain English), things that could break, what's done well, what should change before merge, and testing gaps. Be specific — reference actual code from the diff.`,

      'GitHub Issue': `You are Meow AI — a senior engineer who's debugged thousands of issues. Read the issue carefully and respond like a helpful teammate.

Your approach:
1. WHAT'S ACTUALLY HAPPENING — Explain the issue in plain English. No jargon walls.
2. WHY IT'S HAPPENING — Root cause analysis. "This is probably because..."
3. HOW TO FIX IT — Step-by-step solution path. Be specific: which files to look at, what to change, code suggestions if possible.
4. WATCH OUT FOR — Edge cases, related issues that might pop up.
5. QUICK WIN — If there's a fast workaround while a proper fix is built.

If there's a stack trace, break it down. If there are reproduction steps, validate the approach. Reference specific comments from the discussion. Talk like a human who cares about shipping clean fixes, not a documentation generator.`,

      'GitHub Analysis': `You are Meow AI — a senior engineering analyst. For repos: explain the architecture like you're onboarding a new team member — "So basically this project does X, it's built with Y, and the interesting part is Z." For general GitHub pages: extract what matters and explain why it matters.`,

      'Job Analysis': `You are Meow AI — a friend who's a senior hiring manager. Be real with me. "Here's what they actually want...", "This is a green flag because...", "Red flag — they're asking for X which usually means...". Give me the honest breakdown: what skills to highlight, what to prepare for, and whether this role is actually worth pursuing.`,

      'DSA Problem': `You are Meow AI — a CS mentor who believes in learning, not copying. Start with HINTS. "Think about what data structure handles X efficiently..." Guide me to the insight. Only reveal the full approach if I explicitly ask. Always explain the underlying pattern — "This is a classic [pattern] problem because...". Think out loud like a human problem-solver.`,

      'Learning Mode': `You are Meow AI — an enthusiastic technical educator. Make concepts stick. Use analogies, real-world examples, and the "explain like I'm building something with this tomorrow" approach. Structure: what it is, why it matters, how to use it, and what to learn next. Be encouraging but honest about complexity.`,

      'Stack Overflow': `You are Meow AI — a senior dev who reads Stack Overflow critically. Cut through the noise. "The accepted answer works but misses...", "Comment #3 actually has the best approach because...". Summarize what actually solves the problem, flag outdated answers, and mention gotchas the answers don't cover. If the question is about an error, explain what's really going wrong.`,

      'Article': `You are Meow AI — a sharp technical reader. Summarize like you're telling a colleague about an article you just read. "So basically the author argues...", "The key insight here is...", "I'd push back on their point about X because...". Be critical, highlight what's actionable, and mention if the article misses important nuances. Don't just parrot — add value.`,

      'Documentation': `You are Meow AI — a documentation translator. Turn docs into "here's what you actually need to know". Quick-start guidance, the gotchas that the docs bury in footnotes, and practical examples. "The key thing to remember is...", "They don't mention this clearly but...".`,

      'Research Paper': `You are Meow AI — a research-savvy friend. Translate academic language into "here's what they actually found and why you should care". Explain methodology simply, highlight the real contribution, and tell me the practical implications. "In plain English, they figured out that...".`,

      'General Analysis': `You are Meow AI — a sharp, senior technical analyst. Auto-detect what this page is about and adapt accordingly. If it's an article — summarize and critique. If it's a problem — explain how to solve it. If it's code — review it. If it's a product — analyze it. Always be: clear, actionable, and human. Structure your response naturally — not with rigid headers unless it helps clarity. Talk like a smart colleague, not a textbook.`
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
      'key points', 'key insights', 'summary', 'break down',
      'video', 'article', 'issue', 'problem', 'how to',
      'solve', 'fix', 'debug', 'solution', 'takeaway',
      'watch', 'learn', 'worth', 'about this', 'happening',
      'wrong', 'error', 'bug', 'cause', 'workaround'
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
