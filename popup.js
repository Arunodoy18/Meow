/**
 * Meow AI - Popup Script v3.0
 * Handles popup UI, page analysis, and backend API calls.
 * Backend: Cloudflare Workers -> Gemini 2.5 Flash
 */

const BACKEND_API_URL = 'https://meow-ai-backend.meow-ai-arunodoy.workers.dev/api/chat';

// ==================== MODE CONFIGURATION ====================

const MODES = {
  pr_review: {
    label: 'PR Review',
    systemPrompt: 'You are Meow AI — an elite code reviewer. Provide: SUMMARY, KEY CONCERNS, STRENGTHS, IMPROVEMENTS, MERGE RECOMMENDATION. Suggest test cases. Be specific and actionable.'
  },
  github_analysis: {
    label: 'GitHub Analysis',
    systemPrompt: 'You are Meow AI — a senior engineering analyst. Provide: SUMMARY, TECHNICAL DEPTH, WHY THIS MATTERS IN REAL WORLD, POTENTIAL RISKS, KEY TAKEAWAY.'
  },
  job_analysis: {
    label: 'Job Analysis',
    systemPrompt: 'You are Meow AI — an elite career strategist. Provide: ROLE SUMMARY, SKILL GAP ANALYSIS, COMPETITIVE ADVANTAGE, PREPARATION PLAN, NEXT STEPS. Suggest high ROI skills.'
  },
  dsa_problem: {
    label: 'DSA Problem',
    systemPrompt: 'You are Meow AI — an elite CS tutor. HINT-FIRST: Guide with direction, not answers. Provide: PROBLEM TYPE, KEY INSIGHT, APPROACH HINT, COMPLEXITY ANALYSIS. Only show full solution if explicitly asked.'
  },
  learning_mode: {
    label: 'Learning Mode',
    systemPrompt: 'You are Meow AI — an elite technical educator. Provide: CORE CONCEPTS, KEY TAKEAWAYS, PRACTICAL APPLICATION, LEARN NEXT. Focus on retention.'
  },
  stack_overflow: {
    label: 'Stack Overflow',
    systemPrompt: 'You are Meow AI — a senior developer. Cut through the noise. Summarize the real answer, highlight caveats, detect bugs in solutions, mention alternatives.'
  },
  article: {
    label: 'Article',
    systemPrompt: 'You are Meow AI — a technical curator. Provide: KEY POINTS, CRITICAL ANALYSIS, ACTIONABLE TAKEAWAYS, WHY THIS MATTERS. Be analytical, not generic.'
  },
  documentation: {
    label: 'Documentation',
    systemPrompt: 'You are Meow AI — a documentation expert. Summarize the API/feature, highlight gotchas, provide quick-start guidance, suggest edge cases to test.'
  },
  research_paper: {
    label: 'Research Paper',
    systemPrompt: 'You are Meow AI — a research analyst. Provide: SUMMARY, METHODOLOGY, KEY FINDINGS, PRACTICAL IMPLICATIONS. Explain in plain language.'
  },
  general_analysis: {
    label: 'General Analysis',
    systemPrompt: 'You are Meow AI — a senior technical analyst. Provide: SUMMARY, KEY TECH INSIGHT, WHY THIS MATTERS, POTENTIAL RISKS, SUGGESTED NEXT STEP. Be clear and actionable.'
  }
};

// ==================== MODE DETECTION ====================

function detectMode(url) {
  const u = (url || '').toLowerCase();
  if ((u.includes('github.com') && u.includes('/pull')) ||
      (u.includes('gitlab.com') && u.includes('/merge_requests'))) return 'pr_review';
  if (u.includes('github.com') || u.includes('gitlab.com')) return 'github_analysis';
  if (u.includes('linkedin.com/jobs') || u.includes('linkedin.com/in/') ||
      u.includes('indeed.com') || u.includes('glassdoor.com')) return 'job_analysis';
  if (u.includes('leetcode.com') || u.includes('hackerrank.com') ||
      u.includes('codechef.com') || u.includes('codeforces.com') ||
      u.includes('geeksforgeeks.org/problems') || u.includes('neetcode.io')) return 'dsa_problem';
  if (u.includes('youtube.com') || u.includes('youtu.be') ||
      u.includes('udemy.com') || u.includes('coursera.org')) return 'learning_mode';
  if (u.includes('stackoverflow.com') || u.includes('stackexchange.com') ||
      u.includes('superuser.com') || u.includes('serverfault.com')) return 'stack_overflow';
  if (u.includes('arxiv.org') || u.includes('scholar.google') ||
      u.includes('semanticscholar.org') || u.includes('openreview.net')) return 'research_paper';
  if (u.includes('docs.') || u.includes('documentation') ||
      u.includes('developer.mozilla.org') || u.includes('devdocs.io') ||
      u.includes('learn.microsoft.com')) return 'documentation';
  if (u.includes('medium.com') || u.includes('dev.to') ||
      u.includes('hashnode.') || u.includes('freecodecamp.org') ||
      u.includes('hackernoon.com') || u.includes('news.ycombinator.com')) return 'article';
  return 'general_analysis';
}

// ==================== INITIALIZATION ====================

async function initializeMode() {
  const modeDisplay = document.getElementById('modeDisplay');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      const mode = detectMode(tab.url);
      const config = MODES[mode];
      modeDisplay.textContent = config.label;
      modeDisplay.style.display = 'inline-block';
    }
  } catch (e) {
    console.error('Mode detection error:', e);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  showMainScreen();
  initializeMode();

  document.getElementById('settingsBtn').addEventListener('click', showSettingsScreen);
  document.getElementById('closeSettingsBtn').addEventListener('click', showMainScreen);

  const explainBtn = document.getElementById('explainBtn');
  const resultsDiv = document.getElementById('results');
  const modeDisplay = document.getElementById('modeDisplay');

  explainBtn.addEventListener('click', async () => {
    try {
      resultsDiv.className = 'results-section';
      resultsDiv.textContent = 'Analyzing page...';
      resultsDiv.style.display = 'block';
      explainBtn.disabled = true;

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('No active tab found');

      const mode = detectMode(tab.url);
      const config = MODES[mode];

      modeDisplay.textContent = config.label;
      modeDisplay.style.display = 'inline-block';

      resultsDiv.textContent = 'Extracting page content...';
      const pageContent = await getPageContent(tab.id);

      if (!pageContent?.textContent) {
        throw new Error('Could not extract page content');
      }

      const textToAnalyze = pageContent.textContent.substring(0, 3000);

      resultsDiv.textContent = 'Asking AI (' + config.label + ')...';
      const aiResponse = await callBackendAPI(textToAnalyze, pageContent.title, mode);

      resultsDiv.textContent = aiResponse;
      resultsDiv.classList.add('success');

    } catch (error) {
      resultsDiv.textContent = 'Error: ' + error.message;
      resultsDiv.classList.add('error');
      console.error('Meow AI Error:', error);
    } finally {
      explainBtn.disabled = false;
    }
  });
});

// ==================== UI STATE ====================

function showMainScreen() {
  document.getElementById('mainScreen').style.display = 'block';
  document.getElementById('settingsScreen').style.display = 'none';
}

function showSettingsScreen() {
  document.getElementById('mainScreen').style.display = 'none';
  document.getElementById('settingsScreen').style.display = 'block';
}

// ==================== PAGE CONTENT ====================

async function getPageContent(tabId) {
  // Strategy 1: Try content script message (fast, rich extraction)
  try {
    const response = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { action: 'getPageContent' }, (resp) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(resp);
      });
    });

    if (response?.success && response.data) {
      return response.data;
    }
  } catch (_ignored) {
    // Content script not injected yet — fall through to fallback
  }

  // Strategy 2: Direct extraction via scripting API (works even without content scripts)
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const title = document.title || '';
        const url = window.location.href;

        // Smart text extraction — skip nav, footer, ads
        const selectors = ['main', 'article', '[role="main"]', '.content', '#content', '.post-body'];
        let mainEl = null;
        for (const sel of selectors) {
          mainEl = document.querySelector(sel);
          if (mainEl) break;
        }
        const source = mainEl || document.body;
        const textContent = (source?.innerText || '').substring(0, 5000);

        // Grab code blocks if present
        const codeBlocks = [];
        document.querySelectorAll('pre code, .highlight code, .CodeMirror-code').forEach(block => {
          if (block.textContent.trim().length > 10) {
            codeBlocks.push(block.textContent.trim().substring(0, 1000));
          }
        });

        return {
          title,
          textContent: textContent + (codeBlocks.length ? '\n\n[Code]:\n' + codeBlocks.join('\n---\n') : ''),
          url,
          mode: 'General Analysis'
        };
      }
    });

    if (results?.[0]?.result) {
      return results[0].result;
    }
  } catch (scriptError) {
    console.error('Meow AI scripting fallback failed:', scriptError);
  }

  throw new Error('Cannot access this page. Try refreshing or navigating to it again.');
}

// ==================== BACKEND API ====================

async function callBackendAPI(text, title, mode) {
  const config = MODES[mode];
  const message = `Page Title: ${title}\n\nPage Content:\n${text}\n\nProvide a concise, insightful analysis.`;

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
      if (response.status === 503) throw new Error('AI model loading. Try again in 20s.');
      if (response.status === 500) throw new Error('Backend error. Try again later.');
      if (response.status === 429) throw new Error('Rate limited. Wait a moment.');
      throw new Error('API error: ' + response.status);
    }

    const data = await response.json();
    if (data.success && data.response) return data.response;
    if (data.error) throw new Error(data.error);
    throw new Error('Unexpected response format');

  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Request timed out. Try again.');
    if (error.message.includes('Failed to fetch')) throw new Error('Network error. Check connection.');
    throw error;
  }
}
