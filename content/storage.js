/**
 * Meow AI - Storage Module
 * Uses chrome.storage.local for persistent, cross-tab storage
 * Falls back to localStorage if chrome.storage unavailable
 */

const MeowStorage = (() => {
  'use strict';

  const KEYS = {
    SITE_CONTROL: 'meow_site_control',
    BUTTON_POSITION: 'meow_button_position',
    CHAT_HISTORY: 'meow_chat_history',
    USER_PREFS: 'meow_user_prefs'
  };

  // ==================== CONTEXT VALIDATION ====================

  function _isContextInvalidated() {
    try {
      return !chrome?.runtime?.id;
    } catch (e) {
      return true;
    }
  }

  // ==================== CHROME STORAGE WRAPPER ====================

  function _get(key) {
    return new Promise((resolve) => {
      if (chrome?.storage?.local && !_isContextInvalidated()) {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            // During extension reload, context becomes invalid - fallback silently
            resolve(_localGet(key));
          } else {
            resolve(result[key] ?? null);
          }
        });
      } else {
        resolve(_localGet(key));
      }
    });
  }

  function _set(key, value) {
    return new Promise((resolve) => {
      if (chrome?.storage?.local && !_isContextInvalidated()) {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            // During extension reload, context becomes invalid - fallback silently
            _localSet(key, value);
          }
          resolve();
        });
      } else {
        _localSet(key, value);
        resolve();
      }
    });
  }

  function _remove(key) {
    return new Promise((resolve) => {
      if (chrome?.storage?.local) {
        chrome.storage.local.remove([key], () => resolve());
      } else {
        try { localStorage.removeItem(key); } catch (e) { /* noop */ }
        resolve();
      }
    });
  }

  // ==================== LOCALSTORAGE FALLBACK ====================

  function _localGet(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function _localSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('🐱 localStorage write failed:', e);
    }
  }

  // ==================== SITE CONTROL ====================

  function getSiteDomain() {
    return window.location.hostname;
  }

  async function getSiteControl() {
    const data = await _get(KEYS.SITE_CONTROL);
    return data || {};
  }

  async function isSiteDisabled() {
    const domain = getSiteDomain();
    const control = await getSiteControl();
    const site = control[domain];

    if (!site || !site.disabled) return false;

    // Check if temporary disable expired
    if (!site.permanently && site.disabledUntil) {
      if (Date.now() > site.disabledUntil) {
        delete control[domain];
        await _set(KEYS.SITE_CONTROL, control);
        return false;
      }
    }

    return true;
  }

  async function disableSite(temporarily = false) {
    const domain = getSiteDomain();
    const control = await getSiteControl();
    control[domain] = {
      disabled: true,
      disabledUntil: temporarily ? Date.now() + 24 * 60 * 60 * 1000 : null,
      permanently: !temporarily
    };
    await _set(KEYS.SITE_CONTROL, control);
  }

  async function enableSite() {
    const domain = getSiteDomain();
    const control = await getSiteControl();
    delete control[domain];
    await _set(KEYS.SITE_CONTROL, control);
  }

  // ==================== BUTTON POSITION ====================

  async function saveButtonPosition(left, top) {
    await _set(KEYS.BUTTON_POSITION, { left, top });
  }

  async function loadButtonPosition() {
    return await _get(KEYS.BUTTON_POSITION);
  }

  // ==================== PUBLIC API ====================

  return {
    KEYS,
    get: _get,
    set: _set,
    remove: _remove,
    getSiteDomain,
    isSiteDisabled,
    disableSite,
    enableSite,
    saveButtonPosition,
    loadButtonPosition
  };
})();
