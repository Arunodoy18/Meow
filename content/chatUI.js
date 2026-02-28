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

      /* ==================== RESIZE HANDLE ==================== */
      .meow-resize-handle {
        position: absolute;
        left: 0;
        top: 0;
        width: 6px;
        height: 100%;
        cursor: col-resize;
        background: transparent;
        z-index: 10;
        transition: background 0.2s;
      }
      .meow-resize-handle:hover,
      .meow-resize-handle.active {
        background: var(--meow-primary);
      }

      /* ==================== HEADER ACTIONS ==================== */
      .meow-header-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .meow-header-action-btn {
        all: initial;
        background: rgba(255,255,255,0.1);
        border: none;
        color: var(--meow-text-secondary);
        font-size: 15px;
        cursor: pointer;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.2s;
        font-family: var(--meow-font);
      }
      .meow-header-action-btn:hover {
        background: rgba(255,255,255,0.2);
        color: var(--meow-primary);
      }

      /* ==================== EXPORT DROPDOWN ==================== */
      .meow-export-menu {
        position: absolute;
        top: 100%;
        right: 40px;
        margin-top: 6px;
        background: var(--meow-bg);
        border: 1px solid var(--meow-glass-border);
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        min-width: 180px;
        padding: 6px 0;
        z-index: 2147483647;
        animation: meowMenuSlide 0.2s ease;
        font-family: var(--meow-font);
      }
      .meow-export-item {
        all: initial;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 14px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        color: var(--meow-text-primary);
        transition: background 0.15s;
        width: 100%;
        font-family: var(--meow-font);
      }
      .meow-export-item:hover {
        background: rgba(34,197,94,0.1);
      }

      /* ==================== FOLLOW-UP SUGGESTIONS ==================== */
      .meow-follow-ups {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 4px 0 8px;
        animation: meowMsgSlide 0.3s ease;
      }
      .meow-follow-up-btn {
        all: initial;
        padding: 6px 12px;
        background: rgba(34,197,94,0.08);
        border: 1px solid rgba(34,197,94,0.2);
        border-radius: 16px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        color: var(--meow-primary-light);
        transition: all 0.2s;
        font-family: var(--meow-font);
      }
      .meow-follow-up-btn:hover {
        background: rgba(34,197,94,0.18);
        border-color: var(--meow-primary);
        transform: translateY(-1px);
      }

      /* ==================== SLASH COMMAND AUTOCOMPLETE ==================== */
      .meow-autocomplete {
        position: absolute;
        bottom: 100%;
        left: 0;
        right: 0;
        max-height: 200px;
        overflow-y: auto;
        background: var(--meow-bg);
        border: 1px solid var(--meow-glass-border);
        border-radius: 10px 10px 0 0;
        box-shadow: 0 -4px 16px rgba(0,0,0,0.3);
        z-index: 10;
        display: none;
        font-family: var(--meow-font);
      }
      .meow-autocomplete.visible { display: block; }
      .meow-autocomplete-item {
        display: flex;
        flex-direction: column;
        padding: 8px 14px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .meow-autocomplete-item:hover,
      .meow-autocomplete-item.selected {
        background: rgba(34,197,94,0.1);
      }
      .meow-autocomplete-cmd {
        font-size: 13px;
        font-weight: 600;
        color: var(--meow-primary);
      }
      .meow-autocomplete-desc {
        font-size: 11px;
        color: var(--meow-text-secondary);
      }

      /* ==================== SETTINGS PANEL ==================== */
      .meow-settings-overlay {
        position: absolute;
        inset: 0;
        background: var(--meow-panel-bg);
        z-index: 20;
        display: flex;
        flex-direction: column;
        animation: meowMenuSlide 0.2s ease;
      }
      .meow-settings-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid rgba(34,197,94,0.15);
        background: var(--meow-bg);
      }
      .meow-settings-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--meow-primary);
      }
      .meow-settings-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }
      .meow-setting-group {
        margin-bottom: 18px;
      }
      .meow-setting-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
        color: var(--meow-text-primary);
        margin-bottom: 6px;
        font-family: var(--meow-font);
      }
      .meow-setting-select {
        all: initial;
        width: 100%;
        padding: 8px 10px;
        background: var(--meow-bg);
        border: 1px solid rgba(34,197,94,0.2);
        border-radius: 8px;
        color: var(--meow-text-primary);
        font-size: 13px;
        font-family: var(--meow-font);
        cursor: pointer;
      }
      .meow-setting-toggle {
        position: relative;
        width: 36px;
        height: 20px;
        background: rgba(255,255,255,0.1);
        border-radius: 10px;
        cursor: pointer;
        transition: background 0.2s;
        flex-shrink: 0;
      }
      .meow-setting-toggle.on { background: var(--meow-primary); }
      .meow-setting-toggle::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: white;
        transition: transform 0.2s;
      }
      .meow-setting-toggle.on::after { transform: translateX(16px); }

      /* ==================== MARKDOWN RENDERING IN AI BUBBLES ==================== */
      .meow-message.ai .meow-message-bubble {
        white-space: normal;
      }
      .meow-message.ai .meow-message-bubble p {
        margin: 0 0 8px;
      }
      .meow-message.ai .meow-message-bubble p:last-child {
        margin-bottom: 0;
      }
      .meow-message.ai .meow-message-bubble h1,
      .meow-message.ai .meow-message-bubble h2,
      .meow-message.ai .meow-message-bubble h3 {
        color: var(--meow-primary);
        margin: 12px 0 6px;
        line-height: 1.3;
      }
      .meow-message.ai .meow-message-bubble h1 { font-size: 16px; }
      .meow-message.ai .meow-message-bubble h2 { font-size: 14.5px; }
      .meow-message.ai .meow-message-bubble h3 { font-size: 13.5px; }
      .meow-message.ai .meow-message-bubble ul,
      .meow-message.ai .meow-message-bubble ol {
        margin: 6px 0;
        padding-left: 20px;
      }
      .meow-message.ai .meow-message-bubble li {
        margin-bottom: 3px;
      }
      .meow-message.ai .meow-message-bubble blockquote {
        border-left: 3px solid var(--meow-primary);
        padding: 4px 10px;
        margin: 8px 0;
        background: rgba(34,197,94,0.05);
        border-radius: 0 6px 6px 0;
        color: var(--meow-text-secondary);
      }
      .meow-message.ai .meow-message-bubble code {
        background: rgba(0,0,0,0.3);
        padding: 2px 5px;
        border-radius: 4px;
        font-size: 12px;
        font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
        color: var(--meow-primary-light);
      }
      .meow-message.ai .meow-message-bubble pre {
        background: #0D1117;
        border: 1px solid rgba(34,197,94,0.15);
        border-radius: 8px;
        padding: 12px;
        overflow-x: auto;
        margin: 8px 0;
        position: relative;
      }
      .meow-message.ai .meow-message-bubble pre code {
        background: transparent;
        padding: 0;
        font-size: 12.5px;
        color: var(--meow-text-primary);
      }
      .meow-copy-code-btn {
        all: initial;
        position: absolute;
        top: 6px;
        right: 6px;
        padding: 3px 8px;
        font-size: 11px;
        font-family: var(--meow-font);
        color: var(--meow-text-secondary);
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .meow-copy-code-btn:hover {
        background: rgba(34,197,94,0.15);
        color: var(--meow-primary);
      }
      .meow-message.ai .meow-message-bubble strong {
        color: var(--meow-primary-light);
        font-weight: 600;
      }
      .meow-message.ai .meow-message-bubble em {
        color: var(--meow-text-secondary);
        font-style: italic;
      }
      .meow-message.ai .meow-message-bubble a {
        color: var(--meow-accent);
        text-decoration: none;
      }
      .meow-message.ai .meow-message-bubble a:hover {
        text-decoration: underline;
      }
      .meow-message.ai .meow-message-bubble hr {
        border: none;
        border-top: 1px solid rgba(255,255,255,0.08);
        margin: 10px 0;
      }
      .meow-message.ai .meow-message-bubble table {
        border-collapse: collapse;
        width: 100%;
        margin: 8px 0;
        font-size: 12.5px;
      }
      .meow-message.ai .meow-message-bubble th,
      .meow-message.ai .meow-message-bubble td {
        border: 1px solid rgba(255,255,255,0.1);
        padding: 6px 10px;
        text-align: left;
      }
      .meow-message.ai .meow-message-bubble th {
        background: rgba(34,197,94,0.1);
        color: var(--meow-primary-light);
        font-weight: 600;
      }
    `;

    document.head.appendChild(style);

    // Inject markdown renderer styles if available
    if (typeof MeowMarkdown !== 'undefined' && MeowMarkdown.getStyles) {
      const mdStyle = document.createElement('style');
      mdStyle.id = 'meow-markdown-styles';
      mdStyle.textContent = MeowMarkdown.getStyles();
      document.head.appendChild(mdStyle);
    }
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
      <div class="meow-resize-handle"></div>
      <div class="meow-chat-header">
        <div class="meow-chat-header-left">
          <div class="meow-header-avatar">🐱</div>
          <div class="meow-header-info">
            <div class="meow-header-title">Meow AI</div>
            <div class="meow-header-mode">${mode}</div>
          </div>
        </div>
        <div class="meow-header-actions">
          <button class="meow-header-action-btn meow-btn-export" title="Export conversation">📥</button>
          <button class="meow-header-action-btn meow-btn-settings" title="Settings">⚙</button>
          <button class="meow-chat-close" title="Close / Disable options" aria-label="Close or disable">✕</button>
        </div>
      </div>

      <div class="meow-offline-banner">⚠ You're offline. Messages will fail until reconnected.</div>

      <div class="meow-chat-messages">
        <div class="meow-welcome">
          <div class="meow-welcome-icon">🐱</div>
          <div class="meow-welcome-title">Hey! I'm Meow AI</div>
          <div class="meow-welcome-text">
            ${_getWelcomeTextForMode(mode)}
          </div>
          <div class="meow-quick-actions">
            ${_getQuickActionsForMode(mode).map(a =>
              `<button class="meow-quick-btn" data-action="custom" data-message="${_escAttr(a.message)}">${a.icon} ${a.label}</button>`
            ).join('\n            ')}
          </div>
        </div>
      </div>

      <div class="meow-chat-input" style="position:relative;">
        <div class="meow-autocomplete"></div>
        <div class="meow-input-wrapper">
          <textarea
            class="meow-chat-textarea"
            placeholder="Ask anything… (type / for commands)"
            rows="1"
            aria-label="Chat message"
          ></textarea>
          <button class="meow-send-btn" title="Send" aria-label="Send message">➤</button>
        </div>
        <div class="meow-kb-hint"><kbd>Alt</kbd>+<kbd>M</kbd> toggle · <kbd>Enter</kbd> send · <kbd>/</kbd> commands</div>
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

    // Export button
    const exportBtn = _panel.querySelector('.meow-btn-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        _toggleExportMenu();
      });
    }

    // Settings button
    const settingsBtn = _panel.querySelector('.meow-btn-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        _showSettingsPanel();
      });
    }

    // Resize handle
    _setupResizeHandle();

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
      // Handle autocomplete navigation
      if (e.key === 'Tab' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const ac = _panel.querySelector('.meow-autocomplete');
        if (ac && ac.classList.contains('visible')) {
          e.preventDefault();
          _navigateAutocomplete(e.key === 'ArrowUp' ? -1 : 1);
        }
      }
      if (e.key === 'Escape') {
        _hideAutocomplete();
      }
    });

    // Auto-resize + slash command autocomplete
    textarea.addEventListener('input', () => {
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(() => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        // Check for slash commands
        _updateAutocomplete(textarea.value);
      }, DEBOUNCE_MS);
    });

    // Quick action buttons (mode-aware)
    _wireQuickActionButtons();

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

    // Remove any existing follow-ups
    const oldFollowUps = container.querySelector('.meow-follow-ups');
    if (oldFollowUps) oldFollowUps.remove();

    const el = document.createElement('div');
    el.className = `meow-message ${type}`;

    const bubble = document.createElement('div');
    bubble.className = 'meow-message-bubble';

    // AI messages get markdown rendering
    if (type === 'ai' && typeof MeowMarkdown !== 'undefined') {
      bubble.innerHTML = MeowMarkdown.render(content);
      _attachCopyButtons(bubble);
    } else {
      bubble.textContent = content;
    }

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

    const { bubble, element, textNode } = entry;

    // Remove cursor
    const cursor = bubble.querySelector('.meow-streaming-cursor');
    if (cursor) cursor.remove();
    bubble.classList.remove('streaming');

    // Render markdown for the final content
    const rawContent = textNode.textContent || '';
    if (!wasError && typeof MeowMarkdown !== 'undefined' && rawContent) {
      // Replace the textNode with rendered HTML
      bubble.innerHTML = MeowMarkdown.render(rawContent);
      _attachCopyButtons(bubble);
    }

    if (wasError) {
      bubble.style.borderColor = 'rgba(220, 38, 38, 0.3)';
    }

    // Add timestamp
    const time = document.createElement('div');
    time.className = 'meow-message-time';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    element.appendChild(time);

    _streamingMessages.delete(msgId);

    // Show follow-up suggestions for successful AI responses
    if (!wasError && rawContent.length > 50) {
      _showFollowUpSuggestions(rawContent);
    }
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

  // ==================== MODE-AWARE QUICK ACTIONS ====================

  function _escAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
  }

  function _getWelcomeTextForMode(mode) {
    const welcomes = {
      'YouTube': 'I can see what video you\'re watching.<br>Ask me to <strong>summarize</strong>, explain <strong>key takeaways</strong>, or anything about it!',
      'GitHub Issue': 'I see this issue. Ask me to <strong>explain it</strong>,<br>suggest <strong>how to fix it</strong>, or do a <strong>root cause analysis</strong>.',
      'PR Review': 'Ready to review this PR.<br>I\'ll check for bugs, suggest improvements, and give you my <strong>honest take</strong>.',
      'GitHub Analysis': 'I can see this repo.<br>Ask about <strong>architecture</strong>, how to <strong>contribute</strong>, or anything you need.',
      'Article': 'I\'ve read this article with you.<br>Want a <strong>summary</strong>, <strong>critical analysis</strong>, or <strong>actionable takeaways</strong>?',
      'Stack Overflow': 'Let me cut through the noise.<br>I\'ll find the <strong>real answer</strong> and flag any <strong>gotchas</strong>.',
      'DSA Problem': 'I see this problem. Want <strong>hints</strong> first,<br>or should I help you <strong>identify the pattern</strong>?',
      'Learning Mode': 'Your learning copilot is here.<br>I\'ll help you <strong>understand concepts</strong> and <strong>apply them</strong>.',
      'Documentation': 'I\'ll translate these docs for you.<br><strong>Quick start</strong>, <strong>gotchas</strong>, and <strong>examples</strong> — just ask.',
      'Research Paper': 'I\'ll break down this paper for you.<br><strong>Plain English summary</strong> and <strong>practical implications</strong>.',
      'Job Analysis': 'Let me analyze this job posting.<br><strong>Red flags</strong>, <strong>skill gaps</strong>, and <strong>interview prep</strong> ready.',
      'General Analysis': 'Your sharp developer copilot.<br>Mode: <strong>' + 'General Analysis' + '</strong>'
    };
    return welcomes[mode] || `Your sharp developer copilot.<br>Mode: <strong>${mode}</strong>`;
  }

  function _getQuickActionsForMode(mode) {
    const modeActions = {
      'YouTube': [
        { icon: '📺', label: 'Summarize this video', message: 'Give me a quick summary of this video — what\'s it about, key takeaways, and is it worth watching?' },
        { icon: '🎯', label: 'Key takeaways', message: 'What are the most important things I should remember from this video?' },
        { icon: '💡', label: 'What can I learn?', message: 'What skills or knowledge can I gain from this video? What should I learn next?' },
        { icon: '📝', label: 'Explain like a friend', message: 'Explain what this video covers like you\'re telling a friend about it' }
      ],
      'GitHub Issue': [
        { icon: '🐛', label: 'Explain this issue', message: 'Explain this issue in simple terms — what\'s going wrong and why?' },
        { icon: '🔧', label: 'How to solve this', message: 'How would you approach fixing this issue? Give me a step-by-step solution path.' },
        { icon: '⚡', label: 'Quick workaround', message: 'Is there a quick workaround for this issue while a proper fix is built?' },
        { icon: '🔍', label: 'Root cause analysis', message: 'What\'s the root cause of this issue? Break down the stack trace or error if available.' }
      ],
      'PR Review': [
        { icon: '🔍', label: 'Review this PR', message: 'Review this pull request — what looks good, what concerns you, and should it be merged?' },
        { icon: '🐛', label: 'Find bugs', message: 'Look for potential bugs, edge cases, or issues in this PR\'s code changes.' },
        { icon: '✨', label: 'Suggest improvements', message: 'What improvements would you suggest for this PR?' },
        { icon: '📋', label: 'Summarize changes', message: 'Give me a quick summary of what this PR actually changes and why.' }
      ],
      'GitHub Analysis': [
        { icon: '🏗️', label: 'Explain architecture', message: 'Explain this repository\'s architecture and how it\'s structured.' },
        { icon: '📄', label: 'Summarize this repo', message: 'What does this project do? Give me the quick rundown.' },
        { icon: '🚀', label: 'How to contribute', message: 'How would I get started contributing to this project?' },
        { icon: '💡', label: 'What can you do?', message: 'What can you help me with on this page?' }
      ],
      'Article': [
        { icon: '📝', label: 'Summarize article', message: 'Summarize this article — what\'s the core idea and what should I take away from it?' },
        { icon: '🔍', label: 'Critical analysis', message: 'Give me a critical analysis — what\'s good, what\'s missing, and do you agree with the author?' },
        { icon: '🎯', label: 'Actionable takeaways', message: 'What are the practical, actionable things I can do based on this article?' },
        { icon: '💡', label: 'ELI5 version', message: 'Explain this article\'s main points like I\'m five — simple and clear.' }
      ],
      'Stack Overflow': [
        { icon: '✅', label: 'What\'s the answer?', message: 'Cut through the noise — what actually solves this problem?' },
        { icon: '🔧', label: 'How to fix this', message: 'How do I fix this issue? Give me the solution with context.' },
        { icon: '⚠️', label: 'Check for gotchas', message: 'Are there any gotchas, outdated answers, or edge cases the top answers miss?' },
        { icon: '🔍', label: 'Explain the problem', message: 'Explain what\'s actually going wrong here and why it happens.' }
      ],
      'DSA Problem': [
        { icon: '💭', label: 'Give me a hint', message: 'Give me a hint to solve this problem — don\'t spoil the solution!' },
        { icon: '🧠', label: 'What pattern is this?', message: 'What algorithm pattern does this problem use? Help me recognize it.' },
        { icon: '📊', label: 'Explain approach', message: 'Walk me through the approach step by step — help me understand the thinking.' },
        { icon: '⚡', label: 'Optimize my solution', message: 'How can I optimize the solution for better time/space complexity?' }
      ],
      'Learning Mode': [
        { icon: '📚', label: 'Explain this', message: 'Explain the content on this page — what should I learn from it?' },
        { icon: '🎯', label: 'Key concepts', message: 'What are the key concepts I need to understand here?' },
        { icon: '🛠️', label: 'Practical application', message: 'How can I apply what I\'m learning here in a real project?' },
        { icon: '📍', label: 'What to learn next', message: 'Based on this content, what should I learn next to grow my skills?' }
      ],
      'Documentation': [
        { icon: '🚀', label: 'Quick start guide', message: 'Give me a quick-start guide based on this documentation.' },
        { icon: '⚠️', label: 'Gotchas & tips', message: 'What are the gotchas and practical tips from this documentation?' },
        { icon: '💻', label: 'Show me examples', message: 'Give me practical code examples based on this documentation.' },
        { icon: '📄', label: 'Summarize the API', message: 'Summarize this API/feature — what it does and when to use it.' }
      ],
      'Research Paper': [
        { icon: '📄', label: 'Summarize paper', message: 'Summarize this research paper in plain English — what did they find and why does it matter?' },
        { icon: '🔬', label: 'Explain methodology', message: 'Break down the methodology — how did they arrive at their conclusions?' },
        { icon: '💡', label: 'Practical implications', message: 'What are the practical implications of this research? How could it be applied?' },
        { icon: '🤔', label: 'Limitations & critique', message: 'What are the limitations of this paper? What should I be skeptical about?' }
      ],
      'Job Analysis': [
        { icon: '📋', label: 'Analyze this job', message: 'Break down this job listing — what do they actually want and is it worth applying?' },
        { icon: '🎯', label: 'Skills to highlight', message: 'What skills should I highlight from my experience for this role?' },
        { icon: '🚩', label: 'Red/green flags', message: 'What are the red flags and green flags in this job listing?' },
        { icon: '📝', label: 'Interview prep', message: 'How should I prepare for an interview for this role?' }
      ]
    };

    return modeActions[mode] || [
      { icon: '📄', label: 'Explain this page', message: 'Explain this page in detail — what\'s it about and what should I know?' },
      { icon: '✨', label: 'Summarize key points', message: 'Give me the key insights from this page in a quick, digestible summary.' },
      { icon: '🔍', label: 'Deep analysis', message: 'Do a deep analysis of this page — key tech insights, what matters, and what to watch out for.' },
      { icon: '💡', label: 'What can you do?', message: 'What can you help me with?' }
    ];
  }

  function _wireQuickActionButtons() {
    if (!_panel) return;
    _panel.querySelectorAll('.meow-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const msg = btn.dataset.message || btn.dataset.action;
        if (msg && _onSendCallback) {
          const textarea = _panel.querySelector('.meow-chat-textarea');
          if (textarea) {
            textarea.value = msg;
          }
          _handleSend();
        }
      });
    });
  }

  function updateMode(mode) {
    const modeEl = _panel?.querySelector('.meow-header-mode');
    if (modeEl) modeEl.textContent = mode;

    // Update quick actions if welcome screen is still showing
    const quickActionsEl = _panel?.querySelector('.meow-quick-actions');
    if (quickActionsEl) {
      const actions = _getQuickActionsForMode(mode);
      quickActionsEl.innerHTML = actions.map(a =>
        `<button class="meow-quick-btn" data-action="custom" data-message="${_escAttr(a.message)}">${a.icon} ${a.label}</button>`
      ).join('');
      _wireQuickActionButtons();
    }
  }

  // ==================== CALLBACKS ====================

  function onSend(callback) {
    _onSendCallback = callback;
  }

  function onDisable(callback) {
    _onDisableCallback = callback;
  }

  // ==================== RESIZE HANDLE ====================

  function _setupResizeHandle() {
    const handle = _panel.querySelector('.meow-resize-handle');
    if (!handle) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 400;

    handle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = _panel.offsetWidth;
      handle.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const diff = startX - e.clientX;
      const newWidth = Math.max(320, Math.min(800, startWidth + diff));
      _panel.style.width = newWidth + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!isResizing) return;
      isResizing = false;
      handle.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Save width preference
      if (typeof MeowStorage !== 'undefined') {
        MeowStorage.setPreference('panelWidth', _panel.offsetWidth).catch(() => {});
      }
    });

    // Restore saved width
    if (typeof MeowStorage !== 'undefined') {
      MeowStorage.getPreferences().then(prefs => {
        if (prefs.panelWidth && prefs.panelWidth !== 400) {
          _panel.style.width = prefs.panelWidth + 'px';
        }
      }).catch(() => {});
    }
  }

  // ==================== EXPORT MENU ====================

  function _toggleExportMenu() {
    const existing = _panel.querySelector('.meow-export-menu');
    if (existing) { existing.remove(); return; }

    const header = _panel.querySelector('.meow-chat-header');
    const menu = document.createElement('div');
    menu.className = 'meow-export-menu';
    menu.innerHTML = `
      <div class="meow-export-item" data-format="markdown">📝 Export as Markdown</div>
      <div class="meow-export-item" data-format="json">📋 Export as JSON</div>
      <div class="meow-export-item" data-format="clipboard">📎 Copy to Clipboard</div>
    `;

    menu.querySelectorAll('.meow-export-item').forEach(item => {
      item.addEventListener('click', () => {
        menu.remove();
        _doExport(item.dataset.format);
      });
    });

    header.appendChild(menu);

    // Auto-close on click outside
    setTimeout(() => {
      const close = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', close, true);
        }
      };
      document.addEventListener('click', close, true);
    }, 10);
  }

  function _doExport(format) {
    if (typeof MeowExport === 'undefined' || typeof MeowConversationMemory === 'undefined') return;
    const history = MeowConversationMemory.getFullHistory();
    const pageTitle = document.title || 'Meow AI Chat';
    const mode = _panel.querySelector('.meow-header-mode')?.textContent || 'General';

    if (format === 'markdown') {
      MeowExport.downloadMarkdown(history, pageTitle, mode);
    } else if (format === 'json') {
      MeowExport.downloadJSON(history, pageTitle, mode);
    } else if (format === 'clipboard') {
      MeowExport.copyToClipboard(history, pageTitle, mode).then(ok => {
        if (ok) _showToast('Copied to clipboard!');
        else _showToast('Failed to copy');
      });
    }
  }

  // ==================== SETTINGS PANEL ====================

  async function _showSettingsPanel() {
    // Remove existing
    const existing = _panel.querySelector('.meow-settings-overlay');
    if (existing) { existing.remove(); return; }

    let prefs = {};
    if (typeof MeowStorage !== 'undefined') {
      prefs = await MeowStorage.getPreferences();
    }

    const overlay = document.createElement('div');
    overlay.className = 'meow-settings-overlay';
    overlay.innerHTML = `
      <div class="meow-settings-header">
        <span class="meow-settings-title">⚙ Settings</span>
        <button class="meow-header-action-btn meow-settings-close-btn">✕</button>
      </div>
      <div class="meow-settings-body">
        <div class="meow-setting-group">
          <div class="meow-setting-label">
            Verbosity
            <select class="meow-setting-select" data-pref="verbosity">
              <option value="concise" ${prefs.verbosity === 'concise' ? 'selected' : ''}>Concise</option>
              <option value="balanced" ${prefs.verbosity === 'balanced' ? 'selected' : ''}>Balanced</option>
              <option value="detailed" ${prefs.verbosity === 'detailed' ? 'selected' : ''}>Detailed</option>
            </select>
          </div>
        </div>
        <div class="meow-setting-group">
          <div class="meow-setting-label">
            Skill Level
            <select class="meow-setting-select" data-pref="skillLevel">
              <option value="beginner" ${prefs.skillLevel === 'beginner' ? 'selected' : ''}>Beginner</option>
              <option value="intermediate" ${prefs.skillLevel === 'intermediate' ? 'selected' : ''}>Intermediate</option>
              <option value="advanced" ${prefs.skillLevel === 'advanced' ? 'selected' : ''}>Advanced</option>
            </select>
          </div>
        </div>
        <div class="meow-setting-group">
          <div class="meow-setting-label">
            Font Size
            <select class="meow-setting-select" data-pref="fontSize">
              <option value="small" ${prefs.fontSize === 'small' ? 'selected' : ''}>Small</option>
              <option value="medium" ${prefs.fontSize === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="large" ${prefs.fontSize === 'large' ? 'selected' : ''}>Large</option>
            </select>
          </div>
        </div>
        <div class="meow-setting-group">
          <div class="meow-setting-label">
            Code Theme
            <select class="meow-setting-select" data-pref="codeTheme">
              <option value="dark" ${prefs.codeTheme === 'dark' ? 'selected' : ''}>Dark</option>
              <option value="monokai" ${prefs.codeTheme === 'monokai' ? 'selected' : ''}>Monokai</option>
              <option value="github" ${prefs.codeTheme === 'github' ? 'selected' : ''}>GitHub</option>
            </select>
          </div>
        </div>
        <div class="meow-setting-group">
          <div class="meow-setting-label">
            Markdown Rendering
            <div class="meow-setting-toggle ${prefs.markdownRendering !== false ? 'on' : ''}" data-pref="markdownRendering"></div>
          </div>
        </div>
        <div class="meow-setting-group">
          <div class="meow-setting-label">
            Show Follow-ups
            <div class="meow-setting-toggle ${prefs.showFollowUps !== false ? 'on' : ''}" data-pref="showFollowUps"></div>
          </div>
        </div>
        <div class="meow-setting-group">
          <div class="meow-setting-label">
            Panel Side
            <select class="meow-setting-select" data-pref="panelSide">
              <option value="right" ${prefs.panelSide === 'right' ? 'selected' : ''}>Right</option>
              <option value="left" ${prefs.panelSide === 'left' ? 'selected' : ''}>Left</option>
            </select>
          </div>
        </div>
      </div>
    `;

    // Close button
    overlay.querySelector('.meow-settings-close-btn').addEventListener('click', () => overlay.remove());

    // Handle select changes
    overlay.querySelectorAll('.meow-setting-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const key = sel.dataset.pref;
        if (typeof MeowStorage !== 'undefined') {
          MeowStorage.setPreference(key, sel.value).catch(() => {});
        }
        _applyPreference(key, sel.value);
      });
    });

    // Handle toggle changes
    overlay.querySelectorAll('.meow-setting-toggle').forEach(tog => {
      tog.addEventListener('click', () => {
        const isOn = tog.classList.toggle('on');
        const key = tog.dataset.pref;
        if (typeof MeowStorage !== 'undefined') {
          MeowStorage.setPreference(key, isOn).catch(() => {});
        }
      });
    });

    _panel.appendChild(overlay);
  }

  function _applyPreference(key, value) {
    if (key === 'fontSize') {
      const sizes = { small: '12.5px', medium: '13.5px', large: '15px' };
      const msgs = _panel.querySelector('.meow-chat-messages');
      if (msgs) msgs.style.fontSize = sizes[value] || '13.5px';
    }
    if (key === 'panelSide') {
      if (value === 'left') {
        _panel.style.right = 'auto';
        _panel.style.left = '0';
        _panel.style.borderLeft = 'none';
        _panel.style.borderRight = '1px solid var(--meow-glass-border)';
      } else {
        _panel.style.left = 'auto';
        _panel.style.borderRight = 'none';
        _panel.style.borderLeft = '1px solid var(--meow-glass-border)';
      }
    }
  }

  // ==================== FOLLOW-UP SUGGESTIONS ====================

  function _showFollowUpSuggestions(aiResponse) {
    const container = _panel?.querySelector('.meow-chat-messages');
    if (!container) return;

    // Remove existing follow-ups
    const old = container.querySelector('.meow-follow-ups');
    if (old) old.remove();

    const suggestions = _generateFollowUps(aiResponse);
    if (!suggestions.length) return;

    const div = document.createElement('div');
    div.className = 'meow-follow-ups';

    suggestions.forEach(text => {
      const btn = document.createElement('button');
      btn.className = 'meow-follow-up-btn';
      btn.textContent = text;
      btn.addEventListener('click', () => {
        div.remove();
        const textarea = _panel.querySelector('.meow-chat-textarea');
        if (textarea) {
          textarea.value = text;
          _handleSend();
        }
      });
      div.appendChild(btn);
    });

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function _generateFollowUps(response) {
    const lower = response.toLowerCase();
    const followUps = [];

    if (lower.includes('function') || lower.includes('class') || lower.includes('code')) {
      followUps.push('Show me an example');
    }
    if (lower.includes('error') || lower.includes('bug') || lower.includes('issue')) {
      followUps.push('How do I fix this?');
    }
    if (lower.includes('performance') || lower.includes('optimize')) {
      followUps.push('What are the benchmarks?');
    }
    if (lower.includes('security') || lower.includes('vulnerability')) {
      followUps.push('Show me the secure version');
    }
    if (lower.length > 500) {
      followUps.push('Summarize in 3 bullets');
    }

    // Always offer these
    followUps.push('Go deeper');
    followUps.push('Explain like I\'m 5');

    return followUps.slice(0, 4);
  }

  // ==================== SLASH COMMAND AUTOCOMPLETE ====================

  function _updateAutocomplete(value) {
    const ac = _panel?.querySelector('.meow-autocomplete');
    if (!ac) return;

    if (!value.startsWith('/') || value.includes(' ') || typeof MeowSlashCommands === 'undefined') {
      _hideAutocomplete();
      return;
    }

    const suggestions = MeowSlashCommands.getSuggestions(value);
    if (!suggestions.length) { _hideAutocomplete(); return; }

    ac.innerHTML = '';
    suggestions.forEach((s, i) => {
      const item = document.createElement('div');
      item.className = 'meow-autocomplete-item' + (i === 0 ? ' selected' : '');
      item.innerHTML = `
        <span class="meow-autocomplete-cmd">${s.command}</span>
        <span class="meow-autocomplete-desc">${s.description}</span>
      `;
      item.addEventListener('click', () => {
        const textarea = _panel.querySelector('.meow-chat-textarea');
        textarea.value = s.command + ' ';
        textarea.focus();
        _hideAutocomplete();
      });
      ac.appendChild(item);
    });

    ac.classList.add('visible');
  }

  function _hideAutocomplete() {
    const ac = _panel?.querySelector('.meow-autocomplete');
    if (ac) ac.classList.remove('visible');
  }

  function _navigateAutocomplete(dir) {
    const ac = _panel?.querySelector('.meow-autocomplete');
    if (!ac) return;
    const items = ac.querySelectorAll('.meow-autocomplete-item');
    let idx = Array.from(items).findIndex(i => i.classList.contains('selected'));
    items[idx]?.classList.remove('selected');
    idx = (idx + dir + items.length) % items.length;
    items[idx]?.classList.add('selected');

    // If Tab was used, select the item
    const textarea = _panel.querySelector('.meow-chat-textarea');
    const cmd = items[idx]?.querySelector('.meow-autocomplete-cmd')?.textContent;
    if (cmd) textarea.value = cmd + ' ';
  }

  // ==================== CODE COPY BUTTONS ====================

  function _attachCopyButtons(bubble) {
    bubble.querySelectorAll('pre').forEach(pre => {
      const btn = document.createElement('button');
      btn.className = 'meow-copy-code-btn';
      btn.textContent = 'Copy';
      btn.addEventListener('click', () => {
        const code = pre.querySelector('code')?.textContent || pre.textContent;
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = '✓ Copied';
          setTimeout(() => btn.textContent = 'Copy', 2000);
        }).catch(() => {
          btn.textContent = '✗ Failed';
          setTimeout(() => btn.textContent = 'Copy', 2000);
        });
      });
      pre.style.position = 'relative';
      pre.appendChild(btn);
    });
  }

  // ==================== TOAST NOTIFICATION ====================

  function _showToast(text) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      padding: 8px 18px; background: var(--meow-primary); color: #0B0F14;
      border-radius: 8px; font-size: 13px; font-weight: 600; z-index: 2147483647;
      animation: meowMsgSlide 0.2s ease; font-family: var(--meow-font);
    `;
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
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
    showFollowUps: _showFollowUpSuggestions,
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
