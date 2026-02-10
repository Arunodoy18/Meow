/**
 * Meow AI - Stream Manager
 * Production-grade streaming state machine.
 * Handles chunk accumulation, watchdog timers, finalization,
 * fail-safe continuation, and connection resilience.
 *
 * State transitions:
 *   IDLE → CONNECTING → STREAMING → FINALIZING → IDLE
 *                 ↘ ERROR ↗       ↗
 */

const MeowStreamManager = (() => {
  'use strict';

  // ==================== CONFIG ====================

  const STREAM_URL = 'https://meow-ai-backend.meow-ai-arunodoy.workers.dev/api/chat/stream';
  const WATCHDOG_TIMEOUT_MS = 12000;  // finalize if no chunk for 12s
  const CONNECT_TIMEOUT_MS = 15000;   // abort if no first chunk in 15s
  const MAX_CONTINUATION_RETRIES = 1; // auto-continue once if cut off

  // ==================== STATES ====================

  const STATE = Object.freeze({
    IDLE: 'IDLE',
    CONNECTING: 'CONNECTING',
    STREAMING: 'STREAMING',
    FINALIZING: 'FINALIZING',
    ERROR: 'ERROR'
  });

  // ==================== DEBUG LOGGER ====================

  const DEBUG = true; // set false for production

  function _log(event, data) {
    if (!DEBUG) return;
    const ts = new Date().toISOString().slice(11, 23);
    console.log(`🐱 [Stream ${ts}] ${event}`, data ?? '');
  }

  // ==================== MESSAGE STATE ====================

  /** @type {Map<string, Object>} Active message states keyed by message ID */
  const _messages = new Map();

  let _state = STATE.IDLE;
  let _abortController = null;
  let _watchdogTimer = null;
  let _connectTimer = null;
  let _currentMsgId = null;
  let _continuationCount = 0;

  // Callbacks
  let _onChunk = null;    // (msgId, fullContent) => void
  let _onFinalize = null;  // (msgId, fullContent, wasError) => void
  let _onError = null;     // (msgId, error) => void
  let _onStateChange = null; // (state) => void

  // ==================== MESSAGE FACTORY ====================

  let _idCounter = 0;

  function _createMessageState() {
    const id = `msg_${Date.now()}_${++_idCounter}`;
    const msg = {
      id,
      role: 'ai',
      content: '',
      isStreaming: true,
      streamBuffer: '',
      lastChunkTime: 0,
      finalized: false,
      error: false,
      chunkCount: 0,
      startTime: Date.now()
    };
    _messages.set(id, msg);
    return msg;
  }

  function _getMsg(id) {
    return _messages.get(id) || null;
  }

  // ==================== STATE MACHINE ====================

  function _setState(newState) {
    const prev = _state;
    _state = newState;
    _log('STATE_CHANGE', `${prev} → ${newState}`);
    if (_onStateChange) _onStateChange(newState);
  }

  function getState() {
    return _state;
  }

  function isStreaming() {
    return _state === STATE.STREAMING || _state === STATE.CONNECTING;
  }

  // ==================== WATCHDOG ====================

  function _startWatchdog(msgId) {
    _clearWatchdog();
    _watchdogTimer = setTimeout(() => {
      const msg = _getMsg(msgId);
      if (msg && msg.isStreaming && !msg.finalized) {
        _log('STREAM_TIMEOUT', `No chunk for ${WATCHDOG_TIMEOUT_MS}ms, finalizing`);
        _finalizeMessage(msgId, false);
      }
    }, WATCHDOG_TIMEOUT_MS);
  }

  function _resetWatchdog(msgId) {
    _startWatchdog(msgId);
  }

  function _clearWatchdog() {
    if (_watchdogTimer) {
      clearTimeout(_watchdogTimer);
      _watchdogTimer = null;
    }
  }

  function _startConnectTimeout(msgId) {
    _connectTimer = setTimeout(() => {
      if (_state === STATE.CONNECTING) {
        _log('CONNECT_TIMEOUT', `No response in ${CONNECT_TIMEOUT_MS}ms`);
        _abort();
        const msg = _getMsg(msgId);
        if (msg && !msg.finalized) {
          msg.content = 'Connection timed out. Please try again.';
          msg.error = true;
          _finalizeMessage(msgId, true);
        }
      }
    }, CONNECT_TIMEOUT_MS);
  }

  function _clearConnectTimeout() {
    if (_connectTimer) {
      clearTimeout(_connectTimer);
      _connectTimer = null;
    }
  }

  // ==================== CORE STREAM LOGIC ====================

  /**
   * Start streaming a response from the backend.
   * @param {Object|string} payload - Either conversation payload object or legacy message string
   * @param {string} mode - Page analysis mode
   * @returns {string} Message ID for tracking
   */
  async function startStream(payload, mode) {
    // Prevent double-request
    if (_state === STATE.STREAMING || _state === STATE.CONNECTING) {
      _log('BLOCKED', 'Stream already active, ignoring');
      return null;
    }

    const msg = _createMessageState();
    _currentMsgId = msg.id;
    _continuationCount = 0;
    _setState(STATE.CONNECTING);
    _startConnectTimeout(msg.id);

    _log('STREAM_STARTED', { msgId: msg.id, mode });

    _abortController = new AbortController();

    // Build request body — support both payload object and legacy string
    let requestBody;
    if (typeof payload === 'string') {
      requestBody = { message: payload, mode };
    } else {
      requestBody = {
        systemPrompt: payload.systemPrompt || '',
        messages: payload.messages || [],
        mode: payload.mode || mode
      };
    }

    try {
      const response = await fetch(STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: _abortController.signal
      });

      _clearConnectTimeout();

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        let errMsg = 'Backend error.';
        if (response.status === 429) errMsg = 'Rate limited. Please wait a moment.';
        else if (response.status === 503) errMsg = 'AI model loading. Try again in 20s.';
        else if (response.status === 500) errMsg = 'Server error. Try again later.';

        msg.content = errMsg;
        msg.error = true;
        _finalizeMessage(msg.id, true);
        return msg.id;
      }

      // Connection established — start reading stream
      _setState(STATE.STREAMING);
      _startWatchdog(msg.id);

      await _readSSEStream(response.body, msg.id);

    } catch (error) {
      _clearConnectTimeout();

      if (error.name === 'AbortError') {
        _log('STREAM_ABORTED', 'User or system aborted');
        if (!_getMsg(msg.id)?.finalized) {
          _finalizeMessage(msg.id, false);
        }
      } else if (!navigator.onLine) {
        msg.content = msg.content || 'You appear to be offline.';
        msg.error = true;
        _finalizeMessage(msg.id, true);
      } else {
        _log('STREAM_ERROR', error.message);
        msg.content = msg.content || 'Connection error. Try again.';
        msg.error = true;
        _finalizeMessage(msg.id, true);
      }
    }

    return msg.id;
  }

  // ==================== SSE PARSER ====================

  /**
   * Read and parse SSE stream from fetch ReadableStream.
   * Uses TextDecoder for incremental decoding.
   * Never overwrites content — always appends.
   */
  async function _readSSEStream(body, msgId) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          _log('STREAM_CONNECTION_CLOSED', `Chunks: ${_getMsg(msgId)?.chunkCount}`);
          // Process any remaining buffer
          if (sseBuffer.trim()) {
            _processSSELines(sseBuffer, msgId);
          }
          _finalizeMessage(msgId, false);
          return;
        }

        const text = decoder.decode(value, { stream: true });
        sseBuffer += text;

        // Split on double newline (SSE event boundary)
        const events = sseBuffer.split('\n\n');
        // Keep the last potentially incomplete event
        sseBuffer = events.pop() || '';

        for (const event of events) {
          if (event.trim()) {
            _processSSELines(event, msgId);
          }
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        _log('READ_ERROR', error.message);
        const msg = _getMsg(msgId);
        if (msg && !msg.finalized) {
          msg.error = !msg.content; // only mark error if no content yet
          _finalizeMessage(msgId, !!msg.error);
        }
      }
    } finally {
      try { reader.releaseLock(); } catch (e) { /* noop */ }
    }
  }

  /**
   * Process SSE lines from a single event block.
   * Handles: data chunks, [DONE] marker, error events.
   */
  function _processSSELines(eventBlock, msgId) {
    const msg = _getMsg(msgId);
    if (!msg || msg.finalized) return;

    const lines = eventBlock.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();

        // End marker
        if (data === '[DONE]') {
          _log('STREAM_DONE_MARKER', `Total chunks: ${msg.chunkCount}`);
          _finalizeMessage(msgId, false);
          return;
        }

        // Parse chunk
        try {
          const parsed = JSON.parse(data);

          if (parsed.error) {
            _log('STREAM_CHUNK_ERROR', parsed.error);
            msg.error = true;
            if (!msg.content) msg.content = parsed.error;
            _finalizeMessage(msgId, true);
            return;
          }

          if (parsed.text) {
            _appendChunk(msgId, parsed.text);
          }
        } catch (e) {
          // Non-JSON data line — might be partial, skip
          _log('CHUNK_PARSE_SKIP', data.substring(0, 50));
        }
      }
      // Ignore other SSE fields (event:, id:, retry:)
    }
  }

  // ==================== CHUNK ACCUMULATION ====================

  /**
   * Append a text chunk to the message.
   * NEVER overwrites — always appends to content.
   * Uses RAF-batched callback for UI updates.
   */
  function _appendChunk(msgId, text) {
    const msg = _getMsg(msgId);
    if (!msg || msg.finalized) return;

    msg.streamBuffer += text;
    msg.content += text;
    msg.chunkCount++;
    msg.lastChunkTime = Date.now();

    // Reset watchdog on each chunk
    _resetWatchdog(msgId);

    _log('CHUNK_RECEIVED', `#${msg.chunkCount} +${text.length}chars total=${msg.content.length}`);

    // Notify UI (batched via RAF in chatUI)
    if (_onChunk) {
      _onChunk(msgId, msg.content);
    }
  }

  // ==================== FINALIZATION ====================

  /**
   * Safely finalize a streamed message.
   * - Trims buffer
   * - Marks streaming false
   * - Saves to history
   * - Checks for incomplete sentences
   * - Unlocks input
   */
  function _finalizeMessage(msgId, wasError) {
    const msg = _getMsg(msgId);
    if (!msg || msg.finalized) return;

    _log('FINALIZE_CALLED', {
      msgId,
      wasError,
      chunks: msg.chunkCount,
      contentLen: msg.content.length,
      elapsed: Date.now() - msg.startTime
    });

    // Clean up timers
    _clearWatchdog();
    _clearConnectTimeout();

    // Trim content
    msg.content = msg.content.trim();
    msg.streamBuffer = '';
    msg.isStreaming = false;
    msg.finalized = true;
    msg.error = wasError;

    _setState(STATE.IDLE);

    // Check for incomplete response (cut off mid-sentence)
    if (!wasError && msg.content && _isIncomplete(msg.content) && _continuationCount < MAX_CONTINUATION_RETRIES) {
      _log('INCOMPLETE_DETECTED', 'Will request continuation');
      // Don't finalize yet — will continue
      msg.finalized = false;
      msg.isStreaming = true;
      _requestContinuation(msgId, msg.content);
      return;
    }

    // Notify UI to finalize
    if (_onFinalize) {
      _onFinalize(msgId, msg.content, wasError);
    }

    _log('STREAM_COMPLETED', {
      msgId,
      chunks: msg.chunkCount,
      chars: msg.content.length,
      elapsed: `${Date.now() - msg.startTime}ms`,
      error: wasError
    });
  }

  // ==================== INCOMPLETE DETECTION ====================

  /**
   * Heuristic: detect if a response was cut off mid-sentence.
   */
  function _isIncomplete(text) {
    if (!text || text.length < 20) return false;
    const lastChar = text.slice(-1);
    // Ends with a complete-looking terminator
    if (/[.!?\n\]})`"]/.test(lastChar)) return false;
    // Ends mid-word or mid-sentence
    const lastLine = text.split('\n').pop().trim();
    if (lastLine.length > 5 && !/[.!?:;)\]}`"]$/.test(lastLine)) return true;
    return false;
  }

  // ==================== CONTINUATION ====================

  /**
   * Auto-send a continuation request when response was cut off.
   */
  async function _requestContinuation(msgId, existingContent) {
    _continuationCount++;
    _log('CONTINUATION_REQUEST', `Attempt ${_continuationCount}`);

    _setState(STATE.CONNECTING);
    _abortController = new AbortController();
    _startConnectTimeout(msgId);

    // Use conversation memory for continuation context if available
    let requestBody;
    if (typeof MeowConversationMemory !== 'undefined' && MeowConversationMemory.buildContinuationPayload) {
      const contPayload = MeowConversationMemory.buildContinuationPayload();
      requestBody = {
        systemPrompt: contPayload.systemPrompt,
        messages: contPayload.messages,
        mode: contPayload.mode
      };
    } else {
      requestBody = {
        message: 'Continue naturally from where you stopped. Do not repeat what you already said.',
        mode: 'General Analysis'
      };
    }

    try {
      const response = await fetch(STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: _abortController.signal
      });

      _clearConnectTimeout();

      if (!response.ok) {
        _finalizeMessage(msgId, false); // finalize with what we have
        return;
      }

      _setState(STATE.STREAMING);
      _startWatchdog(msgId);

      await _readSSEStream(response.body, msgId);

    } catch (error) {
      _clearConnectTimeout();
      _log('CONTINUATION_FAILED', error.message);
      // Finalize with whatever content we have
      const msg = _getMsg(msgId);
      if (msg && !msg.finalized) {
        msg.finalized = true;
        msg.isStreaming = false;
        _setState(STATE.IDLE);
        if (_onFinalize) _onFinalize(msgId, msg.content, false);
      }
    }
  }

  // ==================== ABORT / CLEANUP ====================

  function _abort() {
    if (_abortController) {
      _abortController.abort();
      _abortController = null;
    }
  }

  /**
   * Abort the current stream (user cancel or navigation).
   * Finalizes with whatever content has been received.
   */
  function abortCurrentStream() {
    if (!isStreaming()) return;

    _log('USER_ABORT', _currentMsgId);
    _abort();

    if (_currentMsgId) {
      const msg = _getMsg(_currentMsgId);
      if (msg && !msg.finalized) {
        _finalizeMessage(_currentMsgId, false);
      }
    }
  }

  // ==================== RETRY ====================

  /**
   * Retry the last failed message with a new stream.
   * @param {string} originalMessage - The user message to resend
   * @param {string} mode - The analysis mode
   * @returns {string} New message ID
   */
  async function retry(originalMessage, mode) {
    _log('RETRY', originalMessage?.substring(0, 50));
    return startStream(originalMessage, mode);
  }

  // ==================== CALLBACKS ====================

  function onChunk(cb) { _onChunk = cb; }
  function onFinalize(cb) { _onFinalize = cb; }
  function onError(cb) { _onError = cb; }
  function onStateChange(cb) { _onStateChange = cb; }

  // ==================== CLEANUP ====================

  function destroy() {
    _abort();
    _clearWatchdog();
    _clearConnectTimeout();
    _messages.clear();
    _state = STATE.IDLE;
    _currentMsgId = null;
  }

  // ==================== PUBLIC API ====================

  return {
    STATE,
    startStream,
    abortCurrentStream,
    retry,
    isStreaming,
    getState,
    onChunk,
    onFinalize,
    onError,
    onStateChange,
    destroy
  };
})();
