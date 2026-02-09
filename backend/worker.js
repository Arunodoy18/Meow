/**
 * Meow AI - Cloudflare Workers Backend Proxy
 * 
 * SECURITY ARCHITECTURE:
 * - API key stored as Cloudflare secret (never in code)
 * - Extension calls this proxy instead of Hugging Face directly
 * - Proxy attaches API key server-side and forwards request
 * - Users never see or have access to the API key
 * 
 * DEPLOYMENT:
 * 1. Install Wrangler CLI: npm install -g wrangler
 * 2. Login: wrangler login
 * 3. Set secret: wrangler secret put HUGGINGFACE_API_KEY
 * 4. Deploy: wrangler deploy
 */

// ==================== CONFIGURATION ====================

const CONFIG = {
  // Hugging Face model endpoint
  MODEL_NAME: 'mistralai/Mistral-7B-Instruct-v0.2',
  HF_API_URL: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
  
  // Request timeout (milliseconds)
  TIMEOUT_MS: 30000,
  
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

// ==================== HUGGING FACE API ====================

/**
 * Call Hugging Face Inference API with user message
 * 
 * SECURITY NOTE:
 * - API key retrieved from environment variable (Cloudflare secret)
 * - Key is NEVER logged or exposed to client
 * - Timeout prevents hanging requests
 * 
 * @param {string} message - User's message
 * @param {string} apiKey - Hugging Face API key from environment
 * @param {string} mode - Optional context mode
 * @returns {Promise<string>} AI-generated response
 */
async function callHuggingFaceAPI(message, apiKey, mode = 'general') {
  // Build prompt based on mode (simplified - extend as needed)
  const prompt = `[INST] ${message} [/INST]`;
  
  // SECURITY: Use AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);
  
  try {
    const response = await fetch(CONFIG.HF_API_URL, {
      method: 'POST',
      headers: {
        // SECURITY: API key from environment, never hardcoded
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 300,
          temperature: 0.7,
          top_p: 0.95,
          return_full_text: false,
        },
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Handle HTTP errors
    if (!response.ok) {
      if (response.status === 503) {
        throw new Error('AI_MODEL_LOADING');
      } else if (response.status === 401) {
        // SECURITY: Don't expose that API key is invalid to client
        console.error('Invalid Hugging Face API key configured');
        throw new Error('SERVICE_UNAVAILABLE');
      } else if (response.status === 429) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      } else {
        throw new Error(`HF_API_ERROR_${response.status}`);
      }
    }
    
    const data = await response.json();
    
    // Extract generated text
    if (data && data[0] && data[0].generated_text) {
      return data[0].generated_text;
    } else if (typeof data === 'string') {
      return data;
    } else if (data.error) {
      throw new Error(`HF_ERROR: ${data.error}`);
    } else {
      throw new Error('UNEXPECTED_RESPONSE_FORMAT');
    }
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle specific errors
    if (error.name === 'AbortError') {
      throw new Error('REQUEST_TIMEOUT');
    }
    
    // Re-throw known errors
    if (error.message.startsWith('AI_MODEL_') || 
        error.message.startsWith('SERVICE_') ||
        error.message.startsWith('RATE_LIMIT_') ||
        error.message.startsWith('HF_')) {
      throw error;
    }
    
    // Network errors
    if (error.message.includes('fetch')) {
      throw new Error('NETWORK_ERROR');
    }
    
    // Unknown errors - log but don't expose details
    console.error('Unexpected error calling Hugging Face:', error);
    throw new Error('INTERNAL_ERROR');
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
    'AI_MODEL_LOADING': {
      message: 'AI model is loading. Please try again in 20-30 seconds.',
      code: 'MODEL_LOADING',
      status: 503,
    },
    'SERVICE_UNAVAILABLE': {
      message: 'AI service is temporarily unavailable. Please try again later.',
      code: 'SERVICE_ERROR',
      status: 503,
    },
    'RATE_LIMIT_EXCEEDED': {
      message: 'Rate limit exceeded. Please try again in a few moments.',
      code: 'RATE_LIMIT',
      status: 429,
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
    if (!env.HUGGINGFACE_API_KEY) {
      console.error('CRITICAL: HUGGINGFACE_API_KEY environment variable not set');
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
    
    // ==================== API CALL ====================
    
    try {
      // SECURITY: API key from environment, never exposed to client
      const aiResponse = await callHuggingFaceAPI(
        body.message,
        env.HUGGINGFACE_API_KEY,
        body.mode
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
