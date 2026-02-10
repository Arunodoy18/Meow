/**
 * Meow AI - Popup Script
 * Handles user interactions and AI analysis with Smart Context Detection
 * 
 * ARCHITECTURE:
 * - Backend proxy: Cloudflare Workers (handles API authentication)
 * - Frontend: Chrome Extension (zero setup for users)
 * - AI Model: Mistral-7B-Instruct via Hugging Face Inference API
 * - Security: API keys stored as encrypted environment secrets server-side
 */

// Backend API Configuration
// SECURITY: API calls go through secure Cloudflare Workers backend
// API key is stored as encrypted environment secret on server (never exposed to users)
const BACKEND_API_URL = 'https://meow-ai-backend.meow-ai-arunodoy.workers.dev/api/chat';

// Mode configuration with elite developer copilot prompts
const MODES = {
  pr_review: {
    label: 'PR Review',
    systemPrompt: `You are Meow AI - an elite code review expert operating at senior engineer level.

ANALYZE this Pull Request with engineering rigor:

1. TECHNICAL ASSESSMENT
   - Code quality and maintainability
   - Performance implications
   - Security concerns
   - Breaking changes or migration needs

2. REVIEW FOCUS
   - What problem is being solved?
   - Are there better architectural approaches?
   - Edge cases or error handling gaps?
   - Testing coverage adequacy

3. ACTIONABLE FEEDBACK
   - Specific improvement suggestions
   - Risk warnings (deployment, scaling, backwards compatibility)
   - Industry best practices applicable here

OUTPUT FORMAT:
SUMMARY: [brief overview]
KEY CONCERNS: [if any]
STRENGTHS: [what's done well]
SUGGESTED IMPROVEMENTS: [actionable items]
MERGE RECOMMENDATION: [ready/needs work/risky]

Be direct, insightful, and focus on what matters to production systems.`
  },
  github_analysis: {
    label: 'GitHub Analysis',
    systemPrompt: `You are Meow AI - an elite software engineering analyst and technical mentor.

ANALYZE this GitHub content with depth:

1. TECHNICAL INTELLIGENCE
   - What's the core technical problem or discussion?
   - Technology stack and architectural patterns used
   - Complexity level and sophistication

2. ENGINEERING INSIGHTS
   - Why does this matter in production systems?
   - What are the tradeoffs being discussed?
   - Industry patterns or anti-patterns present
   - Performance and scalability considerations

3. LEARNING OPPORTUNITIES
   - Key concepts a developer should understand
   - Related technologies or patterns to explore
   - Real-world applications

OUTPUT FORMAT:
SUMMARY: [concise overview]
TECHNICAL DEPTH: [what's happening technically]
WHY THIS MATTERS: [real-world engineering impact]
KEY TAKEAWAY: [main learning or insight]
SUGGESTED NEXT: [if contributing/learning from this]

Think like a senior engineer reviewing a teammate's work or explaining complex systems.`
  },
  job_analysis: {
    label: 'Job Analysis',
    systemPrompt: `You are Meow AI - an elite career strategist with deep understanding of tech hiring.

ANALYZE this job with strategic intelligence:

1. ROLE INTELLIGENCE
   - Actual responsibilities (not just buzzwords)
   - Seniority level implications
   - Team structure and growth trajectory

2. SKILL ASSESSMENT
   - Required skills (must-have)
   - Nice-to-have skills
   - Skill gaps to address
   - High-ROI skills to prioritize learning

3. STRATEGIC POSITIONING
   - Red flags or concerns
   - Compensation expectations for this level
   - Company stage implications (startup/growth/enterprise)
   - Career growth potential

4. ACTION PLAN
   - How to strengthen your candidacy
   - Portfolio projects that would stand out
   - Interview preparation focus areas

OUTPUT FORMAT:
ROLE SUMMARY: [what you'd actually be doing]
SKILL GAP ANALYSIS: [what you need]
COMPETITIVE ADVANTAGE: [how to stand out]
RED FLAGS: [concerns if any]
NEXT STEPS: [concrete actions]

Be realistic, strategic, and focus on long-term career value.`
  },
  dsa_problem: {
    label: 'DSA Problem Mode',
    systemPrompt: `You are Meow AI - an elite computer science tutor and interview prep expert.

ANALYZE this coding problem with teaching excellence:

1. PROBLEM UNDERSTANDING
   - Core challenge being tested
   - Hidden constraints or edge cases
   - Difficulty level and interview context

2. SOLUTION STRATEGY (HINT-FIRST)
   - Thought process to arrive at solution
   - Data structure selection reasoning
   - Algorithm pattern recognition
   - Time/space complexity targets

3. ENGINEERING PERSPECTIVE
   - Why this pattern matters in real systems
   - Common mistakes to avoid
   - Optimization opportunities
   - Related problems to practice

OUTPUT FORMAT:
PROBLEM TYPE: [pattern category]
KEY INSIGHT: [the "aha" moment]
APPROACH HINT: [direction without full solution]
COMPLEXITY ANALYSIS: [Big O targets]
REAL-WORLD CONNECTION: [why this matters]
PRACTICE NEXT: [similar problems]

Guide toward understanding, not just answers. Think like a great CS mentor.`
  },
  learning_mode: {
    label: 'Learning Mode',
    systemPrompt: `You are Meow AI - an elite technical educator and learning strategist.

ANALYZE this learning content with educational depth:

1. CONTENT ASSESSMENT
   - Main concepts being taught
   - Difficulty level and prerequisites
   - Teaching quality and clarity

2. LEARNING EXTRACTION
   - Key takeaways to internalize
   - Mental models to build
   - Common misconceptions to avoid
   - Practical applications

3. SKILL BUILDING STRATEGY
   - How this fits into broader skill development
   - Hands-on projects to solidify learning
   - Related concepts to explore next
   - Industry relevance and ROI

OUTPUT FORMAT:
CORE CONCEPTS: [what's being taught]
KEY TAKEAWAYS: [must-remember points]
PRACTICAL APPLICATION: [how to use this]
SKILL DEVELOPMENT: [how to practice/deepen]
LEARN NEXT: [logical progression]

Focus on retention, understanding, and career-relevant skill building.`
  },
  general_analysis: {
    label: 'General Analysis',
    systemPrompt: `You are Meow AI - an elite technical analyst operating at senior professional level.

ANALYZE this content with intelligence and insight:

1. SMART SUMMARY
   - Core message or purpose
   - Key information extracted
   - Content type and context

2. CRITICAL ANALYSIS
   - What's valuable here?
   - What's missing or misleading?
   - Hidden implications or risks

3. ACTIONABLE INSIGHT
   - One key takeaway
   - How this could be useful
   - Suggested next action if relevant

OUTPUT FORMAT:
SUMMARY: [clear, concise overview]
KEY INSIGHT: [what matters most]
PRACTICAL VALUE: [how to use this]
SUGGESTED ACTION: [next step if applicable]

Be clear, insightful, and focus on what actually matters. Think like a trusted senior colleague.`
  }
};

// Wait for DOM to load
/**
 * Initialize mode detection and display
 */
async function initializeMode() {
  const modeDisplay = document.getElementById('modeDisplay');
  
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.url) {
      // Detect mode based on URL
      const mode = detectMode(tab.url);
      const modeConfig = MODES[mode];
      
      // Display detected mode
      modeDisplay.innerHTML = `
        <strong>🎯 Mode:</strong> ${modeConfig.label}
      `;
      modeDisplay.style.display = 'block';
    }
  } catch (error) {
    console.error('Error detecting mode:', error);
  }
}

// ==================== INITIALIZATION ====================

/**
 * Initialize popup on load
 * - Check if API key is configured
 * - Show appropriate screen (setup or main)
 * - Set up all event listeners
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Backend handles authentication - no setup needed!
  // Show main screen directly
  showMainScreen();
  initializeMode();
  
  // ==================== EVENT LISTENERS ====================
  
  // Settings button - Show about screen
  const settingsBtn = document.getElementById('settingsBtn');
  settingsBtn.addEventListener('click', showSettingsScreen);
  
  // Close settings button - Return to main
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  closeSettingsBtn.addEventListener('click', showMainScreen);
  
  // Main screen - Explain button
  const explainBtn = document.getElementById('explainBtn');
  const resultsDiv = document.getElementById('results');
  const modeDisplay = document.getElementById('modeDisplay');

  // Add click listener to the "Explain This Page" button
  explainBtn.addEventListener('click', async () => {
    try {
      // Reset previous state
      resultsDiv.className = 'results-section';
      resultsDiv.textContent = '🔍 Analyzing page...';
      resultsDiv.style.display = 'block';
      explainBtn.disabled = true;

      // Step 1: Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab found');
      }

      // Step 2: Detect website mode based on URL
      const mode = detectMode(tab.url);
      const modeConfig = MODES[mode];
      
      // Display detected mode in UI
      modeDisplay.textContent = `🎯 Mode: ${modeConfig.label}`;
      modeDisplay.className = 'mode-display active';

      // Step 3: Get page content from content script
      resultsDiv.textContent = '📄 Extracting page content...';
      const pageContent = await getPageContent(tab.id);

      if (!pageContent || !pageContent.textContent) {
        throw new Error('Could not extract page content');
      }

      // Step 4: Prepare text for AI (limit to 2000 chars for faster response)
      const textToAnalyze = pageContent.textContent.substring(0, 2000);
      
      // Step 5: Call backend API with mode-specific prompt
      resultsDiv.textContent = `🤖 Asking AI (${modeConfig.label})...`;
      const aiResponse = await callHuggingFaceAPI(textToAnalyze, pageContent.title, mode);

      // Step 6: Display AI response
      resultsDiv.textContent = aiResponse;
      resultsDiv.classList.add('success');

    } catch (error) {
      // Handle errors gracefully
      resultsDiv.textContent = '❌ Error: ' + error.message;
      resultsDiv.classList.add('error');
      console.error('Meow AI Error:', error);
    } finally {
      // Re-enable button
      explainBtn.disabled = false;
    }
  });
});

/**
 * Detect page type based on current tab URL
 * Returns appropriate mode identifier based on URL patterns
 * @param {string} url - The current tab URL
 * @returns {string} Mode identifier (pr_review, github_analysis, job_analysis, etc.)
 */
function detectMode(url) {
  const urlLower = url.toLowerCase();
  
  // Check for GitHub Pull Request (more specific, check first)
  if (urlLower.includes('github.com') && urlLower.includes('/pull')) {
    return 'pr_review';
  }
  
  // Check for GitHub (general)
  if (urlLower.includes('github.com')) {
    return 'github_analysis';
  }
  
  // Check for LinkedIn Jobs
  if (urlLower.includes('linkedin.com/jobs')) {
    return 'job_analysis';
  }
  
  // Check for LeetCode
  if (urlLower.includes('leetcode.com')) {
    return 'dsa_problem';
  }
  
  // Check for YouTube
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return 'learning_mode';
  }
  
  // Default to general analysis
  return 'general_analysis';
}

// ==================== UI STATE MANAGEMENT ====================

/**
 * Show main screen
 */
function showMainScreen() {
  document.getElementById('mainScreen').style.display = 'block';
  document.getElementById('settingsScreen').style.display = 'none';
}

/**
 * Show about/settings screen
 */
function showSettingsScreen() {
  document.getElementById('mainScreen').style.display = 'none';
  document.getElementById('mainScreen').style.display = 'none';
  document.getElementById('settingsScreen').style.display = 'block';
}

/**
 * Get page content from the active tab via content script
 * @param {number} tabId - The ID of the tab to extract content from
 * @returns {Promise<Object>} Page content including title and text
 */
async function getPageContent(tabId) {
  return new Promise((resolve, reject) => {
    // CRASH-SAFE messaging for demo
    try {
      chrome.tabs.sendMessage(
        tabId,
        { action: 'getPageContent' },
        (response) => {
          // Handle Chrome runtime errors (content script not loaded)
          if (chrome.runtime.lastError) {
            console.error('Message error:', chrome.runtime.lastError.message);
            reject(new Error('⚠️ Page not ready. Please refresh the page and try again.'));
            return;
          }
          
          // Handle response errors
          if (!response) {
            reject(new Error('⚠️ No response from page. Please refresh.'));
            return;
          }
          
          if (response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response.error || 'Failed to extract page content'));
          }
        }
      );
    } catch (error) {
      reject(new Error('⚠️ Communication error: ' + error.message));
    }
  });
}

/**
 * Call Hugging Face Inference API to analyze page content with mode-specific prompt
 * @param {string} text - The page text to analyze
 * @param {string} title - The page title for context
 * @param {string} mode - The detected mode (github_mode, job_mode, etc.)
 * @returns {Promise<string>} AI-generated explanation
 * 
 * SECURITY NOTE:
 * - API key retrieved from secure storage before each call
 * - Key never logged or exposed in error messages
 * - If key missing, user redirected to setup
 */
async function callHuggingFaceAPI(text, title, mode) {
  // SECURITY: Backend proxy handles all API authentication
  // No API key needed in extension code
  
  // Get mode-specific configuration
  const modeConfig = MODES[mode];
  
  // Create message for backend
  const message = `Page Title: ${title}\n\nPage Content:\n${text}\n\nProvide a concise, insightful analysis based on this ${mode.replace('_mode', '')} context.`;

  try {
    // Call backend proxy instead of Hugging Face directly
    const response = await fetch(BACKEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        mode: mode
      })
    });

    if (!response.ok) {
      // Handle API errors
      if (response.status === 503) {
        throw new Error('AI model is loading. Please try again in 20-30 seconds.');
      } else if (response.status === 500) {
        throw new Error('Backend server error. Please try again later.');
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    }

    const data = await response.json();

    // Extract response from backend
    if (data.success && data.response) {
      return data.response;
    } else if (data.error) {
      throw new Error(data.error);
    } else {
      throw new Error('Unexpected API response format');
    }

  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Network error. Check your internet connection.');
    }
    throw error;
  }
}
