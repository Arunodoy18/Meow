/**
 * Meow AI - Background Service Worker v1.0
 * Handles: context menu, badge updates, cross-tab messaging,
 * anonymous user tokens, keyboard command routing.
 */

// ==================== ANONYMOUS USER TOKEN ====================

async function getOrCreateUserToken() {
  const result = await chrome.storage.local.get(['meow_user_token']);
  if (result.meow_user_token) {
    return result.meow_user_token;
  }

  // Generate anonymous token (no PII)
  const token = 'meow_' + crypto.randomUUID();
  await chrome.storage.local.set({ meow_user_token: token });
  return token;
}

// ==================== CONTEXT MENU ====================

chrome.runtime.onInstalled.addListener(() => {
  // Create context menu items
  chrome.contextMenus.create({
    id: 'meow-analyze-selection',
    title: '🐱 Ask Meow AI about this',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'meow-analyze-page',
    title: '🐱 Analyze this page',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'meow-analyze-link',
    title: '🐱 What is this link about?',
    contexts: ['link']
  });

  chrome.contextMenus.create({
    id: 'meow-analyze-image',
    title: '🐱 Describe this image context',
    contexts: ['image']
  });

  chrome.contextMenus.create({
    id: 'meow-separator',
    type: 'separator',
    contexts: ['selection', 'page']
  });

  chrome.contextMenus.create({
    id: 'meow-explain-code',
    title: '🐱 Explain this code',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'meow-review-code',
    title: '🐱 Review this code',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'meow-fix-error',
    title: '🐱 Help fix this error',
    contexts: ['selection']
  });

  // Initialize user token
  getOrCreateUserToken();

  // Set initial badge
  chrome.action.setBadgeBackgroundColor({ color: '#22C55E' });
  console.log('🐱 Meow AI installed / updated');
});

// ==================== CONTEXT MENU HANDLER ====================

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  const actionMap = {
    'meow-analyze-selection': {
      action: 'contextMenuAction',
      message: info.selectionText,
      prompt: 'Analyze this: '
    },
    'meow-analyze-page': {
      action: 'contextMenuAction',
      message: null,
      prompt: 'Explain this page in detail'
    },
    'meow-analyze-link': {
      action: 'contextMenuAction',
      message: info.linkUrl,
      prompt: 'What can you tell me about this link: '
    },
    'meow-analyze-image': {
      action: 'contextMenuAction',
      message: info.srcUrl,
      prompt: 'Describe the context around this image on the page'
    },
    'meow-explain-code': {
      action: 'contextMenuAction',
      message: info.selectionText,
      prompt: 'Explain this code step by step:\n\n'
    },
    'meow-review-code': {
      action: 'contextMenuAction',
      message: info.selectionText,
      prompt: 'Review this code for bugs, improvements, and best practices:\n\n'
    },
    'meow-fix-error': {
      action: 'contextMenuAction',
      message: info.selectionText,
      prompt: 'Help me fix this error:\n\n'
    }
  };

  const config = actionMap[info.menuItemId];
  if (!config) return;

  try {
    // Ensure content script is loaded
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => typeof MeowChatUI !== 'undefined'
    }).catch(() => null);

    // Send message to content script
    const fullMessage = config.message ? config.prompt + config.message : config.prompt;
    chrome.tabs.sendMessage(tab.id, {
      action: config.action,
      message: fullMessage
    });
  } catch (e) {
    console.error('🐱 Context menu action failed:', e);
  }
});

// ==================== KEYBOARD COMMAND HANDLER ====================

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === '_execute_action') {
    // Toggle panel via action click
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
    }
  }
});

// ==================== MESSAGE HANDLER ====================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getUserToken':
      getOrCreateUserToken().then(token => sendResponse({ token }));
      return true;

    case 'updateBadge':
      if (request.mode) {
        const modeEmojis = {
          'PR Review': 'PR',
          'GitHub Analysis': 'GH',
          'Job Analysis': 'JOB',
          'DSA Problem': 'DSA',
          'Learning Mode': 'EDU',
          'Stack Overflow': 'SO',
          'Research Paper': 'RES',
          'Documentation': 'DOC',
          'Article': 'ART',
          'General Analysis': ''
        };
        const text = modeEmojis[request.mode] || '';
        chrome.action.setBadgeText({ text, tabId: sender.tab?.id });
      }
      sendResponse({ success: true });
      return false;

    case 'trackUsage':
      _trackUsage(request.data);
      sendResponse({ success: true });
      return false;

    case 'getUsageStats':
      _getUsageStats().then(stats => sendResponse(stats));
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
      return false;
  }
});

// ==================== USAGE TRACKING (LOCAL ONLY) ====================

async function _trackUsage(data) {
  try {
    const result = await chrome.storage.local.get(['meow_usage_stats']);
    const stats = result.meow_usage_stats || _defaultStats();

    const today = new Date().toISOString().split('T')[0];

    // Update daily stats
    if (!stats.daily[today]) {
      stats.daily[today] = { queries: 0, modes: {} };
    }
    stats.daily[today].queries++;
    stats.daily[today].modes[data.mode] = (stats.daily[today].modes[data.mode] || 0) + 1;

    // Update totals
    stats.totalQueries++;
    stats.modeUsage[data.mode] = (stats.modeUsage[data.mode] || 0) + 1;
    stats.lastActive = Date.now();

    // Streak calculation
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (stats.lastActiveDate === yesterday) {
      stats.currentStreak++;
    } else if (stats.lastActiveDate !== today) {
      stats.currentStreak = 1;
    }
    stats.lastActiveDate = today;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);

    // Prune old daily entries (keep 90 days)
    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
    for (const date of Object.keys(stats.daily)) {
      if (date < cutoff) delete stats.daily[date];
    }

    await chrome.storage.local.set({ meow_usage_stats: stats });
  } catch (e) {
    console.error('🐱 Usage tracking error:', e);
  }
}

async function _getUsageStats() {
  const result = await chrome.storage.local.get(['meow_usage_stats']);
  return result.meow_usage_stats || _defaultStats();
}

function _defaultStats() {
  return {
    totalQueries: 0,
    modeUsage: {},
    daily: {},
    currentStreak: 0,
    maxStreak: 0,
    lastActive: 0,
    lastActiveDate: '',
    installDate: new Date().toISOString().split('T')[0]
  };
}

// ==================== TAB UPDATE LISTENER ====================

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Clear badge on navigation
    chrome.action.setBadgeText({ text: '', tabId });
  }
});
