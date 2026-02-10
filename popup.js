/**
 * Meow AI - Popup Script v2.0
 * Handles popup UI, page analysis, and backend API calls.
 * Backend: Cloudflare Workers -> Gemini 2.5 Flash
 */

const BACKEND_API_URL = 'https://meow-ai-backend.meow-ai-arunodoy.workers.dev/api/chat';

// ==================== MODE CONFIGURATION ====================

const MODES = {
  pr_review: {
    label: 'PR Review',
    systemPrompt: 'You are Meow AI - an elite code reviewer. Provide: SUMMARY, KEY CONCERNS, STRENGTHS, IMPROVEMENTS, MERGE RECOMMENDATION. Be concise and actionable.'
  },
  github_analysis: {
    label: 'GitHub Analysis',
    systemPrompt: 'You are Meow AI - a senior engineering analyst. Provide: SUMMARY, TECHNICAL DEPTH, WHY THIS MATTERS, KEY TAKEAWAY.'
  },
  job_analysis: {
    label: 'Job Analysis',
    systemPrompt: 'You are Meow AI - an elite career strategist. Provide: ROLE SUMMARY, SKILL GAP ANALYSIS, COMPETITIVE ADVANTAGE, NEXT STEPS.'
  },
  dsa_problem: {
    label: 'DSA Problem',
    systemPrompt: 'You are Meow AI - an elite CS tutor. Guide with hints. Provide: PROBLEM TYPE, KEY INSIGHT, APPROACH HINT, COMPLEXITY ANALYSIS. Teach, don\'t solve.'
  },
  learning_mode: {
    label: 'Learning Mode',
    systemPrompt: 'You are Meow AI - an elite technical educator. Provide: CORE CONCEPTS, KEY TAKEAWAYS, PRACTICAL APPLICATION, LEARN NEXT.'
  },
  general_analysis: {
    label: 'General Analysis',
    systemPrompt: 'You are Meow AI - a senior technical analyst. Provide: SUMMARY, KEY INSIGHT, PRACTICAL VALUE. Be clear and actionable.'
  }
};

// ==================== MODE DETECTION ====================

function detectMode(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('github.com') && u.includes('/pull')) return 'pr_review';
  if (u.includes('github.com')) return 'github_analysis';
  if (u.includes('linkedin.com/jobs')) return 'job_analysis';
  if (u.includes('leetcode.com')) return 'dsa_problem';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'learning_mode';
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
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, { action: 'getPageContent' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error('Page not ready. Please refresh and try again.'));
          return;
        }
        if (!response) {
          reject(new Error('No response from page. Please refresh.'));
          return;
        }
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Failed to extract content'));
        }
      });
    } catch (error) {
      reject(new Error('Communication error: ' + error.message));
    }
  });
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
