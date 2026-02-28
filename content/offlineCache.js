/**
 * Meow AI - Offline Cache v1.0
 * Caches AI responses for offline viewing and faster revisits.
 * Uses chrome.storage.local with LRU eviction.
 */

const MeowOfflineCache = (() => {
  'use strict';

  const CACHE_KEY = 'meow_response_cache';
  const MAX_CACHE_ENTRIES = 50;
  const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  // ==================== CACHE KEY GENERATION ====================

  /**
   * Generate a cache key from URL + query.
   */
  function _generateKey(url, query) {
    const normalized = (url || '').split('?')[0].split('#')[0].toLowerCase();
    const q = (query || '').toLowerCase().trim().substring(0, 100);
    return `${normalized}__${q}`;
  }

  // ==================== STORAGE ====================

  async function _loadCache() {
    try {
      const data = await MeowStorage.get(CACHE_KEY);
      return data || {};
    } catch (e) {
      return {};
    }
  }

  async function _saveCache(cache) {
    await MeowStorage.set(CACHE_KEY, cache);
  }

  // ==================== LRU EVICTION ====================

  function _evictOldEntries(cache) {
    const entries = Object.entries(cache);
    if (entries.length <= MAX_CACHE_ENTRIES) return cache;

    // Remove expired entries first
    const now = Date.now();
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > CACHE_TTL_MS) {
        delete cache[key];
      }
    }

    // If still over limit, remove oldest by access time
    const remaining = Object.entries(cache);
    if (remaining.length > MAX_CACHE_ENTRIES) {
      remaining.sort((a, b) => (a[1].lastAccess || a[1].timestamp) - (b[1].lastAccess || b[1].timestamp));
      const toRemove = remaining.length - MAX_CACHE_ENTRIES;
      for (let i = 0; i < toRemove; i++) {
        delete cache[remaining[i][0]];
      }
    }

    return cache;
  }

  // ==================== PUBLIC API ====================

  /**
   * Store a response in cache.
   * @param {string} url - Page URL
   * @param {string} query - User query
   * @param {string} response - AI response
   * @param {string} mode - Page mode
   */
  async function store(url, query, response, mode) {
    if (!response || response.length < 20) return;

    const cache = await _loadCache();
    const key = _generateKey(url, query);

    cache[key] = {
      url,
      query: query.substring(0, 200),
      response: response.substring(0, 8000),
      mode,
      timestamp: Date.now(),
      lastAccess: Date.now()
    };

    const cleaned = _evictOldEntries(cache);
    await _saveCache(cleaned);
  }

  /**
   * Retrieve a cached response.
   * @param {string} url - Page URL
   * @param {string} query - User query
   * @returns {Promise<{response: string, mode: string, timestamp: number, cached: true}|null>}
   */
  async function retrieve(url, query) {
    const cache = await _loadCache();
    const key = _generateKey(url, query);
    const entry = cache[key];

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      delete cache[key];
      await _saveCache(cache);
      return null;
    }

    // Update access time
    entry.lastAccess = Date.now();
    await _saveCache(cache);

    return {
      response: entry.response,
      mode: entry.mode,
      timestamp: entry.timestamp,
      cached: true
    };
  }

  /**
   * Check if we have a cached response (without retrieving).
   * @param {string} url
   * @param {string} query
   * @returns {Promise<boolean>}
   */
  async function has(url, query) {
    const result = await retrieve(url, query);
    return result !== null;
  }

  /**
   * Clear all cached responses.
   * @returns {Promise<void>}
   */
  async function clear() {
    await MeowStorage.set(CACHE_KEY, {});
  }

  /**
   * Get cache statistics.
   * @returns {Promise<{entries: number, totalSize: number}>}
   */
  async function getStats() {
    const cache = await _loadCache();
    const entries = Object.keys(cache).length;
    const totalSize = JSON.stringify(cache).length;
    return { entries, totalSize };
  }

  return {
    store,
    retrieve,
    has,
    clear,
    getStats
  };
})();
