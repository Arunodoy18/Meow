/**
 * Meow AI - Cloudflare Workers Backend Proxy
 * 
 * SECURITY ARCHITECTURE:
 * - API key stored as Cloudflare secret (never in code)
 * - Extension calls this proxy instead of Gemini directly
 * - Proxy attaches API key server-side and forwards request
 * - Users never see or have access to the API key
 * 
 * DEPLOYMENT:
 * 1. Install Wrangler CLI: npm install -g wrangler
 * 2. Login: wrangler login
 * 3. Set secret: wrangler secret put GEMINI_API_KEY
 * 4. Deploy: wrangler deploy
 */

// ==================== CONFIGURATION ====================

const CONFIG = {
  // Google Gemini API configuration
  MODEL_NAME: 'gemini-2.5-flash',
  GEMINI_API_BASE: 'https://generativelanguage.googleapis.com/v1beta/models',
  
  // Request timeout (milliseconds)
  TIMEOUT_MS: 30000,
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  
  // CORS allowed origins (Chrome extension protocol)
  // "*" allows all origins - restrict in production if needed
  ALLOWED_ORIGINS: ['*'],
  
  // Rate limiting (optional - implement if needed)
  MAX_MESSAGE_LENGTH: 5000,
  MAX_PROMPT_LENGTH: 10000,
};

// ==================== CORS HEADERS ====================

/**
 * Generate CORS headers for Chrome extension requests
 * 
 * SECURITY NOTE:
 * - Allows requests from Chrome extensions
 * - Include credentials not needed (extension doesn't send cookies)
 * - Preflight requests handled separately
 */
function getCorsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

// ==================== REQUEST VALIDATION ====================

/**
 * Validate incoming request body
 * 
 * SECURITY NOTE:
 * - Prevents empty/malformed requests
 * - Limits message length to prevent abuse
 * - Returns clear error messages for debugging
 * 
 * @param {Object} body - Parsed JSON request body
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateRequest(body) {
  // Check if body exists
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }
  
  // Check if message exists
  if (!body.message || typeof body.message !== 'string') {
    return { valid: false, error: 'Message field is required and must be a string' };
  }
  
  // Check message length
  if (body.message.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (body.message.length > CONFIG.MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message exceeds maximum length of ${CONFIG.MAX_MESSAGE_LENGTH} characters` };
  }
  
  // Mode is optional, but if provided must be string
  if (body.mode && typeof body.mode !== 'string') {
    return { valid: false, error: 'Mode must be a string if provided' };
  }
  
  return { valid: true };
}

// ==================== GEMINI API ====================

/**
 * Retry wrapper with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<any>} Function result
 */
async function withRetry(fn, maxRetries = CONFIG.MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on auth errors or validation errors
      if (error.message.includes('SERVICE_UNAVAILABLE') || 
          error.message.includes('VALIDATION')) {
        throw error;
      }
      
      // Last attempt - throw error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry with exponential backoff
      const delay = CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Call Google Gemini API with user message
 * 
 * SECURITY NOTE:
 * - API key retrieved from environment variable (Cloudflare secret)
 * - Key is NEVER logged or exposed to client
 * - Timeout prevents hanging requests
 * 
 * @param {string} message - User's message
 * @param {string} apiKey - Gemini API key from environment
 * @param {string} mode - Optional context mode
 * @returns {Promise<string>} AI-generated response
 */
async function callGeminiAPI(message, apiKey, mode = 'general') {
  // Build API URL with key as query parameter (Gemini requirement)
  const apiUrl = `${CONFIG.GEMINI_API_BASE}/${CONFIG.MODEL_NAME}:generateContent?key=${apiKey}`;
  
  // SECURITY: Use AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: message
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Handle HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      } else if (response.status === 401 || response.status === 403) {
        console.error('Invalid Gemini API key configured');
        throw new Error('SERVICE_UNAVAILABLE');
      } else {
        throw new Error(`GEMINI_API_ERROR_${response.status}`);
      }
    }
    
    const data = await response.json();
    
    // Extract generated text from Gemini response format
    if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    } else if (data?.error) {
      console.error('Gemini API returned error:', data.error);
      throw new Error('GEMINI_ERROR');
    } else {
      console.error('Unexpected Gemini response format:', JSON.stringify(data));
      throw new Error('UNEXPECTED_RESPONSE_FORMAT');
    }
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle specific errors
    if (error.name === 'AbortError') {
      throw new Error('REQUEST_TIMEOUT');
    }
    
    // Re-throw known errors
    if (error.message.startsWith('RATE_LIMIT_') ||
        error.message.startsWith('SERVICE_') ||
        error.message.startsWith('GEMINI_')) {
      throw error;
    }
    
    // Network errors
    if (error.message.includes('fetch')) {
      throw new Error('NETWORK_ERROR');
    }
    
    // Unknown errors - log but don't expose details
    console.error('Unexpected error calling Gemini:', error);
    throw new Error('INTERNAL_ERROR');
  }
}

// ==================== STREAMING HANDLER ====================

/**
 * Handle streaming chat requests via SSE.
 * Calls Gemini streamGenerateContent and pipes chunks to client.
 *
 * @param {Object} body - Validated request body
 * @param {string} apiKey - Gemini API key
 * @returns {Response} SSE streaming response
 */
async function handleStreamRequest(body, apiKey) {
  const apiUrl = `${CONFIG.GEMINI_API_BASE}/${CONFIG.MODEL_NAME}:streamGenerateContent?alt=sse&key=${apiKey}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s for streaming

    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: body.message }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text().catch(() => '');
      console.error('Gemini Stream Error:', geminiResponse.status, errorText);

      const status = geminiResponse.status === 429 ? 429 :
                     (geminiResponse.status === 401 || geminiResponse.status === 403) ? 503 : 500;
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status, headers: { 'Content-Type': 'application/json', ...getCorsHeaders() } }
      );
    }

    // Transform Gemini SSE → our SSE format via TransformStream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = geminiResponse.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    // Process stream in background (non-blocking)
    (async () => {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Split on SSE event boundaries
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const event of events) {
            for (const line of event.split('\n')) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                try {
                  const parsed = JSON.parse(data);
                  const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    await writer.write(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                  }
                } catch (e) {
                  // Skip unparseable chunks
                }
              }
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          for (const line of buffer.split('\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              try {
                const parsed = JSON.parse(data);
                const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                }
              } catch (e) { /* skip */ }
            }
          }
        }

        // Send done marker
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        console.error('Stream pipe error:', err);
        try {
          await writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`));
        } catch (e) { /* writer closed */ }
      } finally {
        try { await writer.close(); } catch (e) { /* noop */ }
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...getCorsHeaders(),
      },
    });

  } catch (error) {
    console.error('Stream handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...getCorsHeaders() } }
    );
  }
}

// ==================== ERROR RESPONSE BUILDER ====================

/**
 * Build error response with user-friendly messages
 * 
 * SECURITY NOTE:
 * - Never exposes internal details (stack traces, API keys)
 * - Maps technical errors to user-friendly messages
 * - Logs technical details server-side only
 */
function buildErrorResponse(errorCode, statusCode = 500) {
  const errorMessages = {
    'RATE_LIMIT_EXCEEDED': {
      message: 'Rate limit exceeded. Please try again in a few moments.',
      code: 'RATE_LIMIT',
      status: 429,
    },
    'SERVICE_UNAVAILABLE': {
      message: 'AI service is temporarily unavailable. Please try again later.',
      code: 'SERVICE_ERROR',
      status: 503,
    },
    'REQUEST_TIMEOUT': {
      message: 'Request timed out. Please try again.',
      code: 'TIMEOUT',
      status: 504,
    },
    'NETWORK_ERROR': {
      message: 'Network error occurred. Please check your connection.',
      code: 'NETWORK',
      status: 503,
    },
    'INTERNAL_ERROR': {
      message: 'An internal error occurred. Please try again later.',
      code: 'INTERNAL',
      status: 500,
    },
    'VALIDATION_ERROR': {
      message: 'Invalid request data.',
      code: 'VALIDATION',
      status: 400,
    },
  };
  
  const errorInfo = errorMessages[errorCode] || errorMessages['INTERNAL_ERROR'];
  
  return new Response(
    JSON.stringify({
      success: false,
      error: errorInfo.message,
      code: errorInfo.code,
    }),
    {
      status: errorInfo.status,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(),
      },
    }
  );
}

// ==================== MAIN REQUEST HANDLER ====================

/**
 * Main Cloudflare Worker request handler
 * 
 * Handles:
 * - OPTIONS preflight requests (CORS)
 * - POST /api/chat requests
 * - Request validation
 * - API key retrieval from environment
 * - Hugging Face API calls
 * - Error handling and logging
 */
export default {
  async fetch(request, env, ctx) {
    // ==================== CORS PREFLIGHT ====================
    
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(),
      });
    }
    
    // ==================== METHOD VALIDATION ====================
    
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed. Use POST.',
        }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Allow': 'POST, OPTIONS',
            ...getCorsHeaders(),
          },
        }
      );
    }
    
    // ==================== ENVIRONMENT CHECK ====================
    
    // SECURITY: Validate API key exists in environment
    if (!env.GEMINI_API_KEY) {
      console.error('CRITICAL: GEMINI_API_KEY environment variable not set');
      return buildErrorResponse('SERVICE_UNAVAILABLE');
    }
    
    // ==================== REQUEST PARSING ====================
    
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(),
          },
        }
      );
    }
    
    // ==================== REQUEST VALIDATION ====================
    
    const validation = validateRequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error,
          code: 'VALIDATION_ERROR',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(),
          },
        }
      );
    }
    
    // ==================== ROUTING ====================

    const url = new URL(request.url);

    // Streaming endpoint
    if (url.pathname === '/api/chat/stream') {
      return handleStreamRequest(body, env.GEMINI_API_KEY);
    }

    // ==================== NON-STREAMING API CALL ====================
    
    try {
      // SECURITY: API key from environment, never exposed to client
      // RELIABILITY: Wrapped with retry logic
      const aiResponse = await withRetry(() => 
        callGeminiAPI(
          body.message,
          env.GEMINI_API_KEY,
          body.mode
        )
      );
      
      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          response: aiResponse,
          mode: body.mode || 'general',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(),
          },
        }
      );
      
    } catch (error) {
      // Handle errors based on type
      return buildErrorResponse(error.message);
    }
  },
};
