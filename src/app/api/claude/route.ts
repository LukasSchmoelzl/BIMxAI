import { NextRequest, NextResponse } from 'next/server';
import { RATE_LIMIT, checkRateLimit, validateClaudeInput, createAnthropicClient, callClaude, isAnthropicError } from '@/features/ai/services/claude-api';

// Rate limit & storage kommen aus dem Service

function getRealIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

// Validation & RL kommen aus dem Service

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = getRealIP(request);
    
    // Check rate limit
    const { allowed, remaining, resetTime } = checkRateLimit(clientIP);
    
    if (!allowed) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please wait before making another request.',
          code: 'RATE_LIMITED',
          retryAfter
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT.requests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(resetTime).toISOString(),
            'Retry-After': retryAfter.toString()
          }
        }
      );
    }
    
    // Parse and validate input
    const data = await request.json();
    const validation = validateClaudeInput(data);
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }
    
    // Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[ERROR] ANTHROPIC_API_KEY not configured');
      return NextResponse.json(
        { error: 'Service configuration error', code: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }
    
    // Initialize Anthropic client (server-side only)
    const client = createAnthropicClient(apiKey);
    
    // console.log('Claude API request from IP:', clientIP);
    // console.log('[INFO] Message length:', data.message.length);
    
    // Call Claude API via shared service
    const response = await callClaude(client, data);
    
    // console.log('[SUCCESS] Claude API response received');
    
    // Extract content
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }
    
    // Log for compliance (anonymized)
    // console.log('[INFO] Successful Claude interaction:', {
    //   ip: clientIP.slice(0, 8) + '***', // Anonymized IP
    //   messageLength: data.message.length,
    //   responseLength: content.text.length,
    //   timestamp: new Date().toISOString()
    // });
    
    return NextResponse.json({
      response: content.text,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      }
    }, {
      headers: {
        'X-RateLimit-Limit': RATE_LIMIT.requests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString(),
      }
    });
    
  } catch (error) {
    console.error('[ERROR] Claude API error:', error);
    
    if (isAnthropicError(error)) {
      // Handle insufficient credit/billing errors explicitly
      if (
        error.status === 400 &&
        typeof (error as any).error?.message === 'string' &&
        ((error as any).error.message as string).toLowerCase().includes('credit balance is too low')
      ) {
        return NextResponse.json(
          {
            error: 'Anthropic-Konto hat kein Guthaben. Bitte Guthaben aufladen oder KI deaktivieren.',
            code: 'BILLING_REQUIRED',
          },
          { status: 402 }
        );
      }
      // Special handling for 529 Overloaded error
      if (error.status === 529) {
        return NextResponse.json(
          { 
            error: 'Die Claude-Server sind momentan überlastet. Bitte versuche es in wenigen Augenblicken erneut.',
            code: 'CLAUDE_OVERLOADED',
            retry_after: 30 // suggest retry after 30 seconds
          },
          { status: 529 }
        );
      }
      
      // Handle rate limit errors
      if (error.status === 429) {
        return NextResponse.json(
          { 
            error: 'Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.',
            code: 'RATE_LIMITED',
            retry_after: 60
          },
          { status: 429 }
        );
      }
      
      // Handle API key errors
      if (error.status === 401) {
        console.error('[ERROR] Invalid API key');
        return NextResponse.json(
          { 
            error: 'Konfigurationsfehler. Bitte kontaktiere den Administrator.',
            code: 'AUTH_ERROR'
          },
          { status: 500 } // Don't expose 401 to client
        );
      }
      
      // Generic API errors - hide details in production
      const errorMessage = process.env.NODE_ENV === 'development' 
        ? `Claude API error: ${error.status} ${JSON.stringify(error.error)}`
        : 'Ein Fehler ist bei der Verarbeitung aufgetreten. Bitte versuche es später erneut.';
      
      return NextResponse.json(
        { 
          error: errorMessage,
          code: 'CLAUDE_API_ERROR'
        },
        { status: error.status || 500 }
      );
    }
    
    // Generic error handling
    console.error('[ERROR] Unexpected error:', error);
    
    const genericMessage = process.env.NODE_ENV === 'development'
      ? `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      : 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.';
    
    return NextResponse.json(
      { 
        error: genericMessage,
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'claude-api',
    timestamp: new Date().toISOString(),
    rateLimit: RATE_LIMIT
  });
} 