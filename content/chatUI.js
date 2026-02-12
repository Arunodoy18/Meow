/**
 * Meow AI - Chat UI Module
 * Glassmorphism UI, typing indicator, message rendering,
 * disable menu on close button, and all chat styles
 */

const MeowChatUI = (() => {
  'use strict';

  let _panel = null;
  let _toggleButton = null;
  let _disableMenu = null;
  let _isPanelOpen = false;
  let _onSendCallback = null;
  let _onDisableCallback = null;
  let _debounceTimer = null;

  const DEBOUNCE_MS = 150;

  /** @type {Map<string, {element: HTMLElement, bubble: HTMLElement, textNode: Text}>} */
  const _streamingMessages = new Map();

  // ==================== STYLE INJECTION ====================

  function injectStyles() {
    const id = 'meow-ai-styles-v2';
    if (document.getElementById(id)) return;

    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      /* ==================== NEO DEV DARK VARIABLES ==================== */
      :root {
        --meow-primary: #22C55E;
        --meow-primary-light: #4ADE80;
        --meow-primary-dark: #16A34A;
        --meow-accent: #3B82F6;
        --meow-bg: #0B0F14;
        --meow-panel-bg: #111827;
        --meow-glass-bg: rgba(17, 24, 39, 0.95);
        --meow-glass-border: rgba(34, 197, 94, 0.15);
        --meow-glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
        --meow-blur: 18px;
        --meow-radius: 16px;
        --meow-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
        --meow-text-primary: #E5E7EB;
        --meow-text-secondary: #9CA3AF;
      }

      /* ==================== TOGGLE BUTTON ==================== */
      .meow-chat-toggle {
        all: initial;
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 58px;
        height: 58px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--meow-primary) 0%, #16A34A 100%);
        border: 2px solid rgba(34, 197, 94, 0.3);
        box-shadow: var(--meow-glass-shadow), 0 0 0 0 rgba(34, 197, 94, 0.4);
        cursor: pointer;
        z-index: 2147483646;
        font-size: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: box-shadow 0.3s ease, transform 0.2s ease;
        color: white;
        user-select: none;
        -webkit-user-select: none;
        animation: meowPulse 3s ease-in-out infinite;
      }

      .meow-chat-toggle:hover {
        box-shadow: var(--meow-glass-shadow), 0 0 0 6px rgba(34, 197, 94, 0.25);
        transform: translate(var(--tx, 0), var(--ty, 0)) scale(1.08);
      }

      .meow-dragging {
        animation: none !important;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5) !important;
        opacity: 0.9;
      }

      @keyframes meowPulse {
        0%, 100% { box-shadow: var(--meow-glass-shadow), 0 0 0 0 rgba(34, 197, 94, 0.3); }
        50% { box-shadow: var(--meow-glass-shadow), 0 0 0 8px rgba(34, 197, 94, 0); }
      }

      .meow-chat-toggle.panel-open {
        animation: none;
      }

      /* ==================== CHAT PANEL (NEO DEV DARK) ==================== */
      .meow-chat-panel {
        all: initial;
        position: fixed;
        top: 0;
        right: -420px;
        width: 400px;
        height: 100vh;
        height: 100dvh;
        background: var(--meow-panel-bg);
        backdrop-filter: blur(var(--meow-blur));
        -webkit-backdrop-filter: blur(var(--meow-blur));
        border-left: 1px solid var(--meow-glass-border);
        box-shadow: -8px 0 32px rgba(0, 0, 0, 0.4);
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        transition: right 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: var(--meow-font);
        color: var(--meow-text-primary);
      }

      .meow-chat-panel.open {
        right: 0;
      }

      /* ==================== HEADER ==================== */
      .meow-chat-header {
        background: var(--meow-bg);
        border-bottom: 1px solid rgba(34, 197, 94, 0.2);
        color: white;
        padding: 14px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        position: relative;
      }

      .meow-chat-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .meow-header-avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      }

      .meow-header-info {
        display: flex;
        flex-direction: column;
      }

      .meow-header-title {
        font-size: 16px;
        font-weight: 700;
        letter-spacing: -0.3px;
        color: var(--meow-primary);
      }

      .meow-header-mode {
        font-size: 11px;
        opacity: 0.85;
        font-weight: 400;
        color: var(--meow-text-secondary);
      }

      .meow-chat-close {
        all: initial;
        background: rgba(255, 255, 255, 0.15);
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: background 0.2s;
        position: relative;
        font-family: var(--meow-font);
      }

      .meow-chat-close:hover {
        background: rgba(255, 255, 255, 0.25);
      }

      /* ==================== DISABLE MENU (from close button) ==================== */
      .meow-disable-menu {
        position: absolute;
        top: 100%;
        right: 8px;
        margin-top: 6px;
        background: var(--meow-bg);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid var(--meow-glass-border);
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        min-width: 210px;
        padding: 6px 0;
        z-index: 2147483647;
        animation: meowMenuSlide 0.2s ease;
        font-family: var(--meow-font);
      }

      @keyframes meowMenuSlide {
        from { opacity: 0; transform: translateY(-6px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .meow-disable-item {
        all: initial;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        color: var(--meow-text-primary);
        transition: background 0.15s;
        width: 100%;
        font-family: var(--meow-font);
      }

      .meow-disable-item:hover {
        background: rgba(34, 197, 94, 0.1);
      }

      .meow-disable-divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.08);
        margin: 4px 0;
      }

      .meow-disable-item.danger {
        color: #dc2626;
      }

      /* ==================== MESSAGES ==================== */
      .meow-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: var(--meow-panel-bg);
      }

      .meow-message {
        display: flex;
        flex-direction: column;
        max-width: 85%;
        animation: meowMsgSlide 0.25s ease;
      }

      @keyframes meowMsgSlide {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .meow-message.user {
        align-self: flex-end;
      }

      .meow-message.ai {
        align-self: flex-start;
      }

      .meow-message-bubble {
        padding: 10px 14px;
        border-radius: 14px;
        font-size: 13.5px;
        line-height: 1.55;
        word-wrap: break-word;
        white-space: pre-wrap;
      }

      .meow-message.user .meow-message-bubble {
        background: linear-gradient(135deg, var(--meow-primary) 0%, #16A34A 100%);
        color: #0B0F14;
        font-weight: 500;
        border-bottom-right-radius: 4px;
      }

      .meow-message.ai .meow-message-bubble {
        background: rgba(17, 24, 39, 0.8);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        color: var(--meow-text-primary);
        border: 1px solid rgba(34, 197, 94, 0.12);
        border-bottom-left-radius: 4px;
      }

      .meow-message-time {
        font-size: 10px;
        color: var(--meow-text-secondary);
        margin-top: 3px;
        padding: 0 4px;
      }

      .meow-message.user .meow-message-time {
        text-align: right;
      }

      /* ==================== TYPING INDICATOR ==================== */
      .meow-typing {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 14px 16px;
        align-self: flex-start;
      }

      .meow-typing-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--meow-primary-light);
        animation: meowTyping 1.4s infinite ease-in-out both;
      }

      .meow-typing-dot:nth-child(1) { animation-delay: -0.32s; }
      .meow-typing-dot:nth-child(2) { animation-delay: -0.16s; }
      .meow-typing-dot:nth-child(3) { animation-delay: 0s; }

      @keyframes meowTyping {
        0%, 80%, 100% { transform: scale(0.4); opacity: 0.4; }
        40% { transform: scale(1); opacity: 1; }
      }

      /* ==================== WELCOME ==================== */
      .meow-welcome {
        text-align: center;
        padding: 32px 16px;
        color: var(--meow-text-secondary);
      }

      .meow-welcome-icon {
        font-size: 44px;
        margin-bottom: 10px;
      }

      .meow-welcome-title {
        font-size: 17px;
        font-weight: 700;
        color: var(--meow-primary);
        margin-bottom: 6px;
      }

      .meow-welcome-text {
        font-size: 12.5px;
        line-height: 1.6;
        color: var(--meow-text-secondary);
      }

      .meow-quick-actions {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 14px;
      }

      .meow-quick-btn {
        all: initial;
        padding: 9px 14px;
        background: rgba(11, 15, 20, 0.6);
        border: 1px solid rgba(34, 197, 94, 0.15);
        border-radius: 10px;
        cursor: pointer;
        font-size: 12.5px;
        font-weight: 500;
        color: var(--meow-text-primary);
        transition: all 0.2s;
        text-align: left;
        font-family: var(--meow-font);
      }

      .meow-quick-btn:hover {
        border-color: var(--meow-primary);
        background: rgba(34, 197, 94, 0.08);
        transform: translateX(4px);
      }

      /* ==================== INPUT AREA ==================== */
      .meow-chat-input {
        padding: 12px 16px;
        background: var(--meow-bg);
        border-top: 1px solid rgba(34, 197, 94, 0.15);
        flex-shrink: 0;
      }

      .meow-input-wrapper {
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }

      .meow-chat-textarea {
        all: initial;
        flex: 1;
        padding: 10px 14px;
        border: 1px solid rgba(34, 197, 94, 0.2);
        border-radius: 12px;
        font-size: 13.5px;
        font-family: var(--meow-font);
        resize: none;
        max-height: 120px;
        background: var(--meow-panel-bg);
        color: var(--meow-text-primary);
        transition: border-color 0.2s, box-shadow 0.2s;
        line-height: 1.4;
      }

      .meow-chat-textarea:focus {
        outline: none;
        border-color: var(--meow-primary);
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
      }

      .meow-chat-textarea::placeholder {
        color: var(--meow-text-secondary);
      }

      .meow-send-btn {
        all: initial;
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: var(--meow-primary);
        border: none;
        color: #0B0F14;
        font-size: 16px;
        cursor: pointer;
        flex-shrink: 0;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
      }

      .meow-send-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
        background: var(--meow-primary-light);
      }

      .meow-send-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
        transform: none;
      }

      /* ==================== KEYBOARD HINT ==================== */
      .meow-kb-hint {
        text-align: center;
        font-size: 10px;
        color: var(--meow-text-secondary);
        margin-top: 6px;
        font-family: var(--meow-font);
      }

      kbd {
        display: inline-block;
        padding: 1px 5px;
        font-size: 10px;
        font-family: var(--meow-font);
        color: var(--meow-text-secondary);
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }

      /* ==================== SCROLLBAR ==================== */
      .meow-chat-messages::-webkit-scrollbar {
        width: 5px;
      }

      .meow-chat-messages::-webkit-scrollbar-track {
        background: transparent;
      }

      .meow-chat-messages::-webkit-scrollbar-thumb {
        background: rgba(34, 197, 94, 0.2);
        border-radius: 4px;
      }

      .meow-chat-messages::-webkit-scrollbar-thumb:hover {
        background: rgba(34, 197, 94, 0.35);
      }

      /* ==================== OFFLINE BANNER ==================== */
      .meow-offline-banner {
        background: rgba(234, 179, 8, 0.15);
        color: #EAB308;
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 500;
        text-align: center;
        display: none;
        font-family: var(--meow-font);
        border-bottom: 1px solid rgba(234, 179, 8, 0.2);
      }

      .meow-offline-banner.visible {
        display: block;
      }

      /* ==================== STREAMING ==================== */
      .meow-streaming-cursor {
        display: inline-block;
        width: 2px;
        height: 1em;
        background: var(--meow-primary);
        margin-left: 2px;
        vertical-align: text-bottom;
        animation: meowBlink 0.8s step-end infinite;
      }

      @keyframes meowBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }

      .meow-message-bubble.streaming {
        min-height: 1.55em;
      }

      .meow-retry-btn {
        all: initial;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 12px;
        margin-top: 6px;
        font-size: 12px;
        font-weight: 500;
        color: var(--meow-primary);
        background: rgba(34, 197, 94, 0.08);
        border: 1px solid rgba(34, 197, 94, 0.2);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: var(--meow-font);
      }

      .meow-retry-btn:hover {
        background: rgba(34, 197, 94, 0.15);
        border-color: var(--meow-primary);
      }

      /* ==================== THINKING INDICATOR ==================== */
      .meow-thinking {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        align-self: flex-start;
        font-size: 12px;
        color: var(--meow-primary);
        font-family: var(--meow-font);
        animation: meowMsgSlide 0.25s ease;
      }

      .meow-thinking-text {
        opacity: 0.8;
        font-weight: 500;
      }

      .meow-thinking-pulse {
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--meow-primary);
        animation: meowThinkPulse 1.2s ease-in-out infinite;
      }

      @keyframes meowThinkPulse {
        0%, 100% { opacity: 0.3; transform: scale(0.8); }
        50% { opacity: 1; transform: scale(1.2); }
      }
    `;

    document.head.appendChild(style);
  }

  // ==================== CREATE UI ====================

  function createToggleButton() {
    _toggleButton = document.createElement('button');
    _toggleButton.className = 'meow-chat-toggle';
    _toggleButton.innerHTML = '🐱';
    _toggleButton.title = 'Meow AI (Alt+M)';
    _toggleButton.setAttribute('aria-label', 'Open Meow AI chat');
    return _toggleButton;
  }

  function createPanel() {
    let mode = 'General Analysis';
    try {
      mode = MeowPageExtractor.detectPageMode(window.location.href);
    } catch (e) {
      console.warn('🐱 Mode detection failed, using default:', e);
    }

    _panel = document.createElement('div');
    _panel.className = 'meow-chat-panel';
    _panel.setAttribute('role', 'complementary');
    _panel.setAttribute('aria-label', 'Meow AI Chat');

    _panel.innerHTML = `
      <div class="meow-chat-header">
        <div class="meow-chat-header-left">
          <div class="meow-header-avatar">🐱</div>
          <div class="meow-header-info">
            <div class="meow-header-title">Meow AI</div>
            <div class="meow-header-mode">${mode}</div>
          </div>
        </div>
        <button class="meow-chat-close" title="Close / Disable options" aria-label="Close or disable">✕</button>
      </div>

      <div class="meow-offline-banner">⚠ You're offline. Messages will fail until reconnected.</div>

      <div class="meow-chat-messages">
        <div class="meow-welcome">
          <div class="meow-welcome-icon">🐱</div>
          <div class="meow-welcome-title">Hey! I'm Meow AI</div>
          <div class="meow-welcome-text">
            Your elite developer copilot.<br>
            Mode: <strong>${mode}</strong>
          </div>
          <div class="meow-quick-actions">
            <button class="meow-quick-btn" data-action="explain">📄 Explain this page</button>
            <button class="meow-quick-btn" data-action="summarize">✨ Summarize key points</button>
            <button class="meow-quick-btn" data-action="help">💡 What can you do?</button>
          </div>
        </div>
      </div>

      <div class="meow-chat-input">
        <div class="meow-input-wrapper">
          <textarea
            class="meow-chat-textarea"
            placeholder="Ask anything…"
            rows="1"
            aria-label="Chat message"
          ></textarea>
          <button class="meow-send-btn" title="Send" aria-label="Send message">➤</button>
        </div>
        <div class="meow-kb-hint"><kbd>Alt</kbd>+<kbd>M</kbd> to toggle · <kbd>Enter</kbd> to send</div>
      </div>
    `;

    _createDisableMenu();
    _setupPanelEvents();

    return _panel;
  }

  // ==================== DISABLE MENU (on close button) ====================

  function _createDisableMenu() {
    _disableMenu = document.createElement('div');
    _disableMenu.className = 'meow-disable-menu';
    _disableMenu.style.display = 'none';

    _disableMenu.innerHTML = `
      <div class="meow-disable-item" data-action="close">
        ✕&nbsp; Just close panel
      </div>
      <div class="meow-disable-divider"></div>
      <div class="meow-disable-item" data-action="disable-24h">
        ⏰&nbsp; Disable for 24 hours
      </div>
      <div class="meow-disable-item danger" data-action="disable-site">
        🚫&nbsp; Disable on this site
      </div>
    `;

    // Append to header so it positions correctly
    const header = _panel.querySelector('.meow-chat-header');
    if (header) {
      header.style.position = 'relative';
      header.appendChild(_disableMenu);
    } else {
      console.warn('🐱 Chat header not found, appending disable menu to panel');
      _panel.appendChild(_disableMenu);
    }
  }

  function _showDisableMenu() {
    if (!_disableMenu) return;
    _disableMenu.style.display = 'block';

    const closeMenu = (e) => {
      if (!_disableMenu || !_disableMenu.contains(e.target)) {
        if (_disableMenu) _disableMenu.style.display = 'none';
        document.removeEventListener('click', closeMenu, true);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu, true), 10);
  }

  // ==================== PANEL EVENTS ====================

  function _setupPanelEvents() {
    // Close button → show disable menu
    const closeBtn = _panel.querySelector('.meow-chat-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        _showDisableMenu();
      });
    }

    // Disable menu items
    _disableMenu.querySelectorAll('.meow-disable-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        _disableMenu.style.display = 'none';

        if (action === 'close') {
          closePanel();
        } else if (_onDisableCallback) {
          _onDisableCallback(action);
        }
      });
    });

    // Send button
    const sendBtn = _panel.querySelector('.meow-send-btn');
    sendBtn.addEventListener('click', _handleSend);

    // Textarea events
    const textarea = _panel.querySelector('.meow-chat-textarea');

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        _handleSend();
      }
    });

    // Auto-resize with debounce
    textarea.addEventListener('input', () => {
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(() => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      }, DEBOUNCE_MS);
    });

    // Quick action buttons
    _panel.querySelectorAll('.meow-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const actions = {
          explain: 'Explain this page in detail',
          summarize: 'Give me the key insights from this page',
          help: 'What can you help me with?'
        };
        const msg = actions[btn.dataset.action];
        if (msg) {
          textarea.value = msg;
          _handleSend();
        }
      });
    });

    // Offline detection
    const banner = _panel.querySelector('.meow-offline-banner');
    window.addEventListener('offline', () => banner.classList.add('visible'));
    window.addEventListener('online', () => banner.classList.remove('visible'));
    if (!navigator.onLine) banner.classList.add('visible');
  }

  function _handleSend() {
    const textarea = _panel.querySelector('.meow-chat-textarea');
    const msg = textarea.value.trim();
    if (!msg || !_onSendCallback) return;

    textarea.value = '';
    textarea.style.height = 'auto';
    _onSendCallback(msg);
  }

  // ==================== MESSAGE RENDERING ====================

  function addMessage(type, content) {
    const container = _panel.querySelector('.meow-chat-messages');
    // Remove welcome on first message
    const welcome = container.querySelector('.meow-welcome');
    if (welcome) welcome.remove();

    const el = document.createElement('div');
    el.className = `meow-message ${type}`;

    const bubble = document.createElement('div');
    bubble.className = 'meow-message-bubble';
    bubble.textContent = content;

    const time = document.createElement('div');
    time.className = 'meow-message-time';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    el.appendChild(bubble);
    el.appendChild(time);
    container.appendChild(el);

    // Auto-scroll
    container.scrollTop = container.scrollHeight;
  }

  function showTyping() {
    const container = _panel.querySelector('.meow-chat-messages');

    const el = document.createElement('div');
    el.className = 'meow-message ai meow-typing-indicator';

    el.innerHTML = `
      <div class="meow-typing">
        <div class="meow-typing-dot"></div>
        <div class="meow-typing-dot"></div>
        <div class="meow-typing-dot"></div>
      </div>
    `;

    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }

  function hideTyping() {
    const el = _panel?.querySelector('.meow-typing-indicator');
    if (el) el.remove();
  }

  /**
   * Show a "thinking" indicator (more human than dots).
   */
  function showThinking() {
    hideThinking();
    const container = _panel?.querySelector('.meow-chat-messages');
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'meow-message ai meow-thinking-indicator';
    el.innerHTML = `
      <div class="meow-thinking">
        <span class="meow-thinking-pulse"></span>
        <span class="meow-thinking-text">Thinking...</span>
      </div>
    `;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }

  /**
   * Remove thinking indicator.
   */
  function hideThinking() {
    const el = _panel?.querySelector('.meow-thinking-indicator');
    if (el) el.remove();
  }

  // ==================== STREAMING MESSAGE METHODS ====================

  /**
   * Check if a streaming message exists.
   * @param {string} msgId
   * @returns {boolean}
   */
  function hasStreamingMessage(msgId) {
    return _streamingMessages.has(msgId);
  }

  /**
   * Create a streaming AI message with a blinking cursor.
   * @param {string} msgId - Unique message ID from stream manager
   * @returns {HTMLElement} The message element
   */
  function createStreamingMessage(msgId) {
    const container = _panel?.querySelector('.meow-chat-messages');
    if (!container) return null;

    // Remove welcome on first message
    const welcome = container.querySelector('.meow-welcome');
    if (welcome) welcome.remove();

    const el = document.createElement('div');
    el.className = 'meow-message ai';
    el.dataset.msgId = msgId;

    const bubble = document.createElement('div');
    bubble.className = 'meow-message-bubble streaming';

    const textNode = document.createTextNode('');
    bubble.appendChild(textNode);

    const cursor = document.createElement('span');
    cursor.className = 'meow-streaming-cursor';
    bubble.appendChild(cursor);

    el.appendChild(bubble);
    container.appendChild(el);

    _streamingMessages.set(msgId, { element: el, bubble, textNode });
    return el;
  }

  /**
   * Update streaming message content via RAF.
   * NEVER recreates DOM — only updates textContent.
   * @param {string} msgId
   * @param {string} fullContent - Complete accumulated content
   */
  function appendStreamChunk(msgId, fullContent) {
    const entry = _streamingMessages.get(msgId);
    if (!entry) return;

    requestAnimationFrame(() => {
      entry.textNode.textContent = fullContent;
    });
  }

  /**
   * Finalize a streaming message: remove cursor, add timestamp.
   * @param {string} msgId
   * @param {boolean} wasError
   */
  function finalizeStreamMessage(msgId, wasError) {
    const entry = _streamingMessages.get(msgId);
    if (!entry) return;

    const { bubble, element } = entry;

    // Remove cursor
    const cursor = bubble.querySelector('.meow-streaming-cursor');
    if (cursor) cursor.remove();
    bubble.classList.remove('streaming');

    if (wasError) {
      bubble.style.borderColor = 'rgba(220, 38, 38, 0.3)';
    }

    // Add timestamp
    const time = document.createElement('div');
    time.className = 'meow-message-time';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    element.appendChild(time);

    _streamingMessages.delete(msgId);
  }

  /**
   * Show a retry button below a failed message.
   * @param {string} msgId
   * @param {Function} callback
   */
  function showRetryButton(msgId, callback) {
    const el = _panel?.querySelector(`[data-msg-id="${msgId}"]`);
    if (!el) return;

    const btn = document.createElement('button');
    btn.className = 'meow-retry-btn';
    btn.innerHTML = '🔄 Retry';
    btn.addEventListener('click', () => {
      btn.remove();
      if (callback) callback();
    });

    el.appendChild(btn);
  }

  // ==================== PANEL CONTROL ====================

  function openPanel() {
    if (!_panel) return;
    _panel.classList.add('open');
    _toggleButton?.classList.add('panel-open');
    _isPanelOpen = true;

    const textarea = _panel.querySelector('.meow-chat-textarea');
    setTimeout(() => textarea?.focus(), 350);
  }

  function closePanel() {
    if (!_panel) return;
    _panel.classList.remove('open');
    _toggleButton?.classList.remove('panel-open');
    _isPanelOpen = false;
    _disableMenu.style.display = 'none';
  }

  function togglePanel() {
    _isPanelOpen ? closePanel() : openPanel();
  }

  function isPanelOpen() {
    return _isPanelOpen;
  }

  function setInputEnabled(enabled) {
    const textarea = _panel?.querySelector('.meow-chat-textarea');
    const sendBtn = _panel?.querySelector('.meow-send-btn');
    if (textarea) textarea.disabled = !enabled;
    if (sendBtn) sendBtn.disabled = !enabled;
  }

  function updateMode(mode) {
    const modeEl = _panel?.querySelector('.meow-header-mode');
    if (modeEl) modeEl.textContent = mode;
  }

  // ==================== CALLBACKS ====================

  function onSend(callback) {
    _onSendCallback = callback;
  }

  function onDisable(callback) {
    _onDisableCallback = callback;
  }

  // ==================== CLEANUP ====================

  function destroy() {
    _toggleButton?.remove();
    _panel?.remove();
    _toggleButton = null;
    _panel = null;
    _disableMenu = null;
  }

  // ==================== PUBLIC API ====================

  return {
    injectStyles,
    createToggleButton,
    createPanel,
    addMessage,
    showTyping,
    hideTyping,
    hasStreamingMessage,
    createStreamingMessage,
    appendStreamChunk,
    finalizeStreamMessage,
    showRetryButton,
    showThinking,
    hideThinking,
    openPanel,
    closePanel,
    togglePanel,
    isPanelOpen,
    setInputEnabled,
    updateMode,
    onSend,
    onDisable,
    destroy
  };
})();
