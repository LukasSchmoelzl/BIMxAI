import Anthropic from '@anthropic-ai/sdk';

// Shared in-memory rate limit store
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const RATE_LIMIT = {
  requests: parseInt(process.env.RATE_LIMIT_MAX || '10'),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
};

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const userRequests = requestCounts.get(ip);

  if (!userRequests || now > userRequests.resetTime) {
    const resetTime = now + RATE_LIMIT.windowMs;
    requestCounts.set(ip, { count: 1, resetTime });
    return { allowed: true, remaining: RATE_LIMIT.requests - 1, resetTime };
  }

  if (userRequests.count >= RATE_LIMIT.requests) {
    return { allowed: false, remaining: 0, resetTime: userRequests.resetTime };
  }

  userRequests.count++;
  return {
    allowed: true,
    remaining: RATE_LIMIT.requests - userRequests.count,
    resetTime: userRequests.resetTime,
  };
}

export function validateClaudeInput(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }
  if (!data.message || typeof data.message !== 'string') {
    return { valid: false, error: 'Message is required and must be a string' };
  }
  const maxLength = 30000;
  if (data.message.length > maxLength) {
    return { valid: false, error: `Message too long (max ${maxLength} characters)` };
  }
  const prohibitedPatterns = [
    /\b(password|api[_-]?key|secret|token)\b/i,
    /\b(hack|exploit|malware)\b/i,
  ];
  for (const pattern of prohibitedPatterns) {
    if (pattern.test(data.message)) {
      return { valid: false, error: 'Message contains prohibited content' };
    }
  }
  return { valid: true };
}

export function createAnthropicClient(apiKey: string) {
  return new Anthropic({ apiKey });
}

export async function callClaude(client: Anthropic, data: any) {
  const messages = data.messages || [
    { role: 'user', content: data.message },
  ];
  const maxTokens = data.maxTokens || 2000;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-0', // keep server authority for model choice
    max_tokens: maxTokens,
    messages,
    system: data.systemPrompt || undefined,
  });

  return response;
}

export function isAnthropicError(error: unknown): error is Anthropic.APIError {
  return error instanceof Anthropic.APIError;
}


