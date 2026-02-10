/**
 * Meow AI - Scroll Manager
 * Smart auto-scroll engine for streaming chat.
 * - Auto-scrolls only when user is near bottom
 * - Prevents scroll jump during streaming
 * - Force-scrolls on message finalization
 * - Uses RAF for smooth, jank-free scrolling
 */

const MeowScrollManager = (() => {
  'use strict';

  let _container = null;
  let _isUserScrolled = false;  // user has scrolled up manually
  let _rafId = null;
  let _targetScrollTop = 0;
  let _isAnimating = false;

  const NEAR_BOTTOM_THRESHOLD = 80; // px from bottom to count as "near bottom"
  const SCROLL_LERP = 0.3;          // smoothing factor for animated scroll

  // ==================== INITIALIZATION ====================

  /**
   * Bind to a scrollable container element.
   * @param {HTMLElement} container - The .meow-chat-messages element
   */
  function init(container) {
    _container = container;
    _isUserScrolled = false;

    // Detect manual user scroll
    _container.addEventListener('scroll', _onScroll, { passive: true });

    // Detect mousewheel / touch scroll = user intent
    _container.addEventListener('wheel', _onUserScroll, { passive: true });
    _container.addEventListener('touchmove', _onUserScroll, { passive: true });
  }

  // ==================== SCROLL DETECTION ====================

  function _isNearBottom() {
    if (!_container) return true;
    const { scrollTop, scrollHeight, clientHeight } = _container;
    return scrollHeight - scrollTop - clientHeight < NEAR_BOTTOM_THRESHOLD;
  }

  function _onScroll() {
    // If we're auto-scrolling, don't flag as user scroll
    if (_isAnimating) return;
  }

  function _onUserScroll() {
    // User manually scrolled — check if they scrolled up
    _isUserScrolled = !_isNearBottom();
  }

  // ==================== AUTO-SCROLL (DURING STREAMING) ====================

  /**
   * Called on each streaming chunk.
   * Only scrolls if user hasn't manually scrolled up.
   * Uses RAF to batch with rendering.
   */
  function scrollOnChunk() {
    if (!_container || _isUserScrolled) return;
    _scheduleScroll();
  }

  function _scheduleScroll() {
    if (_rafId) return; // already scheduled
    _rafId = requestAnimationFrame(() => {
      _rafId = null;
      if (!_container) return;
      _container.scrollTop = _container.scrollHeight;
    });
  }

  // ==================== FORCE SCROLL (ON FINALIZE) ====================

  /**
   * Force-scroll to bottom on message finalization.
   * Smooth animated scroll regardless of user position.
   */
  function forceScrollToBottom() {
    if (!_container) return;
    _isUserScrolled = false;

    _targetScrollTop = _container.scrollHeight;
    if (!_isAnimating) {
      _isAnimating = true;
      _animateScroll();
    }
  }

  function _animateScroll() {
    if (!_container) {
      _isAnimating = false;
      return;
    }

    const current = _container.scrollTop;
    const target = _container.scrollHeight - _container.clientHeight;
    const diff = target - current;

    if (Math.abs(diff) < 1) {
      _container.scrollTop = target;
      _isAnimating = false;
      return;
    }

    _container.scrollTop = current + diff * SCROLL_LERP;
    requestAnimationFrame(_animateScroll);
  }

  // ==================== INSTANT SCROLL ====================

  /**
   * Instant scroll to bottom (for adding user messages).
   */
  function scrollToBottom() {
    if (!_container) return;
    _isUserScrolled = false;
    _container.scrollTop = _container.scrollHeight;
  }

  // ==================== CLEANUP ====================

  function destroy() {
    if (_rafId) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
    if (_container) {
      _container.removeEventListener('scroll', _onScroll);
      _container.removeEventListener('wheel', _onUserScroll);
      _container.removeEventListener('touchmove', _onUserScroll);
    }
    _container = null;
    _isAnimating = false;
  }

  // ==================== PUBLIC API ====================

  return {
    init,
    scrollOnChunk,
    scrollToBottom,
    forceScrollToBottom,
    destroy
  };
})();
